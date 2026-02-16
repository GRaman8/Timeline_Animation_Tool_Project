/**
 * Code Generator - Produces standalone HTML/CSS/JS animation
 * 
 * Coordinate system: ALL keyframe x/y values are CENTER coordinates
 * (since all Fabric.js objects including groups use originX:'center').
 * 
 * Anchor/pivot support: transform-origin is set per-element based on
 * stored anchorX/anchorY values. For paths, this requires computing
 * the pixel position using pathOffset + bounding box from the Fabric object.
 */

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
  const css = generateCSS(canvasObjects, keyframes);
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

const generateCSS = (canvasObjects, keyframes) => {
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
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length === 0) return;
    if (obj.type === 'path' || obj.type === 'group') return;

    const firstKf = objKeyframes[0];
    const props = firstKf.properties;
    const anchorX = obj.anchorX ?? 0.5;
    const anchorY = obj.anchorY ?? 0.5;

    css += `#${obj.id} {
    position: absolute;
    left: ${(props.x - 50).toFixed(2)}px;
    top: ${(props.y - 50).toFixed(2)}px;
    transform-origin: ${(anchorX * 100).toFixed(0)}% ${(anchorY * 100).toFixed(0)}%;
    opacity: ${props.opacity};
`;

    if (obj.type === 'rectangle') {
      css += `    width: 100px;\n    height: 100px;\n    background-color: #3b82f6;\n`;
    } else if (obj.type === 'circle') {
      css += `    width: 100px;\n    height: 100px;\n    border-radius: 50%;\n    background-color: #ef4444;\n`;
    } else if (obj.type === 'text') {
      css += `    font-size: 24px;\n    color: #000000;\n    white-space: nowrap;\n`;
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

  // ========== CREATE AND INITIALIZE ELEMENTS ==========
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length === 0) return;
    if (groupChildren.has(obj.id)) return;

    const firstKf = objKeyframes[0];

    if (obj.type === 'group') {
      js += generateGroupCreation(obj, firstKf, canvasObjects, fabricCanvas);
    } else if (obj.type === 'path') {
      js += generatePathCreation(obj, firstKf, fabricCanvas);
    } else {
      js += generateRegularCreation(obj, firstKf);
    }
  });

  // ========== ANIMATE ELEMENTS ==========
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length < 2) return;
    if (groupChildren.has(obj.id)) return;

    js += `    // Animate ${obj.name}\n`;

    if (obj.type === 'path') {
      js += generatePathAnimation(obj, objKeyframes);
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
  
  // Calculate pivot offset from group center
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
    container.appendChild(${obj.id});
    
    gsap.set(${obj.id}, {
        scaleX: ${firstKf.properties.scaleX.toFixed(2)},
        scaleY: ${firstKf.properties.scaleY.toFixed(2)},
        rotation: ${firstKf.properties.rotation.toFixed(2)},
        opacity: ${firstKf.properties.opacity.toFixed(2)}
    });
    
`;

  // Create children
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
          js += generateSolidChildCreation(fabricChild, childObj, obj.id, relLeft, relTop, childScaleX, childScaleY, childAngle);
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
const generateSolidChildCreation = (fabricChild, childObj, parentId, relLeft, relTop, scaleX, scaleY, angle) => {
  let js = `    // Create ${childObj.name} (child)
    const ${fabricChild.id} = document.createElement('div');
    ${fabricChild.id}.id = '${fabricChild.id}';
    ${fabricChild.id}.style.position = 'absolute';
    ${fabricChild.id}.style.transformOrigin = 'center center';
`;

  let childWidth = 100, childHeight = 100;

  if (fabricChild.type === 'rect' || fabricChild.type === 'rectangle') {
    childWidth = (fabricChild.width || 100) * scaleX;
    childHeight = (fabricChild.height || 100) * scaleY;
    js += `    ${fabricChild.id}.style.width = '${childWidth.toFixed(2)}px';
    ${fabricChild.id}.style.height = '${childHeight.toFixed(2)}px';
    ${fabricChild.id}.style.backgroundColor = '${fabricChild.fill || '#3b82f6'}';
`;
  } else if (fabricChild.type === 'circle') {
    const r = fabricChild.radius || 50;
    childWidth = r * 2 * scaleX;
    childHeight = r * 2 * scaleY;
    js += `    ${fabricChild.id}.style.width = '${childWidth.toFixed(2)}px';
    ${fabricChild.id}.style.height = '${childHeight.toFixed(2)}px';
    ${fabricChild.id}.style.borderRadius = '50%';
    ${fabricChild.id}.style.backgroundColor = '${fabricChild.fill || '#ef4444'}';
`;
  } else if (fabricChild.type === 'text') {
    childWidth = (fabricChild.width || 50) * scaleX;
    childHeight = (fabricChild.height || 24) * scaleY;
    js += `    ${fabricChild.id}.textContent = '${(fabricChild.text || 'Text').replace(/'/g, "\\'")}';
    ${fabricChild.id}.style.fontSize = '${((fabricChild.fontSize || 24) * scaleY).toFixed(2)}px';
    ${fabricChild.id}.style.color = '${fabricChild.fill || '#000000'}';
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

// ========== STANDALONE PATH CREATION ==========
/**
 * ANCHOR FIX: Calculate transform-origin for the SVG element.
 * 
 * The SVG spans the full canvas (0,0 to 1400,800).
 * Path data is in absolute SVG coordinates centered at pathOffset.
 * The pivot point in pixels = pathOffset + (anchor - 0.5) * objectSize.
 */
