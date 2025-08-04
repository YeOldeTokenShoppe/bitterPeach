import React, { useRef, Suspense, useEffect, useState, useCallback, useMemo, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import TickerCanvasTextureApplier from './TickerCanvasTextureApplier';
import ConstellationModel from '../components/3DVotiveStand/ConstellationModel';
import StarField from '../components/3DVotiveStand/StarField';
import Object2Replacer from './Object2Replacer';
import AnnotationSystem from './3DVotiveStand/AnnotationSystem';
import PostProcessingEffects from './3DVotiveStand/PostProcessingEffects';
import FloatingCandleViewer from './3DVotiveStand/CandleInteraction';
import { useFirestoreResults } from '../utilities/useFirestoreResults';
import { detectDevice, getSceneSettings, optimizeTexture, texturePool } from '../utilities/performanceOptimizer';
import { useMusic, MusicContext } from '../contexts/MusicContext';
import CinematicCamera from './CinematicCamera';
//hi
// Version string for cache busting - update this when model changes
const MODEL_VERSION = '1.0.1';

function CathedralModel({ onModelLoad, children, isPlaying = false, onCandleClick, showFloatingViewer, device, currentTrackBPM = 100 }) {
  const gltf = useGLTF(`/cathedral.glb?v=${MODEL_VERSION}`);
  const modelRef = useRef();
  const groupRef = useRef();
  const { actions, mixer } = useAnimations(gltf.animations, modelRef);
  const danceTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const cyborg3SequenceRef = useRef(['SitIdle2', 'SitIdle2', 'SitIdle2', 'SitClap2']); // Cyborg3: 3x SitIdle2, then 1x SitClap2
  const cyborg3IndexRef = useRef(0); // Current index in the sequence
  const cyborg3ListenerRef = useRef(null); // Store the event listener for cleanup
  const cyborg0ListenerRef = useRef(null); // Store Cyborg0's transition listener
  const cyborg2ListenerRef = useRef(null); // Store Cyborg2's transition listener
  const { camera } = useThree();
  const results = useFirestoreResults();
  const textureLoader = useRef(new THREE.TextureLoader());
  
  // Nightclub lighting refs
  const spotlightsRef = useRef([]);
  const lightGroupRef = useRef();
  
  // Video screen refs
  const videoRef = useRef();
  const videoTextureRef = useRef();
  const videoWallsRef = useRef([]); // Store multiple walls
  const originalMaterialsRef = useRef(new Map()); // Store original materials for each wall

  // Calculate animation speed multiplier based on BPM
  // Base BPM of 100 = 1.0 speed multiplier
  // Slower songs (85 BPM) = 0.85 speed
  // Faster songs (120 BPM) = 1.2 speed
  const getAnimationSpeedFromBPM = useCallback((baseBPM = 100) => {
    return currentTrackBPM / baseBPM;
  }, [currentTrackBPM]);

  // Function to optimize texture loading
  const loadOptimizedTexture = useCallback((url, onLoad) => {
    // Use the texture loader directly
    textureLoader.current.load(
      url,
      texture => {
        // Apply optimizations
        texture.generateMipmaps = true;
        texture.anisotropy = 4;

        // Return the optimized texture
        onLoad(texture);
      },
      undefined,
      error => {
        console.error("Error loading texture:", error);
      }
    );
  }, []);

  // Function to apply user image to candle labels
  const applyUserImageToLabel = useCallback((candle, user) => {
    if (!user?.image) return;

    // Find label objects
    const label1Objects = candle.children.filter(child => child.name.includes("Label1"));
    const label2Objects = candle.children.filter(
      child => child.name.includes("Label2") && !child.name.includes("Label1")
    );

    if (label1Objects.length === 0 && label2Objects.length === 0) return;

    // Use optimized texture loader
    loadOptimizedTexture(user.image, texture => {
      // Apply to both Label1 and Label2 objects with vertical flip
      [...label1Objects, ...label2Objects].forEach(label => {
        if (label.material) {
          // Dispose of existing materials/textures
          if (label.material.map) {
            label.material.map.dispose();
          }
          label.material.dispose();

          // Clone texture and flip vertically only
          const flippedTexture = texture.clone();
          flippedTexture.wrapS = THREE.RepeatWrapping;
          flippedTexture.wrapT = THREE.RepeatWrapping;
          flippedTexture.repeat.y = -1; // Flip vertically only
          flippedTexture.needsUpdate = true;

          // Create new material with flipped texture
          label.material = new THREE.MeshStandardMaterial({
            map: flippedTexture,
            transparent: true,
            side: THREE.DoubleSide,
          });
          label.material.needsUpdate = true;
        }
      });
    });
  }, [loadOptimizedTexture]);

  // Handle candle clicks
  const handleCandleClick = useCallback((event) => {
    event.stopPropagation();

    // Only handle clicks on VCANDLEs
    const getEventCoordinates = () => {
      // Check if it's a touch event
      if (event.nativeEvent.touches && event.nativeEvent.touches.length > 0) {
        const touch = event.nativeEvent.touches[0];
        const bounds = event.nativeEvent.target.getBoundingClientRect();
        return {
          x: ((touch.clientX - bounds.left) / bounds.width) * 2 - 1,
          y: -((touch.clientY - bounds.top) / bounds.height) * 2 + 1,
        };
      }
      // Regular mouse event
      return {
        x: event.clientX !== undefined ? (event.clientX / window.innerWidth) * 2 - 1 : 0,
        y: event.clientY !== undefined ? -(event.clientY / window.innerHeight) * 2 + 1 : 0,
      };
    };

    const coords = getEventCoordinates();
    const mouse = new THREE.Vector2(coords.x, coords.y);

    const candleRaycaster = new THREE.Raycaster();
    candleRaycaster.setFromCamera(mouse, camera);

    // Find all VCANDLE objects and their children
    const intersectableObjects = [];
    if (modelRef.current) {
      modelRef.current.traverse(object => {
        // Check for VCANDLE objects
        if (object.name && (object.name.match(/^VCANDLE001\d{3}$/) || object.name === 'VCANDLE001' || object.name.startsWith("VCANDLE"))) {
          intersectableObjects.push(object);
          // Also include children for better click detection
          object.children.forEach(child => {
            if (
              child.name.includes("Label1") ||
              child.name.includes("wax") ||
              child.name.includes("glass") ||
              child.name.includes("Label2")
            ) {
              intersectableObjects.push(child);
            }
          });
        }
      });
    }

    const intersects = candleRaycaster.intersectObjects(intersectableObjects, true);
    if (intersects.length > 0) {
      let candleParent = intersects[0].object;
      // Find the parent VCANDLE object
      while (candleParent && !candleParent.name.match(/^VCANDLE/)) {
        candleParent = candleParent.parent;
      }

      if (candleParent && candleParent.userData.hasUser) {
        // Call the onCandleClick prop with the candle data
        onCandleClick({
          ...candleParent.userData,
          candleId: candleParent.name,
          candleTimestamp: Date.now(),
        });
      }
    }
  }, [camera, modelRef, onCandleClick]);

  useEffect(() => {
    if (gltf.scene && modelRef.current) {
      // Enable shadows selectively for better performance
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          // Find the video walls
          if (child.name === 'pPlane3_Walls_0' || child.name === 'pPlane4_Walls_0') {
            console.log('Found video wall:', child.name);
            originalMaterialsRef.current.set(child.name, child.material);
            child.userData.isVideoWall = true;
            videoWallsRef.current.push(child);
          }
          // Make GodsRay objects non-clickable
          if (child.name && (child.name.includes('GodsRay') || child.name.includes('Godsray') || 
              child.name.includes('godray') || child.name.includes('GodRay'))) {
            child.raycast = () => {}; // Empty function prevents raycasting
            child.material.depthWrite = false; // Ensure transparency works correctly
            console.log(`Made ${child.name} non-clickable`);
          }
          
          // Ensure floor tiles and other objects respond to dynamic lights
          if (child.name && (child.name.includes('Stone_Ground') || 
              child.name.includes('Floor') || 
              child.name.includes('Wall') ||
              child.name.includes('Column'))) {
            
            // Ensure the material responds to lights
            if (child.material) {
              // If it's a basic material, convert to a light-responsive one
              if (child.material.type === 'MeshBasicMaterial') {
                const oldMaterial = child.material;
                child.material = new THREE.MeshStandardMaterial({
                  color: oldMaterial.color,
                  map: oldMaterial.map,
                  roughness: 0.8,
                  metalness: 0.2
                });
                oldMaterial.dispose();
                console.log(`Converted ${child.name} from MeshBasicMaterial to MeshStandardMaterial`);
              }
              
              // Force all materials to be MeshStandardMaterial or MeshPhongMaterial
              if (child.material.type !== 'MeshStandardMaterial' && 
                  child.material.type !== 'MeshPhongMaterial' &&
                  child.material.type !== 'MeshPhysicalMaterial') {
                console.log(`Warning: ${child.name} has material type ${child.material.type} which may not respond to lights`);
              }
              
              // Ensure material properties allow light interaction
              child.material.needsUpdate = true;
            }
          }
          
          // Only large objects cast shadows
          if (child.name.includes('Wall') || child.name.includes('Column') || 
              child.name.includes('Roof') || child.name.includes('Floor')) {
            child.castShadow = true;
          }
          // Most objects receive shadows
          child.receiveShadow = true;
        }
      });
      
      // Calculate the model's bounding box after positioning
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      // console.log('Model world center:', center);
      
      // Debug: Log all skinned meshes and their skeletons
      const skinnedMeshes = [];
      gltf.scene.traverse((child) => {
        if (child.isSkinnedMesh) {
          skinnedMeshes.push({
            name: child.name,
            skeletonName: child.skeleton?.bones[0]?.name || 'unknown',
            parent: child.parent?.name || 'unknown'
          });
        }
      });
      console.log('Skinned meshes in scene:', skinnedMeshes);
      
      // Debug: Check for VCANDLE objects and all objects in scene
      let candleCount = 0;
      const allObjects = [];
      gltf.scene.traverse((child) => {
        if (child.name) {
          allObjects.push(child.name);
          if (child.name.startsWith('VCANDLE') || child.name.includes('candle') || child.name.includes('Candle')) {
            candleCount++;
            console.log('Found candle object:', child.name);
          }
        }
      });
      console.log('Total VCANDLE objects found:', candleCount);
      console.log('All objects in scene:', allObjects.filter(name => name.length > 0));
      
      // Pass the center to parent component
      if (onModelLoad) {
        onModelLoad(center);
      }
    }
  }, [gltf, onModelLoad]);

  // Apply user data to VCANDLE objects
  useEffect(() => {
    if (!gltf.scene) return;

    // First, find all VCANDLE objects to hide only their flames
    const vcandleFlames = [];
    gltf.scene.traverse((child) => {
      // Check if this is a VCANDLE object
      if (child.name && child.name.startsWith('VCANDLE')) {
        // Hide flames that are children of VCANDLE objects
        child.traverse((vcandleChild) => {
          if (vcandleChild.name && (vcandleChild.name.includes('FLAME') || vcandleChild.name.includes('Flame') || 
              vcandleChild.name.includes('flame') || vcandleChild.name.includes('Fire') || 
              vcandleChild.name.includes('XFlame'))) {
            vcandleChild.visible = false;
            vcandleFlames.push(vcandleChild);
          }
        });
      }
    });
    console.log(`Hidden ${vcandleFlames.length} flames from VCANDLE objects`);

    // Find all candle objects with various naming patterns
    const vcandleObjects = [];
    const candlePatterns = [];
    
    gltf.scene.traverse((child) => {
      if (child.name && (
        child.name.match(/^VCANDLE001\d{3}$/) || // VCANDLE001XXX
        child.name === 'VCANDLE001' || // Single VCANDLE001
        child.name.match(/^Candle\d+$/) || // CandleXXX
        child.name.match(/^XCandle\d+$/) // XCandleXXXXX
      )) {
        // Skip certain candle types that might not be interactive
        if (!child.name.includes('Japanese_candles') && 
            !child.name.includes('SM_Prop_Candle_Rack')) {
          vcandleObjects.push(child);
          
          // Track pattern types for debugging
          if (!candlePatterns.includes(child.name.substring(0, 6))) {
            candlePatterns.push(child.name.substring(0, 6));
          }
        }
      }
    });
    
    console.log('Candle patterns found:', candlePatterns);
    console.log('Candle objects found:', vcandleObjects.map(c => c.name));
    
    // Sort with VCANDLE objects first, then others
    vcandleObjects.sort((a, b) => {
      // Prioritize VCANDLE objects
      const aIsVCandle = a.name.startsWith('VCANDLE');
      const bIsVCandle = b.name.startsWith('VCANDLE');
      
      if (aIsVCandle && !bIsVCandle) return -1;
      if (!aIsVCandle && bIsVCandle) return 1;
      
      // Within the same type, sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    // Filter to only VCANDLE objects that have Label children for user data
    const vcandlesWithLabels = vcandleObjects.filter(candle => {
      const hasLabels = candle.children.some(child => 
        child.name.includes("Label1") || child.name.includes("Label2")
      );
      return candle.name.startsWith('VCANDLE') && hasLabels;
    });
    
    console.log(`Found ${vcandleObjects.length} total candles, ${vcandlesWithLabels.length} VCANDLE objects with labels`);

    // First ensure all VCANDLES are initially visible
    vcandlesWithLabels.forEach((candle) => {
      candle.visible = true;
    });

    if (!results || results.length === 0) {
      // No user data, hide all VCANDLEs with labels
      vcandlesWithLabels.forEach((candle) => {
        candle.visible = false;
        console.log(`Hid ${candle.name} - no user data available`);
      });
      return;
    }

    console.log('Applying user data to candles. Results:', results);

    // Sort results by burnedAmount (descending) and createdAt (descending)
    const sortedByBurnedAmount = [...results].sort((a, b) => (b.burnedAmount || 0) - (a.burnedAmount || 0));
    const sortedByCreatedAt = [...results].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Get top 4 burners
    const topBurnersArray = sortedByBurnedAmount.slice(0, 4);

    // Get next 4 most recent users, excluding those already in topBurners
    const recentUsersArray = sortedByCreatedAt
      .filter(user => !topBurnersArray.some(topUser => topUser.id === user.id))
      .slice(0, 4);

    // Apply the users to candles - distribute them every 12th candle
    // On mobile devices, increase spacing to reduce number of visible candles
    const spacing = device.isLowEnd ? 24 : 12; // Place a user candle every 12th/24th position
    
    // Combine all users into one array, alternating between top burners and recent users
    const allUsers = [];
    const maxLength = Math.max(topBurnersArray.length, recentUsersArray.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < topBurnersArray.length) {
        allUsers.push({ ...topBurnersArray[i], isTopBurner: true });
      }
      if (i < recentUsersArray.length) {
        allUsers.push({ ...recentUsersArray[i], isTopBurner: false });
      }
    }
    
    // Apply users to VCANDLEs with labels only, with even spacing
    allUsers.forEach((user, index) => {
      const candleIndex = index * spacing; // 0, 12, 24, 36, 48, 60, 72, 84
      if (candleIndex < vcandlesWithLabels.length) {
        const candle = vcandlesWithLabels[candleIndex];
        // Make sure the candle is visible
        candle.visible = true;
        
        candle.userData = {
          ...candle.userData,
          hasUser: true,
          userName: user.userName,
          userId: user.id,
          burnedAmount: user.burnedAmount,
          image: user.image,
          message: user.message,
          createdAt: user.createdAt,
          isTopBurner: user.isTopBurner,
        };
        console.log(`Applied user data to ${candle.name} (position ${candleIndex}):`, user.userName);
        
        // Apply the image to the candle's labels
        applyUserImageToLabel(candle, user);
        
        // Show flames for this candle
        candle.traverse((child) => {
          if (child.name && (child.name.includes('FLAME') || child.name.includes('Flame') || 
              child.name.includes('flame') || child.name.includes('Fire'))) {
            child.visible = true; // Show flame for candles with user data
          }
        });
      }
    });
    
    // Hide remaining candles (non-user candles) that have labels
    let hiddenCandleCount = 0;
    let skippedCandleCount = 0;
    
    vcandlesWithLabels.forEach((candle, index) => {
      // Skip if this candle already has user data
      if (candle.userData && candle.userData.hasUser) {
        skippedCandleCount++;
        console.log(`Skipping ${candle.name} - already has user data`);
        return;
      }
      
      // Hide candles without user data
      candle.visible = false;
      candle.userData = {
        ...candle.userData,
        hasUser: false,
        isDefault: true,
      };
      
      hiddenCandleCount++;
      console.log(`Hid ${candle.name} (${hiddenCandleCount}) - no user data`);
      
      // Ensure flames are hidden for these candles
      candle.traverse((child) => {
        if (child.name && (child.name.includes('FLAME') || child.name.includes('Flame') || 
            child.name.includes('flame') || child.name.includes('Fire'))) {
          child.visible = false;
        }
      });
    });
    
    console.log(`Summary: ${vcandlesWithLabels.length} VCANDLEs with labels, ${skippedCandleCount} with user data, ${hiddenCandleCount} hidden`);
  }, [results, gltf.scene, applyUserImageToLabel]);

  // Function to play next animation in Cyborg3's sequence
  const playNextCyborg3Animation = () => {
    if (!actions || !mixer || !isInitializedRef.current) return;
    
    const sequence = cyborg3SequenceRef.current;
    const currentIndex = cyborg3IndexRef.current;
    const animName = sequence[currentIndex];
    
    // console.log(`Cyborg3: Attempting to play ${animName} (${currentIndex + 1}/${sequence.length})`);
    // console.log('Available Cyborg3 animations:', Object.keys(actions).filter(name => 
    //   sequence.includes(name) || name === 'StandClap'
    // ));
    
    if (actions[animName]) {
      // Stop ALL Cyborg3-related animations first
      ['SitClap', 'SitIdle2', 'SitClap2', 'StandClap'].forEach(name => {
        if (actions[name] && actions[name].isRunning()) {
          actions[name].stop();
          // console.log(`Stopped ${name}`);
        }
      });
      
      // Play the current animation once
      actions[animName].reset();
      actions[animName].setLoop(THREE.LoopOnce, 1);
      actions[animName].clampWhenFinished = false;
      actions[animName].play();
      // console.log(`✅ Started playing ${animName}`);
      
      // Set up listener for when this animation finishes
      const onFinished = (e) => {
        if (e.action === actions[animName]) {
          // console.log(`${animName} finished`);
          mixer.removeEventListener('finished', onFinished);
          // Move to next animation in sequence
          cyborg3IndexRef.current = (currentIndex + 1) % sequence.length;
          playNextCyborg3Animation();
        }
      };
      mixer.addEventListener('finished', onFinished);
    } else {
      // console.log(`❌ Animation ${animName} not found in actions`);
    }
  };

  // Initial animation setup
  useEffect(() => {
    if (actions && !isInitializedRef.current) {
      // console.log('Available animations:', Object.keys(actions));
      
      // Check specifically for SAMBA animations
      const sambaAnims = Object.keys(actions).filter(name => name.toUpperCase().includes('SAMBA'));
      // console.log('SAMBA animations found:', sambaAnims);
      
      // Make sure all SAMBA animations are stopped initially
      sambaAnims.forEach(sambaName => {
        if (actions[sambaName]) {
          actions[sambaName].stop();
          actions[sambaName].timeScale = 1.0; // Reset time scale
        }
      });
      
      // Play all initial animations that are NOT SAMBA and not in Cyborg3's sequence
      const cyborg3Animations = cyborg3SequenceRef.current;
      const transitionAnimations = ['PrayToStand', 'StandToPray', 'SitToStand']; // Animations that shouldn't loop
      
      Object.entries(actions).forEach(([name, action]) => {
        if (!name.toUpperCase().includes('SAMBA') && 
            !cyborg3Animations.includes(name) &&
            !transitionAnimations.includes(name)) {
          // Special handling for flame animation
          if (name === 'Take 001') {
            action.timeScale = 0.5; // Half speed for flame animation
            console.log('Setting Take 001 flame animation to half speed');
          } else {
            action.timeScale = 1.0; // Ensure normal speed for others
          }
          action.play();
          // console.log(`Playing initial animation: ${name}`);
        }
      });
      
      // Start Cyborg3's sequence
      playNextCyborg3Animation();
      
      // Mark as initialized
      isInitializedRef.current = true;
    }
  }, [actions]);

  // Update animation speeds when BPM changes while playing
  useEffect(() => {
    if (isPlaying && actions) {
      const speedMultiplier = getAnimationSpeedFromBPM();
      
      // Update speeds for all dance animations
      Object.entries(actions).forEach(([name, action]) => {
        if (action.isRunning() && (
          name.toUpperCase().includes('SAMBA') || 
          name.toUpperCase().includes('SALSA') ||
          name === 'Cheer' ||
          name === 'BBOYHIPHOP' ||
          name === 'GUITAR' ||
          name === 'SitClap'
        )) {
          action.timeScale = 0.5 * speedMultiplier;
        }
      });
    }
  }, [currentTrackBPM, isPlaying, actions, getAnimationSpeedFromBPM]);

  // Handle nightclub lighting effects when music plays
  useEffect(() => {
    if (spotlightsRef.current.length === 0) return;
    
    console.log('Nightclub lighting effect triggered. isPlaying:', isPlaying, 'Lights:', spotlightsRef.current.length);
    
    if (isPlaying) {
      // Turn on nightclub lights with fade-in effect
      spotlightsRef.current.forEach((light, i) => {
        light.visible = true;
        // Helper code commented out
        // if (light.userData.helper) {
        //   light.userData.helper.visible = true;
        // }
        if (light.userData.pointLight) {
          light.userData.pointLight.visible = true;
        }
        // Stagger the fade-in
        setTimeout(() => {
          light.intensity = 0;
          if (light.userData.pointLight) {
            light.userData.pointLight.intensity = 0;
          }
          const fadeIn = setInterval(() => {
            light.intensity += 2.0; // Even larger increment
            if (light.userData.pointLight) {
              light.userData.pointLight.intensity += 0.5;
            }
            if (light.intensity >= 30.0) { // Much higher max intensity for visibility
              light.intensity = 50.0;
              if (light.userData.pointLight) {
                light.userData.pointLight.intensity = 5.0;
              }
              clearInterval(fadeIn);
              console.log(`Light ${i} fully faded in with intensity:`, light.intensity);
            }
          }, 50);
        }, i * 200);
      });
    } else {
      // Turn off nightclub lights with fade-out
      spotlightsRef.current.forEach((light) => {
        const fadeOut = setInterval(() => {
          light.intensity -= 1.0;
          if (light.userData.pointLight) {
            light.userData.pointLight.intensity -= 0.4;
          }
          if (light.intensity <= 0) {
            light.intensity = 0;
            light.visible = false;
            if (light.userData.pointLight) {
              light.userData.pointLight.intensity = 0;
              light.userData.pointLight.visible = false;
            }
            // Helper code commented out
            // if (light.userData.helper) {
            //   light.userData.helper.visible = false;
            // }
            clearInterval(fadeOut);
          }
        }, 50);
      });
    }
  }, [isPlaying]);

  // Handle video screen effect when music plays
  useEffect(() => {
    if (!gltf.scene || videoWallsRef.current.length === 0) return;
    
    if (isPlaying) {
      console.log(`Starting video on ${videoWallsRef.current.length} walls`);
      
      // Create video element
      const video = document.createElement('video');
      video.src = '/83.mov';
      video.loop = true;
      video.muted = true; // Required for autoplay
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      videoRef.current = video;
      
      // Create video texture
      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBFormat;
      videoTexture.encoding = THREE.sRGBEncoding;
      videoTextureRef.current = videoTexture;
      
      // Create emissive material for the video
      const videoMaterial = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
        toneMapped: false
      });
      
      // Apply video material to all video walls
      videoWallsRef.current.forEach(wall => {
        console.log(`Applying video to wall: ${wall.name}`);
        wall.material = videoMaterial;
      });
      
      // Start playing
      video.play().catch(err => {
        console.error('Error playing video:', err);
      });
      
    } else {
      console.log('Stopping video on walls');
      
      // Stop and clean up video
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
        videoRef.current = null;
      }
      
      // Restore original materials to all walls
      videoWallsRef.current.forEach(wall => {
        const originalMaterial = originalMaterialsRef.current.get(wall.name);
        if (originalMaterial) {
          wall.material = originalMaterial;
          console.log(`Restored original material to wall: ${wall.name}`);
        }
      });
      
      // Dispose of video texture
      if (videoTextureRef.current) {
        videoTextureRef.current.dispose();
        videoTextureRef.current = null;
      }
    }
    
    // Cleanup function
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
      if (videoTextureRef.current) {
        videoTextureRef.current.dispose();
      }
    };
  }, [isPlaying, gltf.scene]);

  // Handle animation switching when isPlaying changes
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0 || !isInitializedRef.current) {
      // console.log('[Cathedral] Animation switching skipped - not ready');
      return;
    }
    
    // console.log('[Cathedral] Switching animations. isPlaying:', isPlaying);
    // console.log('[Cathedral] Available animations:', Object.keys(actions));
    
    if (isPlaying) {
      // console.log('[Cathedral] Music started, characters will start dancing in 2 seconds...');
      
      // Clear any existing timeout
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
      }
      
      // Delay the dance animations by 2 seconds
      danceTimeoutRef.current = setTimeout(() => {
        // console.log('[Cathedral] Starting dance animations after delay...');
        
        // First, let's see what animations are available
        // console.log('All available animations:', Object.keys(actions));
        
        // First, identify which animations have corresponding SAMBA/SALSA versions
        const hasDanceVersion = {};
        Object.keys(actions).forEach(name => {
          const upperName = name.toUpperCase();
          if (upperName.includes('SAMBA') || upperName.includes('SALSA')) {
            // Mark that we have a dance version
            hasDanceVersion[name] = true;
          }
        });
        
        // Only stop animations if there's a corresponding dance animation
        Object.entries(actions).forEach(([name, action]) => {
          const upperName = name.toUpperCase();
          // Only stop if this isn't a dance animation AND we have dance animations available
          if (!upperName.includes('SAMBA') && !upperName.includes('SALSA') && action.isRunning()) {
            // For now, stop all non-dance animations
            // This will be improved once all characters have dance animations
            action.stop();
            // console.log(`Stopped animation: ${name}`);
          }
        });
        
        // Handle Cyborg0's transition: PrayToStand -> SAMBA0
        if (actions['PrayToStand'] && actions['SAMBA0']) {
          // Stop Pray animation
          if (actions['Pray']) {
            actions['Pray'].stop();
            // console.log('Stopped Pray animation for Cyborg0');
          }
          
          // Debug info
          // console.log('PrayToStand duration:', actions['PrayToStand'].getClip().duration);
          
          // Play PrayToStand transition once
          actions['PrayToStand'].reset();
          actions['PrayToStand'].setLoop(THREE.LoopOnce, 1);
          actions['PrayToStand'].clampWhenFinished = true; // Keep last frame to avoid T-pose
          actions['PrayToStand'].play();
          // console.log('Playing PrayToStand transition for Cyborg0');
          
          // Set up listener to play SAMBA0 after transition
          const onTransitionFinished = (e) => {
            // console.log('Transition finished event fired for:', e.action === actions['PrayToStand'] ? 'PrayToStand' : 'other');
            if (e.action === actions['PrayToStand']) {
              mixer.removeEventListener('finished', onTransitionFinished);
              cyborg0ListenerRef.current = null;
              
              // Ensure PrayToStand is fully stopped
              actions['PrayToStand'].stop();
              
              if (isPlaying && actions['SAMBA0']) {
                // Start SAMBA0
                actions['SAMBA0'].reset();
                actions['SAMBA0'].timeScale = 0.5 * getAnimationSpeedFromBPM(); // Half speed adjusted by BPM
                actions['SAMBA0'].setLoop(THREE.LoopRepeat);
                actions['SAMBA0'].play();
                // console.log('Started SAMBA0 for Cyborg0 after transition');
              } else {
                // console.log('Cannot start SAMBA0 - isPlaying:', isPlaying, 'has SAMBA0:', !!actions['SAMBA0']);
                // Fallback to Pray if something went wrong
                if (actions['Pray']) {
                  actions['Pray'].reset();
                  actions['Pray'].play();
                }
              }
            }
          };
          cyborg0ListenerRef.current = onTransitionFinished;
          mixer.addEventListener('finished', onTransitionFinished);
        }
        
        // Handle Cyborg2's transition: SitToStand -> Cheer
        if (actions['SitToStand'] && actions['Cheer'] && actions['Sit']) {
          // Stop Sit animation
          actions['Sit'].stop();
          // console.log('Stopped Sit animation for Cyborg2');
          
          // Play SitToStand transition once
          actions['SitToStand'].reset();
          actions['SitToStand'].setLoop(THREE.LoopOnce, 1);
          actions['SitToStand'].clampWhenFinished = true; // Keep last frame to avoid T-pose
          actions['SitToStand'].play();
          // console.log('Playing SitToStand transition for Cyborg2');
          
          // Set up listener to play Cheer after transition
          const onCyborg2TransitionFinished = (e) => {
            if (e.action === actions['SitToStand']) {
              mixer.removeEventListener('finished', onCyborg2TransitionFinished);
              cyborg2ListenerRef.current = null;
              
              // Ensure SitToStand is fully stopped
              actions['SitToStand'].stop();
              
              if (isPlaying && actions['Cheer']) {
                // Start Cheer at half speed
                actions['Cheer'].reset();
                actions['Cheer'].timeScale = 0.5 * getAnimationSpeedFromBPM(); // Half speed adjusted by BPM
                actions['Cheer'].setLoop(THREE.LoopRepeat);
                actions['Cheer'].play();
                // console.log('Started Cheer for Cyborg2 after transition (half speed)');
              }
            }
          };
          cyborg2ListenerRef.current = onCyborg2TransitionFinished;
          mixer.addEventListener('finished', onCyborg2TransitionFinished);
        }
        
        // Handle Cyborg4's BBOYHIPHOP animation
        if (actions['BBOYHIPHOP'] && actions['Leaning']) {
          // Stop Leaning animation
          actions['Leaning'].stop();
          // console.log('Stopped Leaning animation for Cyborg4');
          
          // Debug info
          const clip = actions['BBOYHIPHOP'].getClip();
          // console.log('BBOYHIPHOP animation info:', {
          //   duration: clip.duration,
          //   tracks: clip.tracks.length,
          //   fps: clip.fps || 'default'
          // });
          
          // Play BBOYHIPHOP animation
          actions['BBOYHIPHOP'].reset();
          actions['BBOYHIPHOP'].timeScale = 0.5 * getAnimationSpeedFromBPM(); // Half speed adjusted by BPM
          actions['BBOYHIPHOP'].setLoop(THREE.LoopRepeat);
          actions['BBOYHIPHOP'].clampWhenFinished = false; // Don't clamp to avoid hitches
          actions['BBOYHIPHOP'].play();
          // console.log('Playing BBOYHIPHOP animation for Cyborg4 (half speed)');
        }
        
        // Handle CyborgInAlley's GUITAR animation
        if (actions['GUITAR'] && actions['StandDrink']) {
          // Stop StandDrink animation
          actions['StandDrink'].stop();
          // console.log('Stopped StandDrink animation for CyborgInAlley');
          
          // Play GUITAR animation
          actions['GUITAR'].reset();
          actions['GUITAR'].timeScale = 0.5 * getAnimationSpeedFromBPM(); // Half speed adjusted by BPM
          actions['GUITAR'].setLoop(THREE.LoopRepeat);
          actions['GUITAR'].play();
          // console.log('Playing GUITAR animation for CyborgInAlley (half speed)');
        }
        
        // Play other SAMBA/SALSA animations (excluding SAMBA0 which is handled above)
        let danceFound = false;
        const danceAnimations = [];
        
        Object.entries(actions).forEach(([name, action]) => {
          const upperName = name.toUpperCase();
          // Check for SAMBA, SALSA, or any dance-related animation (exclude SAMBA0 and SAMBA2)
          if ((upperName.includes('SAMBA') || upperName.includes('SALSA')) && 
              name !== 'SAMBA0' && 
              name !== 'SAMBA2') {
            danceAnimations.push(name);
            // console.log(`Found dance animation: ${name}, currently running: ${action.isRunning()}`);
            
            action.stop(); // Make sure it's stopped first
            action.reset();
            action.timeScale = 0.5 * getAnimationSpeedFromBPM(); // Half speed adjusted by BPM
            action.play();
            danceFound = true;
            
            // Verify the animation is actually playing
            setTimeout(() => {
              console.log(`Animation ${name} is running: ${action.isRunning()}, time: ${action.time}, timeScale: ${action.timeScale}`);
            }, 100);
          }
        });
        
        // Stop Cyborg3's sequence when music plays
        const cyborg3Animations = ['SitClap', 'SitIdle2', 'StandClap'];
        cyborg3Animations.forEach(animName => {
          if (actions[animName] && actions[animName].isRunning()) {
            actions[animName].stop();
            // console.log(`Stopped Cyborg3 animation: ${animName}`);
          }
        });
        
        // Play StandClap once, then switch to SitClap for Cyborg3 during music
        if (actions['StandClap'] && actions['SitClap'] && !actions['SAMBA_Cyborg3']) {
          actions['StandClap'].reset();
          actions['StandClap'].setLoop(THREE.LoopOnce, 1);
          actions['StandClap'].clampWhenFinished = false;
          actions['StandClap'].play();
          // console.log('Playing StandClap once for Cyborg3 during music');
          
          // Set up listener to switch to SitClap after StandClap finishes
          const onStandClapFinished = (e) => {
            if (e.action === actions['StandClap']) {
              mixer.removeEventListener('finished', onStandClapFinished);
              cyborg3ListenerRef.current = null; // Clear the reference
              // Only play SitClap if music is still playing
              if (isPlaying) {
                actions['SitClap'].reset();
                actions['SitClap'].setLoop(THREE.LoopRepeat);
                actions['SitClap'].play();
                // console.log('Switched to looping SitClap for Cyborg3');
              }
            }
          };
          cyborg3ListenerRef.current = onStandClapFinished; // Store the listener
          mixer.addEventListener('finished', onStandClapFinished);
        }
        
        if (danceFound) {
          // console.log(`✅ Playing ${danceAnimations.length} dance animation(s):`, danceAnimations);
        } else {
          // console.log('❌ No SAMBA/SALSA animations found. Available:', Object.keys(actions));
        }
      }, 2000); // 2 second delay
      
    } else {
      // Switch back to idle animations
      // console.log('[Cathedral] Switching back to idle animations');
      
      // Clear any pending dance timeout
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
        danceTimeoutRef.current = null;
      }
      
      // Stop all SAMBA animations, transition animations, Cheer, BBOYHIPHOP, and GUITAR
      Object.entries(actions).forEach(([name, action]) => {
        if (name.toUpperCase().includes('SAMBA') || 
            name === 'PrayToStand' || 
            name === 'Cheer' ||
            name === 'BBOYHIPHOP' ||
            name === 'GUITAR') {
          action.stop();
          action.reset(); // Reset to beginning
          action.timeScale = 1.0; // Reset speed
          // console.log(`Stopped animation: ${name}`);
          
          // Double-check SAMBA2 is stopped
          if (name === 'SAMBA2') {
            // console.log('Ensured SAMBA2 is stopped for Cyborg2');
          }
        }
      });
      
      // First, immediately stop all Cyborg3 animations to prevent any brief playback
      ['StandClap', 'SitClap', 'SitIdle2'].forEach(animName => {
        if (actions[animName]) {
          actions[animName].stop();
          actions[animName].reset();
        }
      });
      
      // Clean up any pending event listeners
      if (cyborg3ListenerRef.current && mixer) {
        mixer.removeEventListener('finished', cyborg3ListenerRef.current);
        cyborg3ListenerRef.current = null;
        // console.log('Removed pending Cyborg3 listener');
      }
      
      if (cyborg0ListenerRef.current && mixer) {
        mixer.removeEventListener('finished', cyborg0ListenerRef.current);
        cyborg0ListenerRef.current = null;
        // console.log('Removed pending Cyborg0 listener');
      }
      
      // Double-check and stop any Cyborg3 music animations again
      ['StandClap', 'SitClap'].forEach(animName => {
        if (actions[animName] && actions[animName].isRunning()) {
          actions[animName].stop();
          // console.log(`Stopped ${animName} for Cyborg3`);
        }
      });
      
      // Resume Cyborg3's sequence with a small delay to ensure clean transition
      cyborg3IndexRef.current = 0; // Reset to start of sequence
      setTimeout(() => {
        playNextCyborg3Animation();
      }, 50); // Small delay to ensure all animations are fully stopped
      // console.log('Resumed Cyborg3 animation sequence');
      
      // Handle Cyborg0's transition back to Pray
      if (actions['SAMBA0'] && actions['SAMBA0'].isRunning()) {
        actions['SAMBA0'].stop();
        // console.log('Stopped SAMBA0');
      }
      
      if (actions['Pray']) {
        actions['Pray'].reset();
        actions['Pray'].setLoop(THREE.LoopRepeat);
        actions['Pray'].play();
        // console.log('Resumed Pray animation for Cyborg0');
      }
      
      // Handle Cyborg2's transition back to Sit
      if (actions['Sit']) {
        actions['Sit'].reset();
        actions['Sit'].setLoop(THREE.LoopRepeat);
        actions['Sit'].play();
        // console.log('Resumed Sit animation for Cyborg2');
      }
      
      // Handle Cyborg4's transition back to Leaning
      if (actions['Leaning']) {
        actions['Leaning'].reset();
        actions['Leaning'].setLoop(THREE.LoopRepeat);
        actions['Leaning'].play();
        // console.log('Resumed Leaning animation for Cyborg4');
      }
      
      // Handle CyborgInAlley's transition back to StandDrink
      if (actions['StandDrink']) {
        actions['StandDrink'].reset();
        actions['StandDrink'].setLoop(THREE.LoopRepeat);
        actions['StandDrink'].play();
        // console.log('Resumed StandDrink animation for CyborgInAlley');
      }
      
      // Resume all other non-SAMBA/dance animations
      const cyborg3Animations = cyborg3SequenceRef.current;
      const transitionAnimations = ['PrayToStand', 'StandToPray', 'SitToStand']; // Animations that shouldn't loop
      
      Object.entries(actions).forEach(([name, action]) => {
        const upperName = name.toUpperCase();
        // Skip dance animations, Cyborg3's sequence animations, transition animations, and specifically handled animations
        if (!upperName.includes('SAMBA') && 
            !upperName.includes('SALSA') && 
            !cyborg3Animations.includes(name) &&
            !transitionAnimations.includes(name) &&
            name !== 'Pray' &&
            name !== 'Sit' &&
            name !== 'Cheer' &&
            name !== 'Leaning' &&
            name !== 'BBOYHIPHOP' &&
            name !== 'StandDrink' &&
            name !== 'GUITAR') {
          action.reset();
          // Maintain half speed for flame animation
          if (name === 'Take 001') {
            action.timeScale = 0.2;
          }
          action.play();
          // console.log(`Resumed animation: ${name}`);
        }
      });
    }
    
    // Cleanup function
    return () => {
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
        danceTimeoutRef.current = null;
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    if (groupRef.current) {
      // Create grid ground - scaled up to match cathedral size
      const gridHelper = new THREE.GridHelper(200, 50, 0x00ff41, 0x00ff41);
      gridHelper.material.opacity = 0.3;
      gridHelper.material.transparent = true;
      gridHelper.position.y = -60.2; // Position relative to cathedral base
      groupRef.current.add(gridHelper);
      
      // Add a shadow-receiving ground plane
      const groundGeometry = new THREE.PlaneGeometry(200, 200);
      const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -60.2;
      ground.receiveShadow = true;
      groupRef.current.add(ground);
      
      // Create nightclub lighting group
      const lightGroup = new THREE.Group();
      lightGroupRef.current = lightGroup;
      groupRef.current.add(lightGroup);
      
      // Create spotlights for nightclub effect - positioned relative to cathedral
      // Cathedral is at position [0, -60, -15] with rotation [0, Math.PI / 1.2, 0]
      const spotlightColors = [0xff00ff, 0x00ffff, 0xff0080, 0x00ff80]; // Purple, Cyan, Pink, Teal
      const spotlightPositions = [
        [10, -40, 0],     // Front right (raised and centered)
        [-10, -40, 0],    // Front left
        [15, -40, -20],   // Back right
        [-15, -40, -20]   // Back left
      ];
      
      console.log('Creating nightclub spotlights...');
      
      spotlightPositions.forEach((pos, i) => {
        const spotlight = new THREE.SpotLight(spotlightColors[i], 0); // Start with 0 intensity
        spotlight.position.set(...pos);
        spotlight.angle = Math.PI / 5; // Wider for more coverage
        spotlight.penumbra = 0.5; // Balanced edge softness
        spotlight.distance = 200; // Much longer reach
        spotlight.intensity = 0; // Start at 0
        spotlight.decay = 1; // Standard decay
        spotlight.castShadow = false; // Performance optimization
        spotlight.visible = false; // Start hidden
        
        // Create target for spotlight
        const target = new THREE.Object3D();
        target.position.set(0, -60, -15); // Point towards cathedral center (same as model position)
        lightGroup.add(target);
        spotlight.target = target;
        
        // Store original position and color for animations
        spotlight.userData = {
          originalPosition: pos,
          originalColor: new THREE.Color(spotlightColors[i]),
          colorIndex: i,
          target: target
        };
        
        // Add a helper to visualize spotlight cone (optional, for debugging)
        // Commenting out helpers to remove the colored lines
        // const helper = new THREE.SpotLightHelper(spotlight);
        // helper.visible = false; // Start hidden
        // spotlight.userData.helper = helper;
        // lightGroup.add(helper);
        
        lightGroup.add(spotlight);
        spotlightsRef.current.push(spotlight);
        
        console.log(`Created spotlight ${i}:`, {
          position: spotlight.position,
          target: target.position,
          color: spotlight.color,
          angle: spotlight.angle,
          intensity: spotlight.intensity
        });
        
        // Add a point light at the spotlight position for extra glow
        const pointLight = new THREE.PointLight(spotlightColors[i], 0, 50);
        pointLight.position.copy(spotlight.position);
        pointLight.visible = false;
        lightGroup.add(pointLight);
        
        // Store point light reference in spotlight userData
        spotlight.userData.pointLight = pointLight;
      });
      
      return () => {
        groupRef.current.remove(gridHelper);
        gridHelper.material.dispose();
        gridHelper.geometry.dispose();
        groupRef.current.remove(ground);
        groundGeometry.dispose();
        groundMaterial.dispose();
        
        // Clean up spotlights
        spotlightsRef.current.forEach(light => {
          if (light.parent) light.parent.remove(light);
          light.dispose();
        });
        spotlightsRef.current = [];
        
        if (lightGroupRef.current && lightGroupRef.current.parent) {
          lightGroupRef.current.parent.remove(lightGroupRef.current);
        }
      };
    }
  }, []);


  // Update animation mixer and animate spotlights
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
    
    // Animate nightclub spotlights when playing
    if (isPlaying && spotlightsRef.current.length > 0) {
      const time = state.clock.getElapsedTime();
      const bpmFactor = currentTrackBPM / 100; // Normalize to base BPM
      
      spotlightsRef.current.forEach((light, i) => {
        if (!light.visible || light.intensity === 0) return;
        
        // Animate spotlight movement
        const speed = bpmFactor * 0.5;
        const offset = i * Math.PI / 3;
        
        // Create circular/figure-8 movement patterns
        const pattern = i % 3;
        let x, z;
        
        switch (pattern) {
          case 0: // Circle pattern
            x = Math.sin(time * speed + offset) * 10;
            z = Math.cos(time * speed + offset) * 10;
            break;
          case 1: // Figure-8 pattern
            x = Math.sin(time * speed + offset) * 15;
            z = Math.sin(time * speed * 2 + offset) * 8;
            break;
          case 2: // Sweep pattern
            x = Math.sin(time * speed * 0.7 + offset) * 20;
            z = Math.cos(time * speed * 0.5 + offset) * 5;
            break;
        }
        
        // Update target position
        light.userData.target.position.x = x;
        light.userData.target.position.z = -10 + z;
        
        // Color cycling based on music
        const hue = (time * speed * 0.1 + i * 0.16) % 1;
        light.color.setHSL(hue, 1, 0.5);
        
        // Intensity pulsing (between 25 and 35 for maximum visibility)
        const pulse = Math.sin(time * speed * 2 + offset) * 15.0 + 50.0;
        light.intensity = pulse;
        
        // Also pulse the point light
        if (light.userData.pointLight) {
          light.userData.pointLight.intensity = pulse / 6; // Scale down for point light
        }
        
        // Update helper if it exists
        // if (light.userData.helper) {
        //   light.userData.helper.update();
        // }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <primitive 
        ref={modelRef}
        object={gltf.scene} 
        scale={0.7} 
        position={[0, -60, -15]}
        rotation={[0, Math.PI / 1.2, 0]}
        onClick={handleCandleClick}
        castShadow
        receiveShadow
      />
    </group>
  );
}

// Preload the model
useGLTF.preload(`/cathedral.glb?v=${MODEL_VERSION}`);

// Inner component that uses music context
function CathedralWithMusic({ isPlaying = false, showAnnotations = true }) {
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [cinematicComplete, setCinematicComplete] = useState(false);
  const device = useMemo(() => detectDevice(), []);
  const sceneSettings = useMemo(() => getSceneSettings(device), [device]);
  const { currentTrackBPM } = useMusic();

  const handleCandleClick = useCallback((candleData) => {
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  }, []);

  const closeFloatingViewer = useCallback(() => {
    setShowFloatingViewer(false);
    setSelectedCandleData(null);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setCinematicComplete(true);
    console.log('Cinematic camera animation complete');
  }, []);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      // Clear texture pool when component unmounts
      if (device.isLowEnd) {
        texturePool.clear();
      }
    };
  }, [device.isLowEnd]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas 
        shadows={sceneSettings.shadowsEnabled}
        camera={{ position: [-5.41, -47.69, -8.00], fov: 45, near: 0.01, far: 200 }}
        gl={{ 
          antialias: sceneSettings.antialias,
          pixelRatio: sceneSettings.pixelRatio,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true
        }}
        dpr={sceneSettings.pixelRatio}>
      <StarField radius={150} count1={device.isLowEnd ? 200 : 500} count2={device.isLowEnd ? 100 : 300} />
             {/* <StarrySky /> */}
          <ConstellationModel  groupScale={[10, 10, 10]} groupPosition={[0, 15, -80]}    isVisible={true} />
        <OrbitControls 
            target={[-5.63, -47.71, -7.57]}
            zoomToCursor={true}
            enablePan={false} 
            enableRotate={!showFloatingViewer} 
            enableZoom={!showFloatingViewer}
            enabled={!showFloatingViewer}
            zoomSpeed={0.7}
            // panSpeed={0.8}
            rotateSpeed={0.5}
            enableDamping={true}
            dampingFactor={0.1}
            minDistance={0.1}
            maxDistance={60}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={0}
            autoRotate={false}
            makeDefault
            />
          
        
        {/* Directional light - much dimmer when music plays */}
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={isPlaying ? 0.05 : 1} 
          castShadow={sceneSettings.shadowsEnabled}
          shadow-mapSize={[sceneSettings.shadowMapSize, sceneSettings.shadowMapSize]}
          shadow-camera-far={150}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-bias={-0.001}
        />
        {/* Fog effect for nightclub atmosphere - enhanced for volumetric effect */}
        {isPlaying && <fog attach="fog" args={['#050505', 5, 120]} />}
    <PostProcessingEffects is80sMode={false} />
        <Suspense fallback={null}>
          {/* Cinematic camera - set enableLogging to true for debugging */}
          <CinematicCamera 
            onComplete={handleCinematicComplete}
            duration={12000}
            startDelay={0}
            enableLogging={true}
            autoStart={true}
          />
          <CathedralModel 
            isPlaying={isPlaying} 
            onCandleClick={handleCandleClick}
            showFloatingViewer={showFloatingViewer}
            device={device}
            currentTrackBPM={currentTrackBPM}
          />
          <TickerCanvasTextureApplier is80sMode={false} />
          <Object2Replacer />
          {cinematicComplete && showAnnotations && (
            <AnnotationSystem 
              annotations={[
                {
                  position: [-9.5, -48, -4], // Main altar area
                  text: "Sacred Digital Altar\nWhere prayers become code",
                  customCamera: {
                    position: [-7.14, -48.21, -4.87], // Camera position
                    lookAt: [-7.82, -47.77, -3.50], // Look at the altar
           
                  }
                },
                {
                  position: [1, -51, 1], // Right side
                  text: "Quantum Confessional\nConfess to the algorithm",
                  // customCamera: {
                  //   position: [8, -49, 5], // Camera position
                  //   lookAt: [1, -51, 1], // Look at the confessional
        
                  // }
                },
                {
                  position: [-16, -51, -9], // Left side
                  text: "Neural Nave\nProcessing faithful data"
                },
                {
                  position: [-3.5, -56, -15], // Upper area
                  text: "Holographic Heavens\nCloud computing the divine",
                  customCamera: {
                    position: [-11.54, -48.46, -7.78], // Camera at annotation position
                    lookAt: [-4.68, -50.84, -12.67], // Look in opposite direction
                    distance: 10
                  }
                }
              ]}
              is80sMode={false}
              scale={4}
              textScale={1.5}
            />
          )}
        </Suspense>
        {/* Environment light - dimmed when music plays */}
        {!isPlaying && <Environment preset="sunset" intensity={0.3} />}
      </Canvas>
      
      {/* FloatingCandleViewer outside the Canvas */}
      {showFloatingViewer && selectedCandleData && (
        <FloatingCandleViewer
          key={`candle-viewer-${selectedCandleData.candleId}-${selectedCandleData.candleTimestamp}`}
          isVisible={showFloatingViewer}
          userData={selectedCandleData}
          onClose={closeFloatingViewer}
        />
      )}
    </div>
  );
}

