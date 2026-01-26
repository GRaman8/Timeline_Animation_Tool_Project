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
  useActiveColorIndex, 
  useColorPalette, 
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
  const [drawingSettings, setDrawingSettings] = useDrawingToolSettings();

  const [activeColorIndex, setActiveColorIndex] = useActiveColorIndex();
  const [colorPalette] = useColorPalette();
  
  // Track if user is currently interacting with an object
  const [isInteracting, setIsInteracting] = useState(false);
  const interactingObjectRef = useRef(null);

  //For Drawing
  const isDrawingRef = useRef(false);
  const drawingPointsRef = useRef([]);
  const tempPathRef = useRef(null);
  const pathSegmentsRef = useRef([]);

  const updateProperties = (fabricObject) => {
    const props = extractPropertiesFromFabricObject(fabricObject);
    if (props) {
      setSelectedObjectProperties(props);
    }
  };

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

  // Enhanced Drawing, Path, and Edit Mode Handler
  useEffect(() => {
    if (!fabricCanvas) return;

    // ===== DRAWING MODE HANDLERS =====
    const handleDrawingMouseDown = (e) => {
      if (!drawingMode) return;
      
      const pointer = fabricCanvas.getPointer(e.e);
      
      isDrawingRef.current = true;
      drawingPointsRef.current = [{ x: pointer.x, y: pointer.y }];
      pathSegmentsRef.current = [];

      const strokeWidth = drawingSettings.strokeWidth;
      
      tempPathRef.current = new fabric.Path(`M ${pointer.x} ${pointer.y}`, {
        stroke: drawingSettings.color,
        strokeWidth: strokeWidth,
        fill: '',
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
        selectable: false,
      });
      fabricCanvas.add(tempPathRef.current);
    };

    const handleDrawingMouseMove = (e) => {
      if (!drawingMode || !isDrawingRef.current) return;
      
      const pointer = fabricCanvas.getPointer(e.e);
      
      drawingPointsRef.current.push({ x: pointer.x, y: pointer.y });
      
      if (tempPathRef.current) {
        fabricCanvas.remove(tempPathRef.current);
        
        let pathString = `M ${drawingPointsRef.current[0].x} ${drawingPointsRef.current[0].y}`;
        for (let i = 1; i < drawingPointsRef.current.length; i++) {
          pathString += ` L ${drawingPointsRef.current[i].x} ${drawingPointsRef.current[i].y}`;
        }
        
        const strokeWidth = drawingSettings.strokeWidth;
        
        tempPathRef.current = new fabric.Path(pathString, {
          stroke: drawingSettings.color,
          strokeWidth: strokeWidth,
          fill: '',
          strokeLineCap: 'round',
          strokeLineJoin: 'round',
          selectable: false,
        });
        fabricCanvas.add(tempPathRef.current);
        fabricCanvas.renderAll();
      }
    };

    const handleDrawingMouseUp = () => {
      if (!drawingMode || !isDrawingRef.current) return;
      
      isDrawingRef.current = false;
      
      if (tempPathRef.current) {
        fabricCanvas.remove(tempPathRef.current);
        tempPathRef.current = null;
      }
      
      if (drawingPointsRef.current.length > 2) {
        // Check for shape recognition
        let createdObject = null;
        
        // if (shapeRecognitionEnabled) {
        //   const recognizedShape = recognizeShape(drawingPointsRef.current);
          
        //   if (recognizedShape) {
        //     const shapeInfo = createShapeFromRecognition(recognizedShape, null, drawingSettings);
            
        //     if (shapeInfo) {
        //       const id = `${shapeInfo.type}_${Date.now()}`;
        //       const count = canvasObjects.filter(obj => obj.type === shapeInfo.type).length + 1;
        //       const name = `${shapeInfo.type}_${count}`;
              
        //       // Create appropriate Fabric object
        //       let fabricObject;
        //       switch (shapeInfo.type) {
        //         case 'circle':
        //           fabricObject = new fabric.Circle({ id, ...shapeInfo.data });
        //           break;
        //         case 'rectangle':
        //           fabricObject = new fabric.Rect({ id, ...shapeInfo.data });
        //           break;
        //         case 'line':
        //           fabricObject = new fabric.Line(
        //             [shapeInfo.data.x1, shapeInfo.data.y1, shapeInfo.data.x2, shapeInfo.data.y2],
        //             { id, stroke: shapeInfo.data.stroke, strokeWidth: shapeInfo.data.strokeWidth }
        //           );
        //           break;
        //         case 'polygon':
        //           fabricObject = new fabric.Polygon(
        //             shapeInfo.data.points.reduce((acc, val, i) => {
        //               if (i % 2 === 0) acc.push({ x: val, y: shapeInfo.data.points[i + 1] });
        //               return acc;
        //             }, []),
        //             { id, ...shapeInfo.data }
        //           );
        //           break;
        //       }
              
        //       if (fabricObject) {
        //         fabricCanvas.add(fabricObject);
        //         fabricCanvas.setActiveObject(fabricObject);
        //         fabricCanvas.renderAll();
                
        //         setCanvasObjects(prev => [...prev, { 
        //           id, 
        //           type: shapeInfo.type, 
        //           name,
        //         }]);
        //         setKeyframes(prev => ({ ...prev, [id]: [] }));
                
        //         createdObject = fabricObject;
        //       }
        //     }
        //   }
        // }
        
        // If no shape recognized, create path
        if (!createdObject) {
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
            }]);
            setKeyframes(prev => ({ ...prev, [id]: [] }));
          }
        }
      }
      
      drawingPointsRef.current = [];
      pathSegmentsRef.current = [];
    };
  

    // ===== KEYBOARD HANDLERS =====
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (drawingMode) {
          setDrawingMode(false);
          if (tempPathRef.current) {
            fabricCanvas.remove(tempPathRef.current);
            tempPathRef.current = null;
            fabricCanvas.renderAll();
          }
          isDrawingRef.current = false;
          drawingPointsRef.current = [];
        }
        
        
        // if (pathEditMode) {
        //   setPathEditMode(false);
        //   // Remove control points
        //   const controls = fabricCanvas.getObjects().filter(obj => 
        //     obj.name === 'pathControl'
        //   );
        //   controls.forEach(ctrl => fabricCanvas.remove(ctrl));
        //   fabricCanvas.renderAll();
        // }
      }
      
      // Number keys to switch colors quickly
      if (drawingMode && e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key) - 1;
        if (index < colorPalette.length) {
          setActiveColorIndex(index);
          setDrawingSettings(prev => ({ 
            ...prev, 
            color: colorPalette[index] 
          }));
        }
      }
    };

    // ===== ATTACH EVENT LISTENERS =====
    
    if (drawingMode) {
      fabricCanvas.selection = false;
      fabricCanvas.forEachObject(obj => {
        obj.selectable = false;
        obj.evented = false;
      });
      
      fabricCanvas.on('mouse:down', handleDrawingMouseDown);
      fabricCanvas.on('mouse:move', handleDrawingMouseMove);
      fabricCanvas.on('mouse:up', handleDrawingMouseUp);
      window.addEventListener('keydown', handleKeyDown);
    } else {
      // NORMAL MODE
      fabricCanvas.selection = true;
      fabricCanvas.defaultCursor = 'default';
      
      
      fabricCanvas.forEachObject(obj => {
        if (!obj.isControlPoint) {
          obj.selectable = true;
          obj.evented = true;
        }
      });
      
      fabricCanvas.off('mouse:down', handleDrawingMouseDown);
      fabricCanvas.off('mouse:move', handleDrawingMouseMove);
      fabricCanvas.off('mouse:up', handleDrawingMouseUp);
      // fabricCanvas.off('mouse:down', handlePathEditClick);
      // fabricCanvas.off('object:modified', handleControlPointModified);
      // window.removeEventListener('keydown', handlePathEditKeyDown);
      
      fabricCanvas.renderAll();
    }

    return () => {
      // Cleanup
      fabricCanvas.off('mouse:down', handleDrawingMouseDown);
      fabricCanvas.off('mouse:move', handleDrawingMouseMove);
      fabricCanvas.off('mouse:up', handleDrawingMouseUp);
      // fabricCanvas.off('mouse:down', handlePathEditClick);
      // fabricCanvas.off('object:modified', handleControlPointModified);
      // window.removeEventListener('keydown', handlePathEditKeyDown);
      
      if (fabricCanvas) {
        fabricCanvas.selection = true;
        fabricCanvas.defaultCursor = 'default';
        
        // // Clean up control points
        // if (pathEditStateRef.current.controlPoints.length > 0) {
        //   pathEditStateRef.current.controlPoints.forEach(ctrl => {
        //     try {
        //       fabricCanvas.remove(ctrl);
        //     } catch (e) {}
        //   });
        //   pathEditStateRef.current.controlPoints = [];
        // }
      }
    };
  }, [
    fabricCanvas, 
    drawingMode, 
    drawingSettings, 
    canvasObjects, 
    setCanvasObjects, 
    setKeyframes,
    colorPalette,
    activeColorIndex,
  ]);

  

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

  // Keyboard delete handler
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleKeyDown = (e) => {
      // Don't delete if we're in drawing mode or editing text
      if (drawingMode) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricCanvas.getActiveObjects();
        
        if (activeObjects.length > 0) {
          e.preventDefault(); // Prevent browser back navigation
          
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