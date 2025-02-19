"use client";
import React, { useEffect, useState, useCallback, Suspense } from "react";
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
import Scene from "./3dChandelier";
import ThreeDVotiveStand from "./3DVotiveStand/index";
import MobileStand from "./3DVotiveStand/MobileStand";
import Communion3 from "./Communion3";
import Header3 from "./Header3";

import NeonSign from "./NeonSign";

const BurnModal = dynamic(() => import("./BurnModal"), {
  ssr: false,
});
const ImageSelectionModal = dynamic(() => import("./ImageSelectionModal"), {
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
function BurnGallery({
  setComponentLoaded,
  setThreeDSceneLoaded,
  setShowSpotify,
  isModalOpen,
  setIsModalOpen,
}) {
  useEffect(() => {
    const loadContent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setComponentLoaded(true);
    };
    loadContent();
  }, [setComponentLoaded]);

  const router = useRouter();
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const [isBurnModalOpen, setIsBurnModalOpen] = useState(false);
  const [isImageSelectionModalOpen, setIsImageSelectionModalOpen] =
    useState(false);
  const [isResultSaved, setIsResultSaved] = useState(false); // Define isResultSaved here
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  // const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const currentUrl = router.asPath;
  const [burnedAmount, setBurnedAmount] = useState(0); // Already defined in BurnGallery
  const [images, setImages] = useState([]);
  const [isFlameVisible, setIsFlameVisible] = useState(true);
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(true);
  const [isChandelierVisible, setIsChandelierVisible] = useState(true);
  const [isInMarkerView, setIsInMarkerView] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");
  const [marginTop, setMarginTop] = useState("17rem");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentView, setCurrentView] = useState("main");
  const [tooltipData, setTooltipData] = useState([]);
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = typeof window !== "undefined" && window.innerWidth <= 576;
      setIsMobileView(mobile);
    };

    // Only add event listener if window exists
    if (typeof window !== "undefined") {
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
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

  useEffect(() => {
    if (isChandelierVisible) {
      setIsMounted(true);
      // Wait a frame before starting fade-in
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      // Delay unmounting until fade-out completes
      const timer = setTimeout(() => setIsMounted(false), 2500); // Match your GSAP duration
      return () => clearTimeout(timer);
    }
  }, [isChandelierVisible]);

  const avatarUrl = user ? user.imageUrl : "/defaultAvatar.png"; // Define avatarUrl here

  const handleOpenBurnModal = () => {
    if (!user) {
      openSignIn({ forceRedirectUrl: currentPath });
    } else {
      setIsBurnModalOpen(true); // Open the BurnModal if signed in
      router.push("/gallery?burnModal=open", undefined, { shallow: true });
    }
  };

  const handleOpenImageSelectionModal = () =>
    setIsImageSelectionModalOpen(true);
  const handleCloseImageSelectionModal = () =>
    setIsImageSelectionModalOpen(false);

  useEffect(() => {
    if (isBurnModalOpen && router.query.burnModal !== "open") {
      router.push("/gallery?burnModal=open", undefined, { shallow: true });
    } else if (!isBurnModalOpen && router.query.burnModal === "open") {
      router.push("/gallery", undefined, { shallow: true });
    }
  }, [isBurnModalOpen]);

  const handleSignIn = (userInfo) => {
    // Update the user state after successful sign-in
    setUser(userInfo);
    setIsSignedIn(true);
    setIsAuthModalOpen(false); // Close the AuthModal
  };

  // Handler for screen clicks in the mobile model
  const handleScreenClick = (view) => {
    setCurrentView(view);
  };

  // Handler to return to the main view
  const handleBack = () => {
    setCurrentView("main");
  };

  const handleTooltipUpdate = (newTooltipData) => {
    setTooltipData(newTooltipData);
  };

  return (
    <>
      <Box py="0" position="relative" height="100vh" width="100%">
        <Grid gap={0} width="100%">
          {/* <GridItem width="100%" zIndex={isChandelierVisible ? 5 : 3}>
            {!isMobileView && isMounted && <Scene visible={isVisible} />}
          </GridItem> */}

          <GridItem width="100%" zIndex={4}>
            {currentView === "main" ? (
              <ThreeDVotiveStand
                isMobileView={isMobileView}
                onScreenClick={handleScreenClick}
                setIsLoading={setThreeDSceneLoaded}
                setShowSpotify={setShowSpotify}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                onCameraMove={() => {
                  setIsInMarkerView(true);
                  setIsChandelierVisible(false);
                }}
                onResetView={() => {
                  setIsInMarkerView(false);
                  // Only show chandelier on reset if not mobile
                  setIsChandelierVisible(!isMobileView);
                }}
                onZoom={() => {
                  if (!isInMarkerView) {
                    setIsChandelierVisible(false);
                  }
                }}
              />
            ) : currentView === "stand1" ? (
              <div
                style={{
                  position: "relative",
                  width: "100vw", // Full viewport width
                  height: "100vh", // Full viewport height
                  maxWidth: "none", // Override parent constraints
                  maxHeight: "none",
                }}
              >
                <Canvas
                  camera={{
                    fov: 75,
                    near: 0.1,
                    far: 1000,
                    position: [0, 5, 15],
                  }}
                >
                  <Suspense fallback={null}>
                    <MobileStand
                      onBack={handleBack}
                      onTooltipUpdate={handleTooltipUpdate}
                      scale={7}
                    />
                  </Suspense>
                </Canvas>
                <Box
                  position="absolute"
                  bottom="10%"
                  left="4"
                  zIndex={500}
                  pointerEvents="auto"
                >
                  <Button
                    width="7rem"
                    background="#8e662b"
                    color="white"
                    onClick={handleBack}
                    className="w-56 text-xl px-4 py-2 bg-black/70 text-white rounded-lg hover:bg-black/90 transition-colors"
                  >
                    ← Back
                  </Button>
                </Box>
                {/* Mobile Stand Instructions */}
                {isMobileView && (
                  <Box
                    position="absolute"
                    top="10%"
                    zIndex={500}
                    textAlign="right"
                    width="100%"
                    px="4"
                    pointerEvents="none"
                  >
                    <h1 className="thelma1">RL80 is Lit!</h1>
                    <Text fontSize={"1rem"}>
                      Hover over the candles to see who lit them. Click anywhere
                      to return to the main view.
                    </Text>
                  </Box>
                )}

                {/* Tooltips */}
                <div className="tooltip-wrapper absolute inset-0 pointer-events-none">
                  {tooltipData.map((tooltip, index) => (
                    <div
                      key={index}
                      className="tooltip-container"
                      style={{
                        position: "absolute",
                        padding: "8px 12px",
                        left: `${tooltip.position.x}px`,
                        top: `${tooltip.position.y}px`,
                        transform: "translate(-50%, -100%)",
                        backgroundColor: "rgba(0, 0, 0, 0.9)",
                        color: "white",
                        borderRadius: "4px",
                        zIndex: 1000,
                        fontSize: "16px",
                        fontWeight: "600",
                        opacity: tooltip.userName ? 1 : 0,
                        visibility: tooltip.userName ? "visible" : "hidden",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tooltip.userName}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </GridItem>
        </Grid>
        {currentView === "main" && <SidePanel />}
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
