import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

function Lighting({
  lightPosition = { x: 32, y: 33, z: 89 },
  lightIntensity = 1.2,
  skyColor = 0x7300ff,
  groundColor = 0xff0000,
  parentLightIntensity,
  parentSkyColor,
  parentGroundColor,
  showLightHelper = false,
}) {
  const { scene } = useThree();
  const hemiLightRef = useRef();
  const lightHelperRef = useRef();

  useEffect(() => {
    // Convert hex string colors to numbers if they're provided as strings
    let skyColorValue = skyColor;
    let groundColorValue = groundColor;

    if (parentSkyColor && typeof parentSkyColor === "string") {
      skyColorValue = parseInt(parentSkyColor.replace("#", "0x"), 16);
    }

    if (parentGroundColor && typeof parentGroundColor === "string") {
      groundColorValue = parseInt(parentGroundColor.replace("#", "0x"), 16);
    }

    const hemiLight = new THREE.HemisphereLight(
      skyColorValue,
      groundColorValue,
      parentLightIntensity !== undefined ? parentLightIntensity : lightIntensity
    );
    hemiLight.position.set(lightPosition.x, lightPosition.y, lightPosition.z);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Add light helper if needed
    if (showLightHelper) {
      const helper = new THREE.HemisphereLightHelper(hemiLight, 5);
      scene.add(helper);
      lightHelperRef.current = helper;
    }

    // Add cleanup function
    return () => {
      if (hemiLightRef.current) {
        scene.remove(hemiLightRef.current);
      }

      if (lightHelperRef.current) {
        scene.remove(lightHelperRef.current);
      }
    };
  }, [
    lightPosition,
    lightIntensity,
    skyColor,
    groundColor,
    parentLightIntensity,
    parentSkyColor,
    parentGroundColor,
    scene,
    showLightHelper,
  ]);

  return null; // Lighting doesn't render any visible elements
}

export default Lighting;
