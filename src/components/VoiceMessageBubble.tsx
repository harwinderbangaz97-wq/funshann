import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Mic } from 'lucide-react';
import { motion } from 'motion/react';
import { VoiceNoteData } from '../types';

interface VoiceMessageBubbleProps {
  voiceNote: VoiceNoteData;
  isOwn?: boolean;
  isMyMessage?: boolean;
}

export const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({ voiceNote, isOwn = false, isMyMessage }) => {
  const isMe = isMyMessage !== undefined ? isMyMessage : isOwn;
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 1
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number | null>(null);
  const synthCtxRef = useRef<AudioContext | null>(null);

  const duration = voiceNote.durationSeconds || 10;
  const waveform = voiceNote.waveform && voiceNote.waveform.length > 0
    ? voiceNote.waveform
    : [30, 50, 80, 40, 60, 90, 70, 45, 60, 85, 95, 70, 50, 35, 65, 80, 40, 25];

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (synthCtxRef.current) {
        synthCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const playSynthesizedMelody = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      synthCtxRef.current = ctx;

      const baseFreq = isMe ? 320 : 380;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);

      // Modulate frequency to sound like natural human speech rhythm
      waveform.forEach((val, idx) => {
        const timeOffset = (idx / waveform.length) * (duration / playbackSpeed);
        const freqMod = baseFreq + (val - 50) * 1.8;
        osc.frequency.linearRampToValueAtTime(freqMod, ctx.currentTime + timeOffset);
      });

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (duration / playbackSpeed));

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + (duration / playbackSpeed));
    } catch {
      // AudioContext might be blocked until user gesture, which is handled
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) audioRef.current.pause();
    } else {
      setIsPlaying(true);

      // If we have a real audio URL
      if (voiceNote.audioUrl) {
        if (!audioRef.current || audioRef.current.src !== voiceNote.audioUrl) {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          audioRef.current = new Audio(voiceNote.audioUrl);
          audioRef.current.playbackRate = playbackSpeed;
          audioRef.current.onended = () => {
            setIsPlaying(false);
            setPlaybackProgress(0);
            if (intervalRef.current) clearInterval(intervalRef.current);
          };
        }
        audioRef.current.currentTime = playbackProgress * duration;
        audioRef.current.playbackRate = playbackSpeed;
        audioRef.current.play().catch(() => {
          // If playback error, fallback to audible synthesis so receiver is never muted/silent
          playSynthesizedMelody();
        });
      } else {
        // Fallback acoustic voice synthesis simulation
        playSynthesizedMelody();
      }

      const totalMs = (duration * 1000) / playbackSpeed;
      const startProgress = playbackProgress;
      const startTime = Date.now() - (startProgress * totalMs);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const p = Math.min(1, elapsed / totalMs);
        setPlaybackProgress(p);

        if (p >= 1) {
          setIsPlaying(false);
          setPlaybackProgress(0);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 50);
    }
  };

  const handleBarClick = (index: number) => {
    const newProgress = index / waveform.length;
    setPlaybackProgress(newProgress);
    if (audioRef.current) {
      audioRef.current.currentTime = newProgress * duration;
    }
  };

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const currentSeconds = Math.floor(playbackProgress * duration);
  const formattedCurrent = `0:${currentSeconds < 10 ? '0' : ''}${currentSeconds}`;
  const formattedTotal = `0:${duration < 10 ? '0' : ''}${duration}`;

  return (
    <div className="w-[230px] sm:w-[260px] py-0 select-none">
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={togglePlay}
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs transition-all ${
            isMe
              ? 'bg-white text-[#5B9DFF] hover:bg-slate-50'
              : 'neu-raised text-[#5B9DFF] hover:bg-slate-50'
          }`}
          aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        >
          {isPlaying ? (
            <Pause className="w-3 h-3 fill-current" />
          ) : (
            <Play className="w-3 h-3 fill-current translate-x-0.5" />
          )}
        </motion.button>

        {/* Waveform & Scrubber */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[2px] h-5 cursor-pointer py-0">
            {waveform.map((val, idx) => {
              const barProgress = idx / waveform.length;
              const isPassed = barProgress <= playbackProgress;
              const heightPercent = Math.max(18, Math.min(100, val));

              return (
                <div
                  key={idx}
                  onClick={() => handleBarClick(idx)}
                  className="flex-1 flex items-center justify-center h-full group"
                >
                  <motion.div
                    animate={
                      isPlaying && Math.abs(barProgress - playbackProgress) < 0.1
                        ? { scaleY: [1, 1.25, 0.9, 1] }
                        : { scaleY: 1 }
                    }
                    transition={{ repeat: isPlaying ? Infinity : 0, duration: 0.4 }}
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[3px] rounded-full transition-colors duration-150 ${
                      isMe
                        ? isPassed
                          ? 'bg-white'
                          : 'bg-white/40'
                        : isPassed
                        ? 'bg-[#5B9DFF]'
                        : 'bg-slate-300'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Timers and Speed */}
          <div
            className={`flex items-center justify-between text-[8.5px] font-semibold mt-0.5 ${
              isMe ? 'text-white/85' : 'text-slate-500'
            }`}
          >
            <div className="flex items-center gap-1">
              <Mic className="w-2 h-2 opacity-70" />
              <span>{isPlaying ? formattedCurrent : formattedTotal}</span>
            </div>

            <button
              onClick={cycleSpeed}
              className={`px-1 py-0 rounded font-bold text-[7.5px] transition leading-tight ${
                isMe
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'neu-inset text-[#5B9DFF]'
              }`}
            >
              {playbackSpeed}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
