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
import { getUserImageUrl, getUsername, createUserData } from "../utilities/clerkHelpers";

// Dynamically import the MusicPlayer component
const MusicPlayer2 = dynamic(() => import("./MusicPlayer2"), {
  ssr: false,
});

const SidePanel = ({
  onButtonClick,
  is80sMode,
  toggle80sMode,
  monsterMode,
  toggleMonsterMode,
  showSpotify,
  rocketModelVisible,
  toggleRocketModel,
  toggleConstellationVisibility,
  setShowSpotify,
  handleIgnition,
}) => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showPayEmbed, setShowPayEmbed] = useState(false);
  const [showStake, setShowStake] = useState(false);
  const [sitepalLoaded, setSitepalLoaded] = useState(false);
  const sitepalContainerRef = useRef(null);
  const panelRef = useRef(null);
  const hotzoneSize = 25;

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
  const [panelWidth, setPanelWidth] = useState("320px");

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

  // Add state for vaporwave video overlay
  const [showVaporwaveVideo, setShowVaporwaveVideo] = useState(false);

  // First, add a new ref to store the active microphone stream
  const microphoneStreamRef = useRef(null);

  // Add a ref for the mission control iframe
  const missionControlIframeRef = useRef(null);

  // Add a local state to track constellation visibility in SidePanel
  const [localConstellationsVisible, setLocalConstellationsVisible] = useState(false);

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
      // Use helper functions to create user data
      const userData = createUserData(user);

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
  const sendMessageToIframe = useCallback((message) => {
    console.log('Sending message to iframe:', message);
    const iframe = document.querySelector('iframe');
    console.log('Found iframe:', iframe);
    
    if (iframe && iframe.contentWindow) {
      console.log('Posting message to iframe');
      try {
        iframe.contentWindow.postMessage(message, '*');
        console.log('Message posted to iframe successfully');
      } catch (error) {
        console.error('Error posting message to iframe:', error);
      }
    } else {
      console.warn('Iframe or contentWindow not found');
    }
  }, []);

  // Add this new function
  const handleIgnitionClick = useCallback(() => {
    console.log('Ignition button clicked in SidePanel');
    if (handleIgnition) {
      console.log('Calling handleIgnition prop');
      handleIgnition();
      // Also send message to iframe to update its state
      sendMessageToIframe({ type: 'IGNITION_CLICKED' });
    } else {
      console.warn('handleIgnition prop not provided to SidePanel');
    }
  }, [handleIgnition, sendMessageToIframe]);

  const updateVideoPosition = useCallback(() => {
    const iframe = missionControlIframeRef.current;
    if (iframe && iframe.contentWindow) {
      const offlineDisplay = 
        iframe.contentDocument?.querySelector("#offline-display");
      if (offlineDisplay) {
        const rect = offlineDisplay.getBoundingClientRect();
        const videoContainer = document.querySelector(".vaporwave-container");
        if (videoContainer) {
          // Set dimensions first
          videoContainer.style.top = `${rect.top}px`;
          videoContainer.style.left = `${rect.left}px`;
          videoContainer.style.width = `${rect.width}px`;
          videoContainer.style.height = `${rect.height}px`;
          
          // After a small delay, make it visible
          setTimeout(() => {
            videoContainer.style.opacity = "1";
            videoContainer.style.visibility = "visible";
          }, 50);
        }
      }
    }
  }, []);

  // Add a function to handle constellation visibility toggle
  const handleConstellationToggle = useCallback(() => {
    // Call the toggle function provided as prop
    if (toggleConstellationVisibility) {
      toggleConstellationVisibility();
      
      // Update local state
      setLocalConstellationsVisible(prev => !prev);
      
      // Send message to iframe to update the UI state with proper state value
      if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
        const newState = !localConstellationsVisible;
        console.log("Sending SYNC_STATE with constellations:", newState);
        
        // Add a small delay to ensure state has been updated
        setTimeout(() => {
          missionControlIframeRef.current.contentWindow.postMessage(
            {
              type: "SYNC_STATE",
              isConstellationsEnabled: newState
            },
            "*"
          );
        }, 50);
      }
    }
  }, [toggleConstellationVisibility, localConstellationsVisible, missionControlIframeRef]);

  // Add an effect to sync constellation visibility with iframe
  useEffect(() => {
    // This would ideally use a state variable like isConstellationsVisible
    // but since we don't have that prop in SidePanel, we're handling toggle events directly
  }, []);

  // Update the useEffect for message handling
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('Received message in SidePanel:', event.data);
      if (event.data && event.data.type === 'IGNITION_CLICK') {
        console.log('Ignition click received from iframe');
        handleIgnitionClick();
      }
      else if (event.data && event.data.type === 'START_SYNTHWAVE_TRANSITION') {
        console.log('START_SYNTHWAVE_TRANSITION received from iframe');
        handleIgnitionClick();
      }
      else if (event.data && event.data.type === 'CONSTELLATION_TOGGLE') {
        console.log('Constellation toggle received from iframe');
        handleConstellationToggle();
      }
      else if (event.data && event.data.type === 'REQUEST_STATE') {
        console.log('Received state request from iframe');
        if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
          missionControlIframeRef.current.contentWindow.postMessage(
            {
              type: "SYNC_STATE",
              isConstellationsEnabled: localConstellationsVisible
            },
            "*"
          );
        }
      }
      else if (event.data && event.data.type === 'NAVIGATE_TO_HOME') {
        console.log('Navigation to home request received from iframe');
        router.push('/home');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleIgnitionClick, handleConstellationToggle, localConstellationsVisible, missionControlIframeRef, router]);

  // Add useEffect to handle iframe loading
  useEffect(() => {
    const iframe = document.querySelector('iframe');
    if (iframe) {
      iframe.onload = () => {
        console.log('Iframe loaded, sending initial state');
        sendMessageToIframe({ 
          type: 'INITIAL_STATE',
          showSpotify,
          is80sMode,
          monsterMode,
          rocketModelVisible,
          isConstellationsVisible: localConstellationsVisible // Use local state here
        });
      };
    }
  }, [showSpotify, is80sMode, monsterMode, rocketModelVisible, sendMessageToIframe, localConstellationsVisible]);

  // Add an effect to sync constellation visibility with iframe when it changes
  useEffect(() => {
    if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
      console.log("Syncing constellation state:", localConstellationsVisible);
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SYNC_STATE",
          isConstellationsEnabled: localConstellationsVisible
        },
        "*"
      );
    }
  }, [localConstellationsVisible]);

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
    
    // Also send a direct update for the signal button state
    if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
      missionControlIframeRef.current.contentWindow.postMessage({
        type: "UPDATE_SIGNAL_BUTTON_STATE",
        is80sModeActive: is80sMode,
        isMusicActive: showSpotify
      }, "*");
    }
  }, [is80sMode, monsterMode, showSpotify, sendMessageToIframe]);

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

  // Function to sync state to the iframe
  const syncIframeState = useCallback(() => {
    const iframe = missionControlIframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: "SYNC_STATE",
          isEightiesMode: is80sMode,
          isMusicEnabled: showSpotify,
          isLaunchMode: monsterMode,
          isRocketModelVisible: rocketModelVisible,
        },
        "*"
      );
    }
  }, [is80sMode, showSpotify, monsterMode, rocketModelVisible]);

  // Sync state when iframe loads
  const handleIframeLoad = useCallback(() => {

    // Wait a tick to ensure iframe JS is ready
    setTimeout(() => {
      syncIframeState();
      
      // Expand video screen immediately if in 80s mode
      if (is80sMode && missionControlIframeRef.current) {
        // First, ensure the video is hidden
        const videoContainer = document.querySelector(".vaporwave-container");
        if (videoContainer) {
          videoContainer.style.opacity = "0";
          videoContainer.style.visibility = "hidden";
        }
        
        // Tell the iframe to expand the video area
        missionControlIframeRef.current.contentWindow.postMessage(
          {
            type: "EXPAND_VIDEO_SCREEN",
            expanded: true,
          },
          "*"
        );
        
        // Allow time for the iframe to process before positioning the video
        setTimeout(updateVideoPosition, 200);
      }
    }, 100);
  }, [syncIframeState, is80sMode, updateVideoPosition]);

  // Also sync state whenever relevant state changes (in case iframe reloads)
  useEffect(() => {
    syncIframeState();
  }, [syncIframeState]);

  // Add effect to monitor 80s mode changes
  useEffect(() => {

    setShowVaporwaveVideo(is80sMode);
    
    // When exiting 80s mode, ensure the video overlay is hidden immediately
    if (!is80sMode) {
      const videoContainer = document.querySelector(".vaporwave-container");
      if (videoContainer) {
        videoContainer.style.opacity = "0";
        videoContainer.style.visibility = "hidden";
      }
    }
  }, [is80sMode]);

  // Handle Tenor script loading for 80s mode
  useEffect(() => {
    if (is80sMode) {
      const script = document.createElement("script");
      script.src = "https://tenor.com/embed.js";
      script.async = true;
      script.id = "tenor-script";
      document.body.appendChild(script);

      return () => {
        const existingScript = document.getElementById("tenor-script");
        if (existingScript) {
          document.body.removeChild(existingScript);
        }
      };
    }
  }, [is80sMode]);

  // Add effect to update video position when panel becomes visible
  useEffect(() => {
    if (isTextBoxVisible && is80sMode) {
      // First, ensure the video is hidden
      const videoContainer = document.querySelector(".vaporwave-container");
      if (videoContainer) {
        videoContainer.style.opacity = "0";
        videoContainer.style.visibility = "hidden";
      }
      
      // Wait for panel animation to complete
      setTimeout(() => {
        updateVideoPosition();
      }, 300);
    }
  }, [isTextBoxVisible, is80sMode, updateVideoPosition]);

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
          width="25%"
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
        width="320px"
        height="100%"
        zIndex="5000"
        transform={isTextBoxVisible ? "translateX(0)" : "translateX(100%)"}
        transition="transform 0.4s ease-out"
        overflow="hidden"
        backgroundColor="transparent"
        display="flex"
        flexDirection="column"
      >
        {/* Video overlay */}
        {is80sMode && (
          <Box
            className="vaporwave-container"
            position="absolute"
            zIndex="5002"
            overflow="hidden"
            backgroundColor="black"
            borderRadius="4px"
            width="320px"
            height="180px"
            top="60px"
            left="0"
            opacity="0"
            transition="opacity 0.3s ease-in"
            visibility="hidden"
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              style={{
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
              }}
            >
              <source src="/vaporwave-sunset.mp4" type="video/mp4" />
            </video>
          </Box>
        )}
        
        {/* Mission Control iframe in a flex container taking most of the space */}
        <Box flex="1" minHeight="0" overflow="hidden">
          <iframe
            src="/cyberpunk_mission_control.html"
            ref={missionControlIframeRef}
            style={{ width: '100%', height: '100%', border: 'none' }}
            onLoad={() => {
              console.log('Iframe loaded, sending initial state');
              setSitepalLoaded(true);
              // Send initial state to iframe with a small delay
              setTimeout(() => {
                sendMessageToIframe({
                  type: 'INITIAL_STATE',
                  data: {
                    // No need to send the function anymore
                  }
                });
              }, 200);
            }}
          />
        </Box>
        
        {/* Integrated Music Player - NOT absolutely positioned but in the normal flow */}
        {showSpotify && (
          <Box
            width="100%"
            height="auto" 
            backgroundColor="transparent"
            overflow="hidden"
          >
            <MusicPlayer2
              isVisible={showSpotify}
              onClose={() => setShowSpotify(false)}
              autoPlay={true}
              is80sMode={is80sMode}
            />
          </Box>
        )}
      </Box>
    </>
  );
};

export default SidePanel;

