import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider,
  IconButton,
  Grid,
  Chip,
} from '@mui/material';
import { 
  Brush, 
  Add as AddIcon,
  Settings as SettingsIcon 
} from '@mui/icons-material';
import { 
  useDrawingToolSettings,
  useColorPalette,
  useActiveColorIndex,
} from '../../store/hooks';

const DrawingSettings = () => {
  const [settings, setSettings] = useDrawingToolSettings();
  const [colorPalette, setColorPalette] = useColorPalette();
  const [activeColorIndex, setActiveColorIndex] = useActiveColorIndex();

  const handleColorChange = (e) => {
    const newColor = e.target.value;
    setSettings(prev => ({ ...prev, color: newColor }));
    
    // Update the color in the palette at active index
    setColorPalette(prev => {
      const updated = [...prev];
      updated[activeColorIndex] = newColor;
      return updated;
    });
  };

  const handleStrokeWidthChange = (e, newValue) => {
    setSettings(prev => ({ ...prev, strokeWidth: newValue }));
  };

  const handleSmoothingChange = (e) => {
    setSettings(prev => ({ ...prev, smoothing: e.target.checked }));
  };

  const handleAddColor = () => {
    const newColor = '#' + Math.floor(Math.random()*16777215).toString(16);
    setColorPalette(prev => [...prev, newColor]);
  };

  const handleSelectColor = (index) => {
    setActiveColorIndex(index);
    setSettings(prev => ({ ...prev, color: colorPalette[index] }));
  };

  return (
    <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.paper' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Brush color="primary" />
        <Typography variant="subtitle1" fontWeight={600}>
          Drawing Tool Settings
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Color Palette */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Color Palette
            </Typography>
            <IconButton size="small" onClick={handleAddColor}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
          <Grid container spacing={0.5}>
            {colorPalette.map((color, index) => (
              <Grid item key={index}>
                <Box
                  onClick={() => handleSelectColor(index)}
                  sx={{
                    width: 30,
                    height: 30,
                    bgcolor: color,
                    border: activeColorIndex === index ? '3px solid' : '1px solid',
                    borderColor: activeColorIndex === index ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    }
                  }}
                />
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Current Color */}
        <Box>
          <Typography variant="body2" gutterBottom>
            Current Color
          </Typography>
          <TextField
            type="color"
            value={settings.color}
            onChange={handleColorChange}
            size="small"
            fullWidth
          />
        </Box>

        {/* Stroke Width */}
        <Box>
          <Typography variant="body2" gutterBottom>
            Stroke Width: {settings.strokeWidth}px
          </Typography>
          <Slider
            value={settings.strokeWidth}
            min={1}
            max={20}
            step={1}
            onChange={handleStrokeWidthChange}
            valueLabelDisplay="auto"
          />
        </Box>

        {/* Advanced Options */}
        <Divider />
        
        <FormControlLabel
          control={
            <Checkbox
              checked={settings.smoothing}
              onChange={handleSmoothingChange}
            />
          }
          label="Smooth curves"
        />

        {/* <FormControlLabel
          control={
            <Checkbox
              checked={shapeRecognition}
              onChange={(e) => setShapeRecognition(e.target.checked)}
            />
          }
          label="Shape recognition"
        /> */}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip 
          icon={<Brush />} 
          label="Draw Mode" 
          color="primary" 
          size="small"
        />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        💡 Click colors to switch while drawing. 
      </Typography>
    </Paper>
  );
};

export default DrawingSettings;