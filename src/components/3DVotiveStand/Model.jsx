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
import FloatingCandleViewer from "./CandleInteraction";
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

// Configure draco loader for useGLTF
useGLTF.preload("/altar80.glb");
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
// Set up GLTFLoader to use Draco compression
GLTFLoader.prototype.setDRACOLoader(dracoLoader);

// Default profile image to use when user has no image
const DEFAULT_PROFILE_IMAGE = "/default-profile.jpg";

// Toggle visibility based on 80s mode
// useEffect(() => {
//   if (groupRef.current) {
//     groupRef.current.visible = is80sMode;
//   }
// }, [is80sMode]);

// Use useFrame to update the sun's position relative to the camera

// Add Annotation component using Text instead of Html
function Annotation({
  children,
  position,
  scale = 1,
  isHighlighted = false,
  message = "",
  imageUrl = null,
  onAnnotationClick,
  showFloatingViewer = false,
}) {
  const [texture, setTexture] = useState(null);
  const [isLoading, setIsLoading] = useState(!!imageUrl);
  const [isHovered, setIsHovered] = useState(false);
  const { camera } = useThree();
  const groupRef = useRef();
  const circleRef = useRef();
  const borderRef = useRef();

  // Billboard effect - make the annotation always face the camera
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);

      // Animate scale on hover
      if (circleRef.current && borderRef.current) {
        // Target scale based on hover state
        const targetScale = isHovered ? 2.5 : 1.0;

        // Smooth animation using lerp (linear interpolation)
        circleRef.current.scale.x = THREE.MathUtils.lerp(
          circleRef.current.scale.x,
          targetScale,
          0.1
        );
        circleRef.current.scale.y = THREE.MathUtils.lerp(
          circleRef.current.scale.y,
          targetScale,
          0.1
        );

        // Also scale the border
        borderRef.current.scale.x = THREE.MathUtils.lerp(
          borderRef.current.scale.x,
          targetScale,
          0.1
        );
        borderRef.current.scale.y = THREE.MathUtils.lerp(
          borderRef.current.scale.y,
          targetScale,
          0.1
        );
      }
    }
  });

  // Handle click on the annotation
  const handleClick = (event) => {
    // Prevent the event from bubbling up to parent elements
    event.stopPropagation();

    // Prevent the default behavior
    if (event.nativeEvent) {
      event.nativeEvent.preventDefault();
    }

    if (showFloatingViewer) return;

    console.log("Annotation clicked:", children);

    // Call the onAnnotationClick callback if provided
    if (onAnnotationClick) {
      onAnnotationClick(event);
    }
  };

  // Handle pointer events for hover effect
  const handlePointerOver = (event) => {
    event.stopPropagation();
    setIsHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handlePointerOut = (event) => {
    event.stopPropagation();
    setIsHovered(false);
    document.body.style.cursor = "auto";
  };

  // Load user image texture
  useEffect(() => {
    if (!imageUrl) {
      console.log("No image URL provided for annotation:", children);
      return;
    }

    console.log("Loading image for annotation:", children, "URL:", imageUrl);
    const textureLoader = new THREE.TextureLoader();
    setIsLoading(true);

    // Set maximum texture size (use 512 for better quality, 256 for performance)
    const MAX_TEXTURE_SIZE = 256;

    textureLoader.load(
      imageUrl,
      (loadedTexture) => {
        console.log("Successfully loaded image for:", children);
        loadedTexture.encoding = THREE.sRGBEncoding;

        // Limit texture resolution
        if (loadedTexture.image) {
          // Get original dimensions
          const width = loadedTexture.image.width;
          const height = loadedTexture.image.height;

          // Skip resizing if the image is already smaller than our maximum
          if (width > MAX_TEXTURE_SIZE || height > MAX_TEXTURE_SIZE) {
            // Create a canvas to resize the image
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            // Calculate new dimensions (maintain aspect ratio)
            let newWidth, newHeight;
            if (width > height) {
              newWidth = MAX_TEXTURE_SIZE;
              newHeight = Math.floor(height * (MAX_TEXTURE_SIZE / width));
            } else {
              newHeight = MAX_TEXTURE_SIZE;
              newWidth = Math.floor(width * (MAX_TEXTURE_SIZE / height));
            }

            // Set canvas size and draw resized image
            canvas.width = newWidth;
            canvas.height = newHeight;
            ctx.drawImage(loadedTexture.image, 0, 0, newWidth, newHeight);

            // Create new texture from canvas
            const resizedTexture = new THREE.Texture(canvas);
            resizedTexture.encoding = loadedTexture.encoding;
            resizedTexture.needsUpdate = true;

            // Use the resized texture
            setTexture(resizedTexture);
            console.log(
              `Resized annotation texture from ${width}x${height} to ${newWidth}x${newHeight}`
            );
          } else {
            // Use original texture if already small enough
            setTexture(loadedTexture);
          }
        } else {
          // Fallback if image data isn't available
          setTexture(loadedTexture);
        }

        setIsLoading(false);
      },
      undefined,
      (error) => {
        console.warn(
          "Error loading annotation image:",
          error,
          "for user:",
          children
        );
        setIsLoading(false);

        // Load default image on error
        textureLoader.load(DEFAULT_PROFILE_IMAGE, (defaultTexture) => {
          console.log("Loaded default image for:", children);
          defaultTexture.encoding = THREE.sRGBEncoding;
          setTexture(defaultTexture);
        });
      }
    );

    return () => {
      if (texture) texture.dispose();
    };
  }, [imageUrl, children]);

  // When highlighted, show text with username only
  if (isHighlighted) {
    return (
      <group
        ref={groupRef}
        position={position}
        userData={{ isAnnotation: true }}
      >
        {/* Username text */}
        <Text
          position={[0, 1.75, 0]}
          fontSize={0.35 * scale}
          color="#ffcc00"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.03}
          outlineColor="#000000"
          renderOrder={1000}
          depthTest={true}
          fillOpacity={1}
          strokeOpacity={1}
          userData={{ isAnnotation: true }}
        >
          {children}
        </Text>
      </group>
    );
  }

  // When not highlighted, show circular user image with pointer events
  return (
    <group
      ref={groupRef}
      position={[position.x, position.y + 2, position.z]}
      userData={{ isAnnotation: true, clickable: true }}
      onPointerDown={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Circular background for the image */}
      <mesh
        ref={circleRef}
        renderOrder={1000}
        userData={{ isAnnotation: true, clickable: true }}
        onPointerDown={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <circleGeometry args={[0.2 * scale, 32]} />
        <meshBasicMaterial
          color={isLoading ? "#333333" : "#ffffff"}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
          depthTest={true}
          map={texture}
        >
          {texture && <primitive attach="map" object={texture} />}
        </meshBasicMaterial>
      </mesh>

      {/* Circle border */}
      <mesh
        ref={borderRef}
        position={[0, 0, -0.001]}
        renderOrder={999}
        userData={{ isAnnotation: true, clickable: true }}
        onPointerDown={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <ringGeometry args={[0.2 * scale, 0.22 * scale, 32]} />
        <meshBasicMaterial
          color="#ffcc00"
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthTest={true}
        />
      </mesh>
    </group>
  );
}

function Model({
  scale,
  modelRef,
  rotation,
  showFloatingViewer,
  setShowFloatingViewer,
  onCandleSelect,
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
}) {
  // STATE VARIABLES - consolidated in one place
  const [modelUrl, setModelUrl] = useState("/altar80.glb");
  const { progress } = useProgress();
  const gltf = useGLTF(modelUrl, true);
  const { camera, scene } = useThree();
  const results = useFirestoreResults();
  const [xCandleModel, setXCandleModel] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [showLightHelper, setShowLightHelper] = useState(false);
  const [lightPosition, setLightPosition] = useState({ x: 32, y: 33, z: 89 });
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [skyColor, setSkyColor] = useState(0x7300ff);
  const [groundColor, setGroundColor] = useState(0xff0000);
  const [hasHandledFirstClick, setHasHandledFirstClick] = useState(false);
  const [highlightedXCandle, setHighlightedXCandle] = useState(null);
  const [candles, setCandles] = useState([]);
  const [placementMode, setPlacementMode] = useState(false);
  const [pendingCandleData, setPendingCandleData] = useState(null);

  // REFS - consolidated in one place
  const hemiLightRef = useRef();
  const ambientLightRef = useRef();
  const boundingBoxRef = useRef(new THREE.Box3());
  const textureLoader = useRef(new THREE.TextureLoader());
  const workerRef = useRef(null);
  const lightHelperRef = useRef();
  const lightMarkerRef = useRef();
  const meltingStateRef = useRef(new Map());
  const meltedCandlesRef = useRef(new Set());
  const prevResultsRef = useRef([]);
  const xCandleInstances = useRef(new Map());
  const textureCache = useRef(new Map());
  const instancedXCandleRef = useRef();
  const instancedXFlameRef = useRef();
  const instanceMatrix = useRef(new THREE.Matrix4());
  const prevSizesRef = useRef({ instances: 0, candles: 0 });
  const loadUserCandlesRef = useRef(null);

  // CONSTANTS
  const DEFAULT_IMAGES = [
    "/Triumph.jpg",
    "/vsClown.jpg",
    "/vsZombie.jpg",
    "/vsSkeleton.jpg",
  ];

  // Helper Functions
  const findCandleComponent = (parent, type) => {
    // Your existing code...
  };

  const resetCandle = (candle) => {
    // Your existing code...
  };

  // CALLBACKS - organized in dependency order

  // 1. togglePlacementMode - no other function dependencies
  const togglePlacementMode = useCallback(
    (userData) => {
      if (placementMode) {
        // Cancel placement mode
        setPlacementMode(false);
        setPendingCandleData(null);
      } else {
        // Start placement mode with the given user data
        setPlacementMode(true);
        setPendingCandleData(userData);
      }
    },
    [placementMode]
  );

  // 2. unloadUnusedTextures - depends on scene only
  const unloadUnusedTextures = useCallback(() => {
    // Track active textures
    const activeTextures = new Set();

    // First identify which textures are actually in use
    scene.traverse((object) => {
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((mat) => {
            if (mat.map) activeTextures.add(mat.map.uuid);
            if (mat.normalMap) activeTextures.add(mat.normalMap.uuid);
            if (mat.aoMap) activeTextures.add(mat.aoMap.uuid);
            // Add other map types if necessary
          });
        } else if (object.material.map) {
          activeTextures.add(object.material.map.uuid);
          if (object.material.normalMap)
            activeTextures.add(object.material.normalMap.uuid);
          if (object.material.aoMap)
            activeTextures.add(object.material.aoMap.uuid);
        }
      }
    });

    // Dispose unused textures from cache
    let disposedCount = 0;
    textureCache.current.forEach((texture, url) => {
      // Keep textures that are either active or very recently loaded (within last 5 seconds)
      const isRecent =
        texture.userData?.loadTime &&
        Date.now() - texture.userData.loadTime < 5000;

      if (!activeTextures.has(texture.uuid) && !isRecent) {
        texture.dispose();
        textureCache.current.delete(url);
        disposedCount++;
      }
    });

    if (disposedCount > 0) {
      console.log(`Memory cleanup: Unloaded ${disposedCount} unused textures`);
    }

    // Force garbage collection (indirect)
    setTimeout(() => {
      const tempArray = [];
      for (let i = 0; i < 1000; i++) {
        tempArray.push(new Array(1000));
      }
      tempArray.length = 0;
    }, 100);
  }, [scene]);

  // 3. loadTextureWithResize - no direct dependencies
  const loadTextureWithResize = useCallback((imageUrl, maxSize = 128) => {
    // Reduced from 256 to 128
    return new Promise((resolve, reject) => {
      // Check cache first
      if (textureCache.current.has(imageUrl)) {
        console.log("Using cached texture for:", imageUrl);
        resolve(textureCache.current.get(imageUrl));
        return;
      }

      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(
        imageUrl,
        (texture) => {
          texture.encoding = THREE.sRGBEncoding;
          texture.flipY = false;

          // Track when this texture was loaded
          texture.userData = { ...texture.userData, loadTime: Date.now() };

          // Power of two textures are more efficient
          const makePowerOfTwo = (size) => {
            return Math.pow(2, Math.floor(Math.log(size) / Math.log(2)));
          };

          // Limit texture resolution
          if (texture.image) {
            const width = texture.image.width;
            const height = texture.image.height;

            if (width > maxSize || height > maxSize) {
              // Create a canvas to resize the image
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");

              // Calculate new dimensions (maintain aspect ratio and use power of two)
              let newWidth, newHeight;
              if (width > height) {
                newWidth = makePowerOfTwo(Math.min(maxSize, width));
                newHeight = makePowerOfTwo(
                  Math.floor(height * (newWidth / width))
                );
              } else {
                newHeight = makePowerOfTwo(Math.min(maxSize, height));
                newWidth = makePowerOfTwo(
                  Math.floor(width * (newHeight / height))
                );
              }

              // Set canvas size and draw resized image
              canvas.width = newWidth;
              canvas.height = newHeight;
              ctx.drawImage(texture.image, 0, 0, newWidth, newHeight);

              // Create new texture from canvas
              const resizedTexture = new THREE.Texture(canvas);
              resizedTexture.encoding = texture.encoding;
              resizedTexture.flipY = texture.flipY;
              resizedTexture.userData = texture.userData;
              resizedTexture.needsUpdate = true;

              // Use more aggressive compression for these textures
              resizedTexture.generateMipmaps = false; // Disable mipmaps to save memory
              resizedTexture.minFilter = THREE.LinearFilter; // Use linear filtering without mipmaps
              resizedTexture.magFilter = THREE.LinearFilter;

              // Store in cache
              textureCache.current.set(imageUrl, resizedTexture);
              console.log(
                `Resized and cached texture: ${width}x${height} → ${newWidth}x${newHeight}`
              );
              resolve(resizedTexture);
            } else {
              // Even for small textures, optimize settings
              texture.generateMipmaps = false;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;

              // Cache and return original if already small enough
              textureCache.current.set(imageUrl, texture);
              resolve(texture);
            }
          } else {
            // Cache and return texture if no image data
            textureCache.current.set(imageUrl, texture);
            resolve(texture);
          }
        },
        undefined,
        (error) => {
          console.warn("Texture load error:", error);
          reject(error);
        }
      );
    });
  }, []);

  // 4. applyUserImageToLabels - depends on loadTextureWithResize
  const applyUserImageToLabels = useCallback(
    (candle, imageUrl) => {
      if (!imageUrl) return;

      const labels = candle.children.filter(
        (child) =>
          child.name.includes("Label1") || child.name.includes("Label2")
      );

      if (labels.length === 0) return;

      loadTextureWithResize(imageUrl)
        .then((texture) => {
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
        })
        .catch((error) => console.warn("🚨 Texture load error:", error));
    },
    [loadTextureWithResize]
  );

  // 5. checkValidPlacement - depends on candles
  const checkValidPlacement = useCallback(
    (point) => {
      // Your existing code...
    },
    [candles]
  );

  // 6. addCandleInstance - depends on instanced refs and setCandles
  const addCandleInstance = useCallback(
    (position, userData) => {
      // Your existing code...
    },
    [instancedXCandleRef, instancedXFlameRef, setCandles]
  );

  // 7. saveCandlePosition - depends on setCandles
  const saveCandlePosition = useCallback(
    async (candleId, position, userData) => {
      // Your existing code...
    },
    [setCandles]
  );

  // 8. handlePlacementClick - depends on multiple functions
  const handlePlacementClick = useCallback(
    (event) => {
      // Your existing code...
    },
    [
      placementMode,
      pendingCandleData,
      scene,
      checkValidPlacement,
      addCandleInstance,
      saveCandlePosition,
    ]
  );

  // 9. handleClick - main click handler
  const handleClick = useCallback(
    (event) => {
      // Your existing code...
    },
    [
      placementMode,
      pendingCandleData,
      handlePlacementClick,
      checkValidPlacement,
    ]
  );

  // 10. loadUserCandles - depends on instancedXCandleRef
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

      // If we have fewer than 80 candles, generate some placeholder candles
      const placeholderCount = Math.max(0, 80 - allCandles.length);
      if (placeholderCount > 0) {
        console.log(`Adding ${placeholderCount} placeholder candles`);

        for (let i = 0; i < placeholderCount; i++) {
          // Create placeholder candles with random positions
          const randomPosition = new THREE.Vector3(
            (Math.random() - 0.5) * 20,
            0,
            (Math.random() - 0.5) * 20
          );

          const placeholderCandle = {
            id: `placeholder_${i}`,
            position: randomPosition,
            userData: {
              userName: `Visitor ${i + 1}`,
              image: DEFAULT_IMAGES[i % DEFAULT_IMAGES.length],
              message: "This is a placeholder candle",
              burnedAmount: 1 + Math.random() * 2,
              createdAt: new Date(Date.now() - i * 3600000),
            },
            createdAt: new Date(Date.now() - i * 3600000),
          };

          allCandles.push(placeholderCandle);
        }
      }

      // Sort all candles by importance
      const sortedCandles = allCandles
        .slice(0, 80)
        .sort((a, b) => b.userData.burnedAmount - a.userData.burnedAmount);

      // Process in batches with progress updates
      const totalBatches = Math.ceil(sortedCandles.length / 10);

      const processBatch = (batchIndex) => {
        const startIndex = batchIndex * 10;
        const endIndex = Math.min(startIndex + 10, sortedCandles.length);
        const batch = sortedCandles.slice(startIndex, endIndex);

        console.log(
          `Processing batch ${batchIndex + 1}/${totalBatches}: ${
            batch.length
          } candles`
        );

        // Actually process each candle in the batch
        batch.forEach((candle, i) => {
          const instanceIndex = startIndex + i;
          if (instanceIndex >= instancedXCandleRef.current.count) {
            console.warn(`Ran out of instance slots at index ${instanceIndex}`);
            return;
          }

          // Create the matrix for positioning
          const matrix = new THREE.Matrix4();
          matrix.setPosition(
            candle.position.x,
            candle.position.y,
            candle.position.z
          );

          // Apply scale based on burnedAmount
          const scale = candle.userData.burnedAmount
            ? 0.8 + Math.min(candle.userData.burnedAmount / 10, 0.5)
            : 1.0;
          matrix.scale(new THREE.Vector3(scale, scale, scale));

          // Set the instance matrix
          instancedXCandleRef.current.setMatrixAt(instanceIndex, matrix);

          // Also position the flame if available
          if (instancedXFlameRef.current) {
            const flameMatrix = matrix.clone();
            flameMatrix.multiply(
              new THREE.Matrix4().setPosition(0, 0.5 * scale, 0)
            );
            instancedXFlameRef.current.setMatrixAt(instanceIndex, flameMatrix);
          }

          // Store instance index for reference
          candle.instanceIndex = instanceIndex;
        });

        // Update instance matrices
        instancedXCandleRef.current.instanceMatrix.needsUpdate = true;
        if (instancedXFlameRef.current) {
          instancedXFlameRef.current.instanceMatrix.needsUpdate = true;
        }

        // Add this batch to the candles state
        setCandles((prev) => [...prev, ...batch]);

        // Update progress
        const progress = Math.min(
          100,
          Math.round(((batchIndex + 1) * 100) / totalBatches)
        );
        setLoadingProgress(progress);

        // Process next batch
        if (endIndex < sortedCandles.length) {
          setTimeout(() => processBatch(batchIndex + 1), 16);
        } else {
          console.log("All candles loaded successfully");
        }
      };

      // Start with the first batch
      processBatch(0);
    } catch (error) {
      console.error("Error loading user candles:", error);
    }
  }, [instancedXCandleRef, setCandles, DEFAULT_IMAGES]);

  // 11. setupInstancedCandles - now depends on loadUserCandlesRef
  const setupInstancedCandles = useCallback(
    (xCandleModel, count) => {
      console.log("Starting setupInstancedCandles");

      if (!xCandleModel) {
        console.error("Cannot set up instanced candles - missing xCandleModel");
        return;
      }

      if (!modelRef.current) {
        console.error(
          "Cannot set up instanced candles - missing modelRef.current"
        );
        return;
      }

      try {
        console.log(`Setting up ${count} instanced candles`);

        // Extract and clone materials once
        const materials = new Map();

        xCandleModel.traverse((child) => {
          if (child.isMesh && child.material) {
            const materialName = child.name || "default";
            if (!materials.has(materialName)) {
              // Clone the material and store it
              const clonedMaterial = child.material.clone();
              materials.set(materialName, clonedMaterial);

              // If material has textures, ensure they're cached
              if (clonedMaterial.map) {
                textureCache.current.set(
                  `${materialName}_map`,
                  clonedMaterial.map
                );
              }
            }
          }
        });

        // Find candle and flame meshes
        let candleMesh = null;
        let flameMesh = null;

        xCandleModel.traverse((child) => {
          if (child.isMesh) {
            if (
              child.name.includes("Candle") &&
              !child.name.includes("Flame")
            ) {
              candleMesh = child;
            } else if (child.name.includes("Flame")) {
              flameMesh = child;
            }
          }
        });

        if (!candleMesh) {
          console.error("No candle mesh found in model");
          return;
        }

        // Use the shared materials
        const candleMaterial =
          materials.get(candleMesh.name) || materials.get("default");
        const flameMaterial =
          flameMesh &&
          (materials.get(flameMesh.name) || materials.get("default"));

        // Create instanced meshes
        const instancedCandle = new THREE.InstancedMesh(
          candleMesh.geometry,
          candleMaterial,
          count
        );
        instancedCandle.name = "SharedMaterialCandles";
        instancedCandle.frustumCulled = true;

        let instancedFlame = null;
        if (flameMesh) {
          instancedFlame = new THREE.InstancedMesh(
            flameMesh.geometry,
            flameMaterial,
            count
          );
          instancedFlame.name = "SharedMaterialFlames";
          instancedFlame.frustumCulled = true;
        }

        // Initialize all instances as invisible
        const matrix = new THREE.Matrix4();
        matrix.makeScale(0, 0, 0);

        for (let i = 0; i < count; i++) {
          instancedCandle.setMatrixAt(i, matrix);
          if (instancedFlame) instancedFlame.setMatrixAt(i, matrix);
        }

        instancedCandle.instanceMatrix.needsUpdate = true;
        if (instancedFlame) instancedFlame.instanceMatrix.needsUpdate = true;

        // Add to scene
        modelRef.current.add(instancedCandle);
        if (instancedFlame) modelRef.current.add(instancedFlame);

        // Store references
        instancedXCandleRef.current = instancedCandle;
        instancedXFlameRef.current = instancedFlame;

        console.log("✅ Created instanced candles with shared materials");

        // Immediately load candles after setup
        setTimeout(() => {
          if (instancedXCandleRef.current) {
            console.log("Triggering loadUserCandles after setup");
            if (loadUserCandlesRef.current) {
              loadUserCandlesRef.current();
            } else {
              console.error("loadUserCandlesRef.current is null!");
            }
          } else {
            console.error("instancedXCandleRef.current is null!");
          }
        }, 500);
      } catch (error) {
        console.error("Error in setupInstancedCandles:", error);
      }
    },
    [modelRef]
  );

  // 12. getAnnotationDetailLevel - useful helper
  const getAnnotationDetailLevel = useCallback(
    (position) => {
      if (!camera) return "none";

      const distanceToCamera = camera.position.distanceTo(position);

      if (distanceToCamera < 10) {
        return "high"; // Close - show all details
      } else if (distanceToCamera < 30) {
        return "medium"; // Medium - show simplified details
      } else {
        return "low"; // Far - show minimal or no details
      }
    },
    [camera]
  );

  // 13. analyzeTextureMemory - utility function
  const analyzeTextureMemory = useCallback(() => {
    const textureMap = new Map();
    const totalSize = { value: 0 };

    // Helper to estimate texture size
    const getTextureSize = (texture) => {
      if (!texture || !texture.image) return 0;
      const { width = 0, height = 0 } = texture.image;
      // Estimate: 4 bytes per pixel (RGBA)
      return width * height * 4;
    };

    // Collect all textures in scene
    scene.traverse((object) => {
      if (!object.material) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material) return;

        // Check all texture maps
        [
          "map",
          "normalMap",
          "aoMap",
          "roughnessMap",
          "metalnessMap",
          "emissiveMap",
        ].forEach((mapType) => {
          const texture = material[mapType];
          if (!texture) return;

          const size = getTextureSize(texture);
          totalSize.value += size;

          // Group by image source or texture id
          const key = texture.image?.src || texture.uuid;
          if (!textureMap.has(key)) {
            textureMap.set(key, {
              count: 0,
              size,
              dimensions: texture.image
                ? `${texture.image.width}x${texture.image.height}`
                : "unknown",
              texture,
            });
          }

          const info = textureMap.get(key);
          info.count++;
        });
      });
    });

    // Analyze cache as well
    textureCache.current.forEach((texture, url) => {
      const size = getTextureSize(texture);

      // Only count if not already counted from scene traversal
      const key = texture.image?.src || texture.uuid;
      if (!textureMap.has(key)) {
        textureMap.set(key, {
          count: 0,
          size,
          dimensions: texture.image
            ? `${texture.image.width}x${texture.image.height}`
            : "unknown",
          texture,
          cached: true,
        });
      }
    });

    // Log results
    console.log("===== TEXTURE MEMORY ANALYSIS =====");
    console.log(`Total textures: ${textureMap.size} unique textures`);
    console.log(
      `Estimated texture memory: ${(totalSize.value / (1024 * 1024)).toFixed(
        2
      )} MB`
    );

    // Sort by size (largest first)
    const sortedTextures = Array.from(textureMap.entries()).sort(
      (a, b) => b[1].size - a[1].size
    );

    console.log("\nLargest Textures:");
    sortedTextures.slice(0, 10).forEach(([key, info], index) => {
      console.log(
        `${index + 1}. ${key.substring(0, 30)}...: ` +
          `${(info.size / (1024 * 1024)).toFixed(2)} MB, ` +
          `${info.dimensions}, used ${info.count} times, ` +
          `${info.cached ? "cached" : "in scene"}`
      );
    });

    console.log("===================================");

    return { textureCount: textureMap.size, totalSize: totalSize.value };
  }, [scene]);

  // EFFECTS - Store the loadUserCandles reference
  useEffect(() => {
    loadUserCandlesRef.current = loadUserCandles;
  }, [loadUserCandles]);

  // Effect to expose togglePlacementMode to the parent via modelRef
  useEffect(() => {
    if (modelRef.current) {
      console.log(
        "modelRef.current.hasInitialized:",
        modelRef.current.hasInitialized || false
      );

      if (!modelRef.current.hasInitialized) {
        // Mark that we've initialized to avoid repeating this
        modelRef.current.hasInitialized = true;

        // Expose needed functions to the parent via the ref
        modelRef.current.togglePlacementMode = togglePlacementMode;

        // Log once
        console.log("Exposed togglePlacementMode to modelRef");
      }
    } else {
      console.error("modelRef.current is null in initialization effect");
    }
  }, [togglePlacementMode, modelRef]);

  // Effect for logging changes to collection sizes
  useEffect(() => {
    // Only log if something has actually changed
    const currentInstanceSize = xCandleInstances.current.size;
    const currentCandlesSize = candles.length;

    if (
      currentInstanceSize !== prevSizesRef.current.instances ||
      currentCandlesSize !== prevSizesRef.current.candles
    ) {
      // Only log when there's a change
      console.log("xCandleInstances map size:", currentInstanceSize);
      console.log("Candles array size:", currentCandlesSize);

      // Update the ref
      prevSizesRef.current = {
        instances: currentInstanceSize,
        candles: currentCandlesSize,
      };
    }
  }, [candles, xCandleInstances.current.size]);

  // Effect to call loadUserCandles when instancedXCandleRef is ready
  useEffect(() => {
    if (instancedXCandleRef.current) {
      loadUserCandles();
    }
  }, [instancedXCandleRef.current, loadUserCandles]);

  // Effect to initialize instanced candles when xCandleModel is loaded
  useEffect(() => {
    console.log("xCandleModel status:", xCandleModel ? "loaded" : "not loaded");

    if (xCandleModel) {
      console.log("Calling setupInstancedCandles with xCandleModel");
      // Initialize with space for 50 instances
      setupInstancedCandles(xCandleModel, 50);
    }
  }, [xCandleModel, setupInstancedCandles]);

  // Additional effects (your existing code)
  // ...

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

  // Add this as a last useEffect
  useEffect(() => {
    if (gltf && gltf.scene && isModelLoaded) {
      console.log("=== MODEL STATUS ===");
      console.log("Model loaded:", isModelLoaded);
      console.log(
        "Model position:",
        modelRef.current?.position.x.toFixed(2),
        modelRef.current?.position.y.toFixed(2),
        modelRef.current?.position.z.toFixed(2)
      );
      console.log("Model scale:", scale);
      console.log(
        "Light position:",
        lightPosition.x,
        lightPosition.y,
        lightPosition.z
      );
      console.log("Light intensity:", parentLightIntensity || lightIntensity);

      // Get bounding box
      const bbox = new THREE.Box3().setFromObject(modelRef.current);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      console.log(
        "Model dimensions:",
        size.x.toFixed(2),
        size.y.toFixed(2),
        size.z.toFixed(2)
      );
    }
  }, [
    gltf,
    isModelLoaded,
    scale,
    lightPosition,
    lightIntensity,
    parentLightIntensity,
  ]);

  // RETURN STATEMENT - cleaned up
  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={[scale, scale, scale]}
        rotation={rotation}
        onClick={handleClick}
        style={{
          pointerEvents: showFloatingViewer ? "none" : "auto",
        }}
      />

      {/* Add annotations for fixed XCandles */}
      {xCandleInstances.current.size > 0 &&
        Array.from(xCandleInstances.current.entries()).map(
          ([index, xCandle]) => {
            // Skip rendering annotations for fully melted candles
            if (meltedCandlesRef.current.has(xCandle.name)) {
              return null;
            }

            // Get position for annotation from the candle
            const position = new THREE.Vector3();
            xCandle.getWorldPosition(position);
            // Position annotation above candle
            position.y += 2;

            const userData = xCandle.userData || {};
            const userName = userData.userName || "Anonymous";
            const imageUrl = userData.image || null;
            const isHighlighted = highlightedXCandle === xCandle.name;

            return (
              <Annotation
                key={`xcandle-${index}`}
                position={position}
                scale={1.0}
                isHighlighted={isHighlighted}
                imageUrl={imageUrl}
                onAnnotationClick={() => {
                  setHighlightedXCandle(isHighlighted ? null : xCandle.name);
                  if (onCandleSelect) {
                    onCandleSelect({
                      ...userData,
                      candleId: xCandle.name,
                      candleTimestamp: Date.now(),
                    });
                  }
                }}
                showFloatingViewer={showFloatingViewer}
              >
                {userName}
              </Annotation>
            );
          }
        )}

      {/* Add annotations for instanced candles */}
      {candles.length > 0 &&
        candles.map((candle, idx) => {
          // Skip if this candle has no position data
          if (!candle.position) return null;

          const detailLevel = getAnnotationDetailLevel(candle.position);

          // Skip very distant annotations
          if (detailLevel === "none") return null;

          return (
            <Annotation
              key={`instance-${candle.id}`}
              position={
                new THREE.Vector3(
                  candle.position.x,
                  candle.position.y + 2,
                  candle.position.z
                )
              }
              scale={1.0}
              isHighlighted={highlightedXCandle === candle.id}
              imageUrl={detailLevel !== "low" ? candle.userData.image : null}
              onAnnotationClick={() => {
                setHighlightedXCandle(
                  highlightedXCandle === candle.id ? null : candle.id
                );
                if (onCandleSelect) {
                  onCandleSelect({
                    ...candle.userData,
                    candleId: candle.id,
                    candleTimestamp: Date.now(),
                  });
                }
              }}
              showFloatingViewer={showFloatingViewer}
            >
              {candle.userData.userName || "Anonymous"}
            </Annotation>
          );
        })}

      <DarkClouds />
    </>
  );
}

// Preload both models
useGLTF.preload("/altar80.glb");
useGLTF.preload("/XCandle1.glb");

export default Model;
