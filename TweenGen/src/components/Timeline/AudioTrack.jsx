import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  Box, Typography, IconButton, Slider, Tooltip, Paper, Button,
} from '@mui/material';
import {
  VolumeUp as VolumeIcon,
  VolumeOff as MuteIcon,
  Close as RemoveIcon,
  MusicNote as MusicIcon,
  GraphicEq as WaveformIcon,
  ContentCut as TrimIcon,
} from '@mui/icons-material';
import { useAudioFile, useAudioWaveform, useAudioVolume, useAudioMuted, useAudioRegion } from '../../store/audioHooks';
import { useCurrentTime, useDuration, useIsPlaying } from '../../store/hooks';

// ===================================================================
// Colors
// ===================================================================
const REGION_COLOR = 'rgba(59, 130, 246, 0.12)';
const REGION_BORDER = 'rgba(59, 130, 246, 0.8)';
const PLAYED_TOP = 'rgba(59, 130, 246, 0.9)';
const PLAYED_BOTTOM = 'rgba(124, 58, 237, 0.9)';
const IN_REGION_TOP = 'rgba(59, 130, 246, 0.5)';
const IN_REGION_BOTTOM = 'rgba(124, 58, 237, 0.5)';
const OUT_REGION_TOP = 'rgba(59, 130, 246, 0.1)';
const OUT_REGION_BOTTOM = 'rgba(124, 58, 237, 0.1)';
const PLAYHEAD_COLOR = 'rgba(239, 68, 68, 0.95)';
const DIM_OVERLAY = 'rgba(255, 255, 255, 0.6)';
const BG_COLOR = 'rgba(241, 245, 249, 1)';
const CENTER_LINE = 'rgba(148, 163, 184, 0.3)';
const HANDLE_COLOR = 'rgba(59, 130, 246, 0.95)';
const HANDLE_HOVER = 'rgba(37, 99, 235, 1)';

const formatTime = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
};

// ===================================================================
// Main Component
// ===================================================================

const AudioTrack = () => {
  const [audioFile, setAudioFile] = useAudioFile();
  const [waveform, setWaveform] = useAudioWaveform();
  const [volume, setVolume] = useAudioVolume();
  const [muted, setMuted] = useAudioMuted();
  const [region, setRegion] = useAudioRegion();
  const [currentTime] = useCurrentTime();
  const [duration] = useDuration();
  const [isPlaying] = useIsPlaying();

  if (!audioFile) return null;

  const audioDuration = audioFile.duration || 0;

  // Compute effective region (default: start=0, end=min(audioDuration, duration))
  const effectiveRegion = region || { start: 0, end: Math.min(audioDuration, duration) };
  const regionDuration = effectiveRegion.end - effectiveRegion.start;

  const handleRemove = () => {
    setAudioFile(null);
    setWaveform([]);
    setRegion(null);
  };

  const handleFitToDuration = () => {
    // Set region end = start + animation duration (clamped to audio length)
    const start = effectiveRegion.start;
    const end = Math.min(start + duration, audioDuration);
    setRegion({ start, end });
  };

  const handleResetRegion = () => {
    setRegion(null);
  };

  const displayName = audioFile.fileName?.length > 18
    ? audioFile.fileName.slice(0, 15) + '...'
    : audioFile.fileName || 'Audio';

  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'flex', flexDirection: 'column',
        borderColor: 'primary.light', borderWidth: 2,
        bgcolor: 'rgba(59, 130, 246, 0.03)',
        borderRadius: 1, overflow: 'hidden', mt: 1,
      }}
    >
      {/* Top bar: controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', p: 1, gap: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        <MusicIcon sx={{ fontSize: 16, color: 'primary.main' }} />
        <Tooltip title={audioFile.fileName || 'Audio'} placement="top">
          <Typography variant="caption" fontWeight={700} color="primary.dark" noWrap sx={{ minWidth: 60 }}>
            {displayName}
          </Typography>
        </Tooltip>

        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          {formatTime(audioDuration)}
        </Typography>

        <Box sx={{ mx: 0.5, height: 16, borderLeft: '1px solid', borderColor: 'divider' }} />

        {/* Region info */}
        <TrimIcon sx={{ fontSize: 14, color: 'primary.main', opacity: 0.6 }} />
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'primary.dark', fontFamily: 'monospace' }}>
          {formatTime(effectiveRegion.start)} — {formatTime(effectiveRegion.end)}
          <span style={{ opacity: 0.5, marginLeft: 4 }}>({formatTime(regionDuration)})</span>
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Volume */}
        <Tooltip title={muted ? 'Unmute' : 'Mute'} placement="top">
          <IconButton size="small" onClick={() => setMuted(p => !p)} sx={{ p: 0.3 }}>
            {muted ? <MuteIcon sx={{ fontSize: 16, color: 'text.secondary' }} /> : <VolumeIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
          </IconButton>
        </Tooltip>
        <Slider
          value={muted ? 0 : volume}
          onChange={(_, v) => setVolume(v)}
          min={0} max={1} step={0.01} size="small"
          sx={{ width: 60, mx: 0.5, '& .MuiSlider-thumb': { width: 10, height: 10 } }}
        />

        {/* Fit / Reset / Remove */}
        <Tooltip title="Set audio region to match animation duration" placement="top">
          <Button size="small" variant="outlined" onClick={handleFitToDuration}
            sx={{ fontSize: '0.6rem', py: 0, px: 0.75, minWidth: 'auto', textTransform: 'none' }}>
            Fit to {duration.toFixed(1)}s
          </Button>
        </Tooltip>

        {region && (
          <Tooltip title="Reset to full audio" placement="top">
            <Button size="small" onClick={handleResetRegion}
              sx={{ fontSize: '0.6rem', py: 0, px: 0.75, minWidth: 'auto', textTransform: 'none' }}>
              Reset
            </Button>
          </Tooltip>
        )}

        <Tooltip title="Remove audio" placement="top">
          <IconButton size="small" onClick={handleRemove} sx={{ p: 0.3 }}>
            <RemoveIcon sx={{ fontSize: 14, color: 'error.main' }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Waveform with trim handles */}
      <Box sx={{ position: 'relative', height: 70 }}>
        <WaveformCanvas
          peaks={waveform}
          currentTime={currentTime}
          duration={duration}
          audioDuration={audioDuration}
          region={effectiveRegion}
          onRegionChange={setRegion}
          isPlaying={isPlaying}
        />
      </Box>
    </Paper>
  );
};

