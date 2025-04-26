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
  const { scene: starCandlesScene } = useGLTF("/starChart.glb");
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
      // First pass: identify all stars and ensure they're visible
      modelScene.traverse(child => {
        if (
          child.isMesh &&
          (child.name.startsWith("RedStar") || child.name.startsWith("GreenStar"))
        ) {
          // Force stars to be visible
          child.visible = true;

          // Set appropriate scale and opacity
          // child.scale.set(0.12, 0.12, 0.12);
          if (child.material) {
            child.material.transparent = true;
            // Special treatment for whale's stars
            if (modelScene === whaleClone) {
              child.material.opacity = 1;
              // child.scale.set(1, 1, 1);

              // Add a custom property to identify Whale stars
              child.userData.isWhaleStar = true;
            } else if (modelScene === marketClone) {
              // Add a custom property to identify Bear stars
              child.userData.isBearStar = true;
              child.material.opacity = 0.15;
            } else {
              child.material.opacity = 0.01;
            }
          }
        }
      });

      // Second pass: handle all other meshes
      modelScene.traverse(child => {
        if (
          child.isMesh &&
          !child.name.startsWith("RedStar") &&
          !child.name.startsWith("GreenStar")
        ) {
          // Configure all meshes for better rendering in background
          child.castShadow = false;
          child.receiveShadow = false;
          child.renderOrder = -1; // Render behind other objects

          // For all other meshes, respect the isVisible prop
          child.visible = isVisible;
          if (child.material) {
            child.material.transparent = true;
            if (child.name.startsWith("Bear")) {
              child.material.opacity = isVisible ? 0.15 : 0;
            } else if (modelScene === starCandlesClone) {
              child.material.opacity = isVisible ? 0.1 : 0;
            } else if (modelScene === whaleClone) {
              child.material.opacity = isVisible ? 0.15 : 0;
            } else {
              child.material.opacity = isVisible ? 0.15 : 0;
            }
          }
        }
      });

      // Set model's position and scale relative to the group
      modelScene.position.set(...position);
      modelScene.scale.set(...scale);
      groupRef.current.add(modelScene);
    };

    // Helper function to get the full path of an object in the scene
    const getObjectPath = object => {
      const path = [];
      let current = object;
      while (current) {
        path.unshift(current.name || "unnamed");
        current = current.parent;
      }
      return path.join(" > ");
    };

    // Process and position each model
    processModel(marketClone, "Market", [10, 0, 0], [1, 1, 1]);
    processModel(whaleClone, "Whale", [18, -1, 34], [1, 1, 1]);
    processModel(starCandlesClone, "StarCandles", [-10, -1, 27], [2.2 , 2.2, 2.2]);

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
        scene.traverse(child => {
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

    // First pass: identify all stars and ensure they're visible
    groupRef.current.traverse(child => {
      if (
        child.isMesh &&
        (child.name.startsWith("RedStar") || child.name.startsWith("GreenStar"))
      ) {
        // Force stars to be visible
        child.visible = true;

        // // Set appropriate scale and opacity
        if (child.parent && child.parent.name.includes("Whale")) {
          // child.scale.set(0.1, 0.1, 0.1);
        //   if (child.material) {
        //     child.material.transparent = true;
        //     child.material.opacity = 0.1;
        //   }
        // } else if (child.parent && child.parent.name.includes("Bear")) {
        //   // child.scale.set(0.12, 0.12, 0.12);
        //   if (child.material) {
        //     child.material.transparent = true;
        //     child.material.opacity = 0.15;
        //   }
        // } else {
          child.scale.set(0.22, 0.22, 0.22);
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = 0.5;
          }
        }
      }
    });

    // Second pass: handle all other meshes
    groupRef.current.traverse(child => {
      if (
        child.isMesh &&
        !child.name.startsWith("RedStar") &&
        !child.name.startsWith("GreenStar")
      ) {
        // For all other meshes, respect the isVisible prop
        child.visible = isVisible;
        if (child.material) {
          child.material.transparent = true;
          if (child.name.startsWith("Bear")) {
            child.material.opacity = isVisible ? 0.15 : 0;
          } else if (child.name.includes("StarCandles")) {
            child.material.opacity = isVisible ? 0.1 : 0;
          } else if (child.name.includes("Whale")) {
            child.material.opacity = isVisible ? 0.1 : 0;
          } else {
            child.material.opacity = isVisible ? 0.1 : 0;
          }
        }
      }
    });
  }, [isVisible]);

  // Force all stars to be visible on every render
  useEffect(() => {
    if (!groupRef.current) return;

    // This effect runs on every render to ensure all stars are always visible
    const forceAllStarsVisible = () => {
      // Check if groupRef.current exists before trying to traverse it
      if (!groupRef.current) return;

      // First, find all parent objects and ensure they're visible
      groupRef.current.traverse(child => {
        if (
          child.name &&
          (child.name.includes("Whale") ||
            child.name.includes("Bear") ||
            child.name.includes("StarCandles"))
        ) {
          // Make sure the parent is visible
          child.visible = true;
        }
      });

      // Then, ensure all stars are visible
      groupRef.current.traverse(child => {
        if (
          child.isMesh &&
          (child.name.startsWith("RedStar") || child.name.startsWith("GreenStar"))
        ) {
          // Force all stars to be visible
          child.visible = true;
          if (child.material) {
            child.material.transparent = true;

            // Set appropriate opacity based on parent
            if (child.parent && child.parent.name.includes("Whale")) {
              child.material.opacity = .1;
              child.scale.set(0.4, 0.4, 0.4);
            } else if (child.parent && child.parent.name.includes("Bear")) {
              child.material.opacity = 0.15;
              child.scale.set(0.12, 0.12, 0.12);
            } else {
              child.material.opacity = 0.05;
              // child.scale.set(0.12, 0.12, 0.12);
            }
          }
        }
      });
    };

    // Run immediately
    forceAllStarsVisible();

    // Use requestAnimationFrame for better performance
    let animationFrameId;
    const animate = () => {
      forceAllStarsVisible();
      animationFrameId = requestAnimationFrame(animate);
    };

    // Start the animation loop
    animationFrameId = requestAnimationFrame(animate);

    // Clean up on unmount
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return <group ref={groupRef} />;
}

export default ConstellationModel;