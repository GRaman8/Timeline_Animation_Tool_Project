/**
 * Code Generator - Produces standalone HTML/CSS/JS animation
 * 
 * CRITICAL FIX (v3): Path elements now use left/top for positioning instead
 * of GSAP x/y (CSS translate). This decouples position from rotation.
 * 
 * WHY THIS MATTERS:
 * GSAP x/y → CSS translate. CSS transform order: translate THEN rotate
 * around transform-origin. But the translation happens in the rotated
 * coordinate system, so the arm "orbits" the pivot instead of rotating
 * in place. Using left/top positions the element FIRST, then rotation
 * happens around transform-origin within the positioned element.
 * This is the same approach already used for groups.
 */

import { normalizeKeyframeRotations } from './interpolation';

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 800;

const fabricPathToSVGPath = (pathArray) => {
  if (!pathArray || !Array.isArray(pathArray)) return '';
  let pathString = '';
  pathArray.forEach(segment => {
    if (!Array.isArray(segment)) return;
    pathString += segment[0] + ' ' + segment.slice(1).join(' ') + ' ';
  });
  return pathString.trim();
};

export const generateAnimationCode = (canvasObjects, keyframes, duration, loopPlayback = false, fabricCanvas = null) => {
  const html = generateHTML();
  const css = generateCSS(canvasObjects, keyframes, fabricCanvas);
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
  switch (type) {
    case 'rectangle': return '#3b82f6';
    case 'circle': return '#ef4444';
    case 'text': return '#000000';
    default: return '#000000';
  }
};

const generateCSS = (canvasObjects, keyframes, fabricCanvas) => {
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
    background-color: #f0f0f0;
    margin: 20px auto;
    border: 1px solid #ccc;
    overflow: hidden;
}

`;

  const groupChildren = new Set();
  canvasObjects.forEach(obj => {
    if (obj.type === 'group' && obj.children) {
      obj.children.forEach(childId => groupChildren.add(childId));
    }
  });

  canvasObjects.forEach(obj => {
    if (groupChildren.has(obj.id)) return;
    const rawKeyframes = keyframes[obj.id] || [];
    if (rawKeyframes.length === 0) return;
    if (obj.type === 'path' || obj.type === 'group') return;

    const objKeyframes = normalizeKeyframeRotations(rawKeyframes);
    const firstKf = objKeyframes[0];
    const props = firstKf.properties;
    const anchorX = obj.anchorX ?? 0.5;
    const anchorY = obj.anchorY ?? 0.5;
    const elWidth = 100;
    const elHeight = 100;
    const fillColor = obj.fill || getDefaultFillColor(obj.type);

    css += `#${obj.id} {
    position: absolute;
    left: ${(props.x - anchorX * elWidth).toFixed(2)}px;
    top: ${(props.y - anchorY * elHeight).toFixed(2)}px;
    transform-origin: ${(anchorX * 100).toFixed(0)}% ${(anchorY * 100).toFixed(0)}%;
    opacity: ${props.opacity};
    z-index: ${props.zIndex ?? 0};
`;

    if (obj.type === 'rectangle') {
      css += `    width: 100px;\n    height: 100px;\n    background-color: ${fillColor};\n`;
    } else if (obj.type === 'circle') {
      css += `    width: 100px;\n    height: 100px;\n    border-radius: 50%;\n    background-color: ${fillColor};\n`;
    } else if (obj.type === 'text') {
      css += `    font-size: 24px;\n    color: ${fillColor};\n    white-space: nowrap;\n`;
    }
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
  canvasObjects.forEach(obj => {
    if (obj.type === 'group' && obj.children) {
      obj.children.forEach(childId => groupChildren.add(childId));
    }
  });

  // Creation phase
  canvasObjects.forEach(obj => {
    const rawKeyframes = keyframes[obj.id] || [];
    if (rawKeyframes.length === 0) return;
    if (groupChildren.has(obj.id)) return;

    const objKeyframes = normalizeKeyframeRotations(rawKeyframes);
    const firstKf = objKeyframes[0];

    if (obj.type === 'group') {
      js += generateGroupCreation(obj, firstKf, canvasObjects, fabricCanvas);
    } else if (obj.type === 'path') {
      js += generatePathCreation(obj, firstKf, fabricCanvas);
    } else {
      js += generateRegularCreation(obj, firstKf);
    }
  });

  // Animation phase
  canvasObjects.forEach(obj => {
    const rawKeyframes = keyframes[obj.id] || [];
    if (rawKeyframes.length < 2) return;
    if (groupChildren.has(obj.id)) return;

    const objKeyframes = normalizeKeyframeRotations(rawKeyframes);
    
    js += `    // Animate ${obj.name}\n`;

    if (obj.type === 'path') {
      js += generatePathAnimation(obj, objKeyframes, fabricCanvas);
    } else if (obj.type === 'group') {
      js += generateGroupAnimation(obj, objKeyframes);
    } else {
      js += generateRegularAnimation(obj, objKeyframes);
    }
  });

  js += `    tl.play();
});
`;

  return js;
};

