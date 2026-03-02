/**
 * AnchorPointOverlay
 * 
 * Displays and allows dragging of the anchor point (rotation pivot)
 * for the currently selected object on the Fabric.js canvas.
 * 
 * Uses BRIGHT GREEN color scheme (#00E676) to clearly distinguish from 
 * the blue Fabric.js selection handles and bounding box.
 * Also renders a green dashed bounding box so the user knows anchor edit
 * mode is active and can see the anchor region clearly.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';

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

  // Update anchor position overlay when selection changes or object moves
  useEffect(() => {
    if (!fabricCanvas || !selectedObject || !anchorEditMode) {
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
  }, [fabricCanvas, selectedObject, anchorEditMode, canvasObjects, getAnchorValues]);

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

  if (!anchorPosition || !anchorEditMode) return null;

  const { anchorX, anchorY } = getAnchorValues();

  return (
    <>
      {/* Green dashed bounding box — clearly distinct from blue Fabric.js selection */}
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

      {/* Corner markers on the green bounding box */}
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

      {/* Anchor point crosshair — GREEN with black outline for max visibility */}
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
          {/* Black outline for contrast */}
          <circle cx="13" cy="13" r="9" fill="none" stroke="#000000" strokeWidth="3.5" />
          {/* Green circle */}
          <circle cx="13" cy="13" r="9" fill="none" stroke={ANCHOR_COLOR} strokeWidth="2" />
          {/* Inner dot */}
          <circle cx="13" cy="13" r="3" fill={ANCHOR_COLOR} stroke="#000" strokeWidth="1" />
          {/* Crosshair lines — black outline then green */}
          <line x1="13" y1="0" x2="13" y2="26" stroke="#000000" strokeWidth="3" />
          <line x1="0" y1="13" x2="26" y2="13" stroke="#000000" strokeWidth="3" />
          <line x1="13" y1="0" x2="13" y2="26" stroke={ANCHOR_COLOR} strokeWidth="1.5" />
          <line x1="0" y1="13" x2="26" y2="13" stroke={ANCHOR_COLOR} strokeWidth="1.5" />
        </svg>
      </Box>
      
      {/* Anchor info label — green background with dark text */}
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