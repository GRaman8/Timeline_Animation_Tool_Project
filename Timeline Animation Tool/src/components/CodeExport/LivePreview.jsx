import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import gsap from 'gsap';
import { useCanvasObjects, useKeyframes, useDuration, useFabricCanvas } from '../../store/hooks';
import { findFabricObjectById } from '../../utils/fabricHelpers';

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

      // UPDATED: Handle different element types including paths
      if (obj.type === 'path') {
        // Create SVG element for paths
        el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        el.id = obj.id;
        el.style.position = 'absolute';
        el.style.overflow = 'visible';
        el.style.pointerEvents = 'none';
        el.setAttribute('width', '1600');
        el.setAttribute('height', '800');
        
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathString = fabricPathToSVGPath(obj.pathData);
        pathElement.setAttribute('d', pathString);
        pathElement.setAttribute('stroke', obj.strokeColor || '#000000');
        pathElement.setAttribute('stroke-width', obj.strokeWidth || 3);
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke-linecap', 'round');
        pathElement.setAttribute('stroke-linejoin', 'round');
        
        el.appendChild(pathElement);
      } else {
        // Create regular div element
        el = document.createElement('div');
        el.id = obj.id;
        el.style.position = 'absolute';

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
      }

      containerRef.current.appendChild(el);

      // Set initial position
      const firstKf = objKeyframes[0];

      gsap.set(el, {
        x: firstKf.properties.x,
        y: firstKf.properties.y,
        scaleX: firstKf.properties.scaleX,
        scaleY: firstKf.properties.scaleY,
        rotation: firstKf.properties.rotation,
        opacity: firstKf.properties.opacity,
        transformOrigin: '50% 50%', // ADD THIS - ensures rotation/scale from center
      });

      // Add animations
      for (let i = 1; i < objKeyframes.length; i++) {
        const prevKf = objKeyframes[i - 1];
        const currKf = objKeyframes[i];
        const animDuration = currKf.time - prevKf.time;

        timelineRef.current.to(el, {
          duration: animDuration,
          x: currKf.properties.x,
          y: currKf.properties.y,
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
          width: '1600px',
          height: '800px',
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