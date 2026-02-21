import React, { useEffect, useRef, useState } from 'react';
import { Paper, Box, Typography, Chip } from '@mui/material';
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
  createCompoundPathFromStrokes,
  ungroupFabricGroup,
} from '../../utils/fabricHelpers';

import { 
  findSurroundingKeyframes, 
  interpolateProperties, 
  applyPropertiesToFabricObject,
  applyZIndexOrdering,
} from '../../utils/interpolation';

import AnchorPointOverlay from './AnchorPointOverlay';

export const CANVAS_WIDTH = 1400;
export const CANVAS_HEIGHT = 800;

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

  // --- Multi-stroke drawing state ---
  const isDrawingRef = useRef(false);
  const drawingPointsRef = useRef([]);
  const tempPathRef = useRef(null);
  // Accumulated strokes (each is an array of points)
  const committedStrokesRef = useRef([]);
  // Fabric paths for committed strokes (visual only, non-selectable)
  const committedStrokePathsRef = useRef([]);
  const [strokeCount, setStrokeCount] = useState(0);

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
      if (e.target) updateProperties(e.target);
    });

    canvas.on('object:scaling', (e) => {
      if (e.target) updateProperties(e.target);
    });

    canvas.on('object:rotating', (e) => {
      if (e.target) updateProperties(e.target);
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

  /**
   * Commit all accumulated strokes as a single compound path object.
   * Called by Enter key or "Finish Drawing" button.
   */
  const commitDrawing = () => {
    if (!fabricCanvas) return;
    
    const strokes = committedStrokesRef.current;
    if (strokes.length === 0) return;

    // Remove visual stroke previews from canvas
    committedStrokePathsRef.current.forEach(p => {
      try { fabricCanvas.remove(p); } catch(e) {}
    });
    committedStrokePathsRef.current = [];

    // Create compound path from all strokes
    const id = `path_${Date.now()}`;
    const count = canvasObjects.filter(obj => obj.type === 'path').length + 1;
    const name = `Drawing_${count}`;

    let pathObject;
    if (strokes.length === 1) {
      pathObject = createPathFromPoints(strokes[0], id, drawingSettings);
    } else {
      pathObject = createCompoundPathFromStrokes(strokes, id, drawingSettings);
    }

    if (pathObject) {
      fabricCanvas.add(pathObject);
      fabricCanvas.setActiveObject(pathObject);
      fabricCanvas.renderAll();

      setCanvasObjects(prev => [...prev, {
        id, type: 'path', name,
        pathData: pathObject.path,
        strokeColor: drawingSettings.color,
        strokeWidth: drawingSettings.strokeWidth,
        boundingBox: { width: pathObject.width, height: pathObject.height }
      }]);
      setKeyframes(prev => ({ ...prev, [id]: [] }));
    }

    // Reset stroke accumulator
    committedStrokesRef.current = [];
    setStrokeCount(0);
  };

  /**
   * Cancel all accumulated strokes without committing.
   */
  const cancelDrawing = () => {
    if (!fabricCanvas) return;
    
    // Remove visual stroke previews
    committedStrokePathsRef.current.forEach(p => {
      try { fabricCanvas.remove(p); } catch(e) {}
    });
    committedStrokePathsRef.current = [];
    committedStrokesRef.current = [];
    
    if (tempPathRef.current) {
      fabricCanvas.remove(tempPathRef.current);
      tempPathRef.current = null;
    }
    
    isDrawingRef.current = false;
    drawingPointsRef.current = [];
    setStrokeCount(0);
    fabricCanvas.renderAll();
  };

  // Expose commitDrawing for external use (Toolbar button)
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas._commitDrawing = commitDrawing;
      fabricCanvas._cancelDrawing = cancelDrawing;
      fabricCanvas._getStrokeCount = () => committedStrokesRef.current.length;
    }
  }, [fabricCanvas, canvasObjects, drawingSettings]);

  // Multi-stroke drawing mode handler
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
        evented: false,
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
          evented: false,
        });
        fabricCanvas.add(tempPathRef.current);
        fabricCanvas.renderAll();
      }
    };

    const handleMouseUp = () => {
      if (!drawingMode || !isDrawingRef.current) return;
      isDrawingRef.current = false;
      
      // Remove temp preview
      if (tempPathRef.current) {
        fabricCanvas.remove(tempPathRef.current);
        tempPathRef.current = null;
      }
      
      if (drawingPointsRef.current.length > 2) {
        const points = [...drawingPointsRef.current];
        
        // Store this stroke
        committedStrokesRef.current.push(points);
        setStrokeCount(committedStrokesRef.current.length);
        
        // Add a visual preview of this committed stroke (non-selectable, dimmed)
        const previewPath = createPathFromPoints(points, `preview_${Date.now()}`, {
          ...drawingSettings,
          color: drawingSettings.color,
        });
        if (previewPath) {
          previewPath.set({
            selectable: false,
            evented: false,
            opacity: 0.6,
          });
          fabricCanvas.add(previewPath);
          committedStrokePathsRef.current.push(previewPath);
          fabricCanvas.renderAll();
        }
      }
      
      drawingPointsRef.current = [];
    };

    const handleKeyDown = (e) => {
      if (!drawingMode) return;
      
      if (e.key === 'Enter') {
        // Commit all strokes as one object
        e.preventDefault();
        commitDrawing();
        return;
      }
      
      if (e.key === 'Escape') {
        // Cancel drawing and exit mode
        cancelDrawing();
        setDrawingMode(false);
        return;
      }
    };

    if (drawingMode) {
      fabricCanvas.selection = false;
      fabricCanvas.forEachObject(obj => {
        // Don't disable preview strokes
        if (!obj.id?.startsWith('preview_')) {
          obj.selectable = false;
          obj.evented = false;
        }
      });
      fabricCanvas.on('mouse:down', handleMouseDown);
      fabricCanvas.on('mouse:move', handleMouseMove);
      fabricCanvas.on('mouse:up', handleMouseUp);
      window.addEventListener('keydown', handleKeyDown);
    } else {
      // When exiting drawing mode, commit any pending strokes
      if (committedStrokesRef.current.length > 0) {
        commitDrawing();
      }
      
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

  // Canvas update - handle visibility, interpolation, and zIndex during playback
  useEffect(() => {
    if (!fabricCanvas) return;
    if (isInteracting) return;

    // Ensure all objects are visible
    fabricCanvas.forEachObject(obj => {
      obj.visible = true;
      obj.opacity = obj.opacity || 1;
    });

    // Update selected object's active state
    if (selectedObject && !isPlaying) {
      const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
      if (fabricObject && fabricCanvas.getActiveObject() !== fabricObject) {
        fabricCanvas.setActiveObject(fabricObject);
      }
    }

    // Interpolate animated objects during playback
    if (isPlaying) {
      canvasObjects.forEach(obj => {
        const objectKeyframes = keyframes[obj.id] || [];
        if (objectKeyframes.length === 0) return;

        const fabricObject = findFabricObjectById(fabricCanvas, obj.id);
        if (!fabricObject) return;

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

      // Apply z-index ordering after all objects are updated
      applyZIndexOrdering(fabricCanvas);
    }

    fabricCanvas.renderAll();
  }, [currentTime, keyframes, canvasObjects, fabricCanvas, isInteracting, selectedObject, isPlaying]);

  // Keyboard shortcuts handler
  useEffect(() => {
    if (!fabricCanvas) return;
    if (isInteracting) return;

    if (selectedObject && !isPlaying) {
      const fabricObject = findFabricObjectById(fabricCanvas, selectedObject);
      if (fabricObject && fabricCanvas.getActiveObject() !== fabricObject) {
        fabricCanvas.setActiveObject(fabricObject);
        fabricCanvas.renderAll();
      }
    }

    const handleKeyDown = (e) => {
      if (drawingMode) return;
      
      // GROUP: Cmd/Ctrl + G
      if ((e.metaKey || e.ctrlKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        const activeObjects = fabricCanvas.getActiveObjects();
        if (activeObjects.length > 1) {
          const objectsList = [...activeObjects];
          const childIds = objectsList.map(obj => obj.id);
          
          fabricCanvas.discardActiveObject();
          objectsList.forEach(obj => fabricCanvas.remove(obj));
          
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
        }
        return;
      }
      
      // UNGROUP: Cmd/Ctrl + Shift + G
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        if (!selectedObject) return;
        
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
        return;
      }
      
      // DELETE
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObjects = fabricCanvas.getActiveObjects();
        if (activeObjects.length > 0) {
          e.preventDefault();
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
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, drawingMode, canvasObjects, setCanvasObjects, setKeyframes, setSelectedObject, selectedObject]);

  return (
    <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      {/* Drawing mode indicator */}
      {drawingMode && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1, 
          mb: 1,
          p: 1,
          bgcolor: 'warning.light',
          borderRadius: 1,
          width: '100%',
          maxWidth: CANVAS_WIDTH,
        }}>
          <Typography variant="body2" fontWeight={600}>
            🎨 Drawing Mode
          </Typography>
          {strokeCount > 0 && (
            <Chip 
              label={`${strokeCount} stroke${strokeCount !== 1 ? 's' : ''}`} 
              size="small" 
              color="primary" 
            />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            Draw strokes • Press <strong>Enter</strong> to finish • <strong>Esc</strong> to cancel
          </Typography>
        </Box>
      )}
      
      <Paper elevation={3} sx={{ display: 'inline-block', position: 'relative' }}>
        <canvas ref={canvasRef} />
        <AnchorPointOverlay />
      </Paper>
    </Box>
  );
};

export default Canvas;