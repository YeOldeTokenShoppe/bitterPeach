import React, { useEffect, useState, useRef, Suspense, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useGLTF, useProgress, Text, Environment, useTexture, Plane, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
import DarkClouds from "./Clouds";
import ParticleTrail from "./ParticleTrail";

import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../utilities/firebaseClient"; // Import storage directly
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { InstancedMesh, DynamicDrawUsage } from "three";
import { collection, addDoc, updateDoc, doc, getDocs } from "firebase/firestore";
import { db } from "../../utilities/firebaseClient";
import { gsap } from "gsap";

// Configure draco loader for useGLTF
useGLTF.preload("/alligatorStroll3.glb");
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
// Set up GLTFLoader to use Draco compression
GLTFLoader.prototype.setDRACOLoader(dracoLoader);

// Default profile image to use when user has no image
const DEFAULT_PROFILE_IMAGE = "/defaultAvatar.png";
const DEFAULT_VVV_IMAGE = "/vvv.jpg";
const DEFAULT_CLOWN_IMAGE = "/vsClown.jpg";

function Model({
  scale,
  modelRef,
  rotation,

  setModelCenter,
  isModalOpen,
  setIsModalOpen,
  setIsModelLoaded,
  isModelLoaded,
  onLightPositionChange,
  lightIntensity: parentLightIntensity,
  skyColor: parentSkyColor,
  groundColor: parentGroundColor,
  showLightHelper: parentShowLightHelper,
  is80sMode,
  isLaunching,

  monsterMode,
  rocketModelVisible,
  cameraControlsRef,
  onCandleClick,
  onHoldStateChange,
  onModelDataLoaded,
  isMobileView,
}) {
  // STATE VARIABLES - consolidated in one place
  const [modelUrl, setModelUrl] = useState("/alligatorStroll3.glb");
  const { progress } = useProgress();
  const gltf = useGLTF(modelUrl, true);
  const { camera, scene } = useThree();
  const results = useFirestoreResults();

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [showLightHelper, setShowLightHelper] = useState(false);
  const [lightPosition, setLightPosition] = useState({ x: 32, y: 33, z: 89 });
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [skyColor, setSkyColor] = useState(0x7300ff);
  const [groundColor, setGroundColor] = useState(0xff0000);

  // REFS - consolidated in one place
  const hemiLightRef = useRef();
  const ambientLightRef = useRef();
  const boundingBoxRef = useRef(new THREE.Box3());
  const textureLoader = useRef(new THREE.TextureLoader());

  const lightHelperRef = useRef();
  const lightMarkerRef = useRef();
  const { actions } = useAnimations(gltf.animations, gltf.scene);
  // Add these new refs and state variables for candle placement
  const instancedXCandleRef = useRef();
  const candleModelRef = useRef();
  const [candleCount, setCandleCount] = useState(0);
  const maxFloorCandles = 72; // Maximum number of candles users can place on floor

  // Add these state/ref variables
  const instancedMeshRef = useRef();
  const [candleInstances, setCandleInstances] = useState([]);

  // Load candle model
  const candle = useGLTF("/XCandle1.glb");

  // Add these to your existing state variables
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);

  // Add these state variables to store the sorted users
  const [topBurners, setTopBurners] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);

  // Add this at the top of your component to create a texture cache
  const textureCache = useRef(new Map());

  // First, get the renderer at the component level
  const { gl: renderer } = useThree();

  // Add this near your other state variables
  const [flickeringMaterials, setFlickeringMaterials] = useState(new Map());
  const flickerIntensity = useRef(0.5); // Controls how much the flame flickers
  const flickerSpeed = useRef(1.5); // Controls how fast the flame flickers

  // Add these variables for click timing
  const lastClickTime = useRef(0);
  const clickTimeout = useRef(null);
  const pendingFloorClick = useRef(null);
  const DOUBLE_CLICK_THRESHOLD = 300; // milliseconds

  // Add these variables for click-and-hold
  const mouseDownTime = useRef(0);
  const mouseDownPosition = useRef(null);
  const mouseDownTimer = useRef(null);
  const HOLD_THRESHOLD = 800; // milliseconds to hold before placing candle
  const MOVE_THRESHOLD = 35; // pixels of movement allowed while holding

  // Add a ref to hold the candle placement function to avoid circular references
  const placeCandleFunc = useRef(null);
  
  // Add state for particle effects
  const [activeParticles, setActiveParticles] = useState([]);
  const particleIdCounter = useRef(0);

  // Add these refs at the top of the component (with other refs)
  const holdTimeoutRef = useRef(null);
  const candlePlacedRef = useRef(false);

  // Add this ref with the others at the top
  const mouseIsDownRef = useRef(false);

  // Add minimum scale enforcement
  const MIN_SCALE = 10;
  const safeScale = scale < MIN_SCALE ? MIN_SCALE : scale;
  
  // Apply scale directly to gltf.scene after loading
  useEffect(() => {
    if (gltf && gltf.scene) {
      // Ensure the model is always at least MIN_SCALE
      if (scale < MIN_SCALE) {
        console.warn(`Model scale (${scale}) below minimum (${MIN_SCALE}), enforcing minimum scale`);
      }
      
      // Apply scale directly to the scene object
      gltf.scene.scale.set(safeScale, safeScale, safeScale);
    }
  }, [gltf, scale, safeScale, MIN_SCALE]);

  // Add this function to optimize texture loading without changing geometry
  const loadOptimizedTexture = (url, onLoad) => {
    // Check cache first
    if (textureCache.current.has(url)) {
      onLoad(textureCache.current.get(url));
      return;
    }

    // Use the existing texture loader
    textureLoader.current.load(
      url,
      texture => {
        // Apply optimizations that don't affect appearance
        texture.generateMipmaps = true; // Keep mipmaps for quality
        texture.anisotropy = 4; // Good quality without excess memory

        // Store in cache
        textureCache.current.set(url, texture);

        // Return the optimized texture
        onLoad(texture);
      },
      undefined,
      error => console.warn("Texture loading error:", error)
    );
  };

  // Add a better cleanup function for textures
  useEffect(() => {
    return () => {
      // Dispose textures properly to prevent memory leaks
      const currentCache = textureCache.current;
      if (currentCache && currentCache.size > 0) {
        currentCache.forEach(texture => {
          texture.dispose();
        });
        currentCache.clear();
      }
    };
  }, []);
  useEffect(() => {
    if (gltf.animations?.length > 0) {

      // Check for the new animation names
      const walkSequenceAnim = gltf.animations.find(anim => 
        anim.name === "WALK_SEQUENCE" || anim.name.includes("WALK"));
      
      const circleWalkAnim = gltf.animations.find(anim => 
        anim.name === "CircleWalk" || anim.name.includes("Circle"));
      
      if (walkSequenceAnim) {

      }
      
      if (circleWalkAnim) {

      }
    }
    
    if (actions) {

      // Updated animation names
      const animationsToPlay = ["WALK_SEQUENCE", "CircleWalk"];
      
      animationsToPlay.forEach(animName => {
        // Try direct access first
        if (actions[animName]) {

          actions[animName].reset().play();
          actions[animName].loop = THREE.LoopRepeat;
        } else {
          // If direct access doesn't work, look for matching name (case insensitive)
          const matchingAnim = Object.entries(actions).find(
            ([name]) => name.includes(animName) || 
                        name.toLowerCase().includes(animName.toLowerCase())
          );
          
          if (matchingAnim) {

            matchingAnim[1].reset().play();
            matchingAnim[1].loop = THREE.LoopRepeat;
          } else {

          }
        }
      });
      
      // Play all animations if needed (uncomment if you want all animations to play)
      /*
      Object.entries(actions).forEach(([name, action]) => {

        action.reset().play();
        action.loop = THREE.LoopRepeat;
      });
      */
    }
  }, [gltf.animations, actions]);

  // NEW POINTER HANDLERS for Long Press
  const handlePointerDown = useCallback(
    event => {
      event.stopPropagation();
      // Check the intersections provided by the event
      let floorIntersection = null;
      for (const intersection of event.intersections) {
        const obj = intersection.object;
        if (
          obj.isMesh &&
          (
            obj.name === "Floor2.002" ||
            obj.name.includes("Floor2") ||
            obj.name.includes("goldCircuit"))
        ) {
          floorIntersection = intersection;
          break; // Found the first floor intersection
        }
      }

      if (floorIntersection) {
        // A floor was pressed

        mouseIsDownRef.current = true;
        mouseDownTime.current = Date.now();
        // Use the point from the actual floor intersection
        // Store face and object for normal checking
        mouseDownPosition.current = {
          x: event.clientX,
          y: event.clientY,
          point: floorIntersection.point.clone(),
          face: floorIntersection.face,       
          object: floorIntersection.object    
        };
        candlePlacedRef.current = false;


        holdTimeoutRef.current = setTimeout(() => {







          if (
            mouseIsDownRef.current &&
            !candlePlacedRef.current &&
            placeCandleFunc.current &&
            mouseDownPosition.current?.point &&
            mouseDownPosition.current?.face &&    
            mouseDownPosition.current?.object  
          ) {
            const { point, face, object: intersectedObject } = mouseDownPosition.current;

            // --- START NORMAL CHECK ---
            const localNormal = face.normal;
            const worldNormal = localNormal.clone();
            // Ensure intersectedObject.matrixWorld is up to date if the object might be moving/animated
            // For static objects like Floor2, it should be fine.
            intersectedObject.updateMatrixWorld(); 
            const normalMatrix = new THREE.Matrix3().getNormalMatrix(intersectedObject.matrixWorld);
            worldNormal.applyMatrix3(normalMatrix).normalize();

            const worldUp = new THREE.Vector3(0, 1, 0);
            // Adjust threshold as needed (e.g., 30-45 degrees for "mostly up")
            // A higher threshold means more tolerance for steeper surfaces.
            const angleThreshold = THREE.MathUtils.degToRad(35); // e.g., 35 degrees from horizontal
            const angleToUp = worldNormal.angleTo(worldUp);

            if (angleToUp < angleThreshold) {

              placeCandleFunc.current(point); 
              candlePlacedRef.current = true;
            } else {
              console.warn(`[Timeout Callback] Surface normal not suitable for candle. Angle to up: ${THREE.MathUtils.radToDeg(angleToUp).toFixed(1)}°.`);
            }
            // --- END NORMAL CHECK ---
          } else {

          }
        }, HOLD_THRESHOLD);
      }
    },
    [HOLD_THRESHOLD, placeCandleFunc] // Added placeCandleFunc to dependencies if it's stable
  );

  const handlePointerMove = useCallback(
    event => {
      if (!mouseIsDownRef.current || !mouseDownPosition.current) return;

      const clientX = event.clientX;
      const clientY = event.clientY;
      const dx = clientX - mouseDownPosition.current.x;
      const dy = clientY - mouseDownPosition.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > MOVE_THRESHOLD) {

        mouseIsDownRef.current = false;
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
        mouseDownPosition.current = null; // Reset position data
      }
    },
    [MOVE_THRESHOLD]
  );

  const handlePointerUp = useCallback(event => {
    if (!mouseIsDownRef.current) return; // Only process if mouse was down
    event.stopPropagation();

    mouseIsDownRef.current = false;
    if (holdTimeoutRef.current) {

      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    mouseDownPosition.current = null; // Reset position data
  }, []);

  // Function to actually place the candle
  const placeCandleAtPoint = useCallback(
    point => {
      console.log("[placeCandleAtPoint] Function called with point:", point); // Log start of placement function
      // Check if we've reached the candle limit
      if (candleCount >= maxFloorCandles) {
        console.log("[placeCandleAtPoint] Candle limit reached."); // Log limit reached
        return;
      }

      // Create a deep clone of the original candle model
      const newCandle = candle.scene.clone();

      // IMPROVED FLOOR PLACEMENT LOGIC
      // Always use raycasting for more accurate placement regardless of floor type
      const raycaster = new THREE.Raycaster();
      // Start raycast from 5 units above the click point
      const rayStart = new THREE.Vector3(point.x, point.y + 5, point.z);
      const rayDir = new THREE.Vector3(0, -1, 0);
      raycaster.set(rayStart, rayDir);

      // Get all floor objects for testing
      const floors = [];
      gltf.scene.traverse(obj => {
        if (
          obj.isMesh &&
          (
            obj.name === "Floor2.002" ||
            obj.name.includes("Floor2") ||
            obj.name.includes("goldCircuit"))
        ) {
          floors.push(obj);
        }
      });

      // Find all intersections
      const hits = raycaster.intersectObjects(floors, false);

      // Place candle at exact intersection point with small offset
      if (hits.length > 0) {
        // Filter hits by normal to get upward-facing surfaces
        const up = new THREE.Vector3(0, 1, 0);
        const validHits = hits.filter(hit => {
          // Only include if the face has an upward-facing normal
          return hit.face && hit.face.normal.dot(up) > 0.5;
        });

        if (validHits.length > 0) {
          // Sort by distance (closest first)
          validHits.sort((a, b) => a.distance - b.distance);
          const exactPoint = validHits[0].point.clone();

          // Add a small but consistent offset to prevent z-fighting
          exactPoint.y += 0.02;

          // Use the exact intersection point
          newCandle.position.copy(exactPoint);

          // Store floor normal to help with candle orientation
          const floorNormal = validHits[0].face.normal.clone();
          newCandle.userData.floorNormal = floorNormal;
        } else {
          // Fallback if no valid hit
          point.y += 0.05;
          newCandle.position.copy(point);
        }
      } else {
        // Complete fallback for no hits at all
        point.y += 0.05;
        newCandle.position.copy(point);
      }

      // Add random rotation for visual interest
      newCandle.rotation.y = Math.random() * Math.PI * 2;

      // Use a consistent scale for all candles
      const fixedScale = 0.7;
      newCandle.scale.set(fixedScale, fixedScale, fixedScale);

      // Calculate a consistent melting rate for this candle - TESTING SPEED
      const meltingRate = 1 / (1 * 60 * 60);

      // Apply melting properties to each child
      newCandle.traverse(child => {
        // Store the original scale for reference during melting
        child.userData.originalScale = child.scale.clone();
        // Add melting flag and progress tracker
        child.userData.isMelting = true;
        child.userData.meltingProgress = 0;
        // Use the same melting rate for all parts of the candle
        child.userData.meltingRate = meltingRate;
      });

      // Mark as a candle for cleanup later
      newCandle.userData = {
        ...newCandle.userData,
        isCandle: true,
        candleId: `placed_candle_${candleCount}`,
        placedAt: new Date(),
        // Add melting properties to the parent as well
        isMelting: true,
        meltingProgress: 0,
        originalScale: newCandle.scale.clone(),
        // Use the same melting rate calculated above
        meltingRate: meltingRate,
      };

      // Add the candle to the scene
      scene.add(newCandle);
      
      // Add particle effect at candle placement location
      const particleId = particleIdCounter.current++;
      setActiveParticles(prev => [...prev, {
        id: particleId,
        position: [newCandle.position.x, newCandle.position.y + 0.5, newCandle.position.z],
        startTime: Date.now()
      }]);
      
      // Remove particle after 3 seconds
      setTimeout(() => {
        setActiveParticles(prev => prev.filter(p => p.id !== particleId));
      }, 3000);

      // Increment the candle counter
      setCandleCount(prev => prev + 1);
    },
    [candle, candleCount, gltf, scene, maxFloorCandles]
  );

  // Store the function in the ref after it's created
  useEffect(() => {
    placeCandleFunc.current = placeCandleAtPoint;
  }, [placeCandleAtPoint]);

  // Clean up any timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
    };
  }, []);

  // Update handleCandleClick to work with the new system
  const handleCandleClick = useCallback(
    event => {
      event.stopPropagation();

      // Only handle clicks on VCANDLEs now
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

        // Mouse event
        return {
          x: (event.nativeEvent.offsetX / event.nativeEvent.target.clientWidth) * 2 - 1,
          y: -(event.nativeEvent.offsetY / event.nativeEvent.target.clientHeight) * 2 + 1,
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
          if (object.name.startsWith("VCANDLE")) {
            intersectableObjects.push(object);
            // Also include children for better click detection
            object.children.forEach(child => {
              if (
                child.name.includes("Label1") ||
                child.name.includes("wax") ||
                child.name.includes("glass")
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
        while (candleParent && !candleParent.name.startsWith("VCANDLE")) {
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
    },
    [camera, modelRef, onCandleClick]
  );

  // Add a function to show the user how many candles are available
  // const getRemainingCandleCount = useCallback(() => {
  //   return maxFloorCandles - candleCount;
  // }, [maxFloorCandles, candleCount]);

  // // Add a reset function (optional)
  // const resetCandles = useCallback(() => {
  //   // Remove all placed candles
  //   scene.children.forEach(child => {
  //     if (child.userData && child.userData.isCandle) {
  //       scene.remove(child);
  //     }
  //   });

  //   // Reset counter
  //   setCandleCount(0);
  // }, [scene, maxFloorCandles]);

  // Optional helper function to save candles to Firestore
  // const saveCandleToFirestore = async candleData => {
  //   try {
  //     const docRef = await addDoc(collection(db, "userCandles"), {
  //       position: candleData.position,
  //       rotation: candleData.rotation,
  //       scale: candleData.scale,
  //       instanceId: candleData.id,
  //       createdAt: candleData.createdAt,
  //       // Add any other metadata you want
  //       userName: "Anonymous", // Could be dynamic
  //       message: "", // Could prompt user for a message
  //     });

  //     return docRef.id;
  //   } catch (error) {
  //     return null;
  //   }
  // };

  useEffect(() => {
    return () => {
      // Clean up any candles when component unmounts
      scene.children.forEach(child => {
        if (child.userData && child.userData.isCandle) {
          scene.remove(child);
        }
      });
    };
  }, [scene]);

  // Add click handlers to floor objects
  useEffect(() => {
    if (!gltf || !gltf.scene) return;

    // Find floor objects and add click handlers
    gltf.scene.traverse(child => {
      if (
        child.isMesh &&
        (child.name === "Floor2.002" || child.name === "goldCircuit")
      ) {
        // Store original material for hover effects (optional)
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material.clone();
        }

        // Make the floor interactive
        child.userData.clickable = true;
        child.layers.enable(1); // Enable the interactive layer
      }
    });
  }, [gltf]);

  // Mobile optimization - hide certain objects on small screens
  useEffect(() => {
    if (!gltf || !gltf.scene) return;

    // Store original visibility states on first run
    const storeOriginalVisibility = () => {
      gltf.scene.traverse(object => {
        if ((object.isMesh || object.isGroup) && object.userData.originalVisibility === undefined) {
          object.userData.originalVisibility = object.visible;
        }
      });
    };

    const handleResize = () => {
      // Use the prop if provided, otherwise fall back to window width check
      const isMobile = isMobileView !== undefined ? isMobileView : window.innerWidth < 768;
      
      gltf.scene.traverse(object => {
        if (object.isMesh || object.isGroup) {
          const name = object.name.toLowerCase();
          const originalName = object.name;
          
          // Check for VCANDLE components (FLAME, glass, Label1, wax with numbers)
          const isCandleComponent = 
            originalName.startsWith('FLAME') ||
            originalName.startsWith('glass') ||
            originalName.startsWith('Label1') ||
            originalName.startsWith('wax');
          
          // Check specifically for VCANDLE objects (numbered like VCANDLE001, VCANDLE002, etc.)
          const isVCandle = originalName.startsWith('VCANDLE') || originalName.includes('VCANDLE') || isCandleComponent;
          
          // Check for floor objects - only hide the large outer floor, keep Floor2.002
          const isFloor = originalName === 'Floor';
          
          // Special handling for AlligatorScroll.002 - it should remain in its original state
          if (originalName === 'AlligatorScroll.002') {
            // Don't change visibility - let event handlers control it

            return;
          }
          
          // Hide pillars, alligator, ground objects, and vcandles on mobile
          if (
            name.includes('ionic') ||
            name.includes('column') ||
            name.includes('american') ||
            name.includes('alligator') ||
            name.includes('reptile') ||
            name.includes('halotext') ||
            name.includes('alligatorscroll') ||
            isFloor ||
            isVCandle ||
            name.includes('pillar')
          ) {
            if (isMobile) {
              object.visible = false;
            } else {
              // Restore original visibility for desktop
              object.visible = object.userData.originalVisibility !== undefined ? 
                object.userData.originalVisibility : true;
            }

          }
        }
      });
    };

    // Store original visibility states before any modifications
    storeOriginalVisibility();
    
    // Initial check
    handleResize();

    // Listen for window resize
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [gltf, isMobileView]);

  // Hide Object_3 when rocket is visible
  useEffect(() => {
    if (!gltf || !gltf.scene) return;
    
    gltf.scene.traverse(object => {
      if (object.name === 'Object_3') {
        object.visible = !rocketModelVisible;

      }
    });
  }, [rocketModelVisible, gltf]);

  const loadUserCandles = useCallback(async () => {
    if (!instancedXCandleRef.current) {
      return;
    }

    try {
      const candlesSnapshot = await getDocs(collection(db, "userCandles"));

      // Load candles in batches
      const allCandles = [];
      candlesSnapshot.forEach(doc => {
        // Create candle data from document
        const data = doc.data();

        const candle = {
          id: data.instanceId || `db_candle_${doc.id}`,
          firestoreId: doc.id,
          position: new THREE.Vector3(
            data.position?.x || 0,
            data.position?.y || 0,
            data.position?.z || 0
          ),
          userData: {
            userName: data.userName || "Anonymous",
            id: data.userId,
            message: data.message || "",
            image: data.image || null,
            burnedAmount: data.burnedAmount || 1,
            createdAt: data.createdAt?.toDate() || new Date(),
          },
          createdAt: data.createdAt?.toDate() || new Date(),
        };

        allCandles.push(candle);
      });

      // Handle the allCandles array as needed
      return allCandles;
    } catch (error) {
      console.error("Error loading user candles:", error);
      return [];
    }
  }, []);

  // Add console logging to track progress
  useEffect(() => {
    if (progress === 100 && setIsModelLoaded) {
      // Add a small delay to ensure everything is rendered
      const timer = setTimeout(() => {
        setIsModelLoaded(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [progress, setIsModelLoaded]);

  // Ensure the model is displayed even if candles aren't fully loaded
  useEffect(() => {
    if (progress === 100 && setIsModelLoaded) {
      // Force isModelLoaded to true after a reasonable timeout (e.g., 5 seconds)
      const forceLoadTimer = setTimeout(() => {
        setIsModelLoaded(true);
      }, 5000); // Reduced from 10 seconds to 5 seconds

      return () => clearTimeout(forceLoadTimer);
    }
  }, [progress, setIsModelLoaded]);

  // Update this useEffect to fix the model positioning
  useEffect(() => {
    if (!modelRef.current) return;

    boundingBoxRef.current.setFromObject(modelRef.current);
    const center = new THREE.Vector3();
    boundingBoxRef.current.getCenter(center);
    modelRef.current.position.sub(center);
    // setModelCenter(center);
  }, [gltf.scene, modelRef, setModelCenter]);

  // Modify the lighting setup to ensure proper values
  useEffect(() => {
    // Clean up any previous lights to prevent duplicates
    scene.children.forEach(child => {
      if (child.isHemisphereLight && child !== hemiLightRef.current) {
        scene.remove(child);
      }
    });

    // Convert hex string colors to numbers if they're provided as strings
    let skyColorValue = skyColor;
    let groundColorValue = groundColor;

    if (parentSkyColor && typeof parentSkyColor === "string") {
      skyColorValue = parseInt(parentSkyColor.replace("#", "0x"), 16);
    }

    if (parentGroundColor && typeof parentGroundColor === "string") {
      groundColorValue = parseInt(parentGroundColor.replace("#", "0x"), 16);
    }

    // Create the hemisphere light with correct parameters
    const lightIntensityValue =
      parentLightIntensity !== undefined ? parentLightIntensity : lightIntensity;

    // 🌈 Log HemisphereLight colors and intensity before creating the light
    console.log("🌈 HemisphereLight colors:", {
      skyColorValue,
      groundColorValue,
      lightIntensityValue,
    });

    const hemiLight = new THREE.HemisphereLight(
      skyColorValue,
      groundColorValue,
      lightIntensityValue
    );

    // Use the explicit position values
    hemiLight.position.set(lightPosition.x, lightPosition.y, lightPosition.z);

    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    return () => {
      if (hemiLightRef.current) {
        scene.remove(hemiLightRef.current);
      }
    };
  }, [
    scene,
    lightPosition,
    lightIntensity,
    skyColor,
    groundColor,
    parentSkyColor,
    parentGroundColor,
    parentLightIntensity,
  ]);

  // Add this effect to reduce model complexity for better performance
  useEffect(() => {
    if (gltf && gltf.scene) {
      // Apply some basic optimizations to the model
      gltf.scene.traverse(object => {
        // Skip instanced meshes
        if (object.isInstancedMesh) return;

        // Skip annotated objects
        if (object.userData?.isAnnotation) return;

        // Set frustum culling on all meshes
        if (object.isMesh) {
          object.frustumCulled = true;

          // Simplify materials
          if (object.material) {
            // Disable unnecessary features
            if (object.material.map) {
              // Reduce texture quality for better performance
              object.material.map.anisotropy = 1;
              object.material.map.generateMipmaps = false;
            }
          }
        }
      });
    }
  }, [gltf]);

  useEffect(() => {
    if (is80sMode !== undefined) {
    }
  }, [is80sMode]);

  // Toggle floor textures when 80s mode changes
  useEffect(() => {

    if (!gltf || !gltf.scene) {
      console.warn('⚠️ Model.jsx: gltf or scene not available');
      return;
    }

    // Create a texture loader
    const textureLoader = new THREE.TextureLoader();

    // Texture configuration - Edit these values to experiment with different textures
    const textureConfig = {
      path: "/80carpet.png", // Path to texture file
      repeat: { x: 4, y: 4 }, // Tiling (higher numbers = smaller pattern)
      offset: { x: 0.5, y: 0.5 }, // Offset (0-1 range)
      anisotropy: 16, // Texture quality at angles (higher = better quality)
      rotation: 0, // Rotation in radians (Math.PI/4 = 45 degrees)
      emissive: true, // Enable emissive effect for neon glow
      emissiveIntensity: 1.2, // Intensity of the glow (0-1 range)
      // emissiveColor: 0xffffff, // Neutral white to preserve original colors
    };

    // Function to apply texture with settings
    const applyTextureWithSettings = (texture, config) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(config.repeat.x, config.repeat.y);
      texture.offset.set(config.offset.x, config.offset.y);
      texture.anisotropy = config.anisotropy;
      texture.rotation = config.rotation;
      texture.needsUpdate = true;
      return texture;
    };

    // Find floor objects in the model

    let floorFound = false;
    gltf.scene.traverse(child => {
      // Log all mesh names for debugging
      if (child.isMesh) {

        // Special logging for floor-like objects
        if (child.name.toLowerCase().includes('floor')) {

        }
      }
      
      // Check for any mesh with "Floor" in its name - now also includes partial matches
      if (child.isMesh && (child.name === "Floor" || child.name === "Floor2.002" || child.name.includes("Floor2"))) {
        floorFound = true;

        console.log('   Material info:', {
          hasMaterial: !!child.material,
          hasMap: !!(child.material && child.material.map),
          materialType: child.material ? child.material.type : 'none',
          isArray: Array.isArray(child.material)
        });
        
        // Store the original texture if we haven't already
        if (!child.userData.originalTexture && child.material) {
          if (child.material.map) {
            child.userData.originalTexture = child.material.map;
          }
          child.userData.originalMaterial = child.material.clone();
        }

        // Toggle between original and 80s texture
        if (is80sMode) {

          textureLoader.load(
            textureConfig.path, 
            // Success callback
            texture => {

              // Apply all texture settings
              applyTextureWithSettings(texture, textureConfig);

              if (child.material) {
                // Create a new material or update existing one
                const applyMaterial = mat => {
                  mat.map = texture;

                  // Add emissive properties if configured
                  if (textureConfig.emissive) {
                    // Use white as emissive color to preserve the original colors
                    mat.emissive = new THREE.Color(textureConfig.emissiveColor);
                    mat.emissiveMap = texture; // Use same texture for emissive map
                    mat.emissiveIntensity = textureConfig.emissiveIntensity;

                    // Make the black background truly black by adjusting material properties
                    mat.roughness = 0.8; // Less shiny
                    mat.metalness = 0.2; // Slight metallic look for neon effect
                  }

                  mat.needsUpdate = true;
                };

                // If the material is an array, update all materials
                if (Array.isArray(child.material)) {
                  child.material.forEach(applyMaterial);
                } else {
                  // Single material
                  applyMaterial(child.material);
                }

              }
            },
            // Progress callback
            progress => {

            },
            // Error callback
            error => {
              console.error('❌ Failed to load 80s carpet texture:', error);
              console.error('❌ Texture path was:', textureConfig.path);
            }
          );
        } else if (child.userData.originalMaterial) {
          // Restore original material

          if (Array.isArray(child.material)) {
            // For material arrays, we need to restore properties individually
            child.material.forEach((mat, index) => {
              if (Array.isArray(child.userData.originalMaterial)) {
                const origMat = child.userData.originalMaterial[index];
                mat.copy(origMat);
              } else {
                mat.map = child.userData.originalTexture;
                mat.emissive = new THREE.Color(0x000000);
                mat.emissiveIntensity = 0;
                mat.emissiveMap = null;
              }
              mat.needsUpdate = true;
            });
          } else {
            // Single material
            if (Array.isArray(child.userData.originalMaterial)) {
              child.material.copy(child.userData.originalMaterial[0]);
            } else {
              child.material.copy(child.userData.originalMaterial);
            }
            child.material.needsUpdate = true;
          }
        }
      }
    });
    
    if (!floorFound) {
      console.warn('⚠️ Floor2.002 object not found in the model');
    }
  }, [is80sMode, gltf]);

  // Modify your applyUserImageToLabel function
  const applyUserImageToLabel = (candle, user) => {
    if (!user?.image) return;

    // Find both labels, but keep them in separate arrays
    const label1Objects = candle.children.filter(child => child.name.includes("Label1"));

    const label2Objects = candle.children.filter(
      child => child.name.includes("Label2") && !child.name.includes("Label1")
    );

    if (label1Objects.length === 0 && label2Objects.length === 0) return;

    // Use our optimized texture loader instead of direct loading
    loadOptimizedTexture(user.image, texture => {
      // Apply to Label1 objects (flipped on both X and Y axes)
      label1Objects.forEach(label => {
        if (label.material) {
          // Properly dispose of existing materials/textures
          if (label.material.map) {
            label.material.map.dispose();
          }
          label.material.dispose();

          // Clone the texture for this specific label to avoid affecting other uses
          const flippedTexture = texture.clone();

          // Set rotation center to middle of texture
          flippedTexture.center.set(0.5, 0.5);

          // Rotate by 180 degrees
          flippedTexture.rotation = 0;

          // To flip on Y axis, we invert the repeat.y value
          flippedTexture.repeat.set(1, -1);

          // Ensure wrapping is set correctly for the flipped texture
          flippedTexture.wrapS = THREE.RepeatWrapping;
          flippedTexture.wrapT = THREE.RepeatWrapping;

          flippedTexture.needsUpdate = true;

          // Create new material with the flipped texture
          label.material = new THREE.MeshStandardMaterial({
            map: flippedTexture,
            transparent: true,
            side: THREE.DoubleSide,
          });
          label.material.needsUpdate = true;
        }
      });

      // Apply to Label2 objects (normal orientation)
      label2Objects.forEach(label => {
        if (label.material) {
          if (label.material.map) {
            label.material.map.dispose();
          }
          label.material.dispose();

          // Use the original texture without flipping
          label.material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
          });
          label.material.needsUpdate = true;
        }
      });
    });
  };

  // Then modify the useEffect where we handle the candle assignments
  useEffect(() => {
    if (!results || !gltf.scene) return;

    // Create default users for when we don't have enough results
    const createDefaultUser = index => ({
      userName: `Default User ${index}`,
      id: `default-${index}`,
      burnedAmount: 0,
      createdAt: new Date(),
      image: index % 2 === 0 ? DEFAULT_VVV_IMAGE : DEFAULT_CLOWN_IMAGE,
    });

    // Sort and prepare the arrays
    const sortedByBurnedAmount = [...(results || [])].sort(
      (a, b) => b.burnedAmount - a.burnedAmount
    );

    const sortedByCreatedAt = [...(results || [])].sort((a, b) => {
      const getDate = timestamp => {
        if (!timestamp) return new Date(0);
        if (timestamp.toDate) return timestamp.toDate();
        if (timestamp instanceof Date) return timestamp;
        if (typeof timestamp === "number") return new Date(timestamp);
        if (typeof timestamp === "string") return new Date(timestamp);
        return new Date(0);
      };

      const dateA = getDate(a.createdAt);
      const dateB = getDate(b.createdAt);
      return dateB - dateA;
    });

    // Get top 4 burners, fill with defaults if needed
    let topBurnersArray = sortedByBurnedAmount.slice(0, 4);
    while (topBurnersArray.length < 4) {
      topBurnersArray.push(createDefaultUser(topBurnersArray.length));
    }

    // Get next 4 most recent users, excluding those already in topBurners
    let recentUsersArray = sortedByCreatedAt
      .filter(user => !topBurnersArray.some(topUser => topUser.id === user.id))
      .slice(0, 4);

    // Fill remaining slots with default users
    while (recentUsersArray.length < 4) {
      recentUsersArray.push(createDefaultUser(recentUsersArray.length + 4));
    }

    // Set the state variables
    setTopBurners(topBurnersArray);
    setRecentUsers(recentUsersArray);

    // Apply the users to candles
    topBurnersArray.forEach((user, index) => {
      const candleName = `VCANDLE${String(index + 1).padStart(3, "0")}`;
      const candle = gltf.scene.getObjectByName(candleName);
      if (candle) {
        candle.userData = {
          ...candle.userData,
          hasUser: true,
          userName: user.userName,
          userId: user.id,
          burnedAmount: user.burnedAmount,
          image: user.image,
          message: user.message,
          createdAt: user.createdAt,
        };

        // Apply the image to the candle's labels
        applyUserImageToLabel(candle, user);
      }
    });

    recentUsersArray.forEach((user, index) => {
      const candleName = `VCANDLE${String(index + 5).padStart(3, "0")}`;
      const candle = gltf.scene.getObjectByName(candleName);
      if (candle) {
        candle.userData = {
          ...candle.userData,
          hasUser: true,
          userName: user.userName,
          userId: user.id,
          createdAt: user.createdAt,
          image: user.image,
          message: user.message,
          burnedAmount: user.burnedAmount,
        };

        // Apply the image to the candle's labels
        applyUserImageToLabel(candle, user);
      }
    });
  }, [results, gltf.scene]);

  // Add this effect near the other effects
  useEffect(() => {
    if (!gltf.scene) return;

    // Debug all VCANDLEs and their labels
    for (let i = 1; i <= 8; i++) {
      const candleName = `VCANDLE${String(i).padStart(3, "0")}`;
      const candle = gltf.scene.getObjectByName(candleName);
    }
  }, [gltf.scene]);

  // Add this effect for simple performance monitoring
  useEffect(() => {
    const checkPerformance = () => {
      // Count total objects in scene for a rough performance metric
      let meshCount = 0;
      let totalVertices = 0;

      if (scene) {
        scene.traverse(object => {
          if (object.isMesh) {
            meshCount++;
            if (
              object.geometry &&
              object.geometry.attributes &&
              object.geometry.attributes.position
            ) {
              totalVertices += object.geometry.attributes.position.count;
            }
          }
        });
      }
    };

    // Check every 10 seconds
    const perfTimer = setInterval(checkPerformance, 10000);

    return () => clearInterval(perfTimer);
  }, [scene]);

  // Add this function to set up flickering for candle flames
  const setupFlameFlickering = useCallback(() => {
    // Only set up flickering if we haven't already
    if (flickeringMaterials.size > 0) return;

    // Find all candle flames in the scene
    if (!gltf || !gltf.scene) return;

    const newFlickeringMaterials = new Map();

    // Look for all objects with "flame" in their name
    gltf.scene.traverse(object => {
      if (
        object.isMesh &&
        (object.name.includes("flame") ||
          object.name.includes("Flame") ||
          object.name.includes("fire") ||
          object.name.includes("Fire"))
      ) {
        // Store original material settings
        if (object.material) {
          // Clone the material to avoid affecting other objects
          const flameMaterial = object.material.clone();

          // Make sure the material has emission for glow effect
          // In 80s mode, use neon pink/cyan colors for the flames
          if (is80sMode) {
            // Create a neon color that shifts between pink and cyan
            const neonColor = Math.random() > 0.5 ? 0xff00ff : 0x00ffff; // Pink or Cyan
            flameMaterial.emissive = new THREE.Color(neonColor);
            flameMaterial.emissiveIntensity = 2.0; // Brighter for neon effect
            
            // Add bloom-friendly properties
            flameMaterial.toneMapped = false; // Allows colors to exceed white for bloom
          } else {
            flameMaterial.emissive = new THREE.Color(0xffaa44); // Warm flame color
            flameMaterial.emissiveIntensity = 1.0;
          }

          // Store base values for animation
          const baseData = {
            originalEmissiveIntensity: flameMaterial.emissiveIntensity,
            originalScale: object.scale.clone(),
            // Random offset so flames don't all flicker in sync
            randomOffset: Math.random() * 1000,
            // Generate random values for each flame
            flickerRange: is80sMode ? 0.5 + Math.random() * 0.5 : 0.3 + Math.random() * 0.4, // More dramatic flicker in 80s mode
          };

          // Apply the material to the object
          object.material = flameMaterial;

          // Store in our Map for animation updates
          newFlickeringMaterials.set(object.id, {
            object,
            material: flameMaterial,
            baseData,
          });
        }
      }
    });

    // Also look for manually placed candles
    scene.traverse(object => {
      if (object.userData && object.userData.isCandle) {
        // Find flame objects in the placed candles
        object.traverse(child => {
          if (
            child.isMesh &&
            (child.name.includes("flame") ||
              child.name.includes("Flame") ||
              child.name.includes("fire") ||
              child.name.includes("Fire"))
          ) {
            if (child.material) {
              // Clone the material
              const flameMaterial = child.material.clone();

              // Enhance emission - use neon colors in 80s mode
              if (is80sMode) {
                const neonColor = Math.random() > 0.5 ? 0xff00ff : 0x00ffff; // Pink or Cyan
                flameMaterial.emissive = new THREE.Color(neonColor);
                flameMaterial.emissiveIntensity = 2.0;
                flameMaterial.toneMapped = false; // For bloom effect
              } else {
                flameMaterial.emissive = new THREE.Color(0xffaa44);
                flameMaterial.emissiveIntensity = 1.0;
              }

              // Store base values
              const baseData = {
                originalEmissiveIntensity: flameMaterial.emissiveIntensity,
                originalScale: child.scale.clone(),
                randomOffset: Math.random() * 1000,
                flickerRange: is80sMode ? 0.5 + Math.random() * 0.5 : 0.3 + Math.random() * 0.4,
              };

              // Apply material
              child.material = flameMaterial;

              // Store for animation
              newFlickeringMaterials.set(child.id, {
                object: child,
                material: flameMaterial,
                baseData,
              });
            }
          }
        });
      }
    });

    // Update state with all the materials we've set up for flickering
    setFlickeringMaterials(newFlickeringMaterials);
  }, [gltf, scene, is80sMode]);

  // Call the setup function when the model is loaded or 80s mode changes
  useEffect(() => {
    if (gltf && gltf.scene && progress === 100) {
      setupFlameFlickering();
    }
  }, [gltf, progress, setupFlameFlickering, is80sMode]);

  // Re-setup flame flickering when 80s mode changes
  useEffect(() => {
    if (gltf && gltf.scene && progress === 100) {
      setupFlameFlickering();
    }
  }, [is80sMode]);

  // Add flame flickering animation using useFrame
  useFrame((_, delta) => {
    // Create a temporary Box3 for candle melting updates
    const tempBox = new THREE.Box3();

    // Make sure scene exists before traversing
    if (!scene) return;

    // Create a copy of the children to avoid modification during iteration
    const sceneChildren = [...scene.children];

    // Handle candle melting using tempBox with a safer approach
    sceneChildren.forEach(child => {
      // Safety check for child
      if (!child || !child.userData) return;

      if (child.userData.isCandle && child.userData.isMelting) {
        child.userData.meltingProgress += delta * child.userData.meltingRate;
        const MIN_SCALE = 0.2;
        const percentageRemaining = Math.max(1 - child.userData.meltingProgress, MIN_SCALE);

        if (child.userData.originalScale?.y) {
          if (!child.userData.originalValues) {
            tempBox.setFromObject(child);
            const height = tempBox.max.y - tempBox.min.y;
            const bottom = tempBox.min.y;
            child.userData.originalValues = {
              position: child.position.clone(),
              scale: child.scale.clone(),
              height: height,
              bottom: bottom,
              floorY: bottom,
            };
          }
          const originalYScale = child.userData.originalScale.y;
          const newYScale = originalYScale * percentageRemaining;
          child.scale.set(
            child.userData.originalScale.x,
            newYScale,
            child.userData.originalScale.z
          );

          tempBox.setFromObject(child);
          const currentBottom = tempBox.min.y;
          const floorY = child.userData.originalValues.floorY;
          const bottomDrift = currentBottom - floorY;
          child.position.y -= bottomDrift;
        }

        // Direct removal when reaching minimum scale instead of fading
        if (percentageRemaining <= MIN_SCALE + 0.05) {
          // Make sure the child still exists in the scene before removing
          if (scene && scene.children.includes(child)) {
            scene.remove(child);
            setCandleCount(prev => Math.max(0, prev - 1));
          }
        }
      }
    });
  });

  // Add an effect to update flame flickering for newly placed candles
  useEffect(() => {
    if (candleCount > 0) {
      // Short delay to ensure the candle is fully added to the scene
      const timer = setTimeout(() => {
        setupFlameFlickering();
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [candleCount, setupFlameFlickering]);

  // Add this function to check and fix floating candles
  const checkAndFixFloatingCandles = useCallback(() => {
    // Create a raycaster for checking candle positions
    const raycaster = new THREE.Raycaster();

    // Get all floor objects for testing
    const floors = [];
    gltf.scene.traverse(obj => {
      if (
        obj.isMesh &&
        (
          obj.name === "Floor2.002" ||
          obj.name.includes("Floor2") ||
          obj.name.includes("goldCircuit"))
      ) {
        floors.push(obj);
      }
    });

    // Find all user-placed candles
    scene.children.forEach(child => {
      if (child.userData && child.userData.isCandle) {
        // Get candle position
        const candlePos = child.position.clone();

        // Cast ray from 5 units above the candle down
        const rayStart = new THREE.Vector3(candlePos.x, candlePos.y + 5, candlePos.z);
        const rayDir = new THREE.Vector3(0, -1, 0);
        raycaster.set(rayStart, rayDir);

        // Find intersections with floor objects
        const hits = raycaster.intersectObjects(floors, false);

        if (hits.length > 0) {
          // Calculate if candle is floating by checking distance
          const floorY = hits[0].point.y;
          const currentY = candlePos.y;

          // If candle is more than 0.1 units above floor, fix it
          if (currentY - floorY > 0.1) {
            // Set to proper floor height with small offset
            child.position.y = floorY + 0.02;
          }
        }
      }
    });
  }, [gltf, scene]);

  // Add this effect to periodically check for and fix floating candles
  useEffect(() => {
    // Check right after model is loaded
    if (isModelLoaded) {
      checkAndFixFloatingCandles();
    }

    // Check after any zoom/camera operation
    const handleCameraChange = () => {
      if (cameraControlsRef && cameraControlsRef.current) {
        checkAndFixFloatingCandles();
      }
    };

    // Set up event listeners for zoom/camera changes
    window.addEventListener("resize", handleCameraChange);

    // Regular interval check (every 5 seconds)
    const intervalCheck = setInterval(checkAndFixFloatingCandles, 5000);

    return () => {
      window.removeEventListener("resize", handleCameraChange);
      clearInterval(intervalCheck);
    };
  }, [isModelLoaded, checkAndFixFloatingCandles, cameraControlsRef]);

  // Add this effect to specifically target transparent materials and z-fighting issues
  useEffect(() => {
    if (!gltf || !gltf.scene) return;

    // Force depth settings on all model materials with higher priority
    gltf.scene.traverse(object => {
      if (object.isMesh) {
        // Set render order very high to ensure it renders after stars
        object.renderOrder = 10;

        // Special handling for goldCircuit mesh
        if (object.name === "goldCircuit") {
          // Ensure goldCircuit renders before other objects
          object.renderOrder = -1; // Changed to negative to ensure it's always first
          if (object.material) {
            const applyFixes = material => {
              material.depthWrite = true; // Disable depth writing
              material.depthTest = true; // Keep depth testing
              material.transparent = true;
              material.opacity = 0.9; // More transparent
              material.blending = THREE.AdditiveBlending; // Add additive blending
              material.needsUpdate = true;
            };
            if (Array.isArray(object.material)) {
              object.material.forEach(applyFixes);
            } else {
              applyFixes(object.material);
            }
          }
        }

        if (object.material) {
          const applyFixes = material => {
            // Force proper depth settings
            material.depthWrite = true;
            material.depthTest = true;

            // Higher alphaTest ensures only fully opaque pixels write to depth buffer
            if (material.transparent) {
              material.alphaTest = 0.2;

              // For transparent materials that should still block stars
              if (
                material.name?.includes("glass") ||
                material.opacity > 0.8 ||
                material.name?.includes("Label")
              ) {
                // Force these materials to write to depth buffer
                material.depthWrite = true;
                // Higher render order for transparent parts
                material.renderOrder = 11;
              }
            }

            // Prevent any shadow-only materials from blocking stars
            if (material.shadowSide !== undefined && material.visible === false) {
              material.depthWrite = false;
            }

            // Special case for materials with emissive properties
            if (material.emissive && material.emissiveIntensity > 0) {
              material.renderOrder = 12; // Render these last
            }

            material.needsUpdate = true;
          };

          // Apply to all materials whether array or single
          if (Array.isArray(object.material)) {
            object.material.forEach(applyFixes);
          } else {
            applyFixes(object.material);
          }
        }
      }
    });
  }, [gltf]);

  // Add this useEffect to configure the 'american alligator' for interaction
  useEffect(() => {
    if (gltf && gltf.scene) {
      gltf.scene.traverse(object => {
        if (object.name === 'american alligator') {

          // Enable layer 1 for the main alligator object
          object.layers.enable(1);

          // Also enable layer 1 for all child meshes of the alligator
          object.traverse(child => {
            if (child.isMesh) {
              child.layers.enable(1);
            }
          });
        }
      });
    }
  }, [gltf]);

  // NEW useEffect to pass animations up and notify load
  useEffect(() => {
    if (gltf.scene && gltf.animations && setIsModelLoaded && onModelDataLoaded) {
      // modelRef.current is already being set by the <primitive> component using the ref prop.
      // We are just confirming that the data is ready to be passed up.

      onModelDataLoaded({ scene: gltf.scene, animations: gltf.animations });
      setIsModelLoaded(true); // Notify parent that model (scene graph part) is ready
    }
  }, [gltf.scene, gltf.animations, setIsModelLoaded, onModelDataLoaded]);

  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={[safeScale, safeScale, safeScale]}
        position={[0, 0, 0]}
        rotation={rotation}
        onClick={handleCandleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onUpdate={(self) => {
          // Force scale on every update for extra safety
          if (self && (self.scale.x < MIN_SCALE || self.scale.y < MIN_SCALE || self.scale.z < MIN_SCALE)) {
            self.scale.set(safeScale, safeScale, safeScale);
          }
        }}
      />
      <primitive ref={candleModelRef} object={new THREE.Group()} />
      {window.innerWidth >= 768 && <DarkClouds />}
      
      {/* Render particle effects */}
      {activeParticles.map(particle => (
        <ParticleTrail
          key={particle.id}
          position={particle.position}
          isActive={true}
          is80sMode={is80sMode}
        />
      ))}
    </>
  );
}

// Preload both models
useGLTF.preload("/catAltar.glb");
useGLTF.preload("/XCandle1.glb");

export default Model;

