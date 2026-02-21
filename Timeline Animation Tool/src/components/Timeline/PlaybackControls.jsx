import React, { useRef, useCallback, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  Typography, 
  Button, 
  Checkbox,
  FormControlLabel,
  TextField,
  Tooltip
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
  useCanvasObjects
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

  const animationFrameRef = useRef(null);
  const playbackStartTimeRef = useRef(null);
  
  /**
   * FIX: Use refs for values accessed inside requestAnimationFrame loop.
   * The animate() function runs asynchronously via rAF, so it captures
   * closure values from when handlePlay was called. Using refs ensures
   * the animate function always reads the CURRENT values.
   */
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
    playbackStartTimeRef.current = Date.now() - (currentTime * 1000);

    const animate = () => {
      const elapsed = (Date.now() - playbackStartTimeRef.current) / 1000;
      const dur = durationRef.current;

      if (elapsed >= dur) {
        if (loopPlaybackRef.current) {
          // Loop back to start
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
  }, [currentTime, setCurrentTime, setIsPlaying]);

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
  }, [setCurrentTime, setIsPlaying]);

  // Step to previous keyframe
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

    const previousTimes = allKeyframeTimes.filter(t => t < currentTime);
    if (previousTimes.length > 0) {
      setCurrentTime(previousTimes[previousTimes.length - 1]);
    } else {
      setCurrentTime(0);
    }
  };

  // Step to next keyframe
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

    const nextTimes = allKeyframeTimes.filter(t => t > currentTime);
    if (nextTimes.length > 0) {
      setCurrentTime(nextTimes[0]);
    }
  };

  const handleAddKeyframe = () => {
    if (!selectedObject || !fabricCanvas) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    const properties = extractPropertiesFromFabricObject(fabricObject);
    const newKeyframe = {
      time: currentTime,
      properties,
      easing: 'linear',
    };

    setKeyframes(prev => {
      const objectKeyframes = prev[selectedObject] || [];
      const existingIndex = objectKeyframes.findIndex(
        kf => Math.abs(kf.time - currentTime) < 0.05
      );

      let updatedKeyframes;
      if (existingIndex >= 0) {
        updatedKeyframes = [...objectKeyframes];
        updatedKeyframes[existingIndex] = newKeyframe;
      } else {
        updatedKeyframes = [...objectKeyframes, newKeyframe]
          .sort((a, b) => a.time - b.time);
      }

      return {
        ...prev,
        [selectedObject]: updatedKeyframes,
      };
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
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
        
        <Typography variant="body2" sx={{ ml: 2, minWidth: 120 }}>
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
              />
            }
            label="Loop"
            sx={{ ml: 2 }}
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
        
        <Button 
          variant="contained" 
          size="small" 
          onClick={handleAddKeyframe}
          disabled={!selectedObject}
        >
          Add Keyframe
        </Button>
      </Box>
    </Box>
  );
};

export default PlaybackControls;