import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Drawer,
  DrawerContent,
  DrawerCloseButton,
  DrawerOverlay,
  useDisclosure,
  Text,
  VStack,
  HStack,
} from "@chakra-ui/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";

const MobileSidePanel = ({
  is80sMode,
  toggle80sMode,
  monsterMode,
  toggleMonsterMode,
  showSpotify,
  setShowSpotify,
  rocketModelVisible,
  toggleRocketModel,
  toggleConstellationVisibility,
  isConstellationsVisible,
}) => {

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeCall, setActiveCall] = useState(false);
  const [currentStation, setCurrentStation] = useState("LUNAR BASE ALPHA");
  const [sitepalSceneLoaded, setSitepalSceneLoaded] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const [iframeReady, setIframeReady] = useState(false);
  const messageQueueRef = useRef([]);
  const [showVaporwaveVideo, setShowVaporwaveVideo] = useState(false);

  const sitepalIframeRef = useRef(null);
  const missionControlIframeRef = useRef(null);
  const [connectionPhase, setConnectionPhase] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const microphoneStreamRef = useRef(null);

  const router = useRouter();

  // Function to toggle rocket model visibility - now uses the prop function
  const handleRocketModelToggle = () => {

    toggleRocketModel();
    // Send message to iframe
    if (missionControlIframeRef.current) {
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "rocketModelToggle",
          visible: !rocketModelVisible,
        },
        "*"
      );
    }
  };

  // Function to log the state of video screen elements for debugging
  const logVideoScreenState = () => {
    try {
      const iframe = missionControlIframeRef.current;
      if (iframe && iframe.contentDocument) {
        const videoArea = iframe.contentDocument.querySelector("#video-area");
        const offlineDisplay = iframe.contentDocument.querySelector("#offline-display");
        const videoScreen = iframe.contentDocument.querySelector(".video-screen");
        const videoContainer = iframe.contentDocument.querySelector(".video-container");
        
        
      }
    } catch (error) {
      console.error("Error logging video screen state:", error);
    }
  };

  // Add function to update video position
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
          videoContainer.style.transform = "none"; // Remove the translateX since we're setting exact position
          
          // After a small delay, make it visible
          setTimeout(() => {
            videoContainer.style.opacity = "1";
            videoContainer.style.visibility = "visible";
          }, 50);
        }
      }
    }
  }, []);

  // Function to properly expand the video screen by adding the 'active' class
  const expandVideoScreen = () => {
    try {
      const iframe = missionControlIframeRef.current;
      if (!iframe || !iframe.contentDocument) return;


      
      // 1. First, grab the key elements
      const videoDisplay = iframe.contentDocument.querySelector(".video-display");
      const videoFeed = iframe.contentDocument.querySelector("#video-feed");
      const offlineDisplay = iframe.contentDocument.querySelector("#offline-display");
      const deadAir = iframe.contentDocument.querySelector("#deadAir");
      
      // 2. Add 'active' class to video-display - THIS IS THE KEY STEP
      if (videoDisplay) {

        videoDisplay.classList.add("active");
        videoDisplay.classList.add("touched"); // Add touched class to prevent pulsing
        
        // Force the height to be 180px for mobile
        videoDisplay.style.height = "180px";
        
        // Also dispatch a resize event to ensure CSS media queries are applied
        const resizeEvent = new Event('resize');
        iframe.contentWindow.dispatchEvent(resizeEvent);
      }
      
      // 3. Hide deadAir video if it exists
      if (deadAir) {
        deadAir.style.display = "none";
        if (deadAir.pause) deadAir.pause();
      }
      
      // 4. Create or update vaporwave video directly in the video feed
      if (videoFeed) {
        // Check if vaporwave video already exists
        let vaporVideo = videoFeed.querySelector('video[data-vaporwave]');
        
        if (!vaporVideo) {
      
          vaporVideo = iframe.contentDocument.createElement('video');
          vaporVideo.setAttribute('data-vaporwave', 'true');
          vaporVideo.setAttribute('src', '/vaporwave-sunset.mp4');
          vaporVideo.setAttribute('autoplay', '');
          vaporVideo.setAttribute('loop', '');
          vaporVideo.setAttribute('muted', '');
          vaporVideo.setAttribute('playsinline', '');
          vaporVideo.style.position = 'absolute';
          vaporVideo.style.top = '0';
          vaporVideo.style.left = '0';
          vaporVideo.style.width = '100%';
          vaporVideo.style.height = '100%';
          vaporVideo.style.objectFit = 'cover';
          vaporVideo.style.zIndex = '10'; // Above offlineDisplay content
          vaporVideo.style.display = 'block'; // Ensure it's visible
          
          // Add video to the feed
          videoFeed.appendChild(vaporVideo);
          
          // Make sure it's playing
          vaporVideo.play().catch(err => console.warn("Could not autoplay video:", err));
        } else {
          // Update existing video

          vaporVideo.style.display = "block";
          vaporVideo.play().catch(err => console.warn("Could not play video:", err));
        }
        
        // Hide "OFFLINE" text in offlineDisplay
        if (offlineDisplay) {
          const offlineText = offlineDisplay.querySelector("span");
          if (offlineText) offlineText.style.opacity = "0";
        }
      }
      
      // Make sure to hide our overlay video since we're adding it directly to the iframe
      const overlayVideo = document.querySelector(".vaporwave-container");
      if (overlayVideo) {
        overlayVideo.style.display = "none";
      }
      
      // 5. Send a message to the iframe to ensure it knows the video should be expanded
      iframe.contentWindow.postMessage(
        { type: "EXPAND_VIDEO_SCREEN", expanded: true },
        "*"
      );
      
      // 6. Force a reflow to ensure the height change takes effect
      if (videoDisplay) {
        videoDisplay.offsetHeight;
      }
      

    } catch (error) {
      console.error("Error in expandVideoScreen:", error);
    }
  };
  // Function to collapse the video screen when 80s mode is disabled
  const collapseVideoScreen = () => {
    try {
      const iframe = missionControlIframeRef.current;
      if (!iframe || !iframe.contentDocument) return;
      

      
      // 1. Get the video display element
      const videoDisplay = iframe.contentDocument.querySelector(".video-display");
      const videoFeed = iframe.contentDocument.querySelector("#video-feed");
      const offlineDisplay = iframe.contentDocument.querySelector("#offline-display");
      
      // 2. Remove the 'active' class to collapse it
      if (videoDisplay) {

        videoDisplay.classList.remove("active");
        // Keep the touched class to prevent the pulsing animation
      }
      
      // 3. Find and remove or hide the vaporwave video
      if (videoFeed) {
        const vaporVideo = videoFeed.querySelector('video[data-vaporwave]');
        if (vaporVideo) {
 
          vaporVideo.pause();
          vaporVideo.style.display = "none";
          // Optionally remove it entirely
          // vaporVideo.parentNode.removeChild(vaporVideo);
        }
      }
      
      // 4. Restore "OFFLINE" text visibility
      if (offlineDisplay) {
        const offlineText = offlineDisplay.querySelector("span");
        if (offlineText) offlineText.style.opacity = "1";
      }
      
      // 5. Notify the iframe about the state change
      iframe.contentWindow.postMessage(
        { type: "EXPAND_VIDEO_SCREEN", expanded: false },
        "*"
      );
      

    } catch (error) {
      console.error("Error in collapseVideoScreen:", error);
    }
  };
  // Function to send messages to the Mission Control iframe or queue them
  const sendMessageToMissionControl = (message) => {
    const iframe = missionControlIframeRef.current;
    if (iframe && iframe.contentWindow && iframeReady) {
      try {
        // Send any queued messages first
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          iframe.contentWindow.postMessage(queuedMessage, "*");
  
        }
        // Send the current message
        iframe.contentWindow.postMessage(message, "*");

      } catch (error) {
        console.error("Error sending message to iframe:", error);
      }
    } else {
      // Queue the message if iframe is not ready
      console.warn("Iframe not ready, queuing message:", message);
      messageQueueRef.current.push(message);
    }
  };

  // Effect to send SYNC messages TO iframe when props change
  useEffect(() => {

    sendMessageToMissionControl({
      type: "SYNC_MUSIC_STATE",
      enabled: showSpotify,
    });
  }, [showSpotify]); // Re-run when showSpotify changes

  useEffect(() => {

    sendMessageToMissionControl({
      type: "SYNC_80S_STATE",
      enabled: is80sMode,
    });
  }, [is80sMode]); // Re-run when is80sMode changes

  // Effect to sync rocket model state with iframe
  useEffect(() => {

    sendMessageToMissionControl({
      type: "SYNC_ROCKET_MODEL_STATE",
      enabled: rocketModelVisible,
    });
  }, [rocketModelVisible]); // Re-run when rocketModelVisible changes

  // Update the message handler for events FROM iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || !event.data.type) return;

      // Add origin check for security in production
      // if (event.origin !== 'YOUR_EXPECTED_PARENT_ORIGIN') return;

      switch (event.data.type) {
        case "IFRAME_READY":
          console.log("Mobile: Received IFRAME_READY message");
          setIframeReady(true);
          break;
          
        case "REQUEST_STATE":
          if (missionControlIframeRef.current) {
            console.log("Mobile: Received REQUEST_STATE, sending current state");
            missionControlIframeRef.current.contentWindow.postMessage(
              {
                type: "SYNC_STATE",
                isConstellationsEnabled: isConstellationsVisible
              },
              "*"
            );
          }
          break;
          
        // ... other cases like SITEPAL_*, EIGHTIES_MODE_CHANGE, MUSIC_TOGGLE ...
        case "EIGHTIES_MODE_CHANGE":

          toggle80sMode(); // Call the function from gallery.js
          break;
        case "MUSIC_TOGGLE":

          if (typeof event.data.enabled === "boolean") {
            setShowSpotify(event.data.enabled); // Call the function from gallery.js
          } else {
            console.warn(
              "MUSIC_TOGGLE message received without boolean 'enabled' property."
            );
          }
          break;
        case "ROCKET_MODEL_TOGGLE":
 
          if (typeof event.data.enabled === "boolean" && toggleRocketModel) {
            // Only toggle if the current state doesn't match the desired state
            if (rocketModelVisible !== event.data.enabled) {
              toggleRocketModel();
            }
          } else {
            console.warn(
              "ROCKET_MODEL_TOGGLE message received without boolean 'enabled' property or toggleRocketModel function not provided."
            );
          }
          break;
        case "LAUNCH_MODE_TOGGLE":
     
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
        case "CONSTELLATION_TOGGLE":
          console.log("Mobile received CONSTELLATION_TOGGLE message");
          if (toggleConstellationVisibility) {
            // Call the toggle function
            toggleConstellationVisibility();
            
            // Send a sync message back to ensure state consistency
            if (missionControlIframeRef.current) {
              const newState = !isConstellationsVisible;
              console.log("Mobile sending SYNC_STATE with:", newState);
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
          break;
        case "RESIZE":
        case "LAYOUT_CHANGE":
          if (is80sMode) {
            // First hide video
            const videoContainer = document.querySelector(".vaporwave-container");
            if (videoContainer) {
              videoContainer.style.opacity = "0";
              videoContainer.style.visibility = "hidden";
            }
            
            // Wait a bit before updating position
            setTimeout(() => {
              updateVideoPosition();
              // Show video after position update
              if (videoContainer) {
                setTimeout(() => {
                  videoContainer.style.opacity = "1";
                  videoContainer.style.visibility = "visible";
                }, 50);
              }
            }, 100);
          }
          break;
        case "EXPAND_VIDEO_SCREEN":
          if (is80sMode) {

            // Use our new approach to integrate with iframe
            if (event.data.expanded) {
              expandVideoScreen();
            } else {
              collapseVideoScreen();
            }
          }
          break;

        case "SITEPAL_LOADED":
          if (is80sMode && missionControlIframeRef.current) {
     
            // Use our new approach to integrate with iframe
            expandVideoScreen();
          }
          break;
        // ... rest of the cases like LAUNCH_MODE_TOGGLE, CONSTELLATION_TOGGLE etc.
        case "NAVIGATE_TO_HOME":

          router.push("/home");
          break;
        default:
          // Log unhandled message types
          if (event.data.type !== "FIREBASE_CONFIG_RESPONSE") {
            // Avoid logging the config response itself
 
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
    toggleConstellationVisibility,
    isConstellationsVisible,
    showSpotify,
    expandVideoScreen,
    collapseVideoScreen,
    logVideoScreenState,
    router,
  ]);

  // Update the drawer open effect to handle state sync more robustly
  useEffect(() => {
    if (isOpen) {
      // When drawer opens, reset iframe ready state
      setIframeReady(false);
      
      // Wait for drawer animation to complete
      setTimeout(() => {
        if (missionControlIframeRef.current) {
          console.log("Mobile: Drawer opened, requesting state sync");
          // Request state sync from iframe
          missionControlIframeRef.current.contentWindow.postMessage(
            {
              type: "REQUEST_STATE"
            },
            "*"
          );
        }
      }, 300);
    }
  }, [isOpen]);

  // Function to toggle call status
  const toggleCall = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

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
            // Initialize SitePal
            initializeSitePal();
          }, 4500);
        })
        .catch((err) => {
          console.error("Mobile: Microphone permission error:", err);
          alert("Please allow microphone access to chat with the avatar");
        });
    } else if (activeCall && connectionPhase === 4 && isMuted) {
      // Only activate mic if scene is loaded
      if (sitepalSceneLoaded) {
        activateSitepalMic();
      } else {
        // If scene not loaded, prime audio and wait for scene loaded event
        primeAudioOnIOS();
      }
    } else {
      // End call - clean up and reset everything
      setActiveCall(false);
      setConnectionPhase(0);
      setSitepalSceneLoaded(false);
      setIsMuted(true);

      // Tell the iframe to click the disconnect button
      sendMessageToMissionControl({
        type: "DISCONNECT_SITEPAL",
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

  // Function to initialize SitePal
  const initializeSitePal = () => {
    sendMessageToMissionControl({
      type: "INIT_SITEPAL",
      width: 280,
      height: 180,
      accountId: 9157686,
      characterId: 244,
      autoStart: true,
    });
  };

  // Function for audio priming
  const primeAudioOnIOS = () => {
    sendMessageToMissionControl({
      type: "PRIME_AUDIO_IOS",
    });
  };

  // Function to activate SitePal microphone
  const activateSitepalMic = () => {
    if (!sitepalSceneLoaded) return;
    primeAudioOnIOS();
    sendMessageToMissionControl({
      type: "ACTIVATE_SITEPAL_MIC",
    });
    setIsMuted(false);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        microphoneStreamRef.current = null;
      }

      if (sitepalIframeRef.current) {
        sitepalIframeRef.current.src = "about:blank";
      }
    };
  }, []);

  // Close button handler
  const handleCloseClick = (e) => {
    if (e) e.stopPropagation();
    onClose();
  };

  // Mode toggle handlers
  const handle80sModeToggle = () => {
    if (monsterMode) toggleMonsterMode();
    toggle80sMode();
  };

  const handleMonsterModeToggle = () => {
    if (is80sMode) toggle80sMode();
    toggleMonsterMode();
  };

  
  // Add effect to monitor 80s mode changes
  useEffect(() => {

    setShowVaporwaveVideo(is80sMode);
    
    // When 80s mode is enabled, ensure video screen is expanded
    if (is80sMode && missionControlIframeRef.current) {
      // Give a moment for everything to initialize
      setTimeout(() => {
        // Directly use our updated approach to integrate with iframe's flow
        expandVideoScreen();
        
        // Also send a message to the iframe to ensure it knows the video should be expanded
        if (
          missionControlIframeRef.current &&
          missionControlIframeRef.current.contentWindow
        ) {
          missionControlIframeRef.current.contentWindow.postMessage(
            { type: "EXPAND_VIDEO_SCREEN", expanded: true },
            "*"
          );
        }
      }, 200);
    } else if (!is80sMode && missionControlIframeRef.current) {
      // When 80s mode is disabled, collapse the video screen
      setTimeout(() => {
        collapseVideoScreen();
        
        // Also send a message to the iframe to ensure it knows the video should be collapsed
        if (
          missionControlIframeRef.current &&
          missionControlIframeRef.current.contentWindow
        ) {
          missionControlIframeRef.current.contentWindow.postMessage(
            { type: "EXPAND_VIDEO_SCREEN", expanded: false },
            "*"
          );
        }
      }, 200);
    }
  }, [is80sMode, expandVideoScreen, collapseVideoScreen]);

  // Handle Tenor script loading
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

  // Add effect to update video position when drawer opens
  useEffect(() => {
    if (isOpen) {
      // Wait for drawer to fully open before adjusting visuals
      setTimeout(() => {
        // Sync toggle states with the iframe

        sendMessageToMissionControl({
          type: "SYNC_80S_STATE",
          enabled: is80sMode, // Use the current prop value
        });
        sendMessageToMissionControl({
          type: "SYNC_MUSIC_STATE",
          enabled: showSpotify, // Use the current prop value
        });
        
        // If in 80s mode, handle video expansion
        if (is80sMode) {
          expandVideoScreen();
        }
      }, 300); // Delay slightly to ensure iframe might be ready
    }
  }, [isOpen, is80sMode, showSpotify, expandVideoScreen]); // Add dependencies

  // Update the iframe onLoad handler
  const handleIframeLoad = (e) => {
    console.log("Mobile: Iframe loaded");
    const iframe = e.target;
    
    // Pass Firebase config to iframe
    iframe.contentWindow.FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    iframe.contentWindow.FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    iframe.contentWindow.FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    iframe.contentWindow.FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    iframe.contentWindow.FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    iframe.contentWindow.FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

    // Set iframe ready state
    setIframeReady(true);
    
    // Send initial state sync
    if (missionControlIframeRef.current) {
      console.log("Mobile: Sending initial state sync");
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SYNC_STATE",
          isConstellationsEnabled: isConstellationsVisible
        },
        "*"
      );
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SYNC_80S_STATE",
          enabled: is80sMode
        },
        "*"
      );
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SYNC_MUSIC_STATE",
          enabled: showSpotify
        },
        "*"
      );
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SYNC_ROCKET_MODEL_STATE",
          enabled: rocketModelVisible
        },
        "*"
      );
    }
  };

  return (
    <>
      {/* Mission Control FAB */}
      <Button
        position="fixed"
        bottom="1.5rem"
        right="1.5rem"
        width="58px"
        height="58px"
        borderRadius="full"
        background="linear-gradient(135deg, rgba(13, 25, 42, 0.95), rgba(3, 10, 25, 0.95))"
        color="#67e8f9"
        border="2px solid"
        borderColor="#0e7490"
        boxShadow="0 0 15px rgba(6, 182, 212, 0.4), inset 0 0 8px rgba(6, 182, 212, 0.2)"
        zIndex="1000"
        onClick={onOpen}
        _hover={{
          background:
            "linear-gradient(135deg, rgba(19, 36, 63, 0.95), rgba(7, 20, 42, 0.95))",
          borderColor: "#22d3ee",
          transform: "scale(1.08)",
          boxShadow:
            "0 0 20px rgba(6, 182, 212, 0.6), 0 0 40px rgba(6, 182, 212, 0.2)",
        }}
        _before={{
          content: '""',
          position: "absolute",
          top: "-3px",
          left: "-3px",
          right: "-3px",
          bottom: "-3px",
          borderRadius: "full",
          background:
            "conic-gradient(from 215deg, #22d3ee, #06b6d4, #0891b2, #0e7490, #155e75, #0e7490, #0891b2, #06b6d4, #22d3ee)",
          opacity: "0.4",
          filter: "blur(4px)",
          zIndex: "-1",
          animation: "rotateConic 8s linear infinite",
        }}
        _after={{
          content: '""',
          position: "absolute",
          inset: "-1px",
          borderRadius: "full",
          background:
            "radial-gradient(circle at center, transparent 60%, rgba(6, 182, 212, 0.2))",
          zIndex: "-2",
          opacity: "0.8",
          animation: "pulseRing 3s infinite",
        }}
        sx={{
          "@keyframes pulseGlow": {
            "0%": { opacity: "0.2", transform: "scale(0.98)" },
            "100%": { opacity: "0.4", transform: "scale(1.02)" },
          },
          "@keyframes rotateConic": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" },
          },
          "@keyframes pulseRing": {
            "0%": { transform: "scale(0.95)", opacity: "0.5" },
            "50%": { transform: "scale(1.05)", opacity: "0.8" },
            "100%": { transform: "scale(0.95)", opacity: "0.5" },
          },
        }}
      >
        <Box position="relative">
          {/* Rotating Infinity Symbol */}
          <Text
            fontSize="28px"
            fontWeight="bold"
            textShadow="0 0 5px #06b6d4, 0 0 15px rgba(6, 182, 212, 0.4)"
            transform="rotate(0deg)"
            animation="infinityRotate 8s cubic-bezier(0.5, 0.1, 0.5, 1) infinite"
            filter="drop-shadow(0 0 6px rgba(6, 182, 212, 0.6))"
            _before={{
              content: '"∞"',
              position: "absolute",
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: "0.6",
              filter: "blur(2px)",
              animation: "glowPulse 4s infinite",
            }}
            sx={{
              "@keyframes infinityRotate": {
                "0%": { transform: "rotate(0deg) scale(1)" },
                "20%": { transform: "rotate(0deg) scale(1)" },
                "25%": { transform: "rotate(90deg) scale(1.1)" },
                "45%": { transform: "rotate(90deg) scale(1)" },
                "50%": { transform: "rotate(180deg) scale(1.1)" },
                "70%": { transform: "rotate(180deg) scale(1)" },
                "75%": { transform: "rotate(270deg) scale(1.1)" },
                "95%": { transform: "rotate(270deg) scale(1)" },
                "100%": { transform: "rotate(360deg) scale(1)" },
              },
              "@keyframes glowPulse": {
                "0%": {
                  textShadow:
                    "0 0 5px #06b6d4, 0 0 15px rgba(6, 182, 212, 0.4)",
                  opacity: "0.4",
                  transform: "scale(0.9)",
                },
                "25%": {
                  textShadow: "0 0 5px #ff0040, 0 0 15px rgba(255, 0, 64, 0.4)",
                  opacity: "0.7",
                  transform: "scale(1.1)",
                },
                "50%": {
                  textShadow:
                    "0 0 5px #0084ff, 0 0 15px rgba(0, 132, 255, 0.4)",
                  opacity: "0.4",
                  transform: "scale(0.9)",
                },
                "75%": {
                  textShadow:
                    "0 0 5px #d946ef, 0 0 15px rgba(217, 70, 239, 0.4)",
                  opacity: "0.7",
                  transform: "scale(1.1)",
                },
                "100%": {
                  textShadow:
                    "0 0 5px #06b6d4, 0 0 15px rgba(6, 182, 212, 0.4)",
                  opacity: "0.4",
                  transform: "scale(0.9)",
                },
              },
            }}
            display="flex"
            alignItems="center"
            justifyContent="center"
            width="36px"
            height="36px"
            position="relative"
            zIndex="2"
            margin="0 auto"
          >
            ∞
          </Text>

          {/* <Box
            position="absolute"
            top="-3px"
            right="-10px"
            width="8px"
            height="8px"
            borderRadius="full"
            backgroundColor="#ef4444"
            animation="pulse 2s infinite"
            sx={{
              "@keyframes pulse": {
                "0%": { opacity: 1 },
                "50%": { opacity: 0.5 },
                "100%": { opacity: 1 },
              },
            }}
          /> */}
        </Box>
      </Button>

      <Drawer
        isOpen={isOpen}
        placement="bottom"
        onClose={handleCloseClick}
        size="full"
        closeOnOverlayClick={true}
        closeOnEsc={true}
        blockScrollOnMount={true}
        trapFocus={false}
      >
        <DrawerOverlay
          bg="rgba(0, 0, 0, 0.5)"
          backdropFilter="blur(5px)"
          onClick={handleCloseClick}
          cursor="pointer"
          _after={{
            content: '""',
            position: "fixed",
            top: "env(safe-area-inset-top, 35px)",
            left: "50%",
            transform: "translateX(-50%)",
            width: "60px",
            height: "4px",
            borderRadius: "full",
            bg: "rgba(103, 232, 249, 0.6)",
            boxShadow: "0 0 8px rgba(6, 182, 212, 0.4)",
            zIndex: "1900",
          }}
        />
        <DrawerContent
          backgroundColor="transparent"
          maxHeight="80vh"
          height="60vh"
          overflow="auto"
          position="fixed"
          bottom="0"
          left="0"
          width="100%"
          margin="0"
          paddingBottom="env(safe-area-inset-bottom, 20px)"
          onClick={(e) => e.stopPropagation()}
          borderTop="2px solid #0e7490"
          borderTopLeftRadius="16px"
          borderTopRightRadius="16px"
          boxShadow="0 -10px 25px rgba(6, 182, 212, 0.2)"
          _before={{
            content: '""',
            position: "absolute",
            top: "0",
            left: "0",
            right: "0",
            height: "6px",
            background:
              "linear-gradient(90deg, #0e7490, #06b6d4, #22d3ee, #06b6d4, #0e7490)",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
            opacity: "0.8",
            boxShadow: "0 0 15px rgba(6, 182, 212, 0.6)",
          }}
        >
          <DrawerCloseButton
            position="fixed"
            color="#67e8f9"
            size="lg"
            top="env(safe-area-inset-top, 15px)"
            right="15px"
            zIndex="2000"
            bg="rgba(13, 25, 42, 0.95)"
            borderRadius="full"
            p={2.5}
            boxShadow="0 0 10px rgba(6, 182, 212, 0.4), inset 0 0 8px rgba(6, 182, 212, 0.2)"
            border="1px solid #0e7490"
            _hover={{
              bg: "rgba(19, 36, 63, 0.95)",
              transform: "scale(1.08)",
              boxShadow: "0 0 15px rgba(6, 182, 212, 0.6)",
            }}
          />

          {/* Mission Control Panel */}
          <Box
            width="100%"
            display="flex"
            flexDirection="column"
            alignItems="center"
            position="relative"
            overflowY="auto"
            height="100%"
          >
            <Box
              width="100%"
              flex="1"
              overflow="visible"
              position="relative"
              // pt="40px"
              display="flex"
              justifyContent="center"
              // pb="70px"
            >
              {/* Video overlay - not needed anymore since we're creating the video inside the iframe */}
              <iframe
                ref={missionControlIframeRef}
                src="/cyberpunk_mission_control.html"
                style={{
                  width: "100%",
                  maxWidth: "450px",
                  height: "100%",
                  minHeight: "650px", // Increased to accommodate expanded video screen
                  border: "none",
                  overflow: "visible",
                  display: "block",
                  backgroundColor: "transparent",
                  position: "relative",
                }}
                title="Mission Control Panel Mobile"
                onLoad={handleIframeLoad}
              />
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileSidePanel;
