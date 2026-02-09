import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import gsap from 'gsap';
import { useCanvasObjects, useKeyframes, useDuration, useFabricCanvas, useLoopPlayback } from '../../store/hooks';
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
 */
const getOffsets = (obj) => {
  if (obj.type === 'rectangle' || obj.type === 'circle') {
    return { x: -50, y: -50 };
  }
  return { x: 0, y: 0 };
};

const LivePreview = () => {
  const [canvasObjects] = useCanvasObjects();
  const [keyframes] = useKeyframes();
  const [duration] = useDuration();
  const [fabricCanvas] = useFabricCanvas();
  const [loopPlayback] = useLoopPlayback();
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = '';

    // Kill existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    
    // Create timeline with loop setting
    const repeatValue = loopPlayback ? -1 : 0;
    timelineRef.current = gsap.timeline({ repeat: repeatValue });

    // Identify group children
    const groupChildren = new Set();
    canvasObjects.forEach(obj => {
      if (obj.type === 'group' && obj.children) {
        obj.children.forEach(childId => groupChildren.add(childId));
      }
    });

    // Create elements
    canvasObjects.forEach(obj => {
      const objKeyframes = keyframes[obj.id] || [];
      if (objKeyframes.length === 0) return;

      // Skip children in first pass
      if (groupChildren.has(obj.id)) return;

      if (obj.type === 'group') {
        // Create group container
        const groupEl = document.createElement('div');
        groupEl.id = obj.id;
        groupEl.style.position = 'absolute';
        groupEl.style.transformOrigin = 'center center';
        containerRef.current.appendChild(groupEl);

        // Create children inside group
        if (obj.children) {
          obj.children.forEach(childId => {
            const childObj = canvasObjects.find(o => o.id === childId);
            if (!childObj) return;
            
            const childKeyframes = keyframes[childId] || [];
            if (childKeyframes.length === 0) return;

            const childEl = createChildElement(childObj, childKeyframes, fabricCanvas);
            if (childEl) {
              groupEl.appendChild(childEl);
            }
          });
        }

        // Animate the group
        animateElement(obj, objKeyframes, groupEl, { x: 0, y: 0 }, timelineRef.current);

      } else if (obj.type === 'path') {
        const pathEl = createPathElement(obj, objKeyframes);
        if (pathEl) {
          containerRef.current.appendChild(pathEl);
          animatePathElement(obj, objKeyframes, pathEl, timelineRef.current);
        }

      } else {
        const el = createRegularElement(obj, objKeyframes, fabricCanvas);
        if (el) {
          containerRef.current.appendChild(el);
          animateElement(obj, objKeyframes, el, getOffsets(obj), timelineRef.current);
        }
      }
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [canvasObjects, keyframes, duration, fabricCanvas, loopPlayback]);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Live Preview (GSAP)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This preview uses GSAP and matches the exported code exactly
        {loopPlayback ? ' • Loop: ENABLED ♾️' : ' • Loop: DISABLED ▶️'}
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

/**
 * Create a child element for a group
 */
const createChildElement = (childObj, childKeyframes, fabricCanvas) => {
  if (childKeyframes.length === 0) return null;

  const firstKf = childKeyframes[0];
  const offset = getOffsets(childObj);

  const el = document.createElement('div');
  el.id = childObj.id;
  el.style.position = 'absolute';
  el.style.transformOrigin = 'center center';
  el.style.left = (firstKf.properties.x + offset.x) + 'px';
  el.style.top = (firstKf.properties.y + offset.y) + 'px';

  if (childObj.type === 'rectangle') {
    el.style.width = '100px';
    el.style.height = '100px';
    el.style.backgroundColor = '#3b82f6';
  } else if (childObj.type === 'circle') {
    el.style.width = '100px';
    el.style.height = '100px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = '#ef4444';
  } else if (childObj.type === 'text') {
    const fabricObject = findFabricObjectById(fabricCanvas, childObj.id);
    const textContent = fabricObject?.text || childObj.textContent || 'Text';
    el.textContent = textContent;
    el.style.fontSize = '24px';
    el.style.color = '#000000';
    el.style.whiteSpace = 'nowrap';
  }

  return el;
};

/**
 * Create a path element
 */
const createPathElement = (obj, objKeyframes) => {
  if (objKeyframes.length === 0) return null;

  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
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
  return el;
};

/**
 * Create a regular element (rectangle, circle, text)
 */
const createRegularElement = (obj, objKeyframes, fabricCanvas) => {
  if (objKeyframes.length === 0) return null;

  const firstKf = objKeyframes[0];
  const offset = getOffsets(obj);

  const el = document.createElement('div');
  el.id = obj.id;
  el.style.position = 'absolute';
  el.style.transformOrigin = 'center center';
  el.style.left = (firstKf.properties.x + offset.x) + 'px';
  el.style.top = (firstKf.properties.y + offset.y) + 'px';

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

  return el;
};

/**
 * Animate a path element
 */
const animatePathElement = (obj, objKeyframes, el, timeline) => {
  if (objKeyframes.length < 2) return;

  const firstKf = objKeyframes[0];
  const baseX = firstKf.properties.x;
  const baseY = firstKf.properties.y;

  // Set initial state
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

    timeline.to(el, {
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
};

/**
 * Animate a regular element
 */
const animateElement = (obj, objKeyframes, el, offset, timeline) => {
  if (objKeyframes.length < 2) return;

  const firstKf = objKeyframes[0];

  // Set initial state
  gsap.set(el, {
    scaleX: firstKf.properties.scaleX,
    scaleY: firstKf.properties.scaleY,
    rotation: firstKf.properties.rotation,
    opacity: firstKf.properties.opacity,
  });

  // Animate
  for (let i = 1; i < objKeyframes.length; i++) {
    const prevKf = objKeyframes[i - 1];
    const currKf = objKeyframes[i];
    const animDuration = currKf.time - prevKf.time;

    timeline.to(el, {
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
};

export default LivePreview;