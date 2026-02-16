import { applyEasing } from './easing';

/**
 * Linear interpolation between two values
 */
export const lerp = (start, end, t) => {
  return start + (end - start) * t;
};

/**
 * Normalize an angle delta to [-180, 180] so animations take the shortest path.
 * 
 * Example: 0° to 289° → delta 289 → normalized to -71° (short counterclockwise)
 * Without this: GSAP/lerp animates 289° clockwise (nearly full rotation)
 * With this: animates 71° counterclockwise (correct pendulum swing)
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
 * Interpolate properties between two keyframes at a given time with easing.
 * Rotation is normalized to take the shortest angular path.
 */
export const interpolateProperties = (beforeKf, afterKf, time, easingType = 'linear') => {
  if (!beforeKf || !afterKf) return null;
  
  if (beforeKf.time === afterKf.time) {
    return beforeKf.properties;
  }

  const rawT = (time - beforeKf.time) / (afterKf.time - beforeKf.time);
  const t = applyEasing(rawT, easingType);

  // Normalize rotation to take shortest path
  const normalizedRotation = normalizeAngle(
    beforeKf.properties.rotation, 
    afterKf.properties.rotation
  );

  return {
    x: lerp(beforeKf.properties.x, afterKf.properties.x, t),
    y: lerp(beforeKf.properties.y, afterKf.properties.y, t),
    scaleX: lerp(beforeKf.properties.scaleX, afterKf.properties.scaleX, t),
    scaleY: lerp(beforeKf.properties.scaleY, afterKf.properties.scaleY, t),
    rotation: lerp(beforeKf.properties.rotation, normalizedRotation, t),
    opacity: lerp(beforeKf.properties.opacity, afterKf.properties.opacity, t),
  };
};

/**
 * Apply interpolated properties to a Fabric.js object.
 * Sets left/top directly (origin point position).
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

/**
 * Pre-process keyframes to normalize rotation values for animation.
 * Each rotation is adjusted relative to the previous keyframe to take
 * the shortest angular path. Returns a new array (does not mutate input).
 * 
 * Used by LivePreview and codeGenerator before building GSAP timelines.
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