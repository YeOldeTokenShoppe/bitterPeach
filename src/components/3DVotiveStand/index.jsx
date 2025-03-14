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
import { Sun } from "./Model"; // Import the Sun component from Model.jsx
import { DEFAULT_MARKERS } from "./markers";
// import { DEFAULT_CAMERA, getCameraSettings } from "./defaultCamera";
// In your Canvas component

import { CONTROL_SETTINGS } from "./controlSettings";

// import { getScreenCategory } from "./screenCategories";
import { Box } from "@chakra-ui/react";
// import CameraGUI from "./CameraGUI";
import { PerspectiveCamera } from "@react-three/drei";
import { Stars } from "@react-three/drei";
import dynamic from "next/dynamic";
import styled from "styled-components";

import { debounce } from "lodash";

import FloatingCandleViewer from "./CandleInteraction";

import CameraGUI from "./CameraGUI";
import WireframeTerrain from "./WireframeTerrain";
const scene = new THREE.Scene();

// Debug overlay component
const DebugOverlay = ({ isVisible, dpr, modelScale, size, networkType }) => {
  if (!isVisible) return null;

  // Calculate performance recommendation
  const getPerformanceRecommendation = () => {
    if (dpr <= 1) return "Optimized for performance";
    if (dpr <= 1.5) return "Balanced performance/quality";
    return "Optimized for quality (may impact performance)";
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        background: "rgba(0,0,0,0.7)",
        color: "white",
        padding: 10,
        borderRadius: 5,
        fontSize: 12,
        zIndex: 1000,
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #444",
          paddingBottom: 5,
          marginBottom: 5,
        }}
      >
        <strong>3D Votive Stand Settings</strong>
      </div>
      <div>Device Pixel Ratio: {window.devicePixelRatio.toFixed(2)}</div>
      <div>
        Applied DPI: {dpr.toFixed(2)}{" "}
        {dpr === 1
          ? "✓ (recommended for mobile)"
          : dpr === 1.5
          ? "✓ (recommended for desktop)"
          : ""}
      </div>
      <div>Performance: {getPerformanceRecommendation()}</div>
      <div>Model Scale: {modelScale.toFixed(2)}</div>
      <div>
        Viewport: {size.width}x{size.height}
      </div>
      <div>Network: {networkType || "unknown"}</div>
      <div style={{ marginTop: 5, fontSize: 10, color: "#aaa" }}>
        Press &apos;P&apos; to toggle DPI: 1 → 1.5 → 2 → 0.75 → 1
      </div>
      <div style={{ marginTop: 5, fontSize: 10, color: "#aaa" }}>
        Press &apos;D&apos; to toggle this debug overlay
      </div>
    </div>
  );
};

