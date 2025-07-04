import { useEffect, useRef, useMemo, memo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { CyberParticleEffect } from "./CyberParticleEffect";

function SciFiLabScene({ 
  onLoad, 
  position = [0, 0, -1],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  hover = false,
  rotate = false,
  is80sMode = false
}) {
  const sceneRef = useRef();
  const groupRef = useRef();
  const { scene, gl } = useThree();
  const initialY = useRef(position[1]);
  const mixerRef = useRef();
  const hasLoadedRef = useRef(false);
  const cyberEffectRef = useRef();

  // Use useMemo to prevent recreating the loader on every render
  const loader = useMemo(() => {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);
    return gltfLoader;
  }, []);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    let isCurrentInstance = true;

    loader.load("/nativ80Scene4.glb", (gltf) => {
      if (!isCurrentInstance) return;

      const labScene = gltf.scene;
      
      console.log('[SciFiLabScene] Loaded scene:', labScene);
      let foundBabyMesh = null;
      
      labScene.traverse((child) => {
        if (child.name) {
          console.log('[SciFiLabScene] Found object:', child.name, 'type:', child.type, 'isMesh:', child.isMesh);
          
          // Check for any object with "baby" in the name (case insensitive) but NOT sensors
          if (child.name.toLowerCase().includes('baby') && !child.name.toLowerCase().includes('sensor')) {
            console.log('[SciFiLabScene] Found object with "baby" in name:', child.name, 'type:', child.type);
            
            // If this is already a mesh with geometry, use it
            if (child.isMesh && child.geometry) {
              console.log('[SciFiLabScene] This is a mesh with geometry, using it as Baby');
              foundBabyMesh = child;
              // Hide the baby mesh since we're showing it as particles
              child.visible = false;
            } else {
              // Otherwise traverse children to find a mesh
              console.log('[SciFiLabScene] Traversing children of:', child.name);
              child.traverse((descendant) => {
                if (descendant !== child) { // Skip the parent
                  console.log('[SciFiLabScene]   - Child:', descendant.name, 'type:', descendant.type, 'isMesh:', descendant.isMesh);
                  // Also exclude sensors in children
                  if (descendant.isMesh && descendant.geometry && !descendant.name.toLowerCase().includes('sensor')) {
                    console.log('[SciFiLabScene]   - Found mesh with geometry:', descendant.name);
                    if (!foundBabyMesh) { // Only take the first mesh found
                      foundBabyMesh = descendant;
                      // Hide the baby mesh since we're showing it as particles
                      descendant.visible = false;
                    }
                  }
                }
              });
            }
          }
          
          // Hide sensors separately since they're at root level
          if (child.name && child.name.toLowerCase().includes('sensor')) {
            console.log('[SciFiLabScene] Hiding sensor object:', child.name);
            child.visible = false;
            child.traverse((subChild) => {
              if (subChild.isMesh) {
                subChild.visible = false;
              }
            });
          }
        }
      });
      
      console.log('[SciFiLabScene] Traversal complete. Found baby mesh:', foundBabyMesh?.name);

      // Create and store the animation mixer if there are animations
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(labScene);
        mixerRef.current = mixer;

        // Play all animations
        gltf.animations.forEach((animation) => {
          const action = mixer.clipAction(animation);
          action.play();
          console.log(`Playing animation: ${animation.name}`);
        });
      }

      // Create an anchor group with initial position
      const anchorGroup = new THREE.Group();
      anchorGroup.position.set(position[0], position[1], position[2]);
      initialY.current = position[1];

      // Create a rotation group
      const rotationGroup = new THREE.Group();

      // Set up the hierarchy
      anchorGroup.add(rotationGroup);
      rotationGroup.add(labScene);

      // Apply scale and rotation from props
      labScene.scale.set(scale[0], scale[1], scale[2]);
      labScene.rotation.set(rotation[0], rotation[1], rotation[2]);

      // Center the scene in the rotation group
      const box = new THREE.Box3().setFromObject(labScene);
      const center = box.getCenter(new THREE.Vector3());
      labScene.position.sub(center);

      sceneRef.current = labScene;
      groupRef.current = { anchor: anchorGroup, rotation: rotationGroup };

      // Add custom lighting for the lab scene
      const ambientLight = new THREE.AmbientLight(is80sMode ? 0xD946EF : 0x404040, 0.5);
      anchorGroup.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(is80sMode ? 0x00ff41 : 0xffffff, 1);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      anchorGroup.add(directionalLight);

      // Add a point light for dramatic effect
      const pointLight = new THREE.PointLight(is80sMode ? 0x67e8f9 : 0x0088ff, 1, 10);
      pointLight.position.set(0, 2, 0);
      anchorGroup.add(pointLight);

      // Add the anchor group to the scene
      scene.add(anchorGroup);

      // Create CyberParticleEffect if we found the baby mesh
      if (foundBabyMesh) {
        console.log('[SciFiLabScene] Creating CyberParticleEffect');
        try {
          // Get baby's world position
          foundBabyMesh.updateMatrixWorld(true);
          const worldPosition = new THREE.Vector3();
          foundBabyMesh.getWorldPosition(worldPosition);
          
          // Create a container group to hold the particle effect
          const particleContainer = new THREE.Group();
          particleContainer.position.copy(worldPosition);
          
          // Get rotation and scale
          const worldQuaternion = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          foundBabyMesh.getWorldQuaternion(worldQuaternion);
          foundBabyMesh.getWorldScale(worldScale);
          
          particleContainer.quaternion.copy(worldQuaternion);
          particleContainer.scale.copy(worldScale);
          
          // Create the effect
          const cyberEffect = new CyberParticleEffect(foundBabyMesh.geometry, gl, {
            autoScale: false, // Disable auto scale to preserve baby's scale
            targetSize: 1 // Keep original size
          });
          
          // Configure the effect
          cyberEffect.parameters.particleSize = 0.02; // Smaller particles
          cyberEffect.parameters.colorMode = CyberParticleEffect.COLOR_MODES.MATRIX_GREEN;
          cyberEffect.parameters.glitchIntensity = 0.2;
          cyberEffect.parameters.digitMode = true; // Binary digit mode
          cyberEffect.parameters.holographicIntensity = 0.3; // Reduced brightness
          
          // Configure flow field - increased for more dramatic effect
          cyberEffect.flowField.influence = 2.5; // Increased from 0.6
          cyberEffect.flowField.strength = 2; // Increased from 0.5 for more movement
          cyberEffect.flowField.frequency = 0.5; // Increased from 0.3 for more variation
          
          // Add the particle effect to the container (at origin of container)
          particleContainer.add(cyberEffect.points);
          
          // Set render order to ensure particles render on top
          cyberEffect.points.renderOrder = 999;
          cyberEffect.points.frustumCulled = false; // Disable frustum culling
          
          // Add the container to the rotation group
          console.log('[SciFiLabScene] Adding particle container to rotation group');
          rotationGroup.add(particleContainer);
          cyberEffectRef.current = cyberEffect;
          
          console.log('[SciFiLabScene] CyberParticleEffect created successfully');
        } catch (error) {
          console.error('[SciFiLabScene] Failed to create CyberParticleEffect:', error);
        }
      }

      // Notify parent that scene is loaded and ready
      if (onLoad) {
        onLoad();
      }
    });

    // Cleanup function
    return () => {
      isCurrentInstance = false;

      // Stop all animations
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      
      // Dispose CyberParticleEffect
      if (cyberEffectRef.current) {
        cyberEffectRef.current.dispose();
        cyberEffectRef.current = null;
      }

      // Remove the scene and dispose of resources
      if (groupRef.current?.anchor) {
        groupRef.current.anchor.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) {
              child.geometry.dispose();
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });

        scene.remove(groupRef.current.anchor);
        groupRef.current = null;
      }

      if (sceneRef.current) {
        sceneRef.current = null;
      }

      hasLoadedRef.current = false;
    };
  }, [scene, loader, gl, position, scale, rotation, is80sMode, onLoad]);

  useFrame((state, delta) => {
    // Update the animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
    
    // Update CyberParticleEffect
    if (cyberEffectRef.current) {
      cyberEffectRef.current.update();
    }

    if (sceneRef.current && groupRef.current) {
      // Apply hover animation to the anchor group
      if (hover) {
        groupRef.current.anchor.position.y =
          initialY.current + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      }

      // Apply rotation to the rotation group
      if (rotate) {
        groupRef.current.rotation.rotation.y += delta * 0.3;
      }
    }
  });

  return null;
}

export default memo(SciFiLabScene);