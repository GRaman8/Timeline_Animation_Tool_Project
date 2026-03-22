/**
 * Audio-specific Recoil atoms.
 * 
 * Kept in a separate file to avoid touching existing atoms.jsx,
 * minimizing risk of breaking existing features.
 */
import { atom } from 'recoil';

/**
 * The uploaded audio file data.
 * null when no audio is loaded.
 * 
 * Shape: {
 *   dataURL: string,        // For HTMLAudioElement playback
 *   fileName: string,       // Original filename (e.g. 'bgm.mp3')
 *   mimeType: string,       // e.g. 'audio/mpeg'
 *   arrayBuffer: ArrayBuffer,// Original bytes — preserved bit-for-bit for export
 *   duration: number,       // Audio duration in seconds
 * }
 */
export const audioFileState = atom({
  key: 'audioFileState',
  default: null,
  dangerouslyAllowMutability: true,
});
 
/**
 * Waveform peaks for visualization (array of 0-1 values).
 */
export const audioWaveformState = atom({
  key: 'audioWaveformState',
  default: [],
});
 
/**
 * Audio volume (0 to 1).
 */
export const audioVolumeState = atom({
  key: 'audioVolumeState',
  default: 1,
});
 
/**
 * Whether audio is muted.
 */
export const audioMutedState = atom({
  key: 'audioMutedState',
  default: false,
});
 
/**
 * Audio trim region — which slice of the audio file to use.
 * 
 * { start: number, end: number } in seconds.
 * 
 * When the animation plays from 0 → duration, the audio plays from
 * region.start → region.end. This maps the animation timeline onto
 * a specific segment of the audio file.
 * 
 * null means "use full audio from 0" (legacy behavior).
 */
export const audioRegionState = atom({
  key: 'audioRegionState',
  default: null,
  // Shape: { start: 0, end: 10 } | null
});