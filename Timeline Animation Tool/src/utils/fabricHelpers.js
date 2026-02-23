import * as fabric from 'fabric';

/**
 * Create a new Fabric.js object based on type.
 * ALL objects use originX:'center', originY:'center' so left/top = center.
 * Now accepts optional fill color.
 */
export const createFabricObject = (type, id, options = {}) => {
  const baseProps = {
    id,
    left: 100,
    top: 100,
    originX: 'center',
    originY: 'center',
  };

  switch (type) {
    case 'rectangle':
      return new fabric.Rect({
        ...baseProps,
        width: 100,
        height: 100,
        fill: options.fill || '#3b82f6',
      });
    
    case 'circle':
      return new fabric.Circle({
        ...baseProps,
        radius: 50,
        fill: options.fill || '#ef4444',
      });
    
    case 'text':
      return new fabric.Text('Text', {
        ...baseProps,
        fontSize: 24,
        fill: options.fill || '#000000',
      });
    
    case 'path':
      return null;
      
    default:
      return null;
  }
};

/**
 * Create a path object from drawn points (single stroke)
 */
export const createPathFromPoints = (points, id, settings) => {
  if (points.length < 2) return null;

  let pathString = `M ${points[0].x} ${points[0].y}`;
  
  if (settings.smoothing && points.length > 2) {
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      pathString += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    const lastPoint = points[points.length - 1];
    pathString += ` L ${lastPoint.x} ${lastPoint.y}`;
  } else {
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
    originX: 'center',
    originY: 'center',
  });

  return path;
};

/**
 * Create a COMPOUND path from multiple stroke arrays.
 * Each stroke is an array of points. All strokes become subpaths
 * in a single SVG path (separated by M commands).
 * This allows drawing a complex shape (like a dumbbell) in multiple 
 * strokes that become ONE timeline object.
 */
export const createCompoundPathFromStrokes = (strokes, id, settings) => {
  if (!strokes || strokes.length === 0) return null;

  let pathString = '';

  strokes.forEach((points, strokeIndex) => {
    if (points.length < 2) return;

    if (pathString.length > 0) pathString += ' ';

    pathString += `M ${points[0].x} ${points[0].y}`;

    if (settings.smoothing && points.length > 2) {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        pathString += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
      }
      const lastPoint = points[points.length - 1];
      pathString += ` L ${lastPoint.x} ${lastPoint.y}`;
    } else {
      for (let i = 1; i < points.length; i++) {
        pathString += ` L ${points[i].x} ${points[i].y}`;
      }
    }
  });

  if (!pathString) return null;

  const path = new fabric.Path(pathString, {
    id,
    stroke: settings.color,
    strokeWidth: settings.strokeWidth,
    fill: '',
    strokeLineCap: 'round',
    strokeLineJoin: 'round',
    selectable: true,
    originX: 'center',
    originY: 'center',
  });

  return path;
};

/**
 * Extract properties from a Fabric.js object.
 * 
 * USES left/top DIRECTLY — this is the ORIGIN POINT position.
 * Also extracts zIndex from canvas object order.
 */
export const extractPropertiesFromFabricObject = (fabricObject) => {
  if (!fabricObject) return null;

  // Get zIndex from canvas object order
  let zIndex = 0;
  if (fabricObject.canvas) {
    const objects = fabricObject.canvas.getObjects();
    zIndex = objects.indexOf(fabricObject);
    if (zIndex < 0) zIndex = 0;
  }

  const baseProps = {
    x: fabricObject.left || 0,
    y: fabricObject.top || 0,
    scaleX: fabricObject.scaleX || 1,
    scaleY: fabricObject.scaleY || 1,
    rotation: fabricObject.angle || 0,
    opacity: fabricObject.opacity !== undefined ? fabricObject.opacity : 1,
    zIndex,
  };
  
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

/**
 * Properly ungroup a Fabric.js group.
 */
export const ungroupFabricGroup = (fabricCanvas, group) => {
  if (!fabricCanvas || !group || group.type !== 'group') return [];

  const items = [...(group._objects || [])];
  if (items.length === 0) return [];
  
  const groupMatrix = group.calcTransformMatrix();
  const groupScaleX = group.scaleX || 1;
  const groupScaleY = group.scaleY || 1;
  const groupAngle = group.angle || 0;
  const groupOpacity = group.opacity !== undefined ? group.opacity : 1;

  const childrenData = items.map(item => {
    const localPoint = { x: item.left || 0, y: item.top || 0 };
    const absPoint = fabric.util.transformPoint(localPoint, groupMatrix);
    
    return {
      item,
      absLeft: absPoint.x,
      absTop: absPoint.y,
      absScaleX: groupScaleX * (item.scaleX || 1),
      absScaleY: groupScaleY * (item.scaleY || 1),
      absAngle: groupAngle + (item.angle || 0),
      absOpacity: groupOpacity * (item.opacity !== undefined ? item.opacity : 1),
    };
  });

  fabricCanvas.remove(group);

  const restoredItems = [];
  childrenData.forEach(({ item, absLeft, absTop, absScaleX, absScaleY, absAngle, absOpacity }) => {
    item.group = undefined;
    item.canvas = undefined;
    if (item._cacheCanvas) {
      item._cacheCanvas = null;
    }
    
    item.set({
      left: absLeft,
      top: absTop,
      scaleX: absScaleX,
      scaleY: absScaleY,
      angle: absAngle,
      opacity: absOpacity,
      originX: 'center',
      originY: 'center',
      visible: true,
      selectable: true,
      evented: true,
    });
    
    item.dirty = true;
    fabricCanvas.add(item);
    item.setCoords();
    restoredItems.push(item);
  });

  fabricCanvas.requestRenderAll();
  return restoredItems;
};

/**
 * Change the anchor/pivot point of a Fabric.js object.
 */
export const changeAnchorPoint = (fabricObject, anchorX, anchorY) => {
  if (!fabricObject) return;
  
  const currentCenter = fabricObject.getCenterPoint();
  
  const isCenter = Math.abs(anchorX - 0.5) < 0.01 && Math.abs(anchorY - 0.5) < 0.01;
  
  if (!fabricObject._hasCustomControls) {
    fabricObject.controls = Object.assign({}, fabricObject.controls);
    fabricObject._hasCustomControls = true;
  }
  
  const existingMtr = fabricObject.controls.mtr;
  
  if (isCenter) {
    fabricObject.centeredRotation = true;
    fabricObject.set({
      originX: 'center',
      originY: 'center',
    });
    
    fabricObject.controls.mtr = new fabric.Control({
      x: 0,
      y: -0.5,
      offsetY: existingMtr?.offsetY ?? -40,
      cursorStyleHandler: existingMtr?.cursorStyleHandler,
      actionHandler: existingMtr?.actionHandler,
      actionName: 'rotate',
      withConnection: true,
    });
    
  } else {
    fabricObject.centeredRotation = false;
    fabricObject.set({
      originX: anchorX,
      originY: anchorY,
    });
    
    fabricObject.controls.mtr = new fabric.Control({
      x: anchorX - 0.5,
      y: anchorY - 0.5,
      offsetY: existingMtr?.offsetY ?? -40,
      cursorStyleHandler: existingMtr?.cursorStyleHandler,
      actionHandler: existingMtr?.actionHandler,
      actionName: 'rotate',
      withConnection: true,
    });
  }
  
  fabricObject.setPositionByOrigin(
    new fabric.Point(currentCenter.x, currentCenter.y),
    'center',
    'center'
  );
  
  fabricObject.dirty = true;
  fabricObject.setCoords();
};