const generatePathCreation = (obj, firstKf, fabricCanvas) => {
  const pathString = fabricPathToSVGPath(obj.pathData);
  
  const anchorX = obj.anchorX ?? 0.5;
  const anchorY = obj.anchorY ?? 0.5;
  
  // Calculate pixel-precise transform-origin from Fabric object geometry
  let transformOriginStr = '50% 50%'; // fallback
  if (fabricCanvas) {
    const fabricObject = fabricCanvas.getObjects().find(o => o.id === obj.id);
    if (fabricObject) {
      const pathOffsetX = fabricObject.pathOffset?.x || 0;
      const pathOffsetY = fabricObject.pathOffset?.y || 0;
      const objWidth = fabricObject.width || 0;
      const objHeight = fabricObject.height || 0;
      
      const pivotX = pathOffsetX + (anchorX - 0.5) * objWidth;
      const pivotY = pathOffsetY + (anchorY - 0.5) * objHeight;
      
      transformOriginStr = `${pivotX.toFixed(2)}px ${pivotY.toFixed(2)}px`;
    }
  }

  return `    // Create ${obj.name} (SVG Path)
    const ${obj.id} = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.left = '0';
    ${obj.id}.style.top = '0';
    ${obj.id}.style.overflow = 'visible';
    ${obj.id}.style.pointerEvents = 'none';
    ${obj.id}.style.transformOrigin = '${transformOriginStr}';
    ${obj.id}.setAttribute('width', '${CANVAS_WIDTH}');
    ${obj.id}.setAttribute('height', '${CANVAS_HEIGHT}');
    var path_${obj.id} = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path_${obj.id}.setAttribute('d', '${pathString}');
    path_${obj.id}.setAttribute('stroke', '${obj.strokeColor || '#000000'}');
    path_${obj.id}.setAttribute('stroke-width', '${obj.strokeWidth || 3}');
    path_${obj.id}.setAttribute('fill', 'none');
    path_${obj.id}.setAttribute('stroke-linecap', 'round');
    path_${obj.id}.setAttribute('stroke-linejoin', 'round');
    ${obj.id}.appendChild(path_${obj.id});
    container.appendChild(${obj.id});
    
    gsap.set(${obj.id}, {
        x: 0, y: 0,
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
  
  let js = `    // Create ${obj.name}
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.transformOrigin = '${(anchorX * 100).toFixed(0)}% ${(anchorY * 100).toFixed(0)}%';
    ${obj.id}.style.left = '${(firstKf.properties.x - 50).toFixed(2)}px';
    ${obj.id}.style.top = '${(firstKf.properties.y - 50).toFixed(2)}px';
`;

  if (obj.type === 'rectangle') {
    js += `    ${obj.id}.style.width = '100px';
    ${obj.id}.style.height = '100px';
    ${obj.id}.style.backgroundColor = '#3b82f6';
`;
  } else if (obj.type === 'circle') {
    js += `    ${obj.id}.style.width = '100px';
    ${obj.id}.style.height = '100px';
    ${obj.id}.style.borderRadius = '50%';
    ${obj.id}.style.backgroundColor = '#ef4444';
`;
  } else if (obj.type === 'text') {
    js += `    ${obj.id}.textContent = '${(obj.textContent || 'Text').replace(/'/g, "\\'")}';
    ${obj.id}.style.fontSize = '24px';
    ${obj.id}.style.color = '#000000';
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

const generatePathAnimation = (obj, objKeyframes) => {
  let js = '';
  const baseX = objKeyframes[0].properties.x;
  const baseY = objKeyframes[0].properties.y;

  for (let i = 1; i < objKeyframes.length; i++) {
    const prevKf = objKeyframes[i - 1];
    const currKf = objKeyframes[i];
    const easing = mapEasingToGSAP(currKf.easing || 'linear');

    js += `    tl.to('#${obj.id}', {
        duration: ${(currKf.time - prevKf.time).toFixed(2)},
        x: ${(currKf.properties.x - baseX).toFixed(2)},
        y: ${(currKf.properties.y - baseY).toFixed(2)},
        scaleX: ${currKf.properties.scaleX.toFixed(2)},
        scaleY: ${currKf.properties.scaleY.toFixed(2)},
        rotation: ${currKf.properties.rotation.toFixed(2)},
        opacity: ${currKf.properties.opacity.toFixed(2)},
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

    js += `    tl.to('#${obj.id}', {
        duration: ${(currKf.time - prevKf.time).toFixed(2)},
        left: '${currKf.properties.x.toFixed(2)}px',
        top: '${currKf.properties.y.toFixed(2)}px',
        scaleX: ${currKf.properties.scaleX.toFixed(2)},
        scaleY: ${currKf.properties.scaleY.toFixed(2)},
        rotation: ${currKf.properties.rotation.toFixed(2)},
        opacity: ${currKf.properties.opacity.toFixed(2)},
        ease: '${easing}'
    }, ${prevKf.time.toFixed(2)});
    
`;
  }
  return js;
};

const generateRegularAnimation = (obj, objKeyframes) => {
  let js = '';
  for (let i = 1; i < objKeyframes.length; i++) {
    const prevKf = objKeyframes[i - 1];
    const currKf = objKeyframes[i];
    const easing = mapEasingToGSAP(currKf.easing || 'linear');

    js += `    tl.to('#${obj.id}', {
        duration: ${(currKf.time - prevKf.time).toFixed(2)},
        left: '${(currKf.properties.x - 50).toFixed(2)}px',
        top: '${(currKf.properties.y - 50).toFixed(2)}px',
        scaleX: ${currKf.properties.scaleX.toFixed(2)},
        scaleY: ${currKf.properties.scaleY.toFixed(2)},
        rotation: ${currKf.properties.rotation.toFixed(2)},
        opacity: ${currKf.properties.opacity.toFixed(2)},
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