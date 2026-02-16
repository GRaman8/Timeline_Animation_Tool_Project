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
 * Uses getCenterPoint() to always get the TRUE visual center,
 * regardless of what originX/originY is set to.
 */
export const extractPropertiesFromFabricObject = (fabricObject) => {
  if (!fabricObject) return null;

  const center = fabricObject.getCenterPoint();

  const baseProps = {
    x: center.x,
    y: center.y,
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
 * 
 * WHY THE PREVIOUS VERSION DIDN'T WORK:
 * 
 * Problem 1: centeredRotation defaults to TRUE in Fabric.js.
 *   When true, rotation ALWAYS happens around the geometric center,
 *   completely ignoring originX/originY. Must set to false.
 * 
 * Problem 2: The rotation handle (mtr control) position is NOT tied
 *   to originX/originY. It's a separate Control object with its own
 *   x/y coordinates. Must be repositioned explicitly.
 * 
 * Problem 3: Controls are shared by prototype. Changing one object's
 *   mtr affects all objects. Must create per-object controls copy.
 * 
 * @param {fabric.Object} fabricObject - The Fabric.js object
 * @param {number} anchorX - 0=left, 0.5=center, 1=right
 * @param {number} anchorY - 0=top, 0.5=center, 1=bottom
 */
export const changeAnchorPoint = (fabricObject, anchorX, anchorY) => {
  if (!fabricObject) return;
  
  // Save current visual center BEFORE changing anything
  const currentCenter = fabricObject.getCenterPoint();
  
  const isCenter = Math.abs(anchorX - 0.5) < 0.01 && Math.abs(anchorY - 0.5) < 0.01;
  
  // ===== STEP 1: Create per-object controls copy (only once) =====
  // Controls are shared via prototype. Without this, changing mtr on one
  // object would affect ALL objects of the same type.
  if (!fabricObject._hasCustomControls) {
    fabricObject.controls = Object.assign({}, fabricObject.controls);
    fabricObject._hasCustomControls = true;
  }
  
  // Save reference to existing mtr control to copy its handlers
  const existingMtr = fabricObject.controls.mtr;
  
  if (isCenter) {
    // ===== RESET to default center rotation =====
    fabricObject.centeredRotation = true;
    fabricObject.set({
      originX: 'center',
      originY: 'center',
    });
    
    // Restore default mtr at top-center (x=0, y=-0.5)
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
    // ===== SET custom anchor point =====
    
    // STEP 2: Disable centered rotation
    // This makes Fabric.js use originX/originY as the rotation pivot
    // instead of always rotating around the geometric center
    fabricObject.centeredRotation = false;
    
    // STEP 3: Set origin to the anchor position
    // Fabric.js 6 accepts numeric values: 0=left/top, 0.5=center, 1=right/bottom
    fabricObject.set({
      originX: anchorX,
      originY: anchorY,
    });
    
    // STEP 4: Reposition the mtr (rotation) control handle
    // Control x/y range: [-0.5, 0.5] where -0.5=left/top, 0=center, 0.5=right/bottom
    // Our anchor range: [0, 1] where 0=left/top, 0.5=center, 1=right/bottom
    // Conversion: controlPos = anchorPos - 0.5
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
  
  // ===== STEP 5: Compensate position =====
  // Changing origin changes what left/top means, which would move the object.
  // setPositionByOrigin places the object so its CENTER stays at currentCenter.
  fabricObject.setPositionByOrigin(
    new fabric.Point(currentCenter.x, currentCenter.y),
    'center',
    'center'
  );
  
  // ===== STEP 6: Recalculate everything =====
  fabricObject.dirty = true;
  fabricObject.setCoords();
};