import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Flex,
  Button,
  Text,
  Icon,
  Switch,
  FormControl,
  FormLabel,
  Grid,
  Select,
} from "@chakra-ui/react";
import AnimatedRadioButtons from "./3DVotiveStand/CyberButtons";
import Communion3 from "./Communion3";
import { useRouter } from "next/router";
import {
  useUser,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import Link from "next/link";
import { slide as Menu } from "react-burger-menu";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { signInWithCustomToken } from "firebase/auth";
import { db, auth } from "../utilities/firebaseClient";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton } from "thirdweb/react";
import { darkTheme } from "thirdweb/react";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { baseSepolia, ethereum } from "thirdweb/chains";
import { PayEmbed } from "thirdweb/react";
import { client } from "../utilities/client";
import { Stake } from "./3DVotiveStand/Stake";
import dynamic from "next/dynamic";
import Image from "next/image";

const SidePanel = ({
  onButtonClick,
  is80sMode,
  toggle80sMode,
  monsterMode,
  toggleMonsterMode,
}) => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true); // Start open
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showPayEmbed, setShowPayEmbed] = useState(false); // Add this state
  const [showStake, setShowStake] = useState(false); // Add this state
  const [sitepalLoaded, setSitepalLoaded] = useState(false); // New state for Sitepal
  const sitepalContainerRef = useRef(null); // New ref for Sitepal container
  const panelRef = useRef(null);
  const hotzoneSize = 20; // Size in pixels for the hotzone

  // Menu state for hamburger menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuWidth, setMenuWidth] = useState("35%");
  const [emoji, setEmoji] = useState("😇");
  const menuNode = useRef();
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState(router.asPath);
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  // Letter scramble effect variables
  const [activeInterval, setActiveInterval] = useState(null);
  const isHovering = useRef(false);
  const inputRef = useRef(null);

  const wallets = [
    inAppWallet({
      auth: {
        options: ["google", "discord", "telegram", "x"],
      },
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("org.uniswap"),
    createWallet("app.phantom"),
  ];

  const [systemPower, setSystemPower] = useState(true);
  const [emergencyMode, setEmergencyMode] = useState(false);

  // Mock leaderboard data
  const leaderboardData = [
    { name: "Armstrong", score: 1969 },
    { name: "Aldrin", score: 1930 },
    { name: "Collins", score: 1890 },
    { name: "Lovell", score: 1850 },
    { name: "Cernan", score: 1800 },
  ];

  // // Button click handlers
  // const handleButtonClick = (buttonName) => {
  //   console.log(`Button clicked: ${buttonName}`);
  // }; // Add debounce timer state
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Update panel width based on screen size and orientation
  const [panelWidth, setPanelWidth] = useState("25%");

  // Add state for video call functionality
  const [activeCall, setActiveCall] = useState(false);
  const [currentStation, setCurrentStation] = useState("LUNAR BASE ALPHA");
  const [mounted, setMounted] = useState(false);

  // Add this new state for tracking video loading
  const [greetingsVideoLoaded, setGreetingsVideoLoaded] = useState(false);

  // Add state for tracking connection sequence
  const [connectionPhase, setConnectionPhase] = useState(0); // 0=not started, 1=static, 2=connecting, 3=stabilizing, 4=connected

  // Add a new state to track if we're in a browser environment
  const [isBrowser, setIsBrowser] = useState(false);

  // Add a new state to track SitePal loading progress
  const [sitepalLoadingStage, setSitepalLoadingStage] = useState(0); // 0=not started, 1=loading, 2=ready

  // Add a new state to track the mute state of the SitePal agent
  const [isMuted, setIsMuted] = useState(true);

  // Add state to track if the iframe content has loaded
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // First, add a new ref to store the active microphone stream
  const microphoneStreamRef = useRef(null);

  // Detect touch devices
  useEffect(() => {
    const isTouchCapable =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(isTouchCapable);
  }, []);

  // Handle first click to close panel and mark user interaction
  // Replace the problematic useEffect with this improved version
  useEffect(() => {
    // Only set up click handler if panel is visible
    if (!isTextBoxVisible) return;

    const handleOutsideClick = (e) => {
      // Don't close if clicking inside the panel
      if (panelRef.current && panelRef.current.contains(e.target)) {
        return;
      }

      // Only close panel and mark user interaction if clicking outside
      setIsTextBoxVisible(false);
      setHasUserInteracted(true);
    };

    // Add click listener to document
    document.addEventListener("click", handleOutsideClick);

    // Clean up listener when component unmounts or dependencies change
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isTextBoxVisible]); // Re-run effect when panel visibility changes
  useEffect(() => {
    if (isTouchDevice) return;

    const handleMouseMove = (event) => {
      const rightEdgeDistance = window.innerWidth - event.clientX;

      // Clear any existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set a new timer to debounce the state change
      const timer = setTimeout(() => {
        // Show panel when mouse is near right edge
        if (rightEdgeDistance < hotzoneSize) {
          setIsTextBoxVisible(true);
        } else if (rightEdgeDistance > 300) {
          // Only hide if mouse is far enough away
          setIsTextBoxVisible(false);
        }
      }, 100); // 100ms debounce delay

      setDebounceTimer(timer);
    };

    if (hasUserInteracted) {
      document.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [hasUserInteracted, isTouchDevice, hotzoneSize, debounceTimer]);

  const handleButtonClick = (e) => {
    if (e) e.stopPropagation();
    setIsTextBoxVisible(!isTextBoxVisible);
    setHasUserInteracted(true);
  };

  // Capture the current path before page has loaded
  useEffect(() => {
    const path = router.asPath;
    if (path) {
      setCurrentPath(path);
    }
  }, [router.asPath]);

  const closeMenu = () => setMenuOpen(false);
  const toggleMenu = (event) => {
    event.stopPropagation();
    setMenuOpen(!menuOpen);
    // Ensure the panel stays open when toggling the menu
    setIsTextBoxVisible(true);
    setHasUserInteracted(true);
  };

  // Scramble effect functions
  const startScramble = (element, originalText) => {
    if (!element || !originalText) return;

    let iterations = 0;

    if (activeInterval) {
      clearInterval(activeInterval);
    }

    const interval = setInterval(() => {
      if (!isHovering.current) {
        clearInterval(interval);
        if (element) element.innerText = originalText;
        return;
      }

      element.innerText = originalText
        .split("")
        .map((letter, index) => {
          if (index < iterations) {
            return originalText[index];
          }
          return letters[Math.floor(Math.random() * letters.length)];
        })
        .join("");

      if (iterations >= originalText.length) {
        clearInterval(interval);
      } else {
        iterations += 1 / 3;
      }
    }, 40);

    setActiveInterval(interval);
  };

  const handleMouseEnter = (e) => {
    if (!e?.currentTarget) return;
    const element = e.currentTarget;
    const originalText = element.dataset.value;
    isHovering.current = true;
    startScramble(element, originalText);
  };

  const handleMouseLeave = (e) => {
    if (!e?.currentTarget) return;
    const element = e.currentTarget;
    const originalText = element.dataset.value;
    isHovering.current = false;

    if (activeInterval) {
      clearInterval(activeInterval);
      setActiveInterval(null);
    }

    element.innerText = originalText;
  };

  // Firebase authentication function
  const signIntoFirebaseWithClerk = useCallback(async () => {
    try {
      const token = await getToken({ template: "integration_firebase" });
      if (!token) throw new Error("No Firebase token from Clerk.");

      const userCredentials = await signInWithCustomToken(auth, token || "");

      return userCredentials.user;
    } catch (error) {
      console.error("Error signing into Firebase:", error);
    }
  }, [getToken]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuNode.current && !menuNode.current.contains(e.target)) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuNode]);

  // Emoji toggle effect
  useEffect(() => {
    const emojiInterval = setInterval(() => {
      setEmoji((prevEmoji) => (prevEmoji === "😇" ? "😈" : "😇"));
    }, 3000);

    return () => clearInterval(emojiInterval);
  }, []);

  // Save user data to Firestore
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userData = {
        username:
          user.username ||
          user.firstName ||
          user.emailAddresses[0]?.emailAddress ||
          "Anonymous",
        profileImage: user.imageUrl || null,
        userId: user.id,
      };

      const saveUserDataToFirestore = async () => {
        try {
          // Sign into Firebase first
          const firebaseUser = await signIntoFirebaseWithClerk();
          if (!firebaseUser) {
            console.error("Firebase sign-in failed");
            return;
          }

          // Proceed to save user data to Firestore
          const docRef = doc(db, "users", user.id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            console.log("User already exists in Firestore:", docSnap.data());
          } else {
            await setDoc(docRef, userData, { merge: true });
          }
        } catch (error) {
          console.error("Error saving user data to Firestore:", error);
        }
      };

      saveUserDataToFirestore();
    }
  }, [isLoaded, isSignedIn, user, signIntoFirebaseWithClerk]);

  // Update panel width based on screen size and orientation
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const isPortrait = window.innerHeight > window.innerWidth;

        if (window.innerWidth <= 768) {
          setPanelWidth("85%");
        } else if (window.innerWidth <= 1024) {
          setPanelWidth(isPortrait ? "50%" : "40%");
        } else {
          setPanelWidth(isPortrait ? "35%" : "25%");
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      handleResize(); // Initial call
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  // Update menu width based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth <= 760) {
          setMenuWidth("100%");
        } else {
          setMenuWidth("35%");
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      handleResize();
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  // Clean up intervals
  useEffect(() => {
    return () => {
      if (activeInterval) {
        clearInterval(activeInterval);
      }
    };
  }, [activeInterval]);

  // Modified handler for 80s mode toggle
  const handle80sModeToggle = () => {
    if (!is80sMode && monsterMode) {
      // If turning on 80s mode while monster mode is on, turn off monster mode
      toggleMonsterMode(); // Turn off monster mode
    }
    toggle80sMode(); // Toggle 80s mode
  };

  // Modified handler for monster mode toggle
  const handleMonsterModeToggle = () => {
    if (!monsterMode && is80sMode) {
      // If turning on monster mode while 80s mode is on, turn off 80s mode
      toggle80sMode(); // Turn off 80s mode
    }
    toggleMonsterMode(); // Toggle monster mode
  };

  // Add this function at the top of your component to temporarily block WebGL during
  // Reference to the SitePal iframe
  const sitepalIframeRef = useRef(null);
  // In both SidePanel.jsx and MobileSidePanel.jsx, add this effect:
  useEffect(() => {
    if (sitepalIframeRef.current) {
      const checkIframeSize = () => {
        const iframe = sitepalIframeRef.current;
        if (iframe) {
          const rect = iframe.getBoundingClientRect();
          console.log("Iframe dimensions:", {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
          });

          // Ensure iframe has proper dimensions
          if (rect.width === 0 || rect.height === 0) {
            console.warn("Iframe has zero dimensions, attempting to fix...");
            iframe.style.width = "100%";
            iframe.style.height = "100%";
          }
        }
      };

      // Check size initially and after a short delay
      checkIframeSize();
      setTimeout(checkIframeSize, 1000);
    }
  }, []);
  // Add useEffect for client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update the useEffect for initialization
  useEffect(() => {
    // First check if we're in a browser environment
    setIsBrowser(typeof window !== "undefined");
  }, []);

  // Replace the fullMicCleanup function with a simpler version for iframe approach
  const fullMicCleanup = () => {
    // Clean up microphone tracks if any
    if (microphoneStreamRef.current) {
      console.log("Stopping microphone tracks...");
      microphoneStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      microphoneStreamRef.current = null;
    }

    // Reset the iframe
    if (sitepalIframeRef.current) {
      sitepalIframeRef.current.src = "about:blank";
    }
  };
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || !event.data.type) return;

      console.log("Message from SitePal iframe:", event.data);

      switch (event.data.type) {
        case "SITEPAL_READY":
          console.log("SitePal is ready");
          setIsIframeLoaded(true);
          break;

        case "SITEPAL_STATE_CHANGE":
          console.log("SitePal state changed:", event.data.isListening);
          setIsMuted(!event.data.isListening);
          break;

        case "SITEPAL_ERROR":
          console.error("SitePal error:", event.data.error);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Add this function to send messages to the iframe
  const sendMessageToIframe = (message) => {
    if (sitepalIframeRef.current) {
      try {
        sitepalIframeRef.current.contentWindow.postMessage(message, "*");
      } catch (error) {
        console.error("Error sending message to iframe:", error);
      }
    }
  };

  // Update the useEffect cleanup to be simpler
  useEffect(() => {
    return () => {
      // Component cleanup
      fullMicCleanup();
    };
  }, []);

  const toggleCall = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setIsTextBoxVisible(true);
    setHasUserInteracted(true);

    if (!activeCall) {
      // Starting a new call
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          microphoneStreamRef.current = stream;
          setActiveCall(true);
          setConnectionPhase(1);
          setIsMuted(true);

          // Progress through connection phases with timeouts
          setTimeout(() => setConnectionPhase(2), 1200);
          setTimeout(() => setConnectionPhase(3), 3000);
          setTimeout(() => {
            setConnectionPhase(4);
            setSitepalLoadingStage(2);
            setSitepalLoaded(true);
          }, 4500);
        })
        .catch((err) => {
          console.error("Microphone permission error:", err);
          alert("Please allow microphone access to chat with the avatar");
        });
    } else if (activeCall && connectionPhase === 4 && isMuted) {
      // Unmute - Send a message to the iframe to click the button
      try {
        const iframe = sitepalIframeRef.current;
        // Check if iframe and its contentWindow are accessible
        if (iframe && iframe.contentWindow) {
          console.log("Sending 'triggerListenClick' message to iframe...");
          iframe.contentWindow.postMessage(
            "triggerListenClick",
            window.location.origin
          );
          setIsMuted(false); // Update parent component state optimistically
          console.log("'triggerListenClick' message sent.");
        } else {
          console.error(
            "Cannot access iframe contentWindow. Check same-origin policy or if iframe exists."
          );
        }
      } catch (error) {
        console.error(
          "Error sending 'triggerListenClick' message to iframe:",
          error
        );
      }
    } else {
      // End call - clean up and reset everything
      setActiveCall(false);
      setConnectionPhase(0);
      setSitepalLoadingStage(0);
      setSitepalLoaded(false);
      setIsMuted(true);

      // Clean up microphone if needed
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        microphoneStreamRef.current = null;
      }

      // Reset iframe
      if (sitepalIframeRef.current) {
        sitepalIframeRef.current.src = "about:blank";
        setTimeout(() => {
          if (sitepalIframeRef.current) {
            sitepalIframeRef.current.src = "/sitepal/index.html";
          }
        }, 100);
      }
    }
  };

  // Add this useEffect to set up message listener for communication with the iframe
  useEffect(() => {
    const handleMessage = (event) => {
      // Validate the origin if needed for security
      // if (event.origin !== 'your-site-origin') return;

      try {
        const data = event.data;

        // Handle messages from the SitePal iframe
        if (data.type === "SITEPAL_STATE_CHANGE") {
          // Update our UI based on SitePal state
          if (data.isListening === true) {
            setIsMuted(false);
            console.log("SitePal started listening");
          } else if (data.isListening === false) {
            setIsMuted(true);
            console.log("SitePal stopped listening");
          }
        } else if (data.type === "SITEPAL_READY") {
          console.log("SitePal is ready");
          setIsIframeLoaded(true);
        } else if (data.type === "SITEPAL_ERROR") {
          console.error("SitePal error:", data.error);
        }
      } catch (error) {
        console.error("Error handling message from iframe:", error);
      }
    };

    // Add the event listener
    window.addEventListener("message", handleMessage);

    // Clean up
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      // Clear any timeouts
      if (window.sitepalTimeouts) {
        window.sitepalTimeouts.forEach((timeout) => clearTimeout(timeout));
        window.sitepalTimeouts = null;
      }

      // Reset iframe
      if (sitepalIframeRef.current) {
        sitepalIframeRef.current.src = "about:blank";
      }
    };
  }, []);

  return (
    <>
      {/* Always visible toggle button for touch devices */}
      {isTouchDevice && !isTextBoxVisible && (
        <Button
          position="fixed"
          right="0"
          top="50%"
          transform="translateY(-50%)"
          height="120px"
          width="30px"
          zIndex="5001"
          onClick={handleButtonClick}
          background="rgba(0, 0, 0, 0.6)"
          color="white"
          borderRadius="4px 0 0 4px"
          _hover={{ background: "rgba(0, 0, 0, 0.8)" }}
          boxShadow="0 0 10px rgba(255, 255, 255, 0.3)"
          animation="pulse 2s infinite"
          transition="all 0.4s ease-out"
          sx={{
            "@keyframes pulse": {
              "0%": { boxShadow: "0 0 5px rgba(255, 255, 255, 0.3)" },
              "50%": { boxShadow: "0 0 15px rgba(255, 255, 255, 0.7)" },
              "100%": { boxShadow: "0 0 5px rgba(255, 255, 255, 0.3)" },
            },
          }}
        >
          ❮
        </Button>
      )}

      {/* Hotzone area - invisible but detects mouse for non-touch devices */}
      {!isTouchDevice && hasUserInteracted && (
        <Box
          position="fixed"
          top="0"
          right="0"
          width={`${hotzoneSize}px`}
          height="100%"
          zIndex="4999"
          pointerEvents="none"
        />
      )}

      {/* Updated Main Panel */}
      <Box
        ref={panelRef}
        position="fixed"
        top="0"
        right="0"
        width={panelWidth}
        height="100%"
        bg="gray.900"
        color="#c48901"
        p="1rem"
        borderLeft="2px solid"
        borderColor="#c48901"
        boxShadow="lg"
        zIndex="5000"
        className={isTextBoxVisible ? "panel-visible" : "panel-hidden"}
        sx={{
          ".panel-visible": {
            transform: "translateX(0)",
            transition: "transform 0.4s ease-out",
          },
          ".panel-hidden": {
            transform: "translateX(100%)",
            transition: "transform 0.4s ease-out",
          },
          "&.panel-visible": {
            transform: "translateX(0)",
            transition: "transform 0.4s ease-out",
          },
          "&.panel-hidden": {
            transform: "translateX(100%)",
            transition: "transform 0.4s ease-out",
          },
          "@keyframes fadeIn": {
            "0%": { opacity: 0 },
            "100%": { opacity: 0.4 },
          },
          "& #vhssPreEmbedContainer": {
            position: "absolute !important",
            top: "0 !important",
            left: "0 !important",
            width: "100% !important",
            height: "100% !important",
            background: "transparent !important",
            pointerEvents: "auto !important",
            zIndex: "5 !important",
            transform: "none !important",
            "& iframe": {
              width: "100%",
              height: "100%",
              border: "none",
              overflow: "hidden",
            },
          },
          "& #vhss_aiPlayer": {
            width: "100% !important",
            height: "100% !important",
            maxWidth: "none !important",
            maxHeight: "none !important",
            transform: "none !important",
          },
        }}
      >
        {/* Mission Control Header */}
        <Box
          textAlign="center"
          mb="4"
          borderBottom="2px solid"
          borderColor="#c48901"
          pb="2"
        >
          <Flex align="center" justify="center" mb="1">
            <Text
              fontSize="xl"
              fontFamily="mono"
              letterSpacing="wider"
              color="blue.100"
            >
              MISSION CONTROL
            </Text>
          </Flex>
          <Text fontSize="xs" color="blue.400" fontFamily="mono">
            TO INFIN80 AND BEYOND
          </Text>
        </Box>

        {/* Add Video Call Screen */}
        <Box
          mb="4"
          bg="black"
          rounded="md"
          border="2px"
          borderColor="gray.700"
          overflow="hidden"
        >
          <Flex
            bg="gray.800"
            fontSize="xs"
            fontFamily="mono"
            p="1"
            justify="space-between"
            align="center"
            borderBottom="1px"
            borderColor="gray.700"
          >
            <Text>COMM LINK: {currentStation}</Text>
            <Box
              h="2"
              w="2"
              rounded="full"
              bg={activeCall ? "red.500" : "gray.600"}
              animation={activeCall ? "pulse 2s infinite" : "none"}
            />
          </Flex>

          <Box h="32" position="relative">
            {mounted && (
              <>
                {activeCall ? (
                  <>
                    <Flex
                      position="absolute"
                      inset="0"
                      align="center"
                      justify="center"
                    >
                      {/* Main video container with effects */}
                      <Box
                        w="100%"
                        h="100%"
                        position="relative"
                        overflow="hidden"
                      >
                        {/* Static video overlay - varies opacity based on connection phase */}
                        <Box
                          as="video"
                          position="absolute"
                          top="0"
                          left="0"
                          width="100%"
                          height="100%"
                          objectFit="cover"
                          src="/deadAir.mp4"
                          autoPlay
                          muted
                          loop
                          zIndex="2"
                          opacity={
                            connectionPhase < 4
                              ? connectionPhase === 1
                                ? 0.9
                                : connectionPhase === 2
                                ? 0.6
                                : connectionPhase === 3
                                ? 0.3
                                : 0
                              : 0
                          }
                          transition="opacity 0.8s ease"
                        />

                        {/* Replace the old video with Sitepal integration */}
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          width="100%"
                          height="100%"
                          objectFit="cover"
                          zIndex="1"
                          ref={sitepalContainerRef}
                        >
                          {activeCall && (
                            <iframe
                              ref={sitepalIframeRef}
                              src="/sitepal/index.html"
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              marginHeight="0"
                              marginWidth="0"
                              scrolling="no"
                              allowFullScreen
                              allow="microphone"
                              title="SitePal Avatar"
                              style={{
                                width: "100%",
                                height: "100%",
                                border: "none",
                                overflow: "hidden",
                                background: "transparent",
                              }}
                            />
                          )}
                        </Box>

                        {/* Scanlines overlay - Temporarily hide */}
                        {/* <Box
                          position="absolute"
                          top="0"
                          left="0"
                          width="100%"
                          height="100%"
                          zIndex="3"
                          opacity={
                            connectionPhase < 4
                              ? connectionPhase === 1
                                ? 0.8
                                : connectionPhase === 2
                                ? 0.6
                                : connectionPhase === 3
                                ? 0.3
                                : 0
                              : 0
                          }
                          transition="opacity 0.8s ease"
                          sx={{
                            background:
                              "linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.25) 50%)",
                            backgroundSize: "100% 4px",
                            pointerEvents: "none",
                          }}
                        /> */}

                        {/* Connection status text - Temporarily hide */}
                        {connectionPhase < 4 && (
                          <Flex
                            position="absolute"
                            bottom="2"
                            left="2"
                            zIndex="4"
                            align="center"
                            bg="rgba(0,0,0,0.6)"
                            px="2"
                            py="1"
                            borderRadius="md"
                            color={
                              connectionPhase === 1
                                ? "red.400"
                                : connectionPhase === 2
                                ? "yellow.400"
                                : "green.400"
                            }
                            fontSize="xs"
                            fontFamily="mono"
                            fontWeight="bold"
                          >
                            <Box
                              h="2"
                              w="2"
                              rounded="full"
                              bg={
                                connectionPhase === 1
                                  ? "red.500"
                                  : connectionPhase === 2
                                  ? "yellow.500"
                                  : "green.500"
                              }
                              mr="2"
                              animation="pulse 1s infinite"
                            />
                            {connectionPhase === 1
                              ? "SIGNAL ACQUISITION..."
                              : connectionPhase === 2
                              ? "STABILIZING SIGNAL..."
                              : connectionPhase === 3
                              ? "ENHANCING CLARITY..."
                              : "CONNECTED"}
                          </Flex>
                        )}

                        {/* Intermittent signal loss effect - Temporarily hide */}
                        {/* {connectionPhase === 2 && (
                          <Box
                            position="absolute"
                            top="0"
                            left="0"
                            width="100%"
                            height="100%"
                            zIndex="5"
                            bg="black"
                            opacity="0"
                            animation="signalLoss 3s infinite"
                            sx={{
                              "@keyframes signalLoss": {
                                "0%": { opacity: 0 },
                                "5%": { opacity: 0.8 },
                                "7%": { opacity: 0 },
                                "30%": { opacity: 0 },
                                "32%": { opacity: 0.6 },
                                "33%": { opacity: 0 },
                                "80%": { opacity: 0 },
                                "82%": { opacity: 0.7 },
                                "83%": { opacity: 0 },
                                "100%": { opacity: 0 },
                              },
                            }}
                          />
                        )} */}

                        {/* Color distortion effect - Temporarily hide */}
                        {/* <Box
                          position="absolute"
                          top="0"
                          left="0"
                          width="100%"
                          height="100%"
                          zIndex="3"
                          opacity={connectionPhase < 3 ? 0.15 : 0}
                          transition="opacity 0.8s ease"
                          mixBlendMode="color"
                          bg="red.500"
                          animation={
                            connectionPhase < 3
                              ? "colorShift 4s infinite"
                              : "none"
                          }
                          sx={{
                            "@keyframes colorShift": {
                              "0%": { backgroundColor: "red.500" },
                              "33%": { backgroundColor: "blue.500" },
                              "66%": { backgroundColor: "green.500" },
                              "100%": { backgroundColor: "red.500" },
                            },
                          }}
                        /> */}

                        {/* Add a visual audio indicator when connection is established */}
                        {connectionPhase === 4 && (
                          <Box
                            position="absolute"
                            top="2"
                            right="2"
                            zIndex="10"
                            px="2"
                            py="1"
                            borderRadius="md"
                            bg="rgba(0,0,0,0.6)"
                            color="green.400"
                            fontSize="xs"
                            fontFamily="mono"
                            display="flex"
                            alignItems="center"
                          >
                            <Box
                              as="span"
                              mr="1"
                              animation="audioWave 1.5s infinite"
                              display="inline-block"
                              sx={{
                                "@keyframes audioWave": {
                                  "0%": { opacity: 0.4 },
                                  "50%": { opacity: 1 },
                                  "100%": { opacity: 0.4 },
                                },
                              }}
                            >
                              🔊
                            </Box>
                            AUDIO
                          </Box>
                        )}
                      </Box>
                    </Flex>

                    {/* User camera placeholder - updated to show Clerk avatar if available */}
                    <Box
                      position="absolute"
                      bottom="2"
                      right="2"
                      bg="gray.900"
                      border="1px"
                      borderColor="#c48901"
                      p="1"
                      rounded="sm"
                      zIndex="10"
                    >
                      <Box
                        w="40px"
                        h="30px"
                        bg="gray.700"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontSize="8px"
                        color="gray.500"
                        position="relative"
                        overflow="hidden"
                      >
                        {isSignedIn && user?.imageUrl ? (
                          <Image
                            src={user.imageUrl}
                            alt="User"
                            width={40}
                            height={30}
                            objectFit="cover"
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                            }}
                          />
                        ) : (
                          <>
                            <Box
                              as="span"
                              fontSize="24px"
                              position="relative"
                              top="-1px"
                            >
                              😊
                            </Box>
                          </>
                        )}

                        {/* Overlay frame to give it a webcam look */}
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          right="0"
                          bottom="0"
                          border="1px solid rgba(0,30,60,0.3)"
                          boxShadow="inset 0 0 5px rgba(0,0,0,0.5)"
                          pointerEvents="none"
                          zIndex="1"
                        />

                        {/* Small red recording indicator */}
                        <Box
                          position="absolute"
                          top="1px"
                          right="1px"
                          width="3px"
                          height="3px"
                          borderRadius="full"
                          bg="red.500"
                          zIndex="2"
                        />
                      </Box>
                    </Box>

                    {/* Only show LIVE indicator when fully connected */}
                    {connectionPhase === 4 && (
                      <Text
                        position="absolute"
                        bottom="2"
                        left="2"
                        color="green.500"
                        fontSize="xs"
                        fontFamily="mono"
                        animation="pulse 2s infinite"
                        zIndex="10"
                      >
                        LIVE
                      </Text>
                    )}
                  </>
                ) : (
                  <Flex
                    h="full"
                    align="center"
                    justify="center"
                    bg="gray.900"
                    position="relative"
                    overflow="hidden"
                  >
                    {/* Static noise video */}
                    <Box
                      as="video"
                      position="absolute"
                      top="0"
                      left="0"
                      width="100%"
                      height="100%"
                      objectFit="cover"
                      opacity="0.4"
                      autoPlay
                      muted
                      loop
                      playsInline
                      src="/deadAir.mp4"
                      animation="fadeIn 0.5s ease-in"
                    />
                    <Text
                      color="gray.600"
                      fontSize="sm"
                      fontFamily="mono"
                      zIndex="1"
                    >
                      NO SIGNAL
                    </Text>
                    <Box
                      position="absolute"
                      top="0"
                      left="0"
                      w="full"
                      h="full"
                      zIndex="1"
                    >
                      <Box
                        w="full"
                        h="1px"
                        bg="gray.800"
                        position="absolute"
                        top="50%"
                        left="0"
                      />
                      <Box
                        h="full"
                        w="1px"
                        bg="gray.800"
                        position="absolute"
                        left="50%"
                        top="0"
                      />
                    </Box>
                  </Flex>
                )}
              </>
            )}
          </Box>

          <Flex bg="gray.800" p="1" justify="space-between">
            <Button
              fontSize="xs"
              fontFamily="mono"
              px="2"
              py="1"
              rounded="md"
              bg={
                !activeCall
                  ? "green.700"
                  : isMuted && connectionPhase === 4
                  ? "yellow.700"
                  : "red.700"
              }
              color="white"
              _hover={{
                bg: !activeCall
                  ? "green.600"
                  : isMuted && connectionPhase === 4
                  ? "yellow.600"
                  : "red.600",
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleCall(e);
                // Force panel to stay open
                setIsTextBoxVisible(true);
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              size="xs"
              position="relative"
              pointerEvents="auto"
              zIndex="5001"
              sx={{
                "&:hover, &:focus, &:active": {
                  transform: "none",
                },
              }}
            >
              {!activeCall
                ? "CONNECT"
                : isMuted && connectionPhase === 4
                ? "UN-MUTE"
                : "END CALL"}
            </Button>
            <Select
              bg="gray.900"
              color="#c48901"
              fontSize="xs"
              fontFamily="mono"
              borderColor="gray.700"
              rounded="md"
              value={currentStation}
              onChange={(e) => setCurrentStation(e.target.value)}
              isDisabled={activeCall}
              size="xs"
              width="auto"
            >
              <option>LUNAR BASE ALPHA</option>
              <option>MARS OUTPOST</option>
              <option>ORBITAL STATION</option>
              <option>EARTH HQ</option>
            </Select>
          </Flex>
        </Box>

        {/* Button Grid */}
        <Grid templateColumns="repeat(2, 1fr)" gap="4" mb="6">
          <Button
            bg="red.700"
            _hover={{ bg: "red.600" }}
            rounded="lg"
            p="3"
            color="white"
            fontFamily="mono"
            boxShadow="md"
            border="2px solid"
            borderColor="red.500"
            flexDirection="column"
            onClick={handleMonsterModeToggle}
          >
            <Text fontSize="xs" mb="1">
              INITIATE
            </Text>
            <Text fontWeight="bold">LAUNCH</Text>
          </Button>

          <Button
            bg="blue.700"
            _hover={{ bg: "blue.600" }}
            rounded="lg"
            p="3"
            color="white"
            fontFamily="mono"
            boxShadow="md"
            border="2px solid"
            borderColor="blue.500"
            flexDirection="column"
            onClick={() => onButtonClick("ORBIT")}
          >
            <Text fontSize="xs" mb="1">
              ADJUST
            </Text>
            <Text fontWeight="bold">ORBIT</Text>
          </Button>

          <Button
            bg="green.700"
            _hover={{ bg: "green.600" }}
            rounded="lg"
            p="3"
            color="white"
            fontFamily="mono"
            boxShadow="md"
            border="2px solid"
            borderColor="green.500"
            flexDirection="column"
            onClick={() => onButtonClick("COMMS")}
          >
            <Text fontSize="xs" mb="1">
              ACTIVATE
            </Text>
            <Text fontWeight="bold">COMMS</Text>
          </Button>

          <Button
            bg="yellow.700"
            _hover={{ bg: "yellow.600" }}
            rounded="lg"
            p="3"
            color="white"
            fontFamily="mono"
            boxShadow="md"
            border="2px solid"
            borderColor="yellow.500"
            flexDirection="column"
            onClick={() => onButtonClick("RETURN")}
          >
            <Text fontSize="xs" mb="1">
              PLAN
            </Text>
            <Text fontWeight="bold">RETURN</Text>
          </Button>
        </Grid>

        {/* System Controls - Updated to 80s and Mission Mode */}
        <Box
          bg="gray.800"
          p="3"
          rounded="md"
          border="1px"
          borderColor="gray.700"
          mb="6"
        >
          <Flex justify="space-between" align="center" mb="4">
            <Text
              fontFamily="mono"
              fontSize="sm"
              color={is80sMode ? "pink.300" : "gray.400"}
            >
              80s MODE
            </Text>
            <Switch
              isChecked={is80sMode}
              onChange={handle80sModeToggle}
              sx={{
                "& .chakra-switch__track": {
                  background: is80sMode ? "#ff71ce" : "#8e662b",
                  boxShadow: is80sMode ? "0 0 10px #ff71ce" : "none",
                },
                "& .chakra-switch__thumb": {
                  background: "white",
                },
              }}
            />
          </Flex>

          <Flex justify="space-between" align="center">
            <Text
              fontFamily="mono"
              fontSize="sm"
              color={monsterMode ? "cyan.300" : "gray.400"}
            >
              MISSION MODE
            </Text>
            <Switch
              isChecked={monsterMode}
              onChange={handleMonsterModeToggle}
              sx={{
                "& .chakra-switch__track": {
                  background: monsterMode ? "#01cdfe" : "#8e662b",
                  boxShadow: monsterMode ? "0 0 10px #01cdfe" : "none",
                },
                "& .chakra-switch__thumb": {
                  background: "white",
                },
              }}
            />
          </Flex>
        </Box>

        {/* Leaderboard Display */}
        <Box
          flexGrow="1"
          bg="black"
          rounded="md"
          border="2px"
          borderColor="gray.700"
          p="2"
          fontFamily="mono"
          color="green.500"
          fontSize="sm"
          overflow="hidden"
          minH="180px"
          maxH="200px"
        >
          <Text
            textAlign="center"
            borderBottom="1px"
            borderColor="green.800"
            pb="1"
            mb="2"
            fontSize="xs"
          >
            MISSION LEADERBOARD
          </Text>

          <Flex
            justify="space-between"
            fontSize="xs"
            mb="1"
            borderBottom="1px"
            borderColor="gray.800"
            pb="1"
          >
            <Text>ASTRONAUT</Text>
            <Text>SCORE</Text>
          </Flex>

          <Box overflowY="auto" height="40">
            {leaderboardData.map((entry, index) => (
              <Flex
                key={index}
                justify="space-between"
                py="1"
                color={index === 0 ? "yellow.400" : "inherit"}
                fontWeight={index === 0 ? "bold" : "normal"}
              >
                <Text>{entry.name}</Text>
                <Text>{entry.score}</Text>
              </Flex>
            ))}
          </Box>

          <Text
            mt="2"
            fontSize="xs"
            textAlign="center"
            color="blue.400"
            animation="pulse 2s infinite"
          >
            TRANSMISSION LIVE
          </Text>
        </Box>

        {/* Status Footer */}
        <Flex mt="4" justify="space-between">
          <Flex align="center">
            <Box
              w="3"
              h="3"
              rounded="full"
              mr="2"
              bg={
                activeCall || is80sMode || monsterMode ? "green.500" : "red.500"
              }
            />
            <Text fontSize="xs" fontFamily="mono">
              STATUS
            </Text>
          </Flex>
          <Image
            src="/favicon.svg"
            width={24}
            height={24}
            alt="Mission Logo"
            mr="2"
          />
          <Text fontSize="xs" fontFamily="mono" color="gray.500">
            MCP v1.0
          </Text>
        </Flex>
        {/* <Box mt="10">
          <h5 className="thelma1" style={{ fontSize: "1" }}>
            To Infin80
            <br />
            and Beyond
          </h5>
        </Box> */}
      </Box>

      {/* Add Stake Modal */}
      {showStake && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100vw"
          height="100vh"
          backgroundColor="rgba(0, 0, 0, 0.85)"
          backdropFilter="blur(5px)"
          display="flex"
          justifyContent="center"
          alignItems="center"
          zIndex="9999"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStake(false);
            }
          }}
        >
          <Box
            position="relative"
            width="90%"
            maxWidth={{ base: "350px", md: "500px" }}
            backgroundColor="rgba(21, 21, 21, 0.95)"
            borderRadius="20px"
            padding={{ base: "1.5rem", md: "2rem" }}
            boxShadow="0 0 20px rgba(142, 102, 43, 0.3)"
            border="1px solid rgba(142, 102, 43, 0.2)"
            _before={{
              content: '""',
              position: "absolute",
              inset: "-2px",
              borderRadius: "22px",
              padding: "2px",
              background:
                "linear-gradient(45deg, rgba(142, 102, 43, 0.3), rgba(255, 215, 0, 0.3))",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
            }}
          >
            <Button
              position="absolute"
              right="-12px"
              top="-12px"
              size="sm"
              width="30px"
              height="30px"
              minWidth="30px"
              borderRadius="full"
              onClick={() => setShowStake(false)}
              zIndex="1"
              backgroundColor="rgba(21, 21, 21, 0.95)"
              border="1px solid rgba(142, 102, 43, 0.4)"
              color="#8e662b"
              fontSize="14px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              _hover={{
                backgroundColor: "rgba(142, 102, 43, 0.2)",
                color: "#8e662b",
                transform: "scale(1.1)",
              }}
              transition="all 0.2s ease"
            >
              ✕
            </Button>
            <Box
              sx={{
                ".burnButton, button": {
                  background:
                    "linear-gradient(315deg, #ffc4ec -10%, #efdbfd 50%, #ffedd6 110%) !important",
                  color: "#1b1724 !important",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    transform: "scale(1.05)",
                    boxShadow: "0 0 15px rgba(142, 102, 43, 0.3)",
                  },
                },
                input: {
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(142, 102, 43, 0.3)",
                  borderRadius: "8px",
                  color: "#fff",
                  padding: "10px",
                  "&:focus": {
                    borderColor: "#8e662b",
                    boxShadow: "0 0 0 1px #8e662b",
                  },
                },
                p: {
                  color: "#8e662b",
                  margin: "8px 0",
                  fontSize: "1rem",
                  textAlign: "center",
                },
                // Center the ConnectButton and its container
                "& > div:first-of-type": {
                  display: "flex !important",
                  justifyContent: "center !important",
                  marginBottom: "1rem !important",
                },
                // Style the wallet details section
                "& > div > div": {
                  display: "flex !important",
                  flexDirection: "column !important",
                  alignItems: "center !important",
                  margin: "10px 0 !important",
                },
                // Style the button container for Stake and Withdraw
                "& > div > div:nth-of-type(2)": {
                  display: "flex !important",
                  flexDirection: "row !important",
                  justifyContent: "center !important",
                  alignItems: "center !important",
                  gap: "10px !important",
                  width: "100% !important",
                  maxWidth: "300px !important",
                  margin: "1rem auto !important",
                  "& > button": {
                    flex: "1 1 auto !important",
                    minWidth: "120px !important",
                    height: "40px !important",
                    margin: "0 !important",
                    padding: "0 15px !important",
                    fontSize: "14px !important",
                    fontWeight: "600 !important",
                    whiteSpace: "nowrap !important",
                    overflow: "hidden !important",
                    textOverflow: "ellipsis !important",
                    display: "flex !important",
                    alignItems: "center !important",
                    justifyContent: "center !important",
                    borderRadius: "8px !important",
                    border: "none !important",
                    boxSizing: "border-box !important",
                  },
                },
                // Style the claim rewards button container
                "& > div > div:last-of-type": {
                  display: "flex !important",
                  flexDirection: "column !important",
                  alignItems: "center !important",
                  width: "100% !important",
                  marginTop: "1rem !important",
                  "& > button": {
                    margin: "0 !important",
                    minWidth: "150px !important",
                  },
                },
                // Make modal content more compact
                "& > div": {
                  margin: "0 !important",
                  padding: "0 !important",
                },
              }}
            >
              <Stake />
            </Box>
          </Box>
        </Box>
      )}

      {/* Existing PayEmbed Modal */}
      {showPayEmbed && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100vw"
          height="100vh"
          backgroundColor="rgba(0, 0, 0, 0.8)"
          display="flex"
          justifyContent="center"
          alignItems="center"
          zIndex="9999"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPayEmbed(false);
            }
          }}
        >
          <Box
            position="relative"
            width="90%"
            maxWidth="600px"
            backgroundColor="transparent"
            borderRadius="10px"
            padding="20px"
          >
            <Button
              position="absolute"
              right="-10px"
              top="-10px"
              size="sm"
              borderRadius="full"
              onClick={() => setShowPayEmbed(false)}
              zIndex="1"
              backgroundColor="rgba(0, 0, 0, 0.8)"
              color="white"
              _hover={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
            >
              ✕
            </Button>
            <PayEmbed
              client={client}
              themeConfig={{
                colors: {
                  accentText: "#8e662b",
                  accentButtonBg: "#8e662b",
                  modalBg: "rgba(21, 21, 21, 0.95)",
                },
              }}
              connectOptions={{
                connectModal: {
                  size: "compact",
                  title: "Sign in",
                },
              }}
              payOptions={{
                buyWithFiat: {
                  testMode: true, // defaults to false
                },
                prefillBuy: {
                  token: {
                    address: "0x1D0AE877913917eE3a3e8585D658E9e4dC545c83",
                    name: "STAKE",
                    symbol: "STAKE",
                    icon: "...", // optional
                  },
                  chain: baseSepolia,
                  allowEdits: {
                    amount: true, // allow editing buy amount
                    token: false, // disable selecting buy token
                    chain: false, // disable selecting buy chain
                  },
                },
              }}
            />
          </Box>
        </Box>
      )}
    </>
  );
};

export default SidePanel;
