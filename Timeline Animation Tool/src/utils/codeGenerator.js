/**
 * Generate HTML, CSS, and JavaScript code from animation data
 * FIXED: Proper coordinate handling for groups and paths
 */

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 800;

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

// Accept loopPlayback and fabricCanvas
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
    
    <!-- GSAP Library -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="animation.js"></script>
</body>
</html>`;
};

/**
 * Generate CSS - Skip children (styled in JS), use center-origin offsets
 */
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

  // Identify children to skip in CSS
  const groupChildren = new Set();
  canvasObjects.forEach(obj => {
    if (obj.type === 'group' && obj.children) {
      obj.children.forEach(childId => groupChildren.add(childId));
    }
  });

  // Generate CSS only for top-level non-group, non-path objects
  canvasObjects.forEach(obj => {
    if (groupChildren.has(obj.id)) return;
    
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length === 0) return;

    // Skip paths and groups - they're handled in JavaScript
    if (obj.type === 'path' || obj.type === 'group') return;

    const firstKeyframe = objKeyframes[0];
    const props = firstKeyframe.properties;

    // FIXED: Use -50 offset for center-origin shapes
    css += `#${obj.id} {
    position: absolute;
    left: ${(props.x - 50).toFixed(2)}px;
    top: ${(props.y - 50).toFixed(2)}px;
    transform: scale(${props.scaleX}, ${props.scaleY}) rotate(${props.rotation}deg);
    transform-origin: center center;
    opacity: ${props.opacity};
`;

    if (obj.type === 'rectangle') {
      css += `    width: 100px;
    height: 100px;
    background-color: #3b82f6;
`;
    } else if (obj.type === 'circle') {
      css += `    width: 100px;
    height: 100px;
    border-radius: 50%;
    background-color: #ef4444;
`;
    } else if (obj.type === 'text') {
      css += `    font-size: 24px;
    color: #000000;
    white-space: nowrap;
`;
    }

    css += `}

`;
  });

  return css;
};

/**
 * Generate JavaScript - FIXED: Proper group/path coordinate handling
 */
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
      // FIXED: Group container - 0x0 with overflow:visible, transformOrigin at 0,0
      js += `    // Create ${obj.name} (Group)
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.width = '0px';
    ${obj.id}.style.height = '0px';
    ${obj.id}.style.overflow = 'visible';
    ${obj.id}.style.transformOrigin = '0px 0px';
    container.appendChild(${obj.id});
    
`;
      
      // FIXED: Create children with proper coordinate handling
      if (obj.children && fabricCanvas) {
        const fabricGroup = fabricCanvas.getObjects().find(o => o.id === obj.id);
        
        if (fabricGroup && fabricGroup._objects) {
          fabricGroup._objects.forEach((fabricChild) => {
            const childId = fabricChild.id;
            const childObj = canvasObjects.find(o => o.id === childId);
            if (!childObj) return;

            const relLeft = fabricChild.left || 0;
            const relTop = fabricChild.top || 0;
            const childScaleX = fabricChild.scaleX || 1;
            const childScaleY = fabricChild.scaleY || 1;
            const childAngle = fabricChild.angle || 0;

            if (fabricChild.type === 'path') {
              // FIXED: Path children use pathOffset for correct SVG positioning
              const pathString = fabricPathToSVGPath(fabricChild.path);
              const pathOffsetX = fabricChild.pathOffset?.x || 0;
              const pathOffsetY = fabricChild.pathOffset?.y || 0;
              const tx = relLeft - pathOffsetX * childScaleX;
              const ty = relTop - pathOffsetY * childScaleY;

              js += `    // Create ${childObj.name} (path child)
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
        g.setAttribute('transform', 'translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${childScaleX}, ${childScaleY})');
        
        var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', '${pathString}');
        pathEl.setAttribute('stroke', '${fabricChild.stroke || '#000000'}');
        pathEl.setAttribute('stroke-width', '${fabricChild.strokeWidth || 3}');
        pathEl.setAttribute('fill', 'none');
        pathEl.setAttribute('stroke-linecap', 'round');
        pathEl.setAttribute('stroke-linejoin', 'round');
        
        g.appendChild(pathEl);
        svg.appendChild(g);
        ${obj.id}.appendChild(svg);
    })();
    
`;
            } else {
              // FIXED: Solid children use center-origin offset
              let childWidth = 100;
              let childHeight = 100;
              
              js += `    // Create ${childObj.name} (child)
    const ${childId} = document.createElement('div');
    ${childId}.id = '${childId}';
    ${childId}.style.position = 'absolute';
    ${childId}.style.transformOrigin = 'center center';
`;

              if (fabricChild.type === 'rect' || fabricChild.type === 'rectangle') {
                childWidth = (fabricChild.width || 100) * childScaleX;
                childHeight = (fabricChild.height || 100) * childScaleY;
                js += `    ${childId}.style.width = '${childWidth.toFixed(2)}px';
    ${childId}.style.height = '${childHeight.toFixed(2)}px';
    ${childId}.style.backgroundColor = '${fabricChild.fill || '#3b82f6'}';
