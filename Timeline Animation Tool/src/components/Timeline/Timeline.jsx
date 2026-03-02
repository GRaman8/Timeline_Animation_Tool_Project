import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Paper, Typography, Box, Tooltip, IconButton } from '@mui/material';
import { Sync as SyncIcon } from '@mui/icons-material';
import { 
  useCanvasObjects, 
  useKeyframes, 
  useTrackOrder, 
  useFabricCanvas 
} from '../../store/hooks';
import PlaybackControls from './PlaybackControls';
import TimelineScrubber from './TimelineScrubber';
import TimelineTrack from './TimelineTrack';

const Timeline = () => {
  const [canvasObjects] = useCanvasObjects();
  const [keyframes] = useKeyframes();
  const [trackOrder, setTrackOrder] = useTrackOrder();
  const [fabricCanvas] = useFabricCanvas();
  
  // Drag state
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null); // 'above' or 'below'

  // Sync trackOrder when canvasObjects change (add/remove objects)
  useEffect(() => {
    setTrackOrder(prev => {
      const existingIds = new Set(canvasObjects.map(o => o.id));
      // Remove IDs no longer in canvas
      const filtered = prev.filter(id => existingIds.has(id));
      // Add new IDs not yet in order (at the top = front)
      const inOrder = new Set(filtered);
      const newIds = canvasObjects
        .filter(o => !inOrder.has(o.id))
        .map(o => o.id);
      if (newIds.length === 0 && filtered.length === prev.length) return prev;
      return [...newIds, ...filtered];
    });
  }, [canvasObjects, setTrackOrder]);

  // Get ordered objects based on trackOrder
  const orderedObjects = React.useMemo(() => {
    if (trackOrder.length === 0) return canvasObjects;
    const objMap = {};
    canvasObjects.forEach(obj => { objMap[obj.id] = obj; });
    const ordered = trackOrder
      .map(id => objMap[id])
      .filter(Boolean);
    // Append any objects not in trackOrder
    const inOrder = new Set(trackOrder);
    canvasObjects.forEach(obj => {
      if (!inOrder.has(obj.id)) ordered.push(obj);
    });
    return ordered;
  }, [canvasObjects, trackOrder]);

  // === DRAG & DROP HANDLERS ===
  const handleDragStart = useCallback((objectId) => {
    setDraggedId(objectId);
  }, []);

  const handleDragOver = useCallback((e, objectId) => {
    e.preventDefault();
    if (!draggedId || draggedId === objectId) {
      setDragOverId(null);
      return;
    }
    // Determine if cursor is in upper or lower half of the track
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    setDragOverId(objectId);
    setDragOverPosition(position);
  }, [draggedId]);

  const handleDrop = useCallback((e, targetId) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    setTrackOrder(prev => {
      const order = [...prev];
      const fromIndex = order.indexOf(draggedId);
      if (fromIndex < 0) return prev;
      
      // Remove from current position
      order.splice(fromIndex, 1);
      
      // Find target position
      let toIndex = order.indexOf(targetId);
      if (toIndex < 0) return prev;
      
      // Insert above or below target
      if (dragOverPosition === 'below') toIndex += 1;
      order.splice(toIndex, 0, draggedId);
      
      return order;
    });

    // Also update canvas z-ordering to match new track order
    if (fabricCanvas) {
      setTimeout(() => {
        syncCanvasZOrderToTrackOrder();
      }, 0);
    }

    setDraggedId(null);
    setDragOverId(null);
    setDragOverPosition(null);
  }, [draggedId, dragOverPosition, fabricCanvas, setTrackOrder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDragOverId(null);
    setDragOverPosition(null);
  }, []);

  // Sync canvas z-order to match track order (top track = front)
  const syncCanvasZOrderToTrackOrder = useCallback(() => {
    if (!fabricCanvas) return;
    
    // Track order: first item = front (highest z), last = back (lowest z)
    // Canvas: last object in array = on top
    // So we need to bring objects to front in reverse track order
    const reversedOrder = [...trackOrder].reverse();
    
    reversedOrder.forEach(id => {
      const obj = fabricCanvas.getObjects().find(o => o.id === id);
      if (obj) {
        try {
          if (typeof fabricCanvas.bringObjectToFront === 'function') {
            fabricCanvas.bringObjectToFront(obj);
          }
        } catch (e) {}
      }
    });
    
    fabricCanvas.renderAll();
  }, [fabricCanvas, trackOrder]);

  // Button to manually sync track order from current canvas z-order
  const syncTrackOrderFromCanvas = useCallback(() => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    // Canvas: last in array = front. Track: first = front
    const newOrder = [...objects]
      .filter(obj => obj.id)
      .reverse()
      .map(obj => obj.id);
    setTrackOrder(newOrder);
  }, [fabricCanvas, setTrackOrder]);

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography variant="h6">
          Timeline
        </Typography>
        <Tooltip title="Sync track order from canvas layer order">
          <IconButton size="small" onClick={syncTrackOrderFromCanvas}>
            <SyncIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      
      <PlaybackControls />
      <TimelineScrubber />
      
      <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
        {orderedObjects.length === 0 ? (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4, 
            color: 'text.secondary' 
          }}>
            <Typography variant="body2">
              Add elements to the stage to see timeline tracks
            </Typography>
          </Box>
        ) : (
          orderedObjects.map((obj, index) => (
            <TimelineTrack
              key={obj.id}
              object={obj}
              keyframes={keyframes[obj.id] || []}
              isDragged={draggedId === obj.id}
              isDragOver={dragOverId === obj.id}
              dragOverPosition={dragOverPosition}
              onDragStart={() => handleDragStart(obj.id)}
              onDragOver={(e) => handleDragOver(e, obj.id)}
              onDrop={(e) => handleDrop(e, obj.id)}
              onDragEnd={handleDragEnd}
              trackIndex={index}
            />
          ))
        )}
      </Box>
    </Paper>
  );
};

export default Timeline;