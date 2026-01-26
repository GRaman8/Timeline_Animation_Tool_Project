import React from 'react';

import { 
  Box, 
  IconButton, 
  Divider, 
  Tooltip, 
  Paper 
} from '@mui/material';

import {
  Crop32 as RectangleIcon,
  Circle as CircleIcon,
  TextFields as TextIcon,
  Delete as DeleteIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Brush as BrushIcon,
} from '@mui/icons-material';

import { 
  useSelectedObject, 
  useFabricCanvas, 
  useCanvasObjects, 
  useKeyframes,
  useHasActiveSelection,
  useDrawingMode,
} from '../../store/hooks';

import { createFabricObject } from '../../utils/fabricHelpers';

const Toolbar = () => {
  const [selectedObject, setSelectedObject] = useSelectedObject();
  const [fabricCanvas] = useFabricCanvas();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();
  const [keyframes, setKeyframes] = useKeyframes();
  const [hasActiveSelection] = useHasActiveSelection();
  const [drawingMode, setDrawingMode] = useDrawingMode();


  const addElement = (type) => {
    if (!fabricCanvas) return;

    const id = `element_${Date.now()}`;
    const count = canvasObjects.filter(obj => obj.type === type).length + 1;
    const name = `${type}_${count}`;

    const fabricObject = createFabricObject(type, id);
    if (!fabricObject) return;

    fabricCanvas.add(fabricObject);
    fabricCanvas.setActiveObject(fabricObject);
    fabricCanvas.renderAll();

    setCanvasObjects(prev => [...prev, { 
      id, 
      type, 
      name,
      textContent: type === 'text' ? 'Text' : undefined
    }]);
    setKeyframes(prev => ({ ...prev, [id]: [] }));
  };

  const deleteObject = () => {
    if (!fabricCanvas) return;

    const activeObjects = fabricCanvas.getActiveObjects();
    
    if (activeObjects.length === 0 && selectedObject) {
      const fabricObject = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
      if (fabricObject) {
        activeObjects.push(fabricObject);
      }
    }

    if (activeObjects.length === 0) return;

    activeObjects.forEach(fabricObject => {
      if (fabricObject && fabricObject.id) {
        fabricCanvas.remove(fabricObject);
        
        setCanvasObjects(prev => prev.filter(obj => obj.id !== fabricObject.id));
        setKeyframes(prev => {
          const updated = { ...prev };
          delete updated[fabricObject.id];
          return updated;
        });
      }
    });

    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    setSelectedObject(null);
  };

  const moveLayer = (direction) => {
    if (!fabricCanvas) return;
    
    const activeObjects = fabricCanvas.getActiveObjects();
    
    if (activeObjects.length === 0 && selectedObject) {
      const fabricObject = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
      if (fabricObject) {
        activeObjects.push(fabricObject);
      }
    }

    if (activeObjects.length === 0) return;

    activeObjects.forEach(fabricObject => {
      if (direction === 'up') {
        fabricCanvas.bringForward(fabricObject);
      } else {
        fabricCanvas.sendBackwards(fabricObject);
      }
    });
    
    fabricCanvas.renderAll();
  };

  const toggleDrawingMode = () => {
    if (!fabricCanvas) return;
    
    setDrawingMode(!drawingMode);
    
    // Deselect any active objects when entering drawing mode
    if (!drawingMode) {
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      setSelectedObject(null);
    }
  };


  return (
    <Paper 
      sx={{ 
        width: 80, 
        display: 'flex', 
        flexDirection: 'column', 
        p: 1, 
        gap: 1,
        borderRadius: 0
      }}
    >
      <Tooltip title="Add Rectangle" placement="right">
        <IconButton onClick={() => addElement('rectangle')} color="primary">
          <RectangleIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Add Circle" placement="right">
        <IconButton onClick={() => addElement('circle')} color="primary">
          <CircleIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Add Text" placement="right">
        <IconButton onClick={() => addElement('text')} color="primary">
          <TextIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={drawingMode ? "Exit Drawing Mode (ESC)" : "Drawing Mode"} placement="right">
        <IconButton 
          onClick={toggleDrawingMode} 
          color={drawingMode ? "secondary" : "primary"}
          sx={{
            // Only change color when active, no background
            color: drawingMode ? 'secondary.main' : 'primary.main',
          }}
        >
          <BrushIcon />
        </IconButton>
      </Tooltip>
      
      <Divider sx={{ my: 1 }} />
      
      <Tooltip title="Delete Selected" placement="right">
        <span>
          <IconButton 
            onClick={deleteObject} 
            disabled={!hasActiveSelection}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Bring Forward" placement="right">
        <span>
          <IconButton 
            onClick={() => moveLayer('up')} 
            disabled={!hasActiveSelection}
          >
            <ArrowUpIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Send Backward" placement="right">
        <span>
          <IconButton 
            onClick={() => moveLayer('down')} 
            disabled={!hasActiveSelection}
          >
            <ArrowDownIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
};

export default Toolbar;