// Lazy load scene components
const MoonScene = lazy(() => import("./MoonLamps"));
const HolographicStatue = lazy(() => import("./HolographicStatue"));
import RocketModel from "./RocketModel";
const PostProcessingEffects = lazy(() => import("./PostProcessingEffects"));

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
  onBoomboxClick,
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
  const [markers, setMarkers] = useState(DEFAULT_MARKERS);
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
  const directionalLightRef = useRef();
  const directionalLight1Ref = useRef();
  const directionalLight2Ref = useRef();
  const hemisphereLightRef = useRef();
  const ambientLightRef = useRef(null);
  const pointLightRef = useRef();
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
  const applyPreset = (presetName) => {
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
  };

  // Apply preset when is80sMode prop changes
  useEffect(() => {
    applyPreset(is80sMode ? "eighties" : "default");
  }, [is80sMode]);

  // Handle light position changes from Model component
  const handleLightPositionChange = (newPosition) => {
    setLightPosition(newPosition);
  };

  // Toggle light helper visibility
  const toggleLightHelper = () => {
    setShowLightHelper(!showLightHelper);
    // Also update the model's light helper if modelRef is available
    if (modelRef.current && modelRef.current.toggleLightHelper) {
      modelRef.current.toggleLightHelper();
    }
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
    // Function to detect if device is mobile
    const isMobileDevice = () => {
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth <= 768
      );
    };

    // Function to check network speed
    const checkNetworkCondition = async () => {
      // Use the Network Information API if available
      if ("connection" in navigator) {
        const connection = navigator.connection;
        setNetworkType(
          connection.effectiveType || connection.type || "unknown"
        );

        // Set DPI based on network type
        if (connection.effectiveType === "4g" && !isMobileDevice()) {
          setCurrentDpr(1.5); // Higher DPI for good connections on desktop
        } else {
          setCurrentDpr(1); // Lower DPI for slower connections or mobile
        }

        // Listen for changes to connection
        const updateConnectionStatus = () => {
          setNetworkType(
            connection.effectiveType || connection.type || "unknown"
          );
          if (connection.effectiveType === "4g" && !isMobileDevice()) {
            setCurrentDpr(1.5);
          } else {
            setCurrentDpr(1);
          }
        };

        connection.addEventListener("change", updateConnectionStatus);
        return () =>
          connection.removeEventListener("change", updateConnectionStatus);
      } else {
        // Fallback when Network Information API is not available
        // Just use device type to determine DPI
        if (isMobileDevice()) {
          setCurrentDpr(1);
          setNetworkType("mobile device");
        } else {
          setCurrentDpr(1.5);
          setNetworkType("desktop device");
        }
      }
    };

    checkNetworkCondition();
  }, []);

  // Update renderer when DPI changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setPixelRatio(currentDpr);
    }
  }, [currentDpr]);

  const handleCandleSelect = (candleData) => {
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  };

  let previousTooltipData = []; // Track previous tooltip data to prevent unnecessary updates
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

  // Add a keyboard listener to toggle debug overlay with 'D' key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "d" || e.key === "D") {
        setShowDebugOverlay((prev) => !prev);
      }

      // Add DPI toggle with 'P' key
      if (e.key === "p" || e.key === "P") {
        // Cycle through DPI values: 1 -> 1.5 -> 2 -> 0.75 -> 1
        setCurrentDpr((prevDpr) => {
          const nextDpr =
            prevDpr === 1
              ? 1.5
              : prevDpr === 1.5
              ? 2
              : prevDpr === 2
              ? 0.75
              : 1;

          // Apply the new DPI value to the renderer
          if (rendererRef.current) {
            rendererRef.current.setPixelRatio(nextDpr);
          }

          return nextDpr;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
          camera={{
            fov: 45,
            position: [0, 10, 70], // ✅ Use the copied values from CameraGUI
            near: 0.03,
            far: 350,
          }}
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
          {/* <AdaptiveDpr pixelated /> */}
          <AdaptiveEvents />
          <BakeShadows />
          {/* <FlyInEffect
            cameraRef={cameraRef}
            controlsRef={controlsRef}
            duration={4}
          /> */}
          {/* <TourCamera points={pointsOfInterest} /> */}
          <Perf position="top-left" />
          {/* <RoomWalls db={db} /> */}

          <Suspense fallback={null}>
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
              onBoomboxClick={onBoomboxClick}
              monsterMode={monsterMode}
            />

            {/* Add Sun to the scene at a visible position */}
            {/* <Sun scale={1.3} is80sMode={is80sMode} /> */}

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
              <TickerDisplay
                modelRef={modelRef}
                // position={[0, 2, 0]}
                // rotation={[0, 0, 0]}
                // scale={[18, 0.8, 0.01]}
              />
              {/* <TickerDisplay
      
            /> */}
            </Suspense>
            <Suspense fallback={null}>
              <PostProcessingEffects is80sMode={is80sMode} />
            </Suspense>

            {/* Add Wireframe Terrain */}
            {/* <Suspense fallback={null}>
              <WireframeTerrain is80sMode={is80sMode} />
            </Suspense> */}
          </Suspense>
          {/* <TickerDisplay /> */}
        </Canvas>

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
      <DebugOverlay
        isVisible={showDebugOverlay}
        dpr={currentDpr}
        modelScale={modelScale}
        size={size}
        networkType={networkType}
      />
    </>
  );
}

export default ThreeDVotiveStand;
