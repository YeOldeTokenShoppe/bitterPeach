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

// Configure draco loader for useGLTF
useGLTF.preload("/altarBoomboxCandles.glb");
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

    textureLoader.load(
      imageUrl,
      (loadedTexture) => {
        console.log("Successfully loaded image for:", children);
        loadedTexture.encoding = THREE.sRGBEncoding;
        setTexture(loadedTexture);
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
  onLightPositionChange,
  lightIntensity: parentLightIntensity,
  skyColor: parentSkyColor,
  groundColor: parentGroundColor,
  showLightHelper: parentShowLightHelper,
  is80sMode,
  showSpotify,
  onBoomboxClick,
  monsterMode,
}) {
  const [modelUrl, setModelUrl] = useState("/altarBoomboxCandles.glb"); // Update default fallback
  const { progress } = useProgress(); // Track loading progress
  const gltf = useGLTF(modelUrl, true); // Enable caching
  const { camera, scene } = useThree();
  const results = useFirestoreResults();
  const hemiLightRef = useRef();
  const ambientLightRef = useRef();
  const boundingBoxRef = useRef(new THREE.Box3());
  const textureLoader = useRef(new THREE.TextureLoader());
  const [processedData, setProcessedData] = useState(null);
  const workerRef = useRef(null);
  const lightHelperRef = useRef();
  const lightMarkerRef = useRef();
  const boomboxRef = useRef();
  const meltingStateRef = useRef(new Map());
  const meltedCandlesRef = useRef(new Set());

  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [showLightHelper, setShowLightHelper] = useState(false); // Control visibility of helper - set to false
  const [lightPosition, setLightPosition] = useState({ x: 32, y: 33, z: 89 }); // Store light position
  const [lightIntensity, setLightIntensity] = useState(1.2); // Store light intensity
  const [skyColor, setSkyColor] = useState(0x7300ff); // Store sky color (top)
  const [groundColor, setGroundColor] = useState(0xff0000); // Store ground color (bottom)

  /** 🛑 Prevent unnecessary re-renders by storing previous results */
  const prevResultsRef = useRef([]);
  const DEFAULT_IMAGES = [
    "/Triumph.jpg",
    "/vsClown.jpg",
    "/vsZombie.jpg",
    "/vsSkeleton.jpg",
  ];

  const findCandleComponent = (parent, type) => {
    const candleNumber = parent.name.slice(-3);

    // Debug the search
    console.log(`Finding component ${type} for candle ${parent.name}`);
    console.log(
      "Available children:",
      parent.children.map((c) => c.name)
    );

    // More flexible matching function that accounts for the .XXX suffix
    const matchesComponent = (childName, componentType) => {
      switch (componentType) {
        case "FLAME":
          return childName.startsWith("FLAME");
        case "Label1":
          return childName.startsWith("Label1");
        case "Label2":
          return childName.startsWith("Label2");
        case "wax":
          return childName.startsWith("wax");
        case "glass":
          return childName.startsWith("glass");

        default:
          return false;
      }
    };

    const component = parent.children.find((child) =>
      matchesComponent(child.name, type)
    );
    console.log(`Found component for ${type}:`, component?.name || "none");
    return component;
  };

  // Log all mesh names in the model to help identify floor objects
  // useEffect(() => {
  //   if (gltf?.scene) {
  //     const ticker = scene.getObjectByName("Ticker");
  //     console.log("Ticker mesh:", ticker);

  //     if (ticker) {
  //       console.log("Ticker material before:", ticker.material);
  //     }
  // ticker.material = new THREE.MeshBasicMaterial({ color: "black" });

  // ticker.material.side = THREE.FrontsSide; // Render the inner side
  // ticker.material.wireframe = true;
  // console.log("Logging all mesh names in the model:");
  // const meshNames = [];
  // gltf.scene.traverse((child) => {
  //   if (child.isMesh) {
  //     meshNames.push(child.name);
  //   }
  // });
  // console.log("Mesh names:", meshNames);
  //   }
  // }, [gltf]);

  // Fetch model URL from Firebase Storage
  useEffect(() => {
    const fetchModelUrl = async () => {
      try {
        const modelRef = ref(storage, "models/altarBoomboxCandles.glb"); // Update Firebase path
        const downloadUrl = await getDownloadURL(modelRef);

        setModelUrl(downloadUrl);
      } catch (error) {
        console.error("Error fetching model from Firebase Storage:", error);
        console.log("Using local fallback model instead");
        // Keep using the fallback URL from public folder
      }
    };

    fetchModelUrl();
  }, []);

  // Update loading state based on model loading progress
  useEffect(() => {
    if (progress === 100 && setIsModelLoaded) {
      // Add a small delay to ensure everything is rendered
      const timer = setTimeout(() => {
        setIsModelLoaded(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [progress, setIsModelLoaded]);

  /** ✅ Compute bounding box and reposition model */
  useEffect(() => {
    if (!modelRef.current) return;

    boundingBoxRef.current.setFromObject(modelRef.current);
    const center = new THREE.Vector3();
    boundingBoxRef.current.getCenter(center);
    modelRef.current.position.sub(center);
    setModelCenter(center);
  }, [gltf.scene]);

  // Update light position and notify parent component
  const updateLightPosition = (axis, value) => {
    const newPosition = {
      ...lightPosition,
      [axis]: Number(value),
    };
    setLightPosition(newPosition);

    // Notify parent component about the change
    if (onLightPositionChange) {
      onLightPositionChange(newPosition);
    }
  };

  // Update light intensity
  const updateLightIntensity = (value) => {
    const intensity = Number(value);

    setLightIntensity(intensity);
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = intensity;
    }
  };

  // Update sky color (top color)
  const updateSkyColor = (hexColor) => {
    const color = parseInt(hexColor.replace("#", "0x"), 16);

    setSkyColor(color);
    if (hemiLightRef.current) {
      hemiLightRef.current.color.set(color);
    }
  };

  // Update ground color (bottom color)
  const updateGroundColor = (hexColor) => {
    const color = parseInt(hexColor.replace("#", "0x"), 16);

    setGroundColor(color);
    if (hemiLightRef.current) {
      hemiLightRef.current.groundColor.set(color);
    }
  };

  // Toggle light helper visibility
  const toggleLightHelper = () => {
    setShowLightHelper(!showLightHelper);
  };

  // Expose methods to parent component
  useEffect(() => {
    // Make these methods available to the parent component
    if (modelRef.current) {
      modelRef.current.updateLightPosition = updateLightPosition;
      modelRef.current.updateLightIntensity = updateLightIntensity;
      modelRef.current.updateSkyColor = updateSkyColor;
      modelRef.current.updateGroundColor = updateGroundColor;
      modelRef.current.toggleLightHelper = toggleLightHelper;
      modelRef.current.getLightPosition = () => lightPosition;
      modelRef.current.getLightIntensity = () => lightIntensity;
      modelRef.current.getSkyColor = () => skyColor;
      modelRef.current.getGroundColor = () => groundColor;
      modelRef.current.getShowLightHelper = () => showLightHelper;
    }
  }, [
    lightPosition,
    lightIntensity,
    skyColor,
    groundColor,
    showLightHelper,
    modelRef,
    updateLightPosition,
    toggleLightHelper,
  ]);

  // Update local state when parent props change
  useEffect(() => {
    if (parentLightIntensity !== undefined) {
      setLightIntensity(parentLightIntensity);
    }
  }, [parentLightIntensity, parentShowLightHelper]);

  // Update light when parent colors change
  useEffect(() => {
    if (hemiLightRef.current) {
      if (parentSkyColor) {
        const skyColorValue = parseInt(parentSkyColor.replace("#", "0x"), 16);

        hemiLightRef.current.color.set(skyColorValue);
      }

      if (parentGroundColor) {
        const groundColorValue = parseInt(
          parentGroundColor.replace("#", "0x"),
          16
        );

        hemiLightRef.current.groundColor.set(groundColorValue);
      }

      if (parentLightIntensity !== undefined) {
        hemiLightRef.current.intensity = parentLightIntensity;
      }

      // Update the helper if it exists
      if (lightHelperRef.current) {
        lightHelperRef.current.update();
      }
    }
  }, [parentSkyColor, parentGroundColor, parentLightIntensity]);

  /** 🌟 Add Lights */
  useEffect(() => {
    // Convert hex string colors to numbers if they're provided as strings
    let skyColorValue = skyColor;
    let groundColorValue = groundColor;

    if (parentSkyColor && typeof parentSkyColor === "string") {
      skyColorValue = parseInt(parentSkyColor.replace("#", "0x"), 16);
    }

    if (parentGroundColor && typeof parentGroundColor === "string") {
      groundColorValue = parseInt(parentGroundColor.replace("#", "0x"), 16);
    }

    const hemiLight = new THREE.HemisphereLight(
      skyColorValue,
      groundColorValue,
      parentLightIntensity !== undefined ? parentLightIntensity : lightIntensity
    );
    hemiLight.position.set(lightPosition.x, lightPosition.y, lightPosition.z);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Create a hemisphere light helper
    if (showLightHelper) {
      /* Comment out light helper for production
      const helper = new THREE.HemisphereLightHelper(hemiLight, 10, 0xffff00);
      scene.add(helper);
      lightHelperRef.current = helper;

      // Add a simple GUI to control light position
      const lightPositionMarker = new THREE.Mesh(
        new THREE.SphereGeometry(2, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
      );
      lightPositionMarker.position.copy(hemiLight.position);
      scene.add(lightPositionMarker);
      lightMarkerRef.current = lightPositionMarker;

      console.log("Light helper added at position:", hemiLight.position);
      */
    }

    // Update helper and marker when light position changes
    const updateHelperAndMarker = () => {
      /* Comment out light helper updates
      if (lightHelperRef.current) {
        lightHelperRef.current.update();
      }

      if (lightMarkerRef.current) {
        lightMarkerRef.current.position.copy(hemiLight.position);
      }
      */
    };

    // Set up an animation frame callback to update the helper
    const frameId = requestAnimationFrame(function animate() {
      updateHelperAndMarker();
      requestAnimationFrame(animate);
    });

    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // scene.add(ambientLight);

    return () => {
      cancelAnimationFrame(frameId);
      scene.remove(hemiLight);
      /* Comment out light helper cleanup
      if (lightHelperRef.current) {
        scene.remove(lightHelperRef.current);
      }
      if (lightMarkerRef.current) {
        scene.remove(lightMarkerRef.current);
      }
      */
      // scene.remove(ambientLight);
    };
  }, [
    scene,
    showLightHelper,
    lightPosition,
    lightIntensity,
    skyColor,
    groundColor,
    parentSkyColor,
    parentGroundColor,
    parentLightIntensity,
    parentShowLightHelper,
  ]);

  const [xCandleModel, setXCandleModel] = useState(null);
  const xCandleInstances = useRef(new Map()); // To track created instances
  const [hasHandledFirstClick, setHasHandledFirstClick] = useState(false);

  useEffect(() => {
    const loadXCandleModel = async () => {
      try {
        // Use GLTFLoader directly instead of useGLTF hook
        const loader = new GLTFLoader();
        // Set up DRACOLoader for this specific loader instance
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("/draco/");
        loader.setDRACOLoader(dracoLoader);

        // Load XCandle.glb using a promise-based approach
        const xCandleScene = await new Promise((resolve, reject) => {
          loader.load(
            "/XCandle1.glb",
            (gltf) => resolve(gltf.scene),
            undefined,
            (error) => reject(error)
          );
        });

        // Set a base scale for the model template
        xCandleScene.scale.set(0.5, 0.5, 0.5); // Adjust these values as needed

        // Store the scaled model
        setXCandleModel(xCandleScene.clone());
      } catch (error) {
        console.error("Error loading XCandle model:", error);
      }
    };

    loadXCandleModel();
  }, []);

  useEffect(() => {
    return () => {
      // Clean up all created XCandle instances
      xCandleInstances.current.forEach((instance) => {
        if (instance.parent) {
          instance.parent.remove(instance);
        }

        // Dispose geometries and materials
        instance.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      });

      xCandleInstances.current.clear();
    };
  }, []);
  useEffect(() => {
    if (results.length === 0 || !modelRef.current || !xCandleModel) return;

    const newMeltingState = new Map();

    // Store existing positions before cleanup
    const existingPositions = new Map();
    xCandleInstances.current.forEach((instance, key) => {
      existingPositions.set(instance.name, {
        position: instance.position.clone(),
        scale: instance.scale.clone(),
        userData: { ...instance.userData },
        meltingState: meltingStateRef.current.get(instance.name),
      });
    });
    // Cleanup any existing XCandle instances first
    xCandleInstances.current.forEach((instance) => {
      if (instance.parent) {
        instance.parent.remove(instance);
      }
    });
    xCandleInstances.current.clear();

    // Reset ALL candles to be invisible first
    modelRef.current.traverse((child) => {
      if (child.name.startsWith("VCANDLE")) {
        resetCandle(child);
      }
    });

    // Sort results by burnedAmount (descending) to get top burners
    const sortedByBurnedAmount = [...results].sort(
      (a, b) => b.burnedAmount - a.burnedAmount
    );

    // Sort results by createdAt (descending) to get most recent
    const sortedByCreatedAt = [...results].sort((a, b) => {
      // Handle different possible date formats
      const getDate = (timestamp) => {
        if (!timestamp) return new Date(0);
        if (timestamp.toDate) return timestamp.toDate(); // Firestore Timestamp
        if (timestamp instanceof Date) return timestamp; // JavaScript Date
        if (typeof timestamp === "number") return new Date(timestamp); // Unix timestamp
        if (typeof timestamp === "string") return new Date(timestamp); // ISO string
        return new Date(0); // fallback
      };

      const dateA = getDate(a.createdAt);
      const dateB = getDate(b.createdAt);
      return dateB - dateA;
    });

    // Get top 4 burners
    const topBurners = sortedByBurnedAmount.slice(0, 4);

    // Get next 4 most recent users, excluding those already in topBurners
    const recentUsers = sortedByCreatedAt
      .filter((user) => !topBurners.some((topUser) => topUser.id === user.id))
      .slice(0, 4);

    // Combine assignments for special positions
    const specialAssignments = new Map();

    // Assign top burners to VCANDLE001-004
    topBurners.forEach((user, index) => {
      const position = String(index + 1).padStart(3, "0");
      specialAssignments.set(`VCANDLE${position}`, user);
    });

    // Assign recent users to VCANDLE005-008
    recentUsers.forEach((user, index) => {
      const position = String(index + 5).padStart(3, "0");
      specialAssignments.set(`VCANDLE${position}`, user);
    });

    // Get remaining available indices (009-080)
    const remainingIndices = Array.from({ length: 72 }, (_, i) =>
      String(i + 9).padStart(3, "0")
    );

    // Get remaining users (not in special positions)
    const remainingUsers = results.filter(
      (user) =>
        ![...topBurners, ...recentUsers].some(
          (specialUser) => specialUser.id === user.id
        )
    );

    // Shuffle remaining positions for random assignment
    const shuffledIndices = remainingIndices.sort(() => Math.random() - 0.5);
    const userCandleIndices = shuffledIndices.slice(0, remainingUsers.length);

    // Process all candle assignments
    const processCandle = (candleName, result) => {
      const candle = modelRef.current.getObjectByName(candleName);
      if (!candle) return;

      // Extract the index from the candle name (e.g., "VCANDLE001" -> "001")
      const candleIndex = candleName.slice(-3);

      // Store the result data in userData for both types of candles
      candle.userData = {
        userName: result.userName || "Anonymous",
        image: result.image,
        message: result.message,
        burnedAmount: result.burnedAmount || 1,
        meltingProgress: 0,
        staked: result.staked !== false,
        createdAt: result.createdAt,
      };

      if (result.staked !== false) {
        if (result.image) applyUserImageToLabels(candle, result.image);
        candle.children.forEach((child) => {
          child.visible = true;
        });
      } else {
        // UNSTAKED CANDLE: Keep VCANDLE invisible, create XCandle
        if (xCandleModel) {
          // Create a new XCandle instance
          const xCandleInstance = xCandleModel.clone();

          // Set the name and ID for the instance
          const instanceId = "XCandle_" + candleIndex;
          xCandleInstance.name = instanceId;

          // Apply base scaling to the instance (adjust these values as needed)
          const baseScale = 1.5; // Base scale factor
          xCandleInstance.scale.set(baseScale, baseScale, baseScale);

          // Find the glass component to use for positioning
          const glassComponent = findCandleComponent(candle, "glass");

          if (glassComponent) {
            // Get the world position of the glass component
            const glassWorldPosition = new THREE.Vector3();
            glassComponent.getWorldPosition(glassWorldPosition);

            // Convert world position to local position relative to the model
            const glassLocalPosition = glassWorldPosition.clone();
            if (modelRef.current) {
              // Convert from world space to model's local space
              modelRef.current.worldToLocal(glassLocalPosition);
            }

            // Position the XCandle at the glass component's position
            xCandleInstance.position.copy(glassLocalPosition);

            // Apply a small vertical offset if needed to align the bottom of the XCandle with the altar
            // This value may need adjustment based on testing
            const verticalOffset = -0.5; // Small positive value to move up slightly
            xCandleInstance.position.y += verticalOffset;

            // Copy rotation from the glass component
            xCandleInstance.rotation.copy(glassComponent.rotation);

            // Get the bounding box of the glass component to determine its size
            const glassBoundingBox = new THREE.Box3().setFromObject(
              glassComponent
            );
            const glassSize = new THREE.Vector3();
            glassBoundingBox.getSize(glassSize);

            // Get the bounding box of the XCandle to determine its size
            const xCandleBoundingBox = new THREE.Box3().setFromObject(
              xCandleInstance
            );
            const xCandleSize = new THREE.Vector3();
            xCandleBoundingBox.getSize(xCandleSize);

            // Calculate scale factor to match the glass component's size
            // Only apply if the sizes are significantly different
            if (glassSize.length() > 0 && xCandleSize.length() > 0) {
              const scaleX = glassSize.x / xCandleSize.x;
              const scaleY = glassSize.y / xCandleSize.y;
              const scaleZ = glassSize.z / xCandleSize.z;

              // Use the average scale as a reference, but don't apply extreme scaling
              const avgScale = (scaleX + scaleY + scaleZ) / 3;
              if (avgScale > 0.1 && avgScale < 10) {
                // Apply a slightly reduced scale to ensure the XCandle fits well
                // Multiply by baseScale to maintain the base scaling
                const adjustedScale = avgScale * baseScale * 1.5;
                xCandleInstance.scale.set(
                  adjustedScale,
                  adjustedScale,
                  adjustedScale
                );
                console.log(
                  `Applied scale adjustment to XCandle: ${adjustedScale}`
                );
              }
            }

            console.log(
              `Positioned XCandle using glass component at:`,
              glassLocalPosition
            );
          } else {
            // Fallback to using the VCANDLE's position if glass component not found
            xCandleInstance.position.copy(candle.position);
            console.log(
              `Glass component not found, using VCANDLE position:`,
              candle.position
            );
          }

          // Add user data to the XCandle for interactivity
          xCandleInstance.userData = {
            ...candle.userData,
            originalVCandleName: candle.name,
            isMelting: true,
            meltingProgress: 0,
            originalScale: xCandleInstance.scale.clone(),
            createdAt: result.createdAt, // Store the createdAt timestamp
          };

          // Add flame effects, etc. to the XCandle instance
          xCandleInstance.traverse((child) => {
            if (child.name.startsWith("XFlame")) {
              child.visible = true;
            }

            // Ensure all child objects have the same userData for melting
            if (child.isMesh) {
              child.userData = {
                ...child.userData,
                parentXCandle: xCandleInstance.name,
                isMelting: true,
              };
            }
          });
          // Add the XCandle to the scene AFTER traversing
          modelRef.current.add(xCandleInstance);

          // Keep track of the instance for cleanup (now using candleIndex from parameter)
          xCandleInstances.current.set(candleIndex, xCandleInstance);
          newMeltingState.set(instanceId, xCandleInstance.userData);
          console.log(
            `Created XCandle instance for unstaked user ${result.userName}`
          );
        } else {
          console.warn(
            "XCandle model not loaded yet for unstaked candle:",
            result
          );
        }
        meltingStateRef.current = newMeltingState;
      }
    };

    // Process all candle assignments
    specialAssignments.forEach((result, candleName) => {
      processCandle(candleName, result);
    });

    // Process remaining candles
    remainingUsers.forEach((result, index) => {
      const position = userCandleIndices[index];
      processCandle(`VCANDLE${position}`, result);
    });

    return () => {
      // Cleanup function - capture the current value of modelRef
      const model = modelRef.current;
      if (model) {
        // No need to explicitly remove XCandle instances here as it's handled in the main cleanup effect
      }
    };
  }, [results, xCandleModel]); // Remove modelRef.current from dependencies

  const applyUserImageToLabels = (candle, imageUrl) => {
    if (!imageUrl) return;

    // Find both labels
    const labels = candle.children.filter(
      (child) => child.name.includes("Label1") || child.name.includes("Label2")
    );

    if (labels.length === 0) return;

    const textureLoader = new THREE.TextureLoader();

    // textureLoader.load("preview2.jpeg", function (texture) {
    //   texture.mapping = THREE.EquirectangularReflectionMapping;
    //   scene.background = texture;
    // });

    textureLoader.load(
      imageUrl,
      (texture) => {
        texture.encoding = THREE.sRGBEncoding;
        texture.flipY = false;
        texture.needsUpdate = true;

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
      },
      undefined,
      (error) => console.warn("🚨 Texture load error:", error)
    );
  };

  /** 🔥 Reset candle state (for unassigned candles) */
  const resetCandle = (candle) => {
    candle.userData = { hasUser: false };

    // Make all children invisible and clean up materials
    candle.children.forEach((child) => {
      console.log(`Resetting visibility for ${child.name} to false`);
      child.visible = false;

      // Handle material cleanup for labels
      if (child.name.startsWith("Label")) {
        if (child.material) {
          child.material.map?.dispose();
          child.material.dispose();
          child.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide,
          });
        }
      }
    });
  };

  const [highlightedXCandle, setHighlightedXCandle] = useState(null);

  // Handle click events
  const handleClick = (event) => {
    event.stopPropagation();

    // Check if we clicked on an annotation
    if (
      event.object &&
      event.object.userData &&
      event.object.userData.isAnnotation
    ) {
      // Let the annotation handle its own click
      return;
    }

    if (showFloatingViewer) return;

    const mouse = new THREE.Vector2(
      (event.nativeEvent.offsetX / event.nativeEvent.target.clientWidth) * 2 -
        1,
      -(event.nativeEvent.offsetY / event.nativeEvent.target.clientHeight) * 2 +
        1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Check for Boombox intersection first
    if (boomboxRef.current && is80sMode) {
      const boomboxIntersects = raycaster.intersectObject(
        boomboxRef.current,
        true
      );
      if (boomboxIntersects.length > 0) {
        if (onBoomboxClick) {
          // Call the onBoomboxClick handler from props
          onBoomboxClick();
          return;
        }
      }
    }

    // Check for XCandle intersections
    const xCandleIntersects = [];
    // Also track which VCANDLEs have XCandles (to prevent double-handling)
    const vCandlesWithXCandles = new Set();

    xCandleInstances.current.forEach((xCandle) => {
      // Skip objects with isAnnotation flag
      if (xCandle.userData && xCandle.userData.isAnnotation) {
        return;
      }

      const intersects = raycaster.intersectObject(xCandle, true);
      if (intersects.length > 0) {
        // Filter out annotation objects from intersections
        const nonAnnotationIntersects = intersects.filter(
          (hit) => !(hit.object.userData && hit.object.userData.isAnnotation)
        );

        if (nonAnnotationIntersects.length > 0) {
          xCandleIntersects.push({
            distance: nonAnnotationIntersects[0].distance,
            object: xCandle,
          });
        }
      }

      // Track the original VCANDLE name for each XCandle
      if (xCandle.userData && xCandle.userData.originalVCandleName) {
        vCandlesWithXCandles.add(xCandle.userData.originalVCandleName);
      }
    });

    // If we hit an XCandle, handle it differently
    if (xCandleIntersects.length > 0) {
      // Sort by distance (closest first)
      xCandleIntersects.sort((a, b) => a.distance - b.distance);
      const closestXCandle = xCandleIntersects[0].object;

      // For XCandles, we'll highlight the annotation
      if (closestXCandle.userData) {
        console.log("XCandle clicked:", closestXCandle.name);

        if (!hasHandledFirstClick) {
          console.log("First click detected - preventing state update");
          setHasHandledFirstClick(true);
          return;
        }

        // If we click the same candle again, toggle off the highlight
        if (
          highlightedXCandle &&
          highlightedXCandle.id === closestXCandle.name
        ) {
          setHighlightedXCandle(null);
        } else {
          setHighlightedXCandle({
            id: closestXCandle.name,
            userData: { ...closestXCandle.userData },
          });
        }
        return;
      }
    }

    // Original candle click logic for VCANDLEs
    const intersectableObjects = [];
    if (modelRef && modelRef.current) {
      modelRef.current.traverse((object) => {
        // Skip annotation objects
        if (object.userData && object.userData.isAnnotation) {
          return;
        }

        // Skip VCANDLEs that have corresponding XCandles
        if (
          object.name.startsWith("VCANDLE") &&
          vCandlesWithXCandles.has(object.name)
        ) {
          return;
        }

        if (object.name.startsWith("VCANDLE")) {
          intersectableObjects.push(object);
          object.children.forEach((child) => {
            if (
              child.name.includes("wax") ||
              child.name.includes("glass") ||
              child.name.startsWith("FLAME")
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

      // Check if the candle has user data (userName is a good indicator)
      if (candleParent?.userData?.userName) {
        console.log("VCANDLE clicked with user data:", candleParent.userData);
        onCandleSelect({
          ...candleParent.userData,
          candleId: candleParent.name,
          candleTimestamp: Date.now(),
        });

        // Set showFloatingViewer to true
        if (setShowFloatingViewer) {
          setShowFloatingViewer(true);
        }
      } else {
        console.log(
          "VCANDLE clicked but no user data found:",
          candleParent?.userData
        );
      }
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup function to prevent memory leaks
      if (gltf) {
        gltf.scene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();

          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }

          if (object.texture) object.texture.dispose();
        });
      }
    };
  }, [gltf]);

  // Initialize web worker
  useEffect(() => {
    // Only create worker in browser environment
    if (typeof window !== "undefined") {
      workerRef.current = new Worker(
        new URL("../../utilities/modelProcessor.js", import.meta.url)
      );

      // Set up message handler
      workerRef.current.onmessage = (event) => {
        const { operation, result } = event.data;

        switch (operation) {
          case "calculateLighting":
            // Apply pre-calculated lighting data
            applyLightingData(result);
            break;
          case "simplifyGeometry":
            // Apply simplified geometry for LOD
            applySimplifiedGeometry(result);
            break;
          default:
        }
      };

      return () => {
        // Clean up worker when component unmounts
        workerRef.current?.terminate();
      };
    }
  }, []);

  // Extract model data and send to worker for processing
  useEffect(() => {
    if (gltf && gltf.scene && workerRef.current) {
      // Process model data in worker when model is loaded
      gltf.scene.traverse((object) => {
        if (object.isMesh && object.geometry) {
          // Extract vertex and normal data
          const vertices = object.geometry.attributes.position.array;
          const normals = object.geometry.attributes.normal?.array;

          if (vertices && normals) {
            // Send data to worker for lighting calculation
            workerRef.current.postMessage({
              operation: "calculateLighting",
              data: {
                vertices: vertices,
                normals: normals,
                lights: [
                  {
                    position: [10, 10, 10],
                    color: [1, 1, 1],
                    intensity: 0.8,
                  },
                  {
                    position: [-5, 8, -10],
                    color: [0.2, 0.3, 0.9],
                    intensity: 0.5,
                  },
                ],
              },
            });
          }
        }
      });
    }
  }, [gltf]);

  // Apply lighting data calculated by worker
  const applyLightingData = (lightingData) => {
    if (!gltf || !gltf.scene) return;

    // Apply the pre-calculated lighting data to materials
    // This is a simplified example - you would typically use this data
    // in a custom shader or material
    setProcessedData(lightingData);
  };

  // Apply simplified geometry for LOD
  const applySimplifiedGeometry = (geometryData) => {
    // Implementation depends on your specific needs
  };

  // Log when '80s mode changes
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

  // Add this effect to set initial visibility when the model first loads
  useEffect(() => {
    if (!gltf?.scene) return;

    // Use the same logic as our toggle effect to find and set initial visibility
    const setBoomboxInitialVisibility = () => {
      let boomboxFound = false;

      // Find the Boombox object in the model
      gltf.scene.traverse((child) => {
        // Look for objects that might be the boombox using various naming patterns
        const boomboxPatterns = [
          "BoomBox",
          "Boombox",
          "boombox",
          "BoomBox",
          "BOOM_BOX",
          "BOOM",
        ];

        const isBoombox = boomboxPatterns.some(
          (pattern) =>
            child.name.includes(pattern) ||
            (child.userData &&
              child.userData.originalName &&
              child.userData.originalName.includes(pattern))
        );

        if ((child.isMesh || child.isGroup) && isBoombox) {
          boomboxFound = true;

          // Set initial visibility based on 80s mode
          child.visible = is80sMode;

          // Add orange emissive glow to specific Boombox objects
          if (child.name === "Boombox.844" || child.name === "Boombox.836") {
            // Store original material properties
            if (!child.userData.originalEmissive && child.material) {
              if (Array.isArray(child.material)) {
                child.userData.originalEmissive = child.material.map((mat) =>
                  mat.emissive.clone()
                );
                child.userData.originalEmissiveIntensity = child.material.map(
                  (mat) => mat.emissiveIntensity
                );
              } else {
                child.userData.originalEmissive =
                  child.material.emissive.clone();
                child.userData.originalEmissiveIntensity =
                  child.material.emissiveIntensity;
              }
            }

            // Apply orange emissive glow when in 80s mode
            if (is80sMode) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                  mat.emissive = new THREE.Color(0xff5500); // Orange color
                  mat.emissiveIntensity = 0.8;
                  mat.needsUpdate = true;
                });
              } else if (child.material) {
                child.material.emissive = new THREE.Color(0xff5500); // Orange color
                child.material.emissiveIntensity = 0.3;
                child.material.needsUpdate = true;
              }
            }
          }

          // If it's a group with children, set all children too
          if (child.children && child.children.length > 0) {
            child.children.forEach((childObj) => {
              childObj.visible = is80sMode;

              // Also check for the specific objects in children
              if (
                childObj.name === "Boombox.181" ||
                childObj.name === "Boombox.173"
              ) {
                if (is80sMode && childObj.material) {
                  // Store original material properties
                  if (!childObj.userData.originalEmissive) {
                    if (Array.isArray(childObj.material)) {
                      childObj.userData.originalEmissive =
                        childObj.material.map((mat) => mat.emissive.clone());
                      childObj.userData.originalEmissiveIntensity =
                        childObj.material.map((mat) => mat.emissiveIntensity);
                    } else {
                      childObj.userData.originalEmissive =
                        childObj.material.emissive.clone();
                      childObj.userData.originalEmissiveIntensity =
                        childObj.material.emissiveIntensity;
                    }
                  }

                  // Apply orange emissive
                  if (Array.isArray(childObj.material)) {
                    childObj.material.forEach((mat) => {
                      mat.emissive = new THREE.Color(0xff5500); // Orange color
                      mat.emissiveIntensity = 0.3;
                      mat.needsUpdate = true;
                    });
                  } else {
                    childObj.material.emissive = new THREE.Color(0xff5500); // Orange color
                    childObj.material.emissiveIntensity = 0.3;
                    childObj.material.needsUpdate = true;
                  }
                }
              }
            });
          }
        }
      });

      // If no Boombox found by name, try alternative methods
      if (!boomboxFound) {
        // Try to find by texture
        gltf.scene.traverse((child) => {
          if (child.isMesh && child.material && child.material.map) {
            const textureName = child.material.map.name || "";
            if (
              textureName.toLowerCase().includes("boombox") ||
              textureName.toLowerCase().includes("stereo") ||
              textureName.toLowerCase().includes("radio")
            ) {
              child.visible = is80sMode;
              boomboxFound = true;
            }
          }

          // Try to find by size/position
          if (child.isMesh && !boomboxFound) {
            const box = new THREE.Box3().setFromObject(child);
            const size = box.getSize(new THREE.Vector3());
            const position = child.position;

            if (
              size.x > 10 &&
              size.y > 5 &&
              size.z > 5 &&
              Math.abs(position.y) < 10 &&
              Math.abs(position.x) < 10
            ) {
              child.visible = is80sMode;
              boomboxFound = true;
            }
          }
        });
      }

      // Try root object approach if still not found
      if (!boomboxFound && gltf.scene.name.toLowerCase().includes("boombox")) {
        gltf.scene.traverse((child) => {
          if (
            child.isMesh &&
            (child.name.includes("speaker") ||
              child.name.includes("button") ||
              child.name.includes("display") ||
              child.name.includes("cassette") ||
              child.name.includes("tape"))
          ) {
            child.visible = is80sMode;
          }
        });
      }
    };

    // Run the function to set initial visibility
    setBoomboxInitialVisibility();
  }, [gltf, is80sMode]); // Depend on gltf and is80sMode

  // Add effect to toggle Boombox visibility based on 80s mode
  useEffect(() => {
    if (!modelRef.current) return;

    let boomboxFound = false;

    // Find the Boombox object in the model
    modelRef.current.traverse((child) => {
      // Look for objects that might be the boombox using various naming patterns
      const boomboxPatterns = [
        "BOOMBOX",
        "Boombox",
        "boombox",
        "BoomBox",
        "BOOM_BOX",
      ];

      const isBoombox = boomboxPatterns.some(
        (pattern) =>
          child.name.includes(pattern) ||
          (child.userData &&
            child.userData.originalName &&
            child.userData.originalName.includes(pattern))
      );

      if ((child.isMesh || child.isGroup) && isBoombox) {
        boomboxFound = true;

        // Toggle visibility based on 80s mode
        child.visible = is80sMode;

        // Add orange emissive glow to specific Boombox objects
        if (child.name === "Boombox.181" || child.name === "Boombox.173") {
          // Store original material properties if not already stored
          if (!child.userData.originalEmissive && child.material) {
            if (Array.isArray(child.material)) {
              child.userData.originalEmissive = child.material.map((mat) =>
                mat.emissive.clone()
              );
              child.userData.originalEmissiveIntensity = child.material.map(
                (mat) => mat.emissiveIntensity
              );
            } else {
              child.userData.originalEmissive = child.material.emissive.clone();
              child.userData.originalEmissiveIntensity =
                child.material.emissiveIntensity;
            }
          }

          // Apply orange emissive glow when in 80s mode
          if (is80sMode) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.emissive = new THREE.Color(0xff5500); // Orange color
                mat.emissiveIntensity = 0.3;
                mat.needsUpdate = true;
              });
            } else if (child.material) {
              child.material.emissive = new THREE.Color(0xff5500); // Orange color
              child.material.emissiveIntensity = 0.3;
              child.material.needsUpdate = true;
            }
          } else {
            // Restore original emissive properties when not in 80s mode
            if (child.userData.originalEmissive) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat, index) => {
                  mat.emissive.copy(
                    Array.isArray(child.userData.originalEmissive)
                      ? child.userData.originalEmissive[index]
                      : child.userData.originalEmissive
                  );
                  mat.emissiveIntensity = Array.isArray(
                    child.userData.originalEmissiveIntensity
                  )
                    ? child.userData.originalEmissiveIntensity[index]
                    : child.userData.originalEmissiveIntensity;
                  mat.needsUpdate = true;
                });
              } else if (child.material) {
                child.material.emissive.copy(child.userData.originalEmissive);
                child.material.emissiveIntensity =
                  child.userData.originalEmissiveIntensity;
                child.material.needsUpdate = true;
              }
            }
          }
        }

        // If it's a group with children, make sure all children are also visible/invisible
        if (child.children && child.children.length > 0) {
          child.children.forEach((childObj) => {
            childObj.visible = is80sMode;

            // Also check for the specific objects in children
            if (
              childObj.name === "Boombox.181" ||
              childObj.name === "Boombox.173"
            ) {
              if (is80sMode && childObj.material) {
                // Store original material properties if not already stored
                if (!childObj.userData.originalEmissive) {
                  if (Array.isArray(childObj.material)) {
                    childObj.userData.originalEmissive = childObj.material.map(
                      (mat) => mat.emissive.clone()
                    );
                    childObj.userData.originalEmissiveIntensity =
                      childObj.material.map((mat) => mat.emissiveIntensity);
                  } else {
                    childObj.userData.originalEmissive =
                      childObj.material.emissive.clone();
                    childObj.userData.originalEmissiveIntensity =
                      childObj.material.emissiveIntensity;
                  }
                }

                // Apply orange emissive
                if (Array.isArray(childObj.material)) {
                  childObj.material.forEach((mat) => {
                    mat.emissive = new THREE.Color(0xff5500); // Orange color
                    mat.emissiveIntensity = 0.3;
                    mat.needsUpdate = true;
                  });
                } else {
                  childObj.material.emissive = new THREE.Color(0xff5500); // Orange color
                  childObj.material.emissiveIntensity = 0.3;
                  childObj.material.needsUpdate = true;
                }
              }
            }
          });
        }
      }
    });

    // If no Boombox found by name, try alternative methods
    if (!boomboxFound) {
      // Try to find by texture
      modelRef.current.traverse((child) => {
        if (child.isMesh && child.material && child.material.map) {
          const textureName = child.material.map.name || "";
          if (
            textureName.toLowerCase().includes("boombox") ||
            textureName.toLowerCase().includes("stereo") ||
            textureName.toLowerCase().includes("radio")
          ) {
            child.visible = is80sMode;
            boomboxFound = true;
          }
        }

        // Try to find by size/position
        if (child.isMesh && !boomboxFound) {
          const box = new THREE.Box3().setFromObject(child);
          const size = box.getSize(new THREE.Vector3());
          const position = child.position;

          if (
            size.x > 10 &&
            size.y > 5 &&
            size.z > 5 &&
            Math.abs(position.y) < 10 &&
            Math.abs(position.x) < 10
          ) {
            child.visible = is80sMode;
            boomboxFound = true;
          }
        }
      });
    }

    // Try root object approach if still not found
  }, [modelRef, is80sMode]);

  // Set up Boombox visibility and glow effect
  useEffect(() => {
    if (!gltf?.scene) return;
    const boomboxLED = gltf.scene.getObjectByName("BoomboxLED_2");
    if (boomboxLED) {
      boomboxRef.current = boomboxLED;
      boomboxLED.visible = is80sMode;

      if (boomboxLED.material) {
        boomboxLED.material.emissive = new THREE.Color("#736DFF");
        // Always start with LED off when Spotify is showing
        boomboxLED.material.emissiveIntensity = showSpotify ? 0.0 : 2.0;
        boomboxLED.material.toneMapped = false;
      }
    }
  }, [gltf, is80sMode, showSpotify]); // Add showSpotify dependency

  // Add effect to track showSpotify changes
  useEffect(() => {
    if (boomboxRef.current?.material) {
      // Immediately update LED state when showSpotify changes
      boomboxRef.current.material.emissiveIntensity = showSpotify ? 0.0 : 2.0;
    }
  }, [showSpotify]);

  // Use useFrame for continuous animation
  useFrame((state, delta) => {
    if (!modelRef.current) return;

    // Helper function to handle candle melting
    const handleCandleMelting = (child, instanceId = null) => {
      // Get the appropriate userData - either directly from the child or from meltingStateRef
      const userData = instanceId
        ? meltingStateRef.current.get(instanceId) || child.userData
        : child.userData;

      // If there's no createdAt timestamp, use the old melting logic
      if (!userData.createdAt) {
        // Debug log to verify melting is being applied
        if (userData.meltingProgress === 0) {
        }

        // Update the melting progress using delta (legacy mode)
        userData.meltingProgress += delta;
      } else if (userData.meltingProgress === 0) {
        // Only log once when we start melting with timestamp
      }

      // For a 24-hour melting duration (86400 seconds)
      // We need to go from 1.0 to MIN_SCALE (0.2) over that period
      const SECONDS_IN_DAY = 86400;
      // TEMPORARY: Using 10 seconds for troubleshooting
      // const MELTING_DURATION = 10; // 10 seconds for testing

      const MIN_SCALE = 0.2;

      // RESTORE ORIGINAL CODE: Use timestamp-based melting progress calculation
      // Calculate the melting progress based on time elapsed since creation
      let meltingProgress;
      if (userData.createdAt) {
        // Calculate seconds elapsed since creation
        const now = new Date();
        const createdAt =
          userData.createdAt instanceof Date
            ? userData.createdAt
            : new Date(userData.createdAt);

        const secondsElapsed = (now - createdAt) / 1000;
        meltingProgress = secondsElapsed;
      } else {
        // Use the accumulated meltingProgress for legacy candles
        meltingProgress = userData.meltingProgress;
      }

      // Calculate the percentage remaining (from 1.0 to MIN_SCALE)
      // RESTORE ORIGINAL: Using original melting speed for 24-hour duration
      const meltingSpeed = 1 / SECONDS_IN_DAY; // Speed for 24-hour melting duration
      // const meltingSpeed = 1 / MELTING_DURATION; // Speed for 10-second melting duration (for testing)
      const percentageRemaining = Math.max(
        1 - meltingSpeed * meltingProgress,
        MIN_SCALE
      );

      // Check if candle has reached minimum scale
      if (percentageRemaining <= MIN_SCALE) {
        // Make the candle invisible when fully melted
        child.visible = false;

        // Also hide any associated flames
        child.traverse((descendant) => {
          if (descendant.name.includes("Flame")) {
            descendant.visible = false;
          }
        });

        // Add this candle to the melted candles set
        meltedCandlesRef.current.add(instanceId || child.name);

        // Skip the rest of the melting logic
        return true; // Return true to indicate the candle is fully melted
      } else {
        // Ensure the candle is visible if it's not fully melted
        child.visible = true;

        // Remove from melted candles set if it was there
        if (meltedCandlesRef.current.has(instanceId || child.name)) {
          meltedCandlesRef.current.delete(instanceId || child.name);
        }
      }

      if (userData.originalScale?.y) {
        // Initialize original values if not already stored
        if (!userData.originalValues) {
          // Get the bounding box to find the actual dimensions of the geometry
          const bbox = new THREE.Box3().setFromObject(child);
          const height = bbox.max.y - bbox.min.y;
          const bottom = bbox.min.y;
          const top = bbox.max.y;

          // Get the world position of the bottom of the candle
          const worldPosition = new THREE.Vector3();
          child.getWorldPosition(worldPosition);
          // Calculate the world position of the bottom
          const worldBottom = worldPosition.y - height / 2;

          userData.originalValues = {
            position: child.position.clone(),
            scale: child.scale.clone(),
            height: height,
            bottom: bottom,
            top: top,
            worldBottom: worldBottom,
          };
        }

        const originalScale = userData.originalScale.y;
        const newScale = originalScale * percentageRemaining;

        // Keep original X and Z scale, only modify Y
        child.scale.set(
          userData.originalScale.x,
          newScale,
          userData.originalScale.z
        );

        // Calculate height reduction
        const originalHeight = userData.originalValues.height;
        const newHeight = originalHeight * percentageRemaining;
        const heightReduction = originalHeight - newHeight;

        // Base position adjustment - move DOWN as in our previous working approach
        const basePositionY =
          userData.originalValues.position.y - heightReduction / 2;

        // ADDITIONAL FIX: Add a small additional offset to compensate for any bottom movement
        // This offset increases as the candle melts more
        // The 0.05 factor can be adjusted based on testing
        const additionalOffset = heightReduction * 0.2;

        // Apply the position with the additional offset
        child.position.y = basePositionY + additionalOffset;

        // Debug: Check the actual bottom position
        if (
          userData.meltingProgress < 0.1 ||
          userData.meltingProgress % 1 < 0.01
        ) {
          // Get current world position
          const currentWorldPos = new THREE.Vector3();
          child.getWorldPosition(currentWorldPos);
          // Calculate current bottom in world space
          const currentBottom = currentWorldPos.y - newHeight / 2;

          // Calculate how much the bottom has moved from original
          const bottomDifference =
            currentBottom - userData.originalValues.worldBottom;
        }
      }

      // Add flame flicker
      child.traverse((descendant) => {
        if (descendant.name.startsWith("XFlame") && descendant.visible) {
          const flicker = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
          descendant.scale.set(flicker, flicker, flicker);
        }
      });

      // If using meltingStateRef, update it
      if (instanceId) {
        meltingStateRef.current.set(instanceId, userData);
      }

      return false; // Return false to indicate the candle is still melting
    };

    // Process candles in the scene hierarchy
    modelRef.current.traverse((child) => {
      // Handle melting for XCandle objects
      if (child.name.startsWith("XCandle") && child.userData?.isMelting) {
        handleCandleMelting(child);
      }
    });

    // Handle Boombox LED animation
    if (boomboxRef.current?.material && is80sMode) {
      const material = boomboxRef.current.material;

      // If Spotify is showing, ensure LED is off
      if (showSpotify) {
        if (material.emissiveIntensity !== 0.0) {
          material.emissiveIntensity = 0.0;
        }
        return; // Skip animation when Spotify is showing
      }

      // Only pulse if Spotify is not showing
      const intensity = 2.0 + Math.sin(state.clock.elapsedTime * 3) * 1.0;
      material.emissiveIntensity = intensity;
    }

    // Process candles in the xCandleInstances collection
    xCandleInstances.current.forEach((child) => {
      if (child.userData.isMelting) {
        const instanceId = child.name;
        handleCandleMelting(child, instanceId);
      }
    });
  });

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

      {/* Add annotations for XCandle instances only */}
      {Array.from(xCandleInstances.current.entries()).map(
        ([index, xCandle]) => {
          // Skip rendering annotations for fully melted candles
          if (meltedCandlesRef.current.has(xCandle.name)) {
            return null;
          }

          // Find the flame component to position the annotation above it
          let flamePosition = new THREE.Vector3();
          let flameFound = false;

          xCandle.traverse((child) => {
            if (child.name.startsWith("XFlame") && !flameFound) {
              // Get the world position of the flame
              child.getWorldPosition(flamePosition);
              flameFound = true;
            }
          });

          // If no flame found, use the XCandle position and adjust based on melting progress
          if (!flameFound) {
            // Get the candle's world position
            xCandle.getWorldPosition(flamePosition);

            // Calculate the current height of the candle based on melting progress
            let heightAdjustment = 0.8; // Default height above candle

            // If the candle is melting, adjust the annotation height to follow the top of the candle
            if (xCandle.userData?.isMelting) {
              // Get the original height and current scale
              const originalHeight =
                xCandle.userData.originalValues?.height || 1.0;
              const currentScale =
                xCandle.scale.y / (xCandle.userData.originalScale?.y || 1.0);

              // Calculate the current height of the candle
              const currentHeight = originalHeight * currentScale;

              // Adjust the annotation position to stay at the top of the melting candle
              // The 0.8 is the default offset, we scale it by the current height ratio
              heightAdjustment = 0.8 * currentScale;
            }

            // Apply the height adjustment
            flamePosition.y += heightAdjustment;
          } else {
            // If flame is found, position slightly above it (flame already follows the candle)
            flamePosition.y += 0.3;
          }

          const userName = xCandle.userData.userName || "Anonymous";
          const imageUrl = xCandle.userData.image || null;
          const isHighlighted =
            highlightedXCandle && highlightedXCandle.id === xCandle.name;

          // Create a click handler for this specific XCandle
          const handleAnnotationClick = (xCandleName, userData) => {
            return (event) => {
              event.stopPropagation();
              console.log("Annotation clicked for XCandle:", xCandleName);

              // On first click, just mark that we've handled it without changing state
              if (!hasHandledFirstClick) {
                console.log("First click detected - preventing state update");
                setHasHandledFirstClick(true);
                return;
              }

              // Normal behavior for subsequent clicks
              if (highlightedXCandle && highlightedXCandle.id === xCandleName) {
                setHighlightedXCandle(null);
              } else {
                setHighlightedXCandle({
                  id: xCandleName,
                  userData: userData,
                });
              }
            };
          };

          return (
            <Annotation
              key={`xcandle-annotation-${index}`}
              position={flamePosition}
              scale={1.0}
              isHighlighted={isHighlighted}
              imageUrl={imageUrl}
              onAnnotationClick={handleAnnotationClick(
                xCandle.name,
                xCandle.userData
              )}
              showFloatingViewer={showFloatingViewer}
            >
              {userName}
            </Annotation>
          );
        }
      )}

      <DarkClouds />
    </>
  );
}

// Preload both models
useGLTF.preload("/altarBoomboxCandles.glb");
useGLTF.preload("/XCandle1.glb");

export default Model;
