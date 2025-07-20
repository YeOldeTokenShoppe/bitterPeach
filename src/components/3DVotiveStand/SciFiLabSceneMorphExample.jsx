/**
 * Example showing how to use CyberParticleEffectMorph in SciFiLabScene
 * This demonstrates morphing between different objects in the scene
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CyberParticleEffectMorph } from "./CyberParticleEffectMorph";

export function SciFiLabSceneMorphExample() {
  const cyberEffectRef = useRef();
  
  // Move useThree hook to the top level of the component
  const { gl, scene } = useThree();
  
  useEffect(() => {
    if (!gl) return;
    
    const setupBasicMorph = () => {
      const initialGeometry = new THREE.OctahedronGeometry(3, 2);
      const cyberEffect = new CyberParticleEffectMorph(initialGeometry, gl);
      
      // Configure for sci-fi look
      cyberEffect.parameters.colorMode = CyberParticleEffectMorph.COLOR_MODES.MATRIX_GREEN;
      cyberEffect.parameters.digitMode = true;
      cyberEffect.flowField.influence = 1.5;
      
      return cyberEffect;
    };
    
    // Example 2: Morphing between GLTF geometries
    const setupGLTFMorph = (gltfScene) => {
      const baby = gltfScene.getObjectByName('Baby');
      const crystal = gltfScene.getObjectByName('Crystal5');
      const halo = gltfScene.getObjectByName('Halo.002');
      
      if (baby && crystal) {
        const cyberEffect = new CyberParticleEffectMorph(baby, gl, {
          autoScale: false
        });
        
        // Add other objects as morph targets
        if (crystal) cyberEffect.addMorphTarget('crystal', crystal);
        if (halo) cyberEffect.addMorphTarget('halo', halo);
        
        // Configure for sci-fi look
        cyberEffect.parameters.colorMode = CyberParticleEffectMorph.COLOR_MODES.MATRIX_GREEN;
        cyberEffect.parameters.digitMode = true;
        cyberEffect.flowField.influence = 2.0;
        
        return cyberEffect;
      }
    };
    
    // Example 3: Interactive morphing based on user input
    const setupInteractiveMorph = () => {
      const initialGeometry = new THREE.OctahedronGeometry(5, 2);
      const cyberEffect = new CyberParticleEffectMorph(initialGeometry, gl);
      
      // Add various targets
      const targets = {
        human: createHumanoidGeometry(),
        robot: createRobotGeometry(),
        alien: createAlienGeometry()
      };
      
      Object.entries(targets).forEach(([name, geometry]) => {
        cyberEffect.addMorphTarget(name, geometry);
      });
      
      // Configure for dramatic effect
      cyberEffect.parameters.colorMode = CyberParticleEffectMorph.COLOR_MODES.HOT_PLASMA;
      cyberEffect.parameters.glitchIntensity = 0.5;
      cyberEffect.parameters.holographicIntensity = 0.6;
      
      // Expose methods for interaction
      cyberEffect.morphToHuman = () => cyberEffect.morphTo('human', 2.0, 'easeInOut');
      cyberEffect.morphToRobot = () => cyberEffect.morphTo('robot', 1.5, 'bounce');
      cyberEffect.morphToAlien = () => cyberEffect.morphTo('alien', 3.0, 'easeOut');
      
      return cyberEffect;
    };
    
    // Helper functions to create complex geometries
    function createHumanoidGeometry() {
      const group = new THREE.Group();
      
      // Head
      const head = new THREE.SphereGeometry(1, 16, 16);
      head.translate(0, 4, 0);
      
      // Body
      const body = new THREE.CylinderGeometry(1.5, 1, 3, 16);
      body.translate(0, 1.5, 0);
      
      // Arms
      const armGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
      const leftArm = armGeometry.clone();
      leftArm.translate(-2, 2.5, 0);
      leftArm.rotateZ(Math.PI / 4);
      
      const rightArm = armGeometry.clone();
      rightArm.translate(2, 2.5, 0);
      rightArm.rotateZ(-Math.PI / 4);
      
      // Merge geometries
      const geometries = [head, body, leftArm, rightArm];
      const mergedGeometry = THREE.BufferGeometryUtils.mergeGeometries(geometries);
      
      return mergedGeometry;
    }
    
    function createRobotGeometry() {
      const group = new THREE.Group();
      
      // Cubic head
      const head = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      head.translate(0, 4, 0);
      
      // Rectangular body
      const body = new THREE.BoxGeometry(2, 3, 1.5);
      body.translate(0, 1.5, 0);
      
      // Cylindrical arms
      const armGeometry = new THREE.CylinderGeometry(0.4, 0.4, 2.5, 6);
      const leftArm = armGeometry.clone();
      leftArm.translate(-1.5, 2.5, 0);
      
      const rightArm = armGeometry.clone();
      rightArm.translate(1.5, 2.5, 0);
      
      // Merge geometries
      const geometries = [head, body, leftArm, rightArm];
      const mergedGeometry = THREE.BufferGeometryUtils.mergeGeometries(geometries);
      
      return mergedGeometry;
    }
    
    function createAlienGeometry() {
      // Create a more organic alien shape
      const geometry = new THREE.IcosahedronGeometry(3, 3);
      
      // Deform vertices for alien look
      const positions = geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        
        // Apply some noise-based deformation
        const noise = Math.sin(x * 2) * Math.cos(y * 2) * 0.3;
        positions[i + 1] *= 1 + noise; // Stretch vertically
        
        // Make it more egg-shaped
        if (y > 0) {
          positions[i] *= 0.7;
          positions[i + 2] *= 0.7;
        }
      }
      
      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();
      
      return geometry;
    }
    
    // Initialize the effect (choose one of the examples)
    const cyberEffect = setupBasicMorph();
    cyberEffectRef.current = cyberEffect;
    
    // Add to scene - use scene from the top level
    scene.add(cyberEffect.points);
    
    // Cleanup
    return () => {
      if (cyberEffectRef.current) {
        scene.remove(cyberEffectRef.current.points);
        cyberEffectRef.current.dispose();
      }
    };
  }, [gl, scene]);
  
  // Update the effect
  useFrame(() => {
    if (cyberEffectRef.current) {
      cyberEffectRef.current.update();
    }
  });
  
  return null;
}

// Usage in your SciFiLabScene component:
/*
// In SciFiLabScene.jsx, after loading the GLB:

// Import the morph class
import { CyberParticleEffectMorph } from "./CyberParticleEffectMorph";

// Replace the regular CyberParticleEffect with the morphing version
if (foundBabyMesh) {
  // Find other meshes to morph between
  const crystal = labScene.getObjectByName('Crystal5');
  const halo = labScene.getObjectByName('Halo.002');
  
  // Create morphing effect
  const cyberEffect = new CyberParticleEffectMorph(foundBabyMesh.geometry, gl, {
    autoScale: false,
    targetSize: 1
  });
  
  // Add morph targets if found
  if (crystal && crystal.geometry) {
    cyberEffect.addMorphTarget('crystal', crystal.geometry);
  }
  if (halo && halo.geometry) {
    cyberEffect.addMorphTarget('halo', halo.geometry);
  }
  
  // Configure the effect
  cyberEffect.parameters.particleSize = 0.02;
  cyberEffect.parameters.colorMode = CyberParticleEffectMorph.COLOR_MODES.MATRIX_GREEN;
  cyberEffect.parameters.digitMode = true;
  
  // Start morphing sequence
  const morphTargets = ['crystal', 'halo'].filter(name => 
    cyberEffect.morphTargets.has(name)
  );
  if (morphTargets.length > 0) {
    cyberEffect.startSequentialMorph(morphTargets, 5.0, true);
  }
  
  // Add to scene...
}
*/