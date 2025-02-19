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
import { OrbitControls, Center, useHelper } from "@react-three/drei";
import { Scene, SpotLight, DirectionalLight, PointLight } from "three";
import { Perf } from "r3f-perf";
import { RectAreaLightHelper } from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import PostProcessingEffects from "./PostProcessingEffects";
import * as THREE from "three";
import gsap from "gsap";
import Model from "./Model";
import { DEFAULT_MARKERS } from "./markers";
// import { DEFAULT_CAMERA, getCameraSettings } from "./defaultCamera";
// In your Canvas component
import { getCameraConfig, getScreenCategory } from "./cameraConfig";
import { CONTROL_SETTINGS } from "./controlSettings";
import { Annotations, ANNOTATION_SETTINGS } from "./annotations";
import { MODEL_SETTINGS } from "./modelConfig";
// import { getScreenCategory } from "./screenCategories";
import { Box } from "@chakra-ui/react";
// import CameraGUI from "./CameraGUI";
import { PerspectiveCamera } from "@react-three/drei";
import RoomWalls from "./RoomWalls";
import dynamic from "next/dynamic";
import styled from "styled-components";
import { candleShader } from "./shaders/videoShaders";
import { SCREEN_VIEWS, BUTTON_MESSAGES } from "./modelUtilities";
import { screenStateManager } from "./modelUtilities";
import { ScreenAnnotation } from "./screenAnnotations";
import FlyInEffect from "./FlyInEffect";
import { debounce } from "lodash";
import MobileModel from "./MobileModel";
import TickerDisplay from "./TickerDisplay";
import { db } from "../../utilities/firebaseClient";
import TourCamera from "./TourCamera";
import MoonScene from "./MoonLamps";

