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
  useHasActiveSelection,
  useDrawingMode,
  useCurrentDrawingPath,
  useDrawingToolSettings,
} from '../../store/hooks';

import { 
  extractPropertiesFromFabricObject,
  findFabricObjectById,
  createPathFromPoints, 
} from '../../utils/fabricHelpers';

import { 
  findSurroundingKeyframes, 
  interpolateProperties, 
  applyPropertiesToFabricObject 
} from '../../utils/interpolation';

// FIXED: Use consistent canvas dimensions across all views
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;

const Canvas = () => {
  const canvasRef = useRef(null);
  const [selectedObject, setSelectedObject] = useSelectedObject();
  const [fabricCanvas, setFabricCanvas] = useFabricCanvas();
  const [, setSelectedObjectProperties] = useSelectedObjectProperties();
  const [currentTime] = useCurrentTime();
  const [keyframes, setKeyframes] = useKeyframes();
  const [canvasObjects, setCanvasObjects] = useCanvasObjects();
  const [isPlaying] = useIsPlaying();
  const [, setHasActiveSelection] = useHasActiveSelection();
  const [drawingMode, setDrawingMode] = useDrawingMode();
  const [currentDrawingPath, setCurrentDrawingPath] = useCurrentDrawingPath();
  const [drawingSettings] = useDrawingToolSettings();
  
  const [isInteracting, setIsInteracting] = useState(false);
  const interactingObjectRef = useRef(null);

  const isDrawingRef = useRef(false);
  const drawingPointsRef = useRef([]);
  const tempPathRef = useRef(null);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: '#f0f0f0',
      selection: true,
      selectionColor: 'rgba(100, 100, 255, 0.3)',
      selectionBorderColor: 'rgba(50, 50, 200, 0.8)',
      selectionLineWidth: 2,
    });

    setFabricCanvas(canvas);

    canvas.on('selection:created', (e) => {
      setHasActiveSelection(true);
      
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
      setHasActiveSelection(true);
      
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
      setHasActiveSelection(false);
      setSelectedObject(null);
    });

    canvas.on('object:modified', (e) => {
      if (e.target) {
        updateProperties(e.target);
        
        // Update the canvas object's stored data
        if (e.target.type === 'path') {
          setCanvasObjects(prev => prev.map(obj => 
            obj.id === e.target.id 
              ? { 
                  ...obj, 
                  pathData: e.target.path,
                  strokeColor: e.target.stroke,
                  strokeWidth: e.target.strokeWidth,
                  boundingBox: {
                    width: e.target.width,
                    height: e.target.height
                  }
                }
              : obj
          ));
        }
        
        canvas.renderAll();
      }
    });

    canvas.on('mouse:down', (e) => {
      if (e.target) {
        setIsInteracting(true);
        interactingObjectRef.current = e.target.id;
      }
    });

    canvas.on('mouse:up', () => {
      setIsInteracting(false);
      interactingObjectRef.current = null;
    });

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

  // Drawing mode handler
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (e) => {
      if (!drawingMode) return;
      
      const pointer = fabricCanvas.getPointer(e.e);
      isDrawingRef.current = true;
      drawingPointsRef.current = [{ x: pointer.x, y: pointer.y }];
      
      tempPathRef.current = new fabric.Path(`M ${pointer.x} ${pointer.y}`, {
        stroke: drawingSettings.color,
        strokeWidth: drawingSettings.strokeWidth,
        fill: '',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        selectable: false,
      });
      fabricCanvas.add(tempPathRef.current);
    };

    const handleMouseMove = (e) => {
      if (!drawingMode || !isDrawingRef.current) return;
      
      const pointer = fabricCanvas.getPointer(e.e);
      drawingPointsRef.current.push({ x: pointer.x, y: pointer.y });
      
      if (tempPathRef.current) {
        fabricCanvas.remove(tempPathRef.current);
        
        let pathString = `M ${drawingPointsRef.current[0].x} ${drawingPointsRef.current[0].y}`;
        for (let i = 1; i < drawingPointsRef.current.length; i++) {
          pathString += ` L ${drawingPointsRef.current[i].x} ${drawingPointsRef.current[i].y}`;
        }
        
        tempPathRef.current = new fabric.Path(pathString, {
          stroke: drawingSettings.color,
          strokeWidth: drawingSettings.strokeWidth,
          fill: '',
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          selectable: false,
        });
        fabricCanvas.add(tempPathRef.current);
        fabricCanvas.renderAll();
      }
    };

    const handleMouseUp = () => {
      if (!drawingMode || !isDrawingRef.current) return;
      
      isDrawingRef.current = false;
      
      if (tempPathRef.current) {
        fabricCanvas.remove(tempPathRef.current);
        tempPathRef.current = null;
      }
      
      if (drawingPointsRef.current.length > 2) {
        const id = `path_${Date.now()}`;
        const count = canvasObjects.filter(obj => obj.type === 'path').length + 1;
        const name = `Drawing_${count}`;
        
        const pathObject = createPathFromPoints(
          drawingPointsRef.current, 
          id, 
          drawingSettings
        );
        
        if (pathObject) {
          fabricCanvas.add(pathObject);
          fabricCanvas.setActiveObject(pathObject);
          fabricCanvas.renderAll();
          
          setCanvasObjects(prev => [...prev, { 
            id, 
            type: 'path', 
            name,
            pathData: pathObject.path,
            strokeColor: drawingSettings.color,
            strokeWidth: drawingSettings.strokeWidth,
            boundingBox: {
              width: pathObject.width,
              height: pathObject.height
            }
          }]);
          setKeyframes(prev => ({ ...prev, [id]: [] }));
        }
      }
      
      drawingPointsRef.current = [];
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && drawingMode) {
        setDrawingMode(false);
        
        if (tempPathRef.current) {
          fabricCanvas.remove(tempPathRef.current);
          tempPathRef.current = null;
          fabricCanvas.renderAll();
        }
        
        isDrawingRef.current = false;
        drawingPointsRef.current = [];
      }
    };

    if (drawingMode) {
      fabricCanvas.selection = false;
      fabricCanvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
      
      fabricCanvas.on('mouse:down', handleMouseDown);
      fabricCanvas.on('mouse:move', handleMouseMove);
      fabricCanvas.on('mouse:up', handleMouseUp);
      window.addEventListener('keydown', handleKeyDown);
    } else {
      fabricCanvas.selection = true;
      fabricCanvas.forEachObject(obj => {
        obj.selectable = true;
        obj.evented = true;
      });
      
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      
      fabricCanvas.renderAll();
    }

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
      
      if (fabricCanvas) {
        fabricCanvas.selection = true;
        fabricCanvas.forEachObject(obj => {
          obj.selectable = true;
          obj.evented = true;
        });
      }
    };
  }, [fabricCanvas, drawingMode, drawingSettings, canvasObjects, setCanvasObjects, setKeyframes, setDrawingMode]);

  const updateProperties = (fabricObject) => {
    const props = extractPropertiesFromFabricObject(fabricObject);
    if (props) {
      setSelectedObjectProperties(props);
    }
  };

  // Update canvas when time changes OR when selected object changes
  useEffect(() => {
    if (!fabricCanvas) return;
    if (isInteracting) return;

    // If there's a selected object, make sure it's active in the canvas
    if (selectedObject && !isPlaying) {
      const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
      if (fabricObject && fabricCanvas.getActiveObject() !== fabricObject) {
        fabricCanvas.setActiveObject(fabricObject);
        fabricCanvas.renderAll();
      }
    }

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

  // Keyboard delete handler
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleKeyDown = (e) => {
      if (drawingMode) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricCanvas.getActiveObjects();
        
        if (activeObjects.length > 0) {
          e.preventDefault();
          
          activeObjects.forEach(fabricObject => {
            if (fabricObject && fabricObject.id) {
              fabricCanvas.remove(fabricObject);
              
              setCanvasObjects(prev => prev.filter(obj => obj.id !== fabricObject.id));
              setKeyframes(prev => {
                const updated = { ...prev };
                delete updated[fabricObject.id];
                return updated;
              });
            }
          });

          fabricCanvas.discardActiveObject();
          fabricCanvas.renderAll();
          setSelectedObject(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fabricCanvas, drawingMode, setCanvasObjects, setKeyframes, setSelectedObject]);

  return (
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
      <Paper elevation={3} sx={{ display: 'inline-block' }}>
        <canvas ref={canvasRef} />
      </Paper>
    </Box>
  );
};

export default Canvas;