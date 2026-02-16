import { atom } from 'recoil';

// Canvas objects state - NOW SUPPORTS GROUPS
export const canvasObjectsState = atom({
  key: 'canvasObjectsState',
  default: [],
  // Structure: [{ 
  //   id, 
  //   type, // 'rectangle', 'circle', 'text', 'path', 'group'
  //   name, 
  //   children: [], // Only for groups - array of child object IDs
  //   anchorX: 0.5, // 0-1, where 0.5 is center (NEW)
  //   anchorY: 0.5  // 0-1, where 0.5 is center (NEW)
  // }]
});

// Keyframes state - NOW INCLUDES ANCHOR POINT
export const keyframesState = atom({
  key: 'keyframesState',
  default: {},
  // Structure: { [objectId]: [{ 
  //   time, 
  //   properties: {
  //     x, y, scaleX, scaleY, rotation, opacity,
  //     anchorX, anchorY // NEW - anchor point can be animated
  //   }
  // }] }
});

// Selected object state
export const selectedObjectState = atom({
  key: 'selectedObjectState',
  default: null,
});

// Timeline state
export const currentTimeState = atom({
  key: 'currentTimeState',
  default: 0,
});

export const durationState = atom({
  key: 'durationState',
  default: 10,
});

export const isPlayingState = atom({
  key: 'isPlayingState',
  default: false,
});

// Canvas reference
export const fabricCanvasState = atom({
  key: 'fabricCanvasState',
  default: null,
  dangerouslyAllowMutability: true,
});

// Property values for selected object - NOW INCLUDES ANCHOR
export const selectedObjectPropertiesState = atom({
  key: 'selectedObjectPropertiesState',
  default: {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    anchorX: 0.5, // NEW
    anchorY: 0.5, // NEW
  },
});

// Easing function state for keyframes
export const keyframeEasingState = atom({
  key: 'keyframeEasingState',
  default: {},
});

// Loop playback state
export const loopPlaybackState = atom({
  key: 'loopPlaybackState',
  default: false,
});

// Timeline zoom level
export const timelineZoomState = atom({
  key: 'timelineZoomState',
  default: 1,
});

// Selected keyframe for editing
export const selectedKeyframeState = atom({
  key: 'selectedKeyframeState',
  default: null,
});

// Snap to keyframes setting
export const snapToKeyframesState = atom({
  key: 'snapToKeyframesState',
  default: false,
});

// Track if any objects are selected
export const hasActiveSelectionState = atom({
  key: 'hasActiveSelectionState',
  default: false,
});

// Drawing mode state
export const drawingModeState = atom({
  key: 'drawingModeState',
  default: false,
});

// Current drawing path
export const currentDrawingPathState = atom({
  key: 'currentDrawingPathState',
  default: null,
  dangerouslyAllowMutability: true,
});

// Drawing tool settings
export const drawingToolSettingsState = atom({
  key: 'drawingToolSettingsState',
  default: {
    color: '#000000',
    strokeWidth: 3,
    smoothing: true,
  },
});

// Anchor point editing mode (NEW)
export const anchorEditModeState = atom({
  key: 'anchorEditModeState',
  default: false,
});