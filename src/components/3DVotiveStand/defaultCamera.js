// import * as THREE from "three";

// export const DEFAULT_CAMERA = {
//   // iPad Mini and similar
//   "tablet-small-landscape": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   "tablet-small-portrait": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   // iPad Air/Pro 11"
//   "tablet-medium-landscape": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   "tablet-medium-portrait": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   // iPad Pro 12.9"
//   "tablet-large-landscape": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   "tablet-large-portrait": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   // Desktop sizes
//   "desktop-small": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   "desktop-medium": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   "desktop-large": {
//     position: [0, 3, 18],
//     target: [0, 0, 0],
//     fov: 50,
//   },
//   // Common settings for all screen sizes
//   common: {
//     near: 0.1,
//     far: 200,
//     gl: {
//       antialias: true,
//       toneMapping: THREE.ACESFilmicToneMapping,
//       toneMappingExposure: 1,
//     },
//   },
// };

// // Add this to defaultCamera.js after the DEFAULT_CAMERA object

// export const getCameraSettings = (screenCategory) => {
//   console.log("Getting camera settings for category:", screenCategory);

//   const settings =
//     DEFAULT_CAMERA[screenCategory] || DEFAULT_CAMERA["desktop-medium"];
//   console.log("Selected camera settings:", {
//     position: settings.position,
//     target: settings.target,
//     fov: settings.fov,
//   });

//   return {
//     ...DEFAULT_CAMERA.common,
//     ...settings,
//   };
// };
