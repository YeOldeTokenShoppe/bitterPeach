import { DEFAULT_CAMERA } from "./defaultCamera";
export const MODEL_SETTINGS = {
  modelCenter: {
    x: 0,
    y: 60.647,
    z: -1.42,
  },

  cachedCenter: null,

  getFlyInPosition: (screenCategory) => {
    const settings = DEFAULT_CAMERA[screenCategory];
    const center = MODEL_SETTINGS.modelCenter;

    return {
      startPosition: [
        center.x + 30, // Start far away
        center.y + 30,
        center.z + 30,
      ],
      // targetPosition: [
      //   center.x + settings.target[0],
      //   center.y + settings.target[1],
      //   center.z + settings.target[2],
      // ],
    };
  },
};
