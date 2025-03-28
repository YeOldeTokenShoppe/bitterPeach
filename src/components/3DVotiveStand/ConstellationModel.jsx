import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ConstellationModel = ({ is80sMode }) => {
  const constellationRef = useRef();
  const { scene } = useGLTF("/marketStars.glb");

  // Create refs for materials to animate
  const materialsRef = useRef(new Map());

  // Update materials for 80s mode and ensure proper rendering
  React.useEffect(() => {
    // Clear previous materials
    materialsRef.current.clear();

    scene.traverse((object) => {
      if (object.isMesh) {
        if (object.material) {
          // Clone the material to avoid affecting other instances
          object.material = object.material.clone();

          // Set emissive color based on mesh name
          if (object.name.startsWith("Bear")) {
            object.material.emissive = new THREE.Color(0xff0000); // Red
            // Store type for animation
            object.material.userData.type = "bear";
          } else if (object.name.startsWith("Bull")) {
            object.material.emissive = new THREE.Color(0x00ff00); // Green
            // Store type for animation
            object.material.userData.type = "bull";
          }

          // Base emissive intensity - we'll animate around this value
          const baseIntensity = is80sMode ? 5 : 3;
          object.material.emissiveIntensity = baseIntensity;

          // Store the base intensity and material for subtle animation
          materialsRef.current.set(object.material, {
            baseIntensity,
            phase: Math.random() * Math.PI * 2, // Random starting phase
            type: object.material.userData.type, // Store whether it's bull or bear
          });

          // Ensure it renders properly with other elements
          object.material.depthWrite = false;
          object.material.depthTest = true;
          object.material.transparent = true;
          object.material.opacity = 1;
          object.material.toneMapped = false;
        }

        object.scale.multiplyScalar(0.5);
      }
    });
  }, [scene, is80sMode]);

  // Add very subtle intensity variation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    materialsRef.current.forEach((data, material) => {
      // Very slow, subtle intensity variation
      const variation = Math.sin(time * 0.05 + data.phase) * 0.15; // 15% variation

      // Adjust base intensity based on type
      let typeIntensity = data.baseIntensity;
      if (data.type === "bull" && state.clock.elapsedTime % 10 < 5) {
        // Make bulls slightly brighter in first 5 seconds of every 10
        typeIntensity *= 1.2;
      } else if (data.type === "bear" && state.clock.elapsedTime % 10 >= 5) {
        // Make bears slightly brighter in last 5 seconds of every 10
        typeIntensity *= 1.2;
      }

      material.emissiveIntensity = typeIntensity * (1 + variation);
    });
  });

  return (
    <primitive
      ref={constellationRef}
      object={scene}
      scale={100}
      position={[0, 0, -100]}
      rotation={[0, Math.PI, 0]}
    />
  );
};

// Preload the model
useGLTF.preload("/marketStars.glb");

export default ConstellationModel;
