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

  const canGroup = fabricCanvas?.getActiveObjects().length > 1;
  
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

    setCanvasObjects(prev => [...prev, { id, type, name, textContent: type === 'text' ? 'Text' : undefined }]);
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
    
    // CRITICAL: Create group with center origin
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

  const moveLayer = (direction) => {
    if (!fabricCanvas) return;
    
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length === 0 && selectedObject) {
      const fabricObject = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
      if (fabricObject) activeObjects.push(fabricObject);
    }
    if (activeObjects.length === 0) return;

    activeObjects.forEach(fabricObject => {
      if (direction === 'up') fabricCanvas.bringForward(fabricObject);
      else fabricCanvas.sendBackwards(fabricObject);
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
        >
          <BrushIcon />
        </IconButton>
      </Tooltip>

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
          <IconButton onClick={() => moveLayer('up')} disabled={!hasActiveSelection}>
            <ArrowUpIcon />
          </IconButton>
        </span>
      </Tooltip>
      
      <Tooltip title="Send Backward" placement="right">
        <span>
          <IconButton onClick={() => moveLayer('down')} disabled={!hasActiveSelection}>
            <ArrowDownIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
};

export default Toolbar;