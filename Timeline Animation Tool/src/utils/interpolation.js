// Phase-1& 2 interpolation code

// /**
//  * Linear interpolation between two values
//  */
// export const lerp = (start, end, t) => {
//   return start + (end - start) * t;
// };

// /**
//  * Find keyframes surrounding a given time
//  */
// export const findSurroundingKeyframes = (keyframes, time) => {
//   if (keyframes.length === 0) return { before: null, after: null };
  
//   let before = null;
//   let after = null;

//   for (const kf of keyframes) {
//     if (kf.time <= time) before = kf;
//     if (kf.time >= time && !after) after = kf;
//   }

//   // Handle edge cases
//   if (!before && after) before = after;
//   if (before && !after) after = before;

//   return { before, after };
// };

// /**
//  * Interpolate properties between two keyframes at a given time
//  */
// export const interpolateProperties = (beforeKf, afterKf, time) => {
//   if (!beforeKf || !afterKf) return null;
  
//   // If same keyframe or no time difference
//   if (beforeKf.time === afterKf.time) {
//     return beforeKf.properties;
//   }

//   // Calculate interpolation factor
//   const t = (time - beforeKf.time) / (afterKf.time - beforeKf.time);

//   // Interpolate each property
//   return {
//     x: lerp(beforeKf.properties.x, afterKf.properties.x, t),
//     y: lerp(beforeKf.properties.y, afterKf.properties.y, t),
//     scaleX: lerp(beforeKf.properties.scaleX, afterKf.properties.scaleX, t),
//     scaleY: lerp(beforeKf.properties.scaleY, afterKf.properties.scaleY, t),
//     rotation: lerp(beforeKf.properties.rotation, afterKf.properties.rotation, t),
//     opacity: lerp(beforeKf.properties.opacity, afterKf.properties.opacity, t),
//   };
// };

// /**
//  * Apply interpolated properties to a Fabric.js object
//  */
// export const applyPropertiesToFabricObject = (fabricObject, properties) => {
//   if (!fabricObject || !properties) return;

//   fabricObject.set({
//     left: properties.x,
//     top: properties.y,
//     scaleX: properties.scaleX,
//     scaleY: properties.scaleY,
//     angle: properties.rotation,
//     opacity: properties.opacity,
//   });
// };

// Phase-3 interpolation code:

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
  
  // If same keyframe or no time difference
  if (beforeKf.time === afterKf.time) {
    return beforeKf.properties;
  }

  // Calculate interpolation factor
  const rawT = (time - beforeKf.time) / (afterKf.time - beforeKf.time);
  
  // Apply easing function
  const t = applyEasing(rawT, easingType);

  // Interpolate each property
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
 * Apply interpolated properties to a Fabric.js object
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