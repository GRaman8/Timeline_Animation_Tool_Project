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

/**
 * Get element size for offset calculation.
 * Fabric.js positions objects by their CENTER point.
 * CSS positions elements by their TOP-LEFT corner.
 * So we subtract half the width/height to convert.
 */
const getOffsets = (obj, fabricCanvas) => {
  if (obj.type === 'rectangle' || obj.type === 'circle') {
    return { x: -50, y: -50 }; // half of 100x100
  }
  // Paths and text: no offset needed (see path explanation below)
  return { x: 0, y: 0 };
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

    containerRef.current.innerHTML = '';

    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    timelineRef.current = gsap.timeline({ repeat: -1 });

    canvasObjects.forEach(obj => {
      const objKeyframes = keyframes[obj.id] || [];
      if (objKeyframes.length === 0) return;

      let el;
      let offset = getOffsets(obj, fabricCanvas);

      if (obj.type === 'path') {
        

        // Get the initial left/top from the first keyframe as our baseline
        const firstKf = objKeyframes[0];
        const baseX = firstKf.properties.x;
        const baseY = firstKf.properties.y;

        el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        el.id = obj.id;
        el.style.position = 'absolute';
        el.style.left = '0';
        el.style.top = '0';
        el.style.overflow = 'visible';
        el.style.pointerEvents = 'none';
        el.setAttribute('width', CANVAS_WIDTH);
        el.setAttribute('height', CANVAS_HEIGHT);

        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const pathString = fabricPathToSVGPath(obj.pathData);
        pathElement.setAttribute('d', pathString);
        pathElement.setAttribute('stroke', obj.strokeColor || '#000000');
        pathElement.setAttribute('stroke-width', obj.strokeWidth || 3);
        pathElement.setAttribute('fill', 'none');
        pathElement.setAttribute('stroke-linecap', 'round');
        pathElement.setAttribute('stroke-linejoin', 'round');

        el.appendChild(pathElement);
        containerRef.current.appendChild(el);

        // Set initial state: no translation (path is already where it was drawn)
        gsap.set(el, {
          x: 0,
          y: 0,
          scaleX: firstKf.properties.scaleX,
          scaleY: firstKf.properties.scaleY,
          rotation: firstKf.properties.rotation,
          opacity: firstKf.properties.opacity,
        });

        // Animate using DELTA from baseline
        for (let i = 1; i < objKeyframes.length; i++) {
          const prevKf = objKeyframes[i - 1];
          const currKf = objKeyframes[i];
          const animDuration = currKf.time - prevKf.time;

          timelineRef.current.to(el, {
            duration: animDuration,
            x: currKf.properties.x - baseX,
            y: currKf.properties.y - baseY,
            scaleX: currKf.properties.scaleX,
            scaleY: currKf.properties.scaleY,
            rotation: currKf.properties.rotation,
            opacity: currKf.properties.opacity,
            ease: currKf.easing || 'none',
          }, prevKf.time);
        }

        // Skip the shared animation logic below
        return;

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

      // --- Shared positioning logic for non-path elements ---
      const firstKf = objKeyframes[0];

      el.style.left = (firstKf.properties.x + offset.x) + 'px';
      el.style.top = (firstKf.properties.y + offset.y) + 'px';

      gsap.set(el, {
        scaleX: firstKf.properties.scaleX,
        scaleY: firstKf.properties.scaleY,
        rotation: firstKf.properties.rotation,
        opacity: firstKf.properties.opacity,
      });

      for (let i = 1; i < objKeyframes.length; i++) {
        const prevKf = objKeyframes[i - 1];
        const currKf = objKeyframes[i];
        const animDuration = currKf.time - prevKf.time;

        timelineRef.current.to(el, {
          duration: animDuration,
          left: (currKf.properties.x + offset.x) + 'px',
          top: (currKf.properties.y + offset.y) + 'px',
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