/**
 * Code Generator - Produces standalone HTML/CSS/JS animation
 * Supports: rectangles, circles, text, paths (with embedded fills), groups, canvas bg color
 */

import { normalizeKeyframeRotations } from './interpolation';

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 800;

const fabricPathToSVGPath = (pathArray) => {
  if (!pathArray || !Array.isArray(pathArray)) return '';
  let s = '';
  pathArray.forEach(seg => { if (Array.isArray(seg)) s += seg[0] + ' ' + seg.slice(1).join(' ') + ' '; });
  return s.trim();
};

export const generateAnimationCode = (canvasObjects, keyframes, duration, loopPlayback = false, fabricCanvas = null, canvasBgColor = '#f0f0f0') => {
  const html = generateHTML();
  const css = generateCSS(canvasObjects, keyframes, fabricCanvas, canvasBgColor);
  const javascript = generateJavaScript(canvasObjects, keyframes, duration, loopPlayback, fabricCanvas);
  return { html, css, javascript };
};

const generateHTML = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Animation</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="animation-container"></div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="animation.js"></script>
</body>
</html>`;
};

const getDefaultFillColor = (type) => {
  switch (type) { case 'rectangle': return '#3b82f6'; case 'circle': return '#ef4444'; case 'text': return '#000000'; default: return '#000000'; }
};

const generateCSS = (canvasObjects, keyframes, fabricCanvas, canvasBgColor) => {
  let css = `/* Generated Animation Styles */

body {
    margin: 0;
    padding: 0;
    overflow: hidden;
    font-family: Arial, sans-serif;
}

#animation-container {
    position: relative;
    width: ${CANVAS_WIDTH}px;
    height: ${CANVAS_HEIGHT}px;
    background-color: ${canvasBgColor};
    margin: 20px auto;
    border: 1px solid #ccc;
    overflow: hidden;
}

`;

  const groupChildren = new Set();
  canvasObjects.forEach(obj => { if (obj.type === 'group' && obj.children) obj.children.forEach(c => groupChildren.add(c)); });

  canvasObjects.forEach(obj => {
    if (groupChildren.has(obj.id)) return;
    const rawKfs = keyframes[obj.id] || [];
    if (rawKfs.length === 0) return;
    // Paths and groups create elements in JS, not CSS
    if (obj.type === 'path' || obj.type === 'group') return;

    const objKfs = normalizeKeyframeRotations(rawKfs);
    const firstKf = objKfs[0];
    const props = firstKf.properties;
    const anchorX = obj.anchorX ?? 0.5, anchorY = obj.anchorY ?? 0.5;
    const ew = 100, eh = 100;
    const fillColor = obj.fill || getDefaultFillColor(obj.type);

    css += `#${obj.id} {
    position: absolute;
    left: ${(props.x - anchorX * ew).toFixed(2)}px;
    top: ${(props.y - anchorY * eh).toFixed(2)}px;
    transform-origin: ${(anchorX * 100).toFixed(0)}% ${(anchorY * 100).toFixed(0)}%;
    opacity: ${props.opacity};
    z-index: ${props.zIndex ?? 0};
`;
    if (obj.type === 'rectangle') css += `    width: 100px;\n    height: 100px;\n    background-color: ${fillColor};\n`;
    else if (obj.type === 'circle') css += `    width: 100px;\n    height: 100px;\n    border-radius: 50%;\n    background-color: ${fillColor};\n`;
    else if (obj.type === 'text') css += `    font-size: 24px;\n    color: ${fillColor};\n    white-space: nowrap;\n`;
    css += `}\n\n`;
  });

  return css;
};

const generateJavaScript = (canvasObjects, keyframes, duration, loopPlayback, fabricCanvas) => {
  const repeatValue = loopPlayback ? -1 : 0;
  
  let js = `// Generated Animation Code

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('animation-container');
    
    const tl = gsap.timeline({ 
        repeat: ${repeatValue},
        defaults: { duration: 1, ease: "power1.inOut" }
    });
    
