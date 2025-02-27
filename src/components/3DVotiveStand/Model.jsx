import React, { useEffect, useState, useRef, Suspense } from "react";
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

// Rename to avoid conflicts with BurnGallery's EightiesMusicPlayer
const ModelEightiesMusicPlayer = ({ is80sMode }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);

  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      // Get the full URL for madonna.mp4
      const audioPath = window.location.origin + "/madonna.mp4";
      console.log("Model: Creating audio element with path:", audioPath);

      audioRef.current = new Audio(audioPath);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.7; // Set to 70% volume

      // Add event listeners for debugging
      audioRef.current.onloadeddata = () => {
        console.log("Model: Madonna audio loaded successfully");
        setAudioLoaded(true);
      };

      audioRef.current.onerror = (e) => {
        console.error("Model: Error loading Madonna audio:", e);
      };

      // Log the audio source to verify
      console.log("Model: Audio source set to:", audioRef.current.src);
    }

    // Play or pause based on 80s mode
    if (is80sMode && !isPlaying) {
      console.log("Model: Starting Madonna music");
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          console.log("Model: Madonna music playing:", audioRef.current.src);
        })
        .catch((error) => {
          console.error("Model: Error playing Madonna music:", error);
          // Try to load the audio again with a different path
          audioRef.current.src = "/madonna.mp4";
          console.log("Model: Trying fallback path:", audioRef.current.src);
          audioRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
              console.log("Model: Madonna music playing with fallback path");
            })
            .catch((err) => {
              console.error("Model: Fallback path also failed:", err);
            });
        });
    } else if (!is80sMode && isPlaying) {
      console.log("Model: Stopping Madonna music");
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }

    // Cleanup function
    return () => {
      if (audioRef.current) {
        console.log("Model: Cleaning up Madonna audio player");
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    };
  }, [is80sMode, isPlaying]);

  // Add a visual indicator for debugging
  if (is80sMode) {
    console.log("Model: Rendering 80s music player indicator");
  }

  return null; // This component doesn't render anything
};

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
  setIsModelLoaded, // Add this prop to communicate loading state
  onLightPositionChange, // Add callback for light position changes
  lightIntensity: parentLightIntensity,
  skyColor: parentSkyColor,
  groundColor: parentGroundColor,
  showLightHelper: parentShowLightHelper,
  is80sMode, // Add this prop to receive '80s mode state
}) {
  const [modelUrl, setModelUrl] = useState("/altarBoombox.glb"); // Default fallback
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
    "/vsZombie.WEBP",
    "/vsSkeleton.WEBP",
  ];

  const findCandleComponent = (parent, type) => {
    const candleNumber = parent.name.slice(-3);

    switch (type) {
      case "FLAME":
        // Look for any FLAME in children (since it has different numbering)
        return parent.children.find((child) => child.name.startsWith("FLAME"));

      case "TooltipPlane":
        // Look for TooltipPlane with matching candle number
        return parent.children.find(
          (child) => child.name === `TooltipPlane${candleNumber}`
        );

      case "wax":
        // Find shared wax mesh
        return parent.children.find((child) => child.name.includes("wax"));

      default:
        return null;
    }
  };

  useEffect(() => {
    if (gltf?.scene) {
      gltf.scene.scale.set(1, 1, 1);
      gltf.scene.position.set(0, 0, 0);
      gltf.scene.updateMatrixWorld(true);
    }
  }, [gltf]);

  // Log all mesh names in the model to help identify floor objects
  useEffect(() => {
    if (gltf?.scene) {
      console.log("Logging all mesh names in the model:");
      const meshNames = [];
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          meshNames.push(child.name);
        }
      });
      console.log("Mesh names:", meshNames);
    }
  }, [gltf]);

  // Fetch model URL from Firebase Storage
  useEffect(() => {
    const fetchModelUrl = async () => {
      try {
        console.log("Fetching model from Firebase Storage...");
        const modelRef = ref(storage, "models/altarBoombox.glb");
        const downloadUrl = await getDownloadURL(modelRef);
        console.log("Firebase URL:", downloadUrl);
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
    console.log("Model loading progress:", progress);
    if (progress === 100 && setIsModelLoaded) {
      // Add a small delay to ensure everything is rendered
      const timer = setTimeout(() => {
        console.log("Model fully loaded, notifying parent component");
        setIsModelLoaded(true);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [progress, setIsModelLoaded]);

  // Add this to debug when modelUrl changes
  useEffect(() => {
    console.log("Current model URL:", modelUrl);
  }, [modelUrl]);

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
    console.log("Updating light intensity to:", intensity);
    setLightIntensity(intensity);
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = intensity;
      console.log(
        "Applied intensity to light:",
        hemiLightRef.current.intensity
      );
    }
  };

  // Update sky color (top color)
  const updateSkyColor = (hexColor) => {
    const color = parseInt(hexColor.replace("#", "0x"), 16);
    console.log("Updating sky color:", hexColor, "parsed to:", color);
    setSkyColor(color);
    if (hemiLightRef.current) {
      hemiLightRef.current.color.set(color);
      console.log("Applied sky color to light:", hemiLightRef.current.color);
    }
  };

  // Update ground color (bottom color)
  const updateGroundColor = (hexColor) => {
    const color = parseInt(hexColor.replace("#", "0x"), 16);
    console.log("Updating ground color:", hexColor, "parsed to:", color);
    setGroundColor(color);
    if (hemiLightRef.current) {
      hemiLightRef.current.groundColor.set(color);
      console.log(
        "Applied ground color to light:",
        hemiLightRef.current.groundColor
      );
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
        console.log(
          "Updating light sky color from parent:",
          parentSkyColor,
          skyColorValue
        );
        hemiLightRef.current.color.set(skyColorValue);
      }

      if (parentGroundColor) {
        const groundColorValue = parseInt(
          parentGroundColor.replace("#", "0x"),
          16
        );
        console.log(
          "Updating light ground color from parent:",
          parentGroundColor,
          groundColorValue
        );
        hemiLightRef.current.groundColor.set(groundColorValue);
      }

      if (parentLightIntensity !== undefined) {
        console.log(
          "Updating light intensity from parent:",
          parentLightIntensity
        );
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

    console.log("Creating light with colors:", {
      sky: skyColorValue,
      ground: groundColorValue,
      intensity:
        parentLightIntensity !== undefined
          ? parentLightIntensity
          : lightIntensity,
    });

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

  useEffect(() => {
    if (results.length === 0 || !modelRef.current) return;

    const availableIndices = Array.from({ length: 16 }, (_, i) =>
      String(i + 1).padStart(3, "0")
    );

    const shuffledIndices = availableIndices.sort(() => Math.random() - 0.5);
    const userCandleIndices = shuffledIndices.slice(0, results.length);
    const defaultCandleIndices = shuffledIndices.slice(results.length);

    // Reset ALL candles clearly using your function
    modelRef.current.traverse((child) => {
      if (child.name.startsWith("VCANDLE")) {
        resetCandle(child);
      }
    });

    // Assign USER candles explicitly
    results.forEach((result, index) => {
      const candleIndex = userCandleIndices[index];
      const candleName = `VCANDLE${candleIndex}`;
      const candle = modelRef.current.getObjectByName(candleName);

      if (candle) {
        candle.userData = {
          hasUser: true,
          userName: result.userName || "Anonymous",
          image: result.image,
          message: result.message,
          burnedAmount: result.burnedAmount || 1,
          meltingProgress: 0,
        };

        if (result.image) applyUserImageToLabels(candle, result.image);

        const flame = findCandleComponent(candle, "FLAME");
        if (flame) flame.visible = true;
      }
    });

    // Assign DEFAULT images explicitly only to unassigned candles
    defaultCandleIndices.forEach((index) => {
      const candleName = `VCANDLE${index}`;
      const candle = modelRef.current.getObjectByName(candleName);
      if (candle) {
        const randomDefaultImage =
          DEFAULT_IMAGES[Math.floor(Math.random() * DEFAULT_IMAGES.length)];

        candle.userData = {
          hasUser: true,
          userName: "In memory",
          image: randomDefaultImage,
          message: "In memory",
          burnedAmount: 1,
          meltingProgress: 0,
          isDefault: true,
        };

        applyUserImageToLabels(candle, randomDefaultImage);
        const flame = findCandleComponent(candle, "FLAME");
        if (flame) flame.visible = false;
      }
    });

    return () => {
      modelRef.current?.traverse((child) => {
        if (child.name.startsWith("VCANDLE")) {
          child.children.forEach((c) => {
            if (c.name.includes("Label1") || c.name.includes("Label2")) {
              if (c.material) {
                c.material.map?.dispose();
                c.material.dispose();
              }
            }
          });
        }
      });
    };
  }, [results, modelRef.current]);

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
    const flame = candle.children.find((c) => c.name.startsWith("FLAME"));
    if (flame) flame.visible = false;

    // Reset both labels
    candle.children.forEach((child) => {
      if (child.name.includes("Label1") || child.name.includes("Label2")) {
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

  const handleCandleClick = (event) => {
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
            console.log("Received result from worker:", operation);
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

    console.log("Applied lighting data from worker");
  };

  // Apply simplified geometry for LOD
  const applySimplifiedGeometry = (geometryData) => {
    // Implementation depends on your specific needs
    console.log("Applied simplified geometry from worker");
  };

  // Log when '80s mode changes
  useEffect(() => {
    if (is80sMode !== undefined) {
      console.log("Model: '80s mode is now", is80sMode ? "ON" : "OFF");
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
        console.log(`Found floor object: ${child.name}`);

        // Store the original texture if we haven't already
        if (
          !child.userData.originalTexture &&
          child.material &&
          child.material.map
        ) {
          child.userData.originalTexture = child.material.map;
          child.userData.originalMaterial = child.material.clone();
          console.log(`Stored original texture for ${child.name}`);
        }

        // Toggle between original and 80s texture
        if (is80sMode) {
          console.log(`Applying 80s texture to ${child.name}`);
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
              console.log(
                `Applied 80s texture with emissive effect to ${child.name}`
              );
            }
          });
        } else if (child.userData.originalMaterial) {
          // Restore original material
          console.log(`Restoring original material for ${child.name}`);
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

    console.log("Setting initial Boombox visibility on model load");

    // Use the same logic as our toggle effect to find and set initial visibility
    const setBoomboxInitialVisibility = () => {
      let boomboxFound = false;

      // Find the Boombox object in the model
      gltf.scene.traverse((child) => {
        // Look for objects that might be the boombox using various naming patterns
        const boomboxPatterns = [
          "BOOMBOX",
          "Boombox",
          "boombox",
          "BoomBox",
          "BOOM_BOX",
          "BOOM",
          "stereo",
          "Stereo",
          "STEREO",
          "radio",
          "Radio",
          "RADIO",
          "cassette",
          "Cassette",
          "CASSETTE",
          "player",
          "Player",
          "PLAYER",
        ];

        const isBoombox = boomboxPatterns.some(
          (pattern) =>
            child.name.includes(pattern) ||
            (child.userData &&
              child.userData.originalName &&
              child.userData.originalName.includes(pattern))
        );

        if ((child.isMesh || child.isGroup) && isBoombox) {
          console.log(
            `Setting initial visibility for Boombox object: ${child.name}`
          );
          boomboxFound = true;

          // Set initial visibility based on 80s mode
          child.visible = is80sMode;

          // Add orange emissive glow to specific Boombox objects
          if (child.name === "Boombox.181" || child.name === "Boombox.173") {
            console.log(
              `Setting initial orange emissive glow for ${child.name}`
            );

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
              console.log(
                `Setting initial visibility for Boombox by texture: ${child.name}`
              );
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
              console.log(
                `Setting initial visibility for Boombox by size/position: ${child.name}`
              );
              child.visible = is80sMode;
              boomboxFound = true;
            }
          }
        });
      }

      // Try root object approach if still not found
      if (!boomboxFound && gltf.scene.name.toLowerCase().includes("boombox")) {
        console.log(
          `Setting initial visibility using root model as Boombox: ${gltf.scene.name}`
        );

        gltf.scene.traverse((child) => {
          if (
            child.isMesh &&
            (child.name.includes("speaker") ||
              child.name.includes("button") ||
              child.name.includes("display") ||
              child.name.includes("cassette") ||
              child.name.includes("tape"))
          ) {
            console.log(
              `Setting initial visibility for Boombox component: ${child.name}`
            );
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

    console.log("Toggling Boombox visibility based on 80s mode:", is80sMode);
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
        "BOOM",
        "stereo",
        "Stereo",
        "STEREO",
        "radio",
        "Radio",
        "RADIO",
        "cassette",
        "Cassette",
        "CASSETTE",
        "player",
        "Player",
        "PLAYER",
      ];

      const isBoombox = boomboxPatterns.some(
        (pattern) =>
          child.name.includes(pattern) ||
          (child.userData &&
            child.userData.originalName &&
            child.userData.originalName.includes(pattern))
      );

      if ((child.isMesh || child.isGroup) && isBoombox) {
        console.log(
          `Toggling Boombox object: ${child.name}, visible: ${is80sMode}`
        );
        boomboxFound = true;

        // Toggle visibility based on 80s mode
        child.visible = is80sMode;

        // Add orange emissive glow to specific Boombox objects
        if (child.name === "Boombox.181" || child.name === "Boombox.173") {
          console.log(`Adding orange emissive glow to ${child.name}`);

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
            console.log(
              `Toggling Boombox by texture: ${child.name}, visible: ${is80sMode}`
            );
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
            console.log(
              `Toggling Boombox by size/position: ${child.name}, visible: ${is80sMode}`
            );
            child.visible = is80sMode;
            boomboxFound = true;
          }
        }
      });
    }

    // Try root object approach if still not found
    if (
      !boomboxFound &&
      modelRef.current.name.toLowerCase().includes("boombox")
    ) {
      console.log(
        `Toggling root model as Boombox: ${modelRef.current.name}, visible: ${is80sMode}`
      );

      modelRef.current.traverse((child) => {
        if (
          child.isMesh &&
          (child.name.includes("speaker") ||
            child.name.includes("button") ||
            child.name.includes("display") ||
            child.name.includes("cassette") ||
            child.name.includes("tape"))
        ) {
          console.log(
            `Toggling Boombox component: ${child.name}, visible: ${is80sMode}`
          );
          child.visible = is80sMode;
        }
      });
    }
  }, [modelRef, is80sMode]);

  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={[scale, scale, scale]}
        rotation={rotation}
        onClick={handleCandleClick}
        style={{
          pointerEvents: showFloatingViewer ? "none" : "auto",
        }}
      />
      <DarkClouds />

      {/* Add the music player component */}
      <ModelEightiesMusicPlayer is80sMode={is80sMode} />

      {/* {selectedCandleData && (
        <FloatingCandleViewer
          isVisible={showFloatingViewer}
          onClose={() => {
            setShowFloatingViewer(false);
            setSelectedCandleData(null);
          }}
          userData={selectedCandleData}
          key={selectedCandleData?.image}
        />
      )} */}
    </>
  );
}

// Add this line at the bottom to preload the model
useGLTF.preload("/altarBoombox.glb");

export default Model;