// ========== GROUP CREATION ==========
const generateGroupCreation = (obj, firstKf, canvasObjects, fabricCanvas) => {
  const anchorX = obj.anchorX ?? 0.5;
  const anchorY = obj.anchorY ?? 0.5;
  
  let pivotOffsetX = 0;
  let pivotOffsetY = 0;
  if (fabricCanvas) {
    const fabricGroup = fabricCanvas.getObjects().find(o => o.id === obj.id);
    if (fabricGroup) {
      const groupWidth = (fabricGroup.width || 0) * (fabricGroup.scaleX || 1);
      const groupHeight = (fabricGroup.height || 0) * (fabricGroup.scaleY || 1);
      pivotOffsetX = (anchorX - 0.5) * groupWidth;
      pivotOffsetY = (anchorY - 0.5) * groupHeight;
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
    const fabricGroup = fabricCanvas.getObjects().find(o => o.id === obj.id);
    if (fabricGroup && fabricGroup._objects) {
      fabricGroup._objects.forEach((fabricChild) => {
        const childObj = canvasObjects.find(o => o.id === fabricChild.id);
        if (!childObj) return;
        
        const relLeft = fabricChild.left || 0;
        const relTop = fabricChild.top || 0;
        const childScaleX = fabricChild.scaleX || 1;
        const childScaleY = fabricChild.scaleY || 1;
        const childAngle = fabricChild.angle || 0;

        if (fabricChild.type === 'path') {
          js += generatePathChildCreation(fabricChild, childObj, obj.id, relLeft, relTop, childScaleX, childScaleY);
        } else {
          js += generateSolidChildCreation(fabricChild, childObj, obj.id, relLeft, relTop, childScaleX, childScaleY, childAngle, canvasObjects);
        }
      });
    }
  }

  return js;
};

// ========== PATH CHILD IN GROUP ==========
const generatePathChildCreation = (fabricChild, childObj, parentId, relLeft, relTop, scaleX, scaleY) => {
  const pathString = fabricPathToSVGPath(fabricChild.path);
  const pathOffsetX = fabricChild.pathOffset?.x || 0;
  const pathOffsetY = fabricChild.pathOffset?.y || 0;
  const tx = relLeft - pathOffsetX * scaleX;
  const ty = relTop - pathOffsetY * scaleY;

  return `    // Create ${childObj.name} (path child)
    (function() {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.left = '0';
        svg.style.top = '0';
        svg.style.overflow = 'visible';
        svg.style.pointerEvents = 'none';
        svg.setAttribute('width', '1');
        svg.setAttribute('height', '1');
        var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', 'translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scaleX}, ${scaleY})');
        var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', '${pathString}');
        pathEl.setAttribute('stroke', '${fabricChild.stroke || '#000000'}');
        pathEl.setAttribute('stroke-width', '${fabricChild.strokeWidth || 3}');
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('stroke-linecap', 'round');
        pathEl.setAttribute('stroke-linejoin', 'round');
        g.appendChild(pathEl);
        svg.appendChild(g);
        ${parentId}.appendChild(svg);
    })();
    
`;
};

// ========== SOLID CHILD IN GROUP ==========
const generateSolidChildCreation = (fabricChild, childObj, parentId, relLeft, relTop, scaleX, scaleY, angle, canvasObjects) => {
  const objData = canvasObjects.find(o => o.id === fabricChild.id);
  
  let js = `    // Create ${childObj.name} (child)
    const ${fabricChild.id} = document.createElement('div');
    ${fabricChild.id}.id = '${fabricChild.id}';
    ${fabricChild.id}.style.position = 'absolute';
    ${fabricChild.id}.style.transformOrigin = 'center center';
`;

  let childWidth = 100, childHeight = 100;
  const fillColor = objData?.fill || fabricChild.fill;

  if (fabricChild.type === 'rect' || fabricChild.type === 'rectangle') {
    childWidth = (fabricChild.width || 100) * scaleX;
    childHeight = (fabricChild.height || 100) * scaleY;
    js += `    ${fabricChild.id}.style.width = '${childWidth.toFixed(2)}px';
    ${fabricChild.id}.style.height = '${childHeight.toFixed(2)}px';
    ${fabricChild.id}.style.backgroundColor = '${fillColor || '#3b82f6'}';
`;
  } else if (fabricChild.type === 'circle') {
    const r = fabricChild.radius || 50;
    childWidth = r * 2 * scaleX;
    childHeight = r * 2 * scaleY;
    js += `    ${fabricChild.id}.style.width = '${childWidth.toFixed(2)}px';
    ${fabricChild.id}.style.height = '${childHeight.toFixed(2)}px';
    ${fabricChild.id}.style.borderRadius = '50%';
    ${fabricChild.id}.style.backgroundColor = '${fillColor || '#ef4444'}';
`;
  } else if (fabricChild.type === 'text') {
    childWidth = (fabricChild.width || 50) * scaleX;
    childHeight = (fabricChild.height || 24) * scaleY;
    js += `    ${fabricChild.id}.textContent = '${(fabricChild.text || 'Text').replace(/'/g, "\\'")}';
    ${fabricChild.id}.style.fontSize = '${((fabricChild.fontSize || 24) * scaleY).toFixed(2)}px';
    ${fabricChild.id}.style.color = '${fillColor || '#000000'}';
    ${fabricChild.id}.style.whiteSpace = 'nowrap';
`;
  }

  const cssLeft = relLeft - childWidth / 2;
  const cssTop = relTop - childHeight / 2;
  js += `    ${fabricChild.id}.style.left = '${cssLeft.toFixed(2)}px';
    ${fabricChild.id}.style.top = '${cssTop.toFixed(2)}px';
`;
  if (angle) {
    js += `    ${fabricChild.id}.style.transform = 'rotate(${angle}deg)';
`;
  }
  js += `    ${parentId}.appendChild(${fabricChild.id});
    
`;

  return js;
};

// ==========================================================================
// STANDALONE PATH CREATION - uses wrapper div with left/top positioning
// ==========================================================================
/**
 * KEY FIX: Path elements are now wrapped in a positioned div.
 * 
 * Structure:
 *   <div id="wrapper_xxx" style="position:absolute; left:Xpx; top:Ypx;">
 *     <svg style="position:absolute; left:-offsetX; top:-offsetY;">
 *       <path d="..."/>
 *     </svg>
 *   </div>
 * 
 * The wrapper div is positioned via left/top (CSS positioning).
 * The inner SVG is offset so the path's anchor point aligns with (0,0) of the wrapper.
 * Rotation is applied to the wrapper via GSAP, rotating around (0,0) = the anchor.
 * 
 * This completely decouples position (left/top) from rotation (transform: rotate).
 * No CSS translate is used, so rotation always pivots correctly.
 */
const generatePathCreation = (obj, firstKf, fabricCanvas) => {
  const pathString = fabricPathToSVGPath(obj.pathData);
  
  const anchorX = obj.anchorX ?? 0.5;
  const anchorY = obj.anchorY ?? 0.5;
  
  // Get pathOffset and dimensions from fabric object
  let pathOffsetX = 0;
  let pathOffsetY = 0;
  let objWidth = 0;
  let objHeight = 0;
  
  if (fabricCanvas) {
    const fabricObject = fabricCanvas.getObjects().find(o => o.id === obj.id);
    if (fabricObject) {
      pathOffsetX = fabricObject.pathOffset?.x || 0;
      pathOffsetY = fabricObject.pathOffset?.y || 0;
      objWidth = fabricObject.width || 0;
      objHeight = fabricObject.height || 0;
    }
  }
  
  // Pivot point in SVG coordinate space
  const pivotX = pathOffsetX + (anchorX - 0.5) * objWidth;
  const pivotY = pathOffsetY + (anchorY - 0.5) * objHeight;
  
  // Initial wrapper position: keyframe position is where the pivot should be on screen
  const initialLeft = firstKf.properties.x;
  const initialTop = firstKf.properties.y;
  const zIndex = firstKf.properties.zIndex ?? 0;
  
  // The wrapper ID is the object ID (for GSAP targeting)
  const wrapperId = obj.id;

  return `    // Create ${obj.name} (SVG Path with wrapper)
    const ${wrapperId} = document.createElement('div');
    ${wrapperId}.id = '${wrapperId}';
    ${wrapperId}.style.position = 'absolute';
    ${wrapperId}.style.left = '${initialLeft.toFixed(2)}px';
    ${wrapperId}.style.top = '${initialTop.toFixed(2)}px';
    ${wrapperId}.style.width = '0px';
    ${wrapperId}.style.height = '0px';
    ${wrapperId}.style.overflow = 'visible';
    ${wrapperId}.style.transformOrigin = '0px 0px';
    ${wrapperId}.style.zIndex = '${zIndex}';
    
    var svg_${wrapperId} = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg_${wrapperId}.style.position = 'absolute';
    svg_${wrapperId}.style.left = '${(-pivotX).toFixed(2)}px';
    svg_${wrapperId}.style.top = '${(-pivotY).toFixed(2)}px';
    svg_${wrapperId}.style.overflow = 'visible';
    svg_${wrapperId}.style.pointerEvents = 'none';
    svg_${wrapperId}.setAttribute('width', '${CANVAS_WIDTH}');
    svg_${wrapperId}.setAttribute('height', '${CANVAS_HEIGHT}');
    var path_${wrapperId} = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path_${wrapperId}.setAttribute('d', '${pathString}');
    path_${wrapperId}.setAttribute('stroke', '${obj.strokeColor || '#000000'}');
    path_${wrapperId}.setAttribute('stroke-width', '${obj.strokeWidth || 3}');
    path_${wrapperId}.setAttribute('fill', 'none');
    path_${wrapperId}.setAttribute('stroke-linecap', 'round');
    path_${wrapperId}.setAttribute('stroke-linejoin', 'round');
    svg_${wrapperId}.appendChild(path_${wrapperId});
    ${wrapperId}.appendChild(svg_${wrapperId});
    container.appendChild(${wrapperId});
    
    gsap.set(${wrapperId}, {
        scaleX: ${firstKf.properties.scaleX.toFixed(2)},
        scaleY: ${firstKf.properties.scaleY.toFixed(2)},
        rotation: ${firstKf.properties.rotation.toFixed(2)},
        opacity: ${firstKf.properties.opacity.toFixed(2)}
    });
    
`;
};

// ========== REGULAR ELEMENT CREATION ==========
const generateRegularCreation = (obj, firstKf) => {
  const anchorX = obj.anchorX ?? 0.5;
  const anchorY = obj.anchorY ?? 0.5;
  const elWidth = 100;
  const elHeight = 100;
  const fillColor = obj.fill || getDefaultFillColor(obj.type);
  const zIndex = firstKf.properties.zIndex ?? 0;
  
  let js = `    // Create ${obj.name}
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.transformOrigin = '${(anchorX * 100).toFixed(0)}% ${(anchorY * 100).toFixed(0)}%';
    ${obj.id}.style.left = '${(firstKf.properties.x - anchorX * elWidth).toFixed(2)}px';
    ${obj.id}.style.top = '${(firstKf.properties.y - anchorY * elHeight).toFixed(2)}px';
    ${obj.id}.style.zIndex = '${zIndex}';
`;

  if (obj.type === 'rectangle') {
    js += `    ${obj.id}.style.width = '100px';
    ${obj.id}.style.height = '100px';
    ${obj.id}.style.backgroundColor = '${fillColor}';
`;
  } else if (obj.type === 'circle') {
    js += `    ${obj.id}.style.width = '100px';
    ${obj.id}.style.height = '100px';
    ${obj.id}.style.borderRadius = '50%';
    ${obj.id}.style.backgroundColor = '${fillColor}';
`;
  } else if (obj.type === 'text') {
    js += `    ${obj.id}.textContent = '${(obj.textContent || 'Text').replace(/'/g, "\\'")}';
    ${obj.id}.style.fontSize = '24px';
    ${obj.id}.style.color = '${fillColor}';
    ${obj.id}.style.whiteSpace = 'nowrap';
`;
  }
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

/**
 * Path animation: uses left/top on wrapper div. No x/y (no CSS translate).
 * Position and rotation are fully independent.
 */
const generatePathAnimation = (obj, objKeyframes, fabricCanvas) => {
  let js = '';

  for (let i = 1; i < objKeyframes.length; i++) {
    const prevKf = objKeyframes[i - 1];
    const currKf = objKeyframes[i];
    const easing = mapEasingToGSAP(currKf.easing || 'linear');
    const zIndex = currKf.properties.zIndex ?? 0;

    js += `    tl.to('#${obj.id}', {
        duration: ${(currKf.time - prevKf.time).toFixed(2)},
        left: '${currKf.properties.x.toFixed(2)}px',
        top: '${currKf.properties.y.toFixed(2)}px',
        scaleX: ${currKf.properties.scaleX.toFixed(2)},
        scaleY: ${currKf.properties.scaleY.toFixed(2)},
        rotation: ${currKf.properties.rotation.toFixed(2)},
        opacity: ${currKf.properties.opacity.toFixed(2)},
        zIndex: ${zIndex},
        ease: '${easing}'
    }, ${prevKf.time.toFixed(2)});
    
`;
  }
  return js;
};

const generateGroupAnimation = (obj, objKeyframes) => {
  let js = '';
  for (let i = 1; i < objKeyframes.length; i++) {
    const prevKf = objKeyframes[i - 1];
    const currKf = objKeyframes[i];
    const easing = mapEasingToGSAP(currKf.easing || 'linear');
    const zIndex = currKf.properties.zIndex ?? 0;

    js += `    tl.to('#${obj.id}', {
        duration: ${(currKf.time - prevKf.time).toFixed(2)},
        left: '${currKf.properties.x.toFixed(2)}px',
        top: '${currKf.properties.y.toFixed(2)}px',
        scaleX: ${currKf.properties.scaleX.toFixed(2)},
        scaleY: ${currKf.properties.scaleY.toFixed(2)},
        rotation: ${currKf.properties.rotation.toFixed(2)},
        opacity: ${currKf.properties.opacity.toFixed(2)},
        zIndex: ${zIndex},
        ease: '${easing}'
    }, ${prevKf.time.toFixed(2)});
    
`;
  }
  return js;
};

const generateRegularAnimation = (obj, objKeyframes) => {
  const anchorX = obj.anchorX ?? 0.5;
  const anchorY = obj.anchorY ?? 0.5;
  const elWidth = 100;
  const elHeight = 100;

  let js = '';
  for (let i = 1; i < objKeyframes.length; i++) {
    const prevKf = objKeyframes[i - 1];
    const currKf = objKeyframes[i];
    const easing = mapEasingToGSAP(currKf.easing || 'linear');
    const zIndex = currKf.properties.zIndex ?? 0;

    js += `    tl.to('#${obj.id}', {
        duration: ${(currKf.time - prevKf.time).toFixed(2)},
        left: '${(currKf.properties.x - anchorX * elWidth).toFixed(2)}px',
        top: '${(currKf.properties.y - anchorY * elHeight).toFixed(2)}px',
        scaleX: ${currKf.properties.scaleX.toFixed(2)},
        scaleY: ${currKf.properties.scaleY.toFixed(2)},
        rotation: ${currKf.properties.rotation.toFixed(2)},
        opacity: ${currKf.properties.opacity.toFixed(2)},
        zIndex: ${zIndex},
        ease: '${easing}'
    }, ${prevKf.time.toFixed(2)});
    
`;
  }
  return js;
};

// ========== HELPERS ==========

const mapEasingToGSAP = (easing) => {
  const map = {
    'linear': 'none',
    'easeInQuad': 'power1.in',
    'easeOutQuad': 'power1.out',
    'easeInOutQuad': 'power1.inOut',
    'easeInCubic': 'power2.in',
    'easeOutCubic': 'power2.out',
    'easeInOutCubic': 'power2.inOut',
    'easeInQuart': 'power3.in',
    'easeOutQuart': 'power3.out',
    'easeInOutQuart': 'power3.inOut',
    'bounce': 'bounce.out',
    'elastic': 'elastic.out',
  };
  return map[easing] || 'none';
};

export const downloadFile = (filename, content) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadAllFiles = (html, css, javascript) => {
  downloadFile('index.html', html);
  setTimeout(() => downloadFile('style.css', css), 100);
  setTimeout(() => downloadFile('animation.js', javascript), 200);
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};