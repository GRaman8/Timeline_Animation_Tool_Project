import React, { useState } from 'react';

import { 
  Box, IconButton, Divider, Tooltip, Paper, Button, Badge,
} from '@mui/material';

import {
  Crop32 as RectangleIcon, Circle as CircleIcon, TextFields as TextIcon,
  Delete as DeleteIcon, KeyboardArrowUp as ArrowUpIcon, KeyboardArrowDown as ArrowDownIcon,
  Brush as BrushIcon, GroupAdd as GroupIcon, GroupRemove as UngroupIcon,
  GpsFixed as AnchorIcon, Check as CheckIcon, FormatColorFill as FillIcon,
} from '@mui/icons-material';

import { 
  useSelectedObject, useFabricCanvas, useCanvasObjects, useKeyframes,
  useHasActiveSelection, useDrawingMode, useAnchorEditMode, useTrackOrder,
  useFillToolActive, useFillToolColor,
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
  const [trackOrder, setTrackOrder] = useTrackOrder();
  const [fillToolActive, setFillToolActive] = useFillToolActive();
  const [fillToolColor, setFillToolColor] = useFillToolColor();
  const [strokeCount, setStrokeCount] = useState(0);

  const canGroup = fabricCanvas?.getActiveObjects().length > 1;
  
  const canUngroup = React.useMemo(() => {
    if (!fabricCanvas || !selectedObject) return false;
    const obj = fabricCanvas.getObjects().find(o => o.id === selectedObject);
    return obj?.type === 'group';
  }, [fabricCanvas, selectedObject]);

  React.useEffect(() => {
    if (!drawingMode || !fabricCanvas) { setStrokeCount(0); return; }
    const interval = setInterval(() => { setStrokeCount(fabricCanvas._getStrokeCount?.() || 0); }, 200);
    return () => clearInterval(interval);
  }, [drawingMode, fabricCanvas]);

  const addElement = (type) => {
    if (!fabricCanvas) return;
    const id = `element_${Date.now()}`;
    const count = canvasObjects.filter(obj => obj.type === type).length + 1;
    const name = `${type}_${count}`;
    const fabricObject = createFabricObject(type, id);
    if (!fabricObject) return;
    fabricCanvas.add(fabricObject); fabricCanvas.setActiveObject(fabricObject); fabricCanvas.renderAll();
    setCanvasObjects(prev => [...prev, { id, type, name, textContent: type === 'text' ? 'Text' : undefined, fill: fabricObject.fill }]);
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
    const group = new fabric.Group(objectsList, { id: `group_${Date.now()}`, originX: 'center', originY: 'center' });
    fabricCanvas.add(group); fabricCanvas.setActiveObject(group); fabricCanvas.renderAll();
    const groupCount = canvasObjects.filter(obj => obj.type === 'group').length + 1;
    setKeyframes(prev => { const u = { ...prev }; childIds.forEach(c => { delete u[c]; }); u[group.id] = []; return u; });
    setCanvasObjects(prev => [...prev, { id: group.id, type: 'group', name: `Group_${groupCount}`, children: childIds }]);
    setSelectedObject(group.id);
  };

  const ungroupObjects = () => {
    if (!fabricCanvas || !selectedObject) return;
    const group = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
    if (!group || group.type !== 'group') return;
    const restoredItems = ungroupFabricGroup(fabricCanvas, group);
    if (restoredItems.length > 0) {
      setCanvasObjects(prev => prev.filter(obj => obj.id !== selectedObject));
      setKeyframes(prev => { const u = { ...prev }; delete u[selectedObject]; restoredItems.forEach(item => { if (item.id && u[item.id] === undefined) u[item.id] = []; }); return u; });
      setSelectedObject(null);
      setTimeout(() => { fabricCanvas.forEachObject(obj => { obj.visible = true; obj.selectable = true; obj.evented = true; obj.dirty = true; }); fabricCanvas.requestRenderAll(); }, 0);
    }
  };

  const deleteObject = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length === 0 && selectedObject) {
      const fo = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
      if (fo) activeObjects.push(fo);
    }
    if (activeObjects.length === 0) return;
    activeObjects.forEach(fo => {
      if (fo?.id) {
        const objData = canvasObjects.find(obj => obj.id === fo.id);
        fabricCanvas.remove(fo);
        setCanvasObjects(prev => {
          if (objData?.type === 'group' && objData.children) return prev.filter(obj => obj.id !== fo.id && !objData.children.includes(obj.id));
          return prev.filter(obj => obj.id !== fo.id);
        });
        setKeyframes(prev => { const u = { ...prev }; delete u[fo.id]; if (objData?.type === 'group' && objData.children) objData.children.forEach(c => { delete u[c]; }); return u; });
      }
    });
    fabricCanvas.discardActiveObject(); fabricCanvas.renderAll(); setSelectedObject(null);
  };

  const moveLayer = (direction) => {
    if (!fabricCanvas) return;
    let targetObject = null;
    const activeObj = fabricCanvas.getActiveObject();
    if (activeObj?.id) targetObject = activeObj;
    else if (selectedObject) targetObject = fabricCanvas.getObjects().find(obj => obj.id === selectedObject);
    if (!targetObject) return;
    try {
      if (direction === 'up') {
        if (typeof fabricCanvas.bringObjectForward === 'function') fabricCanvas.bringObjectForward(targetObject);
        else if (typeof fabricCanvas.bringForward === 'function') fabricCanvas.bringForward(targetObject);
      } else {
        if (typeof fabricCanvas.sendObjectBackwards === 'function') fabricCanvas.sendObjectBackwards(targetObject);
        else if (typeof fabricCanvas.sendBackwards === 'function') fabricCanvas.sendBackwards(targetObject);
      }
    } catch (e) { console.warn('Layer ordering failed:', e); }
    fabricCanvas.renderAll();
    const objects = fabricCanvas.getObjects();
    const newTrackOrder = [...objects].filter(obj => obj.id).reverse().map(obj => obj.id);
    setTrackOrder(newTrackOrder);
  };

  const toggleDrawingMode = () => {
    if (!fabricCanvas) return;
    // Deactivate fill tool if active
    if (fillToolActive) setFillToolActive(false);
    if (drawingMode && fabricCanvas._commitDrawing) fabricCanvas._commitDrawing();
    setDrawingMode(!drawingMode);
    if (!drawingMode) { fabricCanvas.discardActiveObject(); fabricCanvas.renderAll(); setSelectedObject(null); }
  };

  const finishDrawing = () => {
    if (fabricCanvas?._commitDrawing) fabricCanvas._commitDrawing();
  };

  const toggleFillTool = () => {
    // Deactivate drawing mode if active
    if (drawingMode) {
      if (fabricCanvas?._commitDrawing) fabricCanvas._commitDrawing();
      setDrawingMode(false);
    }
    setFillToolActive(!fillToolActive);
  };

  return (
    <Paper sx={{ width: 80, display: 'flex', flexDirection: 'column', p: 1, gap: 1, borderRadius: 0 }}>
      <Tooltip title="Add Rectangle" placement="right">
        <IconButton onClick={() => addElement('rectangle')} color="primary"><RectangleIcon /></IconButton>
      </Tooltip>
      <Tooltip title="Add Circle" placement="right">
        <IconButton onClick={() => addElement('circle')} color="primary"><CircleIcon /></IconButton>
      </Tooltip>
      <Tooltip title="Add Text" placement="right">
        <IconButton onClick={() => addElement('text')} color="primary"><TextIcon /></IconButton>
      </Tooltip>

      <Tooltip title={drawingMode ? "Exit Drawing Mode (ESC)" : "Drawing Mode"} placement="right">
        <IconButton onClick={toggleDrawingMode} color={drawingMode ? "secondary" : "primary"}>
          <Badge badgeContent={strokeCount > 0 ? strokeCount : 0} color="error"><BrushIcon /></Badge>
        </IconButton>
      </Tooltip>

      {drawingMode && strokeCount > 0 && (
        <Tooltip title="Finish Drawing (Enter)" placement="right">
          <IconButton onClick={finishDrawing} color="success"
            sx={{ bgcolor: 'success.light', '&:hover': { bgcolor: 'success.main', color: 'white' } }}>
            <CheckIcon />
          </IconButton>
        </Tooltip>
      )}

      {/* PAINT BUCKET TOOL */}
      <Tooltip title={fillToolActive ? "Exit Paint Bucket (ESC)" : "Paint Bucket Fill (like MS Paint)"} placement="right">
        <IconButton onClick={toggleFillTool} color={fillToolActive ? "secondary" : "primary"}
          sx={fillToolActive ? { bgcolor: 'secondary.light', '&:hover': { bgcolor: 'secondary.main', color: 'white' } } : {}}>
          <FillIcon />
        </IconButton>
      </Tooltip>

      {/* Fill color swatch — shown when fill tool is active */}
      {fillToolActive && (
        <Tooltip title="Fill color — click to change" placement="right">
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <input 
              type="color" 
              value={fillToolColor} 
              onChange={(e) => setFillToolColor(e.target.value)}
              style={{ width: 36, height: 36, cursor: 'pointer', border: '2px solid #333', borderRadius: 4, padding: 0 }}
            />
          </Box>
        </Tooltip>
      )}

      <Tooltip title={anchorEditMode ? "Exit Anchor Mode" : "Edit Anchor Point"} placement="right">
        <IconButton onClick={() => setAnchorEditMode(!anchorEditMode)} color={anchorEditMode ? "secondary" : "primary"} disabled={!selectedObject}>
          <AnchorIcon />
        </IconButton>
      </Tooltip>
      
      <Divider sx={{ my: 1 }} />
      
      <Tooltip title="Group Selected (Cmd/Ctrl+G)" placement="right">
        <span><IconButton onClick={groupObjects} disabled={!canGroup} color="primary"><GroupIcon /></IconButton></span>
      </Tooltip>
      <Tooltip title="Ungroup (Cmd/Ctrl+Shift+G)" placement="right">
        <span><IconButton onClick={ungroupObjects} disabled={!canUngroup} color="primary"><UngroupIcon /></IconButton></span>
      </Tooltip>
      
      <Divider sx={{ my: 1 }} />
      
      <Tooltip title="Delete Selected" placement="right">
        <span><IconButton onClick={deleteObject} disabled={!hasActiveSelection} color="error"><DeleteIcon /></IconButton></span>
      </Tooltip>
      <Tooltip title="Bring Forward" placement="right">
        <span><IconButton onClick={() => moveLayer('up')} disabled={!hasActiveSelection && !selectedObject}><ArrowUpIcon /></IconButton></span>
      </Tooltip>
      <Tooltip title="Send Backward" placement="right">
        <span><IconButton onClick={() => moveLayer('down')} disabled={!hasActiveSelection && !selectedObject}><ArrowDownIcon /></IconButton></span>
      </Tooltip>
    </Paper>
  );
};

export default Toolbar;