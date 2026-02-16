/**
 * AnchorPointOverlay
 * 
 * Visual editor for the rotation pivot point.
 * 
 * When dragged, this ACTUALLY changes the Fabric.js object's originX/originY,
 * which moves the rotation handle (the arm/stick) and changes the pivot point.
 * The object's visual position is compensated so it doesn't jump.
 * 
 * The anchor values are also stored in canvasObjects state for use by
 * LivePreview and exported code (as CSS transform-origin).
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box } from '@mui/material';

import { 
  useSelectedObject, 
  useFabricCanvas, 
  useAnchorEditMode,
  useCanvasObjects,
} from '../../store/hooks';

import { findFabricObjectById, changeAnchorPoint } from '../../utils/fabricHelpers';

const AnchorPointOverlay = () => {
  const [selectedObject] = useSelectedObject();
  const [fabricCanvas] = useFabricCanvas();
  const [anchorEditMode] = useAnchorEditMode();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();
  
  const [overlayPos, setOverlayPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const boundingRef = useRef(null);

  // Get current anchor values from state
  const getAnchor = useCallback(() => {
    const obj = canvasObjects.find(o => o.id === selectedObject);
    return {
      anchorX: obj?.anchorX ?? 0.5,
      anchorY: obj?.anchorY ?? 0.5,
    };
  }, [canvasObjects, selectedObject]);

  // Update overlay position when object moves or selection changes
  useEffect(() => {
    if (!fabricCanvas || !selectedObject || !anchorEditMode) {
      setOverlayPos(null);
      return;
    }

    const updatePosition = () => {
      const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
      if (!fabricObject) {
        setOverlayPos(null);
        return;
      }

      const bound = fabricObject.getBoundingRect();
      boundingRef.current = bound;
      const { anchorX, anchorY } = getAnchor();

      setOverlayPos({
        x: bound.left + bound.width * anchorX,
        y: bound.top + bound.height * anchorY,
      });
    };

    updatePosition();

    fabricCanvas.on('object:moving', updatePosition);
    fabricCanvas.on('object:scaling', updatePosition);
    fabricCanvas.on('object:rotating', updatePosition);
    fabricCanvas.on('after:render', updatePosition);

    return () => {
      fabricCanvas.off('object:moving', updatePosition);
      fabricCanvas.off('object:scaling', updatePosition);
      fabricCanvas.off('object:rotating', updatePosition);
      fabricCanvas.off('after:render', updatePosition);
    };
  }, [fabricCanvas, selectedObject, anchorEditMode, canvasObjects, getAnchor]);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !boundingRef.current || !fabricCanvas || !selectedObject) return;

    const canvasEl = fabricCanvas.getElement();
    const rect = canvasEl.getBoundingClientRect();
    const bound = boundingRef.current;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Clamp anchor to 0-1 range within bounding box
    const newAnchorX = Math.max(0, Math.min(1, (mouseX - bound.left) / bound.width));
    const newAnchorY = Math.max(0, Math.min(1, (mouseY - bound.top) / bound.height));

    // ACTUALLY change the Fabric.js object's origin
    // This moves the rotation handle and changes the pivot point
    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (fabricObject) {
      changeAnchorPoint(fabricObject, newAnchorX, newAnchorY);
      fabricCanvas.requestRenderAll();
    }

    // Update overlay position
    setOverlayPos({
      x: bound.left + bound.width * newAnchorX,
      y: bound.top + bound.height * newAnchorY,
    });

    // Store in canvasObjects for LivePreview/Export transform-origin
    setCanvasObjects(prev => prev.map(obj => 
      obj.id === selectedObject
        ? { ...obj, anchorX: newAnchorX, anchorY: newAnchorY }
        : obj
    ));
  }, [isDragging, fabricCanvas, selectedObject, setCanvasObjects]);

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

  // Double-click to reset to center
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (fabricObject) {
      changeAnchorPoint(fabricObject, 0.5, 0.5);
      fabricCanvas.requestRenderAll();
    }

    setCanvasObjects(prev => prev.map(obj => 
      obj.id === selectedObject
        ? { ...obj, anchorX: 0.5, anchorY: 0.5 }
        : obj
    ));
  };

  if (!overlayPos || !anchorEditMode) return null;

  const { anchorX, anchorY } = getAnchor();

  return (
    <>
      {/* Crosshair indicator */}
      <Box
        sx={{
          position: 'absolute',
          left: overlayPos.x,
          top: overlayPos.y,
          width: 24,
          height: 24,
          transform: 'translate(-50%, -50%)',
          cursor: isDragging ? 'grabbing' : 'grab',
          zIndex: 1000,
          pointerEvents: 'all',
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        <svg width="24" height="24" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" fill="none" stroke="#ff0000" strokeWidth="2" />
          <circle cx="12" cy="12" r="2.5" fill="#ff0000" />
          <line x1="12" y1="0" x2="12" y2="24" stroke="#ff0000" strokeWidth="1.5" />
          <line x1="0" y1="12" x2="24" y2="12" stroke="#ff0000" strokeWidth="1.5" />
        </svg>
      </Box>
      
      {/* Label */}
      <Box
        sx={{
          position: 'absolute',
          left: overlayPos.x + 16,
          top: overlayPos.y - 28,
          bgcolor: 'rgba(220, 0, 0, 0.9)',
          color: 'white',
          px: 1,
          py: 0.25,
          borderRadius: 0.5,
          fontSize: '11px',
          fontWeight: 700,
          pointerEvents: 'none',
          zIndex: 1001,
          whiteSpace: 'nowrap',
          letterSpacing: '0.02em',
        }}
      >
        Pivot: {(anchorX * 100).toFixed(0)}%, {(anchorY * 100).toFixed(0)}%
      </Box>
    </>
  );
};

export default AnchorPointOverlay;