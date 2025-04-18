import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

// Preload the models
useGLTF.preload("/marketFight.glb");
useGLTF.preload("/whale.glb");
useGLTF.preload("/starCandles.glb");

function ConstellationModel({ isVisible = true }) {
  const { camera } = useThree();
  // Load all three models
  const { scene: marketScene } = useGLTF("/marketFight.glb");
  const { scene: whaleScene } = useGLTF("/whale.glb");
  const { scene: starCandlesScene } = useGLTF("/starCandles.glb");
  const groupRef = useRef();

  console.log("ConstellationModel rendered with isVisible:", isVisible);

  // Set up the models when they load
  useEffect(() => {
    // Ensure all scenes are loaded
    if (!marketScene || !whaleScene || !starCandlesScene) return;
    console.log("Setting up constellation models with isVisible:", isVisible);

    // Create copies to avoid modifying cached originals
    const marketClone = marketScene.clone();
    const whaleClone = whaleScene.clone();
    const starCandlesClone = starCandlesScene.clone();

    // Helper function to process models
    const processModel = (modelScene, namePrefix = "", initialVisible = true, position = [0, 0, 0], scale = [1, 1, 1]) => {
      console.log(`Processing model: ${namePrefix || 'market'}`);
      modelScene.traverse((child) => {
        if (child.isMesh) {
          console.log(`Mesh: ${child.name}`);
          // Configure all meshes for better rendering in background
          child.castShadow = false;
          child.receiveShadow = false;
          child.renderOrder = -1; // Render behind other objects

          // Handle specific logic for the original market/constellation model
          if (modelScene === marketClone) {
             // Add opacity to constellation lines (always slightly visible)
            if (
              child.material &&
              !child.name.startsWith("RedStar") &&
              !child.name.startsWith("GreenStar") &&
              !child.name.startsWith("Bear")
            ) {
              child.material.transparent = true;
              child.material.opacity = 0.015; // Keep lines consistently faint
              console.log(`Set constant opacity for ${child.name}`);
            }

            // Scale down red/green stars
            if (child.name.startsWith("RedStar") || child.name.startsWith("GreenStar")) {
               child.scale.set(0.15, 0.15, 0.15);
            }
          }

          // Ensure material exists and set transparency if needed for visibility toggling
          if (child.material) {
             // Check if material is an array
             if (Array.isArray(child.material)) {
                 child.material.forEach(mat => {
                     mat.transparent = true; // Enable transparency for potential visibility changes
                 });
             } else {
                 child.material.transparent = true; // Enable transparency for potential visibility changes
             }
          }

          // Set initial visibility based on the prop
          console.log(
            `Found object: ${child.name}, setting initial visible to ${initialVisible}`
          );
          child.visible = initialVisible;
        }
      });
      // Set model's position and scale relative to the group
      modelScene.position.set(...position);
      modelScene.scale.set(...scale);
      groupRef.current.add(modelScene); // Add processed model to the main group
    };

    // Process and position each model
    processModel(marketClone, "Market", isVisible, [10, 0, 0], [1, 1, 1]); // Center
    processModel(whaleClone, "Whale", isVisible, [18, -1, 34], [1 , 1, 1]); // Position left, slightly up/back, smaller scale
    processModel(starCandlesClone, "StarCandles", isVisible, [-10, 3, 27], [1.3,1.3, 1.3]); // Position right, higher up, slightly larger scale

    // Add rotation to the whale model
    whaleClone.rotation.y = Math.PI / 4; // Rotate 45 degrees around Y axis
    whaleClone.rotation.x = Math.PI / 12; // Rotate 15 degrees around X axis

    // Position the entire constellation group far behind the main scene
    groupRef.current.position.z = -300;
    // Scale down the entire group to be more subtle
    groupRef.current.scale.set(30, 30, 30);
    // groupRef.current.rotation.y = 0; // Optional rotation

    return () => {
      // Clean up all models
      const scenesToRemove = [marketClone, whaleClone, starCandlesClone];
      scenesToRemove.forEach(scene => {
         if (groupRef.current) {
             groupRef.current.remove(scene);
         }
         scene.traverse((child) => {
           if (child.geometry) child.geometry.dispose();
           if (child.material) {
             if (Array.isArray(child.material)) {
               child.material.forEach((material) => material.dispose());
             } else {
               child.material.dispose();
             }
           }
         });
      });
      console.log("Cleaned up constellation models");
    };
  }, [marketScene, whaleScene, starCandlesScene, isVisible]); // Depend on scenes and isVisible for initial setup

  // Update visibility of ALL objects whenever isVisible changes
  useEffect(() => {
    if (!groupRef.current) return;

    console.log("Updating visibility of ALL constellation objects to:", isVisible);

    groupRef.current.traverse((child) => {
      // Check if it's a Mesh directly within the group or within the added scenes
      if (child.isMesh) {
         console.log(`Setting visibility of ${child.name || 'unnamed mesh'} to ${isVisible}`);
         child.visible = isVisible;
      }
    });
  }, [isVisible]); // Only depend on isVisible for visibility updates

  return <group ref={groupRef} />;
}

export default ConstellationModel;
