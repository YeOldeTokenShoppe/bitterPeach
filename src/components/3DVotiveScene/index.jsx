
// index.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense, lazy,  } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, BakeShadows } from "@react-three/drei";
import TickerDisplay from "./TickerDisplay";
import { Perf } from "r3f-perf";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
import * as THREE from "three";

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
import ConstellationModel from "./ConstellationModel";
import StarField from "./StarField";

const scene = new THREE.Scene();

// Add HoldIndicator component here
const HoldIndicator = ({ showIndicator, progress }) => {
  if (!showIndicator) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "20%",
        transform: "translateX(-50%)",
        backgroundColor: "rgba(0,0,0,0.7)",
        padding: "10px",
        borderRadius: "5px",
        color: "white",
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <div>Hold to place candle</div>
      <div
        style={{
          width: "100%",
          height: "5px",
          backgroundColor: "rgba(255,255,255,0.3)",
          marginTop: "5px",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: progress >= 1 ? "#4CAF50" : "white",
            transition: "width 0.1s linear",
          }}
        />
      </div>
    </div>
  );
};

// Lazy load scene components

// Create a wrapper component to access the RocketContext

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
  isConstellationsVisible,
  toggleConstellationVisibility,
}) {
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false); // Debug overlay toggle
  const [currentDpr, setCurrentDpr] = useState(1); // Start with lower DPI until we determine device/network
  const [networkType, setNetworkType] = useState("");

  // Add state for hold indicator
  const [holdState, setHoldState] = useState({
    showIndicator: false,
    progress: 0,
  });

  // Add ref for MoonScene
  const moonSceneRef = useRef();

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

  // In thrusterProps state:
  // const [thrusterProps, setThrusterProps] = useState({
  //   enabled: true,
  //   amplitude: 0.1, // Reduce to 0.1 for more subtle hover
  //   frequency: 1.0, // Reduce to 1.0 for slower movement
  //   randomness: 0.05, // Reduce to 0.05 for less jitter
  // });

  // // In launchConfig state:
  // const [launchConfig, setLaunchConfig] = useState({
  //   thrusterIntensity: 1.5, // Try 1.5 for less dramatic flame during launch
  //   rotationFactor: 0.1, // Try 0.1 for less rotation
  // });

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
    presetName => {
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
  const handleLightPositionChange = newPosition => {
    setLightPosition(newPosition);
  };

  // Update light position
  const updateLightPosition = (axis, value) => {
    const newValue = Number(value);
    setLightPosition(prev => ({
      ...prev,
      [axis]: newValue,
    }));

    // Update the model's light position if modelRef is available
    if (modelRef.current && modelRef.current.updateLightPosition) {
      modelRef.current.updateLightPosition(axis, newValue);
    }
  };

  // Update light intensity
  const updateLightIntensity = value => {
    const intensity = Number(value);
    setLightIntensity(intensity);

    // Update the model's light intensity if modelRef is available
    if (modelRef.current && modelRef.current.updateLightIntensity) {
      modelRef.current.updateLightIntensity(intensity);
    }
  };

  // Update sky color (top color)
  const updateSkyColor = hexColor => {
    setSkyColor(hexColor);

    // Update the model's sky color if modelRef is available
    if (modelRef.current && modelRef.current.updateSkyColor) {
      modelRef.current.updateSkyColor(hexColor);
    }
  };

  // Update ground color (bottom color)
  const updateGroundColor = hexColor => {
    setGroundColor(hexColor);

    // Update the model's ground color if modelRef is available
    if (modelRef.current && modelRef.current.updateGroundColor) {
      modelRef.current.updateGroundColor(hexColor);
    }
  };

  // Update the parent component when model is loaded (only once)
  useEffect(() => {
    if (isModelLoaded && !hasNotifiedParentRef.current) {
      console.log("ThreeDVotiveStand: Model loaded. Delaying parent notification...");
      // Wait slightly longer than the MoonScene spawn delay before notifying the parent
      const notificationTimer = setTimeout(() => {
        console.log("ThreeDVotiveStand: Notifying parent to hide preloader.");
        setIsLoading(true); // Notify parent (e.g., BurnGallery)

        // --- UPDATED: Delay triggering moon spawn ---
        // Add a short delay after hiding the preloader before spawning moons
        const spawnDelayTimer = setTimeout(() => {
          if (moonSceneRef.current) {
            console.log("ThreeDVotiveStand: Triggering initial moon spawn after delay.");
            moonSceneRef.current.triggerInitialSpawn();
          }
        }, 3000); // 2-second delay AFTER preloader is hidden
        // --- End UPDATED ---

        hasNotifiedParentRef.current = true;

        // Clean up inner timer if outer timer's cleanup is called before inner fires
        // (Though unlikely with these timings, it's good practice)
        return () => clearTimeout(spawnDelayTimer);
      }, 5700); // Keep existing delay for hiding preloader

      // Ensure outer timer is cleared if component unmounts before firing
      return () => clearTimeout(notificationTimer);
    }
  }, [isModelLoaded, setIsLoading]); // Keep dependencies

  // Add a fallback timer to ensure loading completes even if there's an issue
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!hasNotifiedParentRef.current) {
        console.log("ThreeDVotiveStand: Fallback timer triggered, forcing load complete");
        setIsLoading(true);
        hasNotifiedParentRef.current = true;
      }
    }, 10000); // Increased fallback to 10 seconds just in case

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
  const updateAmbientLightDimming = value => {
    ambientLightDimmingRef.current = value;
  };

  // Add an effect to dim ambient light when monsterMode is active
  useEffect(() => {
    // Find ambient light in the scene
    scene.traverse(object => {
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
      scene.traverse(object => {
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
        modelRef.current.traverse(object => {
          if (object.geometry) {
            object.geometry.dispose();
          }

          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
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

  // ---> ADD: Function to toggle constellation visibility <---
  // const toggleConstellationVisibility = useCallback(() => {
  //   setIsConstellationVisible((prev) => !prev);
  //   console.log("Toggled constellation visibility to:", !isConstellationVisible);
  // }, []);

  // Handle hold state changes from Model component
  const handleHoldStateChange = useCallback(state => {
    console.log("Hold state changed:", state);
    setHoldState(state);
  }, []);

  const handleCandleClick = useCallback(candleData => {
    console.log("Candle clicked:", candleData);
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  }, []);

  // Add a global method to manually test rocket launch from the console
  // useEffect(() => {
  //   window.testRocketLaunch = () => {
  //     console.log("Test rocket launch triggered from console");
  //     if (window.rocketLaunch) {
  //       return window.rocketLaunch();
  //     } else {
  //       console.warn("window.rocketLaunch not available");
  //       return false;
  //     }
  //   };
    
  //   return () => {
  //     delete window.testRocketLaunch;
  //   };
  // }, []);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
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
          onHoldStateChange={handleHoldStateChange}
        />

        {/* Remove the conditional rendering - don't tie to is80sMode */}
        {/* Only render if explicitly enabled later */}

        <Suspense fallback={null}>
          <MoonScene
            ref={moonSceneRef}
            modelRef={modelRef}
            onSpawnReady={onSpawnReady}
            rocketModelVisible={rocketModelVisible}
          />
        </Suspense>

        {/* Conditionally render HolographicStatue or RocketModel based on monsterMode */}
        <Suspense fallback={null}>
          {/* {console.log("ThreeDVotiveStand render:", {
            monsterMode,
            rocketModelVisible,
          })}
          {!monsterMode ? ( */}
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
          {/* ) : (
            rocketModelVisible && <RocketModel is80sMode={is80sMode} userData={userData} />
          )} */}
        </Suspense>
        <Suspense fallback={null}>
          <TickerDisplay modelRef={modelRef} />
        </Suspense>
        <Suspense fallback={null}>
          <PostProcessingEffects is80sMode={is80sMode} />
        </Suspense>

        {/* Add the constellation model before the star field */}
        <Suspense fallback={null}>
          <ConstellationModel isVisible={isConstellationsVisible} />
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
