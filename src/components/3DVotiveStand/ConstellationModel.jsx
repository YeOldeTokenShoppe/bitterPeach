import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

// Preload the models
useGLTF.preload("/marketFight.glb");
useGLTF.preload("/whale.glb");
useGLTF.preload("/starCandles.glb");

function ConstellationModel({ isVisible = false }) {
  const { camera } = useThree();
  // Load all three models
  const { scene: marketScene } = useGLTF("/marketFight.glb");
  const { scene: whaleScene } = useGLTF("/whale.glb");
  const { scene: starCandlesScene } = useGLTF("/starCandles.glb");
  const groupRef = useRef();
  const whaleModelRef = useRef();

  // Set up the models when they load
  useEffect(() => {
    // Ensure all scenes are loaded
    if (!marketScene || !whaleScene || !starCandlesScene) return;

    // Create copies to avoid modifying cached originals
    const marketClone = marketScene.clone();
    const whaleClone = whaleScene.clone();
    const starCandlesClone = starCandlesScene.clone();

    // Helper function to process models
    const processModel = (modelScene, namePrefix = "", position = [0, 0, 0], scale = [1, 1, 1]) => {
      modelScene.traverse((child) => {
        if (child.isMesh) {
          // Configure all meshes for better rendering in background
          child.castShadow = false;
          child.receiveShadow = false;
          child.renderOrder = -1; // Render behind other objects
          child.visible = isVisible;

          if (child.material) {
            child.material.transparent = true;
            
            // Handle specific opacity settings based on mesh type
            if (child.name.startsWith("RedStar") || child.name.startsWith("GreenStar")) {
              child.scale.set(0.12, 0.12, 0.12);
              child.material.opacity = isVisible ? 0.002 : 0;
            } else if (child.name.startsWith("Bear")) {
              child.material.opacity = isVisible ? 0.15 : 0;
            } else if (modelScene === starCandlesClone) {
              child.material.opacity = isVisible ? 0.1 : 0;
            } else if (modelScene === whaleClone) {
              child.material.opacity = isVisible ? 0.15 : 0;
            } else {
              child.material.opacity = isVisible ? 0.008 : 0;
            }
          }
        }
      });

      // Set model's position and scale relative to the group
      modelScene.position.set(...position);
      modelScene.scale.set(...scale);
      groupRef.current.add(modelScene);
    };

    // Process and position each model
    processModel(marketClone, "Market", [10, 0, 0], [1, 1, 1]);
    processModel(whaleClone, "Whale", [18, -1, 34], [1, 1, 1]);
    processModel(starCandlesClone, "StarCandles", [-10, 3, 27], [1.3, 1.3, 1.3]);

    // Store whale model reference and set its rotation
    whaleModelRef.current = whaleClone;
    whaleClone.rotation.y = Math.PI / 4;
    whaleClone.rotation.x = Math.PI / 12;

    // Position the entire constellation group
    groupRef.current.position.z = -300;
    groupRef.current.scale.set(30, 30, 30);

    return () => {
      // Clean up all models
      [marketClone, whaleClone, starCandlesClone].forEach(scene => {
        if (groupRef.current) {
          groupRef.current.remove(scene);
        }
        scene.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      });
    };
  }, [marketScene, whaleScene, starCandlesScene, isVisible]);

  // Update visibility whenever isVisible changes
  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.traverse((child) => {
      if (child.isMesh) {
        child.visible = isVisible;
        
        if (child.material) {
          child.material.transparent = true;
          if (child.name.startsWith("RedStar") || child.name.startsWith("GreenStar")) {
            child.material.opacity = isVisible ? 0.002 : 0;
          } else if (child.name.startsWith("Bear")) {
            child.material.opacity = isVisible ? 0.15 : 0;
          } else if (child.name.includes("StarCandles")) {
            child.material.opacity = isVisible ? 0.1 : 0;
          } else if (child.name.includes("Whale")) {
            child.material.opacity = isVisible ? 0.15 : 0;
          } else {
            child.material.opacity = isVisible ? 0.008 : 0;
          }
        }
      }
    });
  }, [isVisible]);

  return <group ref={groupRef} />;
}

export default ConstellationModel;
