import { applyEasing } from './easing';

/**
 * Linear interpolation between two values
 */
export const lerp = (start, end, t) => {
  return start + (end - start) * t;
};

/**
 * Normalize an angle delta to [-180, 180] so animations take the shortest path.
 */
const normalizeAngle = (prevAngle, nextAngle) => {
  let delta = nextAngle - prevAngle;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return prevAngle + delta;
};

/**
 * Find keyframes surrounding a given time
 */
export const findSurroundingKeyframes = (keyframes, time) => {
  if (keyframes.length === 0) return { before: null, after: null };
  
  let before = null;
  let after = null;

  for (const kf of keyframes) {
    if (kf.time <= time) before = kf;
    if (kf.time >= time && !after) after = kf;
  }

  if (!before && after) before = after;
  if (before && !after) after = before;

  return { before, after };
};

/**
 * Scan ALL objects' keyframes to find a unified z-swap point for the current time.
 * 
 * If ANY object whose z-index changes in its current time segment has a custom
 * zSwapPoint, that value is used for ALL objects. This ensures that when two
 * objects swap layers, they both switch at exactly the same moment.
 * 
 * @param {Object} allKeyframes - The full keyframes state: { [objectId]: [...kfs] }
 * @param {number} time - Current playback/scrub time
 * @returns {number|null} The global swap point (0-1), or null if no custom point found (use per-keyframe defaults)
 */
export const findGlobalZSwapPoint = (allKeyframes, time) => {
  let globalSwapPoint = null;

  for (const objId of Object.keys(allKeyframes)) {
    const kfs = allKeyframes[objId];
    if (!kfs || kfs.length < 2) continue;

    const { before, after } = findSurroundingKeyframes(kfs, time);
    if (!before || !after || before === after) continue;

    // Only consider objects whose z-index actually changes in this segment
    const beforeZ = before.properties.zIndex ?? 0;
    const afterZ = after.properties.zIndex ?? 0;
    if (beforeZ === afterZ) continue;

    // If this keyframe has a custom swap point, adopt it globally
    if (after.zSwapPoint !== undefined && after.zSwapPoint !== null) {
      // If we already found one, pick the earliest (smallest) to be safe
      if (globalSwapPoint === null) {
        globalSwapPoint = after.zSwapPoint;
      } else {
        globalSwapPoint = Math.min(globalSwapPoint, after.zSwapPoint);
      }
    }
  }

  return globalSwapPoint;
};

/**
 * Interpolate properties between two keyframes at a given time with easing.
 * Rotation is normalized to take the shortest angular path.
 * zIndex uses step interpolation at a configurable swap point.
 * 
 * @param {Object} beforeKf - The keyframe before (or at) the current time
 * @param {Object} afterKf - The keyframe after (or at) the current time
 * @param {number} time - Current time
 * @param {string} easingType - Easing function name
 * @param {number|null} globalZSwapPoint - If provided, overrides the per-keyframe zSwapPoint
 */
export const interpolateProperties = (beforeKf, afterKf, time, easingType = 'linear', globalZSwapPoint = null) => {
  if (!beforeKf || !afterKf) return null;
  
  if (beforeKf.time === afterKf.time) {
    return beforeKf.properties;
  }

  const rawT = (time - beforeKf.time) / (afterKf.time - beforeKf.time);
  const t = applyEasing(rawT, easingType);

  const normalizedRotation = normalizeAngle(
    beforeKf.properties.rotation, 
    afterKf.properties.rotation
  );

  // zIndex uses step interpolation — snaps at the swap point.
  // globalZSwapPoint (from scanning all objects) takes priority,
  // then the keyframe's own zSwapPoint, then default 0.5.
  const beforeZ = beforeKf.properties.zIndex ?? 0;
  const afterZ = afterKf.properties.zIndex ?? 0;
  const swapPoint = globalZSwapPoint ?? afterKf.zSwapPoint ?? 0.5;
  const interpolatedZ = rawT < swapPoint ? beforeZ : afterZ;

  return {
    x: lerp(beforeKf.properties.x, afterKf.properties.x, t),
    y: lerp(beforeKf.properties.y, afterKf.properties.y, t),
    scaleX: lerp(beforeKf.properties.scaleX, afterKf.properties.scaleX, t),
    scaleY: lerp(beforeKf.properties.scaleY, afterKf.properties.scaleY, t),
    rotation: lerp(beforeKf.properties.rotation, normalizedRotation, t),
    opacity: lerp(beforeKf.properties.opacity, afterKf.properties.opacity, t),
    zIndex: interpolatedZ,
  };
};

/**
 * Apply interpolated properties to a Fabric.js object.
 * Sets left/top directly (origin point position).
 * Applies zIndex by reordering on canvas.
 */
export const applyPropertiesToFabricObject = (fabricObject, properties) => {
  if (!fabricObject || !properties) return;

  fabricObject.set({
    left: properties.x,
    top: properties.y,
    scaleX: properties.scaleX,
    scaleY: properties.scaleY,
    angle: properties.rotation,
    opacity: properties.opacity,
  });

  // Store target zIndex for batch reordering
  if (properties.zIndex !== undefined) {
    fabricObject._targetZIndex = properties.zIndex;
  }
};

/**
 * Reorder canvas objects based on their _targetZIndex values.
 * Call this once per frame after applying all interpolated properties.
 */
export const applyZIndexOrdering = (fabricCanvas) => {
  if (!fabricCanvas) return;
  
  const objects = fabricCanvas.getObjects();
  const objectsWithZIndex = objects.filter(obj => obj._targetZIndex !== undefined);
  
  if (objectsWithZIndex.length === 0) return;
  
  // Sort by target zIndex
  objectsWithZIndex.sort((a, b) => (a._targetZIndex || 0) - (b._targetZIndex || 0));
  
  // Apply ordering using Fabric v6 API
  objectsWithZIndex.forEach((obj) => {
    try {
      if (typeof fabricCanvas.bringObjectToFront === 'function') {
        fabricCanvas.bringObjectToFront(obj);
      }
    } catch (e) {
      // Silently ignore if method not available
    }
  });
};

/**
 * Snap time to nearest keyframe
 */
export const snapToNearestKeyframe = (time, keyframes, threshold = 0.1) => {
  if (keyframes.length === 0) return time;
  
  let nearest = time;
  let minDistance = threshold;
  
  for (const kf of keyframes) {
    const distance = Math.abs(kf.time - time);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = kf.time;
    }
  }
  
  return nearest;
};

/**
 * Pre-process keyframes to normalize rotation values for animation.
 * Used by LivePreview and codeGenerator before building GSAP timelines.
 * Preserves all keyframe-level properties (easing, zSwapPoint, etc).
 */
export const normalizeKeyframeRotations = (keyframes) => {
  if (!keyframes || keyframes.length < 2) return keyframes;
  
  const normalized = [keyframes[0]];
  
  for (let i = 1; i < keyframes.length; i++) {
    const prevRotation = normalized[i - 1].properties.rotation;
    const currRotation = keyframes[i].properties.rotation;
    const normalizedRotation = normalizeAngle(prevRotation, currRotation);
    
    if (normalizedRotation === currRotation) {
      normalized.push(keyframes[i]);
    } else {
      normalized.push({
        ...keyframes[i],
        properties: {
          ...keyframes[i].properties,
          rotation: normalizedRotation,
        }
      });
    }
  }
  
  return normalized;
};