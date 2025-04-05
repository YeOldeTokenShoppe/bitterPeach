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
  showSpotify,
  rocketModelVisible,
  toggleRocketModel,
}) => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showPayEmbed, setShowPayEmbed] = useState(false);
  const [showStake, setShowStake] = useState(false);
  const [sitepalLoaded, setSitepalLoaded] = useState(false);
  const sitepalContainerRef = useRef(null);
  const panelRef = useRef(null);
  const hotzoneSize = 20;

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

  // Button click handlers
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Update panel width based on screen size and orientation
  const [panelWidth, setPanelWidth] = useState("280px");

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
  useEffect(() => {
    if (!isTextBoxVisible) return;

    const handleOutsideClick = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) {
        return;
      }
      setIsTextBoxVisible(false);
      setHasUserInteracted(true);
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isTextBoxVisible]);

  // Mouse movement detection for panel visibility
  useEffect(() => {
    if (isTouchDevice) return;

    const handleMouseMove = (event) => {
      const rightEdgeDistance = window.innerWidth - event.clientX;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        if (rightEdgeDistance < hotzoneSize) {
          setIsTextBoxVisible(true);
        } else if (rightEdgeDistance > 300) {
          setIsTextBoxVisible(false);
        }
      }, 100);

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

  // Add this function to send messages to the iframe
  const sendMessageToIframe = (message) => {
    const iframe = document.querySelector(
      'iframe[title="Mission Control Panel"]'
    );
    if (iframe && iframe.contentWindow) {
      try {
        console.log("Sending message to Mission Control iframe:", message);
        iframe.contentWindow.postMessage(message, "*"); // Use specific origin in production

        // Add special handling for SitePal mic activation if still needed
        if (message.type === "ACTIVATE_SITEPAL_MIC") {
          console.log("Special mic activation message detected");
          // Simplified - rely on the iframe's internal handling now
          // We might remove this block entirely later if not needed
        }
      } catch (error) {
        console.error("Error sending message to iframe:", error);
      }
    } else {
      console.warn("Mission Control iframe not found");
    }
  };

  // Update the useEffect for message handling
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || !event.data.type) return;

      // Add origin check for security in production
      // if (event.origin !== 'YOUR_EXPECTED_PARENT_ORIGIN') return;

      console.log("Message received from iframe:", event.data);

      switch (event.data.type) {
        // --- Add this case ---
        case "REQUEST_FIREBASE_CONFIG":
          console.log("Iframe requested Firebase config.");
          // Construct config from environment variables
          const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            // databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Optional
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
            messagingSenderId:
              process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
          };
          // Send config back to the iframe using the existing function
          sendMessageToIframe({
            type: "FIREBASE_CONFIG_RESPONSE",
            config: firebaseConfig,
          });
          console.log(
            "Sent Firebase config to iframe via sendMessageToIframe."
          );
          break;
        // --- End Add this case ---

        case "EIGHTIES_MODE_CHANGE": // Received from iframe toggle
          console.log("80s mode toggle requested by iframe");
          toggle80sMode(); // Call the function passed via props
          break;

        // Add new case for rocket model toggle
        case "TOGGLE_ROCKET_MODEL":
          console.log("SidePanel: Received TOGGLE_ROCKET_MODEL message");
          handleRocketModelToggle();
          break;

        // Modify handling for stereo power based on mode from iframe
        /*
        case "STEREO_POWER_STATE": // Received from iframe power button
            console.log("Stereo power state from iframe:", event.data);
            if (event.data.mode === 'spotify' && !is80sMode) { // Check !is80sMode here too
                const shouldBeActive = event.data.isActive;
                // setShowSpotify(shouldBeActive); // REMOVED - Causes error
                // Optionally tell MusicPlayer2 to play/pause via ref
                if (musicPlayer2Ref.current) {
                    if (!shouldBeActive) {
                       musicPlayer2Ref.current.pause(); // Ensure pause on power off
                    }
                    // We probably don't want to auto-play on power ON from iframe click
                }
                // console.log("Set showSpotify based on iframe spotify mode power: ", shouldBeActive);
            } else {
                console.log("Ignoring stereo power state change in 80s mode or mode mismatch.");
            }
            break;
        */

        // Remove MUSIC_PLAYER_NEXT/PREV cases
        /*
        case "MUSIC_PLAYER_NEXT": // Received from iframe Next button
            if (!is80sMode && musicPlayer2Ref.current) {
                console.log("Relaying NEXT track to MusicPlayer2");
                musicPlayer2Ref.current.nextTrack();
            } else {
                console.log("Ignoring NEXT track in 80s mode or player ref not ready.");
            }
            break;
        case "MUSIC_PLAYER_PREV": // Received from iframe Prev button
            if (!is80sMode && musicPlayer2Ref.current) {
                console.log("Relaying PREV track to MusicPlayer2");
                musicPlayer2Ref.current.prevTrack();
    } else {
                console.log("Ignoring PREV track in 80s mode or player ref not ready.");
            }
            break;
        */
        // --- End Removed cases ---

        // Existing SitePal messages
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

        // Existing messages we might need to keep
        case "LAUNCH_MODE_TOGGLE": // Assuming this is still relevant
          console.log("Launch mode toggle requested");
          if (is80sMode) {
            toggle80sMode();
          }

          if (monsterMode) {
            // If monster mode is active, toggle it off and hide rocket
            toggleMonsterMode();
          } else {
            // If monster mode is not active, turn it on and show rocket
            toggleMonsterMode();
            if (!rocketModelVisible) {
              toggleRocketModel();
            }
          }
          break;

        // We might not need MUSIC_TOGGLE from iframe anymore if STEREO_POWER_STATE handles it
        // case "MUSIC_TOGGLE":
        //   console.log("Music toggle requested");
        //   setShowSpotify(!showSpotify);
        //   break;

        // IFRAME_MUSIC_STATE might be useful for debugging
        case "IFRAME_MUSIC_STATE":
          console.log("Received iframe music state:", event.data);
          break;

        default:
          // Log unhandled message types
          if (event.data.type !== "FIREBASE_CONFIG_RESPONSE") {
            // Avoid logging the config response itself
            console.log("Unhandled message type from iframe:", event.data.type);
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    toggle80sMode,
    toggleMonsterMode,
    monsterMode,
    is80sMode,
    rocketModelVisible,
    toggleRocketModel,
  ]);

  // Sync all states with iframe
  useEffect(() => {
    sendMessageToIframe({
      type: "SET_EIGHTIES_MODE",
      isActive: is80sMode,
    });
    sendMessageToIframe({
      type: "SET_LAUNCH_MODE",
      isActive: monsterMode,
    });
    sendMessageToIframe({
      type: "SET_MUSIC_MODE",
      isActive: showSpotify,
    });
  }, [is80sMode, monsterMode]);

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

            // Tell the iframe to click the call button (CONNECT)
            sendMessageToIframe({
              type: "SIMULATE_CALL_BUTTON_CLICK",
              action: "connect",
            });
          }, 4500);
        })
        .catch((err) => {
          console.error("Microphone permission error:", err);
          alert("Please allow microphone access to chat with the avatar");
        });
    } else if (activeCall && connectionPhase === 4 && isMuted) {
      // Unmute - Send a message to the iframe to click the UN-MUTE button
      try {
        // First prime the audio context for Safari/mobile browsers
        sendMessageToIframe({
          type: "PRIME_AUDIO",
        });

        // Then send command to activate mic using the SitePal API
        sendMessageToIframe({
          type: "SITEPAL_API_CALL",
          function: "startListening",
        });

        // Also send our standard button click message as backup
        sendMessageToIframe({
          type: "SIMULATE_CALL_BUTTON_CLICK",
          action: "unmute",
        });

        // Also send our special message to directly access SitePal mic as last resort
        sendMessageToIframe({
          type: "ACTIVATE_SITEPAL_MIC",
        });

        setIsMuted(false); // Update parent component state optimistically
        console.log("Mic activation messages sent to iframe");
      } catch (error) {
        console.error("Error sending mic activation messages:", error);
      }
    } else {
      // End call - clean up and reset everything
      setActiveCall(false);
      setConnectionPhase(0);
      setSitepalLoadingStage(0);
      setSitepalLoaded(false);
      setIsMuted(true);

      // Tell the iframe to click the disconnect button
      sendMessageToIframe({
        type: "SIMULATE_CALL_BUTTON_CLICK",
        action: "disconnect",
      });

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

  // Add a function to handle rocket model toggle
  const handleRocketModelToggle = () => {
    console.log("SidePanel: Toggling rocket model");
    toggleRocketModel();

    // Send message to iframe
    sendMessageToIframe({
      type: "SET_ROCKET_MODEL_VISIBLE",
      isVisible: !rocketModelVisible,
    });
  };

  // Add an effect to sync rocket model visibility with iframe
  useEffect(() => {
    sendMessageToIframe({
      type: "SET_ROCKET_MODEL_VISIBLE",
      isVisible: rocketModelVisible,
    });
  }, [rocketModelVisible]);

  return (
    <>
      {/* Toggle button for touch devices */}
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

      {/* Hotzone area */}
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

      {/* Main Panel with iframe */}
      <Box
        ref={panelRef}
        position="fixed"
        top="0"
        right="0"
        width="280px"
        height="100%"
        zIndex="5000"
        transform={isTextBoxVisible ? "translateX(0)" : "translateX(100%)"}
        transition="transform 0.4s ease-out"
        overflow="hidden"
        backgroundColor="transparent"
      >
        <iframe
          src="/cyberpunk_mission_control.html"
          style={{
            width: "280px",
            height: "100%",
            border: "none",
            overflow: "hidden",
            display: "block",
            backgroundColor: "transparent",
          }}
          title="Mission Control Panel"
        />
      </Box>
    </>
  );
};

export default SidePanel;