`;

  const groupChildren = new Set();
  canvasObjects.forEach(obj => { if (obj.type === 'group' && obj.children) obj.children.forEach(c => groupChildren.add(c)); });

  // Creation phase
  canvasObjects.forEach(obj => {
    const rawKfs = keyframes[obj.id] || [];
    if (rawKfs.length === 0) return;
    if (groupChildren.has(obj.id)) return;

    const objKfs = normalizeKeyframeRotations(rawKfs);
    const firstKf = objKfs[0];

    if (obj.type === 'group') js += generateGroupCreation(obj, firstKf, canvasObjects, fabricCanvas);
    else if (obj.type === 'path') js += generatePathCreation(obj, firstKf, fabricCanvas);
    else js += generateRegularCreation(obj, firstKf);
  });

  // Animation phase
  canvasObjects.forEach(obj => {
    const rawKfs = keyframes[obj.id] || [];
    if (rawKfs.length < 2) return;
    if (groupChildren.has(obj.id)) return;

    const objKfs = normalizeKeyframeRotations(rawKfs);
    js += `    // Animate ${obj.name}\n`;

    if (obj.type === 'path') js += generatePathAnimation(obj, objKfs);
    else if (obj.type === 'group') js += generateGroupAnimation(obj, objKfs);
    else js += generateRegularAnimation(obj, objKfs);
  });

  js += `    tl.play();
});
`;
  return js;
};

// ========== PATH CREATION (with embedded fills) ==========
const generatePathCreation = (obj, firstKf, fabricCanvas) => {
  const pathString = fabricPathToSVGPath(obj.pathData);
  const anchorX = obj.anchorX ?? 0.5, anchorY = obj.anchorY ?? 0.5;
  let ow = 0, oh = 0;
  if (fabricCanvas) {
    const fo = fabricCanvas.getObjects().find(o => o.id === obj.id);
    if (fo) { ow = fo.width || 0; oh = fo.height || 0; }
  }
  // SVG offset = negative of wrapper initial position so absolute path coords map to canvas correctly
  const svgOffsetX = firstKf.properties.x;
  const svgOffsetY = firstKf.properties.y;
  // Anchor offset from center for transform-origin (0,0 for default anchor)
  const anchorOffsetX = (anchorX - 0.5) * ow;
  const anchorOffsetY = (anchorY - 0.5) * oh;
  const zIndex = firstKf.properties.zIndex ?? 0;
  const wrapperId = obj.id;
  let js = `    // Create ${obj.name} (SVG Path with wrapper)
    const ${wrapperId} = document.createElement('div');
    ${wrapperId}.id = '${wrapperId}';
    ${wrapperId}.style.position = 'absolute';
    ${wrapperId}.style.left = '${firstKf.properties.x.toFixed(2)}px';
    ${wrapperId}.style.top = '${firstKf.properties.y.toFixed(2)}px';
    ${wrapperId}.style.width = '0px';
    ${wrapperId}.style.height = '0px';
    ${wrapperId}.style.overflow = 'visible';
    ${wrapperId}.style.transformOrigin = '${anchorOffsetX.toFixed(2)}px ${anchorOffsetY.toFixed(2)}px';
    ${wrapperId}.style.zIndex = '${zIndex}';
`;

  // Embedded fill images (rendered BEFORE svg so they appear behind strokes)
  if (obj.fills?.length > 0) {
    obj.fills.forEach((fill, idx) => {
      js += `    // Embedded fill #${idx + 1}
    var fillImg_${idx} = document.createElement('img');
    fillImg_${idx}.src = '${fill.dataURL}';
    fillImg_${idx}.style.position = 'absolute';
    fillImg_${idx}.style.left = '${fill.relLeft.toFixed(2)}px';
    fillImg_${idx}.style.top = '${fill.relTop.toFixed(2)}px';
    fillImg_${idx}.style.width = '${fill.width}px';
    fillImg_${idx}.style.height = '${fill.height}px';
    fillImg_${idx}.style.pointerEvents = 'none';
    fillImg_${idx}.style.imageRendering = 'pixelated';
    ${wrapperId}.appendChild(fillImg_${idx});
`;
    });
  }

  js += `    var svg_${wrapperId} = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg_${wrapperId}.style.position = 'absolute';
    svg_${wrapperId}.style.left = '0px';
    svg_${wrapperId}.style.top = '0px';
    svg_${wrapperId}.style.overflow = 'visible';
    svg_${wrapperId}.style.pointerEvents = 'none';
    svg_${wrapperId}.setAttribute('width', '1');
    svg_${wrapperId}.setAttribute('height', '1');
    var g_${wrapperId} = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g_${wrapperId}.setAttribute('transform', 'translate(${(-svgOffsetX).toFixed(2)}, ${(-svgOffsetY).toFixed(2)})');
    var path_${wrapperId} = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path_${wrapperId}.setAttribute('d', '${pathString}');
    path_${wrapperId}.setAttribute('stroke', '${obj.strokeColor || '#000000'}');
    path_${wrapperId}.setAttribute('stroke-width', '${obj.strokeWidth || 3}');
    path_${wrapperId}.setAttribute('fill', 'none');
    path_${wrapperId}.setAttribute('stroke-linecap', 'round');
    path_${wrapperId}.setAttribute('stroke-linejoin', 'round');
    g_${wrapperId}.appendChild(path_${wrapperId});
    svg_${wrapperId}.appendChild(g_${wrapperId});
    ${wrapperId}.appendChild(svg_${wrapperId});
    container.appendChild(${wrapperId});
    gsap.set(${wrapperId}, {
        scaleX: ${firstKf.properties.scaleX.toFixed(2)},
        scaleY: ${firstKf.properties.scaleY.toFixed(2)},
        rotation: ${firstKf.properties.rotation.toFixed(2)},
        opacity: ${firstKf.properties.opacity.toFixed(2)}
    });
    
`;
  return js;
};

