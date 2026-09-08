import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  RotateCcw,
  Zap,
  ZapOff,
  RefreshCw,
  AlertCircle,
  Sun,
  Timer,
  Grid,
  Smile,
  Send,
  Bookmark,
  ChevronDown,
  Infinity as InfinityIcon,
  Columns2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MediaPickerResult } from '../services/mediaPickerService';

export interface DeviceCameraModalProps {
  isOpen: boolean;
  mode?: 'photo' | 'video';
  facingMode?: 'user' | 'environment';
  title?: string;
  onCapture: (result: MediaPickerResult) => void;
  onCancel: () => void;
}

type FlashMode = 'off' | 'on' | 'screen-light';

export interface CameraFilterPreset {
  id: string;
  name: string;
  cssFilter: string;
  previewUrl: string;
}

const INSTA_FILTERS: CameraFilterPreset[] = [
  {
    id: 'aesthetic-blur',
    name: 'Aesthetic blur',
    cssFilter: 'contrast(1.08) brightness(1.04) saturate(1.15)',
    previewUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'golden-hour',
    name: 'Golden Glow',
    cssFilter: 'sepia(0.24) saturate(1.3) brightness(1.06) contrast(1.05)',
    previewUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    cssFilter: 'hue-rotate(28deg) contrast(1.28) saturate(1.4) brightness(1.02)',
    previewUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'noir-cinema',
    name: 'Noir Cinema',
    cssFilter: 'grayscale(1) contrast(1.32) brightness(0.98)',
    previewUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'vintage-90s',
    name: 'Vintage 90s',
    cssFilter: 'sepia(0.32) contrast(1.12) brightness(1.05) saturate(0.92)',
    previewUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'nordic-chill',
    name: 'Nordic Chill',
    cssFilter: 'hue-rotate(-15deg) saturate(0.85) brightness(1.08) contrast(1.14)',
    previewUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'normal',
    name: 'Original',
    cssFilter: 'none',
    previewUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  },
];

