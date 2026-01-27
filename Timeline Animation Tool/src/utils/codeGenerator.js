/**
 * Generate HTML, CSS, and JavaScript code from animation data
 */

// FIXED: Use consistent canvas dimensions
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;

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

export const generateAnimationCode = (canvasObjects, keyframes, duration) => {
  const html = generateHTML();
  const css = generateCSS(canvasObjects, keyframes);
  const javascript = generateJavaScript(canvasObjects, keyframes, duration);

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
 * Generate CSS styles
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

  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length === 0) return;

    const firstKeyframe = objKeyframes[0];
    const props = firstKeyframe.properties;

    // For paths, style the container
    const cssId = obj.type === 'path' ? `${obj.id}_container` : obj.id;
    
    // Calculate offset for center-based positioning
    let leftOffset = 0;
    let topOffset = 0;
    
    if (obj.type === 'path') {
      const width = obj.boundingBox?.width || 100;
      const height = obj.boundingBox?.height || 100;
      leftOffset = -width / 2;
      topOffset = -height / 2;
    } else if (obj.type === 'rectangle' || obj.type === 'circle') {
      leftOffset = -50; // half of 100px
      topOffset = -50;
    }

    css += `#${cssId} {
    position: absolute;
    left: ${(props.x + leftOffset).toFixed(2)}px;
    top: ${(props.y + topOffset).toFixed(2)}px;
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
    } else if (obj.type === 'path') {
      css += `    /* SVG Path Container */
`;
    }

    css += `}

`;
  });

  css += `.default-animation-object {
    width: 50px;
    height: 50px;
    background-color: #888888;
    position: absolute;
}
`;

  return css;
};

/**
 * Generate GSAP JavaScript animation code
 */
const generateJavaScript = (canvasObjects, keyframes, duration) => {
  let js = `// Generated Animation Code
// Using GSAP (GreenSock Animation Platform)

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('animation-container');
    
    // Create timeline
    const tl = gsap.timeline({ 
        repeat: 0,
        defaults: { duration: 1, ease: "power1.inOut" }
    });
    
`;

  // Create elements
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length === 0) return;

    if (obj.type === 'path') {
      const pathString = fabricPathToSVGPath(obj.pathData);
      const strokeColor = obj.strokeColor || '#000000';
      const strokeWidth = obj.strokeWidth || 3;
      const width = obj.boundingBox?.width || 100;
      const height = obj.boundingBox?.height || 100;
      
      js += `    // Create ${obj.name} (SVG Path)
    const ${obj.id}_container = document.createElement('div');
    ${obj.id}_container.id = '${obj.id}_container';
    ${obj.id}_container.style.position = 'absolute';
    ${obj.id}_container.style.transformOrigin = 'center center';
    ${obj.id}_container.style.width = '${width}px';
    ${obj.id}_container.style.height = '${height}px';
    
    const ${obj.id} = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.left = '0';
    ${obj.id}.style.top = '0';
    ${obj.id}.style.overflow = 'visible';
    ${obj.id}.style.pointerEvents = 'none';
    ${obj.id}.setAttribute('width', '${width}');
    ${obj.id}.setAttribute('height', '${height}');
    ${obj.id}.setAttribute('viewBox', '0 0 ${width} ${height}');
    
    const path_${obj.id} = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path_${obj.id}.setAttribute('d', '${pathString}');
    path_${obj.id}.setAttribute('stroke', '${strokeColor}');
    path_${obj.id}.setAttribute('stroke-width', '${strokeWidth}');
    path_${obj.id}.setAttribute('fill', 'none');
    path_${obj.id}.setAttribute('stroke-linecap', 'round');
    path_${obj.id}.setAttribute('stroke-linejoin', 'round');
    
    ${obj.id}.appendChild(path_${obj.id});
    ${obj.id}_container.appendChild(${obj.id});
    container.appendChild(${obj.id}_container);
    
`;
    } else {
      js += `    // Create ${obj.name}
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
    ${obj.id}.style.position = 'absolute';
    ${obj.id}.style.transformOrigin = 'center center';
`;

      if (obj.type === 'text') {
        js += `    ${obj.id}.textContent = '${obj.textContent || 'Text'}';
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

    js += `    // Animate ${obj.name}
`;

    // Use the container for paths
    const targetId = obj.type === 'path' ? `${obj.id}_container` : obj.id;

    for (let i = 1; i < objKeyframes.length; i++) {
      const prevKf = objKeyframes[i - 1];
      const currKf = objKeyframes[i];
      const duration = currKf.time - prevKf.time;
      const easing = mapEasingToGSAP(currKf.easing || 'linear');

      // Calculate offset for center-based positioning
      let leftOffset = 0;
      let topOffset = 0;
      
      if (obj.type === 'path') {
        const width = obj.boundingBox?.width || 100;
        const height = obj.boundingBox?.height || 100;
        leftOffset = -width / 2;
        topOffset = -height / 2;
      } else if (obj.type === 'rectangle' || obj.type === 'circle') {
        leftOffset = -50;
        topOffset = -50;
      }

      js += `    tl.to('#${targetId}', {
        duration: ${duration.toFixed(2)},
        left: '${(currKf.properties.x + leftOffset).toFixed(2)}px',
        top: '${(currKf.properties.y + topOffset).toFixed(2)}px',
        scaleX: ${currKf.properties.scaleX.toFixed(2)},
        scaleY: ${currKf.properties.scaleY.toFixed(2)},
        rotation: ${currKf.properties.rotation.toFixed(2)},
        opacity: ${currKf.properties.opacity.toFixed(2)},
        ease: '${easing}'
    }, ${prevKf.time.toFixed(2)});
    
`;
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