export const CONTROL_SETTINGS = {
  default: {
    // enableRotate: true,
    // rotateSpeed: 0.1,

    autoRotate: false,
    enableDamping: true,
    dampingFactor: 0.03,
    minDistance: 0, // Single definition
    maxDistance: 50, // Single definition
    minPolarAngle: -Math.PI / 1.6,
    maxPolarAngle: Math.PI / 1.6,
    enablePan: true,
    enableZoom: true,
    zoomSpeed: 0.5,
    // Add touch-specific settings
    touchAngularSensitivity: 2,
    touchZoomSensitivity: 2,
    // enableTouchRotate: true,
    enableTouchZoom: true,
  },
  guiMode: {
    autoRotate: false,
    enableDamping: false,
    minDistance: 0,
    // maxDistance: Infinity,
    minPolarAngle: -Math.PI / 1.6,
    maxPolarAngle: Math.PI / 1.6,
    enablePan: true,
    enableZoom: true,
    zoomSpeed: 0.5,
    // Same touch settings for consistency
    touchAngularSensitivity: 2,
    touchZoomSensitivity: 2,
    // enableTouchRotate: true,
    enableTouchZoom: true,
  },
};
