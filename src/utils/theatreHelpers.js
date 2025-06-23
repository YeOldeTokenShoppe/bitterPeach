// Theatre.js helper functions for camera animation

export const createCameraAnimation = (sheet, keyframes, totalDuration = 25) => {
  // Create camera object with properties
  const cameraObject = sheet.object('Camera', {
    position: {
      x: keyframes[0].position.x,
      y: keyframes[0].position.y,
      z: keyframes[0].position.z
    },
    target: {
      x: keyframes[0].target.x,
      y: keyframes[0].target.y,
      z: keyframes[0].target.z
    },
    fov: keyframes[0].fov
  });

  // Create keyframe data for Theatre.js
  const positionXKeyframes = [];
  const positionYKeyframes = [];
  const positionZKeyframes = [];
  const targetXKeyframes = [];
  const targetYKeyframes = [];
  const targetZKeyframes = [];
  const fovKeyframes = [];

  keyframes.forEach((keyframe) => {
    const time = keyframe.time * totalDuration;
    
    positionXKeyframes.push({ time, value: keyframe.position.x });
    positionYKeyframes.push({ time, value: keyframe.position.y });
    positionZKeyframes.push({ time, value: keyframe.position.z });
    targetXKeyframes.push({ time, value: keyframe.target.x });
    targetYKeyframes.push({ time, value: keyframe.target.y });
    targetZKeyframes.push({ time, value: keyframe.target.z });
    fovKeyframes.push({ time, value: keyframe.fov });
  });

  // Set keyframes programmatically
  sheet.sequence.attachAudio({
    source: 'none'
  });

  return cameraObject;
};