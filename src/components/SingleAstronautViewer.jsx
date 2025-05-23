import React, { useRef, useState, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

export default function SingleAstronautViewer({ customHelmetTexture }) {
  const { scene } = useGLTF('/astronaut1.glb');
  const groupRef = useRef();

  useEffect(() => {
    if (scene) {
      console.log("Astronaut model loaded, applying modifications...");
      
      // Clone the entire scene to avoid modifying the cached original
      const clonedScene = scene.clone();
      
      // Debug all meshes in the model
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          console.log(`Found mesh: ${child.name}`, {
            material: child.material.type,
            transparent: child.material.transparent,
            opacity: child.material.opacity
          });
        }
      });
      
      // Apply custom texture only to helmet part
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          const nameLower = child.name.toLowerCase();
          
          // For the helmet part, apply custom texture
          if (nameLower.includes('helmet')) {
            console.log(`Applying custom texture to: ${child.name}`);
            if (customHelmetTexture instanceof THREE.Texture) {
              // Clone the material to avoid affecting other instances
              child.material = child.material.clone();
              child.material.map = customHelmetTexture;
              child.material.needsUpdate = true;
            }
          }
          
          // Ensure glass has proper transparency
          if (nameLower.includes('glass')) {
            console.log(`Ensuring transparency for: ${child.name}`);
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.4; // You may need to adjust this value
            child.material.side = THREE.DoubleSide;
            child.material.needsUpdate = true;
          }
          
          // Make sure all materials have shadow properties
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      
      // Clear any existing children and add the cloned scene
      if (groupRef.current) {
        while (groupRef.current.children.length) {
          groupRef.current.remove(groupRef.current.children[0]);
        }
        groupRef.current.add(clonedScene);
      }
    }
  }, [scene, customHelmetTexture]);

  return (
    <group ref={groupRef} scale={[5, 5, 5]} position={[0, -0.5, 0]} />
  );
}

// Preload the model
useGLTF.preload('/astronaut1.glb'); 