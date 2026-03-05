import React, { useRef, useCallback, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Button, 
  Checkbox,
  FormControlLabel,
  TextField,
  Tooltip,
  Snackbar,
  Alert,
} from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  Stop,
  SkipNext,
  SkipPrevious,
  Replay
} from '@mui/icons-material';
import { 
  useIsPlaying, 
  useCurrentTime, 
  useDuration,
  useSelectedObject,
  useFabricCanvas,
  useKeyframes,
  useLoopPlayback,
  useCanvasObjects,
  useLockedTracks,
  useSelectedKeyframe,
} from '../../store/hooks';
import { extractPropertiesFromFabricObject, findFabricObjectById } from '../../utils/fabricHelpers';

const PlaybackControls = () => {
  const [isPlaying, setIsPlaying] = useIsPlaying();
  const [currentTime, setCurrentTime] = useCurrentTime();
  const [duration, setDuration] = useDuration();
  const [selectedObject] = useSelectedObject();
  const [fabricCanvas] = useFabricCanvas();
  const [keyframes, setKeyframes] = useKeyframes();
  const [loopPlayback, setLoopPlayback] = useLoopPlayback();
  const [canvasObjects] = useCanvasObjects();
  const [lockedTracks] = useLockedTracks();
  const [, setSelectedKeyframe] = useSelectedKeyframe();

  const animationFrameRef = useRef(null);
  const playbackStartTimeRef = useRef(null);
  const [snackMessage, setSnackMessage] = React.useState('');
  const [snackSeverity, setSnackSeverity] = React.useState('warning');
  
  // Refs for values read inside rAF loop (avoids stale closure)
  const loopPlaybackRef = useRef(loopPlayback);
  const durationRef = useRef(duration);
  
  useEffect(() => {
    loopPlaybackRef.current = loopPlayback;
  }, [loopPlayback]);
  
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    setSelectedKeyframe(null);
    playbackStartTimeRef.current = Date.now() - (currentTime * 1000);

    const animate = () => {
      const elapsed = (Date.now() - playbackStartTimeRef.current) / 1000;
      const dur = durationRef.current;

      if (elapsed >= dur) {
        if (loopPlaybackRef.current) {
          setCurrentTime(0);
          playbackStartTimeRef.current = Date.now();
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentTime(dur);
          setIsPlaying(false);
        }
        return;
      }

      setCurrentTime(elapsed);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [currentTime, setCurrentTime, setIsPlaying, setSelectedKeyframe]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [setIsPlaying]);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setCurrentTime(0);
    setSelectedKeyframe(null);
  }, [setCurrentTime, setIsPlaying, setSelectedKeyframe]);

  const handleStepPrevious = () => {
    const allKeyframeTimes = [];
    Object.values(keyframes).forEach(objKeyframes => {
      objKeyframes.forEach(kf => {
        if (!allKeyframeTimes.includes(kf.time)) {
          allKeyframeTimes.push(kf.time);
        }
      });
    });
    allKeyframeTimes.sort((a, b) => a - b);
    const previousTimes = allKeyframeTimes.filter(t => t < currentTime - 0.01);
    if (previousTimes.length > 0) {
      setCurrentTime(previousTimes[previousTimes.length - 1]);
    } else {
      setCurrentTime(0);
    }
  };

  const handleStepNext = () => {
    const allKeyframeTimes = [];
    Object.values(keyframes).forEach(objKeyframes => {
      objKeyframes.forEach(kf => {
        if (!allKeyframeTimes.includes(kf.time)) {
          allKeyframeTimes.push(kf.time);
        }
      });
    });
    allKeyframeTimes.sort((a, b) => a - b);
    const nextTimes = allKeyframeTimes.filter(t => t > currentTime + 0.01);
    if (nextTimes.length > 0) {
      setCurrentTime(nextTimes[0]);
    }
  };

  /**
   * Helper: Build a keyframe entry for a single fabric object at the current time.
   * Returns the {objectId, keyframe} pair or null if locked/missing.
   * Does NOT mutate state — caller batches all updates into one setKeyframes call.
   */
  const buildKeyframeForObject = useCallback((objectId) => {
    if (!fabricCanvas || !objectId) return null;
    if (lockedTracks[objectId]) return null;

    const fabricObject = findFabricObjectById(fabricCanvas, objectId);
    if (!fabricObject) return null;

    const properties = extractPropertiesFromFabricObject(fabricObject);
    if (!properties) return null;

    // For path objects, include pathOffset data for LivePreview/Export
    if (fabricObject.type === 'path' && fabricObject.pathOffset) {
      properties.pathOffsetX = fabricObject.pathOffset.x || 0;
      properties.pathOffsetY = fabricObject.pathOffset.y || 0;
    }

    return {
      objectId,
      keyframe: {
        time: currentTime,
        properties,
        easing: 'linear',
      },
    };
  }, [fabricCanvas, currentTime, lockedTracks]);

  /**
   * Batch-insert keyframes for multiple objects in a SINGLE setKeyframes call.
   * This is critical for correctness — all objects get keyframed atomically
   * at the exact same time with their exact current positions.
   */
  const batchAddKeyframes = useCallback((entries) => {
    if (entries.length === 0) return;

    setKeyframes(prev => {
      const next = { ...prev };

      entries.forEach(({ objectId, keyframe }) => {
        const objectKeyframes = next[objectId] || [];
        const existingIndex = objectKeyframes.findIndex(
          kf => Math.abs(kf.time - keyframe.time) < 0.05
        );

        if (existingIndex >= 0) {
          const updated = [...objectKeyframes];
          updated[existingIndex] = keyframe;
          next[objectId] = updated;
        } else {
          next[objectId] = [...objectKeyframes, keyframe].sort((a, b) => a.time - b.time);
        }
      });

      return next;
    });
  }, [setKeyframes]);

  /**
   * Add Keyframe — supports MULTI-SELECT.
   * 
   * When multiple objects are selected (e.g., body + both arms of a stickman),
   * clicking "Add Keyframe" records a keyframe for ALL of them at once.
   * This ensures their relative positions are captured exactly as they appear
   * on canvas, preventing drift during animation playback.
   */
  const handleAddKeyframe = () => {
    if (!fabricCanvas) return;

    // Check for multi-selection (ActiveSelection in Fabric.js)
    const activeObjects = fabricCanvas.getActiveObjects();
    
    if (activeObjects.length > 1) {
      // MULTI-SELECT KEYFRAMING — batch all into one state update
      const entries = [];
      let lockedCount = 0;
      
      activeObjects.forEach(fo => {
        if (fo?.id) {
          if (lockedTracks[fo.id]) {
            lockedCount++;
          } else {
            const entry = buildKeyframeForObject(fo.id);
            if (entry) entries.push(entry);
          }
        }
      });

      if (entries.length > 0) {
        batchAddKeyframes(entries);
        setSnackSeverity('success');
        setSnackMessage(`Added keyframes for ${entries.length} object${entries.length > 1 ? 's' : ''} at ${currentTime.toFixed(2)}s${lockedCount > 0 ? ` (${lockedCount} locked, skipped)` : ''}`);
      } else if (lockedCount > 0) {
        setSnackSeverity('warning');
        setSnackMessage('All selected tracks are locked. Unlock them to add keyframes.');
      }
      return;
    }

    // SINGLE OBJECT KEYFRAMING (original behavior)
    if (!selectedObject) return;

    if (lockedTracks[selectedObject]) {
      setSnackSeverity('warning');
      setSnackMessage('This track is locked. Unlock it to add keyframes.');
      return;
    }

    const entry = buildKeyframeForObject(selectedObject);
    if (entry) {
      batchAddKeyframes([entry]);
      setSnackSeverity('success');
      setSnackMessage(`Keyframe added at ${currentTime.toFixed(2)}s`);
    }
  };

  /**
   * Keyframe ALL objects on the canvas at the current time.
   * Perfect for character animation: position the whole character, 
   * then click "Keyframe All" to record every part at once.
   */
  const handleKeyframeAll = () => {
    if (!fabricCanvas) return;
    
    const entries = [];
    let lockedCount = 0;

    canvasObjects.forEach(obj => {
      if (lockedTracks[obj.id]) {
        lockedCount++;
      } else {
        const entry = buildKeyframeForObject(obj.id);
        if (entry) entries.push(entry);
      }
    });

    if (entries.length > 0) {
      batchAddKeyframes(entries);
      setSnackSeverity('success');
      setSnackMessage(`Keyframed all: ${entries.length} object${entries.length > 1 ? 's' : ''} at ${currentTime.toFixed(2)}s${lockedCount > 0 ? ` (${lockedCount} locked, skipped)` : ''}`);
    } else if (lockedCount > 0) {
      setSnackSeverity('warning');
      setSnackMessage('All tracks are locked.');
    } else {
      setSnackSeverity('warning');
      setSnackMessage('No objects on canvas to keyframe.');
    }
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const isObjectLocked = selectedObject && !!lockedTracks[selectedObject];
  
  // Check if multi-select is active
  const activeObjectCount = fabricCanvas?.getActiveObjects()?.length || 0;
  const isMultiSelect = activeObjectCount > 1;
  const hasAnyObjects = canvasObjects.length > 0;
  // Enable "Add Keyframe" for multi-select OR single selected object
  const canAddKeyframe = isMultiSelect || selectedObject;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Tooltip title="Previous Keyframe">
          <IconButton onClick={handleStepPrevious} size="small">
            <SkipPrevious />
          </IconButton>
        </Tooltip>

        <IconButton 
          onClick={handlePlay} 
          disabled={isPlaying} 
          color="primary"
        >
          <PlayArrow />
        </IconButton>
        
        <IconButton 
          onClick={handlePause} 
          disabled={!isPlaying}
        >
          <Pause />
        </IconButton>
        
        <IconButton onClick={handleStop}>
          <Stop />
        </IconButton>

        <Tooltip title="Next Keyframe">
          <IconButton onClick={handleStepNext} size="small">
            <SkipNext />
          </IconButton>
        </Tooltip>
        
        <Typography variant="body2" sx={{ ml: 1, minWidth: 110, fontSize: '0.8rem' }}>
          {currentTime.toFixed(2)}s / {duration.toFixed(1)}s
        </Typography>

        <Tooltip title="Loop animation continuously. Can toggle during playback.">
          <FormControlLabel
            control={
              <Checkbox 
                checked={loopPlayback}
                onChange={(e) => setLoopPlayback(e.target.checked)}
                icon={<Replay />}
                checkedIcon={<Replay color="primary" />}
                size="small"
              />
            }
            label="Loop"
            sx={{ ml: 1 }}
          />
        </Tooltip>

        <TextField
          label="Duration (s)"
          type="number"
          value={duration}
          onChange={(e) => setDuration(Math.max(1, parseFloat(e.target.value) || 10))}
          size="small"
          sx={{ width: 100, ml: 'auto' }}
          inputProps={{ step: 0.5, min: 1 }}
        />
        
        <Tooltip title={
          isMultiSelect 
            ? `Add keyframe for all ${activeObjectCount} selected objects at current time`
            : isObjectLocked 
              ? "Track is locked — unlock to add keyframes" 
              : "Add keyframe at current time (select multiple objects to keyframe them all)"
        }>
          <span>
            <Button 
              variant="contained" 
              size="small" 
              onClick={handleAddKeyframe}
              disabled={!canAddKeyframe || (!!isObjectLocked && !isMultiSelect)}
              color={isMultiSelect ? "secondary" : isObjectLocked ? "inherit" : "primary"}
            >
              {isMultiSelect ? `Add Keyframe (${activeObjectCount})` : 'Add Keyframe'}
            </Button>
          </span>
        </Tooltip>

        <Tooltip title="Add keyframe for EVERY object on canvas at current time — ideal for character animation">
          <span>
            <Button
              variant="outlined"
              size="small"
              onClick={handleKeyframeAll}
              disabled={!hasAnyObjects}
              color="primary"
            >
              ⏺ Keyframe All
            </Button>
          </span>
        </Tooltip>
      </Box>

      <Snackbar
        open={!!snackMessage}
        autoHideDuration={3000}
        onClose={() => setSnackMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackSeverity} onClose={() => setSnackMessage('')}>
          {snackMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PlaybackControls;