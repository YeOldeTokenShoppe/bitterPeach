import { useEffect, useRef, useMemo, useState, memo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import { useFrame, useThree, useLoader } from "@react-three/fiber";
import TempleTickerDisplay from "./TempleTickerDisplay";
import TickerDisplay3 from "./TickerDisplay3";
import VideoScreens from "./VideoScreens";
import VideoBackground from "./VideoBackground";
import SimpleGlitchTint from "./SimpleGlitchTint";
import AnnotationSystem from "./AnnotationSystem";

function CyborgTempleScene({ 
  onLoad, 
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  hover = false,
  rotate = false,
  isPlaying = false,
  is80sMode = false,
  candleData = [], // Array of user data for candles
  onCandleClick = null, // Callback when candle is clicked
  onPaginationReady = null // Callback to expose pagination controls
}) {
  // console.log('[CyborgTempleScene] Component rendered with isPlaying:', isPlaying);
  const sceneRef = useRef();
  const groupRef = useRef();
  const { scene, camera, gl, raycaster, pointer } = useThree();
  const initialY = useRef(position[1]);
  const mixerRef = useRef();
  const hasLoadedRef = useRef(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const actionsRef = useRef({});
  const chandelierRef = useRef();
  const chandelierInitialRotation = useRef();
  const danceTimeoutRef = useRef(null);
  
  // Candle pagination state
  const [currentCandlePage, setCurrentCandlePage] = useState(0);
  const [candleRefs, setCandleRefs] = useState([]);
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const candlesPerPage = 8;
  const totalCandlePages = Math.ceil(candleData.length / candlesPerPage);

  // Use useMemo to prevent recreating the loader on every render
  const loader = useMemo(() => {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);
    return gltfLoader;
  }, []);
  
  // Update candle visibility based on current page
  const updateCandleVisibility = (candles, page) => {
    const start = page * candlesPerPage;
    const end = start + candlesPerPage;
    
    candles.forEach((candle, index) => {
      const shouldBeVisible = index >= start && index < end;
      candle.visible = shouldBeVisible;
      
      // Apply user data if available
      if (shouldBeVisible && candleData[index]) {
        const userData = candleData[index];
        candle.userData = { ...candle.userData, ...userData };
        
        // Apply user image to candle labels if available
        if (userData.image) {
          const textureLoader = new THREE.TextureLoader();
          textureLoader.load(userData.image, (texture) => {
            candle.traverse((child) => {
              if (child.name?.includes('Label') && child.isMesh) {
                if (child.material) {
                  child.material = child.material.clone();
                  child.material.map = texture;
                  child.material.needsUpdate = true;
                }
              }
            });
          });
        }
      }
    });
  };
  
  // Handle candle click
  const handleCandleClick = (candleIndex) => {
    const actualIndex = currentCandlePage * candlesPerPage + candleIndex;
    if (onCandleClick && candleData[actualIndex]) {
      onCandleClick(actualIndex, candleData[actualIndex]);
    }
  };
  
  // Handle page change
  const changeCandlePage = (newPage) => {
    if (newPage >= 0 && newPage < totalCandlePages) {
      setCurrentCandlePage(newPage);
      updateCandleVisibility(candleRefs, newPage);
    }
  };

  useEffect(() => {
    if (hasLoadedRef.current) return;

    let isCurrentInstance = true;

    loader.load("/cyborgTempleScene3.glb", (gltf) => {
      if (!isCurrentInstance) return;

      const templeScene = gltf.scene;
      
      // Debug: Log all objects in the scene
      console.log('[CyborgTempleScene] Loaded scene:', templeScene);
      templeScene.traverse((child) => {
        if (child.name) {
          console.log('[CyborgTempleScene] Found object:', child.name, 'type:', child.type, 'isMesh:', child.isMesh);
        }
      });

      // Create and store the animation mixer
      const mixer = new THREE.AnimationMixer(templeScene);
      mixerRef.current = mixer;

      // Play specific animations based on character
      if (gltf.animations.length > 0) {
        console.log('Available animations:', gltf.animations.map(a => a.name));
        
        // Store all actions for later use
        gltf.animations.forEach((animation) => {
          const animName = animation.name;
          const action = mixer.clipAction(animation);
          actionsRef.current[animName] = action;
        });
        
        // Play initial animations
        gltf.animations.forEach((animation) => {
          const animName = animation.name;
          const action = actionsRef.current[animName];
          
          // Check which character this animation belongs to based on suffix
          if (animName === 'TYPE1') {
            // Play TYPE animation for the first character (no suffix)
            action.play();
            console.log(`Playing TYPE animation: ${animation.name}`);
          } else if (animName === 'HaloRotation') {
            // Play HaloRotation animation
            action.play();
            console.log(`Playing HaloRotation animation: ${animation.name}`);
          } else if (animName === 'Idle.001' || animName === 'Idle.002' || animName === 'Idle.003') {
            // Play idle animations with different time offsets
            
            // Set different starting times based on animation name
            if (animName === 'Idle.001') {
              action.time = Math.random() * action.getClip().duration; // Random offset
            } else if (animName === 'Idle.002') {
              action.time = action.getClip().duration * 0.33; // Start 1/3 through
            } else if (animName === 'Idle.003') {
              action.time = action.getClip().duration * 0.66; // Start 2/3 through
            }
            
            action.play();
            console.log(`Playing idle animation: ${animation.name} with offset ${action.time}`);
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
      rotationGroup.add(templeScene);

      // Store refs
      sceneRef.current = templeScene;
      groupRef.current = { anchor: anchorGroup, rotation: rotationGroup };

      // Apply scale and rotation from props
      templeScene.scale.set(scale[0], scale[1], scale[2]);
      templeScene.rotation.set(rotation[0], rotation[1], rotation[2]);

      // Center the scene in the rotation group
      const box = new THREE.Box3().setFromObject(templeScene);
      const center = box.getCenter(new THREE.Vector3());
      templeScene.position.sub(center);

      // The model will use its original materials from the GLB file
      
      // Find and store the chandelier object
      const chandelier = templeScene.getObjectByName('ChandelierMain');
      if (chandelier) {
        chandelierRef.current = chandelier;
        // Store the initial rotation for reference
        chandelierInitialRotation.current = {
          x: chandelier.rotation.x,
          y: chandelier.rotation.y,
          z: chandelier.rotation.z
        };
        console.log('[CyborgTempleScene] Found chandelier:', chandelier.name);
      } else {
        console.log('[CyborgTempleScene] ChandelierMain not found in scene');
      }
      
      // Find and store candle references
      const foundCandles = [];
      templeScene.traverse((child) => {
        if (child.name && child.name.startsWith('VCANDLE')) {
          foundCandles.push(child);
          console.log('[CyborgTempleScene] Found candle:', child.name);
          
          // Make candles interactive
          child.userData.isCandle = true;
          child.userData.originalScale = child.scale.clone();
          
          // Add click handler to candle
          child.traverse((subChild) => {
            if (subChild.isMesh) {
              subChild.userData.candleIndex = foundCandles.length - 1;
              subChild.userData.candleName = child.name;
            }
          });
        }
      });
      
      // Sort candles by name to ensure consistent ordering
      foundCandles.sort((a, b) => a.name.localeCompare(b.name));
      setCandleRefs(foundCandles);
      console.log(`[CyborgTempleScene] Found ${foundCandles.length} candles`);
      
      // Apply initial candle visibility based on pagination
      updateCandleVisibility(foundCandles, 0);
     
      // Create grid ground
      const gridHelper = new THREE.GridHelper(50, 50, 0x00ff41, 0x00ff41);
      gridHelper.material.opacity = 0.3;
      gridHelper.material.transparent = true;
      gridHelper.position.y = -2.7; // Adjust this value to raise/lower the grid
      anchorGroup.add(gridHelper);

      // Add the anchor group to the scene
      scene.add(anchorGroup);
      hasLoadedRef.current = true;
      setModelLoaded(true); // Signal that model is loaded

      // Notify parent that scene is loaded and ready
      if (onLoad) {
        onLoad();
      }
    });

    // Cleanup function
    return () => {
      isCurrentInstance = false;

      // Clear any pending timeouts
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
        danceTimeoutRef.current = null;
      }

      // Stop all animations
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
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
  }, [scene, loader]); // Remove props from dependencies to prevent reloading
  
  // Effect to handle animation switching when isPlaying changes
  useEffect(() => {
    if (!mixerRef.current || Object.keys(actionsRef.current).length === 0) {
      console.log('[CyborgTempleScene] Animation switching skipped - mixer or actions not ready');
      return;
    }
    
    const actions = actionsRef.current;
    
    // Log available animations to help identify dance animations
    console.log('[CyborgTempleScene] Switching animations. isPlaying:', isPlaying);
    console.log('[CyborgTempleScene] Available animations:', Object.keys(actions));
    
    if (isPlaying) {
      console.log('[CyborgTempleScene] Music started, characters will start dancing in 2 seconds...');
      
      // Clear any existing timeout
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
      }
      
      // Keep TYPE animation running for the first character
      if (actions['TYPE1'] && !actions['TYPE1'].isRunning()) {
        actions['TYPE1'].play();
      }
      
      // Delay the dance animations by 2 seconds
      danceTimeoutRef.current = setTimeout(() => {
        console.log('[CyborgTempleScene] Starting dance animations after delay...');
        
        // Only stop idle animations for characters that will dance
        ['Idle.001', 'Idle.002', 'Idle.003'].forEach(idleAnim => {
          if (actions[idleAnim]) {
            actions[idleAnim].stop();
          }
        });
        
        // Play dance animations with time offsets
        ['Dance.001', 'Dance.002', 'Dance.003'].forEach((danceAnim) => {
          if (actions[danceAnim]) {
            actions[danceAnim].reset();
            
            // Set different starting times based on animation name
            if (danceAnim === 'Dance.001') {
              actions[danceAnim].time = Math.random() * actions[danceAnim].getClip().duration; // Random offset
            } else if (danceAnim === 'Dance.002') {
              actions[danceAnim].time = actions[danceAnim].getClip().duration * 0.33; // Start 1/3 through
            } else if (danceAnim === 'Dance.003') {
              actions[danceAnim].time = actions[danceAnim].getClip().duration * 0.66; // Start 2/3 through
            }
            
            actions[danceAnim].play();
            console.log(`✅ Playing dance animation: ${danceAnim} with offset ${actions[danceAnim].time}`);
          }
        });
      }, 2000); // 2 second delay
      
    } else {
      // Switch back to idle animations
      console.log('[CyborgTempleScene] Switching back to idle animations');
      
      // Clear any pending dance timeout
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
        danceTimeoutRef.current = null;
      }
      
      // Stop dance animations
      ['Dance.001', 'Dance.002', 'Dance.003'].forEach(danceAnim => {
        if (actions[danceAnim]) {
          actions[danceAnim].stop();
        }
      });
      
      // Make sure TYPE animation is still playing for the first character
      if (actions['TYPE1'] && !actions['TYPE1'].isRunning()) {
        actions['TYPE1'].reset().play();
        console.log('Ensuring TYPE animation continues');
      }
      
      // Resume idle animations with time offsets
      ['Idle.001', 'Idle.002', 'Idle.003'].forEach((idleAnim) => {
        if (actions[idleAnim]) {
          actions[idleAnim].reset();
          
          // Restore time offsets
          if (idleAnim === 'Idle.001') {
            actions[idleAnim].time = Math.random() * actions[idleAnim].getClip().duration;
          } else if (idleAnim === 'Idle.002') {
            actions[idleAnim].time = actions[idleAnim].getClip().duration * 0.33;
          } else if (idleAnim === 'Idle.003') {
            actions[idleAnim].time = actions[idleAnim].getClip().duration * 0.66;
          }
          
          actions[idleAnim].play();
          console.log(`Resuming idle animation: ${idleAnim}`);
        }
      });
    }
  }, [isPlaying]);

  useFrame((state, delta) => {
    // Update the animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    // Apply gentle sway to chandelier
    if (chandelierRef.current && chandelierInitialRotation.current) {
      // Create a gentle swaying motion using sine waves
      const time = state.clock.elapsedTime;
      
      // Small amplitude swaying on X and Z axes to simulate hanging motion
      // Using different frequencies for more natural movement
      const swayAmplitude = 0.05; // Adjust this for more/less sway (in radians)
      const swayX = Math.sin(time * 0.7) * swayAmplitude;
      const swayZ = Math.sin(time * 0.5 + Math.PI / 4) * swayAmplitude * 0.7;
      
      // Apply the sway relative to initial rotation
      chandelierRef.current.rotation.x = chandelierInitialRotation.current.x + swayX;
      chandelierRef.current.rotation.z = chandelierInitialRotation.current.z + swayZ;
    }
    
    // Handle candle hover effects
    if (candleRefs.length > 0) {
      // Cast ray from pointer
      raycaster.setFromCamera(pointer, camera);
      
      // Check for intersections with visible candles
      const visibleCandles = candleRefs.filter(c => c.visible);
      const meshes = [];
      visibleCandles.forEach(candle => {
        candle.traverse(child => {
          if (child.isMesh && child.userData.candleIndex !== undefined) {
            meshes.push(child);
          }
        });
      });
      
      const intersects = raycaster.intersectObjects(meshes, false);
      
      if (intersects.length > 0) {
        const candleIndex = intersects[0].object.userData.candleIndex;
        if (hoveredCandle !== candleIndex) {
          setHoveredCandle(candleIndex);
          document.body.style.cursor = 'pointer';
        }
      } else if (hoveredCandle !== null) {
        setHoveredCandle(null);
        document.body.style.cursor = 'default';
      }
      
      // Apply hover animation to candles
      visibleCandles.forEach((candle, index) => {
        const isHovered = hoveredCandle === index;
        const targetScale = isHovered ? 1.1 : 1;
        
        // Smooth scale animation
        candle.scale.x = THREE.MathUtils.lerp(candle.scale.x, candle.userData.originalScale.x * targetScale, delta * 5);
        candle.scale.y = THREE.MathUtils.lerp(candle.scale.y, candle.userData.originalScale.y * targetScale, delta * 5);
        candle.scale.z = THREE.MathUtils.lerp(candle.scale.z, candle.userData.originalScale.z * targetScale, delta * 5);
        
        // Flame flicker effect
        candle.traverse((child) => {
          if (child.name?.toLowerCase().includes('flame') && child.isMesh) {
            const flicker = Math.sin(state.clock.elapsedTime * 10 + index) * 0.1 + 0.9;
            if (child.material && child.material.emissiveIntensity !== undefined) {
              child.material.emissiveIntensity = flicker * (isHovered ? 1.5 : 1);
            }
          }
        });
      });
    }

    if (sceneRef.current && groupRef.current) {
      // Apply hover animation to the anchor group only if hover is enabled
      // if (hover) {
      //   groupRef.current.anchor.position.y =
      //     initialY.current + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      // }

      // Apply rotation to the rotation group only if rotate is enabled
      // if (rotate) {
      //   groupRef.current.rotation.rotation.y += delta * 0.3;
      // }
    }
  });

  // Add click event listener
  useEffect(() => {
    if (!modelLoaded || candleRefs.length === 0) return;
    
    const handleClick = () => {
      if (hoveredCandle !== null) {
        handleCandleClick(hoveredCandle);
      }
    };
    
    gl.domElement.addEventListener('click', handleClick);
    
    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [gl, hoveredCandle, modelLoaded, candleRefs]);

  // Expose pagination controls to parent
  useEffect(() => {
    if (onPaginationReady && candleRefs.length > 0) {
      onPaginationReady({
        currentPage: currentCandlePage,
        totalPages: totalCandlePages,
        candlesPerPage,
        totalCandles: candleData.length,
        changePage: changeCandlePage
      });
    }
  }, [onPaginationReady, currentCandlePage, totalCandlePages, candleData.length, candleRefs.length]);

  // Define annotation points - adjust positions based on your temple scene
  const annotations = [
    {
      position: [0, 0, 0], // Near the main altar/center
      text: "Sacred Altar\nThe heart of the cyborg temple"
    },
    // {
    //   position: [2, 0, -2], // Right side
    //   text: "Digital Offering Station\nPlace virtual candles here"
    // },

    {
      position: [0.3, -1.6, 2], // Near chandelier
      text: "Neural Chandelier\nSyncs with collective thoughts"
    },
    {
      position: [-2, -0.99, 0.3], // Left side
      text: "The 3 Wise Mechs",
      // Special camera settings for viewing characters from center
      customCamera: {
        position: [2, -1.8, -0.7], // Camera moved right and lower
        lookAt: [-3, -1.5, 0.5], // Look outward toward the characters
        distance: 2.9 // Slightly increased distance for better framing
      },
      // Custom annotation position for this view (in screen space)
      annotationOffset: [100, 260] // [x, y] offset in pixels from center
    },
  ];

  return (
    <>
      {modelLoaded && <VideoBackground is80sMode={is80sMode} />}
      {modelLoaded && <TickerDisplay3 is80sMode={is80sMode} />}
      {modelLoaded && <VideoScreens />}
      {modelLoaded && <SimpleGlitchTint />}
      {modelLoaded && <AnnotationSystem annotations={annotations} is80sMode={is80sMode} />}
    </>
  );
}

export default memo(CyborgTempleScene);