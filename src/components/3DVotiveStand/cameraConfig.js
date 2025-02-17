import * as THREE from "three";

// Base camera views
export const CAMERA_VIEWS = {
  desktop: {
    position: [35.5, 14.86, 72.4],
    target: [0, 17, 0],
    fov: 33,
  },
  tablet: {
    position: [35.5, 14.86, 72.4],
    target: [0, 17, 0],
    fov: 33,
  },
  phone: {
    position: [33.4, 20.41, 55.2], // Closer view for phones
    target: [0, 17, 0],
    fov: 45, // Slightly wider FOV for better mobile viewing
  },
};

// Screen breakpoints
export const SCREEN_BREAKPOINTS = {
  phone: 576, // Renamed from mobile for consistency
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

// Camera settings per device type
export const CAMERA_SETTINGS = {
  // Phone settings
  "phone-small-landscape": {
    ...CAMERA_VIEWS.phone,
    maxDistance: 70,
    minDistance: 5,
  },
  "phone-small-portrait": {
    ...CAMERA_VIEWS.phone,
    maxDistance: 40,
    minDistance: 5,
  },
  // Tablet settings (rest remain the same)
  "tablet-small-landscape": {
    ...CAMERA_VIEWS.tablet,
    maxDistance: 90,
    minDistance: 5,
  },
  "tablet-small-portrait": {
    ...CAMERA_VIEWS.tablet,
    maxDistance: 50,
    minDistance: 5,
  },
  "tablet-medium-landscape": {
    ...CAMERA_VIEWS.tablet,
    maxDistance: 90,
    minDistance: 5,
  },
  "tablet-medium-portrait": {
    ...CAMERA_VIEWS.tablet,
    maxDistance: 50,
    minDistance: 5,
  },
  "tablet-large-landscape": {
    ...CAMERA_VIEWS.tablet,
    maxDistance: 90,
    minDistance: 5,
  },
  "tablet-large-portrait": {
    ...CAMERA_VIEWS.tablet,
    maxDistance: 50,
    minDistance: 5,
  },
  // Desktop settings
  "desktop-small": {
    ...CAMERA_VIEWS.desktop,
    maxDistance: 100,
    minDistance: 10,
  },
  "desktop-medium": {
    ...CAMERA_VIEWS.desktop,
    maxDistance: 100,
    minDistance: 10,
  },
  "desktop-large": {
    ...CAMERA_VIEWS.desktop,
    maxDistance: 100,
    minDistance: 10,
  },
};

// Rest of the common settings remain the same
export const COMMON_SETTINGS = {
  near: 0.1,
  far: 500,
  minPolarAngle: 0,
  maxPolarAngle: Math.PI / 1.5,
  enableZoom: true,
  enablePan: false,
  enableDamping: true,
  dampingFactor: 0.05,
  gl: {
    antialias: true,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1,
  },
};

export const getScreenCategory = () => {
  if (typeof window === "undefined") {
    return "desktop-medium";
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const isLandscape = width > height;

  if (width < SCREEN_BREAKPOINTS.phone) {
    return isLandscape ? "phone-small-landscape" : "phone-small-portrait";
  } else if (width < SCREEN_BREAKPOINTS.tablet) {
    return isLandscape ? "tablet-small-landscape" : "tablet-small-portrait";
  } else if (width < SCREEN_BREAKPOINTS.desktop) {
    return "desktop-small";
  } else if (width < SCREEN_BREAKPOINTS.wide) {
    return "desktop-medium";
  }
  return "desktop-large";
};

export const getCameraConfig = () => {
  const category = getScreenCategory();
  const settings = CAMERA_SETTINGS[category];
  return {
    ...COMMON_SETTINGS,
    ...settings,
  };
};
export const formatCameraPosition = (position, target, fov) => {
  return {
    position: {
      x: Number(position.x.toFixed(3)),
      y: Number(position.y.toFixed(3)),
      z: Number(position.z.toFixed(3)),
    },
    target: {
      x: Number(target.x.toFixed(3)),
      y: Number(target.y.toFixed(3)),
      z: Number(target.z.toFixed(3)),
    },
    fov: Number(fov.toFixed(3)),
  };
};
