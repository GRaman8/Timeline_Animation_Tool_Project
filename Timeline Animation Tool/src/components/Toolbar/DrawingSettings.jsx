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
} from '@mui/material';
import { Brush } from '@mui/icons-material';
import { useDrawingToolSettings } from '../../store/hooks';

const DrawingSettings = () => {
  const [settings, setSettings] = useDrawingToolSettings();

  const handleColorChange = (e) => {
    setSettings(prev => ({ ...prev, color: e.target.value }));
  };

  const handleStrokeWidthChange = (e, newValue) => {
    setSettings(prev => ({ ...prev, strokeWidth: newValue }));
  };

  const handleSmoothingChange = (e) => {
    setSettings(prev => ({ ...prev, smoothing: e.target.checked }));
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
        <Box>
          <Typography variant="body2" gutterBottom>
            Color
          </Typography>
          <TextField
            type="color"
            value={settings.color}
            onChange={handleColorChange}
            size="small"
            fullWidth
          />
        </Box>

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

        <FormControlLabel
          control={
            <Checkbox
              checked={settings.smoothing}
              onChange={handleSmoothingChange}
            />
          }
          label="Smooth curves"
        />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        💡 Click the brush icon in the toolbar to enter drawing mode. 
        Draw on the canvas, then press ESC or click the brush again to exit.
      </Typography>
    </Paper>
  );
};

export default DrawingSettings;