export const DeviceCameraModal: React.FC<DeviceCameraModalProps> = ({
  isOpen,
  facingMode: initialFacingMode = 'environment',
  onCapture,
  onCancel,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // States
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(initialFacingMode);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [isCapturingFlash, setIsCapturingFlash] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<0 | 3 | 10>(0);
  const [countdownActive, setCountdownActive] = useState<number | null>(null);
  const [showExtraTools, setShowExtraTools] = useState(false);
  const [isBoomerangActive, setIsBoomerangActive] = useState(false);
  const [isSavedBookmark, setIsSavedBookmark] = useState(false);

  // Filter Selection
  const [selectedFilter, setSelectedFilter] = useState<CameraFilterPreset>(INSTA_FILTERS[0]);
  const [pressingFilterId, setPressingFilterId] = useState<string | null>(null);

  // Interactive Tap to Focus Reticle
  const [focusTarget, setFocusTarget] = useState<{ x: number; y: number; id: number } | null>(null);

  // Review stage after capture
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [reviewCaption, setReviewCaption] = useState<string>('');

  // Play synthesized shutter sound
  const playShutterSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // First click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);

      // Second mechanical click
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(450, ctx.currentTime);
          osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.06);

          gain2.gain.setValueAtTime(0.3, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.06);

          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.06);
        } catch {}
      }, 70);
    } catch {
      // Audio not supported or blocked, fail silently
    }
  }, []);

  // Initialize or flip camera stream
  const startCameraStream = useCallback(async (facing: 'user' | 'environment') => {
    setHasPermissionError(false);
    setErrorMessage('');
    setIsStreamReady(false);

    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      mediaStreamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device access is not supported in this browser.');
      }

      let stream: MediaStream | null = null;
      let lastError: any = null;

      // Attempt 1: Ideal facingMode and preferred resolution
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920, max: 2560 },
            height: { ideal: 1080, max: 1440 },
          },
          audio: false,
        });
      } catch (err1) {
        lastError = err1;
      }

      // Attempt 2: Exact facingMode constraint
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: facing,
            },
            audio: false,
          });
        } catch (errExact) {
          lastError = errExact;
        }
      }

      // Attempt 3: If front/user camera requested but device lacks front camera, fallback to environment
      if (!stream && facing === 'user') {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
            },
            audio: false,
          });
          if (stream) {
            setCurrentFacingMode('environment');
          }
        } catch (errFallback) {
          lastError = errFallback;
        }
      }

      // Attempt 4: Standard generic video stream without facing constraint
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (err3) {
          lastError = err3;
        }
      }

      if (!stream) {
        throw lastError || new Error('Could not access camera hardware.');
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('muted', 'true');

        const markReadyAndPlay = async () => {
          try {
            if (video.paused) {
              await video.play();
            }
            setIsStreamReady(true);
          } catch (playErr) {
            console.warn('Video play warning:', playErr);
          }
        };

        video.onloadeddata = () => setIsStreamReady(true);
        video.onplaying = () => setIsStreamReady(true);
        video.onloadedmetadata = () => markReadyAndPlay();
        video.oncanplay = () => markReadyAndPlay();

        markReadyAndPlay();
      }
    } catch (err: any) {
      console.warn('getUserMedia error:', err);
      setHasPermissionError(true);
      setIsStreamReady(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera access was blocked by your browser. Please allow camera permissions to take live photos.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No camera hardware was detected on your device.');
      } else {
        setErrorMessage(err.message || 'Could not start camera.');
      }
    }
  }, []);

  // Clean up tracks when closing
  const stopAllTracks = useCallback(() => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
      } catch {}
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreamReady(false);
  }, []);

  const handleCloseModal = useCallback(
    (cleanHistory = true) => {
      try {
        stopAllTracks();
      } catch (err) {
        console.error('Error stopping tracks on modal close:', err);
      }
      if (cleanHistory && window.history.state?.funshannModal === 'camera') {
        try {
          window.history.back();
        } catch {}
      }
      onCancel();
    },
    [onCancel, stopAllTracks]
  );

  // Hook Android system back button and browser history
  useEffect(() => {
    if (!isOpen) return;

    const previousHandler = (window as any).__funshannHandleBack;
    (window as any).__funshannHandleBack = () => {
      handleCloseModal(false);
      return true;
    };

    try {
      window.history.pushState({ funshannModal: 'camera' }, '');
    } catch {}

    const handlePopState = () => {
      handleCloseModal(false);
    };

    window.addEventListener('popstate', handlePopState);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCloseModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      (window as any).__funshannHandleBack = previousHandler || null;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleCloseModal]);

  // Handle open / close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedPhotoUrl(null);
      setCapturedFile(null);
      setReviewCaption('');
      setZoomLevel(1);
      const defaultFacing = initialFacingMode || 'environment';
      setCurrentFacingMode(defaultFacing);
      startCameraStream(defaultFacing);
    } else {
      stopAllTracks();
    }

    return () => {
      stopAllTracks();
    };
  }, [isOpen, initialFacingMode, startCameraStream, stopAllTracks]);

  // Toggle Front / Back Camera
  const handleFlipCamera = () => {
    const nextFacing = currentFacingMode === 'user' ? 'environment' : 'user';
    setCurrentFacingMode(nextFacing);
    startCameraStream(nextFacing);
  };

  // Tap-to-Focus Reticle
  const handleViewfinderTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newTarget = { x, y, id: Date.now() };
    setFocusTarget(newTarget);

    // Auto-dismiss focus target after 2.5 seconds
    setTimeout(() => {
      setFocusTarget((current) => (current?.id === newTarget.id ? null : current));
    }, 2500);
  };

  // Take Snapshot Photo with selected Filter & Digital Zoom baked into canvas
  const performActualCapture = useCallback((filterToUse: CameraFilterPreset = selectedFilter) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Trigger visual shutter flash
    setIsCapturingFlash(true);
    setTimeout(() => setIsCapturingFlash(false), 220);
    playShutterSound();

    // Mirror image if selfie / front camera
    if (currentFacingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    // Apply Filter to canvas context
    if (filterToUse.cssFilter && filterToUse.cssFilter !== 'none') {
      try {
        ctx.filter = filterToUse.cssFilter;
      } catch {}
    }

    // Digital Zoom crop calculation
    if (zoomLevel > 1) {
      const cropW = width / zoomLevel;
      const cropH = height / zoomLevel;
      const cropX = (width - cropW) / 2;
      const cropY = (height - cropH) / 2;
      ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, width, height);
    } else {
      ctx.drawImage(video, 0, 0, width, height);
    }

    // Reset filter
    try {
      ctx.filter = 'none';
    } catch {}

    const dataUrl = canvas.toDataURL('image/jpeg', 0.94);
    setCapturedPhotoUrl(dataUrl);

    const filename = `photo_${Date.now()}.jpg`;
    try {
      const arr = dataUrl.split(',');
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const syncFile = new File([u8arr], filename, { type: 'image/jpeg' });
      setCapturedFile(syncFile);
    } catch {
      setCapturedFile(new File([], filename, { type: 'image/jpeg' }));
    }
  }, [currentFacingMode, playShutterSound, selectedFilter, zoomLevel]);

  // Trigger capture with optional countdown timer
  const triggerCapture = useCallback((filterToUse: CameraFilterPreset = selectedFilter) => {
    if (timerSeconds > 0) {
      setCountdownActive(timerSeconds);
      let count = timerSeconds;
      const interval = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(interval);
          setCountdownActive(null);
          performActualCapture(filterToUse);
        } else {
          setCountdownActive(count);
        }
      }, 1000);
    } else {
      performActualCapture(filterToUse);
    }
  }, [performActualCapture, selectedFilter, timerSeconds]);

  // Long press detection on filter circle (or tap to select/capture)
  const handleFilterPointerDown = (filter: CameraFilterPreset) => {
    setPressingFilterId(filter.id);
    setSelectedFilter(filter);

    // If user holds down on any filter circle, picture clicks!
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      setPressingFilterId(null);
      triggerCapture(filter);
    }, 400); // 400ms long-press triggers capture
  };

  const handleFilterPointerUp = (filter: CameraFilterPreset) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressingFilterId(null);

    // If already the selected filter, a deliberate click also captures
    if (selectedFilter.id === filter.id) {
      triggerCapture(filter);
    } else {
      setSelectedFilter(filter);
    }
  };

  const handleFilterPointerCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPressingFilterId(null);
  };

  // Retake
  const handleRetake = () => {
    setCapturedPhotoUrl(null);
    setCapturedFile(null);
    setReviewCaption('');
    startCameraStream(currentFacingMode);
  };

  // Confirm and Use Captured Media
  const handleConfirmMedia = () => {
    if (capturedPhotoUrl) {
      const file =
        capturedFile ||
        new File([new Blob()], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });

      stopAllTracks();
      onCapture({
        url: capturedPhotoUrl,
        file,
        isVideo: false,
        name: file.name,
        size: file.size || capturedPhotoUrl.length,
        type: 'image/jpeg',
      });
    }
  };

  // Fallback direct input click when hardware camera is denied or gallery thumbnail tapped
  const handleFallbackFileClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = currentFacingMode;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            stopAllTracks();
            onCapture({
              url: reader.result,
              file,
              isVideo: false,
              name: file.name,
              size: file.size,
              type: file.type || 'image/jpeg',
            });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div
      id="device-camera-modal"
      className="fixed inset-0 z-[120] bg-black text-white flex flex-col justify-between select-none overflow-hidden font-['Outfit']"
    >
      {/* Screen Flash Animation */}
      {isCapturingFlash && (
        <motion.div
          initial={{ opacity: 0.9 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="absolute inset-0 bg-white z-[90] pointer-events-none"
        />
      )}

      {/* Front Camera Soft Ring Light (Ambient Glow) */}
      {flashMode === 'screen-light' && !capturedPhotoUrl && (
        <div className="absolute inset-0 border-[28px] border-amber-200/90 pointer-events-none z-30 shadow-[inset_0_0_80px_rgba(251,191,36,0.5)] transition-all" />
      )}

      {/* Full-Screen Camera Video / Viewfinder Background */}
      {!capturedPhotoUrl && (
        <div
          onClick={handleViewfinderTap}
          className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden cursor-crosshair z-0"
        >
          {hasPermissionError ? (
            <div className="p-6 text-center text-white max-w-sm space-y-4 bg-slate-900/95 rounded-[28px] border border-slate-800 backdrop-blur-md z-30 mx-4">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold">Camera Access Required</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {errorMessage}
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => startCameraStream(currentFacingMode)}
                  className="w-full h-11 rounded-full bg-[#5B9DFF] text-white font-bold text-xs hover:bg-blue-600 transition cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  Retry Camera Access
                </button>
                <button
                  type="button"
                  onClick={handleFallbackFileClick}
                  className="w-full h-10 rounded-full bg-white/15 text-white font-semibold text-xs hover:bg-white/25 transition cursor-pointer"
                >
                  Choose from Device Files
                </button>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              controls={false}
              disablePictureInPicture
              disableRemotePlayback
              style={{
                filter: selectedFilter.cssFilter,
                transform: `${currentFacingMode === 'user' ? 'scaleX(-1)' : ''} scale(${zoomLevel})`,
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-200 ${
                isStreamReady ? 'opacity-100' : 'opacity-0'
              }`}
            />
          )}

          {/* Rule-of-Thirds Grid */}
          {showGrid && !hasPermissionError && (
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25 z-10">
              <div className="border-r border-b border-white/80" />
              <div className="border-r border-b border-white/80" />
              <div className="border-b border-white/80" />
              <div className="border-r border-b border-white/80" />
              <div className="border-r border-b border-white/80" />
              <div className="border-b border-white/80" />
              <div className="border-r border-b border-white/80" />
              <div className="border-r border-b border-white/80" />
              <div />
            </div>
          )}

          {/* Tap-to-Focus Reticle with Pulse Ring */}
          <AnimatePresence>
            {focusTarget && (
              <motion.div
                key={focusTarget.id}
                initial={{ scale: 1.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                style={{ left: `${focusTarget.x}%`, top: `${focusTarget.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
              >
                <div className="w-16 h-16 rounded-lg border-2 border-amber-400/90 relative flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <div className="absolute -right-6 top-1/2 -translate-y-1/2 text-amber-300">
                    <Sun className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Countdown Overlay when timer is active */}
          {countdownActive !== null && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50">
              <motion.span
                key={countdownActive}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 1.8, opacity: 0 }}
                className="text-7xl font-extrabold text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.8)]"
              >
                {countdownActive}
              </motion.span>
            </div>
          )}
        </div>
      )}

      {/* Review Stage: Full-screen Captured Photo */}
      {capturedPhotoUrl && (
        <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center z-0">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={capturedPhotoUrl}
              alt="Captured Frame"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* Top Floating Header */}
      <div className="w-full px-4 pt-3.5 pb-3 flex items-center justify-between z-40 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          {/* Close Button */}
          <button
            type="button"
            onClick={() => handleCloseModal()}
            className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 active:scale-95 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer border border-white/15 shadow-sm"
            title="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Controls: Flash & Expandable Tools Drawer */}
        {!capturedPhotoUrl && (
          <div className="flex items-center gap-2">
            {/* Flash Switcher */}
            <button
              type="button"
              onClick={() => {
                const nextFlash: FlashMode = flashMode === 'off' ? 'on' : flashMode === 'on' ? 'screen-light' : 'off';
                setFlashMode(nextFlash);
              }}
              className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition cursor-pointer border ${
                flashMode === 'on'
                  ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-md shadow-amber-500/30'
                  : flashMode === 'screen-light'
                  ? 'bg-amber-200 text-amber-900 border-amber-100 shadow-md shadow-amber-300/40'
                  : 'bg-black/40 text-white/80 border-white/15 hover:bg-black/60'
              }`}
              title={`Flash: ${flashMode}`}
            >
              {flashMode === 'on' ? (
                <Zap className="w-4 h-4 fill-slate-900" />
              ) : flashMode === 'screen-light' ? (
                <Sun className="w-4 h-4 text-amber-900" />
              ) : (
                <ZapOff className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Left Side Vertical Toolbar (Instagram Story Style) */}
      {!capturedPhotoUrl && (
        <div className="absolute left-4 top-28 z-40 flex flex-col items-center gap-6 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {/* Create / Aa mode button */}
          <button
            type="button"
            onClick={() => {
              // Quick focus caption mode or toggle aesthetic caption
              const newPrompt = prompt('Add story text / caption:', reviewCaption);
              if (newPrompt !== null) {
                setReviewCaption(newPrompt);
              }
            }}
            className="flex items-center justify-center w-8 h-8 text-white hover:text-[#5B9DFF] active:scale-90 transition-transform cursor-pointer"
            title="Create Text / Caption"
          >
            <span className="font-serif font-bold text-xl leading-none tracking-tight">Aa</span>
          </button>

          {/* Infinity / Boomerang button */}
          <button
            type="button"
            onClick={() => setIsBoomerangActive(!isBoomerangActive)}
            className={`flex items-center justify-center w-8 h-8 transition-transform cursor-pointer active:scale-90 ${
              isBoomerangActive ? 'text-amber-400' : 'text-white hover:text-white/80'
            }`}
            title="Boomerang Motion Loop"
          >
            <InfinityIcon className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Layout Grid toggle button */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`flex items-center justify-center w-8 h-8 transition-transform cursor-pointer active:scale-90 ${
              showGrid ? 'text-[#5B9DFF]' : 'text-white hover:text-white/80'
            }`}
            title="Layout Grid"
          >
            <Columns2 className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Expand Down Arrow for Extra Tools (Timer, Zoom) */}
          <button
            type="button"
            onClick={() => setShowExtraTools(!showExtraTools)}
            className={`flex items-center justify-center w-8 h-8 transition-transform cursor-pointer active:scale-90 ${
              showExtraTools ? 'rotate-180 text-amber-400' : 'text-white hover:text-white/80'
            }`}
            title="More Options"
          >
            <ChevronDown className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Drawer for Extra Tools */}
          <AnimatePresence>
            {showExtraTools && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center gap-4 bg-black/60 backdrop-blur-xl p-2.5 rounded-full border border-white/15 shadow-2xl"
              >
                {/* Timer Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextTimer: 0 | 3 | 10 = timerSeconds === 0 ? 3 : timerSeconds === 3 ? 10 : 0;
                    setTimerSeconds(nextTimer);
                  }}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    timerSeconds > 0 ? 'bg-blue-500 text-white' : 'text-white/80 hover:text-white'
                  }`}
                  title="Countdown Timer"
                >
                  <Timer className="w-4 h-4" />
                </button>

                {/* Grid Lines Toggle */}
                <button
                  type="button"
                  onClick={() => setShowGrid(!showGrid)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    showGrid ? 'bg-white text-black' : 'text-white/80 hover:text-white'
                  }`}
                  title="Rule-of-Thirds Grid"
                >
                  <Grid className="w-4 h-4" />
                </button>

                {/* Quick Zoom Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextZ = zoomLevel === 1 ? 2 : zoomLevel === 2 ? 0.5 : 1;
                    setZoomLevel(nextZ);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-white/20 hover:bg-white/30"
                  title="Cycle Zoom"
                >
                  {zoomLevel}x
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Spacer between top HUD and bottom controls */}
      <div className="flex-1 pointer-events-none" />

      {/* Bottom Camera Interface Dock (Instagram Story Filter & Control Bar) */}
      <div className="w-full flex flex-col z-40 bg-gradient-to-t from-black via-black/90 to-transparent pt-4 pb-7 sm:pb-9">
        {capturedPhotoUrl ? (
          /* Review & Action Bar (Caption, Retake, Send) */
          <div className="w-full max-w-md mx-auto px-6 flex flex-col gap-3">
            {/* Optional Caption Input */}
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20">
              <input
                type="text"
                value={reviewCaption}
                onChange={(e) => setReviewCaption(e.target.value)}
                placeholder="Add a caption..."
                className="w-full bg-transparent text-xs text-white placeholder-white/50 focus:outline-hidden"
              />
              <Smile className="w-4 h-4 text-white/60" />
            </div>

            {/* Action Buttons: Retake vs Send Photo */}
            <div className="w-full flex items-center justify-between gap-3">
              <motion.button
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={handleRetake}
                className="flex-1 h-12 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-white/15 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.94 }}
                type="button"
                onClick={handleConfirmMedia}
                className="flex-1 h-12 rounded-full bg-gradient-to-r from-[#5B9DFF] to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/40 transition cursor-pointer"
              >
                <Send className="w-4 h-4 fill-white" />
                <span>Send Photo</span>
              </motion.button>
            </div>
          </div>
        ) : (
          /* Live Filter Carousel (No separate shutter button - Long-press/tap on any filter takes picture!) */
          <div className="w-full flex flex-col items-center">
            {/* Horizontal Filter Circles Strip */}
            <div
              ref={carouselRef}
              className="w-full flex items-center justify-center gap-4.5 px-4 overflow-x-auto no-scrollbar scroll-smooth py-2"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {INSTA_FILTERS.map((filter) => {
                const isSelected = selectedFilter.id === filter.id;
                const isPressing = pressingFilterId === filter.id;

                return (
                  <div
                    key={filter.id}
                    className="relative flex items-center justify-center flex-shrink-0 cursor-pointer"
                  >
                    {/* Outer Ring Expansion Animation while long-pressing */}
                    {isPressing && (
                      <motion.div
                        initial={{ scale: 1, opacity: 0.8 }}
                        animate={{ scale: 1.35, opacity: 0 }}
                        transition={{ duration: 0.4, repeat: Infinity }}
                        className="absolute inset-0 rounded-full border-2 border-white pointer-events-none"
                      />
                    )}

                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      type="button"
                      onPointerDown={() => handleFilterPointerDown(filter)}
                      onPointerUp={() => handleFilterPointerUp(filter)}
                      onPointerCancel={handleFilterPointerCancel}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        triggerCapture(filter);
                      }}
                      className={`relative rounded-full transition-all duration-200 flex items-center justify-center overflow-hidden select-none ${
                        isSelected
                          ? 'w-[74px] h-[74px] p-[3px] border-[3.5px] border-white shadow-[0_0_20px_rgba(255,255,255,0.45)]'
                          : 'w-[52px] h-[52px] border border-white/35 opacity-75 hover:opacity-100'
                      }`}
                      title={`${filter.name} (Hold or tap to click picture)`}
                      aria-label={`Select ${filter.name} and click photo`}
                    >
                      <img
                        src={filter.previewUrl}
                        alt={filter.name}
                        className="w-full h-full object-cover rounded-full pointer-events-none"
                        style={{ filter: filter.cssFilter }}
                      />
                    </motion.button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Row: Gallery Thumbnail (Left) | Filter Name Pill (Center) | Switch Camera (Right) */}
            <div className="w-full max-w-md mx-auto px-6 pt-3 flex items-center justify-between">
              {/* Gallery Thumbnail on Left */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={handleFallbackFileClick}
                className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white/60 bg-neutral-900 shadow-md flex items-center justify-center cursor-pointer group"
                title="Open Gallery"
                aria-label="Open Gallery"
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                  alt="Gallery"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              </motion.button>

              {/* Central Filter Pill: Bookmark + Name + Reset 'x' */}
              <div className="px-4 py-2 rounded-full bg-neutral-900/85 backdrop-blur-xl border border-white/15 flex items-center gap-2.5 shadow-xl">
                {/* Bookmark save toggle */}
                <button
                  type="button"
                  onClick={() => setIsSavedBookmark(!isSavedBookmark)}
                  className="cursor-pointer text-white/70 hover:text-white transition-colors"
                  title="Save Filter"
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      isSavedBookmark ? 'fill-white text-white' : 'text-white/80'
                    }`}
                  />
                </button>

                {/* Filter Name */}
                <span className="text-xs font-semibold text-white tracking-wide select-none">
                  {selectedFilter.name}
                </span>

                {/* Reset to Normal Filter */}
                <button
                  type="button"
                  onClick={() => {
                    const normalPreset = INSTA_FILTERS.find((f) => f.id === 'normal') || INSTA_FILTERS[INSTA_FILTERS.length - 1];
                    setSelectedFilter(normalPreset);
                  }}
                  className="w-4 h-4 rounded-full bg-white/20 hover:bg-white/35 flex items-center justify-center text-white/90 cursor-pointer transition-colors"
                  title="Reset Filter"
                >
                  <X className="w-2.5 h-2.5 stroke-[3]" />
                </button>
              </div>

              {/* Modern Switch Camera on Right */}
              <motion.button
                whileTap={{ scale: 0.88, rotate: 180 }}
                transition={{ duration: 0.25 }}
                type="button"
                onClick={handleFlipCamera}
                className="w-11 h-11 rounded-full flex items-center justify-center text-white/90 hover:text-white cursor-pointer group active:scale-90"
                title={`Switch to ${currentFacingMode === 'user' ? 'Rear' : 'Front'} Camera`}
                aria-label="Switch Camera"
              >
                <RefreshCw className="w-6 h-6 text-white stroke-[2.2] group-hover:text-[#5B9DFF] transition-colors" />
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
