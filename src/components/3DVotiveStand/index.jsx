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

import { Perf } from "r3f-perf";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
// import PostProcessingEffects from "./PostProcessingEffects";
import * as THREE from "three";
import gsap from "gsap";
import Model from "./Model";
import { DEFAULT_MARKERS } from "./markers";
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
import MobileModel from "./MobileModel";

import FloatingCandleViewer from "./CandleInteraction";

import CameraGUI from "./CameraGUI";
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
        Press 'P' to toggle DPI: 1 → 1.5 → 2 → 0.75 → 1
      </div>
      <div style={{ marginTop: 5, fontSize: 10, color: "#aaa" }}>
        Press 'D' to toggle this debug overlay
      </div>
    </div>
  );
};

// Lazy load scene components
const MoonScene = lazy(() => import("./MoonLamps"));
const HolographicStatue = lazy(() => import("./HolographicStatue"));
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
}) {
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false); // Debug overlay toggle
  const [currentDpr, setCurrentDpr] = useState(1); // Start with lower DPI until we determine device/network
  const [networkType, setNetworkType] = useState("");

  const results = useFirestoreResults();
  const [userData, setUserData] = useState([]);
  // Add in index.jsx
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
  const spotlightRef = useRef();
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

    console.log(`Applying ${presetName} lighting preset:`, preset);

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
    console.log("ThreeDVotiveStand: is80sMode changed to", is80sMode);
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
    console.log("Parent: Updating sky color to:", hexColor);
    setSkyColor(hexColor);

    // Update the model's sky color if modelRef is available
    if (modelRef.current && modelRef.current.updateSkyColor) {
      modelRef.current.updateSkyColor(hexColor);
    }
  };

  // Update ground color (bottom color)
  const updateGroundColor = (hexColor) => {
    console.log("Parent: Updating ground color to:", hexColor);
    setGroundColor(hexColor);

    // Update the model's ground color if modelRef is available
    if (modelRef.current && modelRef.current.updateGroundColor) {
      modelRef.current.updateGroundColor(hexColor);
    }
  };

  // Update the parent component when model is loaded (only once)
  useEffect(() => {
    if (isModelLoaded && !hasNotifiedParentRef.current) {
      console.log("ThreeDVotiveStand: Model loaded, notifying BurnGallery");
      setIsLoading(true); // Notify BurnGallery that everything is loaded
      hasNotifiedParentRef.current = true; // Set flag to prevent further notifications
    }
  }, [isModelLoaded, setIsLoading]);

  // Log only once when component mounts
  useEffect(() => {
    console.log(
      "ThreeDVotiveStand: Component mounted with onSpawnReady available:",
      !!onSpawnReady
    );
  }, []); // Empty dependency array

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
      console.log(`DPI updated to: ${currentDpr}`);
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
            console.log(`DPI changed to: ${nextDpr}`);
          }

          return nextDpr;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
            position: [0, 10, 45], // ✅ Use the copied values from CameraGUI
            near: 0.03,
            far: 150,
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
            />

            <Suspense fallback={null}>
              <MoonScene modelRef={modelRef} onSpawnReady={onSpawnReady} />
            </Suspense>

            <Suspense fallback={null}>
              <HolographicStatue />
            </Suspense>

            <Suspense fallback={null}>
              <PostProcessingEffects is80sMode={is80sMode} />
            </Suspense>
          </Suspense>
          {/* <TickerDisplay /> */}
        </Canvas>

        {/* Light Helper Controls - Outside Canvas */}
        {/* 
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            zIndex: 100,
            background: "rgba(0,0,0,0.5)",
            padding: "10px",
            borderRadius: "5px",
            color: "white",
            width: "280px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "10px",
              textAlign: "center",
            }}
          >
            Light Helper Controls
          </div>

          <button
            onClick={toggleLightHelper}
            style={{
              background: showLightHelper ? "#4CAF50" : "#f44336",
              color: "white",
              border: "none",
              padding: "5px 10px",
              borderRadius: "3px",
              cursor: "pointer",
              width: "100%",
              marginBottom: "15px",
            }}
          >
            {showLightHelper ? "Hide Light Helper" : "Show Light Helper"}
          </button>

          <div style={{ marginBottom: "15px" }}>
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
              Position
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "5px",
              }}
            >
              <label style={{ width: "20px" }}>X:</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={lightPosition.x}
                onChange={(e) => updateLightPosition("x", e.target.value)}
                style={{ flex: 1, margin: "0 10px" }}
              />
              <span style={{ width: "30px", textAlign: "right" }}>
                {lightPosition.x}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "5px",
              }}
            >
              <label style={{ width: "20px" }}>Y:</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={lightPosition.y}
                onChange={(e) => updateLightPosition("y", e.target.value)}
                style={{ flex: 1, margin: "0 10px" }}
              />
              <span style={{ width: "30px", textAlign: "right" }}>
                {lightPosition.y}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label style={{ width: "20px" }}>Z:</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={lightPosition.z}
                onChange={(e) => updateLightPosition("z", e.target.value)}
                style={{ flex: 1, margin: "0 10px" }}
              />
              <span style={{ width: "30px", textAlign: "right" }}>
                {lightPosition.z}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
              Intensity
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={lightIntensity}
                onChange={(e) => updateLightIntensity(e.target.value)}
                style={{ flex: 1, marginRight: "10px" }}
              />
              <span style={{ width: "30px", textAlign: "right" }}>
                {lightIntensity.toFixed(1)}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: "15px" }}>
            <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
              Colors
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label style={{ width: "80px" }}>Sky (Top):</label>
              <input
                type="color"
                value={skyColor}
                onChange={(e) => updateSkyColor(e.target.value)}
                style={{ marginLeft: "10px", width: "40px", height: "25px" }}
              />
              <span style={{ marginLeft: "10px", fontSize: "12px" }}>
                {skyColor}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ width: "80px" }}>Ground:</label>
              <input
                type="color"
                value={groundColor}
                onChange={(e) => updateGroundColor(e.target.value)}
                style={{ marginLeft: "10px", width: "40px", height: "25px" }}
              />
              <span style={{ marginLeft: "10px", fontSize: "12px" }}>
                {groundColor}
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: "12px",
              textAlign: "center",
              borderTop: "1px solid rgba(255,255,255,0.2)",
              paddingTop: "8px",
            }}
          >
            Position: [{lightPosition.x}, {lightPosition.y}, {lightPosition.z}]
          </div>
        </div>
        */}

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
