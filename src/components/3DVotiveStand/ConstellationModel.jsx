import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

// Preload the models
useGLTF.preload("/marketFight.glb");
useGLTF.preload("/whale.glb");
useGLTF.preload("/starCandles.glb");
useGLTF.preload("/InfinityStars.glb");

function ConstellationModel({ 
  isVisible = false, 
  groupScale = [1, 1, 1], // Default scale if not provided
  groupPosition = [0, 0, 0], // Default position if not provided
  groupRotation = [0, 0, 0] // Default rotation if not provided
}) {
  const { camera } = useThree();
  const { scene: marketScene } = useGLTF("/marketFight.glb");
  const { scene: whaleScene } = useGLTF("/whale.glb");
  const { scene: starCandlesScene } = useGLTF("/starAndArrow.glb");
  const { scene: infinityStarsScene } = useGLTF("/InfinityStars.glb");
  const groupRef = useRef();
  const whaleModelRef = useRef();

  useEffect(() => {
    if (!marketScene || !whaleScene || !starCandlesScene || !infinityStarsScene || !groupRef.current) return;

    // Clear previous models if any, before adding new ones
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }

    const marketClone = marketScene.clone();
    const whaleClone = whaleScene.clone();
    const starCandlesClone = starCandlesScene.clone();
    const infinityStarsClone = infinityStarsScene.clone();

    const processModel = (modelScene, namePrefix = "", position = [0, 0, 0], scale = [1, 1, 1]) => {
      modelScene.traverse(child => {
        if (
          child.isMesh &&
          (child.name.startsWith("RedStar") || child.name.startsWith("GreenStar"))
        ) {
          child.visible = true;
          if (child.material) {
            child.material.transparent = true;
            if (modelScene === whaleClone) {
              child.material.opacity = 1;
              child.userData.isWhaleStar = true;
            } else if (modelScene === marketClone) {
              child.userData.isBearStar = true;
              child.material.opacity = 0.15;
            } else if (modelScene === infinityStarsClone) {
              child.userData.isInfinityStar = true;
              child.material.opacity = 0.2;
            } else {
              child.material.opacity = 0.01;
            }
          }
        }
        if (child.isMesh && child.name.startsWith("Infinity")) {
          child.visible = true;
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = isVisible ? 0.3 : 0;
          }
        }
      });
      modelScene.traverse(child => {
        if (
          child.isMesh &&
          !child.name.startsWith("RedStar") &&
          !child.name.startsWith("GreenStar") &&
          !child.name.startsWith("Infinity")
        ) {
          child.castShadow = false;
          child.receiveShadow = false;
          child.renderOrder = -1; 
          child.visible = isVisible;
          if (child.material) {
            child.material.transparent = true;
            if (child.name.startsWith("Bear")) {
              child.material.opacity = isVisible ? 0.15 : 0;
            } else if (modelScene === starCandlesClone) {
              child.material.opacity = isVisible ? 0.1 : 0;
            } else if (modelScene === whaleClone) {
              child.material.opacity = isVisible ? 0.15 : 0;
            } else if (modelScene === infinityStarsClone) {
              child.material.opacity = isVisible ? 0.15 : 0;
            } else {
              child.material.opacity = isVisible ? 0.15 : 0;
            }
          }
        }
      });
      modelScene.position.set(...position);
      modelScene.scale.set(...scale);
      groupRef.current.add(modelScene);
    };

    // Keep internal model positions and scales as they are, 
    // the main group's scale and position will adjust them globally.
    processModel(marketClone, "Market", [10, 0, 0], [1, 1, 1]);
    processModel(whaleClone, "Whale", [18, -1, 34], [1, 1, 1]);
    processModel(starCandlesClone, "StarCandles", [-15, -2, 30], [1.8 , 1.8, 1.8]);
    processModel(infinityStarsClone, "InfinityStars", [-10, 1, -12], [1.5, 1.5, 1.5]);

    whaleModelRef.current = whaleClone;
    whaleClone.rotation.y = Math.PI / 4;
    whaleClone.rotation.x = Math.PI / 12;
    infinityStarsClone.rotation.z = Math.PI / 6;

    // Apply the new groupScale and groupPosition props
    groupRef.current.position.set(...groupPosition);
    groupRef.current.scale.set(...groupScale);
    groupRef.current.rotation.set(...groupRotation);

    return () => {
      [marketClone, whaleClone, starCandlesClone, infinityStarsClone].forEach(scene => {
        if (groupRef.current && groupRef.current.children.includes(scene)) {
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
  }, [marketScene, whaleScene, starCandlesScene, infinityStarsScene, isVisible, groupScale, groupPosition, groupRotation]); // Added groupScale, groupPosition and groupRotation to dependencies

  // Update visibility and opacity based on isVisible prop
  useEffect(() => {
    if (!groupRef.current) return;

    groupRef.current.traverse(child => {
      if (child.isMesh) {
        if (child.name.startsWith("RedStar") || child.name.startsWith("GreenStar")) {
          child.visible = true; // Stars always visible in terms of object visibility
          if (child.material) {
            child.material.transparent = true;
            // Opacity for stars can be set here if needed, or rely on initial setup
             if (child.userData.isWhaleStar) child.material.opacity = 1; // Example
             else if (child.userData.isBearStar) child.material.opacity = 0.15;
             else if (child.userData.isInfinityStar) child.material.opacity = 0.2;
             else child.material.opacity = 0.05; // Fallback, was 0.01
          }
        } else if (child.name.startsWith("Infinity")) { // For Infinity lines
          child.visible = true; // Lines are always part of the scene graph
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = isVisible ? 0.3 : 0; // Opacity controlled by isVisible
          }
        } else { // For all other meshes (parts of constellations)
          child.visible = isVisible;
          if (child.material) {
            child.material.transparent = true;
            // Set opacity based on isVisible for non-star/non-line meshes
            if (child.name.startsWith("Bear")) {
              child.material.opacity = isVisible ? 0.15 : 0;
            } else if (child.parent?.name.includes("StarCandles")) { // Check parent for StarCandles context
              child.material.opacity = isVisible ? 0.1 : 0;
            } else if (child.parent?.name.includes("Whale")) { // Check parent for Whale context
              child.material.opacity = isVisible ? 0.15 : 0; // was 0.1
            } else if (child.parent?.name.includes("InfinityStars")) { // Check parent for InfinityStars context
              child.material.opacity = isVisible ? 0.15 : 0;
            } else {
              child.material.opacity = isVisible ? 0.15 : 0; // was 0.1
            }
          }
        }
      }
    });
  }, [isVisible]);

  // The third useEffect that was forcing stars visible and running requestAnimationFrame 
  // seemed overly complex and potentially conflicting with the main visibility logic.
  // The main useEffect for model setup and the useEffect for isVisible updates should be sufficient.
  // Removing it for simplification. If star visibility issues persist, we can revisit a targeted approach.

  return <group ref={groupRef} name="ConstellationModelGroup" />;
}

export default ConstellationModel;