// ========== GROUP CREATION ==========
const generateGroupCreation = (obj, firstKf, canvasObjects, fabricCanvas) => {
  const anchorX = obj.anchorX ?? 0.5, anchorY = obj.anchorY ?? 0.5;
  let pivotOffsetX = 0, pivotOffsetY = 0;
  if (fabricCanvas) {
    const fg = fabricCanvas.getObjects().find(o => o.id === obj.id);
    if (fg) {
      pivotOffsetX = (anchorX - 0.5) * (fg.width || 0) * (fg.scaleX || 1);
      pivotOffsetY = (anchorY - 0.5) * (fg.height || 0) * (fg.scaleY || 1);
    }
  }
  const zIndex = firstKf.properties.zIndex ?? 0;
  let js = `    // Create ${obj.name} (Group)
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.left = '${firstKf.properties.x.toFixed(2)}px';
    ${obj.id}.style.top = '${firstKf.properties.y.toFixed(2)}px';
    ${obj.id}.style.width = '0px';
    ${obj.id}.style.height = '0px';
    ${obj.id}.style.overflow = 'visible';
    ${obj.id}.style.transformOrigin = '${pivotOffsetX.toFixed(2)}px ${pivotOffsetY.toFixed(2)}px';
    ${obj.id}.style.zIndex = '${zIndex}';
    container.appendChild(${obj.id});
    gsap.set(${obj.id}, {
        scaleX: ${firstKf.properties.scaleX.toFixed(2)},
        scaleY: ${firstKf.properties.scaleY.toFixed(2)},
        rotation: ${firstKf.properties.rotation.toFixed(2)},
        opacity: ${firstKf.properties.opacity.toFixed(2)}
    });
    
`;
  if (obj.children && fabricCanvas) {
    const fg = fabricCanvas.getObjects().find(o => o.id === obj.id);
    if (fg && fg._objects) {
      fg._objects.forEach((fc) => {
        const childObj = canvasObjects.find(o => o.id === fc.id);
        if (!childObj) return;
        const relLeft = fc.left || 0, relTop = fc.top || 0;
        const sx = fc.scaleX || 1, sy = fc.scaleY || 1, angle = fc.angle || 0;
        if (fc.type === 'path') js += generatePathChildCreation(fc, childObj, obj.id, relLeft, relTop, sx, sy);
        else js += generateSolidChildCreation(fc, childObj, obj.id, relLeft, relTop, sx, sy, angle, canvasObjects);
      });
    }
  }
  return js;
};

const generatePathChildCreation = (fc, childObj, parentId, relLeft, relTop, scaleX, scaleY) => {
  const pathString = fabricPathToSVGPath(fc.path);
  const poX = fc.pathOffset?.x || 0, poY = fc.pathOffset?.y || 0;
  const tx = relLeft - poX * scaleX, ty = relTop - poY * scaleY;
  return `    // Create ${childObj.name} (path child)
    (function() {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute'; svg.style.left = '0'; svg.style.top = '0';
        svg.style.overflow = 'visible'; svg.style.pointerEvents = 'none';
        svg.setAttribute('width', '1'); svg.setAttribute('height', '1');
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', 'translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scaleX}, ${scaleY})');
        var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', '${pathString}');
        pathEl.setAttribute('stroke', '${fc.stroke || '#000000'}');
        pathEl.setAttribute('stroke-width', '${fc.strokeWidth || 3}');
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('stroke-linecap', 'round'); pathEl.setAttribute('stroke-linejoin', 'round');
        g.appendChild(pathEl); svg.appendChild(g); ${parentId}.appendChild(svg);
    })();
    
`;
};

