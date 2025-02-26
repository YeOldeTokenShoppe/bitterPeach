import React, { useEffect, useState, useRef, Suspense } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF, useProgress } from "@react-three/drei";
import * as THREE from "three";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
import DarkClouds from "./Clouds";
import FloatingCandleViewer from "./CandleInteraction";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../../utilities/firebaseClient"; // Import storage directly

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
}) {
  const [modelUrl, setModelUrl] = useState("/bluegreen-altar80s.glb"); // Default fallback
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

  const [selectedCandleData, setSelectedCandleData] = useState(null);

  /** 🛑 Prevent unnecessary re-renders by storing previous results */
  const prevResultsRef = useRef([]);
  const DEFAULT_IMAGES = [
    "/Triumph.jpg",
    "/vsClown.jpg",
    "/vsZombie.webp",
    "/vsSkeleton.webp",
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

  // Fetch model URL from Firebase Storage
  useEffect(() => {
    const fetchModelUrl = async () => {
      try {
        console.log("Fetching model from Firebase Storage...");
        const modelRef = ref(storage, "models/bluegreen-altar80s.glb");
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

  /** 🌟 Add Lights */
  useEffect(() => {
    const hemiLight = new THREE.HemisphereLight(0x7300ff, 0xff0000, 1);
    hemiLight.position.set(32, 33, 89);
    scene.add(hemiLight);

    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // scene.add(ambientLight);

    return () => {
      scene.remove(hemiLight);
      // scene.remove(ambientLight);
    };
  }, [scene]);

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

  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={scale}
        rotation={rotation}
        onClick={handleCandleClick}
        style={{
          pointerEvents: showFloatingViewer ? "none" : "auto",
        }}
      />
      <DarkClouds />

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
useGLTF.preload("/bluegreen-altar80s.glb");

export default Model;
