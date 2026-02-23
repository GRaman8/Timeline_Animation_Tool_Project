import React, { useState } from 'react';

import { 
  Box, 
  IconButton, 
  Divider, 
  Tooltip, 
  Paper,
  Button,
  Badge,
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
  Check as CheckIcon,
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
  const [strokeCount, setStrokeCount] = useState(0);

  const canGroup = fabricCanvas?.getActiveObjects().length > 1;
  
  const canUngroup = React.useMemo(() => {
    if (!fabricCanvas || !selectedObject) return false;
    const obj = fabricCanvas.getObjects().find(o => o.id === selectedObject);
    return obj?.type === 'group';
  }, [fabricCanvas, selectedObject]);

  // Poll stroke count when in drawing mode
  React.useEffect(() => {
    if (!drawingMode || !fabricCanvas) {
      setStrokeCount(0);
      return;
    }
    const interval = setInterval(() => {
      const count = fabricCanvas._getStrokeCount?.() || 0;
      setStrokeCount(count);
    }, 200);
    return () => clearInterval(interval);
  }, [drawingMode, fabricCanvas]);

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
      id, type, name, 
      textContent: type === 'text' ? 'Text' : undefined,
      fill: fabricObject.fill, // Store initial fill color
    }]);
    setKeyframes(prev => ({ ...prev, [id]: [] }));
  };

  const groupObjects = () => {
    if (!fabricCanvas) return;

    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length < 2) return;

    const objectsList = [...activeObjects];
    const childIds = objectsList.map(obj => obj.id);
    
    fabricCanvas.discardActiveObject();
    objectsList.forEach(obj => fabricCanvas.remove(obj));
    
    const group = new fabric.Group(objectsList, {
      id: `group_${Date.now()}`,
      originX: 'center',
      originY: 'center',
    });
    
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    fabricCanvas.renderAll();

    const groupCount = canvasObjects.filter(obj => obj.type === 'group').length + 1;
    
    setKeyframes(prev => {
      const updated = { ...prev };
      childIds.forEach(childId => { delete updated[childId]; });
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

  const ungroupObjects = () => {
    if (!fabricCanvas || !selectedObject) return;

    const group = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
    if (!group || group.type !== 'group') return;

    const restoredItems = ungroupFabricGroup(fabricCanvas, group);

    if (restoredItems.length > 0) {
      setCanvasObjects(prev => prev.filter(obj => obj.id !== selectedObject));
      
      setKeyframes(prev => {
        const updated = { ...prev };
        delete updated[selectedObject];
        restoredItems.forEach(item => {
          if (item.id && updated[item.id] === undefined) {
            updated[item.id] = [];
          }
        });
        return updated;
      });
      
      setSelectedObject(null);
      
      setTimeout(() => {
        fabricCanvas.forEachObject(obj => {
          obj.visible = true;
          obj.selectable = true;
          obj.evented = true;
          obj.dirty = true;
        });
        fabricCanvas.requestRenderAll();
      }, 0);
    }
  };

  const deleteObject = () => {
    if (!fabricCanvas) return;

    const activeObjects = fabricCanvas.getActiveObjects();
    
    if (activeObjects.length === 0 && selectedObject) {
      const fabricObject = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
      if (fabricObject) activeObjects.push(fabricObject);
    }

    if (activeObjects.length === 0) return;

    activeObjects.forEach(fabricObject => {
      if (fabricObject && fabricObject.id) {
        const objectData = canvasObjects.find(obj => obj.id === fabricObject.id);
        fabricCanvas.remove(fabricObject);
        
        setCanvasObjects(prev => {
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
          if (objectData?.type === 'group' && objectData.children) {
            objectData.children.forEach(childId => { delete updated[childId]; });
          }
          return updated;
        });
      }
    });

    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    setSelectedObject(null);
  };

  /**
   * FIXED: Use Fabric.js v6 API for layer ordering.
   * v5 used canvas.bringForward() / canvas.sendBackwards()
   * v6 uses canvas.bringObjectForward() / canvas.sendObjectBackwards()
   */
  const moveLayer = (direction) => {
    if (!fabricCanvas) return;
    
    let targetObject = null;
    
    // Get the selected object (either from active selection or selectedObject state)
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj && activeObj.id) {
      targetObject = activeObj;
    } else if (selectedObject) {
      targetObject = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
    }
    
    if (!targetObject) return;

    try {
      if (direction === 'up') {
        // Try Fabric v6 API first, fall back to v5
        if (typeof fabricCanvas.bringObjectForward === 'function') {
          fabricCanvas.bringObjectForward(targetObject);
        } else if (typeof fabricCanvas.bringForward === 'function') {
          fabricCanvas.bringForward(targetObject);
        }
      } else {
        if (typeof fabricCanvas.sendObjectBackwards === 'function') {
          fabricCanvas.sendObjectBackwards(targetObject);
        } else if (typeof fabricCanvas.sendBackwards === 'function') {
          fabricCanvas.sendBackwards(targetObject);
        }
      }
    } catch (e) {
      console.warn('Layer ordering failed:', e);
    }
    
    fabricCanvas.renderAll();
  };

  const toggleDrawingMode = () => {
    if (!fabricCanvas) return;
    
    // If exiting drawing mode and there are pending strokes, commit them
    if (drawingMode && fabricCanvas._commitDrawing) {
      fabricCanvas._commitDrawing();
    }
    
    setDrawingMode(!drawingMode);
    if (!drawingMode) {
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      setSelectedObject(null);
    }
  };

  const finishDrawing = () => {
    if (fabricCanvas?._commitDrawing) {
      fabricCanvas._commitDrawing();
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
        >
          <Badge badgeContent={strokeCount > 0 ? strokeCount : 0} color="error">
            <BrushIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      {/* Finish Drawing button - only visible in drawing mode with pending strokes */}
      {drawingMode && strokeCount > 0 && (
        <Tooltip title="Finish Drawing (Enter)" placement="right">
          <IconButton 
            onClick={finishDrawing} 
            color="success"
            sx={{ 
              bgcolor: 'success.light', 
              '&:hover': { bgcolor: 'success.main', color: 'white' } 
            }}
          >
            <CheckIcon />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title={anchorEditMode ? "Exit Anchor Mode" : "Edit Anchor Point (Rotation Pivot)"} placement="right">
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
          <IconButton onClick={groupObjects} disabled={!canGroup} color="primary">
            <GroupIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Ungroup (Cmd/Ctrl+Shift+G)" placement="right">
        <span>
          <IconButton onClick={ungroupObjects} disabled={!canUngroup} color="primary">
            <UngroupIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Divider sx={{ my: 1 }} />
      
      <Tooltip title="Delete Selected" placement="right">
        <span>
          <IconButton onClick={deleteObject} disabled={!hasActiveSelection} color="error">
            <DeleteIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Bring Forward" placement="right">
        <span>
          <IconButton onClick={() => moveLayer('up')} disabled={!hasActiveSelection && !selectedObject}>
            <ArrowUpIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Send Backward" placement="right">
        <span>
          <IconButton onClick={() => moveLayer('down')} disabled={!hasActiveSelection && !selectedObject}>
            <ArrowDownIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
};

export default Toolbar;