const generateSolidChildCreation = (fc, childObj, parentId, relLeft, relTop, scaleX, scaleY, angle, canvasObjects) => {
  const objData = canvasObjects.find(o => o.id === fc.id);
  let js = `    // Create ${childObj.name} (child)
    const ${fc.id} = document.createElement('div');
    ${fc.id}.id = '${fc.id}';
    ${fc.id}.style.position = 'absolute';
    ${fc.id}.style.transformOrigin = 'center center';
`;
  let cw = 100, ch = 100;
  const fillColor = objData?.fill || fc.fill;
  if (fc.type === 'rect' || fc.type === 'rectangle') {
    cw = (fc.width || 100) * scaleX; ch = (fc.height || 100) * scaleY;
    js += `    ${fc.id}.style.width = '${cw.toFixed(2)}px';
    ${fc.id}.style.height = '${ch.toFixed(2)}px';
    ${fc.id}.style.backgroundColor = '${fillColor || '#3b82f6'}';
`;
  } else if (fc.type === 'circle') {
    const r = fc.radius || 50; cw = r * 2 * scaleX; ch = r * 2 * scaleY;
    js += `    ${fc.id}.style.width = '${cw.toFixed(2)}px';
    ${fc.id}.style.height = '${ch.toFixed(2)}px';
    ${fc.id}.style.borderRadius = '50%';
    ${fc.id}.style.backgroundColor = '${fillColor || '#ef4444'}';
`;
  } else if (fc.type === 'text') {
    cw = (fc.width || 50) * scaleX; ch = (fc.height || 24) * scaleY;
    js += `    ${fc.id}.textContent = '${(fc.text || 'Text').replace(/'/g, "\\'")}';
    ${fc.id}.style.fontSize = '${((fc.fontSize || 24) * scaleY).toFixed(2)}px';
    ${fc.id}.style.color = '${fillColor || '#000000'}';
    ${fc.id}.style.whiteSpace = 'nowrap';
`;
  }
  js += `    ${fc.id}.style.left = '${(relLeft - cw / 2).toFixed(2)}px';
    ${fc.id}.style.top = '${(relTop - ch / 2).toFixed(2)}px';
`;
  if (angle) js += `    ${fc.id}.style.transform = 'rotate(${angle}deg)';\n`;
  js += `    ${parentId}.appendChild(${fc.id});
    
`;
  return js;
};

// ========== REGULAR ELEMENT CREATION ==========
const generateRegularCreation = (obj, firstKf) => {
  const anchorX = obj.anchorX ?? 0.5, anchorY = obj.anchorY ?? 0.5;
  const ew = 100, eh = 100;
  const fillColor = obj.fill || getDefaultFillColor(obj.type);
  const zIndex = firstKf.properties.zIndex ?? 0;
  let js = `    // Create ${obj.name}
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.transformOrigin = '${(anchorX * 100).toFixed(0)}% ${(anchorY * 100).toFixed(0)}%';
    ${obj.id}.style.left = '${(firstKf.properties.x - anchorX * ew).toFixed(2)}px';
    ${obj.id}.style.top = '${(firstKf.properties.y - anchorY * eh).toFixed(2)}px';
    ${obj.id}.style.zIndex = '${zIndex}';
`;
  if (obj.type === 'rectangle') js += `    ${obj.id}.style.width = '100px';\n    ${obj.id}.style.height = '100px';\n    ${obj.id}.style.backgroundColor = '${fillColor}';\n`;
  else if (obj.type === 'circle') js += `    ${obj.id}.style.width = '100px';\n    ${obj.id}.style.height = '100px';\n    ${obj.id}.style.borderRadius = '50%';\n    ${obj.id}.style.backgroundColor = '${fillColor}';\n`;
  else if (obj.type === 'text') js += `    ${obj.id}.textContent = '${(obj.textContent || 'Text').replace(/'/g, "\\'")}';\n    ${obj.id}.style.fontSize = '24px';\n    ${obj.id}.style.color = '${fillColor}';\n    ${obj.id}.style.whiteSpace = 'nowrap';\n`;
  js += `    container.appendChild(${obj.id});
    gsap.set(${obj.id}, {
        scaleX: ${firstKf.properties.scaleX.toFixed(2)},
        scaleY: ${firstKf.properties.scaleY.toFixed(2)},
        rotation: ${firstKf.properties.rotation.toFixed(2)},
        opacity: ${firstKf.properties.opacity.toFixed(2)}
    });
    
`;
  return js;
};

