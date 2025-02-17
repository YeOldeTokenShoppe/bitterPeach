// // cameraSettings.js
// import * as THREE from "three";

// export const CAMERA_SETTINGS = {
//   main: {
//     position: [-4.03, 25.2, 64.78],
//     target: [-1.6, 19.2, 37.38],
//     fov: 42.4,
//   },
//   controls: {
//     enableDamping: false,
//     enablePan: false,
//     minDistance: 30,
//     maxDistance: 100,
//     minPolarAngle: 0,
//     maxPolarAngle: Math.PI / 1.5,
//   },
// };

// // Helper functions
// export const setupCamera = (camera, settings = CAMERA_SETTINGS.main) => {
//   if (!camera) return;

//   camera.position.set(...settings.position);
//   camera.fov = settings.fov;
//   camera.updateProjectionMatrix();

//   return camera;
// };

// export const setupControls = (
//   controls,
//   settings = CAMERA_SETTINGS.controls
// ) => {
//   if (!controls) return;

//   Object.assign(controls, settings);
//   controls.target.set(...CAMERA_SETTINGS.main.target);
//   controls.update();

//   return controls;
// };
