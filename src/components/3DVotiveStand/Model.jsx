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
} from "@react-three/drei";
import * as THREE from "three";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
import DarkClouds from "./Clouds";
import FloatingCandleViewer from "./CandleInteraction";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../utilities/firebaseClient"; // Import storage directly
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

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
  }, [lightPosition, lightIntensity, skyColor, groundColor, showLightHelper]);

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
  const [tooltips, setTooltips] = useState([]);

  useEffect(() => {
    const loadXCandleModel = async () => {
      try {
        // Load XCandle.glb
        const { scene: xCandleScene } = await useGLTF("/XCandle.glb", true);
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
    if (results.length === 0 || !modelRef.current) return;

    // Cleanup any existing XCandle instances first
    xCandleInstances.current.forEach((instance) => {
      if (instance.parent) {
        instance.parent.remove(instance);
      }
    });
    xCandleInstances.current.clear();

    setTooltips([]);

    const newTooltips = [];

    // Reset ALL candles to be invisible first
    modelRef.current.traverse((child) => {
      if (child.name.startsWith("VCANDLE")) {
        resetCandle(child);
      }
    });

    const availableIndices = Array.from({ length: 80 }, (_, i) =>
      String(i + 1).padStart(3, "0")
    );

    const shuffledIndices = availableIndices.sort(() => Math.random() - 0.5);
    const userCandleIndices = shuffledIndices.slice(0, results.length);

    // Process all user candles
    results.forEach((result, index) => {
      const candleIndex = userCandleIndices[index];
      const candleName = `VCANDLE${candleIndex}`;
      const candle = modelRef.current.getObjectByName(candleName);

      if (candle) {
        // Store the result data in userData for both types of candles
        candle.userData = {
          hasUser: true,
          userName: result.userName || "Anonymous",
          image: result.image,
          message: result.message,
          burnedAmount: result.burnedAmount || 1,
          meltingProgress: 0,
          staked: result.staked !== false, // Default to true if undefined
        };

        if (result.staked !== false) {
          // STAKED CANDLE: Make the VCANDLE visible
          if (result.image) applyUserImageToLabels(candle, result.image);

          // Make all children visible for staked user candles
          candle.children.forEach((child) => {
            console.log(`Setting visibility for ${child.name} to true`);
            child.visible = true;
          });
        } else {
          // UNSTAKED CANDLE: Keep VCANDLE invisible, create XCandle
          if (xCandleModel) {
            // Create a new XCandle instance
            const xCandleInstance = xCandleModel.clone();

            // Position it at the same location as the VCANDLE
            xCandleInstance.position.copy(candle.position);

            // Add user data to the XCandle for interactivity
            xCandleInstance.userData = {
              ...candle.userData,
              originalVCandleName: candle.name,
            };

            // Add flame effects, etc. to the XCandle instance
            xCandleInstance.traverse((child) => {
              if (child.name.startsWith("XFlame")) {
                child.visible = true;
              }
            });
            // Add the XCandle to the scene AFTER traversing
            modelRef.current.add(xCandleInstance);

            // Keep track of the instance for cleanup
            xCandleInstances.current.set(candleIndex, xCandleInstance);
            newTooltips.push({
              id: candleIndex,
              username: result.userName || "Anonymous",
              position: [
                xCandleInstance.position.x,
                xCandleInstance.position.y + 3,
                xCandleInstance.position.z,
              ],
            });
          } else {
            console.warn(
              "XCandle model not loaded yet for unstaked candle:",
              result
            );
          }
        }
      }
    });

    setTooltips(newTooltips);

    return () => {
      // Cleanup function
      if (modelRef.current) {
        // No need to explicitly remove XCandle instances here as it's handled in the main cleanup effect
      }
    };
  }, [results, modelRef.current, xCandleModel]); // Add xCandleModel to dependencies

  const XCandleTooltip = ({ position, username }) => {
    const tooltipRef = useRef();

    // Make the tooltip face the camera
    useFrame(({ camera }) => {
      if (tooltipRef.current) {
        tooltipRef.current.lookAt(camera.position);
      }
    });

    return (
      <group position={position} ref={tooltipRef}>
        <Text
          fontSize={0.5}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {username}
        </Text>
      </group>
    );
  };

  // useEffect(() => {
  //   if (results.length === 0 || !modelRef.current) return;

  //   // Add debugging to inspect VCANDLE structure
  //   console.log("Inspecting VCANDLE structure:");
  //   modelRef.current.traverse((child) => {
  //     if (child.name.startsWith("VCANDLE")) {
  //       console.log(`\nVCANDLE object: ${child.name}`);
  //       console.log("Direct children:");
  //       child.children.forEach((c) => {
  //         console.log(`- ${c.name} (visible: ${c.visible})`);
  //       });
  //     }
  //   });

  //   const availableIndices = Array.from({ length: 80 }, (_, i) =>
  //     String(i + 1).padStart(3, "0")
  //   );

  //   const shuffledIndices = availableIndices.sort(() => Math.random() - 0.5);
  //   const userCandleIndices = shuffledIndices.slice(0, results.length);
  //   const defaultCandleIndices = shuffledIndices.slice(results.length);

  //   // Reset ALL candles clearly using your function
  //   // Reset ALL candles to be completely invisible first
  //   modelRef.current.traverse((child) => {
  //     if (child.name.startsWith("VCANDLE")) {
  //       resetCandle(child);
  //     }
  //   });

  //   // Only process user-assigned candles, no default candles
  //   results.forEach((result, index) => {
  //     const candleIndex = userCandleIndices[index];
  //     const candleName = `VCANDLE${candleIndex}`;
  //     const candle = modelRef.current.getObjectByName(candleName);

  //     if (candle) {
  //       candle.userData = {
  //         hasUser: true,
  //         userName: result.userName || "Anonymous",
  //         image: result.image,
  //         message: result.message,
  //         burnedAmount: result.burnedAmount || 1,
  //         meltingProgress: 0,
  //         staked: result.staked || false,
  //       };

  //       if (result.image) applyUserImageToLabels(candle, result.image);

  //       // Make all children visible for user candles
  //       candle.children.forEach((child) => {
  //         console.log(`Setting visibility for ${child.name} to true`);
  //         child.visible = true;
  //       });
  //     }
  //   });

  //   return () => {
  //     modelRef.current?.traverse((child) => {
  //       if (child.name.startsWith("VCANDLE")) {
  //         ["Label1", "Label2"].forEach((labelType) => {
  //           const label = findCandleComponent(child, labelType);
  //           if (label?.material) {
  //             label.material.map?.dispose();
  //             label.material.dispose();
  //           }
  //         });
  //       }
  //     });
  //   };
  // }, [results, modelRef.current]);

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
  // Handle click events
  const handleClick = (event) => {
    event.stopPropagation();

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

    // Original candle click logic
    const intersectableObjects = [];
    modelRef.current.traverse((object) => {
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

    const intersects = raycaster.intersectObjects(intersectableObjects, true);
    if (intersects.length > 0) {
      let candleParent = intersects[0].object;
      while (candleParent && !candleParent.name.startsWith("VCANDLE")) {
        candleParent = candleParent.parent;
      }

      if (candleParent?.userData?.hasUser) {
        onCandleSelect({
          ...candleParent.userData,
          candleId: candleParent.name,
          candleTimestamp: Date.now(),
        });
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

    modelRef.current.traverse((child) => {
      // Handle melting for XCandle objects
      if (child.name.startsWith("XCandle") && child.userData?.isMelting) {
        child.userData.meltingProgress += delta;

        const meltingSpeed = 0.1; // Slower melting
        const MIN_SCALE = 0.2;

        // Calculate the percentage remaining
        const percentageRemaining = Math.max(
          1 - meltingSpeed * child.userData.meltingProgress,
          MIN_SCALE
        );

        if (child.userData.originalScale?.y) {
          // Initialize original values if not already stored
          if (!child.userData.originalValues) {
            // Get the bounding box to find the actual top of the geometry
            const bbox = new THREE.Box3().setFromObject(child);
            const height = bbox.max.y - bbox.min.y;
            const top = bbox.max.y;

            child.userData.originalValues = {
              position: child.position.clone(),
              scale: child.scale.clone(),
              height: height,
              top: top,
            };
          }

          const originalScale = child.userData.originalScale.y;
          const newScale = originalScale * percentageRemaining;

          // Keep original X and Z scale, only modify Y
          child.scale.set(
            child.userData.originalScale.x,
            newScale,
            child.userData.originalScale.z
          );

          // Calculate the new position to keep top fixed
          const originalTop = child.userData.originalValues.top;
          const originalHeight = child.userData.originalValues.height;
          const newHeight = originalHeight * percentageRemaining;

          // Move the position to keep the top fixed while bottom melts up
          child.position.y =
            child.userData.originalValues.position.y -
            (originalHeight - newHeight) / 2;
        }

        // Add flame flicker
        child.traverse((descendant) => {
          if (descendant.name.startsWith("XFlame") && descendant.visible) {
            const flicker = 1 + Math.sin(state.clock.elapsedTime * 10) * 0.1;
            descendant.scale.set(flicker, flicker, flicker);
          }
        });
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
  });

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

      {tooltips.map((tooltip) => (
        <XCandleTooltip
          key={`tooltip-${tooltip.id}`}
          position={tooltip.position}
          username={tooltip.username}
        />
      ))}
      <DarkClouds />
    </>
  );
}

// Preload both models
useGLTF.preload("/altarBoomboxCandles.glb");
useGLTF.preload("/XCandle.glb");

export default Model;