// Wrapper component that checks for MusicProvider
function Cathedral(props) {
  // Try to access the context
  const musicContext = useContext(MusicContext);
  
  // If we have music context, use the music-aware version
  if (musicContext !== undefined) {
    return <CathedralWithMusic {...props} />;
  }
  
  // Otherwise, use a version without music context
  return <CathedralWithoutMusic {...props} />;
}

// Version without music context for standalone usage
function CathedralWithoutMusic({ isPlaying = false, showAnnotations = true }) {
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [cinematicComplete, setCinematicComplete] = useState(false);
  const device = useMemo(() => detectDevice(), []);
  const sceneSettings = useMemo(() => getSceneSettings(device), [device]);
  const currentTrackBPM = 100; // Default BPM

  const handleCandleClick = useCallback((candleData) => {
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  }, []);

  const closeFloatingViewer = useCallback(() => {
    setShowFloatingViewer(false);
    setSelectedCandleData(null);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setCinematicComplete(true);
    console.log('Cinematic camera animation complete');
  }, []);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      // Clear texture pool when component unmounts
      if (device.isLowEnd) {
        texturePool.clear();
      }
    };
  }, [device.isLowEnd]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas 
        shadows={sceneSettings.shadowsEnabled}
        camera={{ position: [-5.41, -47.69, -8.00], fov: 45, near: 0.01, far: 200 }}
        gl={{ 
          antialias: sceneSettings.antialias,
          pixelRatio: sceneSettings.pixelRatio,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true
        }}
        dpr={sceneSettings.pixelRatio}>
      <StarField radius={150} count1={device.isLowEnd ? 200 : 500} count2={device.isLowEnd ? 100 : 300} />
             {/* <StarrySky /> */}
          <ConstellationModel  groupScale={[10, 10, 10]} groupPosition={[0, 15, -80]}    isVisible={true} />
        <OrbitControls 
            target={[-5.63, -47.71, -7.57]}
            zoomToCursor={true}
            enablePan={false} 
            enableRotate={!showFloatingViewer} 
            enableZoom={!showFloatingViewer}
            enabled={!showFloatingViewer}
            zoomSpeed={0.7}
            // panSpeed={0.8}
            rotateSpeed={0.5}
            enableDamping={true}
            dampingFactor={0.1}
            minDistance={0.1}
            maxDistance={60}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={0}
            autoRotate={false}
            makeDefault
            />
          
        
        {/* Minimal ambient light - much darker when music plays */}
        <ambientLight intensity={isPlaying ? 0.1 : 0.3} />
        {/* <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow={sceneSettings.shadowsEnabled}
          shadow-mapSize={[sceneSettings.shadowMapSize, sceneSettings.shadowMapSize]}
          shadow-camera-far={150}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-bias={-0.001}
        /> */}
        {/* Fog effect for nightclub atmosphere - enhanced for volumetric effect */}
        {isPlaying && <fog attach="fog" args={['#050505', 5, 120]} />}
    <PostProcessingEffects is80sMode={false} />
        <Suspense fallback={null}>
          {/* Cinematic camera - set enableLogging to true for debugging */}
          <CinematicCamera 
            onComplete={handleCinematicComplete}
            duration={12000}
            startDelay={0}
            enableLogging={true}
            autoStart={true}
          />
          <CathedralModel 
            isPlaying={isPlaying} 
            onCandleClick={handleCandleClick}
            showFloatingViewer={showFloatingViewer}
            device={device}
            currentTrackBPM={currentTrackBPM}
          />
          <TickerCanvasTextureApplier is80sMode={false} />
          <Object2Replacer />
          {cinematicComplete && showAnnotations && (
            <AnnotationSystem 
              annotations={[
                {
                  position: [-9.5, -48, -4], // Main altar area
                  text: "Sacred Digital Altar\nWhere prayers become code",
                  customCamera: {
                    position: [-7.14, -48.21, -4.87], // Camera position
                    lookAt: [-7.82, -47.77, -3.50], // Look at the altar
         
                  }
                
                },
                {
                  position: [1, -51, 1], // Right side
                  text: "Quantum Confessional\nConfess to the algorithm",
                  // customCamera: {
                  //   position: [8, -49, 5], // Camera position
                  //   lookAt: [1, -51, 1], // Look at the confessional
   
                  // }
                },
                {
                  position: [-16, -51, -9], // Left side
                  text: "Neural Nave\nProcessing faithful data"
                },
                {
                  position: [-3.5, -56, -15], // Upper area
                  text: "Holographic Heavens\nCloud computing the divine",
                  customCamera: {
                    position: [-3.5, -56, -15], // Camera at annotation position
                    lookAt: [3.5, -56, 15], // Look in opposite direction
                    distance: 10
                  }
                }
              ]}
              is80sMode={false}
              scale={4}
              textScale={1.5}
            />
          )}
        </Suspense>
        {/* <Environment preset="sunset" /> */}
      </Canvas>
      
      {/* FloatingCandleViewer outside the Canvas */}
      {showFloatingViewer && selectedCandleData && (
        <FloatingCandleViewer
          key={`candle-viewer-${selectedCandleData.candleId}-${selectedCandleData.candleTimestamp}`}
          isVisible={showFloatingViewer}
          userData={selectedCandleData}
          onClose={closeFloatingViewer}
        />
      )}
    </div>
  );
}

export default Cathedral;