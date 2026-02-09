/**
 * Generate HTML, CSS, and JavaScript code from animation data
 * FULLY DEBUGGED VERSION
 */

// Shared canvas dimensions
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

/**
 * Get the CSS offset needed to convert Fabric center-point
 * positioning to CSS top-left positioning.
 */
const getOffsets = (obj) => {
  if (obj.type === 'rectangle' || obj.type === 'circle') {
    return { x: -50, y: -50 };
  }
  return { x: 0, y: 0 };
};

// MODIFIED: Accept loopPlayback parameter
export const generateAnimationCode = (canvasObjects, keyframes, duration, loopPlayback = false) => {
  const html = generateHTML();
  const css = generateCSS(canvasObjects, keyframes);
  const javascript = generateJavaScript(canvasObjects, keyframes, duration, loopPlayback);

  return { html, css, javascript };
};

/**
 * Generate HTML boilerplate
 */
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
 * Generate CSS styles - FIXED to not skip children
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

  // Generate CSS for ALL objects that have keyframes
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length === 0) return;

    // Skip paths - they don't need CSS
    if (obj.type === 'path') return;

    const firstKeyframe = objKeyframes[0];
    const props = firstKeyframe.properties;
    const offset = getOffsets(obj);

    css += `#${obj.id} {
    position: absolute;
    left: ${(props.x + offset.x).toFixed(2)}px;
    top: ${(props.y + offset.y).toFixed(2)}px;
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
    } else if (obj.type === 'group') {
      // Groups don't need width/height/background
    }

    css += `}

`;
  });

  return css;
};

/**
 * Generate GSAP JavaScript animation code - FIXED
 */
const generateJavaScript = (canvasObjects, keyframes, duration, loopPlayback) => {
  // Use loopPlayback parameter to determine repeat value
  const repeatValue = loopPlayback ? -1 : 0;
  
  let js = `// Generated Animation Code
// Using GSAP (GreenSock Animation Platform)

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('animation-container');
    
    // Create timeline
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

  // Create all elements first
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length === 0) return;

    // Skip children - they'll be created inside their parent
    if (groupChildren.has(obj.id)) return;

    if (obj.type === 'group') {
      // Create group container
      js += `    // Create ${obj.name} (Group)
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.transformOrigin = 'center center';
    container.appendChild(${obj.id});
    
`;
      
      // Create children inside group
      if (obj.children) {
        obj.children.forEach(childId => {
          const childObj = canvasObjects.find(o => o.id === childId);
          if (!childObj) return;
          
          const childKeyframes = keyframes[childId] || [];
          if (childKeyframes.length === 0) return;
          
          const firstKf = childKeyframes[0];
          const offset = getOffsets(childObj);
          
          js += `    // Create ${childObj.name} (child of ${obj.name})
    const ${childId} = document.createElement('div');
    ${childId}.id = '${childId}';
    ${childId}.style.position = 'absolute';
    ${childId}.style.transformOrigin = 'center center';
    ${childId}.style.left = '${(firstKf.properties.x + offset.x).toFixed(2)}px';
    ${childId}.style.top = '${(firstKf.properties.y + offset.y).toFixed(2)}px';
`;

          if (childObj.type === 'rectangle') {
            js += `    ${childId}.style.width = '100px';
    ${childId}.style.height = '100px';
    ${childId}.style.backgroundColor = '#3b82f6';
`;
          } else if (childObj.type === 'circle') {
            js += `    ${childId}.style.width = '100px';
    ${childId}.style.height = '100px';
    ${childId}.style.borderRadius = '50%';
    ${childId}.style.backgroundColor = '#ef4444';
`;
          } else if (childObj.type === 'text') {
            js += `    ${childId}.textContent = '${childObj.textContent || 'Text'}';
    ${childId}.style.fontSize = '24px';
    ${childId}.style.color = '#000000';
    ${childId}.style.whiteSpace = 'nowrap';
`;
          }
          
          js += `    ${obj.id}.appendChild(${childId});
    
`;
        });
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
      // Regular elements (rectangle, circle, text)
      const firstKf = objKeyframes[0];
      const offset = getOffsets(obj);
      
      js += `    // Create ${obj.name}
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.transformOrigin = 'center center';
    ${obj.id}.style.left = '${(firstKf.properties.x + offset.x).toFixed(2)}px';
    ${obj.id}.style.top = '${(firstKf.properties.y + offset.y).toFixed(2)}px';
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

  // Now add animations for top-level objects
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length < 2) return;

    // Skip children - they move with their parent
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
    } else {
      const offset = obj.type === 'group' ? { x: 0, y: 0 } : getOffsets(obj);

      js += `    // Animate ${obj.name}
`;

      for (let i = 1; i < objKeyframes.length; i++) {
        const prevKf = objKeyframes[i - 1];
        const currKf = objKeyframes[i];
        const animDur = currKf.time - prevKf.time;
        const easing = mapEasingToGSAP(currKf.easing || 'linear');

        js += `    tl.to('#${obj.id}', {
        duration: ${animDur.toFixed(2)},
        left: '${(currKf.properties.x + offset.x).toFixed(2)}px',
        top: '${(currKf.properties.y + offset.y).toFixed(2)}px',
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

  js += `    // Play animation
    tl.play();
});
`;

  return js;
};

/**
 * Map our easing names to GSAP easing names
 */
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

/**
 * Download a file
 */
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

/**
 * Download all files
 */
export const downloadAllFiles = (html, css, javascript) => {
  downloadFile('index.html', html);
  setTimeout(() => downloadFile('style.css', css), 100);
  setTimeout(() => downloadFile('animation.js', javascript), 200);
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};