import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import gsap from 'gsap';
import { useCanvasObjects, useKeyframes, useDuration, useFabricCanvas, useCanvasBgColor } from '../../store/hooks';
import { normalizeKeyframeRotations } from '../../utils/interpolation';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../Canvas/Canvas';

const fabricPathToSVGPath = (pathArray) => {
  if (!pathArray || !Array.isArray(pathArray)) return '';
  let s = '';
  pathArray.forEach(seg => { if (Array.isArray(seg)) s += seg[0] + ' ' + seg.slice(1).join(' ') + ' '; });
  return s.trim();
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
  const [canvasBgColor] = useCanvasBgColor();
  const containerRef = useRef(null);
  const timelineRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    if (timelineRef.current) timelineRef.current.kill();
    timelineRef.current = gsap.timeline({ repeat: -1 });

    const groupChildren = new Set();
    canvasObjects.forEach(obj => {
      if (obj.type === 'group' && obj.children) obj.children.forEach(childId => groupChildren.add(childId));
    });

    canvasObjects.forEach(obj => {
      const rawKfs = keyframes[obj.id] || [];
      if (rawKfs.length === 0) return;
      if (groupChildren.has(obj.id)) return;

      const objKfs = normalizeKeyframeRotations(rawKfs);

      if (obj.type === 'group') renderGroup(obj, objKfs);
      else if (obj.type === 'path') renderPath(obj, objKfs);
      else renderRegular(obj, objKfs);
    });

    return () => { if (timelineRef.current) timelineRef.current.kill(); };
  }, [canvasObjects, keyframes, duration, fabricCanvas, canvasBgColor]);

  // ===== GROUP =====
  const renderGroup = (obj, objKfs) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    const fabricGroup = fabricCanvas?.getObjects().find(o => o.id === obj.id);
    if (!fabricGroup) return;
    const firstKf = objKfs[0];
    const anchorX = obj.anchorX ?? 0.5, anchorY = obj.anchorY ?? 0.5;
    const groupEl = document.createElement('div');
    groupEl.id = obj.id;
    groupEl.style.position = 'absolute';
    groupEl.style.left = firstKf.properties.x + 'px';
    groupEl.style.top = firstKf.properties.y + 'px';
    groupEl.style.width = '0px'; groupEl.style.height = '0px';
    groupEl.style.overflow = 'visible';
    groupEl.style.zIndex = (firstKf.properties.zIndex ?? 0).toString();
    const gw = (fabricGroup.width || 0) * (fabricGroup.scaleX || 1);
    const gh = (fabricGroup.height || 0) * (fabricGroup.scaleY || 1);
    groupEl.style.transformOrigin = `${(anchorX - 0.5) * gw}px ${(anchorY - 0.5) * gh}px`;
    container.appendChild(groupEl);
    gsap.set(groupEl, { scaleX: firstKf.properties.scaleX, scaleY: firstKf.properties.scaleY,
      rotation: firstKf.properties.rotation, opacity: firstKf.properties.opacity });
    if (fabricGroup._objects) {
      fabricGroup._objects.forEach((fc) => {
        const childObj = canvasObjects.find(o => o.id === fc.id);
        if (!childObj) return;
        if (fc.type === 'path') renderPathChild(fc, fc.left || 0, fc.top || 0, fc.scaleX || 1, fc.scaleY || 1, groupEl);
        else renderSolidChild(fc, childObj, fc.left || 0, fc.top || 0, fc.scaleX || 1, fc.scaleY || 1, fc.angle || 0, groupEl);
      });
    }
    for (let i = 1; i < objKfs.length; i++) {
      const prev = objKfs[i - 1], curr = objKfs[i];
      timeline.to(groupEl, {
        duration: curr.time - prev.time, left: curr.properties.x + 'px', top: curr.properties.y + 'px',
        scaleX: curr.properties.scaleX, scaleY: curr.properties.scaleY,
        rotation: curr.properties.rotation, opacity: curr.properties.opacity,
        zIndex: curr.properties.zIndex ?? 0, ease: curr.easing || 'none',
      }, prev.time);
    }
  };

  const renderPathChild = (fc, relLeft, relTop, scaleX, scaleY, parentEl) => {
    const pathString = fabricPathToSVGPath(fc.path);
    if (!pathString) return;
    const poX = fc.pathOffset?.x || 0, poY = fc.pathOffset?.y || 0;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute'; svg.style.left = '0'; svg.style.top = '0';
    svg.style.overflow = 'visible'; svg.style.pointerEvents = 'none';
    svg.setAttribute('width', '1'); svg.setAttribute('height', '1');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${relLeft - poX * scaleX}, ${relTop - poY * scaleY}) scale(${scaleX}, ${scaleY})`);
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', pathString);
    pathEl.setAttribute('stroke', fc.stroke || '#000000');
    pathEl.setAttribute('stroke-width', fc.strokeWidth || 3);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke-linecap', 'round'); pathEl.setAttribute('stroke-linejoin', 'round');
    g.appendChild(pathEl); svg.appendChild(g); parentEl.appendChild(svg);
  };

  const renderSolidChild = (fc, childObj, relLeft, relTop, scaleX, scaleY, angle, parentEl) => {
    const el = document.createElement('div');
    el.id = fc.id; el.style.position = 'absolute'; el.style.transformOrigin = 'center center';
    let cw = 0, ch = 0;
    const fillColor = childObj.fill || fc.fill;
    if (fc.type === 'rect' || fc.type === 'rectangle') {
      cw = (fc.width || 100) * scaleX; ch = (fc.height || 100) * scaleY;
      el.style.width = cw + 'px'; el.style.height = ch + 'px'; el.style.backgroundColor = fillColor || '#3b82f6';
    } else if (fc.type === 'circle') {
      const r = fc.radius || 50; cw = r * 2 * scaleX; ch = r * 2 * scaleY;
      el.style.width = cw + 'px'; el.style.height = ch + 'px'; el.style.borderRadius = '50%'; el.style.backgroundColor = fillColor || '#ef4444';
    } else if (fc.type === 'text') {
      el.textContent = fc.text || 'Text'; el.style.fontSize = ((fc.fontSize || 24) * scaleY) + 'px';
      el.style.color = fillColor || '#000000'; el.style.whiteSpace = 'nowrap';
      cw = (fc.width || 50) * scaleX; ch = (fc.height || 24) * scaleY;
    }
    el.style.left = (relLeft - cw / 2) + 'px'; el.style.top = (relTop - ch / 2) + 'px';
    if (angle) el.style.transform = `rotate(${angle}deg)`;
    parentEl.appendChild(el);
  };

  // ===== STANDALONE PATH (with embedded fills) =====
  const renderPath = (obj, objKfs) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    if (objKfs.length === 0) return;
    const fo = fabricCanvas?.getObjects().find(o => o.id === obj.id);
    const anchorX = obj.anchorX ?? 0.5, anchorY = obj.anchorY ?? 0.5;
    const firstKf = objKfs[0];
    let ow = 0, oh = 0;
    if (fo) { ow = fo.width || 0; oh = fo.height || 0; }
    // SVG offset = negative of wrapper initial position (absolute path coords map to canvas)
    const svgOffsetX = firstKf.properties.x;
    const svgOffsetY = firstKf.properties.y;
    // Anchor offset from center for transform-origin
    const anchorOffsetX = (anchorX - 0.5) * ow;
    const anchorOffsetY = (anchorY - 0.5) * oh;
    const wrapper = document.createElement('div');
    wrapper.id = obj.id; wrapper.style.position = 'absolute';
    wrapper.style.left = firstKf.properties.x + 'px'; wrapper.style.top = firstKf.properties.y + 'px';
    wrapper.style.width = '0px'; wrapper.style.height = '0px'; wrapper.style.overflow = 'visible';
    wrapper.style.transformOrigin = anchorOffsetX + 'px ' + anchorOffsetY + 'px';
    wrapper.style.zIndex = (firstKf.properties.zIndex ?? 0).toString();

    // Render embedded fill images FIRST (behind strokes)
    if (obj.fills?.length > 0) {
      obj.fills.forEach(fill => {
        const img = document.createElement('img');
        img.src = fill.dataURL;
        img.style.position = 'absolute';
        img.style.left = fill.relLeft + 'px';
        img.style.top = fill.relTop + 'px';
        img.style.width = fill.width + 'px';
        img.style.height = fill.height + 'px';
        img.style.pointerEvents = 'none';
        img.style.imageRendering = 'pixelated';
        wrapper.appendChild(img);
      });
    }

    // SVG stroke path on top — use <g transform> so path coords are relative to wrapper
    // This ensures strokes move with the wrapper during GSAP animation
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute'; svg.style.left = '0px'; svg.style.top = '0px';
    svg.style.overflow = 'visible'; svg.style.pointerEvents = 'none';
    svg.setAttribute('width', '1'); svg.setAttribute('height', '1');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${-svgOffsetX}, ${-svgOffsetY})`);
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', fabricPathToSVGPath(obj.pathData));
    pathEl.setAttribute('stroke', obj.strokeColor || '#000000');
    pathEl.setAttribute('stroke-width', obj.strokeWidth || 3);
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke-linecap', 'round'); pathEl.setAttribute('stroke-linejoin', 'round');
    g.appendChild(pathEl); svg.appendChild(g); wrapper.appendChild(svg); container.appendChild(wrapper);
    gsap.set(wrapper, { scaleX: firstKf.properties.scaleX, scaleY: firstKf.properties.scaleY,
      rotation: firstKf.properties.rotation, opacity: firstKf.properties.opacity });
    for (let i = 1; i < objKfs.length; i++) {
      const prev = objKfs[i - 1], curr = objKfs[i];
      timeline.to(wrapper, {
        duration: curr.time - prev.time, left: curr.properties.x + 'px', top: curr.properties.y + 'px',
        scaleX: curr.properties.scaleX, scaleY: curr.properties.scaleY,
        rotation: curr.properties.rotation, opacity: curr.properties.opacity,
        zIndex: curr.properties.zIndex ?? 0, ease: curr.easing || 'none',
      }, prev.time);
    }
  };

  // ===== REGULAR (rect, circle, text) =====
  const renderRegular = (obj, objKfs) => {
    const container = containerRef.current;
    const timeline = timelineRef.current;
    if (objKfs.length === 0) return;
    const firstKf = objKfs[0];
    const anchorX = obj.anchorX ?? 0.5, anchorY = obj.anchorY ?? 0.5;
    const ew = 100, eh = 100;
    const fillColor = obj.fill || getDefaultFillColor(obj.type);
    const el = document.createElement('div');
    el.id = obj.id; el.style.position = 'absolute';
    el.style.transformOrigin = `${anchorX * 100}% ${anchorY * 100}%`;
    el.style.zIndex = (firstKf.properties.zIndex ?? 0).toString();
    if (obj.type === 'rectangle') { el.style.width = ew + 'px'; el.style.height = eh + 'px'; el.style.backgroundColor = fillColor; }
    else if (obj.type === 'circle') { el.style.width = ew + 'px'; el.style.height = eh + 'px'; el.style.borderRadius = '50%'; el.style.backgroundColor = fillColor; }
    else if (obj.type === 'text') {
      const fo = fabricCanvas?.getObjects().find(o => o.id === obj.id);
      el.textContent = fo?.text || obj.textContent || 'Text'; el.style.fontSize = '24px'; el.style.color = fillColor; el.style.whiteSpace = 'nowrap';
    }
    el.style.left = (firstKf.properties.x - anchorX * ew) + 'px';
    el.style.top = (firstKf.properties.y - anchorY * eh) + 'px';
    container.appendChild(el);
    gsap.set(el, { scaleX: firstKf.properties.scaleX, scaleY: firstKf.properties.scaleY,
      rotation: firstKf.properties.rotation, opacity: firstKf.properties.opacity });
    for (let i = 1; i < objKfs.length; i++) {
      const prev = objKfs[i - 1], curr = objKfs[i];
      timeline.to(el, {
        duration: curr.time - prev.time,
        left: (curr.properties.x - anchorX * ew) + 'px', top: (curr.properties.y - anchorY * eh) + 'px',
        scaleX: curr.properties.scaleX, scaleY: curr.properties.scaleY,
        rotation: curr.properties.rotation, opacity: curr.properties.opacity,
        zIndex: curr.properties.zIndex ?? 0, ease: curr.easing || 'none',
      }, prev.time);
    }
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Live Preview (GSAP)</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This preview always loops to help you review your animation • Loop: ENABLED ♾️
      </Typography>
      <Box ref={containerRef} sx={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`,
        bgcolor: canvasBgColor, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }} />
    </Paper>
  );
};

export default LivePreview;