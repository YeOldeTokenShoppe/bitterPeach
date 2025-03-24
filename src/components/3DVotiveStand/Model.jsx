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

  // Add this at the top of your component to enable memory tracking
  useEffect(() => {
    const checkMemoryUsage = () => {
      // Report memory usage if available in the browser
      if (window.performance && window.performance.memory) {
        console.log("Memory usage:", {
          total:
            Math.round(
              window.performance.memory.totalJSHeapSize / (1024 * 1024)
            ) + "MB",
          used:
            Math.round(
              window.performance.memory.usedJSHeapSize / (1024 * 1024)
            ) + "MB",
          limit:
            Math.round(
              window.performance.memory.jsHeapSizeLimit / (1024 * 1024)
            ) + "MB",
        });
      }

      // Check texture cache size
      console.log(`Texture cache size: ${textureCache.current.size} textures`);
    };

    // Check memory every 5 seconds
    const memoryTimer = setInterval(checkMemoryUsage, 5000);

    return () => clearInterval(memoryTimer);
  }, []);

  const handleFloorClick = useCallback(
    (event) => {
      event.stopPropagation();

      // Check if we've reached the candle limit
      if (candleCount >= maxFloorCandles) {
        console.log(`Maximum candles reached (${maxFloorCandles})`);
        return;
      }

      // Get the intersection point
      const point = event.point.clone();
      const floorObject = event.object;

      // Create a deep clone of the original candle model
      const newCandle = candle.scene.clone();
      if (!newCandle) {
        console.error("Failed to clone candle model");
        return;
      }

      // Handle placement based on floor type
      if (
        floorObject.name === "Floor2.002" ||
        floorObject.name.includes("Floor2")
      ) {
        // Use raycasting to find exact height for tiered floor
        const raycaster = new THREE.Raycaster();
        const rayStart = new THREE.Vector3(point.x, point.y + 50, point.z);
        const rayDir = new THREE.Vector3(0, -1, 0);
        raycaster.set(rayStart, rayDir);

        // Test against floor objects
        const floors = [];
        gltf.scene.traverse((obj) => {
          if (
            obj.isMesh &&
            (obj.name === "Floor2.002" || obj.name.includes("Floor2"))
          ) {
            floors.push(obj);
          }
        });

        const hits = raycaster.intersectObjects(floors, false);

        // Filter hits by face normal to only select upward-facing surfaces
        const up = new THREE.Vector3(0, 1, 0);
        const validHits = hits.filter((hit) => hit.face.normal.dot(up) > 0.7);

        if (validHits.length > 0) {
          validHits.sort((a, b) => a.distance - b.distance);
          const exactPoint = validHits[0].point.clone();
          exactPoint.y += 0.05; // Offset to avoid z-fighting
          newCandle.position.copy(exactPoint);
        } else {
          point.y += 0.05;
          newCandle.position.copy(point);
        }
      } else {
        // Standard floor placement
        point.y += 0.05;
        newCandle.position.copy(point);
      }

      // Add random rotation for visual interest
      newCandle.rotation.y = Math.random() * Math.PI * 2;

      // Use a consistent scale for all candles
      const fixedScale = 0.7;
      newCandle.scale.set(fixedScale, fixedScale, fixedScale);

      // Mark as a candle for cleanup later
      newCandle.userData = {
        ...newCandle.userData,
        isCandle: true,
        candleId: `placed_candle_${candleCount}`,
        placedAt: new Date(),
      };

      // Add the candle to the scene
      scene.add(newCandle);

      // Increment the candle counter
      setCandleCount((prev) => prev + 1);

      // Log the remaining candle count
      console.log(
        `Added candle #${candleCount + 1}. ${
          maxFloorCandles - (candleCount + 1)
        } remaining.`
      );
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

    console.log(
      "All candles have been removed. You can place up to",
      maxFloorCandles,
      "candles."
    );
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
      console.log("Candle saved to Firestore with ID:", docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error saving candle:", error);
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
        console.log(`${child.name} visibility set to: ${!monsterMode}`);
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
    console.log("loadUserCandles called");

    if (!instancedXCandleRef.current) {
      console.error(
        "instancedXCandleRef.current is not set in loadUserCandles"
      );
      return;
    }

    try {
      console.log("Fetching userCandles from Firestore");
      const candlesSnapshot = await getDocs(collection(db, "userCandles"));
      console.log(`Retrieved ${candlesSnapshot.size} candles from Firestore`);

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
    console.log("Progress update:", progress);

    if (progress === 100 && setIsModelLoaded) {
      console.log("Model loading complete, setting isModelLoaded to true");
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
        console.log("Force completing loading after timeout");
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
  }, [gltf.scene]);

  // Modify the lighting setup to ensure proper values
  useEffect(() => {
    // Clean up any previous lights to prevent duplicates
    scene.children.forEach((child) => {
      if (child.isHemisphereLight && child !== hemiLightRef.current) {
        console.log("Removing extra hemisphere light");
        scene.remove(child);
      }
    });

    // Convert hex string colors to numbers if they're provided as strings
    let skyColorValue = skyColor;
    let groundColorValue = groundColor;

    if (parentSkyColor && typeof parentSkyColor === "string") {
      skyColorValue = parseInt(parentSkyColor.replace("#", "0x"), 16);
      console.log("Using parent sky color:", parentSkyColor);
    }

    if (parentGroundColor && typeof parentGroundColor === "string") {
      groundColorValue = parseInt(parentGroundColor.replace("#", "0x"), 16);
      console.log("Using parent ground color:", parentGroundColor);
    }

    // Create the hemisphere light with correct parameters
    const lightIntensityValue =
      parentLightIntensity !== undefined
        ? parentLightIntensity
        : lightIntensity;

    console.log("Creating hemisphere light with:", {
      skyColor: "#" + skyColorValue.toString(16),
      groundColor: "#" + groundColorValue.toString(16),
      intensity: lightIntensityValue,
      position: lightPosition,
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

  // Add this function near your other helper functions
  const applyUserImageToLabel = (candle, user) => {
    if (!user?.image) return;

    // Find both labels
    const labels = candle.children.filter(
      (child) => child.name.includes("Label1") || child.name.includes("Label2")
    );

    if (labels.length === 0) return;

    const textureLoader = new THREE.TextureLoader();

    // Create a low-resolution texture loader helper
    const loadLowResTexture = (url, onLoad) => {
      // Check cache first
      if (textureCache.current.has(url)) {
        console.log("Using cached texture for:", url);
        onLoad(textureCache.current.get(url));
        return;
      }

      // Create a canvas to resize the image
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      // Set target dimensions - small size for candle labels
      const targetWidth = 128; // Reduced resolution (adjust based on your needs)
      const targetHeight = 128; // Maintain aspect ratio if needed

      // Load the image first
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // Resize using canvas
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw resized image on canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.encoding = THREE.sRGBEncoding;
        texture.flipY = false;
        texture.needsUpdate = true;

        // Apply compression settings
        texture.generateMipmaps = false;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Store in cache
        textureCache.current.set(url, texture);

        // Call onLoad with the optimized texture
        onLoad(texture);

        // Clean up
        // In a production environment, consider using a texture cache
        // to avoid recreating textures for the same images
      };

      img.onerror = (error) => console.warn("🚨 Image load error:", error);
      img.src = url;
    };

    // Use our low-res loader instead of direct loading
    loadLowResTexture(user.image, (texture) => {
      // Apply to all found labels
      labels.forEach((label) => {
        if (label.material) {
          // Dispose of any existing materials/textures
          if (label.material.map) {
            label.material.map.dispose();
          }
          label.material.dispose();

          // Create new material with the texture
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

    console.log("Raw results from Firestore:", results);

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
        console.log(`Applying user ${user.userName} to ${candleName}`, user);

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
        console.log(`Applying user ${user.userName} to ${candleName}`, user);

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

      if (candle) {
        console.log(`Initial state of ${candleName}:`, {
          position: candle.position,
          visible: candle.visible,
          children: candle.children.map((child) => ({
            name: child.name,
            type: child.type,
            visible: child.visible,
            hasMaterial: !!child.material,
            materialType: child.material?.type,
          })),
        });
      }
    }
  }, [gltf.scene]);

  // Modify the handleCandleClick function
  const handleCandleClick = useCallback(
    (event) => {
      event.stopPropagation();

      // Skip if it's a floor click
      if (
        event.object.name === "Floor" ||
        event.object.name === "Floor2.002" ||
        event.object.name.includes("Floor2")
      ) {
        handleFloorClick(event);
        return;
      }

      const mouse = new THREE.Vector2(
        (event.nativeEvent.offsetX / event.nativeEvent.target.clientWidth) * 2 -
          1,
        -(event.nativeEvent.offsetY / event.nativeEvent.target.clientHeight) *
          2 +
          1
      );

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
          console.log("VCANDLE clicked:", candleParent.name);

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

  // Then add a cleanup effect to your component:
  useEffect(() => {
    return () => {
      // Clean up texture cache on unmount
      textureCache.current.forEach((texture) => {
        texture.dispose();
      });
      textureCache.current.clear();
    };
  }, []);

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
