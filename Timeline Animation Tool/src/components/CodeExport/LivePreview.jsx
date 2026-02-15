import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import gsap from 'gsap';
import { useCanvasObjects, useKeyframes, useDuration, useFabricCanvas } from '../../store/hooks';
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

    // Kill existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    
    // Always loop in live preview
    timelineRef.current = gsap.timeline({ repeat: -1 });

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

      // Skip children in first pass - they're rendered inside groups
      if (groupChildren.has(obj.id)) return;

      if (obj.type === 'group') {
        createAndAnimateGroup(obj, objKeyframes, containerRef.current, timelineRef.current);
      } else if (obj.type === 'path') {
        createAndAnimatePath(obj, objKeyframes, containerRef.current, timelineRef.current);
      } else {
        createAndAnimateRegular(obj, objKeyframes, containerRef.current, timelineRef.current);
      }
    });

    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [canvasObjects, keyframes, duration, fabricCanvas]);

  /**
   * FIXED: Create and animate a group element with proper child positioning.
   * 
   * Group div is positioned at the group's center (from keyframes).
   * It's 0x0 with overflow:visible, so transforms pivot at the center point.
   * Children are positioned relative to group center with proper offsets.
   */
  const createAndAnimateGroup = (obj, objKeyframes, container, timeline) => {
    const fabricGroup = fabricCanvas?.getObjects().find(o => o.id === obj.id);
    
    const groupEl = document.createElement('div');
    groupEl.id = obj.id;
    groupEl.style.position = 'absolute';
    groupEl.style.width = '0px';
    groupEl.style.height = '0px';
    groupEl.style.overflow = 'visible';
    // Transform-origin at (0,0) = the group's center point
    groupEl.style.transformOrigin = '0px 0px';
    container.appendChild(groupEl);

    // Create children from Fabric.js group data
    if (obj.children && fabricGroup && fabricGroup._objects) {
      fabricGroup._objects.forEach((fabricChild) => {
        const childId = fabricChild.id;
        const childObj = canvasObjects.find(o => o.id === childId);
        if (!childObj) return;

        createGroupChild(fabricChild, childObj, groupEl);
      });
    }

    // Animate the group
    if (objKeyframes.length >= 2) {
      const firstKf = objKeyframes[0];

      // Set initial state - group div left/top = group center position
      gsap.set(groupEl, {
        left: firstKf.properties.x + 'px',
        top: firstKf.properties.y + 'px',
        scaleX: firstKf.properties.scaleX,
        scaleY: firstKf.properties.scaleY,
        rotation: firstKf.properties.rotation,
        opacity: firstKf.properties.opacity,
      });

      // Animate between keyframes
      for (let i = 1; i < objKeyframes.length; i++) {
        const prevKf = objKeyframes[i - 1];
        const currKf = objKeyframes[i];
        const animDuration = currKf.time - prevKf.time;

        timeline.to(groupEl, {
          duration: animDuration,
          left: currKf.properties.x + 'px',
          top: currKf.properties.y + 'px',
          scaleX: currKf.properties.scaleX,
          scaleY: currKf.properties.scaleY,
          rotation: currKf.properties.rotation,
          opacity: currKf.properties.opacity,
          ease: currKf.easing || 'none',
        }, prevKf.time);
      }
    } else if (objKeyframes.length === 1) {
      const kf = objKeyframes[0];
      gsap.set(groupEl, {
        left: kf.properties.x + 'px',
        top: kf.properties.y + 'px',
        scaleX: kf.properties.scaleX,
        scaleY: kf.properties.scaleY,
        rotation: kf.properties.rotation,
        opacity: kf.properties.opacity,
      });
    }
  };

  /**
   * FIXED: Create a child element inside a group with proper coordinate handling.
   * 
   * For paths: Uses pathOffset to correctly map SVG coordinates to group-relative position.
   * For shapes: Applies center-origin offset so shapes are centered at their relative position.
   */
  const createGroupChild = (fabricChild, childObj, groupEl) => {
    // Get child's position relative to group center
    const relLeft = fabricChild.left || 0;
    const relTop = fabricChild.top || 0;
    const childScaleX = fabricChild.scaleX || 1;
    const childScaleY = fabricChild.scaleY || 1;
    const childAngle = fabricChild.angle || 0;

    if (fabricChild.type === 'path') {
      // FIXED: Path SVG coordinate handling
      // Path data is in the path's local coordinate space.
      // pathOffset is the center of the path's bounding box in those coords.
      // We need to shift the path so its center ends up at (relLeft, relTop) in the group.
      
      const pathString = fabricPathToSVGPath(fabricChild.path);
      const pathOffsetX = fabricChild.pathOffset?.x || 0;
      const pathOffsetY = fabricChild.pathOffset?.y || 0;
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.position = 'absolute';
      svg.style.left = '0';
      svg.style.top = '0';
      svg.style.overflow = 'visible';
      svg.style.pointerEvents = 'none';
      svg.setAttribute('width', '1');
      svg.setAttribute('height', '1');
      
      // Create a group element with transform to position the path correctly
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      // Translate so path center (pathOffset) maps to (relLeft, relTop)
      // Then apply child's own scale and rotation
      const tx = relLeft - pathOffsetX * childScaleX;
      const ty = relTop - pathOffsetY * childScaleY;
      
      g.setAttribute('transform', 
        `translate(${tx}, ${ty}) scale(${childScaleX}, ${childScaleY})`
      );
      
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', pathString);
      pathEl.setAttribute('stroke', fabricChild.stroke || '#000000');
      pathEl.setAttribute('stroke-width', fabricChild.strokeWidth || 3);
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke-linecap', 'round');
      pathEl.setAttribute('stroke-linejoin', 'round');
      
      g.appendChild(pathEl);
      svg.appendChild(g);
      groupEl.appendChild(svg);
      
    } else {
      // Solid shapes and text
      const el = document.createElement('div');
      el.id = fabricChild.id;
      el.style.position = 'absolute';
      el.style.transformOrigin = 'center center';

      let childWidth = 0;
      let childHeight = 0;

      if (fabricChild.type === 'rect' || fabricChild.type === 'rectangle') {
        childWidth = (fabricChild.width || 100) * childScaleX;
        childHeight = (fabricChild.height || 100) * childScaleY;
        el.style.width = childWidth + 'px';
        el.style.height = childHeight + 'px';
        el.style.backgroundColor = fabricChild.fill || '#3b82f6';
      } else if (fabricChild.type === 'circle') {
        const radius = fabricChild.radius || 50;
        childWidth = radius * 2 * childScaleX;
        childHeight = radius * 2 * childScaleY;
        el.style.width = childWidth + 'px';
        el.style.height = childHeight + 'px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = fabricChild.fill || '#ef4444';
      } else if (fabricChild.type === 'text') {
        el.textContent = fabricChild.text || 'Text';
        el.style.fontSize = ((fabricChild.fontSize || 24) * childScaleY) + 'px';
        el.style.color = fabricChild.fill || '#000000';
        el.style.whiteSpace = 'nowrap';
        // For text, we estimate width/height
        childWidth = (fabricChild.width || 50) * childScaleX;
        childHeight = (fabricChild.height || 24) * childScaleY;
      }

      // FIXED: Position child so its CENTER is at (relLeft, relTop) relative to group center.
      // CSS left/top positions the top-left corner, so offset by half the dimensions.
      el.style.left = (relLeft - childWidth / 2) + 'px';
      el.style.top = (relTop - childHeight / 2) + 'px';
      
      // Apply rotation (scale already applied via dimensions)
      if (childAngle) {
        el.style.transform = `rotate(${childAngle}deg)`;
      }

      groupEl.appendChild(el);
    }
  };

  /**
   * Create and animate a standalone path element
   */
  const createAndAnimatePath = (obj, objKeyframes, container, timeline) => {
    if (objKeyframes.length === 0) return;

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
    container.appendChild(el);

    // Animate
    if (objKeyframes.length >= 2) {
      const firstKf = objKeyframes[0];
      const baseX = firstKf.properties.x;
      const baseY = firstKf.properties.y;

      gsap.set(el, {
        x: 0,
        y: 0,
        scaleX: firstKf.properties.scaleX,
        scaleY: firstKf.properties.scaleY,
        rotation: firstKf.properties.rotation,
        opacity: firstKf.properties.opacity,
      });

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
    }
  };

  /**
   * Create and animate a regular element (rectangle, circle, text)
   */
  const createAndAnimateRegular = (obj, objKeyframes, container, timeline) => {
    if (objKeyframes.length === 0) return;

    const firstKf = objKeyframes[0];

    const el = document.createElement('div');
    el.id = obj.id;
    el.style.position = 'absolute';
    el.style.transformOrigin = 'center center';

    // For non-grouped elements, keyframe x/y is center position.
    // CSS left/top is top-left, so offset by half the element size.
    if (obj.type === 'rectangle') {
      el.style.width = '100px';
      el.style.height = '100px';
      el.style.backgroundColor = '#3b82f6';
      el.style.left = (firstKf.properties.x - 50) + 'px';
      el.style.top = (firstKf.properties.y - 50) + 'px';
    } else if (obj.type === 'circle') {
      el.style.width = '100px';
      el.style.height = '100px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = '#ef4444';
      el.style.left = (firstKf.properties.x - 50) + 'px';
      el.style.top = (firstKf.properties.y - 50) + 'px';
    } else if (obj.type === 'text') {
      const fabricObject = fabricCanvas?.getObjects().find(o => o.id === obj.id);
      const textContent = fabricObject?.text || obj.textContent || 'Text';
      el.textContent = textContent;
      el.style.fontSize = '24px';
      el.style.color = '#000000';
      el.style.whiteSpace = 'nowrap';
      el.style.left = (firstKf.properties.x - 50) + 'px';
      el.style.top = (firstKf.properties.y - 50) + 'px';
    }

    container.appendChild(el);

    // Animate
    if (objKeyframes.length >= 2) {
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

        timeline.to(el, {
          duration: animDuration,
          left: (currKf.properties.x - 50) + 'px',
          top: (currKf.properties.y - 50) + 'px',
          scaleX: currKf.properties.scaleX,
          scaleY: currKf.properties.scaleY,
          rotation: currKf.properties.rotation,
          opacity: currKf.properties.opacity,
          ease: currKf.easing || 'none',
        }, prevKf.time);
      }
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Live Preview (GSAP)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This preview always loops to help you review your animation • Loop: ENABLED ♾️
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