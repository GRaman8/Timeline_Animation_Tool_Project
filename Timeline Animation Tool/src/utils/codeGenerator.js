/**
 * Generate HTML, CSS, and JavaScript code from animation data
 */

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
    width: 1200px;
    height: 600px;
    background-color: #f0f0f0;
    margin: 0 auto;
}

`;

  // Generate styles for each object
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length === 0) return;

    const firstKeyframe = objKeyframes[0];
    const props = firstKeyframe.properties;

    css += `#${obj.id} {
    position: absolute;
    left: ${props.x}px;
    top: ${props.y}px;
    transform: scale(${props.scaleX}, ${props.scaleY}) rotate(${props.rotation}deg);
    opacity: ${props.opacity};
`;

    // Add type-specific styles
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
`;
    }

    css += `}

`;
  });

  // Add fallback class
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

    js += `    // Create ${obj.name}
    const ${obj.id} = document.createElement('div');
    ${obj.id}.id = '${obj.id}';
`;

    if (obj.type === 'text') {
      js += `    ${obj.id}.textContent = 'Text';
`;
    }

    js += `    container.appendChild(${obj.id});
    
`;
  });

  // Add animations
  canvasObjects.forEach(obj => {
    const objKeyframes = keyframes[obj.id] || [];
    if (objKeyframes.length < 2) return;

    js += `    // Animate ${obj.name}
`;

    for (let i = 1; i < objKeyframes.length; i++) {
      const prevKf = objKeyframes[i - 1];
      const currKf = objKeyframes[i];
      const duration = currKf.time - prevKf.time;
      const easing = mapEasingToGSAP(currKf.easing || 'linear');

      js += `    tl.to('#${obj.id}', {
        duration: ${duration.toFixed(2)},
        x: ${currKf.properties.x.toFixed(2)},
        y: ${currKf.properties.y.toFixed(2)},
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
 * Download all files as ZIP (using JSZip would be ideal, but here's a simple multi-file approach)
 */
export const downloadAllFiles = (html, css, javascript) => {
  // Download each file separately
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