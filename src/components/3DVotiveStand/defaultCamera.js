import * as THREE from "three";

export const DEFAULT_CAMERA = {
  // iPad Mini and similar
  "tablet-small-landscape": {
    position: [-4.03, 25.2, 64.78],
    target: [-1.6, 19.2, 37.38],
    fov: 58,
  },
  "tablet-small-portrait": {
    position: [-0.42, 6.82, 25.4],
    target: [-0.6, 8, 14.5],
    fov: 58,
  },
  // iPad Air/Pro 11"
  "tablet-medium-landscape": {
    position: [-4.03, 25.2, 64.78],
    target: [-1.6, 19.2, 37.38],
    fov: 42.4,
  },
  "tablet-medium-portrait": {
    position: [-0.42, 6.82, 25.4],
    target: [-0.6, 8, 14.5],
    fov: 40.3,
  },
  // iPad Pro 12.9"
  "tablet-large-landscape": {
    position: [-4.03, 25.2, 64.78],
    target: [-1.6, 19.2, 37.38],
    fov: 42.4,
  },
  "tablet-large-portrait": {
    position: [-0.42, 6.82, 25.4],
    target: [-0.6, 8, 14.5],
    fov: 40.3,
  },
  // Desktop sizes
  "desktop-small": {
    position: [-4.03, 25.2, 64.78],
    target: [-1.6, 19.2, 37.38],
    fov: 42.4,
  },
  "desktop-medium": {
    position: [-4.03, 25.2, 64.78],
    target: [-1.6, 19.2, 37.38],
    fov: 42.4,
  },
  "desktop-large": {
    position: [-4.03, 25.2, 64.78],
    target: [-1.6, 19.2, 37.38],
    fov: 42.4,
  },
  // Common settings for all screen sizes
  common: {
    near: 0.1,
    far: 200,
    gl: {
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1,
    },
  },
};

// Add this to defaultCamera.js after the DEFAULT_CAMERA object

export const getCameraSettings = (screenCategory) => {
  console.log("Getting camera settings for category:", screenCategory);

  const settings =
    DEFAULT_CAMERA[screenCategory] || DEFAULT_CAMERA["desktop-medium"];
  console.log("Selected camera settings:", {
    position: settings.position,
    target: settings.target,
    fov: settings.fov,
  });

  return {
    ...DEFAULT_CAMERA.common,
    ...settings,
  };
};
