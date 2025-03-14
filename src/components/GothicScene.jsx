import React, { useEffect, useState, useRef, Suspense } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useGLTF, useProgress, useHelper } from "@react-three/drei";
import * as THREE from "three";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../utilities/firebaseClient";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

// Configure draco loader for useGLTF
useGLTF.preload("/mainGothic4.glb");
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("/draco/");
// Set up GLTFLoader to use Draco compression
GLTFLoader.prototype.setDRACOLoader(dracoLoader);

function GothicScene({
  scale = 0.3,
  modelRef = useRef(),
  rotation = [0, 0, 0],
  setIsModelLoaded,
  lightIntensity = 1.2,
  skyColor = "#7300ff",
  groundColor = "#ff0000",
  // Point light properties
  pointLights = [
    {
      position: [5, 5, 5],
      color: "#ff0000",
      intensity: 1.0,
      showHelper: false,
      distance: 50,
      decay: 2,
      name: "Red Light",
    },
    {
      position: [-5, 5, 5],
      color: "#0000ff",
      intensity: 1.0,
      showHelper: false,
      distance: 50,
      decay: 2,
      name: "Blue Light",
    },
    {
      position: [0, 5, -5],
      color: "#00ff00",
      intensity: 1.0,
      showHelper: false,
      distance: 50,
      decay: 2,
      name: "Green Light",
    },
    {
      position: [0, -5, 0],
      color: "#ffff00",
      intensity: 1.0,
      showHelper: false,
      distance: 50,
      decay: 2,
      name: "Yellow Light",
    },
  ],
}) {
  const [modelUrl, setModelUrl] = useState("/mainGothic4.glb"); // Default fallback
  const { progress } = useProgress(); // Track loading progress
  const gltf = useGLTF(modelUrl, true); // Enable caching
  const { scene } = useThree();
  const hemiLightRef = useRef();
  const ambientLightRef = useRef();
  const boundingBoxRef = useRef(new THREE.Box3());

  // Create refs for point lights and helpers
  const pointLightRefs = useRef([]);
  const helperRefs = useRef([]);

  // Initialize refs arrays
  if (pointLightRefs.current.length !== pointLights.length) {
    pointLightRefs.current = Array(pointLights.length)
      .fill()
      .map(() => React.createRef());

    helperRefs.current = Array(pointLights.length)
      .fill()
      .map(() => React.createRef());
  }

  // Fetch model URL from Firebase Storage
  useEffect(() => {
    const fetchModelUrl = async () => {
      try {
        const modelRef = ref(storage, "models/mainGothic4.glb"); // Firebase path
        const downloadUrl = await getDownloadURL(modelRef);
        console.log("Successfully fetched Gothic model URL:", downloadUrl);
        setModelUrl(downloadUrl);
      } catch (error) {
        console.error(
          "Error fetching Gothic model from Firebase Storage:",
          error
        );
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

  // Compute bounding box and center the model
  useEffect(() => {
    if (!modelRef.current) return;

    boundingBoxRef.current.setFromObject(modelRef.current);
    const center = new THREE.Vector3();
    boundingBoxRef.current.getCenter(center);
    modelRef.current.position.sub(center);

    // Log model dimensions for debugging
    const size = new THREE.Vector3();
    boundingBoxRef.current.getSize(size);
    console.log("Gothic model dimensions:", size);
    console.log("Gothic model center:", center);
  }, [gltf.scene]);

  // Add lights
  useEffect(() => {
    // Convert hex string colors to numbers
    const skyColorValue = parseInt(skyColor.replace("#", "0x"), 16);
    const groundColorValue = parseInt(groundColor.replace("#", "0x"), 16);

    // Create hemisphere light
    const hemiLight = new THREE.HemisphereLight(
      skyColorValue,
      groundColorValue,
      lightIntensity
    );
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Add ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    return () => {
      scene.remove(hemiLight);
      scene.remove(ambientLight);
    };
  }, [scene, lightIntensity, skyColor, groundColor]);

  // Cleanup resources when component unmounts
  useEffect(() => {
    return () => {
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

  // Animation for light helpers
  useFrame((state, delta) => {
    // Safely animate helper spheres with pulse effect
    helperRefs.current.forEach((ref, index) => {
      if (ref.current && pointLights[index] && pointLights[index].showHelper) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
        ref.current.scale.set(pulse, pulse, pulse);
      }
    });
  });

  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={[scale, scale, scale]}
        rotation={rotation}
      />

      {/* Point Lights */}
      {pointLights.map((light, index) => {
        // Convert hex color string to THREE.Color
        const lightColor = new THREE.Color(light.color);

        return (
          <group key={`pointLight-group-${index}`}>
            <pointLight
              key={`pointLight-${index}`}
              ref={pointLightRefs.current[index]}
              position={light.position}
              color={lightColor}
              intensity={light.intensity}
              distance={light.distance || 50}
              decay={light.decay || 2}
              castShadow={false}
              name={light.name || `Light ${index + 1}`}
            />

            {/* Light helper - visible when showHelper is true */}
            {light.showHelper && (
              <mesh
                position={light.position}
                scale={[0.15, 0.15, 0.15]}
                ref={helperRefs.current[index]}
              >
                <sphereGeometry args={[1, 16, 8]} />
                <meshStandardMaterial
                  color={light.color}
                  transparent={true}
                  opacity={0.7}
                  emissive={light.color}
                  emissiveIntensity={1.5}
                />
              </mesh>
            )}

            {/* Light beam effect - visible when showHelper is true */}
            {light.showHelper && (
              <mesh position={light.position}>
                <coneGeometry args={[1, 3, 16, 1, true]} />
                <meshBasicMaterial
                  color={light.color}
                  transparent={true}
                  opacity={0.15}
                  side={THREE.BackSide}
                  depthWrite={false}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

// Preload the model
useGLTF.preload("/mainGothic4.glb");

export default GothicScene;