// ========== ANIMATION GENERATORS ==========

const generatePathAnimation = (obj, objKfs) => {
  let js = '';
  for (let i = 1; i < objKfs.length; i++) {
    const prev = objKfs[i - 1], curr = objKfs[i];
    js += `    tl.to('#${obj.id}', {
        duration: ${(curr.time - prev.time).toFixed(2)},
        left: '${curr.properties.x.toFixed(2)}px',
        top: '${curr.properties.y.toFixed(2)}px',
        scaleX: ${curr.properties.scaleX.toFixed(2)},
        scaleY: ${curr.properties.scaleY.toFixed(2)},
        rotation: ${curr.properties.rotation.toFixed(2)},
        opacity: ${curr.properties.opacity.toFixed(2)},
        zIndex: ${curr.properties.zIndex ?? 0},
        ease: '${mapEasingToGSAP(curr.easing || 'linear')}'
    }, ${prev.time.toFixed(2)});
    
`;
  }
  return js;
};

const generateGroupAnimation = (obj, objKfs) => {
  let js = '';
  for (let i = 1; i < objKfs.length; i++) {
    const prev = objKfs[i - 1], curr = objKfs[i];
    js += `    tl.to('#${obj.id}', {
        duration: ${(curr.time - prev.time).toFixed(2)},
        left: '${curr.properties.x.toFixed(2)}px',
        top: '${curr.properties.y.toFixed(2)}px',
        scaleX: ${curr.properties.scaleX.toFixed(2)},
        scaleY: ${curr.properties.scaleY.toFixed(2)},
        rotation: ${curr.properties.rotation.toFixed(2)},
        opacity: ${curr.properties.opacity.toFixed(2)},
        zIndex: ${curr.properties.zIndex ?? 0},
        ease: '${mapEasingToGSAP(curr.easing || 'linear')}'
    }, ${prev.time.toFixed(2)});
    
`;
  }
  return js;
};

const generateRegularAnimation = (obj, objKfs) => {
  const anchorX = obj.anchorX ?? 0.5, anchorY = obj.anchorY ?? 0.5;
  const ew = 100, eh = 100;
  let js = '';
  for (let i = 1; i < objKfs.length; i++) {
    const prev = objKfs[i - 1], curr = objKfs[i];
    js += `    tl.to('#${obj.id}', {
        duration: ${(curr.time - prev.time).toFixed(2)},
        left: '${(curr.properties.x - anchorX * ew).toFixed(2)}px',
        top: '${(curr.properties.y - anchorY * eh).toFixed(2)}px',
        scaleX: ${curr.properties.scaleX.toFixed(2)},
        scaleY: ${curr.properties.scaleY.toFixed(2)},
        rotation: ${curr.properties.rotation.toFixed(2)},
        opacity: ${curr.properties.opacity.toFixed(2)},
        zIndex: ${curr.properties.zIndex ?? 0},
        ease: '${mapEasingToGSAP(curr.easing || 'linear')}'
    }, ${prev.time.toFixed(2)});
    
`;
  }
  return js;
};

// ========== HELPERS ==========

const mapEasingToGSAP = (easing) => {
  const map = {
    'linear': 'none', 'easeInQuad': 'power1.in', 'easeOutQuad': 'power1.out', 'easeInOutQuad': 'power1.inOut',
    'easeInCubic': 'power2.in', 'easeOutCubic': 'power2.out', 'easeInOutCubic': 'power2.inOut',
    'easeInQuart': 'power3.in', 'easeOutQuart': 'power3.out', 'easeInOutQuart': 'power3.inOut',
    'bounce': 'bounce.out', 'elastic': 'elastic.out',
  };
  return map[easing] || 'none';
};

export const downloadFile = (filename, content) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadAllFiles = (html, css, javascript) => {
  downloadFile('index.html', html);
  setTimeout(() => downloadFile('style.css', css), 100);
  setTimeout(() => downloadFile('animation.js', javascript), 200);
};

export const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); return true; }
  catch (err) { console.error('Failed to copy:', err); return false; }
};