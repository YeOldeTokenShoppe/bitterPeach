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
import SidePanel from "./SidePanel";
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

import ThreeDVotiveStand from "./3DVotiveStand/index";
import Communion3 from "./Communion3";
import Model from "./3DVotiveStand/Model";
import * as THREE from "three";
import MobileSidePanel from "./MobileSidePanel";

// Dynamically import the Synthwave component to prevent it from loading until needed
const DynamicSynthwave = dynamic(() => import("./Synthwave"), {
  ssr: false,
  loading: () => <div>Loading Synthwave...</div>,
});

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

// Memoize child components
const MemoizedThreeDVotiveStand = memo(ThreeDVotiveStand);

function BurnGallery({
  setComponentLoaded,
  setThreeDSceneLoaded,
  setShowSpotify,
  showSpotify,
  isModalOpen,
  setIsModalOpen,
  is80sMode,
  toggle80sMode,
  synthwaveMode,
  setSynthwaveMode,
  handleIgnition,
  handleReturnFromSynthwave
}) {
  useEffect(() => {
    setComponentLoaded(true);
  }, [setComponentLoaded]);

  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { openSignIn } = useClerk();
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
  const [isConstellationsVisible, setIsConstellationsVisible] = useState(false);

  const toggleConstellationVisibility = useCallback(() => {
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
  }, []);

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
    const iframe = document.querySelector('iframe[src*="cyberpunk_mission_control.html"]');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: "SYNC_STATE",
          isConstellationsEnabled: isConstellationsVisible
        },
        "*"
      );
    }
  }, [isConstellationsVisible]);

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

  // Add toggleRocketModel function
  const toggleRocketModel = () => {
    console.log("BurnGallery: Toggling rocket model visibility");
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
    console.log("BurnGallery showSpotify state:", showSpotify);
  }, [showSpotify]);

  // Add this effect to ensure music player visibility syncs with 80s mode
  useEffect(() => {
    if (is80sMode) {
      setShowSpotify(true);
    }
  }, [is80sMode, setShowSpotify]);

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

  // Add ref for ThreeDVotiveStand
  const threeDVotiveStandRef = useRef(null);
  
  // Add ref for Synthwave component
  const synthwaveRef = useRef(null);

  return (
    <Box
      position="relative"
      minH="100vh"
      minW="100vw"
      overflow="hidden"
      backgroundColor="#131416"
    >
      <Grid
        templateColumns="1fr"
        templateRows="1fr"
        h="100vh"
        w="100vw"
        position="relative"
      >
        <GridItem>
          {/* Conditionally render either ThreeDVotiveStand or Synthwave based on synthwaveMode */}
          {!synthwaveMode ? (
            <ThreeDVotiveStand
              ref={threeDVotiveStandRef}
              setIsLoading={setIsLoading}
              isInMarkerView={isInMarkerView}
              isMobileView={isMobileView}
              setShowSpotify={setShowSpotify}
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              onSpawnReady={setSpawnFunction}
              is80sMode={is80sMode}
              showSpotify={showSpotify}
              monsterMode={monsterMode}
              userData={clerkUserData}
              setIsStatueLoaded={setIsStatueLoaded}
              rocketModelVisible={rocketModelVisible}
              isConstellationsVisible={isConstellationsVisible}
              toggleConstellationVisibility={toggleConstellationVisibility}
              handleIgnition={handleIgnition}
            />
          ) : (
            <Suspense fallback={<Box>Loading Synthwave...</Box>}>
              <Box position="absolute" top={0} right={0} zIndex={10} p={4}>
                <Button onClick={handleReturnFromSynthwave} colorScheme="teal">
                  Return
                </Button>
              </Box>
              <DynamicSynthwave ref={synthwaveRef} />
            </Suspense>
          )}
        </GridItem>
      </Grid>

      {/* Only show the panels when not in synthwave mode */}
      {currentView === "main" && !synthwaveMode && (
        isMobileView ? (
          <MobileSidePanel
            onButtonClick={handleButtonClick}
            is80sMode={is80sMode}
            toggle80sMode={toggle80sMode}
            monsterMode={monsterMode}
            toggleMonsterMode={toggleMonsterMode}
            showSpotify={showSpotify}
            setShowSpotify={setShowSpotify}
            rocketModelVisible={rocketModelVisible}
            toggleRocketModel={toggleRocketModel}
            toggleConstellationVisibility={toggleConstellationVisibility}
            isConstellationsVisible={isConstellationsVisible}
            handleIgnition={handleIgnition}
          />
        ) : (
          <SidePanel
            onButtonClick={handleButtonClick}
            is80sMode={is80sMode}
            toggle80sMode={toggle80sMode}
            monsterMode={monsterMode}
            toggleMonsterMode={toggleMonsterMode}
            showSpotify={showSpotify}
            setShowSpotify={setShowSpotify}
            rocketModelVisible={rocketModelVisible}
            toggleRocketModel={toggleRocketModel}
            toggleConstellationVisibility={toggleConstellationVisibility}
            isConstellationsVisible={isConstellationsVisible}
            handleIgnition={handleIgnition}
          />
        )
      )}

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
  );
}

export default BurnGallery;
