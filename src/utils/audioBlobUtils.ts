/**
 * Audio Blob Utilities for reliable cross-device voice messaging
 */

/**
 * Converts a Blob to a base64 Data URL
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
};

/**
 * Creates a standard WAV audio Blob containing audible vocal-frequency tones
 * matching the recorded waveform. This ensures an audio Blob is always available
 * even if hardware mic was blocked or unavailable in fallback mode.
 */
export const createPlayableAudioBlob = (durationSeconds: number, waveform?: number[]): Blob => {
  const sampleRate = 22050;
  const numChannels = 1;
  const clampedDuration = Math.min(60, Math.max(1, durationSeconds || 2));
  const numSamples = Math.floor(sampleRate * clampedDuration);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // 'RIFF' chunk descriptor
  view.setUint32(0, 0x52494646, false); // 'RIFF'
  view.setUint32(4, 36 + numSamples * 2, true); // chunkSize
  view.setUint32(8, 0x57415645, false); // 'WAVE'

  // 'fmt ' sub-chunk
  view.setUint32(12, 0x666d7420, false); // 'fmt '
  view.setUint32(16, 16, true); // subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // audioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // numChannels
  view.setUint32(24, sampleRate, true); // sampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // byteRate
  view.setUint16(32, numChannels * 2, true); // blockAlign
  view.setUint16(34, 16, true); // bitsPerSample

  // 'data' sub-chunk
  view.setUint32(36, 0x64617461, false); // 'data'
  view.setUint32(40, numSamples * 2, true); // subchunk2Size

  const wf = waveform && waveform.length > 0 ? waveform : [35, 55, 75, 50, 70, 85, 60, 40];
  let phase = 0;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const progress = i / numSamples;
    const wfIndex = Math.min(wf.length - 1, Math.floor(progress * wf.length));
    const mod = (wf[wfIndex] || 50) / 100;
    const freq = 340 + mod * 140; // 340Hz - 480Hz pleasant vocal speech frequency
    phase += (2 * Math.PI * freq) / sampleRate;

    // Smooth entry and exit envelope to avoid clicks
    const envelope = Math.min(1, t * 15) * Math.min(1, (clampedDuration - t) * 15);
    const sample = Math.sin(phase) * 0.28 * mod * envelope;
    view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
};
