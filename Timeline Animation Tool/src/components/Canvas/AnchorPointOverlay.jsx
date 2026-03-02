/**
 * AnchorPointOverlay
 * 
 * Displays and allows dragging of the anchor point (rotation pivot)
 * for the currently selected object on the Fabric.js canvas.
 * 
 * TWO VISUAL MODES:
 * 1. ANCHOR EDIT MODE (active): Full green dashed bounding box, green corner markers,
 *    draggable crosshair, info label — clearly distinct from blue Fabric.js selection.
 * 2. PASSIVE MODE (not editing, but object has custom anchor): Small persistent green
 *    dot at the anchor position so the user always knows where the pivot is.
 *    This prevents confusion with Fabric.js blue resize handles.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Box } from '@mui/material';

import { 
  useSelectedObject, 
  useFabricCanvas, 
  useAnchorEditMode,
  useCanvasObjects,
} from '../../store/hooks';

import { findFabricObjectById, changeAnchorPoint } from '../../utils/fabricHelpers';

const ANCHOR_COLOR = '#00E676';        // Bright green - max contrast vs blue selection
const ANCHOR_COLOR_BG = 'rgba(0, 230, 118, 0.9)'; // Semi-transparent green for label

const AnchorPointOverlay = () => {
  const [selectedObject] = useSelectedObject();
  const [fabricCanvas] = useFabricCanvas();
  const [anchorEditMode] = useAnchorEditMode();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();
  
  const [anchorPosition, setAnchorPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Get current anchor values for selected object
  const getAnchorValues = useCallback(() => {
    const objectData = canvasObjects.find(obj => obj.id === selectedObject);
    return {
      anchorX: objectData?.anchorX ?? 0.5,
      anchorY: objectData?.anchorY ?? 0.5,
    };
  }, [canvasObjects, selectedObject]);

  // Check if anchor is non-center (custom)
  const hasCustomAnchor = useCallback(() => {
    const { anchorX, anchorY } = getAnchorValues();
    return Math.abs(anchorX - 0.5) > 0.01 || Math.abs(anchorY - 0.5) > 0.01;
  }, [getAnchorValues]);

  // Track anchor position for BOTH modes:
  // - Anchor edit mode: always track (for full overlay)
  // - Normal mode: track only if custom anchor exists (for persistent dot)
  useEffect(() => {
    const shouldTrack = fabricCanvas && selectedObject && (anchorEditMode || hasCustomAnchor());
    
    if (!shouldTrack) {
      setAnchorPosition(null);
      return;
    }

    const updateAnchorPosition = () => {
      const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
      if (!fabricObject) {
        setAnchorPosition(null);
        return;
      }

      const bound = fabricObject.getBoundingRect();
      const { anchorX, anchorY } = getAnchorValues();

      const anchorCanvasX = bound.left + (bound.width * anchorX);
      const anchorCanvasY = bound.top + (bound.height * anchorY);

      setAnchorPosition({
        x: anchorCanvasX,
        y: anchorCanvasY,
        boundLeft: bound.left,
        boundTop: bound.top,
        boundWidth: bound.width,
        boundHeight: bound.height,
      });
    };

    updateAnchorPosition();

    fabricCanvas.on('object:moving', updateAnchorPosition);
    fabricCanvas.on('object:scaling', updateAnchorPosition);
    fabricCanvas.on('object:rotating', updateAnchorPosition);
    fabricCanvas.on('after:render', updateAnchorPosition);

    return () => {
      fabricCanvas.off('object:moving', updateAnchorPosition);
      fabricCanvas.off('object:scaling', updateAnchorPosition);
      fabricCanvas.off('object:rotating', updateAnchorPosition);
      fabricCanvas.off('after:render', updateAnchorPosition);
    };
  }, [fabricCanvas, selectedObject, anchorEditMode, canvasObjects, getAnchorValues, hasCustomAnchor]);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !anchorPosition || !fabricCanvas || !selectedObject) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    const canvasElement = fabricCanvas.getElement();
    const rect = canvasElement.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newAnchorX = Math.max(0, Math.min(1, 
      (mouseX - anchorPosition.boundLeft) / anchorPosition.boundWidth
    ));
    const newAnchorY = Math.max(0, Math.min(1, 
      (mouseY - anchorPosition.boundTop) / anchorPosition.boundHeight
    ));

    changeAnchorPoint(fabricObject, newAnchorX, newAnchorY);
    fabricCanvas.renderAll();

    setCanvasObjects(prev => prev.map(obj => 
      obj.id === selectedObject
        ? { ...obj, anchorX: newAnchorX, anchorY: newAnchorY }
        : obj
    ));
  }, [isDragging, anchorPosition, fabricCanvas, selectedObject, setCanvasObjects]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!fabricCanvas || !selectedObject) return;
    
    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    changeAnchorPoint(fabricObject, 0.5, 0.5);
    fabricCanvas.renderAll();

    setCanvasObjects(prev => prev.map(obj => 
      obj.id === selectedObject
        ? { ...obj, anchorX: 0.5, anchorY: 0.5 }
        : obj
    ));
  };

  // Nothing to show
  if (!anchorPosition) return null;

  const { anchorX, anchorY } = getAnchorValues();
  const isCustom = hasCustomAnchor();

  // ============================================================
  // MODE 1: PASSIVE — small persistent green dot (not in edit mode)
  // Shows when object has a custom anchor, so user always sees
  // where the pivot is and doesn't confuse it with blue resize handles.
  // ============================================================
  if (!anchorEditMode) {
    if (!isCustom) return null; // Default center anchor — no indicator needed
    
    return (
      <>
        {/* Small green crosshair dot at anchor position — always visible when selected */}
        <Box
          sx={{
            position: 'absolute',
            left: anchorPosition.x,
            top: anchorPosition.y,
            width: 18,
            height: 18,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            {/* Black outline ring for contrast on any background */}
            <circle cx="9" cy="9" r="6" fill="none" stroke="#000000" strokeWidth="2.5" />
            {/* Green ring */}
            <circle cx="9" cy="9" r="6" fill="none" stroke={ANCHOR_COLOR} strokeWidth="1.5" />
            {/* Green center dot */}
            <circle cx="9" cy="9" r="2.5" fill={ANCHOR_COLOR} stroke="#000" strokeWidth="0.8" />
            {/* Small crosshair lines — black outline then green */}
            <line x1="9" y1="1" x2="9" y2="5" stroke="#000" strokeWidth="1.5" />
            <line x1="9" y1="13" x2="9" y2="17" stroke="#000" strokeWidth="1.5" />
            <line x1="1" y1="9" x2="5" y2="9" stroke="#000" strokeWidth="1.5" />
            <line x1="13" y1="9" x2="17" y2="9" stroke="#000" strokeWidth="1.5" />
            <line x1="9" y1="1" x2="9" y2="5" stroke={ANCHOR_COLOR} strokeWidth="0.8" />
            <line x1="9" y1="13" x2="9" y2="17" stroke={ANCHOR_COLOR} strokeWidth="0.8" />
            <line x1="1" y1="9" x2="5" y2="9" stroke={ANCHOR_COLOR} strokeWidth="0.8" />
            <line x1="13" y1="9" x2="17" y2="9" stroke={ANCHOR_COLOR} strokeWidth="0.8" />
          </svg>
        </Box>
        {/* Compact label */}
        <Box
          sx={{
            position: 'absolute',
            left: anchorPosition.x + 12,
            top: anchorPosition.y - 20,
            bgcolor: ANCHOR_COLOR_BG,
            color: '#000',
            px: 0.5,
            py: 0.15,
            borderRadius: 0.5,
            fontSize: '9px',
            fontWeight: 700,
            pointerEvents: 'none',
            zIndex: 999,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(0,0,0,0.3)',
          }}
        >
          ⊕ {(anchorX * 100).toFixed(0)}%,{(anchorY * 100).toFixed(0)}%
        </Box>
      </>
    );
  }

  // ============================================================
  // MODE 2: ACTIVE EDIT — full green dashed box, corners, crosshair
  // Clearly distinct from Fabric.js blue selection handles:
  //   Blue solid box + blue square handles = Fabric.js resize/rotate
  //   Green dashed box + green corners + green crosshair = Anchor edit
  // ============================================================
  return (
    <>
      {/* Green dashed bounding box */}
      <Box
        sx={{
          position: 'absolute',
          left: anchorPosition.boundLeft - 2,
          top: anchorPosition.boundTop - 2,
          width: anchorPosition.boundWidth + 4,
          height: anchorPosition.boundHeight + 4,
          border: `2px dashed ${ANCHOR_COLOR}`,
          borderRadius: '2px',
          pointerEvents: 'none',
          zIndex: 999,
          boxShadow: `0 0 6px ${ANCHOR_COLOR}40`,
        }}
      />

      {/* Green corner markers on the bounding box */}
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([cx, cy], i) => (
        <Box
          key={i}
          sx={{
            position: 'absolute',
            left: anchorPosition.boundLeft + cx * anchorPosition.boundWidth - 4,
            top: anchorPosition.boundTop + cy * anchorPosition.boundHeight - 4,
            width: 8,
            height: 8,
            bgcolor: ANCHOR_COLOR,
            border: '1.5px solid #000',
            borderRadius: '1px',
            pointerEvents: 'none',
            zIndex: 999,
          }}
        />
      ))}

      {/* Draggable anchor crosshair — GREEN with black outline */}
      <Box
        sx={{
          position: 'absolute',
          left: anchorPosition.x,
          top: anchorPosition.y,
          width: 26,
          height: 26,
          transform: 'translate(-50%, -50%)',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1000,
          pointerEvents: 'all',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <svg width="26" height="26" viewBox="0 0 26 26">
          <circle cx="13" cy="13" r="9" fill="none" stroke="#000000" strokeWidth="3.5" />
          <circle cx="13" cy="13" r="9" fill="none" stroke={ANCHOR_COLOR} strokeWidth="2" />
          <circle cx="13" cy="13" r="3" fill={ANCHOR_COLOR} stroke="#000" strokeWidth="1" />
          <line x1="13" y1="0" x2="13" y2="26" stroke="#000000" strokeWidth="3" />
          <line x1="0" y1="13" x2="26" y2="13" stroke="#000000" strokeWidth="3" />
          <line x1="13" y1="0" x2="13" y2="26" stroke={ANCHOR_COLOR} strokeWidth="1.5" />
          <line x1="0" y1="13" x2="26" y2="13" stroke={ANCHOR_COLOR} strokeWidth="1.5" />
        </svg>
      </Box>
      
      {/* Anchor info label */}
      <Box
        sx={{
          position: 'absolute',
          left: anchorPosition.x + 18,
          top: anchorPosition.y - 30,
          bgcolor: ANCHOR_COLOR_BG,
          color: '#000',
          px: 1,
          py: 0.25,
          borderRadius: 0.5,
          fontSize: '11px',
          fontWeight: 700,
          pointerEvents: 'none',
          zIndex: 1001,
          whiteSpace: 'nowrap',
          border: '1px solid rgba(0,0,0,0.3)',
          letterSpacing: '0.3px',
        }}
      >
        ⊕ Pivot: {(anchorX * 100).toFixed(0)}%, {(anchorY * 100).toFixed(0)}%
      </Box>
    </>
  );
};

export default AnchorPointOverlay;