import CameraGUI from "./CameraGUI";
import { TooltipContainer } from "../UserTooltip";
import FloatingCandleViewer from "./CandleInteraction";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import HolographicStatue from "./HolographicStatue";
import FloatingPhoneViewer from "./FloatingPhoneViewer";
import { Computers, Instances } from "./Computers";
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
}) {
  const [userData, setUserData] = useState([]);
  // Add in index.jsx
  const [tooltipData, setTooltipData] = useState([]);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [results, setResults] = useState([]);
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
  const sceneRef = useRef(new Scene());
  const canvasRef = useRef();
  const scene = new THREE.Scene();
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
  const [showPhoneViewer, setShowPhoneViewer] = useState(false);
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [selectedCandle, setSelectedCandle] = useState(null);
  const panelRef = useRef();

  const togglePanel = () => {
    panelRef.current?.togglePanel();
  };

  const [isGuiMode, setIsGuiMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [guiActive, setGuiActive] = useState(false);

  // const screenCategory = getScreenCategory();
  // const cameraSettings = getCameraConfig();

  // Access the camera settings safely
  // const defaultPosition = cameraSettings.position;
  // const defaultTarget = cameraSettings.target;
  // const initialPosition = new THREE.Vector3(...cameraSettings.position);
  // const initialTarget = new THREE.Vector3(...cameraSettings.target);
  // const resetTimeline = gsap.timeline();

  // const pointsOfInterest = [
  //   { position: [-2.8, 6.21, 36.9], lookAt: [-2.4, 9.7, 3] },
  //   { position: [0.32, 2.64, 4.93], lookAt: [1.8, 3, 1.8] },
  //   { position: [0.32, 2.64, 4.93], lookAt: [1.8, 3, 1.8] },
  //   { position: [-2.8, 6.21, 36.9], lookAt: [-2.4, 9.7, 3] },
  // ];

  // Add mobile detection logic
  // useEffect(() => {
  //   const checkMobile = () => {
  //     const mobile = window.innerWidth <= 576; // You can adjust this breakpoint
  //     setIsMobile(mobile);
  //     setModelScale(mobile ? 5 : 7); // Adjust scale for mobile if needed
  //   };

  //   // Initial check
  //   checkMobile();

  //   // Add event listener for window resize
  //   window.addEventListener("resize", checkMobile);

  //   // Cleanup
  //   return () => window.removeEventListener("resize", checkMobile);
  // }, []);
  // console.log("Initial camera settings:", {
  //   screenCategory,
  //   settings: cameraSettings,
  // });

  useEffect(() => {
    const handleResize = () => {
      // Get new settings directly from config
      const newSettings = getCameraConfig();

      if (cameraRef.current && controlsRef.current) {
        // Create Vector3s for precise position handling
        const newPosition = new THREE.Vector3(...newSettings.position);
        const newTarget = new THREE.Vector3(...newSettings.target);

        // Update camera position and settings
        cameraRef.current.position.copy(newPosition);
        cameraRef.current.fov = newSettings.fov;
        cameraRef.current.near = newSettings.near;
        cameraRef.current.far = newSettings.far;
        cameraRef.current.updateProjectionMatrix();

        // Update controls with new settings
        controlsRef.current.target.copy(newTarget);
        controlsRef.current.minDistance = newSettings.minDistance;
        controlsRef.current.maxDistance = newSettings.maxDistance;
        controlsRef.current.minPolarAngle = newSettings.minPolarAngle;
        controlsRef.current.maxPolarAngle = newSettings.maxPolarAngle;
        controlsRef.current.enablePan = newSettings.enablePan;
        controlsRef.current.enableZoom = newSettings.enableZoom;
        controlsRef.current.update();

        console.log("Resize - Updated camera settings:", {
          position: newPosition.toArray(),
          target: newTarget.toArray(),
          fov: newSettings.fov,
        });
      }
    };

    // Debounce the resize handler
    const debouncedResize = debounce(handleResize, 250);

    window.addEventListener("resize", debouncedResize);
    return () => {
      window.removeEventListener("resize", debouncedResize);
    };
  }, []); // Empty dependency array since we're not tracking screen category

  useEffect(() => {
    const loadThreeJSScene = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate 3D scene load
      setIsLoading(true); // Notify parent that 3D scene is loaded
    };
    loadThreeJSScene();
  }, [setIsLoading]);
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = !showFloatingViewer;
    }

    if (showFloatingViewer) {
      setIsAnnotationVisible(false);
      document.body.style.pointerEvents = "none"; // 🚨 Disables all clicks
    } else {
      setTimeout(() => {
        document.body.style.pointerEvents = "auto"; // ✅ Restore interactions
      }, 50);
    }
  }, [showFloatingViewer]);

  const handleCandleSelect = (candleData) => {
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  };

  useEffect(() => {
    const q = query(collection(db, "results"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedResults = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        userName: doc.data().userName || "Anonymous",
        image: doc.data().image,
        message: doc.data().message,
        burnedAmount: doc.data().burnedAmount || 1,
      }));
      setResults(fetchedResults);
      const indices = Array.from({ length: 40 }, (_, i) => i + 1);
      const shuffled = indices
        .slice(0, fetchedResults.length)
        .sort(() => Math.random() - 0.5);
      setShuffledCandleIndices(shuffled);
    });
    return () => unsubscribe();
  }, []);

  // useEffect(() => {
  //   if (!cameraRef.current || !controlsRef.current) return;

  //   // Add a small delay to ensure initial setup is complete
  //   const timeoutId = setTimeout(() => {
  //     console.log("Camera initialization effect running");
  //     const position = [-4.8, 20, 39.8];
  //     const target = [-2.4, 15.8, 0];

  //     cameraRef.current.position.set(...position);
  //     cameraRef.current.updateProjectionMatrix();

  //     controlsRef.current.target.set(...target);
  //     controlsRef.current.update();

  //     console.log(
  //       "Camera position after initialization:",
  //       cameraRef.current.position
  //     );
  //     console.log(
  //       "Camera target after initialization:",
  //       controlsRef.current.target
  //     );
  //   }, 100);

  //   return () => clearTimeout(timeoutId);
  // }, []); // Empty dependency array - run only once

  const handleGuiStart = (panel) => {
    if (controlsRef.current) {
      const guiSettings = CONTROL_SETTINGS.guiMode;
      Object.assign(controlsRef.current, guiSettings);
    }
    setIsGuiMode(panel); // Track which panel activated GUI mode
  };

  const handleGuiEnd = () => {
    if (controlsRef.current) {
      const defaultSettings = CONTROL_SETTINGS.default;
      Object.assign(controlsRef.current, defaultSettings);
    }
    setIsGuiMode(false);
  };

  // Animate function for billboarding
  useEffect(() => {
    // Ensure canvasRef and scene exist before creating renderer
    if (!canvasRef.current) return;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    rendererRef.current = renderer;

    const animate = () => {
      requestAnimationFrame(animate);

      // Billboard logic
      if (sceneRef.current && cameraRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.userData.isBillboard) {
            object.lookAt(cameraRef.current.position);
          }
        });
      }

      // Render scene
      if (rendererRef.current && cameraRef.current) {
        rendererRef.current.render(scene, cameraRef.current);
      }
    };

    animate();

    return () => {
      renderer.dispose();
    };
  }, [canvasRef.current]); // Depend only on canvas existence
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
  const handlePointerMove = (event) => {
    if (!camera || !modelRef.current) return;

    // Get normalized coordinates from the event
    const mouse = new THREE.Vector2(
      (event.offsetX / event.target.clientWidth) * 2 - 1,
      -(event.offsetY / event.target.clientHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    // Only handle hover effects here
    const interactiveObjects = [];
    modelRef.current.traverse((object) => {
      if (
        (object.isMesh && object.name.startsWith("Screen")) ||
        (object.isMesh && object.parent?.name.includes("Screen")) ||
        object.name.startsWith("Keyboard") ||
        object.isMarker ||
        object.parent?.isMarker ||
        object.name.startsWith("VCANDLE") ||
        object.name === "Console"
      ) {
        interactiveObjects.push(object);
      }
    });

    const intersects = raycaster.intersectObjects(interactiveObjects, true);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object;
      console.log("Hovering over:", hitObject.name); // Debug log
      document.body.style.cursor = "pointer";
    } else {
      document.body.style.cursor = "auto";
    }
  };

  const getCameraView = (view, currentCategory) => {
    try {
      // Get default settings for fallback
      const defaultSettings = getCameraSettings(currentCategory);

      // Check if view and cameraView exist
      if (!view?.cameraView) {
        return {
          position: defaultSettings.position,
          target: defaultSettings.target,
          fov: defaultSettings.fov,
        };
      }

      // Get category-specific view settings
      const categoryView = view.cameraView[currentCategory];

      // If no settings exist for current category, try fallback to desktop-medium
      if (!categoryView) {
        console.warn(
          `No camera settings for category ${currentCategory}, falling back to desktop-medium`
        );
        const fallbackView = view.cameraView["desktop-medium"];

        if (!fallbackView) {
          return {
            position: defaultSettings.position,
            target: defaultSettings.target,
            fov: defaultSettings.fov,
          };
        }

        // Handle function or direct value
        return {
          position:
            fallbackView.position instanceof Function
              ? fallbackView.position()
              : fallbackView.position,
          target:
            fallbackView.target instanceof Function
              ? fallbackView.target()
              : fallbackView.target,
          fov: fallbackView.fov ?? defaultSettings.fov,
        };
      }

      // Return the view for current category
      return {
        position:
          categoryView.position instanceof Function
            ? categoryView.position()
            : categoryView.position,
        target:
          categoryView.target instanceof Function
            ? categoryView.target()
            : categoryView.target,
        fov: categoryView.fov ?? defaultSettings.fov,
      };
    } catch (error) {
      console.error("Error getting camera view:", error);
      // Final fallback to default camera settings
      const safeSettings = getCameraSettings("desktop-medium");
      return {
        position: safeSettings.position,
        target: safeSettings.target,
        fov: safeSettings.fov,
      };
    }
  };

  const moveCamera = (view, markerIndex = null) => {
    setIsMarkerMovement(true);
    if (!view) {
      console.error("Invalid view data:", view);
      return;
    }

    const currentCategory = screenCategory || "desktop-medium";
    console.log("Move Camera - Category:", currentCategory);
    console.log(
      "Move Camera - Position:",
      view.annotationPosition?.[currentCategory]
    );

    // Get camera view settings
    const cameraView = getCameraView(view, currentCategory);
    if (!cameraView) {
      console.error("Failed to get camera view");
      return;
    }
    onCameraMove();

    onCameraMove();

    setActiveAnnotation({
      text: view.description,
      position: {
        screen: {
          xPercent:
            view.annotationPosition?.[currentCategory]?.xPercent ??
            ANNOTATION_SETTINGS.defaultScreenPosition.xPercent,
          yPercent:
            view.annotationPosition?.[currentCategory]?.yPercent ??
            ANNOTATION_SETTINGS.defaultScreenPosition.yPercent,
        },
      },
      fromScreen: view.fromScreen,
      buttons: view.buttons,
      extraButton: view.extraButton,
    });

    setIsAnnotationVisible(view.showAnnotation ?? true);

    const masterTimeline = gsap.timeline();
    controlsRef.current.autoRotate = false;

    masterTimeline
      .to(
        camera.position,
        {
          x: cameraView.position.x,
          y: cameraView.position.y,
          z: cameraView.position.z,
          duration: 1.5,
          ease: "power2.inOut",
        },
        0
      )
      .to(
        controlsRef.current.target,
        {
          x: cameraView.target.x,
          y: cameraView.target.y,
          z: cameraView.target.z,
          duration: 1.5,
          ease: "power2.inOut",
        },
        0
      )
      .to(
        camera,
        {
          fov: cameraView.fov,
          duration: 1.5,
          ease: "power2.inOut",
        },
        0
      );

    // Rest of your timeline setup...
    masterTimeline.eventCallback("onUpdate", () => {
      controlsRef.current.update();
      camera.updateProjectionMatrix();
    });
    masterTimeline.eventCallback("onComplete", () => {
      setIsMarkerMovement(false);
    });
  };

  const resetCamera = () => {
    if (!camera || !controlsRef.current) return;

    // Hide annotation first
    setIsAnnotationVisible(false);
    setActiveAnnotation(null);

    const cameraSettings =
      DEFAULT_CAMERA[screenCategory] || DEFAULT_CAMERA["desktop-medium"];

    const resetTimeline = gsap.timeline();

    resetTimeline
      .to(
        camera.position,
        {
          x: cameraSettings.position[0],
          y: cameraSettings.position[1],
          z: cameraSettings.position[2],
          duration: 1.5,
          ease: "power2.inOut",
        },
        0
      )
      .to(
        controlsRef.current.target,
        {
          x: cameraSettings.target[0],
          y: cameraSettings.target[1],
          z: cameraSettings.target[2],
          duration: 1.5,
          ease: "power2.inOut",
        },
        0
      )
      .to(
        camera,
        {
          fov: cameraSettings.fov,
          duration: 1.5,
          ease: "power2.inOut",
        },
        0
      );

    resetTimeline.eventCallback("onUpdate", () => {
      camera.updateProjectionMatrix();
      controlsRef.current.autoRotate = true;
    });
  };
  // const getCameraConfig = (category) => {
  //   if (!DEFAULT_CAMERA[category]) {
  //     console.warn(
  //       `Invalid category: ${category}. Falling back to desktop-medium.`
  //     );
  //     category = "desktop-medium";
  //   }

  //   const settings = DEFAULT_CAMERA[category];
  //   return {
  //     position: settings.position,
  //     target: settings.target,
  //     fov: settings.fov,
  //     near: DEFAULT_CAMERA.common.near,
  //     far: DEFAULT_CAMERA.common.far,
  //   };
  // };

  const lastCameraPosition = useRef(null);
  const lastFOV = useRef(null);

  return (
    <>
      {/* {isMobileView ? (
        // Mobile version - much simpler Canvas setup
        <Canvas
          id="three-canvas"
          style={{
            width: "100vw",
            height: "100vh",
            maxWidth: "1400px",
            maxHeight: "none",
          }}
          onCreated={({ camera }) => {
            console.log(
              "Canvas onCreated - Initial camera position:",
              camera.position.toArray()
            );
            cameraRef.current = camera;
            setCamera(camera);
          }}
        >
          <MobileModel
            onScreenClick={onScreenClick}
            scale={modelScale}
            setTooltipData={setTooltipData}
          />
        </Canvas>
      ) : ( */}
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
          id="three-canvas"
          shadows
          // camera={{
          //   fov: cameraSettings.fov,
          //   near: cameraSettings.near,
          //   far: cameraSettings.far,
          //   position: cameraSettings.position,
          // }}
          camera={{
            fov: 40,
            position: [0, 20, 35],
            near: 0.1,
            far: 500,
          }}
          onCreated={({ camera, gl }) => {
            console.log("Canvas created - Setting initial camera position");
            cameraRef.current = camera;
            setCamera(camera);

            // Force exact position
            // camera.position.copy(initialPosition);
            camera.updateProjectionMatrix();

            console.log(
              "Camera position after initialization:",
              camera.position.toArray()
            );

            // Set up controls with exact target
            if (controlsRef.current) {
              // controlsRef.current.target.copy(initialTarget);
              controlsRef.current.update();

              // Log final state
              console.log("Camera and controls initialized:", {
                position: camera.position.toArray(),
                target: controlsRef.current.target.toArray(),
                fov: camera.fov,
              });
            }
          }}
          gl={{
            alpha: true,
            antialias: true,
            logarithmicDepthBuffer: true,
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
              // url="/nyseMiniplus.glb"
              scale={modelScale}
              setIsLoading={setIsLoading}
              controlsRef={controlsRef}
              modelRef={modelRef}
              handlePointerMove={handlePointerMove}
              setCamera={setCamera}
              setMarkers={setMarkers}
              markers={markers}
              userData={userData}
              moveCamera={moveCamera}
              setTooltipData={setTooltipData}
              directionalLightRef={directionalLightRef}
              ambientLightRef={ambientLightRef}
              hemisphereLightRef={hemisphereLightRef}
              showFloatingViewer={showFloatingViewer}
              setShowFloatingViewer={setShowFloatingViewer}
              setShowPhoneViewer={setShowPhoneViewer}
              setSelectedCandle={setSelectedCandle}
              onCandleSelect={handleCandleSelect}
              // onButtonClick={handleClick}
              setShowSpotify={setShowSpotify}
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
            />
            {/* use this version only when using gui */}

            {/* <OrbitControls
              ref={controlsRef}
              makeDefault
              // target={initialTarget}
              enableDamping={false}
              // minDistance={cameraSettings.minDistance}
              // maxDistance={cameraSettings.maxDistance}
              // minPolarAngle={cameraSettings.minPolarAngle}
              // maxPolarAngle={cameraSettings.maxPolarAngle}
              // enablePan={cameraSettings.enablePan}
              // enableZoom={cameraSettings.enableZoom}
              onChange={() => {
                // Log any changes to camera position
                // if (cameraRef.current && controlsRef.current) {
                //   console.log("Camera state changed:", {
                //     position: cameraRef.current.position.toArray(),
                //     target: controlsRef.current.target.toArray(),
                //   });
                // }
              }}
            /> */}

            <MoonScene
              modelRef={modelRef}
              // onControlsCreated={handleControlsCreated}
              initialTarget={[0, 14.6, 0]} // Your GUI-determined values
            />
            <HolographicStatue />
            <PostProcessingEffects />
          </Suspense>
          {/* <TickerDisplay /> */}
        </Canvas>
        {guiActive && (
          <CameraGUI
            cameraRef={cameraRef}
            controlsRef={controlsRef}
            onGuiStart={() => console.log("GUI started")}
            onGuiEnd={() => console.log("GUI ended")}
          />
        )}
        {selectedCandleData && (
          <FloatingCandleViewer
            isVisible={showFloatingViewer}
            onClose={() => {
              setShowFloatingViewer(false);
              setSelectedCandleData(null);
            }}
            userData={selectedCandleData}
            key={selectedCandleData?.image}
          />
        )}
        <FloatingPhoneViewer
          isVisible={showPhoneViewer}
          onClose={() => setShowPhoneViewer(false)}
        />

        {activeAnnotation && activeAnnotation.fromScreen
          ? {
              /* <ScreenAnnotation
            text={activeAnnotation.text}
            isVisible={isAnnotationVisible}
            setIsVisible={setIsAnnotationVisible}
            position={activeAnnotation.position}
            onReset={() => {
              const marker3View = markers[2];
              moveCamera(marker3View, 2);
              onResetView();
            }}
            containerSize={size}
            camera={camera}
            screenName={activeAnnotation.screenName}
          /> */
            }
          : activeAnnotation && (
              <Annotations
                text={activeAnnotation.text}
                isResetVisible={isResetVisible}
                isVisible={isAnnotationVisible}
                setIsVisible={setIsAnnotationVisible}
                position={activeAnnotation.position}
                onReset={resetCamera}
                onMoveCamera={onCameraMove}
                containerSize={size}
                camera={camera}
                buttons={activeAnnotation?.buttons}
                extraButton={activeAnnotation?.buttons?.extraButton}
                screenCategory={screenCategory}
                primary
              />
            )}
      </div>
      {/* )} */}
    </>
  );
}

export default ThreeDVotiveStand;
