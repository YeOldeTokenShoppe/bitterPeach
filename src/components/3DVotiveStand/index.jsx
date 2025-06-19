// index.jsx
import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense, lazy, forwardRef, useImperativeHandle } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, AdaptiveEvents, BakeShadows } from "@react-three/drei";
import TickerDisplay from "./TickerDisplay";
import { Perf } from "r3f-perf";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
import * as THREE from "three";
import FlyInEffect from "./FlyInEffect";
import { CinematicTransition, TransitionOverlay } from "./CinematicTransition";

import Model from "./Model";
import RocketModel from "./RocketModel";
import MobileCandleOrbital from "./MobileCandleOrbital";

// Lazy load MoonScene for better performance
const LunarLanding = React.lazy(() => import('../LunarLanding'));
const MoonScene = React.lazy(() => import('./MoonLamps'));
// Import Firebase functions
import { getDocs, collection, query } from 'firebase/firestore';
import { db } from '../../utilities/firebaseClient';

// Countdown timer is now integrated into RocketModel


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

import CameraGUI from "./CameraGUI";
import HolographicStatue from "./HolographicStatue";
import PostProcessingEffects from "./PostProcessingEffects";
import ConstellationModel from "./ConstellationModel";
import StarField from "./StarField";
// import FlyInEffect from './FlyInEffect';
import ScrollDetailViewer from "./ScrollDetailViewer";
import MobileCandleMarquee from "./MobileCandleMarquee";
import { useMusic } from "../../contexts/MusicContext";
// import NeonLines from "./NeonLines";
// import NeonLines from "./NeonLinesSimple"; // Temporary test
// import NeonLines from "./NeonLinesFixed"; // Fixed version using Line component
import NeonLines from "./NeonLinesFinal"; // Final optimized version
// import NeonCylinders from "./NeonCylinders"; // New neon cylinders effect - temporarily disabled

// Scene is created internally by React Three Fiber

// Add constants for scale management
const MIN_MODEL_SCALE = 10;
const DEFAULT_MODEL_SCALE = 11;

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
            // backgroundColor: progress >= 1 ? "#4CAF50" : "white",
            transition: "width 0.1s linear",
          }}
        />
      </div>
    </div>
  );
};

// Lazy load scene components

// Create a wrapper component to access the RocketContext


// Track VotiveStand instances
if (!window._votiveStandInstances) {
  window._votiveStandInstances = 0;
}

