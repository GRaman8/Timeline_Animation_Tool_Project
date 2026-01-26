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

  // ADD: Determine which mode is active
  const getActiveMode = () => {
    if (drawingMode) return 'drawing';
    // if (pathEditMode) return 'pathEdit';
    return 'normal';
  };

  const activeMode = getActiveMode();

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
          {activeMode === 'drawing' && 'Drawing Tool'}
          {/* {activeMode === 'pathEdit' && 'Path Editor'} */}
          {activeMode === 'normal' && 'Properties'}
        </Typography>
        
        {/* UPDATED: Show mode-specific settings */}
        {activeMode === 'drawing' && <DrawingSettings />}
        {/* {activeMode === 'pathEdit' && <PathEditSettings />} */}
        
        {activeMode === 'normal' && (
          <>
            {selectedObject && selectedDetails ? (
              <Box>
                {/* ... existing properties panel content ... */}
              </Box>
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
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default PropertiesPanel;