import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import gsap from 'gsap';
import { useCanvasObjects, useKeyframes, useDuration, useFabricCanvas } from '../../store/hooks';
import { findFabricObjectById } from '../../utils/fabricHelpers';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../Canvas/Canvas';

/**
 * Convert Fabric.js path array to SVG path string
 */
const fabricPathToSVGPath = (pathArray) => {
  if (!pathArray || !Array.isArray(pathArray)) return '';
  
  let pathString = '';
  
  pathArray.forEach(segment => {
    if (!Array.isArray(segment)) return;
    
    const command = segment[0];
    const coords = segment.slice(1);
    
    pathString += command + ' ';
    pathString += coords.join(' ') + ' ';
  });
  
  return pathString.trim();
};

const LivePreview = () => {
  const [canvasObjects] = useCanvasObjects();
  const [keyframes] = useKeyframes();
  const [duration] = useDuration();
  const [fabricCanvas] = useFabricCanvas();
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    // Create GSAP timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    timelineRef.current = gsap.timeline({ repeat: -1 });

    // Create and animate elements
    canvasObjects.forEach(obj => {
      const objKeyframes = keyframes[obj.id] || [];
      if (objKeyframes.length === 0) return;

      let el;

      if (obj.type === 'path') {
        // For paths, we need to get the bounding box from Fabric
        const fabricObject = findFabricObjectById(fabricCanvas, obj.id);
        const boundingBox = fabricObject ? {
          width: fabricObject.width * (fabricObject.scaleX || 1),
          height: fabricObject.height * (fabricObject.scaleY || 1)
        } : { width: 0, height: 0 };
        
        // Create a container div for the SVG to handle positioning properly
        const container = document.createElement('div');
        container.id = obj.id + '_container';
        container.style.position = 'absolute';
        container.style.transformOrigin = 'center center';
        container.style.width = boundingBox.width + 'px';
        container.style.height = boundingBox.height + 'px';
        
        // Create SVG element for paths - match container size
        el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        el.id = obj.id;
        el.style.position = 'absolute';
        el.style.left = '0';
        el.style.top = '0';
        el.style.overflow = 'visible';
        el.style.pointerEvents = 'none';
        el.setAttribute('width', boundingBox.width);
        el.setAttribute('height', boundingBox.height);
        el.setAttribute('viewBox', `0 0 ${boundingBox.width} ${boundingBox.height}`);
        
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathString = fabricPathToSVGPath(obj.pathData);
        pathElement.setAttribute('d', pathString);
        pathElement.setAttribute('stroke', obj.strokeColor || '#000000');
        pathElement.setAttribute('stroke-width', obj.strokeWidth || 3);
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke-linecap', 'round');
        pathElement.setAttribute('stroke-linejoin', 'round');
        
        el.appendChild(pathElement);
        container.appendChild(el);
        containerRef.current.appendChild(container);
        
        // Store bounding box for positioning
        container.dataset.width = boundingBox.width;
        container.dataset.height = boundingBox.height;
        
        // Use container for animation
        el = container;
      } else {
        el = document.createElement('div');
        el.id = obj.id;
        el.style.position = 'absolute';
        el.style.transformOrigin = 'center center';

        if (obj.type === 'rectangle') {
          el.style.width = '100px';
          el.style.height = '100px';
          el.style.backgroundColor = '#3b82f6';
        } else if (obj.type === 'circle') {
          el.style.width = '100px';
          el.style.height = '100px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = '#ef4444';
        } else if (obj.type === 'text') {
          const fabricObject = findFabricObjectById(fabricCanvas, obj.id);
          const textContent = fabricObject?.text || obj.textContent || 'Text';
          
          el.textContent = textContent;
          el.style.fontSize = '24px';
          el.style.color = '#000000';
          el.style.whiteSpace = 'nowrap';
        }
        
        containerRef.current.appendChild(el);
      }

      // Set initial position
      const firstKf = objKeyframes[0];
      
      // Calculate offset for center-based positioning
      let leftOffset = 0;
      let topOffset = 0;
      
      if (obj.type === 'path') {
        // For paths, offset by half the bounding box size
        const width = parseFloat(el.dataset.width) || 0;
        const height = parseFloat(el.dataset.height) || 0;
        leftOffset = -width / 2;
        topOffset = -height / 2;
      } else if (obj.type === 'rectangle' || obj.type === 'circle') {
        // For shapes, offset by half their size
        leftOffset = -50; // half of 100px
        topOffset = -50;
      } else if (obj.type === 'text') {
        // For text, we'll use transform to center it
        leftOffset = 0;
        topOffset = 0;
      }
      
      // Set the actual CSS position (Fabric's left/top is center point)
      el.style.left = (firstKf.properties.x + leftOffset) + 'px';
      el.style.top = (firstKf.properties.y + topOffset) + 'px';
      
      // Then set scale, rotation, opacity with GSAP
      gsap.set(el, {
        scaleX: firstKf.properties.scaleX,
        scaleY: firstKf.properties.scaleY,
        rotation: firstKf.properties.rotation,
        opacity: firstKf.properties.opacity,
      });

      // Add animations
      for (let i = 1; i < objKeyframes.length; i++) {
        const prevKf = objKeyframes[i - 1];
        const currKf = objKeyframes[i];
        const animDuration = currKf.time - prevKf.time;

        // Calculate offset for each keyframe
        let leftOffset = 0;
        let topOffset = 0;
        
        if (obj.type === 'path') {
          const width = parseFloat(el.dataset.width) || 0;
          const height = parseFloat(el.dataset.height) || 0;
          leftOffset = -width / 2;
          topOffset = -height / 2;
        } else if (obj.type === 'rectangle' || obj.type === 'circle') {
          leftOffset = -50;
          topOffset = -50;
        } else if (obj.type === 'text') {
          leftOffset = 0;
          topOffset = 0;
        }

        timelineRef.current.to(el, {
          duration: animDuration,
          left: (currKf.properties.x + leftOffset) + 'px',
          top: (currKf.properties.y + topOffset) + 'px',
          scaleX: currKf.properties.scaleX,
          scaleY: currKf.properties.scaleY,
          rotation: currKf.properties.rotation,
          opacity: currKf.properties.opacity,
          ease: currKf.easing || 'none',
        }, prevKf.time);
      }
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [canvasObjects, keyframes, duration, fabricCanvas]);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Live Preview (GSAP)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This preview uses GSAP and matches the exported code exactly
      </Typography>
      <Box
        ref={containerRef}
        sx={{
          position: 'relative',
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          bgcolor: '#f0f0f0',
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
        }}
      />
    </Paper>
  );
};

export default LivePreview;