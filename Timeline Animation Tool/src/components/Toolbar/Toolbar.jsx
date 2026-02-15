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
  GroupAdd as GroupIcon,
  GroupRemove as UngroupIcon,
  GpsFixed as AnchorIcon,
} from '@mui/icons-material';

import { 
  useSelectedObject, 
  useFabricCanvas, 
  useCanvasObjects, 
  useKeyframes,
  useHasActiveSelection,
  useDrawingMode,
  useAnchorEditMode,
} from '../../store/hooks';

import { createFabricObject, ungroupFabricGroup } from '../../utils/fabricHelpers';
import * as fabric from 'fabric';

const Toolbar = () => {
  const [selectedObject, setSelectedObject] = useSelectedObject();
  const [fabricCanvas] = useFabricCanvas();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();
  const [keyframes, setKeyframes] = useKeyframes();
  const [hasActiveSelection] = useHasActiveSelection();
  const [drawingMode, setDrawingMode] = useDrawingMode();
  const [anchorEditMode, setAnchorEditMode] = useAnchorEditMode();

  // Check if multiple objects are selected (for group button)
  const canGroup = fabricCanvas?.getActiveObjects().length > 1;
  
  // Check if selected object is a group (for ungroup button)
  const canUngroup = React.useMemo(() => {
    if (!fabricCanvas || !selectedObject) return false;
    const obj = fabricCanvas.getObjects().find(o => o.id === selectedObject);
    return obj?.type === 'group';
  }, [fabricCanvas, selectedObject]);

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

  const groupObjects = () => {
    if (!fabricCanvas) return;

    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length < 2) return;

    // Create Fabric.js group
    const group = new fabric.Group(activeObjects, {
      id: `group_${Date.now()}`,
    });
    
    const childIds = activeObjects.map(obj => obj.id);

    // Remove individual objects from canvas
    activeObjects.forEach(obj => fabricCanvas.remove(obj));
    
    // Add group to canvas
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    fabricCanvas.renderAll();

    // Update state
    const groupCount = canvasObjects.filter(obj => obj.type === 'group').length + 1;
    
    // Delete children keyframes when grouping
    setKeyframes(prev => {
      const updated = { ...prev };
      childIds.forEach(childId => {
        delete updated[childId];
      });
      updated[group.id] = [];
      return updated;
    });
    
    setCanvasObjects(prev => [...prev, {
      id: group.id,
      type: 'group',
      name: `Group_${groupCount}`,
      children: childIds
    }]);
    
    setSelectedObject(group.id);
  };

  // FIXED: Use ungroupFabricGroup helper for proper coordinate handling
  const ungroupObjects = () => {
    if (!fabricCanvas || !selectedObject) return;

    const group = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
    if (!group || group.type !== 'group') return;

    // Use the helper that properly handles Fabric.js 6 ungrouping
    const restoredItems = ungroupFabricGroup(fabricCanvas, group);

    if (restoredItems.length > 0) {
      // Remove group from state (children remain)
      setCanvasObjects(prev => prev.filter(obj => obj.id !== selectedObject));
      
      // Remove group keyframes
      setKeyframes(prev => {
        const updated = { ...prev };
        delete updated[selectedObject];
        return updated;
      });
      
      setSelectedObject(null);
      
      // Ensure all canvas objects are visible and selectable
      fabricCanvas.forEachObject(obj => {
        obj.visible = true;
        obj.selectable = true;
        obj.evented = true;
      });
      fabricCanvas.requestRenderAll();
    }
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
        const objectData = canvasObjects.find(obj => obj.id === fabricObject.id);
        
        fabricCanvas.remove(fabricObject);
        
        setCanvasObjects(prev => {
          // Remove the object and its children if it's a group
          if (objectData?.type === 'group' && objectData.children) {
            return prev.filter(obj => 
              obj.id !== fabricObject.id && !objectData.children.includes(obj.id)
            );
          }
          return prev.filter(obj => obj.id !== fabricObject.id);
        });
        
        setKeyframes(prev => {
          const updated = { ...prev };
          delete updated[fabricObject.id];
          
          // Also delete keyframes for children if it's a group
          if (objectData?.type === 'group' && objectData.children) {
            objectData.children.forEach(childId => {
              delete updated[childId];
            });
          }
          
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
            color: drawingMode ? 'secondary.main' : 'primary.main',
          }}
        >
          <BrushIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title={anchorEditMode ? "Exit Anchor Mode" : "Edit Anchor Point"} placement="right">
        <IconButton 
          onClick={() => setAnchorEditMode(!anchorEditMode)} 
          color={anchorEditMode ? "secondary" : "primary"}
          disabled={!selectedObject}
        >
          <AnchorIcon />
        </IconButton>
      </Tooltip>
      
      <Divider sx={{ my: 1 }} />
      
      <Tooltip title="Group Selected (Cmd/Ctrl+G)" placement="right">
        <span>
          <IconButton 
            onClick={groupObjects} 
            disabled={!canGroup}
            color="primary"
          >
            <GroupIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Ungroup (Cmd/Ctrl+Shift+G)" placement="right">
        <span>
          <IconButton 
            onClick={ungroupObjects} 
            disabled={!canUngroup}
            color="primary"
          >
            <UngroupIcon />
          </IconButton>
        </span>
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