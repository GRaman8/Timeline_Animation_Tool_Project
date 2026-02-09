/**
 * 
 * Displays and allows dragging of the anchor point (transform origin)
 * for the currently selected object on the Fabric.js canvas.
*/

import React, { useEffect, useState, useRef } from 'react';

import { Box } from '@mui/material';

import { 
  useSelectedObject, 
  useFabricCanvas, 
  useAnchorEditMode,
  useCanvasObjects,
} from '../../store/hooks';

import { findFabricObjectById } from '../../utils/fabricHelpers';

const AnchorPointOverlay = () => {
  const [selectedObject] = useSelectedObject();
  const [fabricCanvas] = useFabricCanvas();
  const [anchorEditMode] = useAnchorEditMode();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();
  
  const [anchorPosition, setAnchorPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef(null);

  // Update anchor position when selection changes or object moves
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

      // Get object's bounding box
      const bound = fabricObject.getBoundingRect();
      
      // Get anchor point from canvas objects state (default to center)
      const objectData = canvasObjects.find(obj => obj.id === selectedObject);
      const anchorX = objectData?.anchorX ?? 0.5;
      const anchorY = objectData?.anchorY ?? 0.5;

      // Calculate anchor position in canvas coordinates
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

    // Update when object moves
    fabricCanvas.on('object:moving', updateAnchorPosition);
    fabricCanvas.on('object:scaling', updateAnchorPosition);
    fabricCanvas.on('object:rotating', updateAnchorPosition);

    return () => {
      fabricCanvas.off('object:moving', updateAnchorPosition);
      fabricCanvas.off('object:scaling', updateAnchorPosition);
      fabricCanvas.off('object:rotating', updateAnchorPosition);
    };
  }, [fabricCanvas, selectedObject, anchorEditMode, canvasObjects]);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !anchorPosition || !fabricCanvas || !selectedObject) return;

    const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
    if (!fabricObject) return;

    // Get canvas element position
    const canvasElement = fabricCanvas.getElement();
    const rect = canvasElement.getBoundingClientRect();

    // Calculate mouse position relative to canvas
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new anchor as percentage of bounding box
    const newAnchorX = Math.max(0, Math.min(1, 
      (mouseX - anchorPosition.boundLeft) / anchorPosition.boundWidth
    ));
    const newAnchorY = Math.max(0, Math.min(1, 
      (mouseY - anchorPosition.boundTop) / anchorPosition.boundHeight
    ));

    // Update anchor in state
    setCanvasObjects(prev => prev.map(obj => 
      obj.id === selectedObject
        ? { ...obj, anchorX: newAnchorX, anchorY: newAnchorY }
        : obj
    ));

    // Update Fabric.js object origin
    fabricObject.set({
      originX: newAnchorX,
      originY: newAnchorY,
    });

    fabricCanvas.renderAll();
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, anchorPosition, fabricCanvas, selectedObject]);

  if (!anchorPosition || !anchorEditMode) return null;

  return (
    <Box
      sx={{
        position: 'absolute',
        left: anchorPosition.x,
        top: anchorPosition.y,
        width: 16,
        height: 16,
        transform: 'translate(-50%, -50%)',
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: 1000,
        pointerEvents: 'all',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Crosshair visual */}
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle 
          cx="8" 
          cy="8" 
          r="6" 
          fill="none" 
          stroke="#ff0000" 
          strokeWidth="2"
        />
        <line 
          x1="8" 
          y1="0" 
          x2="8" 
          y2="16" 
          stroke="#ff0000" 
          strokeWidth="2"
        />
        <line 
          x1="0" 
          y1="8" 
          x2="16" 
          y2="8" 
          stroke="#ff0000" 
          strokeWidth="2"
        />
      </svg>
    </Box>
  );
};

export default AnchorPointOverlay;