const ThreeDVotiveStand = forwardRef(({
  setIsLoading,
  isInMarkerView,
  isMobileView,
  isModalOpen,
  setIsModalOpen,
  onSpawnReady,
  is80sMode,
  monsterMode,
  userData,
  rocketModelVisible,
  isConstellationsVisible,
  toggleConstellationVisibility,
  handleIgnition,
  onPaginationChange,
  onCandleViewerStateChange,
  onUIVisibilityChange,
  onSceneChange,
  isMoonShotsEnabled,
}, ref) => {
  // Track instance creation
  const [instanceId] = useState(() => {
    window._votiveStandInstances++;
    const id = `VotiveStand-${window._votiveStandInstances}`;
    console.log(`🎯 ${id} created at ${new Date().toISOString()}`);
    console.log(`🎯 Stack trace:`, new Error().stack);
    return id;
  });
  
  // Log when component unmounts
  useEffect(() => {
    return () => {
      console.log(`🎯 ${instanceId} unmounting`);
    };
  }, [instanceId]);
  
  // Use music context for audio control during transitions
  const { audioRef, isPlaying, setIsPlaying } = useMusic();
  
  // Use music context for showSpotify state
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [viewerCandleIndex, setViewerCandleIndex] = useState(0);
  const [allCandlesData, setAllCandlesData] = useState([]);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false); // Debug overlay toggle
  
  // Debug log viewer state changes and notify parent
  useEffect(() => {

    // Notify parent component of viewer state change
    if (onCandleViewerStateChange) {
      onCandleViewerStateChange(showFloatingViewer);
    }
  }, [showFloatingViewer, onCandleViewerStateChange]);
  const [currentDpr, setCurrentDpr] = useState(1); // Start with lower DPI until we determine device/network
  const [networkType, setNetworkType] = useState("");

  // Add state for hold indicator
  const [holdState, setHoldState] = useState({
    showIndicator: false,
    progress: 0,
  });
  
  // Function to close the floating viewer
  const closeFloatingViewer = useCallback(() => {
    setShowFloatingViewer(false);
    setSelectedCandleData(null);
    setViewerCandleIndex(0);
    setAllCandlesData([]);
  }, []);

  // Add ref for LunarLanding
  const moonSceneRef = useRef();
  const moonsSpawnedRef = useRef(false);
  
  // Store moon spawn state in window to persist across any potential re-renders
  useEffect(() => {
    // Reset moon spawn state when MoonShots is disabled
    if (!isMoonShotsEnabled) {
      moonsSpawnedRef.current = false;
      window._moonsAlreadySpawned = false;
      console.log('🌙 MoonShots disabled, resetting spawn state');
    } else if (window._moonsAlreadySpawned) {
      // Check if moons were already spawned in this session
      moonsSpawnedRef.current = true;
      console.log('🌙 Moons were already spawned in this session, setting ref to true');
    }
    
    console.log('🌙 Component mounted/re-mounted, moonsSpawnedRef initialized to:', moonsSpawnedRef.current, 'isMoonShotsEnabled:', isMoonShotsEnabled);
    return () => {
      console.log('🌙 Component unmounting, moonsSpawnedRef was:', moonsSpawnedRef.current);
      // Store the state globally when unmounting
      if (moonsSpawnedRef.current) {
        window._moonsAlreadySpawned = true;
      }
    };
  }, [isMoonShotsEnabled]);
  
  // Debug log when component re-renders
  useEffect(() => {
    console.log('🌙 Component re-rendered, moonsSpawnedRef.current:', moonsSpawnedRef.current);
    console.log('🌙 is80sMode:', is80sMode);
    console.log('🌙 isMoonShotsEnabled:', isMoonShotsEnabled);
  });

  // Apply crosshair cursor to body when moonshots mode is active
  useEffect(() => {
    if (isMoonShotsEnabled) {
      document.body.classList.add('moonshots-crosshair');
      console.log('🎯 Added moonshots-crosshair class to body');
    } else {
      document.body.classList.remove('moonshots-crosshair');
      console.log('🎯 Removed moonshots-crosshair class from body');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('moonshots-crosshair');
    };
  }, [isMoonShotsEnabled]);

  const [showLunarLanding, setShowLunarLanding] = useState(false);
  const results = useFirestoreResults();
  // const [userData, setUserData] = useState([]);
  // // Add in index.jsx
  const [tooltipData, setTooltipData] = useState([]);

  const [shuffledCandleIndices, setShuffledCandleIndices] = useState([]);
  const [mainGltfAnimations, setMainGltfAnimations] = useState([]); // State for animations

  // Dummy messages for the Alligator Scroll
  const scrollMessages = [
    "Don't bother Saint Gr80, he's meditating.",
    "He seeks the alpha in the delta.",
    "The GatorOracle ponders the next 100x coin.",
    "Beware the rug pull, young frens.",
    "To the moon, or to the swamp? Only Gr80 knows."
  ];
  const [currentScrollMessageIndex, setCurrentScrollMessageIndex] = useState(0);

  // Function to cycle to the next message (can be called by a button in ScrollDetailViewer later)
  const cycleScrollMessage = () => {
    setCurrentScrollMessageIndex(prevIndex => (prevIndex + 1) % scrollMessages.length);
  };

  const [isHovered, setIsHovered] = useState(false);
  const [isMarkerMovement, setIsMarkerMovement] = useState(false);
  const [modelScale, setModelScale] = useState(DEFAULT_MODEL_SCALE);
  const [isScrollDetailVisible, setIsScrollDetailVisible] = useState(false);
  const [detailViewScrollData, setDetailViewScrollData] = useState(null);
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

  // const [isGuiMode, setIsGuiMode] = useState(false); // Moved down
  // const [isMobile, setIsMobile] = useState(false); // Moved down
  // const [guiActive, setGuiActive] = useState(false); // Moved down

  // const [isModelLoaded, setIsModelLoaded] = useState(false); // Moved down
  // const [isChildStatueLoaded, setIsChildStatueLoaded] = useState(false); // Moved down
  // const hasNotifiedParentRef = useRef(false); // Moved down

  // Light helper state
  // const [showLightHelper, setShowLightHelper] = useState(false); // Moved down
  // const [lightPosition, setLightPosition] = useState({ x: 32, y: 33, z: 89 }); // Moved down
  // const [lightIntensity, setLightIntensity] = useState(1); // Moved down
  // const [skyColor, setSkyColor] = useState("#7300ff"); // Moved down
  // const [groundColor, setGroundColor] = useState("#ff0000"); // Moved down

  // All useState hooks should generally be at the top of the component function body.
  // For clarity, I am moving the state declarations relevant to handleHolographicStatueLoad
  // above its definition. The others can also be grouped at the top.

  const [isGuiMode, setIsGuiMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [guiActive, setGuiActive] = useState(false);

  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isChildStatueLoaded, setIsChildStatueLoaded] = useState(false); // Added for internal statue tracking
  const hasNotifiedParentRef = useRef(false); // Add this ref to track notification state

  // Light helper state
  const [showLightHelper, setShowLightHelper] = useState(false);
  const [lightPosition, setLightPosition] = useState({ x: 32, y: 33, z: 89 });
  const [lightIntensity, setLightIntensity] = useState(1);
  const [skyColor, setSkyColor] = useState("#7300ff"); // Sky color in hex format for inputs
  const [groundColor, setGroundColor] = useState("#ff0000"); // Ground color in hex format for inputs

  // Callback for HolographicStatue onLoad - Now defined AFTER setIsChildStatueLoaded is declared
  const handleHolographicStatueLoad = useCallback(() => {
  
    setIsChildStatueLoaded(true);
  }, [setIsChildStatueLoaded]); // setIsChildStatueLoaded is stable

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
    if (isModelLoaded && isChildStatueLoaded && !hasNotifiedParentRef.current) { // Ensure statue is also loaded
      console.log('🚀 Model and statue loaded, preparing to notify parent');
      console.log('🚀 Current is80sMode:', is80sMode);
      console.log('🚀 Current isMoonShotsEnabled:', isMoonShotsEnabled);
      
      // Wait slightly longer than the MoonScene spawn delay before notifying the parent
      const notificationTimer = setTimeout(() => {
        console.log('🚀 Notification timer fired, notifying parent');
        setIsLoading(true); // Notify parent (e.g., BurnGallery)

        // --- UPDATED: Remove automatic moon spawn ---
        // Moons will now be spawned via the MoonShots toggle instead
        // --- End UPDATED ---

        hasNotifiedParentRef.current = true;
      }, 5700); // Keep existing delay for hiding preloader

      // Ensure outer timer is cleared if component unmounts before firing
      return () => clearTimeout(notificationTimer);
    }
  }, [isModelLoaded, isChildStatueLoaded, setIsLoading, is80sMode, isMoonShotsEnabled]); // Keep dependencies, added isChildStatueLoaded

  // Add a fallback timer to ensure loading completes even if there's an issue
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      if (!hasNotifiedParentRef.current) {
       
        setIsLoading(true);
        hasNotifiedParentRef.current = true;
      }
    }, 10000); // Increased fallback to 10 seconds just in case

    return () => clearTimeout(fallbackTimer);
  }, [setIsLoading]);

  // Track previous MoonShots state to detect changes
  const prevMoonShotsEnabledRef = useRef(isMoonShotsEnabled);
  
  // Handle MoonShots toggle - spawn moons when enabled
  useEffect(() => {
    const prevEnabled = prevMoonShotsEnabledRef.current;
    const stateChanged = prevEnabled !== isMoonShotsEnabled;
    
    console.log('🌙 MoonShots useEffect check:', {
      isMoonShotsEnabled,
      prevEnabled,
      stateChanged,
      hasMoonSceneRef: !!moonSceneRef.current,
      moonsSpawned: moonsSpawnedRef.current,
      isModelLoaded,
      is80sMode,
      timestamp: new Date().toISOString()
    });
    
    // Update the previous state ref
    prevMoonShotsEnabledRef.current = isMoonShotsEnabled;
    
    // Only spawn moons if MoonShots changed from false to true
    if (stateChanged && isMoonShotsEnabled === true && moonSceneRef.current && !moonsSpawnedRef.current && isModelLoaded) {
      console.log('🌙 MoonShots changed from OFF to ON - triggering moon spawn');
      console.log('🌙 Current is80sMode:', is80sMode);
      console.log('🌙 Stack trace:', new Error().stack);
      
      moonSceneRef.current.triggerInitialSpawn();
      moonsSpawnedRef.current = true; // Mark as spawned to prevent duplicate spawns
      window._moonsAlreadySpawned = true; // Also set global flag
    } else if (stateChanged && isMoonShotsEnabled === false) {
      console.log('🌙 MoonShots changed from ON to OFF - resetting spawn state');
      moonsSpawnedRef.current = false;
      window._moonsAlreadySpawned = false;
    } else if (stateChanged) {
      console.log('🌙 MoonShots state changed but conditions not met for spawning:');
      console.log('🌙   - stateChanged:', stateChanged);
      console.log('🌙   - isMoonShotsEnabled:', isMoonShotsEnabled);
      console.log('🌙   - has moonSceneRef:', !!moonSceneRef.current);
      console.log('🌙   - moonsSpawnedRef.current:', moonsSpawnedRef.current);
      console.log('🌙   - isModelLoaded:', isModelLoaded);
    }
  }, [isMoonShotsEnabled, isModelLoaded, is80sMode]);

  // Modify the resize handler to ensure scale doesn't go below minimum
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
        const calculatedScale = Math.max(0.8, Math.min(1.2, newWidth / baseWidth));
        
        // Ensure calculated scale * DEFAULT_MODEL_SCALE is at least MIN_MODEL_SCALE
        const finalScale = Math.max(MIN_MODEL_SCALE, calculatedScale * DEFAULT_MODEL_SCALE);
        setModelScale(finalScale);
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

  // Add a safety check in case modelScale somehow gets reset
  useEffect(() => {
    if (modelScale < MIN_MODEL_SCALE) {
      console.warn(`Model scale (${modelScale}) below minimum, resetting to ${DEFAULT_MODEL_SCALE}`);
      setModelScale(DEFAULT_MODEL_SCALE);
    }
  }, [modelScale]);

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
  // NOTE: This effect needs to be moved inside a component that has access to the Three.js scene
  // For now, commenting out to fix the "scene is not defined" error
  /*
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
  */

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
  
    setHoldState(state);
  }, []);

  // Store pagination control function from MobileCandleOrbital
  const [paginationControl, setPaginationControl] = useState(null);

  const handleCandleClick = useCallback(candleData => {

    
    // For mobile view, we need to get all the candle data from MobileCandleOrbital
    if (isMobileView) {
      // Get the full sorted data including mock data (same logic as MobileCandleOrbital)
      let allSortedData;
      if (results && results.length > 0) {
        const realData = [...results]
          .sort((a, b) => (b.burnedAmount || 0) - (a.burnedAmount || 0));
        
        // Add mock data to match MobileCandleOrbital
        const mockData = Array(20).fill(null).map((_, i) => ({
          id: `mock-${i}`,
          userName: `TestUser${i + 1}`,
          username: `TestUser${i + 1}`,
          burnedAmount: Math.floor(Math.random() * 100),
          image: i % 2 === 0 ? '/vvv.jpg' : '/vsClown.jpg'
        }));
        
        allSortedData = [...realData, ...mockData].slice(0, 80);
      } else {
        // Fallback mock data
        allSortedData = Array(80).fill(null).map((_, i) => ({
          id: `mock-${i}`,
          userName: `Player${i + 1}`,
          username: `Player${i + 1}`,
          burnedAmount: Math.floor(Math.random() * 1000),
          image: i % 2 === 0 ? '/vvv.jpg' : '/vsClown.jpg'
        }));
      }
      
      // Find the index based on the candle data
      const clickedIndex = allSortedData.findIndex(item => 
        (item.id === candleData.id) || 
        (item.userName === candleData.userName && item.burnedAmount === candleData.burnedAmount)
      );
      
     
      
      if (clickedIndex !== -1) {
        setViewerCandleIndex(clickedIndex);
        setAllCandlesData(allSortedData);
        
        // Sync the pagination to the correct page
        if (paginationControl) {
          const pageIndex = Math.floor(clickedIndex / 8);
          paginationControl(pageIndex);
        }
      } else {
        // Fallback - set index to 0 if not found
        setViewerCandleIndex(0);
        setAllCandlesData(allSortedData);
      }
    } else {
      // Desktop view or single candle
      setViewerCandleIndex(0);
      setAllCandlesData([candleData]);
    }
    
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  }, [isMobileView, results, paginationControl]);

  // Handle navigation in the candle viewer
  const handleViewerNavigate = useCallback((direction) => {
    if (!allCandlesData || allCandlesData.length === 0) return;
    
    let newIndex = viewerCandleIndex;
    
    if (direction === 'next' && viewerCandleIndex < allCandlesData.length - 1) {
      newIndex = viewerCandleIndex + 1;
    } else if (direction === 'prev' && viewerCandleIndex > 0) {
      newIndex = viewerCandleIndex - 1;
    }
    
    if (newIndex !== viewerCandleIndex) {
      setViewerCandleIndex(newIndex);
      setSelectedCandleData(allCandlesData[newIndex]);
      
      // If in mobile view, update the pagination to match the viewer
      if (isMobileView && onPaginationChange) {
        // Calculate which page this candle is on (8 candles per page)
        const pageIndex = Math.floor(newIndex / 8);
        onPaginationChange(pageIndex);
      }
    }
  }, [viewerCandleIndex, allCandlesData, isMobileView, onPaginationChange]);
  
  // Intercept pagination changes and store the control
  const handlePaginationChange = useCallback((paginationData) => {
    if (paginationData && paginationData.setCurrentPage) {
      setPaginationControl(() => paginationData.setCurrentPage);
    }
    
    // If viewer is open, don't pass pagination changes to parent
    if (showFloatingViewer) {
      return;
    }
    
    // Otherwise, pass through to parent
    if (onPaginationChange) {
      onPaginationChange(paginationData);
    }
  }, [onPaginationChange, showFloatingViewer]);
  
  // Override pagination when viewer is open
  const handleViewerNavigateWithPagination = useCallback((direction) => {
    if (!allCandlesData || allCandlesData.length === 0) return;
    
    let newIndex = viewerCandleIndex;
    
    if (direction === 'next' && viewerCandleIndex < allCandlesData.length - 1) {
      newIndex = viewerCandleIndex + 1;
    } else if (direction === 'prev' && viewerCandleIndex > 0) {
      newIndex = viewerCandleIndex - 1;
    }
    
    if (newIndex !== viewerCandleIndex) {
      setViewerCandleIndex(newIndex);
      setSelectedCandleData(allCandlesData[newIndex]);
      
      // Update the actual pagination to match
      if (paginationControl && isMobileView) {
        const pageIndex = Math.floor(newIndex / 8);
        paginationControl(pageIndex);
      }
    }
  }, [viewerCandleIndex, allCandlesData, isMobileView, paginationControl]);
  
  // Expose viewer navigation to parent if needed
  useEffect(() => {
    if (window) {
      window.candleViewerNavigate = showFloatingViewer ? handleViewerNavigateWithPagination : null;
      window.isCandleViewerOpen = showFloatingViewer;
    }
    
    return () => {
      if (window) {
        delete window.candleViewerNavigate;
        delete window.isCandleViewerOpen;
      }
    };
  }, [showFloatingViewer, handleViewerNavigateWithPagination]);

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

  const [showFlyIn] = useState(false); // setShowFlyIn unused
  const [showTransition, setShowTransition] = useState(false);
  const transitionCallbackRef = useRef(null); // Use ref instead of state for callback
  const [frameloop, setFrameloop] = useState('always'); // 'always' | 'demand' | 'never'
  
  // State to control which scene is active
  const [activeScene, setActiveScene] = useState('gallery'); // 'gallery' or 'moon'
  
  // State for moon scene astronaut data
  const [userHelmetTextures, setUserHelmetTextures] = useState([]);
  const [lunarLandingDataLoaded, setLunarLandingDataLoaded] = useState(false);
  
  const [galleryDisposed, setGalleryDisposed] = useState(false);
  
  // State for UI visibility during transitions
  const [showUI, setShowUI] = useState(true);
  
  // Notify parent when UI visibility changes
  useEffect(() => {
    if (onUIVisibilityChange) {
      onUIVisibilityChange(showUI);
    }
  }, [showUI, onUIVisibilityChange]);
  
  // Notify parent when scene changes
  useEffect(() => {
    if (onSceneChange) {
      onSceneChange(activeScene);
    }
  }, [activeScene, onSceneChange]);
  
  // Helper to load texture from URL with quality options
  const loadImageAsTexture = useCallback((url, options = {}) => {
    return new Promise((resolve) => {
      if (!url) {
        console.warn("loadImageAsTexture: URL is null or undefined.");
        resolve(null);
        return;
      }
      
      const { lowRes = false } = options;
      
      if (lowRes) {
        // Create low-res version using canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const targetSize = 128; // Low-res size
          const scale = Math.min(targetSize / img.width, targetSize / img.height);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const texture = new THREE.CanvasTexture(canvas);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          console.log("Low-res texture created from:", url);
          resolve(texture);
        };
        img.onerror = () => {
          console.error(`Error loading image from ${url}`);
          resolve(null);
        };
        img.src = url;
      } else {
        // Load full resolution
        const loader = new THREE.TextureLoader();
        loader.setCrossOrigin('anonymous');
        loader.load(
          url,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.flipY = false;
            console.log("Texture loaded successfully from:", url);
            resolve(texture);
          },
          undefined,
          (err) => {
            console.error(`Error loading texture from ${url}:`, err);
            resolve(null);
          }
        );
      }
    });
  }, []);
  
  // Function to fetch user data for astronauts with progressive loading
  const fetchUserDataForLunarLanding = useCallback(async (progressive = true) => {
    if (lunarLandingDataLoaded) return; // Already loaded
    
    console.log("🌙 Fetching user data for lunar scene astronauts...");
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.warn("No users found in Firestore");
        setUserHelmetTextures([]);
        setLunarLandingDataLoaded(true);
        return;
      }

      console.log(`🌙 Found ${querySnapshot.docs.length} users, loading images...`);
      
      if (progressive) {
        // First pass: Load low-res textures quickly
        const lowResPromises = querySnapshot.docs.map(async (doc) => {
          const userData = doc.data();
          const imageUrl = userData.imageUrl || userData.profileImageUrl;
          
          if (!imageUrl) {
            console.warn(`User ${doc.id} has no imageUrl`);
            return { userId: doc.id, texture: null, userData, lowRes: true };
          }
          
          const texture = await loadImageAsTexture(imageUrl, { lowRes: true });
          return { userId: doc.id, texture, userData, lowRes: true, imageUrl };
        });

        const lowResResults = await Promise.all(lowResPromises);
        const validLowRes = lowResResults.filter(result => result !== null);
        
        console.log(`🌙 Loaded ${validLowRes.length} low-res textures`);
        setUserHelmetTextures(validLowRes);
        
        // Second pass: Progressively upgrade to high-res
        validLowRes.forEach(async (item, index) => {
          if (item.imageUrl) {
            // Add delay to stagger loading
            setTimeout(async () => {
              const highResTexture = await loadImageAsTexture(item.imageUrl, { lowRes: false });
              if (highResTexture) {
                setUserHelmetTextures(prev => 
                  prev.map(t => 
                    t.userId === item.userId 
                      ? { ...t, texture: highResTexture, lowRes: false }
                      : t
                  )
                );
                console.log(`🌙 Upgraded texture for user ${item.userId} to high-res`);
              }
            }, index * 200); // Stagger by 200ms
          }
        });
      } else {
        // Load all high-res at once (original behavior)
        const texturePromises = querySnapshot.docs.map(async (doc) => {
          const userData = doc.data();
          const imageUrl = userData.imageUrl || userData.profileImageUrl;
          
          if (!imageUrl) {
            console.warn(`User ${doc.id} has no imageUrl`);
            return { userId: doc.id, texture: null, userData };
          }
          
          const texture = await loadImageAsTexture(imageUrl);
          return { userId: doc.id, texture, userData };
        });

        const textureResults = await Promise.all(texturePromises);
        const validTextures = textureResults.filter(result => result !== null);
        
        console.log(`🌙 Successfully loaded ${validTextures.length} helmet textures`);
        setUserHelmetTextures(validTextures);
      }
      
      setLunarLandingDataLoaded(true);
    } catch (error) {
      console.error("Error fetching user data for lunar scene:", error);
      setUserHelmetTextures([]);
      setLunarLandingDataLoaded(true);
    }
  }, [lunarLandingDataLoaded, loadImageAsTexture]);

  // Function to dispose gallery resources
  const disposeGalleryResources = useCallback(() => {
    console.log('🗑️ Disposing gallery resources...');
    
    if (galleryDisposed) return;
    
    // Dispose of candle models and textures
    if (modelRef.current) {
      modelRef.current.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => {
                if (m.map) m.map.dispose();
                m.dispose();
              });
            } else {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose();
            }
          }
        }
      });
    }
    
    setGalleryDisposed(true);
    console.log('✅ Gallery resources disposed');
  }, [galleryDisposed]);

  // Unused function - kept for potential future use
  // const handleLocalIgnition = () => {
  //   setShowFlyIn(true);
  //   // Reset after animation completes
  //   setTimeout(() => {
  //     setShowFlyIn(false);
  //   }, 6000);
  // };

  // Handle scene switching
  const handleSceneSwitch = useCallback((sceneName) => {
    console.log('🎬 Switching to scene:', sceneName);
    if (sceneName === 'moon') {
      setActiveScene('moon');
      setShowLunarLanding(true);
      
      // Start fetching user data for astronauts
      fetchUserDataForLunarLanding(true); // Use progressive loading
      
      // Hide the transition after scene switch
      setTimeout(() => {
        setShowTransition(false);
        // Restore normal frameloop after transition
        setFrameloop('always');
        console.log('🎬 Transition hidden after scene switch');
      }, 500); // Small delay to ensure smooth transition
    } else if (sceneName === 'gallery') {
      setActiveScene('gallery');
      setShowLunarLanding(false);
      setShowUI(true); // Restore UI when returning to gallery
      setFrameloop('always'); // Restore normal frameloop
      console.log('🎬 Returned to gallery scene, UI restored');
    }
  }, [fetchUserDataForLunarLanding]);
  
  // Listen for navigation messages from child components
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'NAVIGATE_TO_GALLERY') {
        console.log('🌍 Received NAVIGATE_TO_GALLERY message, returning to gallery scene');
        
        // If resetState flag is true, reset the rocket/scene state
        if (event.data.resetState) {
          console.log('🔄 Resetting gallery state - showing rocket again');
          // Reset any launch-related state
          setShowTransition(false);
          setShowUI(true);
          // The RocketModel component should automatically show the statue when it's visible
        }
        
        handleSceneSwitch('gallery');
      } else if (event.data.type === 'RESET_ROCKET_STATE') {
        console.log('🚀 Received RESET_ROCKET_STATE message, resetting rocket/statue visibility');
        // This message handler will help ensure the rocket state is reset
        // The actual reset logic should be handled by the RocketModel component
      } else if (event.data.type === 'ASTRONAUT_CUSTOMIZED') {
        console.log('🚀 Received ASTRONAUT_CUSTOMIZED message:', event.data.data);
        // Store the customization data or pass it to the lunar scene
        if (window.astronautCustomization) {
          window.astronautCustomization = event.data.data;
        }
        // You can also dispatch an event for the lunar scene to listen to
        window.dispatchEvent(new CustomEvent('astronaut-customized', {
          detail: event.data.data
        }));
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleSceneSwitch]);

  // Handle transition start from RocketModel
  const handleTransitionStart = useCallback((onComplete) => {
    console.log('🚀 Transition started - RocketModel has already handled countdown');
    
    // DON'T hide UI or change scenes immediately - just prepare for transition
    console.log('🎭 Preparing for transition...');
    
    // Keep audio playing during scene transition
    // The audio should persist across scenes
    console.log('🎵 Keeping audio playing during scene transition');
    
    // Don't change frameloop to 'demand' as it might stop the animation loop
    // Keep it as 'always' to ensure CinematicTransition can animate
    console.log('🎭 Keeping frameloop as always during transition');
    
    // Start the transition effects but keep the scene active
    setShowTransition(true);
    
    // Add a fail-safe timeout to ensure scene switches even if transition callback fails
    setTimeout(() => {
      console.log('🚀 Fail-safe timer triggered after 3 seconds');
      // Force switch to moon scene
      handleSceneSwitch('moon');
    }, 3000); // 3 seconds should be enough for the 2.5s transition
    
    // Call the rocket's callback immediately so it can start fading
    if (typeof onComplete === 'function') {
      console.log('🎭 Calling RocketModel callback to start fade...');
      // Create a new completion callback that will be called when transition peaks
      const transitionPeakCallback = () => {
        console.log('🎭 Transition peak reached - NOW switching scenes');
        
        // NOW is the time to hide UI and switch scenes
        setShowUI(false);
        console.log('🎭 Hiding UI for scene transition');
        
        // This was the original completion logic from RocketModel
        console.log("🚀 Transition peak reached, switching to moon scene...");
        
        // Store transition state in sessionStorage for moon scene
        sessionStorage.setItem('rocketLaunchTransition', JSON.stringify({
          timestamp: Date.now(),
          userData: userData,
          is80sMode: is80sMode
        }));
        
        // Switch to moon scene
        console.log("🚀 Preparing to switch to moon scene...");
        
        // Add a small delay to ensure React Three Fiber cleanup
        setTimeout(() => {
          // Try to force exit from Canvas context first
          console.log("🚀 Attempting to exit Canvas context before navigation...");
          
          // Dispatch a custom event to notify parent components
          window.dispatchEvent(new CustomEvent('rocket-navigation-start', { 
            detail: { destination: '/moon-scene' } 
          }));
          try {
            console.log("🚀 Attempting scene switch after delay...");
            
            // Use the handleSceneSwitch function directly from the component scope
            console.log("🚀 Switching to moon scene using handleSceneSwitch");
            // handleSceneSwitch is defined in the component scope and should be available here
            handleSceneSwitch('moon');
          } catch (syncError) {
            console.error("🚀 Synchronous error during scene switch:", syncError);
            console.error("🚀 Sync error name:", syncError?.name);
            console.error("🚀 Sync error message:", syncError?.message);
            console.log("🚀 Using window.location as ultimate fallback...");
            window.location.href = '/moon-scene';
          }
        }, 100); // 100ms delay
      };
      
      // Store the callback for when transition peaks
      // Use ref to avoid React's closure issues
      transitionCallbackRef.current = transitionPeakCallback;
      
      // Call the rocket's callback to start the fade
      onComplete();
    } else {
      console.error('🎭 ERROR: onComplete is not a function!', onComplete);
    }
    
    // Preload flag texture during transition
    const flagImg = new Image();
    flagImg.crossOrigin = 'anonymous';
    flagImg.onload = () => {
      console.log('🚩 Flag image preloaded during transition');
    };
    flagImg.src = '/flagLogo.jpg';
    
    // Dispose gallery resources during launch (delayed)
    setTimeout(() => {
      disposeGalleryResources();
    }, 1000);
    
    // Start fetching user data
    fetchUserDataForLunarLanding(true);
    
    // Preload LunarLanding component during transition
    import('../LunarLanding').then(() => {
      console.log('🌙 LunarLanding component preloaded');
    }).catch(err => {
      console.error('🌙 Failed to preload LunarLanding:', err);
    });
  }, [disposeGalleryResources, fetchUserDataForLunarLanding, userData, is80sMode, handleSceneSwitch, audioRef, isPlaying, setIsPlaying]);

  // Handle transition completion
  const handleTransitionComplete = useCallback(() => {
    console.log('🎬 handleTransitionComplete called');
    console.log('🎬 Current activeScene:', activeScene);
    console.log('🎬 transitionCallback exists:', !!transitionCallbackRef.current);
    console.log('🎬 transitionCallback type:', typeof transitionCallbackRef.current);
    
    // Always switch to moon scene when transition completes
    console.log('🎬 Switching to moon scene...');
    handleSceneSwitch('moon');
    
    // Also try to execute any stored callback
    if (transitionCallbackRef.current && typeof transitionCallbackRef.current === 'function') {
      console.log('🎬 Also executing stored transition callback...');
      try {
        transitionCallbackRef.current();
      } catch (error) {
        console.error('🎬 Error executing stored callback:', error);
      }
    }
  }, [handleSceneSwitch, activeScene]);
  
  

  // Initialize ref to null. It will be populated by onCreated or a camera component's ref prop.
  const sceneCameraRef = useRef(null); 

  // Effect to log camera changes (for debugging)
  useEffect(() => {
  
  }, [sceneCameraRef.current]);

  useImperativeHandle(ref, () => ({
    closeFloatingViewer: closeFloatingViewer,
    startIntroCameraAnimation: (onZoomCompleteCallback) => {


      const cameraToAnimate = sceneCameraRef.current;

      if (!cameraToAnimate) {
       
        if (typeof onZoomCompleteCallback === 'function') {
          onZoomCompleteCallback(); // Proceed without zoom
        }
        return;
      }

      // Store external controls reference if it exists
      const externalControls = controlsRef.current;
      
      // Temporarily disable external controls if they exist
      if (externalControls && !rocketModelVisible) {
        externalControls.enabled = false;
      }

      
      
      // Store initial values
      const initialPosition = cameraToAnimate.position.clone();
      const initialFov = cameraToAnimate.fov;
      
      // Define target values
      const statueModelCenter = new THREE.Vector3(0, 7, 0);
      const headOffset = 4;
      const lookAtTarget = new THREE.Vector3(
          statueModelCenter.x, 
          statueModelCenter.y + headOffset,
          statueModelCenter.z 
      );
      
      // Calculate a position much closer to the statue but not too close
      const distanceToStatue = initialPosition.distanceTo(statueModelCenter);

      
      // Get direction vector from camera to statue
      const directionToStatue = new THREE.Vector3()
        .subVectors(statueModelCenter, initialPosition)
        .normalize();
      
      // Set target position at 95% of the way toward the statue
      const targetPosition = initialPosition.clone().add(
        directionToStatue.multiplyScalar(distanceToStatue * 0.95)
      );
      
      // Instead of moving all the way to the statue,
      // move partially and then use FOV to create zoom effect
      const targetFov = initialFov * 0.3; // Dramatic zoom effect (lower = more zoom)
      
      // Animation settings
      const animationDuration = 6000; // 6 seconds for even smoother animation
      let startTime = null;
      let animationFrameId = null;

      // Ensure any previous animation is stopped
      if (window.currentCameraAnimationId) {
        cancelAnimationFrame(window.currentCameraAnimationId);
      }

      // Store initial camera up vector to maintain orientation
      const initialUp = cameraToAnimate.up.clone();

      // Initialize film scanline effect variables
      let filmEffectEnabled = false;
      let scanlineIntensity = 0;
      const maxScanlineIntensity = 0.8; // Maximum scanline intensity during transition
      
      // Try to find PostProcessingEffects component to control scanlines
      const updateScanlineEffect = (intensity) => {
        // First check if we can find it through the scene
        const scene = cameraToAnimate.parent;
        if (scene) {
          // Look for PostProcessingEffects component in the scene
          scene.traverse(child => {
            if (child.type === 'PostProcessingEffects' || 
                (child.userData && child.userData.isPostProcessingEffects)) {
              child.filmScanlines = intensity;
              filmEffectEnabled = true;
            }
          });
        }
        
        // If we couldn't find it in the scene, update through window.postProcessingEffects if available
        if (!filmEffectEnabled && window.postProcessingEffects) {
          window.postProcessingEffects.filmScanlines = intensity;
          filmEffectEnabled = true;
        }
        
        // If we still couldn't find it, try to dispatch a custom event
        if (!filmEffectEnabled) {
          const event = new CustomEvent('update-post-processing', {
            detail: { filmScanlines: intensity }
          });
          window.dispatchEvent(event);
          filmEffectEnabled = true;
        }
      };

      const animate = (now) => {
        if (startTime === null) startTime = now;
        const elapsedTime = now - startTime;
        const progress = Math.min(elapsedTime / animationDuration, 1);

        // Custom easing for very slow start and smooth deceleration
        // This will make the camera start very slowly and accelerate gradually
        const easedProgress = cubicBezier(0.05, 0.1, 0.3, 1, progress);
        
        // Interpolate position
        cameraToAnimate.position.lerpVectors(initialPosition, targetPosition, easedProgress);
        
        // Interpolate FOV for zoom effect
        cameraToAnimate.fov = initialFov - (initialFov - targetFov) * easedProgress;
        
        // Maintain camera's up direction to prevent tilting
        cameraToAnimate.up.copy(initialUp);
        
        // Look at target and force the update every frame
        cameraToAnimate.lookAt(lookAtTarget);
        cameraToAnimate.updateProjectionMatrix();
        
        // If external controls exist, update their target
        if (externalControls) {
          externalControls.target.copy(lookAtTarget);
        }
        
        // Film scanline effect handling
        // Apply scanlines gradually in the middle of the animation then fade them out
        if (progress > 0.3 && progress < 0.9) {
          // Ramp up scanline intensity between 30% and 40% of the animation
          if (progress < 0.4) {
            scanlineIntensity = maxScanlineIntensity * ((progress - 0.3) / 0.1);
          } 
          // Hold steady between 40% and 80%
          else if (progress < 0.8) {
            scanlineIntensity = maxScanlineIntensity;
          } 
          // Fade out between 80% and 90%
          else {
            scanlineIntensity = maxScanlineIntensity * (1 - ((progress - 0.8) / 0.1));
          }
          updateScanlineEffect(scanlineIntensity);
        } else if (scanlineIntensity > 0) {
          // Ensure effect is disabled after animation
          scanlineIntensity = 0;
          updateScanlineEffect(0);
        }

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(animate);
          window.currentCameraAnimationId = animationFrameId;
        } else {
         
          window.currentCameraAnimationId = null;
          
          // Ensure scanlines are reset
          updateScanlineEffect(0);
          
          // Re-enable external controls
          if (externalControls && !rocketModelVisible) {

            externalControls.enabled = true;
            externalControls.target.copy(lookAtTarget);
          }
          
          if (typeof onZoomCompleteCallback === 'function') {
            onZoomCompleteCallback();
          }
        }
      };
      
      // Cubic bezier easing function - provides extremely smooth motion
      // Parameters: x1, y1, x2, y2, t
      const cubicBezier = (x1, y1, x2, y2, t) => {
        // The cubic bezier function for t in [0,1]
        const cx = 3 * x1;
        const bx = 3 * (x2 - x1) - cx;
        const ax = 1 - cx - bx;
        
        const cy = 3 * y1;
        const by = 3 * (y2 - y1) - cy;
        const ay = 1 - cy - by;
        
        const bezierX = t => ((ax * t + bx) * t + cx) * t;
        const bezierY = t => ((ay * t + by) * t + cy) * t;
        
        // Newton-Raphson iterations to solve for t
        const sampleSize = 20;
        let tForX = t;
        
        for (let i = 0; i < sampleSize; i++) {
          const currentX = bezierX(tForX) - t;
          if (Math.abs(currentX) < 0.0001) break;
          
          const currentSlope = (bezierX(tForX + 0.0001) - bezierX(tForX)) / 0.0001;
          if (Math.abs(currentSlope) < 0.0001) break;
          
          tForX = tForX - currentX / currentSlope;
        }
        
        return bezierY(tForX);
      };
      
      animationFrameId = requestAnimationFrame(animate);
      window.currentCameraAnimationId = animationFrameId;
    },
    zoomInForTransition: () => {
      return new Promise((resolve) => {

        const cameraToAnimate = sceneCameraRef.current;

        if (!cameraToAnimate) {
       
          resolve(); // Resolve immediately if no camera
          return;
        }

        const externalControls = controlsRef.current;
        if (externalControls && !rocketModelVisible) {
         
          externalControls.enabled = false; // Disable orbit controls during animation
        }

        const initialPosition = cameraToAnimate.position.clone();
        const initialFov = cameraToAnimate.fov;

        // Define a higher target to look at (e.g., slightly above the modelCenter)
        // Assuming modelCenter is available and represents the main point of interest.
        // If modelCenter is not consistently set, you might use a fixed point.
        // For this example, let's aim slightly above the origin (0, Y_OFFSET, 0)
        const Y_OFFSET_LOOKAT = modelCenter.y + 11; // Look 2 units above the model's perceived center y
        const targetLookAtPosition = new THREE.Vector3(modelCenter.x, Y_OFFSET_LOOKAT, modelCenter.z);

        // Define where the camera should move to
        // Closer to the target, and slightly higher
        const targetCameraPosition = new THREE.Vector3(
          initialPosition.x * 0.5, // Move closer on X
          initialPosition.y * 0.7 + 9,  // Move higher and closer on Y
          initialPosition.z * 0.6   // Move closer on Z
        );
        
        // Adjust FOV for a moderate zoom effect along with the position change
        const targetFov = initialFov * 0.05; // Less drastic FOV change, e.g., 30% zoom

        const animationDuration = 4500; // 2.5 seconds for the zoom
        let startTime = null;
        
        const animateZoom = (now) => {
          if (startTime === null) startTime = now;
          const elapsedTime = now - startTime;
          const progress = Math.min(elapsedTime / animationDuration, 1);
          
          const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out

          // Animate camera position
          cameraToAnimate.position.lerpVectors(initialPosition, targetCameraPosition, easedProgress);
          
          // Animate FOV
          cameraToAnimate.fov = initialFov - (initialFov - targetFov) * easedProgress;
          
          // Update camera to look at the higher target
          cameraToAnimate.lookAt(targetLookAtPosition);
          cameraToAnimate.updateProjectionMatrix();

          // If external controls exist, ensure their target is also updated (though they are disabled)
          if (externalControls) {
            externalControls.target.copy(targetLookAtPosition);
          }

          if (progress < 1) {
            requestAnimationFrame(animateZoom);
          } else {
          
            // OrbitControls remain disabled, as the next scene will take over.
            resolve();
          }
        };
        requestAnimationFrame(animateZoom);
      });
    }
  }), [sceneCameraRef, controlsRef, modelCenter, rocketModelVisible]); // Added modelCenter and rocketModelVisible to dependencies

  return (
    <div 
      style={{ width: "100%", height: "100vh", position: "relative" }}>
      <Canvas
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: activeScene === 'gallery' ? 1 : 0,
          pointerEvents: activeScene === 'gallery' ? 'auto' : 'none',
          transition: 'opacity 0.5s ease-in-out'
        }}
        dpr={currentDpr}
        performance={{ min: 0.5 }}
        frameloop={frameloop}
        gl={{ 
          alpha: true,
          antialias: true,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
          depth: true,
          stencil: false
        }}
        onCreated={({ gl, camera: createdCamera }) => {
          sceneCameraRef.current = createdCamera;
          // rendererRef.current = gl; // Assuming rendererRef is defined elsewhere
          
          // Configure the renderer
          gl.setClearColor(0x000000, 0);
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }}
      >
        {/* {!isMobile && <AdaptiveDpr pixelated />} */}
        <AdaptiveEvents />
        <BakeShadows />
        {/* <Perf position="top-left" showGraph={true} chart={true} /> */}

        <Model
          scale={Math.max(modelScale, MIN_MODEL_SCALE)} // Additional safety check
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
          monsterMode={monsterMode}
          rocketModelVisible={rocketModelVisible}
          onHoldStateChange={handleHoldStateChange}
          isMobileView={isMobileView}
          onModelDataLoaded={({ animations }) => { // Callback to get animations
            // modelRef.current is already being set by the <primitive> in Model.jsx
            // using the ref prop. We just need the animations here.
         
            setMainGltfAnimations(animations || []);
          }}
        />

        {/* Remove the conditional rendering - don't tie to is80sMode */}
        {/* Only render if explicitly enabled later */}
        {/* Hide candles when rocket is visible */}
        {isMobileView && isModelLoaded && !rocketModelVisible && (
    <Suspense fallback={null}>
      <MobileCandleOrbital
        candleData={results}
        onCandleClick={handleCandleClick}
        modelRef={modelRef}
        onPaginationChange={handlePaginationChange}
        isViewerOpen={showFloatingViewer}
      />
    </Suspense>
  )}
        <Suspense fallback={null}>
          <MoonScene
            ref={moonSceneRef}
            modelRef={modelRef}
            modelAnimations={mainGltfAnimations}
            onSpawnReady={onSpawnReady}
            rocketModelVisible={rocketModelVisible}
            isMobileView={isMobileView}
            isMoonShotsEnabled={isMoonShotsEnabled}
            onControlsCreated={(controls) => {
       
              controlsRef.current = controls;
            }}
            scrollMessage={scrollMessages[currentScrollMessageIndex]}
            onOpenScrollDetail={(data) => {
            
              // Select a random message from the scrollMessages array
              const randomIndex = Math.floor(Math.random() * scrollMessages.length);
              const randomMessage = scrollMessages[randomIndex];
              
              setDetailViewScrollData({
                ...data, // Spread original data (name, modelPath, animation info)
                message: randomMessage // Use randomly selected message
              });
              
              setIsScrollDetailVisible(true);
            }}
          />
        </Suspense>

        {/* Conditionally render HolographicStatue or RocketModel based on monsterMode */}
        <Suspense fallback={null}>
          {/* Only render RocketModel when BOTH conditions are met to prevent duplicates */}
          {console.log(`🎯 [${instanceId}] Rocket render check: monsterMode=${monsterMode}, rocketModelVisible=${rocketModelVisible}, will render=${monsterMode && rocketModelVisible}`)}
          {monsterMode && rocketModelVisible ? (
            <RocketModel 
              key="main-rocket-model" 
              is80sMode={is80sMode} 
              userData={userData} 
              onTransitionStart={handleTransitionStart} 
              onSceneSwitch={handleSceneSwitch} 
            />
          ) : !monsterMode ? (
            <HolographicStatue
              isInMarkerView={isInMarkerView}
              isMobileView={isMobileView}
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              onSpawnReady={onSpawnReady}
              is80sMode={is80sMode}
              userData={userData}
              onLoad={handleHolographicStatueLoad} // Use the memoized callback
            />
          ) : null}
        </Suspense>
        <Suspense fallback={null}>
          {!isMobileView && <TickerDisplay modelRef={modelRef} />}
        </Suspense>
        <Suspense fallback={null}>
          <PostProcessingEffects is80sMode={is80sMode} />
        </Suspense>

        {/* Add the constellation model before the star field */}
        <Suspense fallback={null}>
          <ConstellationModel 
            isVisible={isConstellationsVisible} 
            groupScale={[30, 30, 30]} // Original scale for 3DVotiveStand
            groupPosition={[0, 0, -300]} // Original position for 3DVotiveStand
          />
        </Suspense>

        {/* Add NeonLines effect for 80s mode */}
        {/* <Suspense fallback={null}>
          <NeonLines 
            enabled={is80sMode && !monsterMode && !rocketModelVisible} 
            linesAmount={is80sMode ? 12 : 0}
          />
        </Suspense> */}
        
        {/* Add NeonCylinders effect for enhanced 80s mode - temporarily disabled */}
        {/* <Suspense fallback={null}>
          <NeonCylinders 
            enabled={is80sMode && !monsterMode && !rocketModelVisible} 
            count={is80sMode ? 50 : 0}
          />
        </Suspense> */}

        {/* Render the stars last */}
        <Suspense fallback={null}>
          <StarField is80sMode={is80sMode} />
        </Suspense>

        {showFlyIn && <FlyInEffect cameraRef={cameraRef} controlsRef={controlsRef} />}
        
        {/* Cinematic transition effect */}
        <CinematicTransition 
          active={showTransition} 
          onComplete={() => {
            console.log('🎬 CinematicTransition onComplete triggered');
            console.log('🎬 showTransition state:', showTransition);
            console.log('🎬 activeScene state:', activeScene);
            handleTransitionComplete();
          }}
          type="warp"
        />
      </Canvas>

      {/* Moon Scene - rendered when rocket launch completes */}
      {showLunarLanding && (
        <Suspense fallback={<div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', zIndex: 11 }}></div>}>
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            zIndex: activeScene === 'moon' ? 10 : -1,
            opacity: activeScene === 'moon' ? 1 : 0,
            transition: 'opacity 1s ease-in-out',
            backgroundColor: 'black' // Add black background to ensure visibility
          }}>
            {console.log('🌙 Rendering LunarLanding wrapper div')}
            {console.log('🌙 Passing userHelmetTextures:', userHelmetTextures.length)}
            
            {/* Show loading indicator for astronaut data */}
            {!lunarLandingDataLoaded && (
              <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                background: 'rgba(0,0,0,0.7)',
                padding: '10px 20px',
                borderRadius: '5px',
                zIndex: 100
              }}>
                Loading astronaut data...
              </div>
            )}
            
            <LunarLanding 
              userHelmetTextures={userHelmetTextures} 
              currentUser={userData}
              onSceneReady={() => {
                console.log('🌙 Moon scene ready');
              }}
            />
          </div>
        </Suspense>
      )}


      {/* ScrollDetailViewer is rendered here, as a sibling to the main Canvas */}
      {isScrollDetailVisible && detailViewScrollData && (
        <ScrollDetailViewer
          isVisible={isScrollDetailVisible}
          scrollData={detailViewScrollData}
          onClose={() => {
            setIsScrollDetailVisible(false);
            setDetailViewScrollData(null);
            // Trigger the in-scene scroll to close and hide
            if (moonSceneRef.current?.closeInSceneScroll) {
              moonSceneRef.current.closeInSceneScroll();
            }
            // Optional: Cycle message when detail view is closed if you want it to change next time
            // cycleScrollMessage(); 
          }}
        />
      )}

      {/* FloatingCandleViewer goes here, outside the Canvas */}
      {showFloatingViewer && selectedCandleData && (
        <FloatingCandleViewer
          key={`candle-viewer-${selectedCandleData.candleId}-${selectedCandleData.candleTimestamp}`}
          isVisible={showFloatingViewer}
          userData={selectedCandleData}
          onClose={closeFloatingViewer}
        />
      )}
      
      {/* HTML transition overlay */}
      <TransitionOverlay active={showTransition} />
    </div>
  );
});

// Correct way to memoize a forwardRef component:
const MemoizedThreeDVotiveStand = React.memo(ThreeDVotiveStand);

// Ensure the default export is the one you intend to use (likely the memoized one)
export default MemoizedThreeDVotiveStand;

// Add display name for ESLint
ThreeDVotiveStand.displayName = "ThreeDVotiveStand";

