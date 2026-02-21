import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import gsap from 'gsap';
import { useCanvasObjects, useKeyframes, useDuration, useFabricCanvas } from '../../store/hooks';
import { normalizeKeyframeRotations } from '../../utils/interpolation';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../Canvas/Canvas';

/**
 * Convert Fabric.js path array to SVG path string
 */
const fabricPathToSVGPath = (pathArray) => {
  if (!pathArray || !Array.isArray(pathArray)) return '';
  let pathString = '';
  pathArray.forEach(segment => {
    if (!Array.isArray(segment)) return;
    pathString += segment[0] + ' ' + segment.slice(1).join(' ') + ' ';
  });
  return pathString.trim();
};

const getDefaultFillColor = (type) => {
  switch (type) {
    case 'rectangle': return '#3b82f6';
    case 'circle': return '#ef4444';
    case 'text': return '#000000';
    default: return '#000000';
  }
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

    const groupChildren = new Set();
    canvasObjects.forEach(obj => {
      if (obj.type === 'group' && obj.children) {
        obj.children.forEach(childId => groupChildren.add(childId));
      }
    });

    canvasObjects.forEach(obj => {
      const rawKeyframes = keyframes[obj.id] || [];
      if (rawKeyframes.length === 0) return;
      if (groupChildren.has(obj.id)) return;

      const objKeyframes = normalizeKeyframeRotations(rawKeyframes);

      if (obj.type === 'group') {
        renderGroup(obj, objKeyframes);
      } else if (obj.type === 'path') {
        renderPath(obj, objKeyframes);
      } else {
        renderRegular(obj, objKeyframes);
      }
    });

    return () => {
      if (timelineRef.current) timelineRef.current.kill();
    };
  }, [canvasObjects, keyframes, duration, fabricCanvas]);

  /**
   * Render a group.
   */
  const renderGroup = (obj, objKeyframes) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    const fabricGroup = fabricCanvas?.getObjects().find(o => o.id === obj.id);
    if (!fabricGroup) return;
    
    const firstKf = objKeyframes[0];
    const anchorX = obj.anchorX ?? 0.5;
    const anchorY = obj.anchorY ?? 0.5;

    const groupEl = document.createElement('div');
    groupEl.id = obj.id;
    groupEl.style.position = 'absolute';
    groupEl.style.left = firstKf.properties.x + 'px';
    groupEl.style.top = firstKf.properties.y + 'px';
    groupEl.style.width = '0px';
    groupEl.style.height = '0px';
    groupEl.style.overflow = 'visible';
    groupEl.style.zIndex = (firstKf.properties.zIndex ?? 0).toString();
    
    const groupWidth = (fabricGroup.width || 0) * (fabricGroup.scaleX || 1);
    const groupHeight = (fabricGroup.height || 0) * (fabricGroup.scaleY || 1);
    const pivotOffsetX = (anchorX - 0.5) * groupWidth;
    const pivotOffsetY = (anchorY - 0.5) * groupHeight;
    groupEl.style.transformOrigin = `${pivotOffsetX}px ${pivotOffsetY}px`;
    
    container.appendChild(groupEl);

    gsap.set(groupEl, {
      scaleX: firstKf.properties.scaleX,
      scaleY: firstKf.properties.scaleY,
      rotation: firstKf.properties.rotation,
      opacity: firstKf.properties.opacity,
    });

    if (fabricGroup._objects) {
      fabricGroup._objects.forEach((fabricChild) => {
        const childObj = canvasObjects.find(o => o.id === fabricChild.id);
        if (!childObj) return;
        
        const relLeft = fabricChild.left || 0;
        const relTop = fabricChild.top || 0;
        const childScaleX = fabricChild.scaleX || 1;
        const childScaleY = fabricChild.scaleY || 1;
        const childAngle = fabricChild.angle || 0;

        if (fabricChild.type === 'path') {
          renderPathChild(fabricChild, relLeft, relTop, childScaleX, childScaleY, groupEl);
        } else {
          renderSolidChild(fabricChild, childObj, relLeft, relTop, childScaleX, childScaleY, childAngle, groupEl);
        }
      });
    }

    for (let i = 1; i < objKeyframes.length; i++) {
      const prevKf = objKeyframes[i - 1];
      const currKf = objKeyframes[i];
      timeline.to(groupEl, {
        duration: currKf.time - prevKf.time,
        left: currKf.properties.x + 'px',
        top: currKf.properties.y + 'px',
        scaleX: currKf.properties.scaleX,
        scaleY: currKf.properties.scaleY,
        rotation: currKf.properties.rotation,
        opacity: currKf.properties.opacity,
        zIndex: currKf.properties.zIndex ?? 0,
        ease: currKf.easing || 'none',
      }, prevKf.time);
    }
  };

  /**
   * Render a path child inside a group.
   */
  const renderPathChild = (fabricChild, relLeft, relTop, scaleX, scaleY, parentEl) => {
    const pathString = fabricPathToSVGPath(fabricChild.path);
    if (!pathString) return;
    
    const pathOffsetX = fabricChild.pathOffset?.x || 0;
    const pathOffsetY = fabricChild.pathOffset?.y || 0;
    
    const tx = relLeft - pathOffsetX * scaleX;
    const ty = relTop - pathOffsetY * scaleY;
    
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    svg.setAttribute('width', '1');
    svg.setAttribute('height', '1');
    
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${tx}, ${ty}) scale(${scaleX}, ${scaleY})`);
    
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathString);
    pathEl.setAttribute('stroke', fabricChild.stroke || '#000000');
    pathEl.setAttribute('stroke-width', fabricChild.strokeWidth || 3);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke-linecap', 'round');
    pathEl.setAttribute('stroke-linejoin', 'round');
    
    g.appendChild(pathEl);
    svg.appendChild(g);
    parentEl.appendChild(svg);
  };

  /**
   * Render a solid shape child inside a group.
   */
  const renderSolidChild = (fabricChild, childObj, relLeft, relTop, scaleX, scaleY, angle, parentEl) => {
    const el = document.createElement('div');
    el.id = fabricChild.id;
    el.style.position = 'absolute';
    el.style.transformOrigin = 'center center';

    let childWidth = 0;
    let childHeight = 0;
    const fillColor = childObj.fill || fabricChild.fill;

    if (fabricChild.type === 'rect' || fabricChild.type === 'rectangle') {
      childWidth = (fabricChild.width || 100) * scaleX;
      childHeight = (fabricChild.height || 100) * scaleY;
      el.style.width = childWidth + 'px';
      el.style.height = childHeight + 'px';
      el.style.backgroundColor = fillColor || '#3b82f6';
    } else if (fabricChild.type === 'circle') {
      const radius = fabricChild.radius || 50;
      childWidth = radius * 2 * scaleX;
      childHeight = radius * 2 * scaleY;
      el.style.width = childWidth + 'px';
      el.style.height = childHeight + 'px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = fillColor || '#ef4444';
    } else if (fabricChild.type === 'text') {
      el.textContent = fabricChild.text || 'Text';
      el.style.fontSize = ((fabricChild.fontSize || 24) * scaleY) + 'px';
      el.style.color = fillColor || '#000000';
      el.style.whiteSpace = 'nowrap';
      childWidth = (fabricChild.width || 50) * scaleX;
      childHeight = (fabricChild.height || 24) * scaleY;
    }

    el.style.left = (relLeft - childWidth / 2) + 'px';
    el.style.top = (relTop - childHeight / 2) + 'px';
    
    if (angle) {
      el.style.transform = `rotate(${angle}deg)`;
    }

    parentEl.appendChild(el);
  };

  /**
   * Render a standalone path using wrapper div approach.
   * 
   * CRITICAL FIX: Uses a wrapper div with left/top for positioning,
   * and the SVG is offset inside the wrapper so the pivot point is at (0,0).
   * Rotation is applied to the wrapper via GSAP (no CSS translate involved).
   * This decouples position from rotation completely.
   */
  const renderPath = (obj, objKeyframes) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    if (objKeyframes.length === 0) return;

    const fabricObject = fabricCanvas?.getObjects().find(o => o.id === obj.id);
    
    const anchorX = obj.anchorX ?? 0.5;
    const anchorY = obj.anchorY ?? 0.5;
    const firstKf = objKeyframes[0];

    // Get path geometry from fabric object
    let pathOffsetX = 0;
    let pathOffsetY = 0;
    let objWidth = 0;
    let objHeight = 0;
    
    if (fabricObject) {
      pathOffsetX = fabricObject.pathOffset?.x || 0;
      pathOffsetY = fabricObject.pathOffset?.y || 0;
      objWidth = fabricObject.width || 0;
      objHeight = fabricObject.height || 0;
    }

    // Pivot point in SVG coordinate space
    const pivotX = pathOffsetX + (anchorX - 0.5) * objWidth;
    const pivotY = pathOffsetY + (anchorY - 0.5) * objHeight;

    // Create wrapper div - positioned at the keyframe position
    const wrapper = document.createElement('div');
    wrapper.id = obj.id;
    wrapper.style.position = 'absolute';
    wrapper.style.left = firstKf.properties.x + 'px';
    wrapper.style.top = firstKf.properties.y + 'px';
    wrapper.style.width = '0px';
    wrapper.style.height = '0px';
    wrapper.style.overflow = 'visible';
    wrapper.style.transformOrigin = '0px 0px';
    wrapper.style.zIndex = (firstKf.properties.zIndex ?? 0).toString();

    // Create SVG inside wrapper, offset so pivot aligns with wrapper origin
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = (-pivotX) + 'px';
    svg.style.top = (-pivotY) + 'px';
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    svg.setAttribute('width', CANVAS_WIDTH);
    svg.setAttribute('height', CANVAS_HEIGHT);

    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', fabricPathToSVGPath(obj.pathData));
    pathElement.setAttribute('stroke', obj.strokeColor || '#000000');
    pathElement.setAttribute('stroke-width', obj.strokeWidth || 3);
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('stroke-linecap', 'round');
    pathElement.setAttribute('stroke-linejoin', 'round');

    svg.appendChild(pathElement);
    wrapper.appendChild(svg);
    container.appendChild(wrapper);

    // Set initial transform (rotation, scale, opacity only - no x/y translate!)
    gsap.set(wrapper, {
      scaleX: firstKf.properties.scaleX,
      scaleY: firstKf.properties.scaleY,
      rotation: firstKf.properties.rotation,
      opacity: firstKf.properties.opacity,
    });

    // Animate using left/top (not x/y)
    for (let i = 1; i < objKeyframes.length; i++) {
      const prevKf = objKeyframes[i - 1];
      const currKf = objKeyframes[i];
      timeline.to(wrapper, {
        duration: currKf.time - prevKf.time,
        left: currKf.properties.x + 'px',
        top: currKf.properties.y + 'px',
        scaleX: currKf.properties.scaleX,
        scaleY: currKf.properties.scaleY,
        rotation: currKf.properties.rotation,
        opacity: currKf.properties.opacity,
        zIndex: currKf.properties.zIndex ?? 0,
        ease: currKf.easing || 'none',
      }, prevKf.time);
    }
  };

  /**
   * Render a regular element (rectangle, circle, text).
   */
  const renderRegular = (obj, objKeyframes) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    if (objKeyframes.length === 0) return;

    const firstKf = objKeyframes[0];
    
    const anchorX = obj.anchorX ?? 0.5;
    const anchorY = obj.anchorY ?? 0.5;
    const elWidth = 100;
    const elHeight = 100;
    const fillColor = obj.fill || getDefaultFillColor(obj.type);

    const el = document.createElement('div');
    el.id = obj.id;
    el.style.position = 'absolute';
    el.style.transformOrigin = `${anchorX * 100}% ${anchorY * 100}%`;
    el.style.zIndex = (firstKf.properties.zIndex ?? 0).toString();

    if (obj.type === 'rectangle') {
      el.style.width = elWidth + 'px';
      el.style.height = elHeight + 'px';
      el.style.backgroundColor = fillColor;
    } else if (obj.type === 'circle') {
      el.style.width = elWidth + 'px';
      el.style.height = elHeight + 'px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = fillColor;
    } else if (obj.type === 'text') {
      const fabricObject = fabricCanvas?.getObjects().find(o => o.id === obj.id);
      el.textContent = fabricObject?.text || obj.textContent || 'Text';
      el.style.fontSize = '24px';
      el.style.color = fillColor;
      el.style.whiteSpace = 'nowrap';
    }

    el.style.left = (firstKf.properties.x - anchorX * elWidth) + 'px';
    el.style.top = (firstKf.properties.y - anchorY * elHeight) + 'px';
    
    container.appendChild(el);

    gsap.set(el, {
      scaleX: firstKf.properties.scaleX,
      scaleY: firstKf.properties.scaleY,
      rotation: firstKf.properties.rotation,
      opacity: firstKf.properties.opacity,
    });

    for (let i = 1; i < objKeyframes.length; i++) {
      const prevKf = objKeyframes[i - 1];
      const currKf = objKeyframes[i];
      timeline.to(el, {
        duration: currKf.time - prevKf.time,
        left: (currKf.properties.x - anchorX * elWidth) + 'px',
        top: (currKf.properties.y - anchorY * elHeight) + 'px',
        scaleX: currKf.properties.scaleX,
        scaleY: currKf.properties.scaleY,
        rotation: currKf.properties.rotation,
        opacity: currKf.properties.opacity,
        zIndex: currKf.properties.zIndex ?? 0,
        ease: currKf.easing || 'none',
      }, prevKf.time);
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