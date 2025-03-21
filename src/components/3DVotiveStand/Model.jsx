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
useGLTF.preload("/altar80.glb");
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
// Set up GLTFLoader to use Draco compression
GLTFLoader.prototype.setDRACOLoader(dracoLoader);

// Default profile image to use when user has no image
const DEFAULT_PROFILE_IMAGE = "/defaultAvatar.png";

// Toggle visibility based on 80s mode
// useEffect(() => {
//   if (groupRef.current) {
//     groupRef.current.visible = is80sMode;
//   }
// }, [is80sMode]);

// Use useFrame to update the sun's position relative to the camera

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
}) {
  // STATE VARIABLES - consolidated in one place
  const [modelUrl, setModelUrl] = useState("/altar80.glb");
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

  // Add this near the top of your component
  const [debugPoints, setDebugPoints] = useState([]);

  // Add this state to track debug points with labels
  const [debugLabels, setDebugLabels] = useState([]);

  // Add this near the top of your component to inspect the candle model
  useEffect(() => {
    if (candle && candle.scene) {
      console.log("Candle model structure:", candle);

      // Log all objects in the model
      candle.scene.traverse((obj) => {
        if (obj.isMesh) {
          console.log("Found mesh in candle model:", obj.name, obj);
        }
      });
    }
  }, [candle]);

  // Modified debug point function
  function addDebugPoint(position, color = 0xff0000, label = "") {
    // Create a sphere to visualize the point
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.7,
    });
    const sphere = new THREE.Mesh(geometry, material);

    // Position the sphere at the exact point
    sphere.position.copy(position);

    // Add to scene
    scene.add(sphere);

    // If there's a label, add it to the state so React can render it
    if (label) {
      const newLabel = {
        id: `label-${Date.now()}-${Math.random()}`,
        position: new THREE.Vector3(position.x, position.y + 0.5, position.z),
        text: label,
        color: "white",
      };

      setDebugLabels((prev) => [...prev, newLabel]);

      // Remove the label after some time
      setTimeout(() => {
        setDebugLabels((prev) => prev.filter((l) => l.id !== newLabel.id));
      }, 10000);
    }

    // Set up removal timer for sphere
    setTimeout(() => {
      scene.remove(sphere);
    }, 10000);

    console.log(
      `Added debug point at (${position.x.toFixed(2)}, ${position.y.toFixed(
        2
      )}, ${position.z.toFixed(2)})`
    );

    return sphere;
  }

  // Now let's fix the candle model issue
  useEffect(() => {
    if (!candle || !candle.scene) return;

    console.log("Analyzing candle model structure...");
    let hasMeshes = false;

    // Log complete hierarchy
    console.log("Candle scene hierarchy:");
    candle.scene.traverse((obj) => {
      console.log(`- ${obj.type}: ${obj.name} ${obj.isMesh ? "(MESH)" : ""}`);
      if (obj.isMesh) hasMeshes = true;
    });

    if (!hasMeshes) {
      console.warn(
        "No meshes found in candle model - model may be empty or have a different structure!"
      );
    }

    // Store unmodified original for reference
    candleModelRef.current = candle.scene;

    // Create a visible placeholder if model seems empty
    if (!hasMeshes) {
      console.log("Creating placeholder candle");
      const placeholderCandle = new THREE.Group();

      // Add basic cylinder for wax
      const waxGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16);
      const waxMaterial = new THREE.MeshStandardMaterial({ color: 0xf0f0f0 });
      const wax = new THREE.Mesh(waxGeometry, waxMaterial);

      // Add small cylinder for wick
      const wickGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.5, 8);
      const wickMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
      const wick = new THREE.Mesh(wickGeometry, wickMaterial);
      wick.position.y = 1.2;

      // Add point light for flame
      const flame = new THREE.PointLight(0xff7700, 1, 5);
      flame.position.y = 1.5;

      // Add flame mesh
      const flameGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const flameMaterial = new THREE.MeshBasicMaterial({
        color: 0xff9900,
        emissive: 0xff7700,
        transparent: true,
        opacity: 0.7,
      });
      const flameMesh = new THREE.Mesh(flameGeometry, flameMaterial);
      flameMesh.position.y = 1.5;
      flameMesh.scale.y = 1.5;

      // Add all parts to placeholder
      placeholderCandle.add(wax);
      placeholderCandle.add(wick);
      placeholderCandle.add(flame);
      placeholderCandle.add(flameMesh);

      // Use placeholder instead
      candleModelRef.current = placeholderCandle;
    }
  }, [candle]);

  // Simplify the candle placement code - replace the existing handleFloorClick function

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

      // Add a debug sphere at click point (optional)
      const debugSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      );
      debugSphere.position.copy(point);
      scene.add(debugSphere);

      // Remove debug sphere after 2 seconds
      setTimeout(() => scene.remove(debugSphere), 2000);

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

  // Remove all the complex test and debug code from earlier
  // Just keep the basic cleanup effect:

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

  // Add this somewhere in your component
  const testCandleModel = useCallback(() => {
    if (!candle || !candle.scene) {
      console.error("No candle model loaded");
      return;
    }

    // Create a test display at a fixed position for visibility
    const testPosition = new THREE.Vector3(0, 10, 0);

    // Original model
    const originalModel = candle.scene.clone();
    originalModel.position.set(
      testPosition.x - 3,
      testPosition.y,
      testPosition.z
    );
    originalModel.scale.set(1, 1, 1);
    scene.add(originalModel);

    // Our placeholder/optimized model
    const optimizedModel = candleModelRef.current.clone();
    optimizedModel.position.set(
      testPosition.x + 3,
      testPosition.y,
      testPosition.z
    );
    optimizedModel.scale.set(1, 1, 1);
    scene.add(optimizedModel);

    // Add comparison markers
    addDebugPoint(originalModel.position, 0x00ffff, "Original");
    addDebugPoint(optimizedModel.position, 0xff00ff, "Optimized");

    console.log("Added test models at y=10 for comparison");
  }, [candle, scene]);

  // Call this somewhere after models are loaded
  useEffect(() => {
    if (candle && candleModelRef.current) {
      // Wait a bit to make sure everything is loaded
      const timer = setTimeout(() => {
        testCandleModel();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [candle, candleModelRef.current, testCandleModel]);

  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={[scale, scale, scale]}
        position={[0, -20, 0]}
        rotation={rotation}
        onClick={(event) => {
          // Check if we clicked on a floor object
          if (
            event.object.name === "Floor" ||
            event.object.name === "Floor2.002" ||
            event.object.name.includes("Floor2")
          ) {
            handleFloorClick(event);
          }
        }}
      />
      <primitive ref={candleModelRef} object={new THREE.Group()} />{" "}
      {/* Placeholder for candle model */}
      <DarkClouds />
      {/* Debug visualization */}
      {debugPoints.map((point) => (
        <mesh
          key={point.id}
          position={[point.position.x, point.position.y, point.position.z]}
        >
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color={point.color} />
        </mesh>
      ))}
      {/* Debug labels using Text component */}
      {debugLabels.map((label) => (
        <Text
          key={label.id}
          position={[label.position.x, label.position.y, label.position.z]}
          fontSize={0.5}
          color={label.color}
          anchorX="center"
          anchorY="middle"
        >
          {label.text}
        </Text>
      ))}
    </>
  );
}

// Preload both models
useGLTF.preload("/altar80.glb");
useGLTF.preload("/XCandle1.glb");

export default Model;
