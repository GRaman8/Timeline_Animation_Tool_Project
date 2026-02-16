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
    pathString += segment[0] + ' ' + segment.slice(1).join(' ') + ' ';
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
    containerRef.current.innerHTML = '';

    if (timelineRef.current) {
      timelineRef.current.kill();
    }
    
    timelineRef.current = gsap.timeline({ repeat: -1 });

    // Identify group children (skip them at top level)
    const groupChildren = new Set();
    canvasObjects.forEach(obj => {
      if (obj.type === 'group' && obj.children) {
        obj.children.forEach(childId => groupChildren.add(childId));
      }
    });

    canvasObjects.forEach(obj => {
      const objKeyframes = keyframes[obj.id] || [];
      if (objKeyframes.length === 0) return;
      if (groupChildren.has(obj.id)) return;

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
   * Group div at center (x,y) with 0x0 size. transformOrigin at anchor offset.
   */
  const renderGroup = (obj, objKeyframes) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    const fabricGroup = fabricCanvas?.getObjects().find(o => o.id === obj.id);
    if (!fabricGroup) return;
    
    const firstKf = objKeyframes[0];

    // Anchor point
    const anchorX = obj.anchorX ?? 0.5;
    const anchorY = obj.anchorY ?? 0.5;

    // Create group container div at center position
    const groupEl = document.createElement('div');
    groupEl.id = obj.id;
    groupEl.style.position = 'absolute';
    groupEl.style.left = firstKf.properties.x + 'px';
    groupEl.style.top = firstKf.properties.y + 'px';
    groupEl.style.width = '0px';
    groupEl.style.height = '0px';
    groupEl.style.overflow = 'visible';
    
    // Transform origin: for groups, 0px 0px = center of group.
    // Anchor offset = (anchor - 0.5) * groupSize
    const groupWidth = (fabricGroup.width || 0) * (fabricGroup.scaleX || 1);
    const groupHeight = (fabricGroup.height || 0) * (fabricGroup.scaleY || 1);
    const pivotOffsetX = (anchorX - 0.5) * groupWidth;
    const pivotOffsetY = (anchorY - 0.5) * groupHeight;
    groupEl.style.transformOrigin = `${pivotOffsetX}px ${pivotOffsetY}px`;
    
    container.appendChild(groupEl);

    // Set initial transform state
    gsap.set(groupEl, {
      scaleX: firstKf.properties.scaleX,
      scaleY: firstKf.properties.scaleY,
      rotation: firstKf.properties.rotation,
      opacity: firstKf.properties.opacity,
    });

    // Create children from Fabric group data
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

    // Animate group
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
   * Render a solid shape child (rect, circle, text) inside a group.
   */
  const renderSolidChild = (fabricChild, childObj, relLeft, relTop, scaleX, scaleY, angle, parentEl) => {
    const el = document.createElement('div');
    el.id = fabricChild.id;
    el.style.position = 'absolute';
    el.style.transformOrigin = 'center center';

    let childWidth = 0;
    let childHeight = 0;

    if (fabricChild.type === 'rect' || fabricChild.type === 'rectangle') {
      childWidth = (fabricChild.width || 100) * scaleX;
      childHeight = (fabricChild.height || 100) * scaleY;
      el.style.width = childWidth + 'px';
      el.style.height = childHeight + 'px';
      el.style.backgroundColor = fabricChild.fill || '#3b82f6';
    } else if (fabricChild.type === 'circle') {
      const radius = fabricChild.radius || 50;
      childWidth = radius * 2 * scaleX;
      childHeight = radius * 2 * scaleY;
      el.style.width = childWidth + 'px';
      el.style.height = childHeight + 'px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = fabricChild.fill || '#ef4444';
    } else if (fabricChild.type === 'text') {
      el.textContent = fabricChild.text || 'Text';
      el.style.fontSize = ((fabricChild.fontSize || 24) * scaleY) + 'px';
      el.style.color = fabricChild.fill || '#000000';
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
   * Render a standalone path (not in a group).
   * 
   * ANCHOR FIX: Calculate transform-origin in pixel coordinates.
   * The SVG spans the full canvas (0,0 to CANVAS_WIDTH,CANVAS_HEIGHT).
   * The path's visual center is at pathOffset. The anchor point is
   * offset from the center by (anchor - 0.5) * objectSize.
   * 
   * This makes GSAP rotate the entire SVG around the anchor point
   * instead of the default center of the SVG element.
   */
  const renderPath = (obj, objKeyframes) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    if (objKeyframes.length === 0) return;

    // Get Fabric object for geometry data
    const fabricObject = fabricCanvas?.getObjects().find(o => o.id === obj.id);
    
    // Anchor values (0-1 range, relative to object bounding box)
    const anchorX = obj.anchorX ?? 0.5;
    const anchorY = obj.anchorY ?? 0.5;

    const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    el.id = obj.id;
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.overflow = 'visible';
    el.style.pointerEvents = 'none';
    el.setAttribute('width', CANVAS_WIDTH);
    el.setAttribute('height', CANVAS_HEIGHT);

    // Calculate transform-origin at the anchor point position
    // pathOffset = center of the path data in SVG coordinates
    // Object bounding box: width × height around the pathOffset
    if (fabricObject) {
      const pathOffsetX = fabricObject.pathOffset?.x || 0;
      const pathOffsetY = fabricObject.pathOffset?.y || 0;
      const objWidth = fabricObject.width || 0;
      const objHeight = fabricObject.height || 0;
      
      // Pivot point in SVG pixel coordinates
      // anchor 0 = left edge = pathOffset - width/2
      // anchor 0.5 = center = pathOffset
      // anchor 1 = right edge = pathOffset + width/2
      const pivotX = pathOffsetX + (anchorX - 0.5) * objWidth;
      const pivotY = pathOffsetY + (anchorY - 0.5) * objHeight;
      
      el.style.transformOrigin = `${pivotX}px ${pivotY}px`;
    }

    const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathElement.setAttribute('d', fabricPathToSVGPath(obj.pathData));
    pathElement.setAttribute('stroke', obj.strokeColor || '#000000');
    pathElement.setAttribute('stroke-width', obj.strokeWidth || 3);
    pathElement.setAttribute('fill', 'none');
    pathElement.setAttribute('stroke-linecap', 'round');
    pathElement.setAttribute('stroke-linejoin', 'round');

    el.appendChild(pathElement);
    container.appendChild(el);

    if (objKeyframes.length >= 2) {
      const firstKf = objKeyframes[0];
      const baseX = firstKf.properties.x;
      const baseY = firstKf.properties.y;

      gsap.set(el, {
        x: 0, y: 0,
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
   * Render a regular element (rectangle, circle, text).
   * Anchor support via CSS transform-origin percentage.
   */
  const renderRegular = (obj, objKeyframes) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    if (objKeyframes.length === 0) return;

    const firstKf = objKeyframes[0];
    
    const anchorX = obj.anchorX ?? 0.5;
    const anchorY = obj.anchorY ?? 0.5;

    const el = document.createElement('div');
    el.id = obj.id;
    el.style.position = 'absolute';
    el.style.transformOrigin = `${anchorX * 100}% ${anchorY * 100}%`;

    const halfW = 50, halfH = 50;

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
      const fabricObject = fabricCanvas?.getObjects().find(o => o.id === obj.id);
      el.textContent = fabricObject?.text || obj.textContent || 'Text';
      el.style.fontSize = '24px';
      el.style.color = '#000000';
      el.style.whiteSpace = 'nowrap';
    }

    el.style.left = (firstKf.properties.x - halfW) + 'px';
    el.style.top = (firstKf.properties.y - halfH) + 'px';
    
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
        left: (currKf.properties.x - halfW) + 'px',
        top: (currKf.properties.y - halfH) + 'px',
        scaleX: currKf.properties.scaleX,
        scaleY: currKf.properties.scaleY,
        rotation: currKf.properties.rotation,
        opacity: currKf.properties.opacity,
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