// index.jsx
import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";

import { Perf } from "r3f-perf";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
import PostProcessingEffects from "./PostProcessingEffects";
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

import MoonScene from "./MoonLamps";

import FloatingCandleViewer from "./CandleInteraction";

import HolographicStatue from "./HolographicStatue";
import CameraGUI from "./CameraGUI";
const scene = new THREE.Scene();

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
}) {
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);

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

  const handleCandleSelect = (candleData) => {
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  };
  useEffect(() => {
    const loadThreeJSScene = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate 3D scene load
      setIsLoading(true); // Notify parent that 3D scene is loaded
    };
    loadThreeJSScene();
  }, [setIsLoading]);

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

  // Log only once when component mounts
  useEffect(() => {
    console.log(
      "ThreeDVotiveStand: Component mounted with onSpawnReady available:",
      !!onSpawnReady
    );
  }, []); // Empty dependency array

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
          camera={{
            fov: 45,
            position: [0, 10, 45], // ✅ Use the copied values from CameraGUI
            near: 0.03,
            far: 150,
          }}
          onCreated={({ camera }) => {
            cameraRef.current = camera;
          }}
        >
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
              rotation={[0, 0, 0]} // or your existing rotation
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
            />

            <MoonScene modelRef={modelRef} onSpawnReady={onSpawnReady} />
            <HolographicStatue />
            <PostProcessingEffects />
          </Suspense>
          {/* <TickerDisplay /> */}
        </Canvas>

        {/* {cameraRef.current && controlsRef.current && (
          <CameraGUI cameraRef={cameraRef} controlsRef={controlsRef} />
        )} */}
        {showFloatingViewer && selectedCandleData && (
          <FloatingCandleViewer
            key={selectedCandleData.userName + selectedCandleData.image}
            isVisible={showFloatingViewer}
            userData={selectedCandleData}
            onClose={() => {
              setShowFloatingViewer(false);
              setSelectedCandleData(null);
            }}
          />
        )}
      </div>
      {/* )} */}
    </>
  );
}

export default ThreeDVotiveStand;
