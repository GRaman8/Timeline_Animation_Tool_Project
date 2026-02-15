import { applyEasing } from './easing';

/**
 * Linear interpolation between two values
 */
export const lerp = (start, end, t) => {
  return start + (end - start) * t;
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

  // Handle edge cases
  if (!before && after) before = after;
  if (before && !after) after = before;

  return { before, after };
};

/**
 * Interpolate properties between two keyframes at a given time with easing
 */
export const interpolateProperties = (beforeKf, afterKf, time, easingType = 'linear') => {
  if (!beforeKf || !afterKf) return null;
  
  if (beforeKf.time === afterKf.time) {
    return beforeKf.properties;
  }

  const rawT = (time - beforeKf.time) / (afterKf.time - beforeKf.time);
  const t = applyEasing(rawT, easingType);

  return {
    x: lerp(beforeKf.properties.x, afterKf.properties.x, t),
    y: lerp(beforeKf.properties.y, afterKf.properties.y, t),
    scaleX: lerp(beforeKf.properties.scaleX, afterKf.properties.scaleX, t),
    scaleY: lerp(beforeKf.properties.scaleY, afterKf.properties.scaleY, t),
    rotation: lerp(beforeKf.properties.rotation, afterKf.properties.rotation, t),
    opacity: lerp(beforeKf.properties.opacity, afterKf.properties.opacity, t),
  };
};

/**
 * FIXED: Do NOT change originX/originY during animation.
 * Changing origin from 'center' (string) to 0.5 (number) causes Fabric.js
 * to recalculate the object's position, resulting in a visible jump/misalignment.
 * Origin should only be changed explicitly by the anchor point editor.
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
    // DO NOT set originX/originY here - it causes position jumps
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