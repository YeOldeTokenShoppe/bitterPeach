import React, { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";

// Preload the model
useGLTF.preload("/marketFight.glb");

function ConstellationModel({ isVisible = true }) {
  const { camera } = useThree();
  const { scene } = useGLTF("/marketFight.glb");
  const groupRef = useRef();

  console.log("ConstellationModel rendered with isVisible:", isVisible);

  // Set up the model when it loads
  useEffect(() => {
    if (!scene) return;
    console.log("Setting up constellation model with isVisible:", isVisible);

    // Create a copy of the scene to avoid modifying the cached original
    const constellationScene = scene.clone();

    // Log all object names in the model
    console.log("All objects in the model:");
    constellationScene.traverse((child) => {
      if (child.isMesh) {
        console.log(`Mesh: ${child.name}`);
      }
    });

    // Process the model
    constellationScene.traverse((child) => {
      if (child.isMesh) {
        // Configure all meshes for better rendering in background
        child.castShadow = false;
        child.receiveShadow = false;
        child.renderOrder = -1;

        // Add opacity to constellation lines (always slightly visible)
        if (
          child.material &&
          !child.name.startsWith("RedStar") &&
          !child.name.startsWith("GreenStar") &&
          !child.name.startsWith("Bear") // Exclude Bear from general opacity setting
        ) {
          child.material.transparent = true;
          child.material.opacity = 0.015; // Keep lines consistently faint
          console.log(`Set constant opacity for ${child.name}`);
        }

        // Scale down red stars
        if (child.name.startsWith("RedStar")) {
          child.scale.set(0.15, 0.15, 0.15);
        }
        if (child.name.startsWith("GreenStar")) {
          child.scale.set(0.15, 0.15, 0.15);
        }

        // Set initial visibility for Bear objects based on the prop
        if (child.name.startsWith("Bear")) {
          // Ensure material exists and set transparency if needed for visibility toggling
          // if (child.material) {
          //   child.material.transparent = true; // Ensure transparency is enabled if needed
          // }
          console.log(
            `Found Bear object: ${child.name}, setting initial visible to ${isVisible}`
          );
          child.visible = isVisible;
        }
      }
    });

    // Add constellation to the group
    groupRef.current.add(constellationScene);

    // Position the constellation model far behind the main model
    groupRef.current.position.z = -300;

    // Scale down the model to be more subtle
    groupRef.current.scale.set(30, 30, 30);
    // groupRef.current.rotation.y = 0;

    return () => {
      // Clean up
      groupRef.current.remove(constellationScene);
      constellationScene.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((material) => material.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [scene]);

  // Update visibility of Bear objects whenever isVisible changes
  useEffect(() => {
    if (!groupRef.current) return;

    console.log("Updating visibility of Bear objects to:", isVisible);

    groupRef.current.traverse((child) => {
      if (child.isMesh && child.name.startsWith("Bear")) {
        console.log(`Setting visibility of ${child.name} to ${isVisible}`);
        child.visible = isVisible;
      }
    });
  }, [isVisible]);

  return <group ref={groupRef} />;
}

export default ConstellationModel;
