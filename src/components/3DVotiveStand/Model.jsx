import React, {
  useEffect,
  useState,
  useRef,
  Suspense,
  useCallback,
} from "react";
import { useThree, useFrame } from "@react-three/fiber";
import {
  useGLTF,
  useProgress,
  Text,
  Environment,
  useTexture,
  Plane,
} from "@react-three/drei";
import * as THREE from "three";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
import DarkClouds from "./Clouds";

import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../utilities/firebaseClient"; // Import storage directly
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import { InstancedMesh, DynamicDrawUsage } from "three";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../utilities/firebaseClient";
import { gsap } from "gsap";

// Configure draco loader for useGLTF
useGLTF.preload("/altar88.glb");
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
  showSpotify,

  monsterMode,
  cameraControlsRef,
  onCandleClick,
}) {
  // STATE VARIABLES - consolidated in one place
  const [modelUrl, setModelUrl] = useState("/altar88.glb");
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

  // Add this at the top of your component to enable memory tracking
  // useEffect(() => {
  //   const checkMemoryUsage = () => {
  //     // Report memory usage if available in the browser
  //     if (window.performance && window.performance.memory) {
  //       console.log("Memory usage:", {
  //         total:
  //           Math.round(
  //             window.performance.memory.totalJSHeapSize / (1024 * 1024)
  //           ) + "MB",
  //         used:
  //           Math.round(
  //             window.performance.memory.usedJSHeapSize / (1024 * 1024)
  //           ) + "MB",
  //         limit:
  //           Math.round(
  //             window.performance.memory.jsHeapSizeLimit / (1024 * 1024)
  //           ) + "MB",
  //       });
  //     }

  //     // // Check texture cache size
  //     // console.log(`Texture cache size: ${textureCache.current.size} textures`);
  //   };

  //   // Check memory every 5 seconds
  //   const memoryTimer = setInterval(checkMemoryUsage, 5000);

  //   return () => clearInterval(memoryTimer);
  // }, []);

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
      (texture) => {
        // Apply optimizations that don't affect appearance
        texture.generateMipmaps = true; // Keep mipmaps for quality
        texture.anisotropy = 4; // Good quality without excess memory

        // Store in cache
        textureCache.current.set(url, texture);

        // Return the optimized texture
        onLoad(texture);
      },
      undefined,
      (error) => console.warn("Texture loading error:", error)
    );
  };

  // Add a better cleanup function for textures
  useEffect(() => {
    return () => {
      // Dispose textures properly to prevent memory leaks
      const currentCache = textureCache.current;
      if (currentCache && currentCache.size > 0) {
        currentCache.forEach((texture) => {
          texture.dispose();
        });
        currentCache.clear();
      }
    };
  }, []);

  // Modify your handleFloorClick for better candle placement
  // while preserving your existing logic
  const handleFloorClick = useCallback(
    (event) => {
      event.stopPropagation();

      // // Check if we've reached the candle limit
      // if (candleCount >= maxFloorCandles) {
      //   console.log(`Maximum candles reached (${maxFloorCandles})`);
      //   return;
      // }

      // Get the intersection point
      const point = event.point.clone();
      const floorObject = event.object;

      // Create a deep clone of the original candle model
      const newCandle = candle.scene.clone();
      // if (!newCandle) {
      //   console.error("Failed to clone candle model");
      //   return;
      // }

      // IMPROVED FLOOR PLACEMENT LOGIC
      // Always use raycasting for more accurate placement regardless of floor type
      const raycaster = new THREE.Raycaster();
      // Start raycast from 5 units above the click point
      const rayStart = new THREE.Vector3(point.x, point.y + 5, point.z);
      const rayDir = new THREE.Vector3(0, -1, 0);
      raycaster.set(rayStart, rayDir);

      // Get all floor objects for testing
      const floors = [];
      gltf.scene.traverse((obj) => {
        if (
          obj.isMesh &&
          (obj.name === "Floor" ||
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
        const validHits = hits.filter((hit) => {
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

          // Align candle to floor normal if not perfectly flat
          if (Math.abs(floorNormal.y - 1.0) > 0.01) {
            // This would align the candle to non-flat surfaces
            // Only implement if you have sloped surfaces
            // For now just log it
            // console.log("Placed on non-flat surface:", floorNormal);
          }
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
      const meltingRate = 1 / (1 * 10 * 60); // 15-25 seconds for testing

      // Apply melting properties to each child
      newCandle.traverse((child) => {
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

      // Increment the candle counter
      setCandleCount((prev) => prev + 1);
    },
    [candle, candleCount, gltf, scene, maxFloorCandles]
  );

  // Add a function to show the user how many candles are available
  const getRemainingCandleCount = useCallback(() => {
    return maxFloorCandles - candleCount;
  }, [maxFloorCandles, candleCount]);

  // Add a reset function (optional)
  const resetCandles = useCallback(() => {
    // Remove all placed candles
    scene.children.forEach((child) => {
      if (child.userData && child.userData.isCandle) {
        scene.remove(child);
      }
    });

    // Reset counter
    setCandleCount(0);
  }, [scene, maxFloorCandles]);

  // Optional helper function to save candles to Firestore
  const saveCandleToFirestore = async (candleData) => {
    try {
      const docRef = await addDoc(collection(db, "userCandles"), {
        position: candleData.position,
        rotation: candleData.rotation,
        scale: candleData.scale,
        instanceId: candleData.id,
        createdAt: candleData.createdAt,
        // Add any other metadata you want
        userName: "Anonymous", // Could be dynamic
        message: "", // Could prompt user for a message
      });

      return docRef.id;
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      // Clean up any candles when component unmounts
      scene.children.forEach((child) => {
        if (child.userData && child.userData.isCandle) {
          scene.remove(child);
        }
      });
    };
  }, [scene]);

  // Add effect to toggle visibility of specific objects based on monsterMode
  useEffect(() => {
    if (!gltf.scene) return;

    // Find Object_3 and Object_2.001 in the model
    gltf.scene.traverse((child) => {
      if (child.name === "Object_3" || child.name === "Object_2.001") {
        child.visible = !monsterMode;
      }
    });
  }, [monsterMode, gltf.scene]);

  // Add click handlers to floor objects
  useEffect(() => {
    if (!gltf || !gltf.scene) return;

    // Find floor objects and add click handlers
    gltf.scene.traverse((child) => {
      if (
        child.isMesh &&
        (child.name === "Floor" ||
          child.name === "Floor2.002" ||
          child.name === "goldCircuit")
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

  const loadUserCandles = useCallback(async () => {
    if (!instancedXCandleRef.current) {
      return;
    }

    try {
      const candlesSnapshot = await getDocs(collection(db, "userCandles"));

      // Load candles in batches
      const allCandles = [];
      candlesSnapshot.forEach((doc) => {
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
      // Force isModelLoaded to true after a reasonable timeout (e.g., 10 seconds)
      const forceLoadTimer = setTimeout(() => {
        setIsModelLoaded(true);
      }, 10000);

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
    setModelCenter(center);
  }, [gltf.scene, modelRef, setModelCenter]);

  // Modify the lighting setup to ensure proper values
  useEffect(() => {
    // Clean up any previous lights to prevent duplicates
    scene.children.forEach((child) => {
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
      parentLightIntensity !== undefined
        ? parentLightIntensity
        : lightIntensity;

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
      gltf.scene.traverse((object) => {
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
    if (!gltf || !gltf.scene) return;

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
      texture.encoding = THREE.sRGBEncoding;
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
    gltf.scene.traverse((child) => {
      // Check for any mesh with "Floor" in its name (case insensitive)
      if (child.isMesh && child.name === "Floor") {
        // Store the original texture if we haven't already
        if (
          !child.userData.originalTexture &&
          child.material &&
          child.material.map
        ) {
          child.userData.originalTexture = child.material.map;
          child.userData.originalMaterial = child.material.clone();
        }

        // Toggle between original and 80s texture
        if (is80sMode) {
          textureLoader.load(textureConfig.path, (texture) => {
            // Apply all texture settings
            applyTextureWithSettings(texture, textureConfig);

            if (child.material) {
              // Create a new material or update existing one
              const applyMaterial = (mat) => {
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
          });
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
  }, [is80sMode, gltf]);

  // Modify your applyUserImageToLabel function
  const applyUserImageToLabel = (candle, user) => {
    if (!user?.image) return;

    // Find both labels, but keep them in separate arrays
    const label1Objects = candle.children.filter((child) =>
      child.name.includes("Label1")
    );

    const label2Objects = candle.children.filter(
      (child) => child.name.includes("Label2") && !child.name.includes("Label1")
    );

    if (label1Objects.length === 0 && label2Objects.length === 0) return;

    // Use our optimized texture loader instead of direct loading
    loadOptimizedTexture(user.image, (texture) => {
      // Apply to Label1 objects (flipped on both X and Y axes)
      label1Objects.forEach((label) => {
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
      label2Objects.forEach((label) => {
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
    const createDefaultUser = (index) => ({
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
      const getDate = (timestamp) => {
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
      .filter(
        (user) => !topBurnersArray.some((topUser) => topUser.id === user.id)
      )
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

  // Modify the handleCandleClick function to handle touch events better
  const handleCandleClick = useCallback(
    (event) => {
      event.stopPropagation();

      // Skip if it's a floor click
      if (
        event.object.name === "Floor" ||
        event.object.name === "Floor2.002" ||
        event.object.name.includes("Floor2") ||
        event.object.name.includes("goldCircuit")
      ) {
        handleFloorClick(event);
        return;
      }

      // Improved handling for mobile/touch events
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
          x:
            (event.nativeEvent.offsetX / event.nativeEvent.target.clientWidth) *
              2 -
            1,
          y:
            -(
              event.nativeEvent.offsetY / event.nativeEvent.target.clientHeight
            ) *
              2 +
            1,
        };
      };

      const coords = getEventCoordinates();
      const mouse = new THREE.Vector2(coords.x, coords.y);

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Find all VCANDLE objects and their children
      const intersectableObjects = [];
      if (modelRef.current) {
        modelRef.current.traverse((object) => {
          if (object.name.startsWith("VCANDLE")) {
            intersectableObjects.push(object);
            // Also include children for better click detection
            object.children.forEach((child) => {
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

      const intersects = raycaster.intersectObjects(intersectableObjects, true);
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
    [camera, modelRef, handleFloorClick, onCandleClick]
  );

  // Add this effect for simple performance monitoring
  useEffect(() => {
    const checkPerformance = () => {
      // Count total objects in scene for a rough performance metric
      let meshCount = 0;
      let totalVertices = 0;

      if (scene) {
        scene.traverse((object) => {
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
    gltf.scene.traverse((object) => {
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
          flameMaterial.emissive = new THREE.Color(0xffaa44); // Warm flame color
          flameMaterial.emissiveIntensity = 1.0;

          // Store base values for animation
          const baseData = {
            originalEmissiveIntensity: flameMaterial.emissiveIntensity,
            originalScale: object.scale.clone(),
            // Random offset so flames don't all flicker in sync
            randomOffset: Math.random() * 1000,
            // Generate random values for each flame
            flickerRange: 0.3 + Math.random() * 0.4, // How much it flickers (30-70%)
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
    scene.traverse((object) => {
      if (object.userData && object.userData.isCandle) {
        // Find flame objects in the placed candles
        object.traverse((child) => {
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

              // Enhance emission
              flameMaterial.emissive = new THREE.Color(0xffaa44);
              flameMaterial.emissiveIntensity = 1.0;

              // Store base values
              const baseData = {
                originalEmissiveIntensity: flameMaterial.emissiveIntensity,
                originalScale: child.scale.clone(),
                randomOffset: Math.random() * 1000,
                flickerRange: 0.3 + Math.random() * 0.4,
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
  }, [gltf, scene, flickeringMaterials]);

  // Call the setup function when the model is loaded
  useEffect(() => {
    if (gltf && gltf.scene && progress === 100) {
      setupFlameFlickering();
    }
  }, [gltf, progress, setupFlameFlickering]);

  // Add flame flickering animation using useFrame
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // Update each flickering flame
    flickeringMaterials.forEach(({ object, material, baseData }) => {
      if (!object || !material) return;

      // Calculate flicker value using perlin noise or simplex noise
      // Here we use a simple sine wave with random offsets for simplicity
      const flicker =
        Math.sin((time + baseData.randomOffset) * flickerSpeed.current) *
        baseData.flickerRange *
        flickerIntensity.current;

      // Apply to emission intensity
      const newIntensity = baseData.originalEmissiveIntensity * (1 + flicker);
      material.emissiveIntensity = Math.max(0.3, newIntensity);

      // Optionally also animate the scale for more dramatic effect
      const scaleFlicker = 1 + flicker * 0.1; // Subtle scale change
      object.scale.set(
        baseData.originalScale.x * scaleFlicker,
        baseData.originalScale.y * (scaleFlicker + 0.05), // Y scale varies a bit more
        baseData.originalScale.z * scaleFlicker
      );
    });

    // Handle candle melting
    // Replace the candle melting section in useFrame with this code
    // Handle candle melting
    scene.traverse((child) => {
      // Check if this is a candle object that should be melting
      if (child.userData?.isCandle && child.userData?.isMelting) {
        // Update melting progress based on time and melting rate
        child.userData.meltingProgress += delta * child.userData.meltingRate;

        // Calculate the percentage remaining (0.2 = 20% minimum height)
        const MIN_SCALE = 0.2;
        const percentageRemaining = Math.max(
          1 - child.userData.meltingProgress,
          MIN_SCALE
        );

        if (child.userData.originalScale?.y) {
          // Initialize original values if not already stored
          if (!child.userData.originalValues) {
            // Get the bounding box to find the actual dimensions
            const bbox = new THREE.Box3().setFromObject(child);
            const height = bbox.max.y - bbox.min.y;
            const bottom = bbox.min.y;

            // Store all values we need for reference
            child.userData.originalValues = {
              position: child.position.clone(),
              scale: child.scale.clone(),
              height: height,
              bottom: bottom,
              floorY: bottom, // Consider this the "floor" Y position
            };
          }

          // ALTERNATIVE APPROACH: Instead of trying to calculate offsets,
          // directly modify the local matrix to scale from the bottom

          // First, apply scale to the candle
          const originalYScale = child.userData.originalScale.y;
          const newYScale = originalYScale * percentageRemaining;

          // Set scale (keep X and Z the same)
          child.scale.set(
            child.userData.originalScale.x,
            newYScale,
            child.userData.originalScale.z
          );

          // IMPORTANT: After scaling, recalculate the bounding box to find new bottom
          const currentBbox = new THREE.Box3().setFromObject(child);
          const currentBottom = currentBbox.min.y;

          // Calculate how much the bottom moved from its original position
          const floorY = child.userData.originalValues.floorY;
          const bottomDrift = currentBottom - floorY;

          // Move the entire candle to counteract any drift
          // If bottom is above floor (positive drift), move down
          // If bottom is below floor (negative drift), move up
          child.position.y -= bottomDrift;

          // Debug logging every 10% of progress
          if (
            Math.floor(child.userData.meltingProgress * 100) % 10 === 0 &&
            Math.floor(child.userData.meltingProgress * 100) >
              Math.floor(
                (child.userData.meltingProgress -
                  delta * child.userData.meltingRate) *
                  100
              )
          ) {
            // Recalculate after position adjustment to verify fix
            const verifyBbox = new THREE.Box3().setFromObject(child);
          }
        }

        // Handle fadeout of almost melted candles
        if (percentageRemaining <= MIN_SCALE + 0.05) {
          child.traverse((part) => {
            if (part.material && part.material.opacity !== undefined) {
              part.material.transparent = true;
              part.material.opacity = Math.max(
                0,
                (MIN_SCALE + 0.1 - percentageRemaining) * 10
              );

              // When completely faded, remove from scene
              if (part.material.opacity <= 0.05) {
                scene.remove(child);
                // Update candle count
                setCandleCount((prev) => Math.max(0, prev - 1));
              }
            }
          });
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
    gltf.scene.traverse((obj) => {
      if (
        obj.isMesh &&
        (obj.name === "Floor" ||
          obj.name === "Floor2.002" ||
          obj.name.includes("Floor2") ||
          obj.name.includes("goldCircuit"))
      ) {
        floors.push(obj);
      }
    });

    // Find all user-placed candles
    scene.children.forEach((child) => {
      if (child.userData && child.userData.isCandle) {
        // Get candle position
        const candlePos = child.position.clone();

        // Cast ray from 5 units above the candle down
        const rayStart = new THREE.Vector3(
          candlePos.x,
          candlePos.y + 5,
          candlePos.z
        );
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
    gltf.scene.traverse((object) => {
      if (object.isMesh) {
        // Set render order very high to ensure it renders after stars
        object.renderOrder = 10;

        if (object.material) {
          const applyFixes = (material) => {
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
            if (
              material.shadowSide !== undefined &&
              material.visible === false
            ) {
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

  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={[scale, scale, scale]}
        position={[0, -20, 0]}
        rotation={rotation}
        onClick={handleCandleClick}
      />
      <primitive ref={candleModelRef} object={new THREE.Group()} />
      <DarkClouds />
    </>
  );
}

// Preload both models
useGLTF.preload("/altar88.glb");
useGLTF.preload("/XCandle1.glb");

export default Model;
