import React from 'react';
import { Box, Slider } from '@mui/material';
import { useCurrentTime, useDuration, useIsPlaying } from '../../store/hooks';

const TimelineScrubber = () => {
  const [currentTime, setCurrentTime] = useCurrentTime();
  const [duration] = useDuration();
  const [isPlaying] = useIsPlaying();

  const handleTimeChange = (event, newValue) => {
    setCurrentTime(newValue);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Slider
        value={currentTime}
        min={0}
        max={duration}
        step={0.01}
        onChange={handleTimeChange}
        disabled={isPlaying}
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${value.toFixed(2)}s`}
      />
    </Box>
  );
};

export default TimelineScrubber;