import React, { useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  Typography, 
  TextField, 
  Slider, 
  Divider,
  Paper
} from '@mui/material';

import DrawingSettings from '../Toolbar/DrawingSettings';

import { 
  useSelectedObject, 
  useSelectedObjectProperties,
  useSelectedObjectDetails,
  useCurrentTime,
  useKeyframes,
  useFabricCanvas,
  useDrawingMode,
} from '../../store/hooks';

import { findFabricObjectById, extractPropertiesFromFabricObject } from '../../utils/fabricHelpers';

const PropertiesPanel = () => {
  const [selectedObject] = useSelectedObject();
  const [properties, setProperties] = useSelectedObjectProperties();
  const selectedDetails = useSelectedObjectDetails();
  const [currentTime] = useCurrentTime();
  const [keyframes] = useKeyframes();
  const [fabricCanvas] = useFabricCanvas();
  const [drawingMode] = useDrawingMode();

  const drawerWidth = 300;

  // Update properties when time changes
  useEffect(() => {
    if (!selectedObject || !fabricCanvas) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    const props = extractPropertiesFromFabricObject(fabricObject);
    if (props) {
      setProperties(props);
    }
  }, [currentTime, selectedObject, fabricCanvas, keyframes, setProperties]);

  // Handle opacity change
  const handleOpacityChange = (event, newValue) => {
    if (!selectedObject || !fabricCanvas) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    // Update fabric object
    fabricObject.set('opacity', newValue);
    fabricCanvas.renderAll();

    // Update state
    setProperties(prev => ({
      ...prev,
      opacity: newValue
    }));
  };

  // Handle position change
  const handlePositionChange = (axis, value) => {
    if (!selectedObject || !fabricCanvas) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    if (axis === 'x') {
      fabricObject.set('left', numValue);
    } else {
      fabricObject.set('top', numValue);
    }
    
    fabricCanvas.renderAll();

    const props = extractPropertiesFromFabricObject(fabricObject);
    if (props) {
      setProperties(props);
    }
  };

  // Handle rotation change
  const handleRotationChange = (value) => {
    if (!selectedObject || !fabricCanvas) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    fabricObject.set('angle', numValue);
    fabricCanvas.renderAll();

    const props = extractPropertiesFromFabricObject(fabricObject);
    if (props) {
      setProperties(props);
    }
  };

  // Handle scale change
  const handleScaleChange = (axis, value) => {
    if (!selectedObject || !fabricCanvas) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    if (axis === 'x') {
      fabricObject.set('scaleX', numValue);
    } else {
      fabricObject.set('scaleY', numValue);
    }
    
    fabricCanvas.renderAll();

    const props = extractPropertiesFromFabricObject(fabricObject);
    if (props) {
      setProperties(props);
    }
  };

  return (
    <Drawer
      variant="permanent"
      anchor="right"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative',
          height: '100%',
        },
      }}
    >
      <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          {drawingMode ? 'Drawing Tool': 'Properties'}
        </Typography>
        

        
        {drawingMode ? (
          <DrawingSettings />
        ) : selectedObject && selectedDetails ? (
          <>
            <Box>
              <Paper 
                variant="outlined" 
                sx={{ p: 1.5, mb: 2, bgcolor: 'primary.light', color: 'primary.contrastText' }}
              >
                <Typography variant="body2" fontWeight={600}>
                  {selectedDetails.name}
                </Typography>
                <Typography variant="caption">
                  {selectedDetails.type}
                </Typography>
              </Paper>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="X Position"
                  type="number"
                  value={Math.round(properties.x)}
                  size="small"
                  fullWidth
                  onChange={(e) => handlePositionChange('x', e.target.value)}
                  onBlur={(e) => handlePositionChange('x', e.target.value)}
                />
                
                <TextField
                  label="Y Position"
                  type="number"
                  value={Math.round(properties.y)}
                  size="small"
                  fullWidth
                  onChange={(e) => handlePositionChange('y', e.target.value)}
                  onBlur={(e) => handlePositionChange('y', e.target.value)}
                />
                
                <TextField
                  label="Scale X"
                  type="number"
                  value={properties.scaleX.toFixed(2)}
                  size="small"
                  fullWidth
                  onChange={(e) => handleScaleChange('x', e.target.value)}
                  onBlur={(e) => handleScaleChange('x', e.target.value)}
                  inputProps={{ step: 0.1, min: 0.1 }}
                />
                
                <TextField
                  label="Scale Y"
                  type="number"
                  value={properties.scaleY.toFixed(2)}
                  size="small"
                  fullWidth
                  onChange={(e) => handleScaleChange('y', e.target.value)}
                  onBlur={(e) => handleScaleChange('y', e.target.value)}
                  inputProps={{ step: 0.1, min: 0.1 }}
                />
                
                <TextField
                  label="Rotation"
                  type="number"
                  value={Math.round(properties.rotation)}
                  size="small"
                  fullWidth
                  onChange={(e) => handleRotationChange(e.target.value)}
                  onBlur={(e) => handleRotationChange(e.target.value)}
                  inputProps={{ step: 1 }}
                />
                
                <Box>
                  <Typography variant="body2" gutterBottom>
                    Opacity: {(properties.opacity * 100).toFixed(0)}%
                  </Typography>
                  <Slider
                    value={properties.opacity}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={handleOpacityChange}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                  />
                </Box>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Paper 
                variant="outlined" 
                sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                  💡 <strong>Tip:</strong> All properties are now editable! Change values here 
                  or drag objects on the canvas. Click "Add Keyframe" to record the current state.
                </Typography>
              </Paper>
            </Box>
          </>
        ) : (
          <Paper 
            variant="outlined" 
            sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50' }}
          >
            <Typography variant="body2" color="text.secondary">
              Select an object on the stage to view and edit its properties
            </Typography>
          </Paper>
        )}

      </Box>
    </Drawer>
  );
};

export default PropertiesPanel;