/**
 * Audio Utilities — Waveform peak extraction
 * 
 * Uses Web Audio API to decode audio and extract amplitude peaks
 * for visualization. The original file bytes are NEVER modified —
 * decoding happens on a copy of the ArrayBuffer.
 */

/**
 * Extract waveform peaks from an audio ArrayBuffer.
 * 
 * @param {ArrayBuffer} arrayBuffer - Raw audio file bytes (will NOT be modified — we slice a copy)
 * @param {number} numPeaks - Number of peaks to extract (controls waveform resolution)
 * @returns {Promise<{ peaks: number[], duration: number }>}
 *   peaks: normalized 0-1 amplitude values
 *   duration: audio duration in seconds
 */
export const generateWaveformPeaks = async (arrayBuffer, numPeaks = 300) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  try {
    // IMPORTANT: slice() creates a copy — the original ArrayBuffer stays untouched
    const bufferCopy = arrayBuffer.slice(0);
    const audioBuffer = await audioContext.decodeAudioData(bufferCopy);
    
    const rawData = audioBuffer.getChannelData(0); // Use first channel
    const samples = rawData.length;
    const blockSize = Math.floor(samples / numPeaks);
    
    if (blockSize === 0) {
      return { peaks: new Array(numPeaks).fill(0), duration: audioBuffer.duration };
    }
    
    const peaks = [];
    for (let i = 0; i < numPeaks; i++) {
      let sum = 0;
      const start = blockSize * i;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j] || 0);
      }
      peaks.push(sum / blockSize);
    }
    
    // Normalize peaks to 0-1 range
    const maxPeak = Math.max(...peaks, 0.001);
    const normalized = peaks.map(p => p / maxPeak);
    
    return { peaks: normalized, duration: audioBuffer.duration };
  } finally {
    await audioContext.close();
  }
};

/**
 * Get file extension from a filename or mime type.
 * Used to determine the export filename.
 */
export const getAudioExtension = (fileName, mimeType) => {
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'webm'].includes(ext)) return ext;
  }
  if (mimeType) {
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('aac')) return 'aac';
    if (mimeType.includes('webm')) return 'webm';
  }
  return 'mp3';
};

/**
 * Convert an ArrayBuffer to a downloadable Blob.
 * This preserves the original bytes exactly — no transcoding.
 */
export const arrayBufferToBlob = (arrayBuffer, mimeType = 'audio/mpeg') => {
  return new Blob([arrayBuffer], { type: mimeType });
};