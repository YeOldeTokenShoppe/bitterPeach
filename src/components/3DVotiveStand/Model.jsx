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
  const maxCandles = 100; // Maximum number of candles to allow

  // Load candle model - use a different approach
  const candle = useGLTF("/XCandle1.glb");

  // Add this near the top of your component
  const [debugPoints, setDebugPoints] = useState([]);

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

  // Let's create a more direct debug visualization - update this function:
  function addDebugPoint(position, color = 0xff0000) {
    // Create a sphere to visualize the point
    const geometry = new THREE.SphereGeometry(0.2, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);

    // Position the sphere at the exact point
    sphere.position.copy(position);

    // Add to scene
    scene.add(sphere);

    // Optional: Remove after some time
    setTimeout(() => {
      scene.remove(sphere);
    }, 10000); // Remove after 10 seconds

    console.log("Added debug sphere at:", position);
  }

  // Function to handle floor clicks and place candles
  const handleFloorClick = useCallback(
    (event) => {
      event.stopPropagation();

      if (candleCount >= maxCandles) return; // Limit number of candles

      // Get the intersection point and object from the event
      const point = event.point.clone();
      const floorObject = event.object;

      console.log("Click detected on:", floorObject.name, "at point:", point);

      // Add a debug point at the initial click location
      addDebugPoint(point, 0x00ff00); // Green for initial click

      // Create a candle object with proper placement on the surface
      const placeCandleAtPoint = (point) => {
        // Clone the candle model for this instance
        const newCandle = candle.scene.clone();

        // Mark this as a candle for easier cleanup
        newCandle.userData.isCandle = true;

        // Set the basic position using the exact point
        newCandle.position.set(point.x, point.y, point.z);

        // Add some random rotation
        newCandle.rotation.y = Math.random() * Math.PI * 2;

        // Add a small random scale variation for visual interest
        const randomScale = 0.9 + Math.random() * 0.2;
        newCandle.scale.set(randomScale, randomScale, randomScale);

        // Add to scene
        scene.add(newCandle);

        // Increment the candle count
        setCandleCount((prevCount) => prevCount + 1);

        const candleData = {
          position: { x: point.x, y: point.y, z: point.z },
          rotation: { y: newCandle.rotation.y },
          scale: randomScale,
          id: `candle_${candleCount}`,
          createdAt: new Date(),
        };

        console.log("Added candle:", candleData);

        // Optional: Save to Firestore
        // saveCandleToFirestore(candleData);
      };

      // A more direct approach for Floor2.002
      if (floorObject.name === "Floor2.002") {
        // We'll use a different approach with the raycaster
        // Cast ray directly from the camera through the click point
        const raycaster = new THREE.Raycaster();

        // Create a ray starting from high above the scene
        const rayOrigin = new THREE.Vector3(point.x, point.y + 50, point.z);
        const rayDirection = new THREE.Vector3(0, -1, 0);
        rayDirection.normalize();

        // Visualize ray origin
        addDebugPoint(rayOrigin, 0x0000ff); // Blue for ray origin

        // Set up the raycaster
        raycaster.set(rayOrigin, rayDirection);

        // Get all objects in the scene for better detection
        const allFloors = [];
        gltf.scene.traverse((obj) => {
          if (
            obj.isMesh &&
            (obj.name === "Floor2.002" || obj.name.includes("Floor2"))
          ) {
            allFloors.push(obj);
          }
        });

        // Get intersections
        const intersects = raycaster.intersectObjects(allFloors, false);

        console.log(`Found ${intersects.length} intersections with floors`);

        if (intersects.length > 0) {
          // Sort intersections by distance (closest first)
          intersects.sort((a, b) => a.distance - b.distance);

          // Get top intersection
          const topIntersection = intersects[0];
          const exactPoint = topIntersection.point.clone();

          // Add offset to prevent z-fighting
          exactPoint.y += 0.1;

          // Debug the intersection point
          addDebugPoint(exactPoint, 0xff0000); // Red for final placement

          console.log("Exact intersection point:", exactPoint);
          console.log("Intersection object:", topIntersection.object.name);

          // Place candle
          placeCandleAtPoint(exactPoint);
        } else {
          console.warn("No intersection found with Floor2.002");
          // Use original point as fallback
          point.y += 0.1;
          placeCandleAtPoint(point);
        }
      } else {
        // For regular floor, use the original point with a small y-offset
        point.y += 0.1; // Slightly larger offset to prevent clipping
        placeCandleAtPoint(point);
      }
    },
    [candleCount, candle, scene, gltf]
  );

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

  // Remove the previous instanced mesh effect since we're using a different approach

  // Optional: Add this effect to clean up candles when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any added candles when component unmounts
      scene.children.forEach((child) => {
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
    </>
  );
}

// Preload both models
useGLTF.preload("/altar80.glb");
useGLTF.preload("/XCandle1.glb");

export default Model;
