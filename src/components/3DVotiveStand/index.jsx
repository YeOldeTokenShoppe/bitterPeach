// index.jsx
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  lazy,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, BakeShadows } from "@react-three/drei";
import TickerDisplay from "./TickerDisplay";
import { Perf } from "r3f-perf";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
// import PostProcessingEffects from "./PostProcessingEffects";
import * as THREE from "three";
import gsap from "gsap";
import Model from "./Model";
import RocketModel from "./RocketModel";

// import { DEFAULT_CAMERA, getCameraSettings } from "./defaultCamera";
// In your Canvas component

import { CONTROL_SETTINGS } from "./controlSettings";

// import { getScreenCategory } from "./screenCategories";
import { Box } from "@chakra-ui/react";
// import CameraGUI from "./CameraGUI";
import { PerspectiveCamera } from "@react-three/drei";

import dynamic from "next/dynamic";
import styled from "styled-components";

import { debounce } from "lodash";

import FloatingCandleViewer from "./CandleInteraction";
import MoonScene from "./MoonLamps";
import CameraGUI from "./CameraGUI";
import HolographicStatue from "./HolographicStatue";
import PostProcessingEffects from "./PostProcessingEffects";

const scene = new THREE.Scene();

// Lazy load scene components

function ThreeDVotiveStand({
  setIsLoading,
  onCameraMove,
  onResetView,
  onZoom,
  isInMarkerView,
  isMobileView,
  onScreenClick,
  setShowSpotify,
  isModalOpen,
  setIsModalOpen,
  onSpawnReady,
  is80sMode,
  showSpotify,

  monsterMode,
  userData,
}) {
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false); // Debug overlay toggle
  const [currentDpr, setCurrentDpr] = useState(1); // Start with lower DPI until we determine device/network
  const [networkType, setNetworkType] = useState("");

  const results = useFirestoreResults();
  // const [userData, setUserData] = useState([]);
  // // Add in index.jsx
  const [tooltipData, setTooltipData] = useState([]);

  const [shuffledCandleIndices, setShuffledCandleIndices] = useState([]);

  const [isHovered, setIsHovered] = useState(false);
  const [isMarkerMovement, setIsMarkerMovement] = useState(false);
  const [modelScale, setModelScale] = useState(1);
  const [buttonPopupVisible, setButtonPopupVisible] = useState(false);
  // const [clickedButtonName, setClickedButtonName] = useState("");
  const [buttonData, setButtonData] = useState("");
  const [camera, setCamera] = useState(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [isResetVisible, setIsResetVisible] = useState(true);
  const [rotation, setRotation] = useState([0, 0, 0]);
  const [activeAnnotation, setActiveAnnotation] = useState(null);
  const [isAnnotationVisible, setIsAnnotationVisible] = useState(false);
  const [isInteractionInProgress, setIsInteractionInProgress] = useState(false);

  const modelRef = useRef();
  // const sceneRef = useRef(new Scene());
  const canvasRef = useRef();

  const helperRef = useRef();
  const targetRef = useRef();
  // for camera control panel
  const cameraRef = useRef(null); // Reference to the camera
  const controlsRef = useRef(null); // Reference to OrbitControls
  // const spotlightRef = useRef();

  const rendererRef = useRef(null);
  // const [showPhoneViewer, setShowPhoneViewer] = useState(false);

  const panelRef = useRef();
  const [modelCenter, setModelCenter] = useState(new THREE.Vector3(0, 0, 0)); // Default center

  const togglePanel = () => {
    panelRef.current?.togglePanel();
  };

  const [isGuiMode, setIsGuiMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [guiActive, setGuiActive] = useState(false);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const hasNotifiedParentRef = useRef(false); // Add this ref to track notification state

  // Light helper state
  const [showLightHelper, setShowLightHelper] = useState(false);
  const [lightPosition, setLightPosition] = useState({ x: 32, y: 33, z: 89 });
  const [lightIntensity, setLightIntensity] = useState(1.2);
  const [skyColor, setSkyColor] = useState("#7300ff"); // Sky color in hex format for inputs
  const [groundColor, setGroundColor] = useState("#ff0000"); // Ground color in hex format for inputs

  // Define lighting presets
  const lightingPresets = {
    default: {
      skyColor: "#7300ff",
      groundColor: "#ff0000",
      lightIntensity: 1.2,
      lightPosition: { x: 32, y: 33, z: 89 },
    },
    eighties: {
      skyColor: "#ff00ff", // Hot pink
      groundColor: "#00ffff", // Cyan
      lightIntensity: 1.5,
      lightPosition: { x: 40, y: 40, z: 70 },
    },
  };

  // Apply a preset configuration
  const applyPreset = useCallback(
    (presetName) => {
      const preset = lightingPresets[presetName];
      if (!preset) return;

      // Update all lighting properties at once
      setSkyColor(preset.skyColor);
      setGroundColor(preset.groundColor);
      setLightIntensity(preset.lightIntensity);
      setLightPosition(preset.lightPosition);

      // Update the model's light properties if modelRef is available
      if (modelRef.current) {
        if (modelRef.current.updateSkyColor) {
          modelRef.current.updateSkyColor(preset.skyColor);
        }
        if (modelRef.current.updateGroundColor) {
          modelRef.current.updateGroundColor(preset.groundColor);
        }
        if (modelRef.current.updateLightIntensity) {
          modelRef.current.updateLightIntensity(preset.lightIntensity);
        }
        if (modelRef.current.updateLightPosition) {
          modelRef.current.updateLightPosition("x", preset.lightPosition.x);
          modelRef.current.updateLightPosition("y", preset.lightPosition.y);
          modelRef.current.updateLightPosition("z", preset.lightPosition.z);
        }
      }
    },
    [modelRef]
  );

  // Apply preset when is80sMode prop changes
  useEffect(() => {
    applyPreset(is80sMode ? "eighties" : "default");
  }, [is80sMode, applyPreset]);

  // Handle light position changes from Model component
  const handleLightPositionChange = (newPosition) => {
    setLightPosition(newPosition);
  };

  // Update light position
  const updateLightPosition = (axis, value) => {
    const newValue = Number(value);
    setLightPosition((prev) => ({
      ...prev,
      [axis]: newValue,
    }));

    // Update the model's light position if modelRef is available
    if (modelRef.current && modelRef.current.updateLightPosition) {
      modelRef.current.updateLightPosition(axis, newValue);
    }
  };

  // Update light intensity
  const updateLightIntensity = (value) => {
    const intensity = Number(value);
    setLightIntensity(intensity);

    // Update the model's light intensity if modelRef is available
    if (modelRef.current && modelRef.current.updateLightIntensity) {
      modelRef.current.updateLightIntensity(intensity);
    }
  };

  // Update sky color (top color)
  const updateSkyColor = (hexColor) => {
    setSkyColor(hexColor);

    // Update the model's sky color if modelRef is available
    if (modelRef.current && modelRef.current.updateSkyColor) {
      modelRef.current.updateSkyColor(hexColor);
    }
  };

  // Update ground color (bottom color)
  const updateGroundColor = (hexColor) => {
    setGroundColor(hexColor);

    // Update the model's ground color if modelRef is available
    if (modelRef.current && modelRef.current.updateGroundColor) {
      modelRef.current.updateGroundColor(hexColor);
    }
  };

  // Update the parent component when model is loaded (only once)
  useEffect(() => {
    if (isModelLoaded && !hasNotifiedParentRef.current) {
      setIsLoading(true); // Notify BurnGallery that everything is loaded
      hasNotifiedParentRef.current = true; // Set flag to prevent further notifications
    }
  }, [isModelLoaded, setIsLoading]);

  // Handle window resize and maintain consistent pixel ratio
  useEffect(() => {
    const handleResize = () => {
      if (rendererRef.current) {
        rendererRef.current.setPixelRatio(1); // Consistent pixel ratio

        // Update size state for responsive adjustments
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;

        setSize({
          width: newWidth,
          height: newHeight,
        });

        // Adjust model scale based on viewport size
        // This helps maintain consistent visual size across different devices
        const baseWidth = 1400; // Base width for reference
        const scaleFactor = Math.max(0.8, Math.min(1.2, newWidth / baseWidth));
        setModelScale(scaleFactor);
      }
    };

    // Set initial size
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Detect device type and network conditions to set appropriate DPI
  useEffect(() => {
    // Always use DPI of 1 for consistent performance
    setCurrentDpr(1);
    setNetworkType("forced-standard");
  }, []);

  // Update renderer when DPI changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setPixelRatio(currentDpr);
    }
  }, [currentDpr]);

  // Add a keyboard listener to toggle debug overlay with 'D' key

  // Add refs for spotlight and target
  const spotlightRef = useRef();
  const spotlightTargetRef = useRef();

  // Set up spotlight target
  useEffect(() => {
    if (spotlightRef.current && spotlightTargetRef.current) {
      spotlightRef.current.target = spotlightTargetRef.current;
    }
  }, []);

  // Add a ref to store the ambient light dimming value from RocketModel
  const ambientLightDimmingRef = useRef(0.1);

  // Function to update the ambient light dimming value
  const updateAmbientLightDimming = (value) => {
    ambientLightDimmingRef.current = value;
  };

  // Add an effect to dim ambient light when monsterMode is active
  useEffect(() => {
    // Find ambient light in the scene
    scene.traverse((object) => {
      if (object.isAmbientLight) {
        // Store original intensity if not already stored
        if (!object.userData.originalIntensity && monsterMode) {
          object.userData.originalIntensity = object.intensity;
        }

        // Dim the light when in monster mode
        if (monsterMode) {
          // Reduce intensity based on the dimming value from GUI
          object.intensity = object.userData.originalIntensity
            ? object.userData.originalIntensity * ambientLightDimmingRef.current
            : ambientLightDimmingRef.current;
        } else if (object.userData.originalIntensity) {
          // Restore original intensity when exiting monster mode
          object.intensity = object.userData.originalIntensity;
        }
      }
    });

    return () => {
      // Restore original intensity when component unmounts
      scene.traverse((object) => {
        if (object.isAmbientLight && object.userData.originalIntensity) {
          object.intensity = object.userData.originalIntensity;
        }
      });
    };
  }, [monsterMode, scene]);

  // Add a cleanup function in your component
  useEffect(() => {
    return () => {
      // Dispose of Three.js resources when component unmounts
      if (modelRef.current) {
        modelRef.current.traverse((object) => {
          if (object.geometry) {
            object.geometry.dispose();
          }

          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }

          if (object.texture) {
            object.texture.dispose();
          }
        });
      }

      // Clear any cached scenes, renderers, etc.
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      // Clear three.js cache
      THREE.Cache.clear();
    };
  }, []);

  // Only calculate modelCenter when dependencies actually change
  // useEffect(() => {
  //   const newCenter = calculateModelCenter();
  //   if (!modelCenter.equals(newCenter)) {
  //     setModelCenter(newCenter);
  //   }
  // }, [modelScale]);

  return (
    <>
      <div
        className="votiveContainer"
        style={{
          position: "relative",
          top: 0,
          margin: "auto",
          height: "100vh",
          width: "100%",
          maxWidth: "1400px",
          pointerEvents: "auto",
          overflow: "hidden",
        }}
      >
        <Canvas
          dpr={currentDpr} // Using dynamic DPI based on device and network
          performance={{ min: 0.5 }} // Allow ThreeJS to reduce quality for performance
          // camera={{
          //   fov: 45,
          //   position: [0, -10, 70], // ✅ Use the copied values from CameraGUI
          //   near: 0.1,
          //   far: 350,
          // }}
          onCreated={({ gl, camera }) => {
            cameraRef.current = camera;
            rendererRef.current = gl;

            // Explicitly set pixel ratio on the renderer
            gl.setPixelRatio(currentDpr); // Use the current DPI setting from state

            // Additional renderer settings for consistency
            gl.outputColorSpace = THREE.SRGBColorSpace;
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1;
          }}
        >
          {/* Manually controlling DPI now, so AdaptiveDpr is disabled */}
          <AdaptiveDpr pixelated />
          <AdaptiveEvents />
          <BakeShadows />
          {/* <FlyInEffect
            cameraRef={cameraRef}
            controlsRef={controlsRef}
            duration={4}
          /> */}
          {/* <TourCamera points={pointsOfInterest} /> */}
          <Perf position="top-left" />

          <Model
            scale={modelScale}
            rotation={[0, 0, 0]}
            modelRef={modelRef}
            showFloatingViewer={showFloatingViewer}
            setShowFloatingViewer={setShowFloatingViewer}
            onCandleSelect={(data) => {
              setSelectedCandleData(data);
              setShowFloatingViewer(true);
            }}
            setModelCenter={setModelCenter}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            setIsModelLoaded={setIsModelLoaded}
            onLightPositionChange={handleLightPositionChange}
            lightIntensity={lightIntensity}
            skyColor={skyColor}
            groundColor={groundColor}
            showLightHelper={showLightHelper}
            is80sMode={is80sMode}
            showSpotify={showSpotify}
            monsterMode={monsterMode}
          />

          <Suspense fallback={null}>
            <MoonScene modelRef={modelRef} onSpawnReady={onSpawnReady} />
          </Suspense>

          {/* Conditionally render HolographicStatue or RocketModel based on monsterMode */}
          <Suspense fallback={null}>
            {!monsterMode ? (
              <HolographicStatue />
            ) : (
              // Render RocketModel directly without Suspense since it's no longer lazy loaded
              <RocketModel
                updateAmbientLightDimming={updateAmbientLightDimming}
                userData={userData}
                is80sMode={is80sMode}
              />
            )}
          </Suspense>
          <Suspense fallback={null}>
            <TickerDisplay modelRef={modelRef} />
          </Suspense>
          <Suspense fallback={null}>
            <PostProcessingEffects is80sMode={is80sMode} />
          </Suspense>

          {/* Add Wireframe Terrain */}
          {/* <Suspense fallback={null}>
              <WireframeTerrain is80sMode={is80sMode} />
            </Suspense> */}

          {/* <TickerDisplay /> */}
        </Canvas>

        {/* Add placement button */}

        {showFloatingViewer && selectedCandleData && (
          <FloatingCandleViewer
            key={`candle-viewer-${selectedCandleData.candleId || ""}-${
              selectedCandleData.candleTimestamp || Date.now()
            }`}
            isVisible={showFloatingViewer}
            userData={selectedCandleData}
            onClose={() => {
              setShowFloatingViewer(false);
              setSelectedCandleData(null);
            }}
          />
        )}
      </div>
    </>
  );
}

export default ThreeDVotiveStand;
