import React, { useEffect, useRef } from 'react';
import { Paper, Box } from '@mui/material';
import * as fabric from 'fabric';

import { 
  useSelectedObject, 
  useFabricCanvas,
  useSelectedObjectProperties,
  useCurrentTime,
  useKeyframes,
  useCanvasObjects 
} from '../../store/hooks';

import { 
  extractPropertiesFromFabricObject,
  findFabricObjectById 
} from '../../utils/fabricHelpers';

import { 
  findSurroundingKeyframes, 
  interpolateProperties, 
  applyPropertiesToFabricObject 
} from '../../utils/interpolation';

const Canvas = () => {
  const canvasRef = useRef(null);
  const [selectedObject, setSelectedObject] = useSelectedObject();
  const [fabricCanvas, setFabricCanvas] = useFabricCanvas();
  const [, setSelectedObjectProperties] = useSelectedObjectProperties();
  const [currentTime] = useCurrentTime();
  const [keyframes] = useKeyframes();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1200,
      height: 600,
      backgroundColor: '#f0f0f0',
    });

    setFabricCanvas(canvas);

    // Selection event handlers
    canvas.on('selection:created', (e) => {
      if (e.selected && e.selected[0]) {
        const id = e.selected[0].id;
        setSelectedObject(id);
        updateProperties(e.selected[0]);
      }
    });

    canvas.on('selection:updated', (e) => {
      if (e.selected && e.selected[0]) {
        const id = e.selected[0].id;
        setSelectedObject(id);
        updateProperties(e.selected[0]);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Update the object:modified handler (around line 65)
    canvas.on('object:modified', (e) => {
      if (e.target) {
        updateProperties(e.target);
        // Force re-render to ensure state sync
        canvas.renderAll();
      }
    });

    // Add object:moving handler for real-time updates
    canvas.on('object:moving', (e) => {
      if (e.target) {
        updateProperties(e.target);
      }
    });

    canvas.on('object:scaling', (e) => {
      if (e.target) {
        updateProperties(e.target);
      }
    });

    canvas.on('object:rotating', (e) => {
      if (e.target) {
        updateProperties(e.target);
      }
    });

    // Update the double-click handler (around line 75)
    canvas.on('mouse:dblclick', (e) => {
      if (e.target && e.target.type === 'text') {
        const newText = prompt('Enter new text:', e.target.text);
        if (newText !== null && newText !== '') {
          e.target.set('text', newText);
          canvas.renderAll();
          
          // Update state to store text content
          setCanvasObjects(prev => prev.map(obj => 
            obj.id === e.target.id 
              ? { ...obj, textContent: newText }
              : obj
          ));
        }
      }
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  const updateProperties = (fabricObject) => {
    const props = extractPropertiesFromFabricObject(fabricObject);
    if (props) {
      setSelectedObjectProperties(props);
    }
  };

  // Update canvas when time changes (for animation playback)
  useEffect(() => {
    if (!fabricCanvas) return;

    canvasObjects.forEach(obj => {
      const objectKeyframes = keyframes[obj.id] || [];
      if (objectKeyframes.length === 0) return;

      const fabricObject = findFabricObjectById(fabricCanvas, obj.id);
      if (!fabricObject) return;

      const { before, after } = findSurroundingKeyframes(objectKeyframes, currentTime);
      // Get easing for this segment (use easing of the 'after' keyframe)
      let easingType = 'linear';
      if (before && after && before !== after) {
        const afterIndex = objectKeyframes.indexOf(after);
        // You'll add easing data to keyframes in Phase 3
        easingType = after.easing || 'linear';
      }
      
      const interpolated = interpolateProperties(before, after, currentTime, easingType);
      
      if (interpolated) {
        applyPropertiesToFabricObject(fabricObject, interpolated);
      }
    });

    fabricCanvas.renderAll();
    // Phase-1 & 2 version code:
    //   const interpolated = interpolateProperties(before, after, currentTime);
      
    //   if (interpolated) {
    //     applyPropertiesToFabricObject(fabricObject, interpolated);
    //   }
    // });

    // fabricCanvas.renderAll();
  }, [currentTime, keyframes, canvasObjects, fabricCanvas]);

  return (
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ display: 'inline-block' }}>
        <canvas ref={canvasRef} />
      </Paper>
    </Box>
  );
};

export default Canvas;