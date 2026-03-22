/**
 * Audio-specific Recoil hooks.
 */
import { useRecoilState } from 'recoil';
import {
  audioFileState,
  audioWaveformState,
  audioVolumeState,
  audioMutedState,
  audioRegionState,
} from './audioAtoms';

export const useAudioFile = () => useRecoilState(audioFileState);
export const useAudioWaveform = () => useRecoilState(audioWaveformState);
export const useAudioVolume = () => useRecoilState(audioVolumeState);
export const useAudioMuted = () => useRecoilState(audioMutedState);
export const useAudioRegion = () => useRecoilState(audioRegionState);