`;
              } else if (fabricChild.type === 'circle') {
                const radius = fabricChild.radius || 50;
                childWidth = radius * 2 * childScaleX;
                childHeight = radius * 2 * childScaleY;
                js += `    ${childId}.style.width = '${childWidth.toFixed(2)}px';
    ${childId}.style.height = '${childHeight.toFixed(2)}px';
    ${childId}.style.borderRadius = '50%';
    ${childId}.style.backgroundColor = '${fabricChild.fill || '#ef4444'}';
`;
              } else if (fabricChild.type === 'text') {
                childWidth = (fabricChild.width || 50) * childScaleX;
                childHeight = (fabricChild.height || 24) * childScaleY;
                js += `    ${childId}.textContent = '${fabricChild.text || 'Text'}';
    ${childId}.style.fontSize = '${((fabricChild.fontSize || 24) * childScaleY).toFixed(2)}px';
    ${childId}.style.color = '${fabricChild.fill || '#000000'}';
    ${childId}.style.whiteSpace = 'nowrap';
`;
              }

              // FIXED: Position child CENTER at (relLeft, relTop)
              const cssLeft = relLeft - childWidth / 2;
              const cssTop = relTop - childHeight / 2;
              js += `    ${childId}.style.left = '${cssLeft.toFixed(2)}px';
    ${childId}.style.top = '${cssTop.toFixed(2)}px';
`;
              if (childAngle) {
                js += `    ${childId}.style.transform = 'rotate(${childAngle}deg)';
`;
              }
              js += `    ${obj.id}.appendChild(${childId});
    
`;
            }
          });
        }
      }
      
    } else if (obj.type === 'path') {
      const pathString = fabricPathToSVGPath(obj.pathData);
      const strokeColor = obj.strokeColor || '#000000';
      const strokeWidth = obj.strokeWidth || 3;

      js += `    // Create ${obj.name} (SVG Path)
    const ${obj.id} = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.left = '0';
    ${obj.id}.style.top = '0';
    ${obj.id}.style.overflow = 'visible';
    ${obj.id}.style.pointerEvents = 'none';
    ${obj.id}.setAttribute('width', '${CANVAS_WIDTH}');
    ${obj.id}.setAttribute('height', '${CANVAS_HEIGHT}');
    
    const path_${obj.id} = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path_${obj.id}.setAttribute('d', '${pathString}');
    path_${obj.id}.setAttribute('stroke', '${strokeColor}');
    path_${obj.id}.setAttribute('stroke-width', '${strokeWidth}');
    path_${obj.id}.setAttribute('fill', 'none');
    path_${obj.id}.setAttribute('stroke-linecap', 'round');
    path_${obj.id}.setAttribute('stroke-linejoin', 'round');
    
    ${obj.id}.appendChild(path_${obj.id});
    container.appendChild(${obj.id});
    
`;

    } else {
      // FIXED: Regular elements use -50 offset for center origin
      const firstKf = objKeyframes[0];
      
      js += `    // Create ${obj.name}
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.transformOrigin = 'center center';
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
        js += `    ${obj.id}.textContent = '${obj.textContent || 'Text'}';
    ${obj.id}.style.fontSize = '24px';
    ${obj.id}.style.color = '#000000';
    ${obj.id}.style.whiteSpace = 'nowrap';
`;
      }

      js += `    container.appendChild(${obj.id});
    
`;
    }
  });

  // Add animations
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length < 2) return;
    if (groupChildren.has(obj.id)) return;

    if (obj.type === 'path') {
      const firstKf = objKeyframes[0];
      const baseX = firstKf.properties.x;
      const baseY = firstKf.properties.y;

      js += `    // Animate ${obj.name}
`;
      for (let i = 1; i < objKeyframes.length; i++) {
        const prevKf = objKeyframes[i - 1];
        const currKf = objKeyframes[i];
        const animDuration = currKf.time - prevKf.time;
        const easing = mapEasingToGSAP(currKf.easing || 'linear');

        js += `    tl.to('#${obj.id}', {
        duration: ${animDuration.toFixed(2)},
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
    } else if (obj.type === 'group') {
      // FIXED: Group animation uses center position directly (no offset needed, group div origin IS center)
      js += `    // Animate ${obj.name}
`;
      for (let i = 1; i < objKeyframes.length; i++) {
        const prevKf = objKeyframes[i - 1];
        const currKf = objKeyframes[i];
        const animDur = currKf.time - prevKf.time;
        const easing = mapEasingToGSAP(currKf.easing || 'linear');

        js += `    tl.to('#${obj.id}', {
        duration: ${animDur.toFixed(2)},
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
    } else {
      // FIXED: Regular elements use -50 offset in animation too
      js += `    // Animate ${obj.name}
`;
      for (let i = 1; i < objKeyframes.length; i++) {
        const prevKf = objKeyframes[i - 1];
        const currKf = objKeyframes[i];
        const animDur = currKf.time - prevKf.time;
        const easing = mapEasingToGSAP(currKf.easing || 'linear');

        js += `    tl.to('#${obj.id}', {
        duration: ${animDur.toFixed(2)},
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
    }
  });

  js += `    tl.play();
});
`;

  return js;
};

const mapEasingToGSAP = (easing) => {
  const easingMap = {
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

  return easingMap[easing] || 'none';
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