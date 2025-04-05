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

import StarField from "./StarField";

const scene = new THREE.Scene();

// Lazy load scene components

function ThreeDVotiveStand({
  setIsLoading,
  isInMarkerView,
  isMobileView,
  setShowSpotify,
  isModalOpen,
  setIsModalOpen,
  onSpawnReady,
  is80sMode,
  showSpotify,
  monsterMode,
  userData,
  setIsStatueLoaded,
  rocketModelVisible,
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
  const [lightIntensity, setLightIntensity] = useState(1);
  const [skyColor, setSkyColor] = useState("#7300ff"); // Sky color in hex format for inputs
  const [groundColor, setGroundColor] = useState("#ff0000"); // Ground color in hex format for inputs

  window.pauseThreeJSRendering = function () {
    // Store the current animation state
    if (window.threeJSAnimationId) {
      window.cancelAnimationFrame(window.threeJSAnimationId);
      window.threeJSPaused = true;
    }
  };

  window.resumeThreeJSRendering = function () {
    // Only resume if we were previously rendering
    if (window.threeJSPaused) {
      window.threeJSPaused = false;
      // Re-start your animation loop
      animate(); // Or whatever your three.js animation function is called
    }
  };

  // In your three.js animation loop, track the animation ID
  function animate() {
    // Store animation ID globally so it can be canceled if needed
    window.threeJSAnimationId = requestAnimationFrame(animate);

    // Your regular three.js rendering code
    renderer.render(scene, camera);
  }
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
      console.log("ThreeDVotiveStand: Model loaded, notifying parent");
      setIsLoading(true); // Notify BurnGallery that everything is loaded
      hasNotifiedParentRef.current = true; // Set flag to prevent further notifications
    }
  }, [isModelLoaded, setIsLoading]);

  // Add a fallback timer to ensure loading completes even if there's an issue
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!hasNotifiedParentRef.current) {
        console.log(
          "ThreeDVotiveStand: Fallback timer triggered, forcing load complete"
        );
        setIsLoading(true);
        hasNotifiedParentRef.current = true;
      }
    }, 8000); // 8 second fallback

    return () => clearTimeout(fallbackTimer);
  }, [setIsLoading]);

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

  // Add a state to control the confetti effect independently

  const handleCandleClick = useCallback((candleData) => {
    console.log("Candle clicked:", candleData);
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        dpr={currentDpr}
        performance={{ min: 0.5 }}
        camera={{
          fov: 45,
          position: [0, -10, 70],
          near: 1,
          far: 1000,
        }}
        onCreated={({ gl, camera }) => {
          cameraRef.current = camera;
          rendererRef.current = gl;

          // Clear background to a very dark color
          gl.setClearColor(new THREE.Color("#040406"), 1);

          // Explicitly set pixel ratio on the renderer
          gl.setPixelRatio(currentDpr);

          // Additional renderer settings for consistency
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;

          // Set logarithmic depth buffer for better depth precision
          gl.logarithmicDepthBuffer = true;
        }}
      >
        {/* {!isMobile && <AdaptiveDpr pixelated />} */}
        <AdaptiveEvents />
        <BakeShadows />
        {/* <Perf position="top-left" showGraph={true} chart={true} /> */}

        <Model
          scale={modelScale}
          rotation={[0, 0, 0]}
          modelRef={modelRef}
          showFloatingViewer={showFloatingViewer}
          setShowFloatingViewer={setShowFloatingViewer}
          onCandleClick={handleCandleClick}
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

        {/* Remove the conditional rendering - don't tie to is80sMode */}
        {/* Only render if explicitly enabled later */}

        <Suspense fallback={null}>
          <MoonScene modelRef={modelRef} onSpawnReady={onSpawnReady} />
        </Suspense>

        {/* Conditionally render HolographicStatue or RocketModel based on monsterMode */}
        <Suspense fallback={null}>
          {console.log("ThreeDVotiveStand render:", {
            monsterMode,
            rocketModelVisible,
          })}
          {!monsterMode ? (
            <HolographicStatue
              isInMarkerView={isInMarkerView}
              isMobileView={isMobileView}
              setShowSpotify={setShowSpotify}
              showSpotify={showSpotify}
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              onSpawnReady={onSpawnReady}
              is80sMode={is80sMode}
              userData={userData}
              setIsStatueLoaded={setIsStatueLoaded}
            />
          ) : (
            rocketModelVisible && <RocketModel is80sMode={is80sMode} />
          )}
        </Suspense>
        <Suspense fallback={null}>
          <TickerDisplay modelRef={modelRef} />
        </Suspense>
        <Suspense fallback={null}>
          <PostProcessingEffects is80sMode={is80sMode} />
        </Suspense>

        {/* Render the stars last */}
        <Suspense fallback={null}>
          <StarField is80sMode={is80sMode} />
        </Suspense>
      </Canvas>

      {/* FloatingCandleViewer goes here, outside the Canvas */}
      {showFloatingViewer && selectedCandleData && (
        <FloatingCandleViewer
          key={`candle-viewer-${selectedCandleData.candleId}-${selectedCandleData.candleTimestamp}`}
          isVisible={showFloatingViewer}
          userData={selectedCandleData}
          onClose={() => {
            setShowFloatingViewer(false);
            setSelectedCandleData(null);
          }}
        />
      )}
    </div>
  );
}

export default ThreeDVotiveStand;