// ===================================================================
// Waveform Canvas with Trim Handles
// ===================================================================

const WaveformCanvas = ({ peaks, currentTime, duration, audioDuration, region, onRegionChange, isPlaying }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'start' | 'end' | 'body' | null
  const [hovered, setHovered] = useState(null); // 'start' | 'end' | null
  const dragStartRef = useRef(null);

  const timeToX = useCallback((time, width) => {
    if (audioDuration <= 0) return 0;
    return (time / audioDuration) * width;
  }, [audioDuration]);

  const xToTime = useCallback((x, width) => {
    if (width <= 0) return 0;
    return Math.max(0, Math.min(audioDuration, (x / width) * audioDuration));
  }, [audioDuration]);

  // ===== DRAWING =====
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !peaks || peaks.length === 0) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;

    // Center line
    ctx.strokeStyle = CENTER_LINE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Region bounds in pixels
    const regionStartX = timeToX(region.start, width);
    const regionEndX = timeToX(region.end, width);

    // Playhead position: maps animation time to audio region
    const regionDur = region.end - region.start;
    const audioPlayTime = regionDur > 0
      ? region.start + (currentTime / duration) * regionDur
      : region.start;
    const playheadX = timeToX(Math.min(audioPlayTime, audioDuration), width);

    // Draw waveform bars
    const barWidth = width / peaks.length;
    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i] || 0;
      const barHeight = Math.max(2, peak * (height * 0.75));
      const x = i * barWidth;
      const halfBar = barHeight / 2;

      const inRegion = x >= regionStartX && x <= regionEndX;
      const isPlayed = x <= playheadX && inRegion;

      const grad = ctx.createLinearGradient(x, centerY - halfBar, x, centerY + halfBar);
      if (isPlayed) {
        grad.addColorStop(0, PLAYED_TOP);
        grad.addColorStop(1, PLAYED_BOTTOM);
      } else if (inRegion) {
        grad.addColorStop(0, IN_REGION_TOP);
        grad.addColorStop(1, IN_REGION_BOTTOM);
      } else {
        grad.addColorStop(0, OUT_REGION_TOP);
        grad.addColorStop(1, OUT_REGION_BOTTOM);
      }

      ctx.fillStyle = grad;
      const bw = Math.max(1, barWidth - (barWidth > 3 ? 1 : 0));
      ctx.fillRect(x, centerY - halfBar, bw, barHeight);
    }

    // Dim out-of-region areas
    ctx.fillStyle = DIM_OVERLAY;
    if (regionStartX > 0) ctx.fillRect(0, 0, regionStartX, height);
    if (regionEndX < width) ctx.fillRect(regionEndX, 0, width - regionEndX, height);

    // Region border lines
    ctx.strokeStyle = REGION_BORDER;
    ctx.lineWidth = 2;
    [regionStartX, regionEndX].forEach(x => {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    });

    // Region shaded background (subtle)
    ctx.fillStyle = REGION_COLOR;
    ctx.fillRect(regionStartX, 0, regionEndX - regionStartX, height);

    // Trim handles (triangular tabs at top)
    const handleW = 8, handleH = 14;
    // Start handle
    ctx.fillStyle = hovered === 'start' || dragging === 'start' ? HANDLE_HOVER : HANDLE_COLOR;
    ctx.beginPath();
    ctx.moveTo(regionStartX, 0);
    ctx.lineTo(regionStartX + handleW, 0);
    ctx.lineTo(regionStartX + handleW, handleH - 3);
    ctx.lineTo(regionStartX, handleH);
    ctx.closePath();
    ctx.fill();
    // Start handle bottom tab
    ctx.beginPath();
    ctx.moveTo(regionStartX, height);
    ctx.lineTo(regionStartX + handleW, height);
    ctx.lineTo(regionStartX + handleW, height - handleH + 3);
    ctx.lineTo(regionStartX, height - handleH);
    ctx.closePath();
    ctx.fill();

    // End handle
    ctx.fillStyle = hovered === 'end' || dragging === 'end' ? HANDLE_HOVER : HANDLE_COLOR;
    ctx.beginPath();
    ctx.moveTo(regionEndX, 0);
    ctx.lineTo(regionEndX - handleW, 0);
    ctx.lineTo(regionEndX - handleW, handleH - 3);
    ctx.lineTo(regionEndX, handleH);
    ctx.closePath();
    ctx.fill();
    // End handle bottom tab
    ctx.beginPath();
    ctx.moveTo(regionEndX, height);
    ctx.lineTo(regionEndX - handleW, height);
    ctx.lineTo(regionEndX - handleW, height - handleH + 3);
    ctx.lineTo(regionEndX, height - handleH);
    ctx.closePath();
    ctx.fill();

    // Playhead (only if within region)
    if (playheadX >= regionStartX && playheadX <= regionEndX) {
      ctx.strokeStyle = PLAYHEAD_COLOR;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      ctx.fillStyle = PLAYHEAD_COLOR;
      ctx.beginPath();
      ctx.arc(playheadX, 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Time labels at handles
    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatTime(region.start), regionStartX + 10, 10);
    ctx.textAlign = 'right';
    ctx.fillText(formatTime(region.end), regionEndX - 10, 10);

  }, [peaks, currentTime, duration, audioDuration, region, timeToX, hovered, dragging]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const observer = new ResizeObserver(() => draw());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [draw]);

  // ===== MOUSE INTERACTIONS =====
  const getMouseX = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return e.clientX - rect.left;
  };

  const hitTest = (mouseX, width) => {
    const startX = timeToX(region.start, width);
    const endX = timeToX(region.end, width);
    const tolerance = 12;
    if (Math.abs(mouseX - startX) < tolerance) return 'start';
    if (Math.abs(mouseX - endX) < tolerance) return 'end';
    if (mouseX > startX + tolerance && mouseX < endX - tolerance) return 'body';
    return null;
  };

  const handleMouseDown = (e) => {
    if (isPlaying) return; // Don't allow trimming during playback
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const hit = hitTest(mouseX, rect.width);
    if (hit === 'start' || hit === 'end') {
      setDragging(hit);
      dragStartRef.current = { mouseX, region: { ...region } };
      e.preventDefault();
    } else if (hit === 'body') {
      setDragging('body');
      dragStartRef.current = { mouseX, region: { ...region } };
      e.preventDefault();
    }
  };

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;

    if (dragging && dragStartRef.current) {
      const width = rect.width;
      const time = xToTime(mouseX, width);
      const minGap = 0.2; // Minimum 200ms region

      if (dragging === 'start') {
        const newStart = Math.max(0, Math.min(time, region.end - minGap));
        onRegionChange({ start: newStart, end: region.end });
      } else if (dragging === 'end') {
        const newEnd = Math.min(audioDuration, Math.max(time, region.start + minGap));
        onRegionChange({ start: region.start, end: newEnd });
      } else if (dragging === 'body') {
        const dx = mouseX - dragStartRef.current.mouseX;
        const dt = (dx / width) * audioDuration;
        const origStart = dragStartRef.current.region.start;
        const origEnd = dragStartRef.current.region.end;
        const len = origEnd - origStart;
        let newStart = origStart + dt;
        let newEnd = origEnd + dt;
        if (newStart < 0) { newStart = 0; newEnd = len; }
        if (newEnd > audioDuration) { newEnd = audioDuration; newStart = audioDuration - len; }
        onRegionChange({ start: Math.max(0, newStart), end: Math.min(audioDuration, newEnd) });
      }
    } else {
      // Hover detection
      const hit = hitTest(mouseX, rect.width);
      setHovered(hit === 'start' || hit === 'end' ? hit : null);
    }
  }, [dragging, region, audioDuration, xToTime, onRegionChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    dragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const getCursor = () => {
    if (dragging === 'start' || dragging === 'end') return 'col-resize';
    if (dragging === 'body') return 'grabbing';
    if (hovered === 'start' || hovered === 'end') return 'col-resize';
    return 'default';
  };

  return (
    <Box
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={!dragging ? handleMouseMove : undefined}
      onMouseLeave={() => { if (!dragging) setHovered(null); }}
      sx={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        cursor: getCursor(),
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
      />
      {/* Label */}
      <Box sx={{ position: 'absolute', bottom: 2, left: 6, display: 'flex', alignItems: 'center', gap: 0.5, pointerEvents: 'none' }}>
        <WaveformIcon sx={{ fontSize: 10, color: 'primary.main', opacity: 0.4 }} />
        <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'primary.main', opacity: 0.4, fontWeight: 600 }}>
          DRAG HANDLES TO TRIM • DRAG CENTER TO SLIDE
        </Typography>
      </Box>
    </Box>
  );
};

export default AudioTrack;