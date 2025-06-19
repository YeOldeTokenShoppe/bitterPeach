"use client";
import React, {
  useEffect,
  useState,
  useCallback,
  Suspense,
  useRef,
  memo,
} from "react";
import { useRouter } from "next/router";
import {
  Accordion,
  Avatar,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Link,
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Text,
  Grid,
  GridItem,
  Badge,
  Stat,
  StatGroup,
  StatLabel,
  StatNumber,
  StatHelpText,
} from "@chakra-ui/react";
import AnimatedRadioButtons from "./3DVotiveStand/CyberButtons";

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import { db, auth } from "../utilities/firebaseClient";
import dynamic from "next/dynamic";
import { resolveMethod, createThirdwebClient, getContract } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import { utils, ethers } from "ethers";
import styled from "styled-components";
import Candle from "../components/Candle";
import { useUser, useClerk } from "@clerk/nextjs";
import { Canvas } from "@react-three/fiber";
import { getUserImageUrl, getUsername, createUserData } from "../utilities/clerkHelpers";
import { useMusic } from "../contexts/MusicContext";

import ThreeDVotiveStand from "./3DVotiveStand/index";

import Communion3 from "./Communion3";

import Model from "./3DVotiveStand/Model";
import * as THREE from "three";
import MobileSidePanel from "./MobileSidePanel";
import SidePanelEnhanced from "./SidePanelEnhanced";

const BurnModal = dynamic(() => import("./BurnModal"), {
  ssr: false,
});

const infuraKey = process.env.NEXT_PUBLIC_INFURA_KEY;
const provider = new ethers.providers.JsonRpcProvider(
  `https://sepolia.infura.io/v3/${infuraKey}`
);

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

const client = createThirdwebClient({ clientId: CLIENT_ID });

const contract = getContract({
  client: client,
  chain: defineChain(11155111),
  address: "0xde7Cc5B93e0c1A2131c0138d78d0D0a33cc36e42",
});

// Memoize child components with deep comparison for props
const MemoizedThreeDVotiveStand = memo(ThreeDVotiveStand, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.isInMarkerView === nextProps.isInMarkerView &&
    prevProps.isMobileView === nextProps.isMobileView &&
    prevProps.isModalOpen === nextProps.isModalOpen &&
    prevProps.is80sMode === nextProps.is80sMode &&
    prevProps.monsterMode === nextProps.monsterMode &&
    prevProps.rocketModelVisible === nextProps.rocketModelVisible &&
    prevProps.isConstellationsVisible === nextProps.isConstellationsVisible &&
    prevProps.isMoonShotsEnabled === nextProps.isMoonShotsEnabled &&
    prevProps.userData === nextProps.userData
  );
});

