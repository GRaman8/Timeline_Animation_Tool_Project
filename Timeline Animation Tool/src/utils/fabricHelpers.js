import * as fabric from 'fabric';

/**
 * Create a new Fabric.js object based on type.
 * ALL objects use originX:'center', originY:'center' so left/top = center.
 */
export const createFabricObject = (type, id) => {
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
      return null;
      
    default:
      return null;
  }
};

/**
 * Create a path object from drawn points
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
 * Extract properties from a Fabric.js object.
 * 
 * Since ALL objects (including groups) are created with originX:'center',
 * left/top directly gives us the center position. Simple and consistent.
 */
export const extractPropertiesFromFabricObject = (fabricObject) => {
  if (!fabricObject) return null;

  const baseProps = {
    x: fabricObject.left || 0,
    y: fabricObject.top || 0,
    scaleX: fabricObject.scaleX || 1,
    scaleY: fabricObject.scaleY || 1,
    rotation: fabricObject.angle || 0,
    opacity: fabricObject.opacity !== undefined ? fabricObject.opacity : 1,
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
 * 
 * Strategy: compute absolute position for each child using the group's
 * transform matrix, then remove the group, then add each child back
 * as an independent object with forced clean state.
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

  // Pre-calculate absolute transforms for each child BEFORE removing group
  const childrenData = items.map(item => {
    // Get child's local position (relative to group center)
    const localPoint = { x: item.left || 0, y: item.top || 0 };
    
    // Transform to absolute canvas coordinates using group matrix
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

  // Remove group from canvas
  fabricCanvas.remove(group);

  // Add each child back as independent object
  const restoredItems = [];
  childrenData.forEach(({ item, absLeft, absTop, absScaleX, absScaleY, absAngle, absOpacity }) => {
    // CRITICAL: Clear ALL stale internal references from the group
    // This is the fix for objects disappearing after ungrouping
    item.group = undefined;
    item.canvas = undefined;
    if (item._cacheCanvas) {
      item._cacheCanvas = null;
    }
    
    // Set absolute position and transforms
    item.set({
      left: absLeft,
      top: absTop,
      scaleX: absScaleX,
      scaleY: absScaleY,
      angle: absAngle,
      opacity: absOpacity,
      // Ensure center origin is maintained
      originX: 'center',
      originY: 'center',
      // Force visibility
      visible: true,
      selectable: true,
      evented: true,
    });
    
    // Mark as needing full recalculation
    item.dirty = true;
    
    // Add to canvas
    fabricCanvas.add(item);
    
    // Recalculate controls/bounds
    item.setCoords();
    
    restoredItems.push(item);
  });

  fabricCanvas.requestRenderAll();
  return restoredItems;
};