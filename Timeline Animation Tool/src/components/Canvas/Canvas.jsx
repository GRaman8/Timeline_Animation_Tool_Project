import React, { useEffect, useRef, useState } from 'react';
import { Paper, Box } from '@mui/material';
import * as fabric from 'fabric';

import { 
  useSelectedObject, 
  useFabricCanvas,
  useSelectedObjectProperties,
  useCurrentTime,
  useKeyframes,
  useCanvasObjects,
  useIsPlaying,
  useHasActiveSelection // ADD THIS
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
  const [isPlaying] = useIsPlaying();
  const [, setHasActiveSelection] = useHasActiveSelection(); // ADD THIS
  
  // Track if user is currently interacting with an object
  const [isInteracting, setIsInteracting] = useState(false);
  const interactingObjectRef = useRef(null);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1200,
      height: 600,
      backgroundColor: '#f0f0f0',
      selection: true,
      selectionColor: 'rgba(100, 100, 255, 0.3)',
      selectionBorderColor: 'rgba(50, 50, 200, 0.8)',
      selectionLineWidth: 2,
    });

    setFabricCanvas(canvas);

    // Selection event handlers
    canvas.on('selection:created', (e) => {
      setHasActiveSelection(true); // UPDATE SELECTION STATE
      
      if (e.selected) {
        if (e.selected.length === 1) {
          const id = e.selected[0].id;
          setSelectedObject(id);
          updateProperties(e.selected[0]);
        } else if (e.selected.length > 1) {
          setSelectedObject(null);
          updateProperties(e.selected[0]);
        }
      }
    });

    canvas.on('selection:updated', (e) => {
      setHasActiveSelection(true); // UPDATE SELECTION STATE
      
      if (e.selected) {
        if (e.selected.length === 1) {
          const id = e.selected[0].id;
          setSelectedObject(id);
          updateProperties(e.selected[0]);
        } else if (e.selected.length > 1) {
          setSelectedObject(null);
          updateProperties(e.selected[0]);
        }
      }
    });

    canvas.on('selection:cleared', () => {
      setHasActiveSelection(false); // UPDATE SELECTION STATE
      setSelectedObject(null);
    });

    canvas.on('object:modified', (e) => {
      if (e.target) {
        updateProperties(e.target);
        canvas.renderAll();
      }
    });

    // Track when user starts interacting
    canvas.on('mouse:down', (e) => {
      if (e.target) {
        setIsInteracting(true);
        interactingObjectRef.current = e.target.id;
      }
    });

    // Track when user stops interacting
    canvas.on('mouse:up', () => {
      setIsInteracting(false);
      interactingObjectRef.current = null;
    });

    // Real-time updates during interaction
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

    // Text editing handler
    canvas.on('mouse:dblclick', (e) => {
      if (e.target && e.target.type === 'text') {
        const newText = prompt('Enter new text:', e.target.text);
        if (newText !== null && newText !== '') {
          e.target.set('text', newText);
          canvas.renderAll();
          
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

  // Update canvas when time changes
  useEffect(() => {
    if (!fabricCanvas) return;
    if (isInteracting) return;

    canvasObjects.forEach(obj => {
      const objectKeyframes = keyframes[obj.id] || [];
      if (objectKeyframes.length === 0) return;

      const fabricObject = findFabricObjectById(fabricCanvas, obj.id);
      if (!fabricObject) return;

      if (fabricObject.id === selectedObject && !isPlaying) {
        return;
      }

      const { before, after } = findSurroundingKeyframes(objectKeyframes, currentTime);
      
      let easingType = 'linear';
      if (before && after && before !== after) {
        easingType = after.easing || 'linear';
      }
      
      const interpolated = interpolateProperties(before, after, currentTime, easingType);
      
      if (interpolated) {
        applyPropertiesToFabricObject(fabricObject, interpolated);
      }
    });

    fabricCanvas.renderAll();
  }, [currentTime, keyframes, canvasObjects, fabricCanvas, isInteracting, selectedObject, isPlaying]);

  return (
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ display: 'inline-block' }}>
        <canvas ref={canvasRef} />
      </Paper>
    </Box>
  );
};

export default Canvas;