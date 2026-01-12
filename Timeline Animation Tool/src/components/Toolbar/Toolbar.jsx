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
} from '@mui/icons-material';
import { useSelectedObject, useFabricCanvas, useCanvasObjects, useKeyframes } from '../../store/hooks';
import { createFabricObject } from '../../utils/fabricHelpers';

const Toolbar = () => {
  const [selectedObject, setSelectedObject] = useSelectedObject();
  const [fabricCanvas] = useFabricCanvas();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();
  const [keyframes, setKeyframes] = useKeyframes();

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

      // Add to state
      // Add to state (around line 50)
      setCanvasObjects(prev => [...prev, { 
        id, 
        type, 
        name,
        textContent: type === 'text' ? 'Text' : undefined // Store text content
      }]);
      setKeyframes(prev => ({ ...prev, [id]: [] }));
    };

    const deleteObject = () => {
    if (!fabricCanvas) return;

    // Get active objects (single or multiple selection)
    const activeObjects = fabricCanvas.getActiveObjects();
    
    if (activeObjects.length === 0 && selectedObject) {
      // Fallback to selectedObject if no active objects
      const fabricObject = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
      if (fabricObject) {
        activeObjects.push(fabricObject);
      }
    }

    if (activeObjects.length === 0) return;

    // Remove all selected objects
    activeObjects.forEach(fabricObject => {
      if (fabricObject && fabricObject.id) {
        fabricCanvas.remove(fabricObject);
        
        // Remove from state
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
    if (!selectedObject || !fabricCanvas) return;

    const fabricObject = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
    if (!fabricObject) return;

    if (direction === 'up') {
      fabricCanvas.bringForward(fabricObject);
    } else {
      fabricCanvas.sendBackwards(fabricObject);
    }
    fabricCanvas.renderAll();
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
      
      <Divider sx={{ my: 1 }} />
      
      <Tooltip title="Delete" placement="right">
        <span>
          <IconButton 
            onClick={deleteObject} 
            disabled={!selectedObject}
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
            disabled={!selectedObject}
          >
            <ArrowUpIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Send Backward" placement="right">
        <span>
          <IconButton 
            onClick={() => moveLayer('down')} 
            disabled={!selectedObject}
          >
            <ArrowDownIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
};

export default Toolbar;