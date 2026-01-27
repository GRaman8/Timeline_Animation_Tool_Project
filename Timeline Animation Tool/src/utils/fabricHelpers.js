import * as fabric from 'fabric';

/**
 * Create a new Fabric.js object based on type
*/
export const createFabricObject = (type, id) => {
  const baseProps = {
    id,
    left: 100,
    top: 100,
    originX: 'center', // Fabric uses center by default
    originY: 'center',
  };

  switch (type) {
    case 'rectangle':
      return new fabric.Rect({
        ...baseProps,
        width: 100,
        height: 100,
        fill: '#3b82f6',
      });
    
    case 'circle':
      return new fabric.Circle({
        ...baseProps,
        radius: 50,
        fill: '#ef4444',
      });
    
    case 'text':
      return new fabric.Text('Text', {
        ...baseProps,
        fontSize: 24,
        fill: '#000000',
      });
    
    case 'path':
      return null; // Paths are created via createPathFromPoints
      
    default:
      return null;
  }
};

/**
 * Create a path object from drawn points
 */
export const createPathFromPoints = (points, id, settings) => {
  if (points.length < 2) return null;

  // Convert points to SVG path string
  let pathString = `M ${points[0].x} ${points[0].y}`;
  
  if (settings.smoothing && points.length > 2) {
    // Use quadratic curves for smoother paths
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      pathString += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    // Add the last point
    const lastPoint = points[points.length - 1];
    pathString += ` L ${lastPoint.x} ${lastPoint.y}`;
  } else {
    // Simple line segments
    for (let i = 1; i < points.length; i++) {
      pathString += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  const path = new fabric.Path(pathString, {
    id,
    stroke: settings.color,
    strokeWidth: settings.strokeWidth,
    fill: '',
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    selectable: true,
    originX: 'center', // Use center origin like other objects
    originY: 'center',
  });

  return path;
};

/**
 * Extract properties from a Fabric.js object
 * Fabric.js stores positions based on origin (usually center)
 * We need to extract the actual position for animation
*/
export const extractPropertiesFromFabricObject = (fabricObject) => {
  if (!fabricObject) return null;

  // All objects use center origin in Fabric.js
  const baseProps = {
    x: fabricObject.left || 0,
    y: fabricObject.top || 0,
    scaleX: fabricObject.scaleX || 1,
    scaleY: fabricObject.scaleY || 1,
    rotation: fabricObject.angle || 0,
    opacity: fabricObject.opacity !== undefined ? fabricObject.opacity : 1,
  };

  // Include path-specific data for path objects
  if (fabricObject.type === 'path') {
    return {
      ...baseProps,
      pathData: fabricObject.path,
      strokeColor: fabricObject.stroke,
      strokeWidth: fabricObject.strokeWidth,
    };
  }

  return baseProps;
};

/**
 * Find a Fabric.js object by ID
 */
export const findFabricObjectById = (canvas, id) => {
  if (!canvas) return null;
  return canvas.getObjects().find(obj => obj.id === id) || null;
};