function BurnGallery({
  setComponentLoaded,
  setThreeDSceneLoaded,
  isModalOpen,
  setIsModalOpen,
  is80sMode,
  toggle80sMode,
  synthwaveMode,
  setSynthwaveMode,
  handleIgnition,
  handleReturnFromSynthwave,
  isMobileView: propIsMobileView,
  isDefinitelyPhone,
}) {
  useEffect(() => {
    setComponentLoaded(true);
  }, [setComponentLoaded]);

  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
  const { showSpotify, setShowSpotify } = useMusic();
  const [isBurnModalOpen, setIsBurnModalOpen] = useState(false);
  const [isImageSelectionModalOpen, setIsImageSelectionModalOpen] =
    useState(false);
  const [isResultSaved, setIsResultSaved] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const currentUrl = router.asPath;
  const [burnedAmount, setBurnedAmount] = useState(0);
  const [images, setImages] = useState([]);
  const [isFlameVisible, setIsFlameVisible] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isChandelierVisible, setIsChandelierVisible] = useState(true);
  const [isInMarkerView, setIsInMarkerView] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [marginTop, setMarginTop] = useState("17rem");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentView, setCurrentView] = useState("main");
  const [tooltipData, setTooltipData] = useState(null);
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const spawnMonsterFunctionRef = useRef(null);
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [modelRef, setModelRef] = useState(null);
  const [modelCenter, setModelCenter] = useState(new THREE.Vector3());
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isStatueLoaded, setIsStatueLoaded] = useState(false);
  const [monsterMode, setMonsterMode] = useState(false);
  const [clerkUserData, setClerkUserData] = useState(null);
  const [rocketModelVisible, setRocketModelVisible] = useState(false);
  const [showUI, setShowUI] = useState(true); // Control UI visibility during transitions
  const [isConstellationsVisible, setIsConstellationsVisible] = useState(false);
  const [isMoonShotsEnabled, setIsMoonShotsEnabled] = useState(false);
  
  // Reset moon spawn state on component mount
  useEffect(() => {
    window._moonsAlreadySpawned = false;
    console.log('🌙 BurnGallery: Reset moon spawn state on mount');
  }, []);
  const [paginationState, setPaginationState] = useState(null);
  const votiveStandRef = useRef(null);
  const [isCandleViewerVisible, setIsCandleViewerVisible] = useState(false);
  const [activeScene, setActiveScene] = useState('gallery'); // Track current scene

  // Debug log scene changes
  useEffect(() => {
    console.log('🎬 BurnGallery: activeScene changed to:', activeScene);
  }, [activeScene]);

  const toggleConstellationVisibility = useCallback(() => {
    console.log("🌟 BurnGallery: toggleConstellationVisibility called");
    console.log("🌟 Current moonsSpawnedRef state (if accessible):", window.moonsSpawnedRef?.current);
    setIsConstellationsVisible((prev) => {
      const newState = !prev;
      console.log("BurnGallery: Toggled constellation visibility to:", newState);
      
      // Send sync message to iframe
      const iframe = document.querySelector('iframe[src*="cyberpunk_mission_control.html"]');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "SYNC_STATE",
            isConstellationsEnabled: newState
          },
          "*"
        );
      }
      
      return newState;
    });
  }, []);

  const toggleMoonShots = useCallback(() => {
    console.log("🌙 BurnGallery: toggleMoonShots called");
    console.log("🌙 Current is80sMode:", is80sMode);
    console.log("🌙 Current isMoonShotsEnabled:", isMoonShotsEnabled);
    
    setIsMoonShotsEnabled((prev) => {
      console.log("🌙 BurnGallery: Inside setState, prev value:", prev);
      // Always toggle
      const newState = !prev;
      console.log("🌙 BurnGallery: Setting MoonShots to:", newState, "(was:", prev, ")");
      
      // Send sync message to iframe
      const iframe = document.querySelector('iframe[title="Mission Control Panel"]');
      if (iframe && iframe.contentWindow) {
        console.log("🌙 BurnGallery: Sending SYNC_STATE with isMoonshotsEnabled:", newState);
        iframe.contentWindow.postMessage(
          {
            type: "SYNC_STATE",
            isMoonshotsEnabled: newState
          },
          "*"
        );
      }
      
      return newState;
    });
  }, [is80sMode, isMoonShotsEnabled]);

  const setSpawnFunction = useCallback((func) => {
    spawnMonsterFunctionRef.current = func;
  }, []);
  const handleButtonClick = (key) => {
    console.log(`BurnGallery: Button clicked with key: ${key}`);

    if (key === "fight") {
      if (typeof spawnMonsterFunctionRef.current === "function") {
        console.log("BurnGallery: Starting monster spawn sequence");
        spawnMonsterFunctionRef.current();
      } else {
        console.error("BurnGallery: No valid spawn function available");
      }
    }
  };

  useEffect(() => {
    // If mobile view is explicitly set via props, use that
    if (propIsMobileView !== undefined) {
      setIsMobileView(propIsMobileView);
      return; // Don't add resize listener if we have explicit mobile state
    }
    
    // Otherwise fall back to local detection
    const checkMobile = () => {
      const mobile = typeof window !== "undefined" && window.innerWidth <= 576;
      setIsMobileView(mobile);
    };

    if (typeof window !== "undefined") {
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => {
        window.removeEventListener("resize", checkMobile);
        // Also clean up any firebase listeners, timers, or other resources
      };
    }
  }, [propIsMobileView]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setMarginTop("7rem");
      } else {
        setMarginTop("17rem");
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Call the function initially to set the correct style

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Ensure we capture the current path correctly, fallback to the root if router is not ready
    const path = router.asPath;
    if (path) {
      setCurrentPath(path);
    }
  }, [router.asPath]);

  // Add effect to sync initial state with iframe
  useEffect(() => {
    // Add a small delay to ensure iframe is loaded
    const syncTimer = setTimeout(() => {
      const iframe = document.querySelector('iframe[title="Mission Control Panel"]');
      if (iframe && iframe.contentWindow) {
        console.log('🌙 BurnGallery: Syncing state to iframe');
        console.log('🌙   - isMoonShotsEnabled:', isMoonShotsEnabled);
        console.log('🌙   - isConstellationsVisible:', isConstellationsVisible);
        iframe.contentWindow.postMessage(
          {
            type: "SYNC_STATE",
            isConstellationsEnabled: isConstellationsVisible,
            isMoonshotsEnabled: isMoonShotsEnabled
          },
          "*"
        );
      }
    }, 500);
    
    return () => clearTimeout(syncTimer);
  }, [isConstellationsVisible, isMoonShotsEnabled]);

  // useEffect(() => {
  //   if (isChandelierVisible) {
  //     setIsMounted(true);
  //     // Wait a frame before starting fade-in
  //     requestAnimationFrame(() => setIsVisible(true));
  //   } else {
  //     setIsVisible(false);
  //     // Delay unmounting until fade-out completes
  //     const timer = setTimeout(() => setIsMounted(false), 2500); // Match your GSAP duration
  //     return () => clearTimeout(timer);
  //   }
  // }, [isChandelierVisible]);

  const avatarUrl = user ? getUserImageUrl(user) : "/defaultAvatar.png";

  // const handleOpenBurnModal = () => {
  //   if (!user) {
  //     openSignIn({ forceRedirectUrl: currentPath });
  //   } else {
  //     setIsBurnModalOpen(true);
  //     router.push("/gallery?burnModal=open", undefined, { shallow: true });
  //   }
  // };

  // const handleOpenImageSelectionModal = () =>
  //   setIsImageSelectionModalOpen(true);
  // const handleCloseImageSelectionModal = () =>
  //   setIsImageSelectionModalOpen(false);

  // useEffect(() => {
  //   if (isBurnModalOpen && router.query.burnModal !== "open") {
  //     router.push("/gallery?burnModal=open", undefined, { shallow: true });
  //   } else if (!isBurnModalOpen && router.query.burnModal === "open") {
  //     router.push("/gallery", undefined, { shallow: true });
  //   }
  // }, [isBurnModalOpen, router]);

  // Handler for screen clicks in the mobile model

  // Handler to return to the main view
  const handleBack = () => {
    setCurrentView("main");
  };

  // Add toggleMonsterMode function
  const toggleMonsterMode = () => {
    setMonsterMode((prev) => !prev);
  };

  // Add toggleRocketModel function with duplicate prevention
  const toggleRocketModel = () => {
    console.log("BurnGallery: Toggling rocket model visibility");
    console.log("BurnGallery: Current rocketModelVisible state:", rocketModelVisible);
    
    // Close the floating candle viewer if it's open
    if (isCandleViewerVisible && votiveStandRef.current && votiveStandRef.current.closeFloatingViewer) {
      console.log("BurnGallery: Closing floating candle viewer before showing rocket");
      votiveStandRef.current.closeFloatingViewer();
    }
    
    setRocketModelVisible((prev) => {
      const newValue = !prev;
      console.log(
        "BurnGallery: rocketModelVisible changed from",
        prev,
        "to",
        newValue
      );
      return newValue;
    });
  };

  // Add a combined function to handle rocket toggle with proper state management
  const handleRocketToggle = useCallback(() => {
    console.log("BurnGallery: handleRocketToggle called");
    console.log("Current states - monsterMode:", monsterMode, "rocketModelVisible:", rocketModelVisible);
    
    // Use functional updates to ensure we're working with the latest state
    if (rocketModelVisible) {
      // Hide rocket first
      setRocketModelVisible(false);
      // Then disable monster mode after a slight delay
      setTimeout(() => {
        setMonsterMode(false);
      }, 50);
    } else {
      // Enable monster mode first if needed
      if (!monsterMode) {
        setMonsterMode(true);
        // Then show rocket after state update
        setTimeout(() => {
          setRocketModelVisible(true);
        }, 50);
      } else {
        // Monster mode already enabled, just show rocket
        setRocketModelVisible(true);
      }
    }
  }, [monsterMode, rocketModelVisible]);

  // Update user data when Clerk user changes
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setClerkUserData(createUserData(user));
    } else {
      setClerkUserData(null);
    }
  }, [isLoaded, isSignedIn, user]);

  // Add some debugging
  useEffect(() => {
    console.log("🎵 Current is80sMode:", is80sMode);
  }, [is80sMode]);

  // Music player visibility is now controlled by cyberpunk mission control
  // useEffect(() => {
  //   if (is80sMode) {
  //     setShowSpotify(true);
  //   }
  // }, [is80sMode, setShowSpotify]);

  // Update the loading state when both model and statue are loaded
  useEffect(() => {
    console.log("BurnGallery: Loading state check", {
      isModelLoaded,
      isStatueLoaded,
      monsterMode,
      rocketModelVisible,
    });

    if (isModelLoaded && (!monsterMode ? isStatueLoaded : rocketModelVisible)) {
      console.log("BurnGallery: Setting threeDSceneLoaded to true");
      setThreeDSceneLoaded(true);
    }
  }, [
    isModelLoaded,
    isStatueLoaded,
    monsterMode,
    rocketModelVisible,
    setThreeDSceneLoaded,
  ]);

  // Add a fallback timer to ensure loading completes
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.log(
        "BurnGallery: Fallback timer triggered, forcing threeDSceneLoaded to true"
      );
      setThreeDSceneLoaded(true);
    }, 10000); // 10 second fallback

    return () => clearTimeout(fallbackTimer);
  }, [setThreeDSceneLoaded]);
  
  // Listen for reset rocket state message
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data.type === 'RESET_ROCKET_STATE') {
        console.log('🚀 BurnGallery: Received RESET_ROCKET_STATE message');
        // Reset rocket and monster mode to fresh gallery state
        setRocketModelVisible(false);
        setMonsterMode(false);
        console.log('✅ BurnGallery: Reset rocket state - gallery is now fresh');
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return (
    <>
      <Box
        position="relative"
        minH="100vh"
        minW="100vw"
        overflow="hidden"
        backgroundColor="#131416"
      >
        <Grid
          templateColumns="1fr"
          gap={0}
          height="100%"
          width="100%"
          overflow="hidden"
        >
          <GridItem colSpan={1} height="100%" overflow="hidden">
            {currentView === "main" ? (
              <MemoizedThreeDVotiveStand
                key="votive-stand-main" // Add stable key to prevent remounting
                ref={votiveStandRef}
                setIsLoading={setIsModelLoaded}
                isInMarkerView={isInMarkerView}
                isMobileView={isMobileView}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                onSpawnReady={setSpawnFunction}
                is80sMode={is80sMode}
                monsterMode={monsterMode}
                userData={clerkUserData}
                setIsStatueLoaded={setIsStatueLoaded}
                rocketModelVisible={rocketModelVisible}
                isConstellationsVisible={isConstellationsVisible}
                toggleConstellationVisibility={toggleConstellationVisibility}
                onPaginationChange={setPaginationState}
                onCandleViewerStateChange={setIsCandleViewerVisible}
                onUIVisibilityChange={setShowUI}
                onSceneChange={setActiveScene}
                isMoonShotsEnabled={isMoonShotsEnabled}
              />
            ) : null}
          </GridItem>
        </Grid>

        {/* Render panels with CSS visibility control to prevent remounting */}
        {isMobileView ? (
          <Box
            key="mobile-panel-container"
            display={currentView === "main" && showUI ? "block" : "none"}
            position="fixed"
            zIndex={1000}
          >
            <MobileSidePanel
              key="mobile-side-panel"
              onButtonClick={handleButtonClick}
              is80sMode={is80sMode}
              toggle80sMode={toggle80sMode}
              monsterMode={monsterMode}
              toggleMonsterMode={toggleMonsterMode}
              showSpotify={showSpotify}
              setShowSpotify={setShowSpotify}
              rocketModelVisible={rocketModelVisible}
              toggleRocketModel={toggleRocketModel}
              handleRocketToggle={handleRocketToggle}
              toggleConstellationVisibility={toggleConstellationVisibility}
              isConstellationsVisible={isConstellationsVisible}
              paginationState={paginationState}
              toggleMoonShots={toggleMoonShots}
              activeScene={activeScene}
            />
          </Box>
        ) : (
          <Box
            key="desktop-panel-container"
            display={currentView === "main" && showUI ? "block" : "none"}
            position="fixed"
            zIndex={1000}
          >
            {/* <SidePanelEnhanced
              key="side-panel-enhanced"
              onButtonClick={handleButtonClick}
              is80sMode={is80sMode}
              toggle80sMode={toggle80sMode}
              monsterMode={monsterMode}
              toggleMonsterMode={toggleMonsterMode}
              rocketModelVisible={rocketModelVisible}
              toggleRocketModel={toggleRocketModel}
              toggleConstellationVisibility={toggleConstellationVisibility}
              isConstellationsVisible={isConstellationsVisible}
              toggleMoonShots={toggleMoonShots}
              isMoonShotsEnabled={isMoonShotsEnabled}
            /> */}
          </Box>
        )}
        {/* <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            mt={5}
            mb={5}
          >
            <Button
              width="7rem"
              className="burnButton"
              onClick={handleOpenBurnModal}
            >
              Burn Tokens
            </Button>
          </Box> */}
        {/* </Box>  */}

        {isBurnModalOpen && (
          <BurnModal
            isOpen={isBurnModalOpen}
            onClose={() => setIsBurnModalOpen(false)}
            selectedImage={selectedImage}
            setSelectedImage={setSelectedImage}
            burnedAmount={burnedAmount}
            setBurnedAmount={setBurnedAmount}
            setIsResultSaved={setIsResultSaved}
            setSaveMessage={setSaveMessage}
            isResultSaved={isResultSaved}
            saveMessage={saveMessage}
          />
        )}
      </Box>
    </>
  );
}

export default BurnGallery;