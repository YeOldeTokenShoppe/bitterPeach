import { useEffect, useRef, useMemo, useState, memo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
// import {  CyberParticleEffectMorph } from "./CyberParticleEffectMorph";
// import { CyberParticleEffect } from "./cyberParticleEffect";
import { CyberParticleEffectSimple } from "./CyberParticleEffectSimple";
import PostProcessingEffects from '../3DVotiveStand/PostProcessingEffects';
import SimpleGlitchTint from "./SimpleGlitchTint";


// Helper function to get full object path
const getObjectPath = (obj) => {
  const path = [];
  let current = obj;
  while (current) {
    path.unshift(current.name || current.type);
    current = current.parent;
  }
  return path.join(' > ');
};

// Helper function to calculate position statistics
const calculateStats = (array) => {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  
  for (let i = 0; i < array.length; i += 3) {
    minX = Math.min(minX, array[i]);
    maxX = Math.max(maxX, array[i]);
    minY = Math.min(minY, array[i + 1]);
    maxY = Math.max(maxY, array[i + 1]);
    minZ = Math.min(minZ, array[i + 2]);
    maxZ = Math.max(maxZ, array[i + 2]);
  }
  
  return { minX, maxX, minY, maxY, minZ, maxZ };
};

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
  const [modelLoaded, setModelLoaded] = useState(false);
  const [bloomTargets, setBloomTargets] = useState([]);
  const cyberEffectRef = useRef();
  const particleContainerRef = useRef();
  const clothMeshRefs = useRef([]);
  const capeMeshRefs = useRef([]);
  const animationActionsRef = useRef({});
  const capsuleActionRef = useRef(null);

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
    
    let isCurrentInstance = true;
    hasLoadedRef.current = true;

    loader.load("/nativ80Scene4.glb", (gltf) => {
      if (!isCurrentInstance) return;

      const labScene = gltf.scene;
      
      // Debug: Log all objects in the scene
      console.log('[SciFiLabScene] ========== SCENE LOAD START ==========');
      console.log('[SciFiLabScene] Loaded scene:', labScene);
      
      // First, let's see ALL objects at root level
      console.log('[SciFiLabScene] Root level children:');
      labScene.children.forEach(child => {
        console.log(`[SciFiLabScene] - ${child.name} (${child.type})`);
        // If it might be penguin, check its children
        if (child.name && (child.name.toLowerCase().includes('penguin') || child.name === 'penguin')) {
          console.log('[SciFiLabScene]   PENGUIN FOUND! Checking children:');
          child.traverse((subChild) => {
            if (subChild !== child) {
              console.log(`[SciFiLabScene]     - ${subChild.name} (${subChild.type}, isMesh: ${subChild.isMesh})`);
            }
          });
        }
        // Check inside Sketchfab_model containers for penguin
        if (child.name && (child.name.includes('Sketchfab_model') || child.name === 'root')) {
          console.log(`[SciFiLabScene] Checking inside ${child.name} for penguin...`);
          child.traverse((subChild) => {
            if (subChild !== child && subChild.name && 
                (subChild.name.toLowerCase().includes('penguin') || 
                 subChild.name === 'RootNode.001' ||
                 subChild.name === 'penguin.fbx')) {
              console.log(`[SciFiLabScene]   Found potential penguin: ${subChild.name} (${subChild.type})`);
              // Check its children too
              subChild.traverse((grandChild) => {
                if (grandChild !== subChild) {
                  console.log(`[SciFiLabScene]     - ${grandChild.name} (${grandChild.type}, isMesh: ${grandChild.isMesh})`);
                }
              });
            }
          });
        }
      });
      
      const foundBloomTargets = [];
      
      // First, let's find ALL objects that might be penguin
      console.log('[SciFiLabScene] ========== SEARCHING FOR PENGUIN IN ENTIRE SCENE ==========');
      const penguinObjects = [];
      const allCubeObjects = [];
      const allRoundcubeObjects = [];
      
      // List ALL objects in the scene to help debug
      console.log('[SciFiLabScene] Complete scene hierarchy:');
      let objectCount = 0;
      labScene.traverse((child) => {
        objectCount++;
        if (child.name) {
          // Check for penguin in various forms
          if (child.name.toLowerCase().includes('penguin')) {
            console.log(`[SciFiLabScene] *** PENGUIN FOUND: "${child.name}" (${child.type})`);
            penguinObjects.push(child);
          }
          
          // Track ALL Cube objects
          if (child.name === 'Cube' || child.name.includes('Cube')) {
            console.log(`[SciFiLabScene] Cube object found: "${child.name}" (${child.type}, isMesh: ${child.isMesh})`);
            allCubeObjects.push(child);
            // Log parent hierarchy
            let parent = child.parent;
            let parentPath = '';
            while (parent && parent.name) {
              parentPath = parent.name + ' > ' + parentPath;
              parent = parent.parent;
            }
            console.log(`[SciFiLabScene]   Parent path: ${parentPath}`);
          }
          
          // Track ALL Roundcube objects
          if (child.name.includes('Roundcube')) {
            console.log(`[SciFiLabScene] Roundcube object found: "${child.name}" (${child.type}, isMesh: ${child.isMesh})`);
            allRoundcubeObjects.push(child);
            // Log parent hierarchy
            let parent = child.parent;
            let parentPath = '';
            while (parent && parent.name) {
              parentPath = parent.name + ' > ' + parentPath;
              parent = parent.parent;
            }
            console.log(`[SciFiLabScene]   Parent path: ${parentPath}`);
          }
        }
      });
      console.log(`[SciFiLabScene] Total objects in scene: ${objectCount}`);
      console.log(`[SciFiLabScene] Total potential penguin objects found: ${penguinObjects.length}`);
      console.log(`[SciFiLabScene] Total Cube objects found: ${allCubeObjects.length}`);
      console.log(`[SciFiLabScene] Total Roundcube objects found: ${allRoundcubeObjects.length}`);
      
      labScene.traverse((child) => {
        if (child.name) {
          console.log('[SciFiLabScene] Found object:', child.name, 'type:', child.type, 'isMesh:', child.isMesh);
          
          // Debug: Check for puppy or penguin in the name (case insensitive)
          if (child.name.toLowerCase().includes('puppy') || child.name.toLowerCase().includes('penguin') || 
              child.name === 'Shiba inu' || child.name === 'Cube' || child.name === 'Roundcube' || child.name === 'Roundcube.001' || child.name === 'Roundcube.002' || child.name === 'Roundcube.003') {
            console.log('[SciFiLabScene] *** FOUND ANIMAL OBJECT ***:', child.name, 'type:', child.type, 'isMesh:', child.isMesh);
            if (child.parent) {
              console.log('[SciFiLabScene]   Parent:', child.parent.name);
            }
          }
          
          // Check if this is the Circle object/mesh or Crystal5 or Torus
          if (child.name === 'Halo.002' || child.name.toLowerCase().includes('halo') || child.name === 'Crystal5' || 
              child.name === 'Torus' || child.name.toLowerCase().includes('torus') ||
              (child.parent && child.parent.name === 'individual' && child.isMesh)) {
            console.log('[SciFiLabScene] Found object for bloom effect:', child.name, 'parent:', child.parent?.name);
            foundBloomTargets.push(child);
            
            // Set up bloom properties
            if (child.isMesh && child.material) {
              // Make the material emissive for bloom
              child.material = child.material.clone();
              
              // Different bloom settings for different objects
              if (child.name === 'Crystal5') {
                child.material.emissive = new THREE.Color(0xff0000); // Red for crystal
                child.material.emissiveIntensity = 0.5; // Moderate bloom
              } else if (child.name === 'Torus' || child.name.toLowerCase().includes('torus') || 
                        (child.parent && child.parent.name === 'individual')) {
                child.material.emissive = new THREE.Color(0x2aff5c); // Cyan for torus/individual's child
                child.material.emissiveIntensity = 3; // Strong bloom
              } else {
                child.material.emissive = new THREE.Color(0x00ff41); // Cyber green for halo
                child.material.emissiveIntensity = 4;
              }
              
              child.layers.enable(1); // Enable bloom layer
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
          
          // Hide collision object and its children
          if (child.name && child.name.toLowerCase() === 'collision') {
            console.log('[SciFiLabScene] Hiding collision object:', child.name);
            child.visible = false;
            child.traverse((subChild) => {
              subChild.visible = false;
              console.log('[SciFiLabScene] Hiding collision child:', subChild.name);
            });
          }

        }
      });
      
      console.log('[SciFiLabScene] Traversal complete.');
      
      // Look for puppy as the initial mesh
      let initialMesh = null;
      let initialMeshName = null;
      
      console.log('[SciFiLabScene] ========== LOOKING FOR INITIAL MESH ==========');
      console.log('[SciFiLabScene] Looking for puppy as initial mesh...');
        
        // Try to find puppy's Shiba inu mesh - try different variations
        let puppyGroup = labScene.getObjectByName('puppy');
        if (!puppyGroup) puppyGroup = labScene.getObjectByName('Puppy');
        if (!puppyGroup) {
          // Try to find by traversing and checking names
          labScene.traverse((child) => {
            if (child.name && child.name.toLowerCase().includes('puppy') && !puppyGroup) {
              puppyGroup = child;
              console.log('[SciFiLabScene] Found puppy with name:', child.name);
            }
          });
        }
        console.log('[SciFiLabScene] Puppy group found?', puppyGroup ? 'YES' : 'NO');
        
        if (puppyGroup) {
          console.log('[SciFiLabScene] Traversing puppy group...');
          puppyGroup.traverse((child) => {
            console.log(`[SciFiLabScene]   - Found in puppy: ${child.name} (${child.type})`);
            if ((child.name === 'Shiba_inu_DIF_0' || child.name === 'Shiba inu') && child.isMesh && child.geometry && !initialMesh) {
              initialMesh = child;
              initialMeshName = 'puppy';
              console.log('[SciFiLabScene] ✓ Using puppy mesh as initial mesh:', child.name);
            }
          });
        }
        
        // If still no mesh, try penguin
        if (!initialMesh) {
          console.log('[SciFiLabScene] Still no mesh, trying penguin...');
          let penguinGroup = labScene.getObjectByName('penguin');
          if (!penguinGroup) penguinGroup = labScene.getObjectByName('Penguin');
          if (!penguinGroup) {
            // Try to find by traversing and checking names
            labScene.traverse((child) => {
              if (child.name && child.name.toLowerCase().includes('penguin') && !penguinGroup) {
                penguinGroup = child;
                console.log('[SciFiLabScene] Found penguin with name:', child.name);
              }
            });
          }
          console.log('[SciFiLabScene] Penguin group found?', penguinGroup ? 'YES' : 'NO');
          
          if (penguinGroup) {
            console.log('[SciFiLabScene] Looking for meshes in penguin...');
            // First log all children to see what's available
            penguinGroup.traverse((child) => {
              console.log(`[SciFiLabScene]   - Found in penguin: ${child.name} (${child.type})`);
              // Look for the main body meshes (Cube or Roundcube)
              if (child.isMesh && child.geometry && !initialMesh && 
                  (child.name === 'Cube' || child.name === 'Roundcube' || child.name.includes('Roundcube'))) {
                initialMesh = child;
                initialMeshName = 'penguin';
                console.log('[SciFiLabScene] ✓ Using penguin mesh as initial mesh:', child.name);
              }
            });
          }
        }
      
      // Last resort - if still no mesh, just grab the first mesh we can find
      if (!initialMesh) {
        console.log('[SciFiLabScene] Last resort - looking for ANY mesh...');
        labScene.traverse((child) => {
          if (child.isMesh && child.geometry && !initialMesh && child.name !== 'Plane' && !child.name.includes('Grid')) {
            initialMesh = child;
            initialMeshName = 'first-found';
            console.log('[SciFiLabScene] Using first available mesh:', child.name);
          }
        });
      }
      
      console.log('[SciFiLabScene] ========== INITIAL MESH RESULT ==========');
      console.log('[SciFiLabScene] Initial mesh:', initialMesh ? initialMesh.name : 'NONE');
      console.log('[SciFiLabScene] Initial mesh type:', initialMeshName);
      
      setBloomTargets(foundBloomTargets);
      

      // Create and store the animation mixer if there are animations
      if (gltf.animations && gltf.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(labScene);
        mixerRef.current = mixer;

        // Play all animations
        gltf.animations.forEach((animation) => {
          const action = mixer.clipAction(animation);
          
          // Check if this is the Open_Capsule animation on Object_4 or touchscreen animation
          if (animation.name === 'Open_Capsule') {
            // Find Object_4 in the scene
            const object4 = labScene.getObjectByName('Object_4');
            if (object4) {
              // Create a clipped version of the animation (frames 0-40)
              // Assuming 30fps, frames 0-40 would be approximately 0 to 1.33 seconds
              const fps = 30; // Standard animation fps
              const startTime = 0;
              const endTime = 40 / fps; // 40 frames at 30fps = 1.33 seconds
              
              // Create a new animation clip with the restricted duration
              const clippedAnimation = animation.clone();
              clippedAnimation.duration = endTime - startTime;
              
              // Create action from the clipped animation
              const clippedAction = mixer.clipAction(clippedAnimation, object4);
              clippedAction.loop = THREE.LoopRepeat; // Set to loop
              clippedAction.timeScale = 0.5; // Half speed
              clippedAction.play();
              
              // Store reference to capsule animation
              capsuleActionRef.current = clippedAction;
              
              console.log(`Playing clipped animation: ${animation.name} (frames 0-40, looped at half speed)`);
            } else {
              // If Object_4 not found, play normally
              action.play();
              console.log(`Playing animation: ${animation.name} (Object_4 not found)`);
            }
          } else if (animation.name === 'touchscreen') {
            // Set touchscreen animation to loop
            action.loop = THREE.LoopRepeat;
            action.play();
            console.log(`Playing animation: ${animation.name} (looped)`);
          } else {
            // Skip other animations for now
            console.log(`Skipping animation: ${animation.name}`);
          }
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
      
      // Center horizontally but adjust vertical position to sit on the grid
      labScene.position.x -= center.x;
      labScene.position.z -= center.z;
      
      // Position the model so its bottom sits just above the grid (grid is at y = -0.8)
      const minY = box.min.y;
      labScene.position.y = -minY - 1.6; // This will place the bottom of the model at the grid level

      sceneRef.current = labScene;
      groupRef.current = { anchor: anchorGroup, rotation: rotationGroup };

      // Add custom lighting for the lab scene
      const ambientLight = new THREE.AmbientLight(is80sMode ? 0xD946EF : 0x404040, 0.8); // Increased from 0.5
      anchorGroup.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(is80sMode ? 0x00ff41 : 0xffffff, 1);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      anchorGroup.add(directionalLight);

      // Add a point light for dramatic effect
      const pointLight = new THREE.PointLight(is80sMode ? 0x67e8f9 : 0x0088ff, 1, 10);
      pointLight.position.set(0, 2, 0);
      anchorGroup.add(pointLight);

      // Add spotlight focused on the model with hardcoded settings
      const spotlight = new THREE.SpotLight(
        is80sMode ? '#D946EF' : '#ffffff', // color
        3, // intensity - increased from 2
        25, // distance - increased from 20
        0.524, // angle
        0.3, // penumbra - reduced for sharper edge
        1 // decay
      );
      spotlight.position.set(0, 5, 5);
      spotlight.target.position.set(0, 0, 0);
      spotlight.castShadow = true;
      
      // Configure shadow properties for better quality
      spotlight.shadow.mapSize.width = 1024;
      spotlight.shadow.mapSize.height = 1024;
      spotlight.shadow.camera.near = 0.5;
      spotlight.shadow.camera.far = 20;
      
      anchorGroup.add(spotlight);
      anchorGroup.add(spotlight.target);

      // Create grid ground
      const gridHelper = new THREE.GridHelper(15, 15, is80sMode ? 0x00ff41 : 0x0088ff, is80sMode ? 0xD946EF : 0x004488);
      gridHelper.material.opacity = 0.6; // Increased from 0.3 for better visibility
      gridHelper.material.transparent = true;
      gridHelper.position.y = -0.8;
      anchorGroup.add(gridHelper);
      
      // Add a subtle glow plane under the grid for better visibility
      const planeGeometry = new THREE.PlaneGeometry(15, 15);
      const planeMaterial = new THREE.MeshBasicMaterial({ 
        color: is80sMode ? 0x1a0033 : 0x000033,
        opacity: 0.2,
        transparent: true
      });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.rotation.x = -Math.PI / 2;
      plane.position.y = -0.85;
      anchorGroup.add(plane);

      // Add the anchor group to the scene
      scene.add(anchorGroup);

      // Create CyberParticleEffect if we found any initial mesh
      console.log('[SciFiLabScene] ========== PARTICLE EFFECT CREATION ==========');
      if (initialMesh) {
        console.log('[SciFiLabScene] Creating CyberParticleEffect for mesh:', initialMesh.name, 'type:', initialMeshName);
        console.log('[SciFiLabScene] Initial mesh geometry:', initialMesh.geometry);
        console.log('[SciFiLabScene] Initial mesh geometry vertices:', initialMesh.geometry.attributes.position?.count || 'NO POSITION ATTRIBUTE');
        try {
          // Get mesh's world position
          initialMesh.updateMatrixWorld(true);
          const worldPosition = new THREE.Vector3();
          initialMesh.getWorldPosition(worldPosition);
          
          // Create a container group to hold the particle effect
          const particleContainer = new THREE.Group();
          particleContainer.position.copy(worldPosition);
          
          // Raise the particle objects by 1 unit
          particleContainer.position.y += 1;
          
          // Get rotation and scale
          const worldQuaternion = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          initialMesh.getWorldQuaternion(worldQuaternion);
          initialMesh.getWorldScale(worldScale);
          
          particleContainer.quaternion.copy(worldQuaternion);
          
          // Use world scale as-is
          particleContainer.scale.copy(worldScale);
          
          // Clone the initial geometry (keep original position from Blender)
          const initialGeometry = initialMesh.geometry.clone();
          // Don't center - preserve position from Blender
          
          // Create the effect
          const cyberEffect = new CyberParticleEffectSimple(initialGeometry, gl, {
            autoScale: false, // Disable auto scale to use original sizes
            targetSize: 1 // Keep original size
          });
          
          // Hide the initial mesh since we're showing it as particles
          initialMesh.visible = false;
          console.log('[SciFiLabScene] Hiding initial mesh:', initialMesh.name);
          
          // Configure the effect
          cyberEffect.parameters.particleSize = 0.008; // Reduced size for subtler effect
          cyberEffect.parameters.colorMode = CyberParticleEffectSimple.COLOR_MODES.MATRIX_GREEN;
          cyberEffect.parameters.glitchIntensity = 0.05; // Reduced glitch intensity
          cyberEffect.parameters.digitMode = true; // Enable digit mode to show 1s and 0s
          cyberEffect.parameters.holographicIntensity = 0.3; // Reduced for more subtle effect
          
          // No flow field in the simple version - particles maintain their positions
          
          // Add morph targets from other objects in the scene
          const morphTargets = [];
          
          // Try to find puppy as a morph target (if not already used as initial)
          if (initialMeshName !== 'puppy') {
            const puppyGroup = labScene.getObjectByName('puppy');
            if (puppyGroup) {
              console.log('[SciFiLabScene] Found puppy group, looking for Shiba inu mesh...');
              let puppyMeshFound = false;
              puppyGroup.traverse((child) => {
                // Look specifically for the Shiba inu mesh
                if ((child.name === 'Shiba_inu_DIF_0' || child.name === 'Shiba inu') && child.isMesh && child.geometry) {
                  // Don't apply world matrix - just use the geometry as-is
                  // This prevents position offsets during morphing
                  cyberEffect.addMorphTarget('puppy', child.geometry);
                  morphTargets.push('puppy');
                  console.log('[SciFiLabScene] Added puppy mesh as morph target:', child.name);
                  console.log('[SciFiLabScene] Puppy geometry vertices:', child.geometry.attributes.position.count);
                  child.visible = false;
                  puppyMeshFound = true;
                }
              });
            
              // Hide the entire puppy group if we found the mesh
              if (puppyMeshFound) {
                puppyGroup.visible = false;
              }
            }
          }
          
          // Try to find penguin as a morph target (if not already used as initial)
          if (initialMeshName !== 'penguin') {
            console.log('[SciFiLabScene] ========== SEARCHING FOR PENGUIN MORPH TARGET ==========');
            
            // First try to find a penguin group/object
            let penguinGroup = null;
            let penguinMeshDirect = null;
            
            // Look for penguin by name - check in different containers
            console.log('[SciFiLabScene] Looking for penguin in scene...');
            
            // Check direct children
            penguinGroup = labScene.getObjectByName('penguin') || labScene.getObjectByName('Penguin');
            
            // Check inside Sketchfab_model containers
            if (!penguinGroup) {
              ['Sketchfab_model', 'Sketchfab_model001', 'root'].forEach(containerName => {
                const container = labScene.getObjectByName(containerName);
                if (container && !penguinGroup) {
                  console.log(`[SciFiLabScene] Checking inside ${containerName}...`);
                  const found = container.getObjectByName('penguin') || 
                               container.getObjectByName('Penguin') ||
                               container.getObjectByName('penguin.fbx') ||
                               container.getObjectByName('RootNode.001');
                  if (found) {
                    penguinGroup = found;
                    console.log(`[SciFiLabScene] Found penguin inside ${containerName}: ${found.name}`);
                  }
                }
              });
            }
            
            if (!penguinGroup) {
              console.log('[SciFiLabScene] No penguin group found, looking for individual penguin meshes...');
              
              // Look for specific penguin meshes
              labScene.traverse((child) => {
                if (child.name && child.isMesh && child.geometry) {
                  // Check for the specific penguin mesh names
                  if (child.name === 'Roundcube.001_material_0' || 
                      child.name === 'Roundcube_Material_0' ||
                      child.name.includes('Roundcube') ||
                      child.name.toLowerCase().includes('penguin')) {
                    console.log(`[SciFiLabScene] Found potential penguin mesh: ${child.name}`);
                    
                    // Check if this mesh has a parent that might be the penguin group
                    let parent = child.parent;
                    while (parent && parent !== labScene) {
                      if (parent.name && (parent.name.toLowerCase().includes('penguin') || 
                          parent.name === 'penguin.fbx' || 
                          parent.name === 'RootNode.001')) {
                        console.log(`[SciFiLabScene] Found penguin parent: ${parent.name}`);
                        penguinGroup = parent;
                        break;
                      }
                      parent = parent.parent;
                    }
                    
                    // If still no group, use the mesh directly
                    if (!penguinGroup && !penguinMeshDirect) {
                      penguinMeshDirect = child;
                      console.log(`[SciFiLabScene] Will use mesh directly: ${child.name}`);
                    }
                  }
                }
              });
            }
            
            if (penguinGroup) {
            console.log('[SciFiLabScene] Found penguin group:', penguinGroup.name);
            console.log('[SciFiLabScene] Penguin children:');
            penguinGroup.children.forEach(child => {
              console.log(`[SciFiLabScene]   - Direct child: ${child.name} (${child.type})`);
            });
            
            const penguinMeshes = [];
            
            // Collect all mesh geometries from penguin
            penguinGroup.traverse((child) => {
              console.log(`[SciFiLabScene] Checking penguin child: ${child.name} (${child.type}, isMesh: ${child.isMesh}, hasGeometry: ${!!child.geometry})`);
              if (child.isMesh && child.geometry) {
                console.log('[SciFiLabScene] Found penguin mesh:', child.name);
                
                // Check size of each mesh
                child.geometry.computeBoundingBox();
                const box = child.geometry.boundingBox;
                const size = new THREE.Vector3();
                box.getSize(size);
                console.log(`[SciFiLabScene]   - ${child.name} size:`, size, 'vertices:', child.geometry.attributes.position.count);
                
                penguinMeshes.push(child.geometry);
                child.visible = false;
              }
            });
            
            // If we found meshes, find the largest one (main body)
            if (penguinMeshes.length > 0) {
              console.log('[SciFiLabScene] Found', penguinMeshes.length, 'penguin meshes');
              
              // Find the largest mesh by vertex count or bounding box volume
              let largestMesh = null;
              let largestVertexCount = 0;
              
              penguinGroup.traverse((child) => {
                if (child.isMesh && child.geometry) {
                  const vertexCount = child.geometry.attributes.position.count;
                  if (vertexCount > largestVertexCount) {
                    largestVertexCount = vertexCount;
                    largestMesh = child;
                  }
                }
              });
              
              if (largestMesh) {
                // Clone geometry and apply rotation fix for penguin
                const penguinGeometry = largestMesh.geometry.clone();
                
                // Rotate penguin 90 degrees to correct orientation
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeRotationX(-Math.PI / 2); // Rotate -90 degrees around X axis
                penguinGeometry.applyMatrix4(rotationMatrix);
                
                // Don't center - preserve position from Blender
                
                console.log('[SciFiLabScene] Applied rotation correction to penguin');
                
                cyberEffect.addMorphTarget('penguin', penguinGeometry);
                morphTargets.push('penguin');
                console.log('[SciFiLabScene] Added largest penguin mesh as morph target:', largestMesh.name);
                console.log('[SciFiLabScene] Penguin geometry vertices:', largestMesh.geometry.attributes.position.count);
                
                // Log bounding box to check size
                largestMesh.geometry.computeBoundingBox();
                const box = largestMesh.geometry.boundingBox;
                const size = new THREE.Vector3();
                box.getSize(size);
                console.log('[SciFiLabScene] Penguin mesh size:', size);
              }
              
              // Hide the entire penguin group
              penguinGroup.visible = false;
            } else {
              console.log('[SciFiLabScene] WARNING: No penguin meshes found in penguin group!');
            }
          } else if (penguinMeshDirect) {
            // Use the mesh directly as a morph target
            console.log('[SciFiLabScene] Using penguin mesh directly as morph target:', penguinMeshDirect.name);
            
            // Update world matrix before adding as morph target
            penguinMeshDirect.updateMatrixWorld(true);
            
            // Create a geometry with world transformations applied
            const worldGeometry = penguinMeshDirect.geometry.clone();
            worldGeometry.applyMatrix4(penguinMeshDirect.matrixWorld);
            
            cyberEffect.addMorphTarget('penguin', worldGeometry);
            morphTargets.push('penguin');
            console.log('[SciFiLabScene] Added penguin mesh as morph target directly');
            console.log('[SciFiLabScene] Penguin geometry vertices:', penguinMeshDirect.geometry.attributes.position.count);
            
            // Hide the mesh
            penguinMeshDirect.visible = false;
          } else {
            // Last resort - look for specific penguin mesh names
            console.log('[SciFiLabScene] Looking for specific penguin meshes by name...');
            
            // First, let's see ALL objects with "Roundcube" in the name
            console.log('[SciFiLabScene] Searching for ALL Roundcube objects...');
            const roundcubeObjects = [];
            const allMeshes = [];
            labScene.traverse((child) => {
              if (child.isMesh && child.name) {
                allMeshes.push(child.name);
              }
              if (child.name && (child.name.includes('Roundcube') || child.name.includes('roundcube'))) {
                console.log(`[SciFiLabScene] Found Roundcube object: "${child.name}" (type: ${child.type}, isMesh: ${child.isMesh})`);
                roundcubeObjects.push(child);
              }
            });
            console.log(`[SciFiLabScene] Total Roundcube objects found: ${roundcubeObjects.length}`);
            console.log('[SciFiLabScene] All mesh names in scene:', allMeshes);
            
            // Try exact names
            const roundcube1 = labScene.getObjectByName('Roundcube.001_material_0');
            const roundcube2 = labScene.getObjectByName('Roundcube_Material_0');
            
            // If exact names don't work, try the first Roundcube mesh we find
            let penguinMesh = roundcube1 || roundcube2;
            if (!penguinMesh && roundcubeObjects.length > 0) {
              // Find the first mesh in the roundcube objects
              penguinMesh = roundcubeObjects.find(obj => obj.isMesh && obj.geometry);
              if (penguinMesh) {
                console.log(`[SciFiLabScene] Using first Roundcube mesh found: ${penguinMesh.name}`);
              }
            }
            
            if (roundcube1 || roundcube2 || penguinMesh) {
              // Use whichever one we found
              if (!penguinMesh) {
                penguinMesh = roundcube1 || roundcube2;
              }
              console.log('[SciFiLabScene] Found penguin mesh:', penguinMesh.name);
              
              // Update world matrix before adding as morph target
              penguinMesh.updateMatrixWorld(true);
              
              // Create a geometry with world transformations applied
              const worldGeometry = penguinMesh.geometry.clone();
              worldGeometry.applyMatrix4(penguinMesh.matrixWorld);
              
              cyberEffect.addMorphTarget('penguin', worldGeometry);
              morphTargets.push('penguin');
              console.log('[SciFiLabScene] Added penguin mesh as morph target');
              console.log('[SciFiLabScene] Penguin geometry vertices:', penguinMesh.geometry.attributes.position.count);
              
              // Hide both meshes if they exist
              if (roundcube1) roundcube1.visible = false;
              if (roundcube2) roundcube2.visible = false;
            } else {
              console.log('[SciFiLabScene] WARNING: Penguin not found in scene!');
              console.log('[SciFiLabScene] The penguin object needs to be added to the GLB file.');
              console.log('[SciFiLabScene] Please export a new version of nativ80Scene4.glb from Blender that includes the penguin object.');
            }
          }
          }
          
          // Add pepe as a morph target
          const pepeGroup = labScene.getObjectByName('pepe') || labScene.getObjectByName('Pepe');
          if (pepeGroup) {
            console.log('[SciFiLabScene] Found pepe group, adding as morph target...');
            
            // For pepe at root level, it might be a direct mesh
            if (pepeGroup.isMesh && pepeGroup.geometry) {
              console.log('[SciFiLabScene] Pepe is a direct mesh');
              
              // Clone geometry and apply transformations
              const pepeGeometry = pepeGroup.geometry.clone();
              const rotationMatrix = new THREE.Matrix4();
              rotationMatrix.makeRotationX(-Math.PI / 2); // Rotate -90 degrees around X axis
              pepeGeometry.applyMatrix4(rotationMatrix);
              
              // Don't center - preserve position from Blender
              
              console.log('[SciFiLabScene] Applied rotation correction to pepe');
              
              cyberEffect.addMorphTarget('pepe', pepeGeometry);
              morphTargets.push('pepe');
              pepeGroup.visible = false;
            } else {
              // Look for meshes inside pepe group
              console.log('[SciFiLabScene] Looking for meshes inside pepe group...');
              const pepeMeshes = [];
              
              pepeGroup.traverse((child) => {
                if (child.isMesh && child.geometry) {
                  console.log('[SciFiLabScene] Found pepe mesh:', child.name, 'vertices:', child.geometry.attributes.position.count);
                  pepeMeshes.push(child);
                  child.visible = false;
                }
              });
              
              // Combine all pepe meshes into one geometry
              if (pepeMeshes.length > 0) {
                console.log('[SciFiLabScene] Found', pepeMeshes.length, 'pepe meshes, combining them...');
                
                // Create an array to hold all geometries
                const geometries = [];
                
                for (const mesh of pepeMeshes) {
                  // Clone the geometry and apply only the mesh's local transform
                  const clonedGeometry = mesh.geometry.clone();
                  // Apply only local transform, not world transform
                  clonedGeometry.applyMatrix4(mesh.matrix);
                  geometries.push(clonedGeometry);
                }
                
                // Merge all geometries into one
                const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
                console.log('[SciFiLabScene] Merged pepe geometry has', mergedGeometry.attributes.position.count, 'vertices');
                
                // Apply rotation correction to the merged geometry
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeRotationX(-Math.PI / 2); // Rotate -90 degrees around X axis
                mergedGeometry.applyMatrix4(rotationMatrix);
                
                // Calculate bounds to check position
                mergedGeometry.computeBoundingBox();
                const pepeBox = mergedGeometry.boundingBox;
                const pepeCenter = new THREE.Vector3();
                pepeBox.getCenter(pepeCenter);
                console.log('[SciFiLabScene] Pepe merged geometry center:', pepeCenter);
                
                // Translate the geometry to center it
                mergedGeometry.translate(-pepeCenter.x, -pepeCenter.y, -pepeCenter.z);
                console.log('[SciFiLabScene] Translated pepe geometry to center');
                
                cyberEffect.addMorphTarget('pepe', mergedGeometry);
                morphTargets.push('pepe');
              }
              
              // Hide the entire pepe group
              pepeGroup.visible = false;
            }
          } else {
            console.log('[SciFiLabScene] Pepe not found in scene');
          }
          
          // Add hippo as a morph target
          const hippoGroup = labScene.getObjectByName('hippo') || labScene.getObjectByName('Hippo');
          if (hippoGroup) {
            console.log('[SciFiLabScene] Found hippo group, adding as morph target...');
            
            // For hippo at root level, it might be a direct mesh
            if (hippoGroup.isMesh && hippoGroup.geometry) {
              console.log('[SciFiLabScene] Hippo is a direct mesh');
              
              // Clone geometry and apply transformations
              const hippoGeometry = hippoGroup.geometry.clone();
              const rotationMatrix = new THREE.Matrix4();
              rotationMatrix.makeRotationX(-Math.PI / 2); // Rotate -90 degrees around X axis
              hippoGeometry.applyMatrix4(rotationMatrix);
              
              // Don't center - preserve position from Blender
              
              console.log('[SciFiLabScene] Applied rotation correction to hippo');
              
              cyberEffect.addMorphTarget('hippo', hippoGeometry);
              morphTargets.push('hippo');
              hippoGroup.visible = false;
            } else {
              // Look for meshes inside hippo group
              console.log('[SciFiLabScene] Looking for meshes inside hippo group...');
              const hippoMeshes = [];
              
              hippoGroup.traverse((child) => {
                if (child.isMesh && child.geometry) {
                  console.log('[SciFiLabScene] Found hippo mesh:', child.name);
                  hippoMeshes.push(child);
                  child.visible = false;
                }
              });
              
              // Use the largest mesh if multiple found
              if (hippoMeshes.length > 0) {
                let largestMesh = hippoMeshes[0];
                let largestVertexCount = largestMesh.geometry.attributes.position.count;
                
                for (const mesh of hippoMeshes) {
                  const vertexCount = mesh.geometry.attributes.position.count;
                  if (vertexCount > largestVertexCount) {
                    largestVertexCount = vertexCount;
                    largestMesh = mesh;
                  }
                }
                
                console.log('[SciFiLabScene] Using largest hippo mesh:', largestMesh.name, 'with', largestVertexCount, 'vertices');
                
                // Clone geometry and apply transformations for hippo
                const hippoGeometry = largestMesh.geometry.clone();
                
                // Rotate hippo 90 degrees to correct orientation
                const rotationMatrix = new THREE.Matrix4();
                rotationMatrix.makeRotationX(-Math.PI / 2); // Rotate -90 degrees around X axis
                hippoGeometry.applyMatrix4(rotationMatrix);
                
                // Don't center - preserve position from Blender
                
                console.log('[SciFiLabScene] Applied rotation correction to hippo');
                
                cyberEffect.addMorphTarget('hippo', hippoGeometry);
                morphTargets.push('hippo');
              }
              
              // Hide the entire hippo group
              hippoGroup.visible = false;
            }
          } else {
            console.log('[SciFiLabScene] Hippo not found in scene');
          }
          
          // Start morphing if we have targets
          if (morphTargets.length > 0) {
            console.log('[SciFiLabScene] ========== MORPH TARGETS SUMMARY ==========');
            console.log('[SciFiLabScene] Initial mesh:', initialMeshName);
            console.log('[SciFiLabScene] Morph targets:', morphTargets);
            console.log('[SciFiLabScene] Total positions in effect:', cyberEffect.positions.length);
            
            // Log details about each position
            cyberEffect.positions.forEach((pos, index) => {
              const stats = calculateStats(pos.array);
              const targetName = index === 0 ? initialMeshName : morphTargets[index - 1];
              console.log(`[SciFiLabScene] Position ${index} (${targetName}): vertices=${pos.count}, size=${(stats.maxX - stats.minX).toFixed(2)} x ${(stats.maxY - stats.minY).toFixed(2)} x ${(stats.maxZ - stats.minZ).toFixed(2)}`);
            });
            console.log('[SciFiLabScene] ==========================================');
            
            // Log what we're actually morphing between
            console.log('[SciFiLabScene] Morph sequence will be:');
            console.log(`  0: ${initialMeshName} (initial)`);
            morphTargets.forEach((target, index) => {
              console.log(`  ${index + 1}: ${target}`);
            });
            
            // Start automatic morphing loop
            const morphLoop = () => {
              if (cyberEffectRef.current) {
                const currentIndex = cyberEffectRef.current.currentIndex;
                const currentName = currentIndex === 0 ? initialMeshName : morphTargets[currentIndex - 1];
                const nextIndex = (currentIndex + 1) % cyberEffectRef.current.positions.length;
                const targetName = nextIndex === 0 ? initialMeshName : morphTargets[nextIndex - 1];
                
                console.log(`[SciFiLabScene] ===== MORPHING =====`);
                console.log(`[SciFiLabScene] Current shape: ${currentName} (index ${currentIndex})`);
                console.log(`[SciFiLabScene] Morphing to: ${targetName} (index ${nextIndex})`);
                console.log(`[SciFiLabScene] ===================`);
                
                cyberEffectRef.current.morphToNext();
                setTimeout(morphLoop, 6000); // 6 seconds per morph for better visibility
              }
            };
            setTimeout(morphLoop, 2000); // Start after 2 seconds
          } else {
            console.log('[SciFiLabScene] No morph targets found to animate between');
          }
          
          // Add the particle effect to the container
          particleContainer.add(cyberEffect.points);
          
          // Ensure particles are visible
          cyberEffect.points.position.set(0, 0, 0);
          console.log('[SciFiLabScene] Particle container world position:', worldPosition);
          
          // Set render order to ensure particles render on top
          cyberEffect.points.renderOrder = 999;
          cyberEffect.points.frustumCulled = false; // Disable frustum culling
          
          // Add the container to the rotation group
          console.log('[SciFiLabScene] Adding particle container to rotation group');
          rotationGroup.add(particleContainer);
          cyberEffectRef.current = cyberEffect;
          particleContainerRef.current = particleContainer;
          
          console.log('[SciFiLabScene] CyberParticleEffect created successfully');
        } catch (error) {
          console.error('[SciFiLabScene] Failed to create CyberParticleEffect:', error);
        }
      } else {
        console.error('[SciFiLabScene] ========== NO INITIAL MESH FOUND ==========');
        console.error('[SciFiLabScene] Cannot create particle effect without an initial mesh!');
        console.error('[SciFiLabScene] Please ensure puppy or penguin objects exist in the scene.');
      }

      setModelLoaded(true);

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
    };
  }, [scene, loader, gl]); // Reduced dependencies to prevent re-runs

  useFrame((state, delta) => {
    // Update the animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
    
    // Update CyberParticleEffect
    if (cyberEffectRef.current) {
      cyberEffectRef.current.update();
    }

    // Animate the particle container only
    if (particleContainerRef.current) {
      // Gentle rotation in place
      particleContainerRef.current.rotation.z += delta * 0.3; // Slow rotation
      
      // Sync hover with capsule animation if available
      const baseHeight = 0.34; // Base height for particle objects
      let hoverAmount = 0;
      
      if (capsuleActionRef.current && mixerRef.current) {
        // Get the normalized time (0-1) of the capsule animation
        const normalizedTime = capsuleActionRef.current.time / capsuleActionRef.current.getClip().duration;
        
        // Create a smooth up-and-down motion synced with capsule opening
        // Use a sine wave that completes one cycle as the capsule opens and closes
        hoverAmount = Math.sin(normalizedTime * Math.PI * 2) * 0.01; // Increased amplitude for more visible effect
      } else {
        // Fallback to time-based hover if no capsule animation
        hoverAmount = Math.sin(state.clock.elapsedTime * 1.2) * 0.03;
      }
      
      particleContainerRef.current.position.y = baseHeight + hoverAmount;
    }

    if (sceneRef.current && groupRef.current) {
      // Apply hover animation to the anchor group
      if (hover) {
        groupRef.current.anchor.position.y =
          initialY.current + Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      }

      // Apply rotation to the rotation group
      if (rotate) {
        groupRef.current.rotation.rotation.y += delta * 0.3;
      }
    }
  });

  // Always return the bloom effect to avoid re-mounting
  return (
    <>
    <PostProcessingEffects />
      {/* {bloomTargets.length > 0 && (
        <EffectComposer>
          <Bloom
            intensity={0.3}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.9}
            height={300}
            opacity={0.6}
            kernelSize={3}
            mipmapBlur
          />
        </EffectComposer>
      )} */}
      {modelLoaded && <SimpleGlitchTint />}
    </>
  );
}

export default memo(SciFiLabScene);