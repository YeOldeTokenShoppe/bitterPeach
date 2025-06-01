import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,

  Text,
  VStack,

  IconButton,

  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/router";
import { getUserImageUrl } from "../utilities/clerkHelpers";
import dynamic from "next/dynamic";

// Dynamically import the MusicPlayer component
const MusicPlayer2 = dynamic(() => import("./MusicPlayer2"), {
  ssr: false,
});

// Dynamically import the Mobile Music Player component
const MobileMusicPlayer = dynamic(() => import("./MobileMusicPlayer"), {
  ssr: false,
});

const MobileSidePanel = ({
  onButtonClick,
  is80sMode,
  toggle80sMode,
  monsterMode,
  toggleMonsterMode,
  showSpotify,
  setShowSpotify,
  rocketModelVisible,
  toggleRocketModel,
  handleRocketToggle, // New combined toggle function
  toggleConstellationVisibility,
  isConstellationsVisible,
  handleIgnition,
  onRequestZoomAndSwitch, // New prop
  paginationState, // New prop for pagination
}) => {
  const [isVideoScreenOpen, setIsVideoScreenOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeCall, setActiveCall] = useState(false);
  const [currentStation, setCurrentStation] = useState("LUNAR BASE ALPHA");
  const [sitepalSceneLoaded, setSitepalSceneLoaded] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const [iframeReady, setIframeReady] = useState(false);
  const [sitePalReady, setSitePalReady] = useState(false);
  const [sitePalState, setSitePalState] = useState("loading");
  const [sitePalError, setSitePalError] = useState(null);
  const [eightiesMode, setEightiesMode] = useState(false);
  const [showMobileMusicPlayer, setShowMobileMusicPlayer] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [showMusicChoice, setShowMusicChoice] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [modeIndex, setModeIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [processingVisible, setProcessingVisible] = useState(false);
  const [connectionPhase, setConnectionPhase] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [showVaporwaveVideo, setShowVaporwaveVideo] = useState(false);
  const [showUnmuteOverlay, setShowUnmuteOverlay] = useState(false);
  const microphoneStreamRef = useRef(null);
  const messageQueueRef = useRef([]);
  const missionControlIframeRef = useRef(null);
  const [musicPlayerControls, setMusicPlayerControls] = useState(null);
  
  // Callback to receive controls from MobileMusicPlayer
  const handleMusicControlsReady = useCallback((controls) => {
    console.log('MobileSidePanel: Received music player controls:', controls);
    setMusicPlayerControls(controls);
  }, []);

  const router = useRouter();

  const [connected, setConnected] = useState(false);

  // Videolink connection options
  const videoLinkOptions = ["Text", "Voice", "Video"];
  const modes = ["Video", "Retro", "ASCII"];

  // Functions to open and close the video screen
  const openVideoScreen = () => setIsVideoScreenOpen(true);
  const closeVideoScreen = () => setIsVideoScreenOpen(false);
  
  // Functions to open and close the settings panel
  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  // Music player handlers
  const handleMusicModeChange = (enable80s) => {
    console.log("🎵 Mode change requested:", enable80s, "current 80s mode:", is80sMode);
    if (enable80s && !is80sMode) {
      console.log("🎵 Enabling 80s mode");
      toggle80sMode();
    } else if (!enable80s && is80sMode) {
      console.log("🎵 Disabling 80s mode");
      toggle80sMode();
    }
  };

  const handleMusicPlayerClose = () => {
    // Stop the music if it's playing
    if (musicPlayerControls && musicPlayerControls.pause) {
      musicPlayerControls.pause();
    }
    
    setShowMobileMusicPlayer(false);
    setMusicPlayerVisible(false);
    setShowMusicChoice(false);
  };

  // Auto-show music player when 80s mode is activated
  useEffect(() => {
    if (is80sMode) {
      setShowMobileMusicPlayer(true);
      setMusicPlayerVisible(true);
      if (setShowSpotify && typeof setShowSpotify === 'function') {
        setShowSpotify(false); // Ensure MusicPlayer2 is off
      }
    } else {
      setShowMobileMusicPlayer(false);
      setMusicPlayerVisible(false);
    }
  }, [is80sMode, setShowSpotify]);

  // Function to toggle rocket model visibility - now uses the combined prop function
  const handleRocketModelToggle = () => {
    console.log("🚀 MobileSidePanel: handleRocketModelToggle called");
    console.log("🚀 Current states - monsterMode:", monsterMode, "rocketModelVisible:", rocketModelVisible);
    
    // Use the combined toggle function from parent
    if (handleRocketToggle) {
      handleRocketToggle();
      
      // Send message to iframe based on current state
      sendMessageToMissionControl({
        type: "SET_ROCKET_MODEL_VISIBLE",
        isVisible: !rocketModelVisible,
      });
    } else {
      console.error("🚀 MobileSidePanel: handleRocketToggle prop not provided!");
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
      const offlineDisplay = iframe.contentDocument?.querySelector("#offline-display");
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
        const resizeEvent = new Event("resize");
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
        let vaporVideo = videoFeed.querySelector("video[data-vaporwave]");

        if (!vaporVideo) {
          vaporVideo = iframe.contentDocument.createElement("video");
          vaporVideo.setAttribute("data-vaporwave", "true");
          vaporVideo.setAttribute("src", "/vaporwave-sunset.mp4");
          vaporVideo.setAttribute("autoplay", "");
          vaporVideo.setAttribute("loop", "");
          vaporVideo.setAttribute("muted", "");
          vaporVideo.setAttribute("playsinline", "");
          vaporVideo.style.position = "absolute";
          vaporVideo.style.top = "0";
          vaporVideo.style.left = "0";
          vaporVideo.style.width = "100%";
          vaporVideo.style.height = "100%";
          vaporVideo.style.objectFit = "cover";
          vaporVideo.style.zIndex = "10"; // Above offlineDisplay content
          vaporVideo.style.display = "block"; // Ensure it's visible

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
      iframe.contentWindow.postMessage({ type: "EXPAND_VIDEO_SCREEN", expanded: true }, "*");

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
        const vaporVideo = videoFeed.querySelector("video[data-vaporwave]");
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
      iframe.contentWindow.postMessage({ type: "EXPAND_VIDEO_SCREEN", expanded: false }, "*");
    } catch (error) {
      console.error("Error in collapseVideoScreen:", error);
    }
  };


  const updateSignalButtonState = useCallback(() => {
    if (!missionControlIframeRef.current || !missionControlIframeRef.current.contentDocument) return;
    
    const iframe = missionControlIframeRef.current;
    const signalButton = iframe.contentDocument.querySelector('.control-button[data-action="signal"]');
    
    if (!signalButton) return;
    
    const currentState = signalButton.getAttribute("data-state") || "";
    const buttonLabel = signalButton.querySelector(".button-label")?.textContent || "";
    
    console.log("Updating UI based on iframe button state:", currentState, buttonLabel);
    
    // Update our component state based on the HTML button state
    switch (currentState) {
      case "signal":
        setActiveCall(false);
        setConnectionPhase(0);
        setSitepalSceneLoaded(false);
        setIsMuted(true);
        break;
      case "connect":
        setActiveCall(true);
        setConnectionPhase(1);
        setSitepalSceneLoaded(false);
        setIsMuted(true);
        break;
      case "unmute":
        setActiveCall(true);
        setConnectionPhase(3);
        setSitepalSceneLoaded(true);
        setIsMuted(true);
        break;
      case "disconnect":
        setActiveCall(true);
        setConnectionPhase(4);
        setSitepalSceneLoaded(true);
        setIsMuted(false);
        break;
      default:
        break;
    }
  }, []);
  // Function to send messages to the Mission Control iframe or queue them
  const sendMessageToMissionControl = message => {
    const iframe = missionControlIframeRef.current;
    if (iframe && iframe.contentWindow && iframeReady) {
      try {
        // Send any queued messages first
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          iframe.contentWindow.postMessage(queuedMessage, "*");
          console.log("Sent queued message:", queuedMessage);
        }
        // Send the current message
        iframe.contentWindow.postMessage(message, "*");
        console.log("Sent message directly:", message);
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

    // Also send a direct update for the signal button state
    if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "UPDATE_SIGNAL_BUTTON_STATE",
          is80sModeActive: is80sMode,
          isMusicActive: showSpotify,
        },
        "*"
      );
    }
  }, [is80sMode, showSpotify]); // Re-run when is80sMode changes

  // Effect to sync rocket model state with iframe
  useEffect(() => {
    sendMessageToMissionControl({
      type: "SET_ROCKET_MODEL_VISIBLE",
      isVisible: rocketModelVisible,
    });
  }, [rocketModelVisible]); // Re-run when rocketModelVisible changes

  // Update the message handler for events FROM iframe
  useEffect(() => {
    const handleMessage = event => {
      if (!event.data || !event.data.type) return;

      // Add origin check for security in production
      // if (event.origin !== 'YOUR_EXPECTED_PARENT_ORIGIN') return;

      if (event.data && event.data.type === "REQUEST_AVATAR") {
        console.log("[Parent MobileSidePanel] Received REQUEST_AVATAR from iframe.");

        if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
          const avatarUrl = isSignedIn ? getUserImageUrl(user) : null; // Get the best URL or null if signed out
          console.log("[Parent MobileSidePanel] Sending AVATAR_RESPONSE with URL:", avatarUrl);
          missionControlIframeRef.current.contentWindow.postMessage(
            {
              type: "AVATAR_RESPONSE",
              avatarUrl: avatarUrl,
            },
            "*"
          ); // Use specific origin instead of '*' in production
        } else {
          console.warn("[Parent MobileSidePanel] Iframe ref or contentWindow not available.");
        }
      } else if (event.data && event.data.type === "SIGNAL_BUTTON_STATE") {
        console.log("[Parent MobileSidePanel] Received SIGNAL_BUTTON_STATE:", event.data);
        // Update our component state based on the iframe signal button state
        if (event.data.state) {
          switch (event.data.state) {
            case "signal":
              setConnectionPhase(0);
              setActiveCall(false);
              setSitepalSceneLoaded(false);
              setIsMuted(true);
              break;
            case "connect":
              setConnectionPhase(2);
              setActiveCall(true);
              break;
            case "textchat":
              setConnectionPhase(3);
              setActiveCall(true);
              setSitepalSceneLoaded(true);
              setIsMuted(false); // Not using microphone for text
              break;
            case "disconnect":
              setConnectionPhase(4);
              setActiveCall(true);
              setSitepalSceneLoaded(true);
              setIsMuted(false);
              break;
          }
        }
      } else if (event.data && event.data.type) {
        // Handle other message types (IFRAME_READY, REQUEST_STATE, etc.)
        switch (event.data.type) {
          case "IFRAME_READY":
            console.log("Mobile: Received IFRAME_READY message");
            setIframeReady(true);
            // Sync initial state
            setTimeout(updateSignalButtonState, 500);
            break;

          case "REQUEST_STATE":
            if (missionControlIframeRef.current) {
              console.log("Mobile: Received REQUEST_STATE, sending current state");
              missionControlIframeRef.current.contentWindow.postMessage(
                {
                  type: "SYNC_STATE",
                  isConstellationsEnabled: isConstellationsVisible,
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
              if (setShowSpotify && typeof setShowSpotify === 'function') {
                setShowSpotify(event.data.enabled); // Call the function from gallery.js
              }
            } else {
              console.warn("MUSIC_TOGGLE message received without boolean 'enabled' property.");
            }
            break;
          
          // Add new case for rocket model toggle
          case "TOGGLE_ROCKET_MODEL":
            console.log("🚀 MobileSidePanel: Received TOGGLE_ROCKET_MODEL message");
            handleRocketModelToggle();
            break;

          // Handle constellation toggle
          case "CONSTELLATION_TOGGLE":
            if (toggleConstellationVisibility) {
              toggleConstellationVisibility();
            } else {
              console.error("MobileSidePanel: toggleConstellationVisibility function not received as prop");
            }
            break;

          // Handle rocket launch action
          case "ROCKET_LAUNCH":
            console.log("🚀 Rocket launch triggered from cyberpunk mission control (mobile)");
            // Send launch message to the rocket model component
            if (window.parent) {
              window.parent.postMessage({
                type: "ROCKET_LAUNCH_EXECUTE",
                timestamp: Date.now()
              }, "*");
            }
            break;

          // Handle 80s mode sync for PostProcessingEffects
          case "SYNC_80S_STATE":
            console.log("[MobileSidePanel] Received SYNC_80S_STATE:", event.data.enabled);
            // Update the 80s mode state to match the iframe state
            if (event.data.enabled !== is80sMode) {
              toggle80sMode();
            }
            break;

          case "SITEPAL_SCENE_LOADED":
            console.log("Mobile: Received SITEPAL_SCENE_LOADED");
            setSitepalSceneLoaded(true);
            // If we're in the right phase, update UI
            if (connectionPhase === 2) {
              // We're in CONNECT phase and scene is loaded, progress to TEXT CHAT phase
              // Hide the signal button and show text input interface
              const signalButton = document.getElementById("signal-button");
              if (signalButton) {
                signalButton.style.display = "none";
              }
              
              // Show text input interface
              const textInputContainer = document.getElementById("text-input-container");
              if (textInputContainer) {
                textInputContainer.style.display = "flex";
              }
              
              setConnectionPhase(3);
              
              // Fade out the transition video
              const transitionVideo = document.querySelector("video[data-transition]");
              if (transitionVideo) {
                transitionVideo.style.opacity = "0";
                transitionVideo.style.zIndex = "1"; // Move behind SitePal and unmute overlay
                
                // After fade completes, pause the video
                setTimeout(() => {
                  transitionVideo.pause();
                  transitionVideo.style.display = "none";
                }, 500); // Match the CSS transition time
              }
              
              // Show unmute overlay on mobile devices
              // Use window.innerWidth as a more reliable check for mobile
              const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
              console.log("Device check:", { 
                width: window.innerWidth, 
                userAgent: navigator.userAgent,
                isMobile 
              });
              
              if (isMobile) {
                console.log("Mobile device detected - will show unmute overlay after transition");
                // Add a delay to show overlay after transition video fades
                setTimeout(() => {
                  console.log("Now showing unmute overlay");
                  setShowUnmuteOverlay(true);
                }, 600); // Show after transition video has faded
              } else {
                // For testing: show overlay on desktop too
                console.log("Desktop mode - showing unmute overlay for testing");
                setTimeout(() => {
                  setShowUnmuteOverlay(true);
                }, 600);
              }
            } else if (connectionPhase === 3) {
              // We're already in UN-MUTE phase
              const videoStatusIndicator = document.getElementById("video-status-indicator");
              if (videoStatusIndicator) {
                videoStatusIndicator.classList.add("active");
                videoStatusIndicator.style.backgroundColor = "#ef4444";
              }
            }
            break;
          case "MICROPHONE_ACTIVATED":
            console.log("Mobile: Received MICROPHONE_ACTIVATED");
            setIsMuted(false);
            setConnectionPhase(4);
            break;
          case "SITEPAL_DISCONNECTED":
            console.log("Mobile: Received SITEPAL_DISCONNECTED");
            setActiveCall(false);
            setConnectionPhase(0);
            setSitepalSceneLoaded(false);
            setIsMuted(true);
            // Reset video status indicator
            const videoStatusIndicator = document.getElementById("video-status-indicator");
            if (videoStatusIndicator) {
              videoStatusIndicator.classList.remove("active");
              videoStatusIndicator.style.backgroundColor = "#4b5563";
            }
            break;
          // ... rest of the existing cases
          
          default:
            // Log unhandled message types
            if (event.data.type !== "FIREBASE_CONFIG_RESPONSE") {
              // Avoid logging the config response itself
            }
            break;
        }
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
    user,
    isSignedIn,
    updateVideoPosition,
    connectionPhase,
    isMuted,
    sitepalSceneLoaded,
    updateSignalButtonState,
  ]);

  // Update the effect for video screen opens
  useEffect(() => {
    if (isVideoScreenOpen) {
      // Wait for panel to fully open before adjusting visuals
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
  }, [isVideoScreenOpen, is80sMode, showSpotify, expandVideoScreen]); // Add dependencies

  // Function to toggle call status
  const toggleCall = e => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Get a reference to the signal button
    const signalButton = document.getElementById("signal-button");
    
    // Handle button states
    const buttonText = signalButton?.textContent?.trim();
    
    // CONNECT button clicked - start SitePal character
    if (buttonText === "CONNECT") {
      // Update UI first
      setActiveCall(true);
      setConnectionPhase(2);
      signalButton.textContent = "Connecting...";
      
      // 1. Find and stop the orientation video
      const orientationVideo = document.querySelector("video[data-orientation]");
      if (orientationVideo) {
        // Properly stop and remove the video
        orientationVideo.pause();
        orientationVideo.currentTime = 0;
        orientationVideo.src = ""; // Empty source
        orientationVideo.load(); // Force browser to release resources
        orientationVideo.style.display = "none";
      }
      
      // Hide transcript container and CC button if visible
      const transcriptContainer = document.getElementById("transcript-container");
      if (transcriptContainer) {
        transcriptContainer.style.display = "none";
      }
      
      const ccButton = document.getElementById("transcript-toggle-btn");
      if (ccButton) {
        ccButton.style.display = "none";
      }
      
      // 2. Create and play the transition video (1.mp4)
      const videoFeed = document.getElementById("video-feed");
      if (videoFeed) {
        // Check if we already have a transition video
        let transitionVideo = videoFeed.querySelector("video[data-transition]");
        
        if (!transitionVideo) {
          transitionVideo = document.createElement("video");
          transitionVideo.setAttribute("data-transition", "true");
          transitionVideo.setAttribute("id", "deadAir"); // Use the same ID as in the HTML file
          transitionVideo.setAttribute("src", "/1.mp4");
          transitionVideo.setAttribute("autoplay", "");
          transitionVideo.setAttribute("playsinline", "");
          transitionVideo.setAttribute("muted", "");
          transitionVideo.setAttribute("loop", "");
          transitionVideo.style.position = "absolute";
          transitionVideo.style.top = "0";
          transitionVideo.style.left = "0";
          transitionVideo.style.width = "100%";
          transitionVideo.style.height = "100%";
          transitionVideo.style.objectFit = "cover";
          transitionVideo.style.zIndex = "9999"; // High z-index to cover SitePal loader
          transitionVideo.style.transition = "opacity 0.5s ease-out";
          transitionVideo.muted = true;
          
          // Add video to the feed
          videoFeed.appendChild(transitionVideo);
        } else {
          // Make sure the existing transition video is visible and playing
          transitionVideo.style.display = "block";
          transitionVideo.style.opacity = "1";
          transitionVideo.style.zIndex = "9999"; // High z-index to cover SitePal loader
          transitionVideo.currentTime = 0;
        }
        
        // Play the transition video
        transitionVideo.play().catch(err => {
          console.warn("Could not play transition video:", err);
          // Continue with SitePal init even if video fails
          initSitePalDirect();
        });
      }
      
      // 3. Hide the offline display
      const offlineDisplay = document.getElementById("offline-display");
      if (offlineDisplay) {
        offlineDisplay.style.display = "none";
      }
      
      // 4. Initialize SitePal directly
      initSitePalDirect();
      
      // Add a safety timeout in case SitePal doesn't load
      const safetyTimeout = setTimeout(() => {
        // Check if we're still in the connecting phase
        if (connectionPhase === 2) {
          console.log("SitePal safety timeout triggered - forcing progress to TEXT CHAT state");
          // Force progress to the TEXT CHAT state
          setSitepalSceneLoaded(true);
          
          // Update UI - hide signal button and show text input
          const signalButton = document.getElementById("signal-button");
          if (signalButton) {
            signalButton.style.display = "none";
          }
          
          // Show text input interface
          const textInputContainer = document.getElementById("text-input-container");
          if (textInputContainer) {
            textInputContainer.style.display = "flex";
          }
          
          setConnectionPhase(3);
          
          // Fade out the transition video
          const transitionVideo = document.querySelector("video[data-transition]");
          if (transitionVideo) {
            transitionVideo.style.opacity = "0";
            transitionVideo.style.zIndex = "5";
            
            // After fade completes, pause the video
            setTimeout(() => {
              transitionVideo.pause();
              transitionVideo.style.display = "none";
            }, 500);
          }
        }
      }, 10000); // 10 second timeout
    }
    // Text input is now handled separately - no UN-MUTE button needed
    // DISCONNECT button clicked
    else if (buttonText === "DISCONNECT") {
      // Update UI
      setActiveCall(false);
      setConnectionPhase(0);
      signalButton.textContent = "CONNECT";
      signalButton.classList.remove("disconnect");
      signalButton.classList.add("connect-pulse");
      setSitepalSceneLoaded(false);
      setIsMuted(true);
      
      // Disconnect SitePal directly
      disconnectSitepalDirect();
      
      // Hide the transition video if it's still present
      const transitionVideo = document.querySelector("video[data-transition]");
      if (transitionVideo) {
        transitionVideo.pause();
        transitionVideo.style.display = "none";
      }
      
      // Restore OFFLINE text
      const offlineDisplay = document.getElementById("offline-display");
      if (offlineDisplay) {
        offlineDisplay.style.display = "flex";
        const offlineText = offlineDisplay.querySelector("span");
        if (offlineText) offlineText.style.opacity = "1";
        
        // Also restore crosshairs and scanlines
        const crosshairs = offlineDisplay.querySelectorAll('.crosshair-h, .crosshair-v');
        crosshairs.forEach(el => {
          el.style.opacity = "1";
        });
        
        const scanlines = offlineDisplay.querySelector('.scanlines-overlay');
        if (scanlines) {
          scanlines.style.opacity = "1";
        }
      }
      
      // Reset video status indicator
      const videoStatusIndicator = document.getElementById("video-status-indicator");
      if (videoStatusIndicator) {
        videoStatusIndicator.classList.remove("active");
        videoStatusIndicator.style.backgroundColor = "#4b5563";
      }
      
      // Hide transcript container and CC button if visible
      const transcriptContainer = document.getElementById("transcript-container");
      if (transcriptContainer) {
        transcriptContainer.style.display = "none";
      }
      
      const ccButton = document.getElementById("transcript-toggle-btn");
      if (ccButton) {
        ccButton.style.display = "none";
      }
    }
  };

  // Direct SitePal initialization function (adapted from cyberpunk_mission_control.html)
  const initSitePalDirect = () => {
    console.log("Starting direct SitePal initialization...");
    
    // Create or find container for SitePal
    let sitepalContainer = document.getElementById("sitepal-container");
    if (!sitepalContainer) {
      // Create container if it doesn't exist
      sitepalContainer = document.createElement("div");
      sitepalContainer.id = "sitepal-container";
      sitepalContainer.style.display = "none";
      sitepalContainer.style.width = "100%";
      sitepalContainer.style.height = "100%";
      sitepalContainer.style.position = "absolute";
      sitepalContainer.style.top = "0";
      sitepalContainer.style.left = "0";
      sitepalContainer.style.zIndex = "15";
      
      // Add to video feed
      const videoFeed = document.getElementById("video-feed");
      if (videoFeed) {
        videoFeed.appendChild(sitepalContainer);
      }
    }
    
    // Clear the container's contents
    sitepalContainer.innerHTML = '<div id="vhss_aiPlayer"></div>';
    sitepalContainer.style.display = "block";
    
    // Add CSS to hide SitePal loader
    const style = document.createElement('style');
    style.textContent = `
      /* Hide SitePal loader */
      #vhss_aiPlayer .vhss-loader,
      #vhss_aiPlayer .loader,
      #vhss_aiPlayer .loading,
      #vhss_aiPlayer .vhss-loading,
      #vhss_aiPlayer [class*="loader"],
      #vhss_aiPlayer [class*="loading"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
      
      /* Also hide any loading images or spinners */
      #vhss_aiPlayer img[src*="loading"],
      #vhss_aiPlayer img[src*="loader"],
      #vhss_aiPlayer img[src*="spinner"] {
        display: none !important;
      }
      
      /* Keep transition video on top until SitePal loads */
      video[data-transition] {
        z-index: 9999 !important;
      }
      
      /* Disable text input when unmute overlay is visible */
      #sitepal-text-input:disabled,
      #sitepal-text-input.overlay-visible {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;
    document.head.appendChild(style);
    
    // Define handleSceneLoaded function to handle SitePal ready state
    const handleSceneLoaded = () => {
      console.log("✅ SitePal scene loaded callback triggered");
      
      // Disable speech recognition to prevent errors in text-only mode
      if (window.ai_speechRecognition) {
        try {
          window.ai_speechRecognition = null;
          console.log("🔇 Speech recognition disabled for text-only mode");
        } catch (e) {
          console.warn("Could not disable speech recognition:", e);
        }
      }
      
      // Also try to disable any other speech-related functions
      if (window.ai_audioEnded) {
        const originalAudioEnded = window.ai_audioEnded;
        window.ai_audioEnded = function() {
          console.log("🔇 Audio ended - speech recognition disabled");
          // Call original function but catch any errors
          try {
            if (originalAudioEnded && typeof originalAudioEnded === 'function') {
              originalAudioEnded.apply(this, arguments);
            }
          } catch (e) {
            console.warn("Caught speech recognition error:", e);
          }
        };
      }
      
      // Hide the transition video
      const deadAir = document.querySelector("video[data-transition]");
      if (deadAir) {
        deadAir.style.opacity = 0;
        deadAir.style.zIndex = "5"; // Lower z-index once loading is complete
        setTimeout(() => deadAir.pause(), 500);
      }
      
      // Ensure SitePal container is visible
      if (sitepalContainer) {
        sitepalContainer.style.display = "block";
        sitepalContainer.classList.add("active");
        sitepalContainer.style.zIndex = "30"; // Explicitly set high z-index when loaded
        
        // Also set z-index for the vhss_aiPlayer element
        const playerDiv = document.getElementById("vhss_aiPlayer");
        if (playerDiv) {
          playerDiv.style.zIndex = "25";
        }
      }
      
      // Set SitePal state
      setSitepalSceneLoaded(true);
      
      // Show unmute overlay on mobile devices
      const isMobile = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      console.log("SitePal loaded - Device check:", { 
        width: window.innerWidth, 
        userAgent: navigator.userAgent,
        isMobile 
      });
      
      if (isMobile) {
        console.log("Mobile device detected - showing unmute overlay from scene loaded callback");
        setTimeout(() => {
          console.log("Now showing unmute overlay");
          setShowUnmuteOverlay(true);
        }, 600); // Show after transition video has faded
      } else {
        // For testing: show overlay on desktop too
        console.log("Desktop mode - showing unmute overlay for testing from scene loaded callback");
        setTimeout(() => {
          setShowUnmuteOverlay(true);
        }, 600);
      }
      
      // Disable music when SitePal is active
      if (showMobileMusicPlayer) {
        console.log("🎵 Disabling music for SitePal session");
        setShowMobileMusicPlayer(false);
        setMusicPlayerVisible(false);
      }
      
      // Greeting is now triggered by unmute overlay click on mobile
      // Only play automatically on desktop
      const isMobileDevice = window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      if (!window.greetingPlayed && !isMobileDevice) {
        setTimeout(() => {
          try {
            if (window.sayText && typeof window.sayText === 'function') {
              // Use the exact same parameters as the working version
              window.sayText("Welcome to cyberpunk mission control. I am ready to assist you.", 9, 1, 7);
              console.log("✅ SitePal greeting spoken automatically (desktop only)");
              window.greetingPlayed = true;
            } else {
              console.log("⚠️ sayText not available for greeting");
            }
          } catch (e) {
            console.log("⚠️ Greeting failed:", e.message);
          }
        }, 1000);
      } else if (isMobileDevice) {
        console.log("📱 Mobile device - greeting will be triggered by unmute overlay");
      }
      
      // Update UI to TEXT CHAT state
      const signalButton = document.getElementById("signal-button");
      if (signalButton) {
        signalButton.style.display = "none";
      }
      
      // Show text input interface
      const textInputContainer = document.getElementById("text-input-container");
      if (textInputContainer) {
        textInputContainer.style.display = "flex";
        
        // Focus the text input for better UX
        setTimeout(() => {
          const textInput = document.getElementById("sitepal-text-input");
          if (textInput) {
            textInput.focus();
          }
        }, 100);
      }
      
      setConnectionPhase(3);
      
      // No microphone permission needed for text communication
    };
    
    // Function to request microphone permissions ahead of time
    const requestMicrophonePermission = () => {
      console.log("🎤 Requesting microphone permission during CONNECT phase...");
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(stream => {
              console.log("✅ Microphone permission granted");
              // Store the stream to be used later
              microphoneStreamRef.current = stream;
              // We don't stop tracks here since we want to keep the permission granted
            })
            .catch(err => {
              console.warn("⚠️ Microphone permission denied or error:", err);
            });
        } else {
          console.warn("⚠️ getUserMedia not supported in this browser");
        }
      } catch (e) {
        console.error("❌ Error requesting microphone permission:", e);
      }
    };
    
    // Load SitePal script and set up scene loaded callback
    const loadSitePalScript = () => {
      console.log("Loading SitePal scripts...");
      
      // First, check if there's an existing script for AI embed
      const existingAIScript = document.querySelector('script[src*="ai_embed_functions_v1.php"]');
      const existingVHostScript = document.querySelector('script[src*="vhost_embed_functions_v4.php"]');
      
      if (existingAIScript && typeof AI_vhost_embed === "function") {
        console.log("SitePal AI script already loaded, initializing");
        embedSitePal();
        return;
      }
      
      // First load the AI embed script - this is essential for the character's AI functionality
      const aiScript = document.createElement("script");
      aiScript.type = "text/javascript";
      aiScript.src = "//vhss-d.oddcast.com/ai_embed_functions_v1.php";
      
      aiScript.onload = () => {
        console.log("✅ SitePal AI script loaded successfully");
        
        // Now load the vhost embed script
        if (!existingVHostScript) {
          const vhostScript = document.createElement("script");
          vhostScript.src = "//vhss-d.oddcast.com/vhost_embed_functions_v4.php?acc=9157686&js=1";
          vhostScript.onload = () => {
            console.log("✅ SitePal vhost script loaded successfully");
            // Small delay to ensure scripts are fully initialized
            setTimeout(embedSitePal, 100);
          };
          vhostScript.onerror = e => {
            console.error("❌ Failed to load SitePal vhost script:", e);
          };
          document.head.appendChild(vhostScript);
        } else {
          // If vhost script already exists, just proceed
          console.log("SitePal vhost script already loaded");
          setTimeout(embedSitePal, 100);
        }
      };
      
      aiScript.onerror = e => {
        console.error("❌ Failed to load SitePal AI script:", e);
      };
      
      document.head.appendChild(aiScript);
    };
    
    // Embed SitePal character
    const embedSitePal = () => {
      console.log("Attempting to embed SitePal character...");
      
      // Set the callback functions on window for SitePal to call when ready
      window.vh_sceneLoaded = handleSceneLoaded;
      window.vhss_sceneLoaded = handleSceneLoaded;
      
      // Add a backup timeout in case callbacks don't fire
      setTimeout(() => {
        console.log("⏱️ Checking if SitePal character is visible...");
        if (sitepalContainer && !sitepalContainer.classList.contains("active")) {
          console.log("⚠️ Character not visible, forcing handleSceneLoaded");
          handleSceneLoaded();
          
          // Check if vhss_aiPlayer is actually visible
          const playerDiv = document.getElementById("vhss_aiPlayer");
          if (playerDiv && playerDiv.innerHTML === "") {
            console.log("⚠️ SitePal player appears empty, trying to reload...");
            
            // Try embedding again
            try {
              playerDiv.innerHTML = "";
              if (typeof AI_vhost_embed === "function") {
                AI_vhost_embed(280, 180, 9157686, 255, 0, 1);
                console.log("🔄 Attempted to reload SitePal character");
              } else {
                console.warn("⚠️ AI_vhost_embed still not available after reload attempt");
                
                // Try fallback to iframe method as a last resort
                if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
                  console.log("📢 Falling back to iframe message for SitePal initialization");
                  missionControlIframeRef.current.contentWindow.postMessage({
                    type: "INIT_SITEPAL",
                    width: 280, 
                    height: 180,
                    accountId: 9157686,
                    characterId: 255
                  }, "*");
                }
              }
            } catch (e) {
              console.error("❌ Error reloading SitePal:", e);
            }
          }
        }
      }, 3000);
      
      // Embed the SitePal character
      try {
        if (typeof AI_vhost_embed === "function") {
          console.log("📱 Calling AI_vhost_embed to load SitePal...");
          AI_vhost_embed(280, 180, 9157686, 255, 0, 1);
        } else {
          console.error("❌ AI_vhost_embed function not available");
          
          // Try fallback to iframe method
          if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
            console.log("📢 Falling back to iframe message for SitePal initialization");
            missionControlIframeRef.current.contentWindow.postMessage({
              type: "INIT_SITEPAL",
              width: 280, 
              height: 180,
              accountId: 9157686,
              characterId: 255
            }, "*");
          }
          
          // Also try dynamically defining the function from the iframe content if possible
          try {
            if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
              if (typeof missionControlIframeRef.current.contentWindow.AI_vhost_embed === "function") {
                console.log("Found AI_vhost_embed in iframe, attempting to use it");
                window.AI_vhost_embed = missionControlIframeRef.current.contentWindow.AI_vhost_embed;
                setTimeout(() => {
                  if (typeof window.AI_vhost_embed === "function") {
                    window.AI_vhost_embed(280, 180, 9157686, 255, 0, 1);
                  }
                }, 100);
              }
            }
          } catch (err) {
            console.error("Error trying to access iframe function:", err);
          }
        }
      } catch (error) {
        console.error("Error embedding SitePal:", error);
      }
    };
    
    // Start the initialization process
    loadSitePalScript();
  };
  
  // Direct SitePal microphone activation function
  const activateSitepalMicDirect = () => {
    console.log("🎤 Activating SitePal microphone directly");
    
    // First prime audio context to handle iOS/Safari restrictions
    const primeAudio = () => {
      try {
        // Create or get the audio context
        if (!window.myAudioContext) {
          window.myAudioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log("Created new AudioContext");
        }
        
        // Resume the audio context if it's suspended
        if (window.myAudioContext.state === "suspended") {
          window.myAudioContext.resume()
            .then(() => {
              console.log("🔊 AudioContext resumed successfully");
            })
            .catch(e => console.warn("AudioContext resume failed:", e));
        }
        
        // Create a dummy buffer source node for additional priming
        const bufferSource = window.myAudioContext.createBufferSource();
        bufferSource.connect(window.myAudioContext.destination);
        
        // Optional: play a silent sound
        if (typeof window.saySilent === "function") {
          try {
            console.log("🔇 Calling saySilent(0) to prime audio");
            window.saySilent(0);
          } catch (e) {
            console.warn("Error calling saySilent:", e);
          }
        }
      } catch (e) {
        console.warn("AudioContext priming failed:", e);
      }
    };
    
    // Prime audio first
    primeAudio();
    
    // Play a greeting using sayText
    const playGreeting = () => {
      if (typeof window.sayText === "function") {
        try {
          console.log("🗣️ Playing greeting...");
          window.sayText("Greetings, how can I help you today?", 9, 1, 7);
          
          // Notify parent about the greeting being played
          window.parent.postMessage({ 
            type: "GREETING_PLAYED", 
            status: "started" 
          }, "*");
        } catch (e) {
          console.error("Error playing greeting:", e);
        }
      } else {
        console.warn("sayText function not available");
        
        // Try to get it from the iframe as fallback
        if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
          try {
            if (typeof missionControlIframeRef.current.contentWindow.sayText === "function") {
              console.log("Found sayText in iframe, attempting to use it");
              window.sayText = missionControlIframeRef.current.contentWindow.sayText;
              setTimeout(() => {
                if (typeof window.sayText === "function") {
                  window.sayText("Greetings, how can I help you today?", 9, 1, 7);
                }
              }, 100);
            } else {
              // If we can't find sayText, send a message to the iframe to play the greeting
              console.log("Sending greeting message to iframe");
              missionControlIframeRef.current.contentWindow.postMessage({
                type: "PLAY_GREETING"
              }, "*");
            }
          } catch (err) {
            console.error("Error trying to access iframe sayText function:", err);
          }
        }
      }
    };
    
    // Detect browser for optimized handling
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isChromeMobile = isChrome && isAndroid;
    const isChromeiOS = /CriOS/.test(navigator.userAgent);
    
    // Start listening after the greeting (or immediately for some browsers)
    const startListening = () => {
      console.log("Starting listening process...");
      
      // Try multiple methods to start listening (cover all bases)
      
      // Method 1: Use window.AI_vhost_api if available
      if (typeof window.AI_vhost_api === "function") {
        console.log("Using AI_vhost_api to start listening");
        try {
          // Prime again with saySilent right before listening
          if (typeof window.saySilent === "function") {
            window.saySilent(0);
          }
          
          window.AI_vhost_api("startListening");
          console.log("✅ Started listening using AI_vhost_api");
        } catch (e) {
          console.error("Error calling AI_vhost_api:", e);
        }
      } else {
        console.warn("AI_vhost_api not available directly");
        
        // Try to get it from the iframe
        if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
          try {
            if (typeof missionControlIframeRef.current.contentWindow.AI_vhost_api === "function") {
              console.log("Found AI_vhost_api in iframe, attempting to use it");
              window.AI_vhost_api = missionControlIframeRef.current.contentWindow.AI_vhost_api;
              setTimeout(() => {
                if (typeof window.AI_vhost_api === "function") {
                  if (typeof window.saySilent === "function") {
                    window.saySilent(0);
                  }
                  window.AI_vhost_api("startListening");
                }
              }, 100);
            }
          } catch (err) {
            console.error("Error trying to access iframe API function:", err);
          }
        }
        
        // Method 2: Use iframe to send message
        console.log("Sending startListening message to iframe");
        if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
          missionControlIframeRef.current.contentWindow.postMessage({
            type: "SITEPAL_API_CALL",
            function: "startListening"
          }, "*");
        }
      }
    };
    
    // Main flow based on browser detection
    if (isChromeMobile || isIOS || isSafari || isChromeiOS) {
      console.log("📱 Mobile browser detected - specialized audio handling");
      
      // For mobile, we need to get microphone permission explicitly first
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          console.log("✅ Mic access granted on mobile");
          
          // Store the stream for later cleanup
          microphoneStreamRef.current = stream;
          
          // For Chrome on mobile, we can try to start listening immediately after permission
          if (isChromeMobile) {
            // Prime audio again after permission
            primeAudio();
            
            // Play greeting - this gives a moment for audio to initialize
            playGreeting();
            
            // Start listening after a short delay (let greeting start)
            setTimeout(startListening, 500);
          } else {
            // For iOS/Safari, we play the greeting first, then listen after the greeting
            playGreeting();
            
            // Start listening after a delay to let the greeting begin
            setTimeout(startListening, 1500);
          }
        })
        .catch(err => {
          console.error("Error getting microphone stream:", err);
          // Still try to play greeting even if mic access fails
          playGreeting();
        });
    } else {
      // For desktop browsers, the flow is simpler
      console.log("🖥️ Desktop browser detected - standard audio handling");
      
      // Play greeting first
      playGreeting();
      
      // Start listening after a short delay
      setTimeout(startListening, 1000);
      
      // Fallback attempt if other methods fail
      setTimeout(() => {
        console.log("🔄 Fallback microphone activation attempt");
        if (window.myAudioContext && window.myAudioContext.state === "suspended") {
          window.myAudioContext.resume().then(() => {
            console.log("🔊 Fallback AudioContext resume successful");
          });
        }
        if (typeof window.saySilent === "function") {
          window.saySilent(0);
        }
        if (typeof window.AI_vhost_api === "function") {
          window.AI_vhost_api("startListening");
        }
      }, 3000);
    }
    
    // Ensure audio context stays resumed (some browsers need multiple attempts)
    setTimeout(() => {
      if (window.myAudioContext && window.myAudioContext.state === "suspended") {
        window.myAudioContext.resume();
      }
    }, 2000);
  };
  
  // Direct SitePal disconnection function
  const disconnectSitepalDirect = () => {
    console.log("🔌 Disconnecting SitePal character directly");
    
    // 1. Hide the character visually
    const container = document.getElementById("sitepal-container");
    if (container) {
      container.style.display = "none";
      container.classList.remove("active");
      // IMPORTANT: Completely clear the container to ensure clean reconnect
      container.innerHTML = '';
    }
    
    // 2. Stop the character from listening
    
    // Method 1: Use window function if available
    if (typeof window.stopListening === "function") {
      try {
        window.stopListening();
        console.log("🛑 Stopped listening using window.stopListening");
      } catch (e) {
        console.error("Error calling stopListening:", e);
      }
    }
    
    // Method 2: Use AI_vhost_api if available
    if (typeof window.AI_vhost_api === "function") {
      try {
        window.AI_vhost_api("stopListening");
        console.log("🛑 Stopped listening using AI_vhost_api");
      } catch (e) {
        console.error("Error calling AI_vhost_api(stopListening):", e);
      }
    }
    
    // Method 3: Use iframe to send message
    if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
      missionControlIframeRef.current.contentWindow.postMessage({
        type: "SITEPAL_API_CALL",
        function: "stopListening"
      }, "*");
      console.log("Sent stopListening message to iframe");
    }
    
    // 3. Stop any ongoing speech
    if (typeof window.stopSpeaking === "function") {
      try {
        window.stopSpeaking();
        console.log("🔇 Stopped speaking");
      } catch (e) {
        console.error("Error calling stopSpeaking:", e);
      }
    }
    
    // 4. Explicitly stop all active audio tracks to fully release the mic
    if (microphoneStreamRef.current) {
      console.log("🎤 Stopping stored microphone stream");
      microphoneStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("🎤 Microphone track stopped from stored stream");
      });
      microphoneStreamRef.current = null;
    }
    
    // 5. Try to get and stop any other audio tracks that might be active
    try {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          stream.getTracks().forEach(track => {
            if (track.kind === "audio") {
              track.stop();
              console.log("🎤 Additional microphone track stopped");
            }
          });
        })
        .catch(err => {
          console.warn("⚠️ Could not access mic to stop tracks:", err);
        });
    } catch (e) {
      console.warn("Error trying to stop additional tracks:", e);
    }
    
    // 6. Clear SitePal API references to ensure they're reloaded on reconnect
    window.vh_sceneLoaded = null;
    window.vhss_sceneLoaded = null;
    window.sayText = null;
    window.saySilent = null;
    window.AI_vhost_api = null;
    window.stopListening = null;
    window.stopSpeaking = null;
    
    // 7. Send a message to parent window
    window.parent.postMessage({ type: "SITEPAL_DISCONNECTED" }, "*");
  };

  // Function to initialize SitePal
  const initializeSitePal = () => {
    if (!missionControlIframeRef.current) return;

    // Simplify to just send the INIT_SITEPAL message directly
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
        microphoneStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        microphoneStreamRef.current = null;
      }

      if (missionControlIframeRef.current) {
        missionControlIframeRef.current.src = "about:blank";
      }
    };
  }, []);

  // Close button handler
  // const handleCloseClick = e => {
  //   if (e) e.stopPropagation();
  //   closeVideoScreen();
  // };

  // // Mode toggle handlers
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
        if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
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
        if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
          missionControlIframeRef.current.contentWindow.postMessage(
            { type: "EXPAND_VIDEO_SCREEN", expanded: false },
            "*"
          );
        }
      }, 200);
    }
  }, [is80sMode, expandVideoScreen, collapseVideoScreen]);

  
  // Update the iframe onLoad handler to focus on video elements
  const handleIframeLoad = e => {
    console.log("Mobile: Iframe loaded");
    const iframe = e.target;

    // Pass Firebase config to iframe
    iframe.contentWindow.FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    iframe.contentWindow.FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    iframe.contentWindow.FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    iframe.contentWindow.FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    iframe.contentWindow.FIREBASE_MESSAGING_SENDER_ID =
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
    iframe.contentWindow.FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

    // Set iframe ready state
    setIframeReady(true);

    // Send initial state sync
    if (missionControlIframeRef.current) {
      console.log("Mobile: Sending initial state sync");
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SYNC_STATE",
          isConstellationsEnabled: isConstellationsVisible,
        },
        "*"
      );
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SYNC_80S_STATE",
          enabled: is80sMode,
        },
        "*"
      );
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SYNC_MUSIC_STATE",
          enabled: showSpotify,
        },
        "*"
      );
      missionControlIframeRef.current.contentWindow.postMessage(
        {
          type: "SET_ROCKET_MODEL_VISIBLE",
          isVisible: rocketModelVisible,
        },
        "*"
      );
    }
  };

  // Render the music player even when panel is closed if showSpotify is true
  const renderMusicPlayer = () => {
    // Don't render MusicPlayer2 if MobileMusicPlayer is active
    if (!showSpotify || showMobileMusicPlayer) return null;
    
    return (
      <Box
        position="fixed"
        bottom="0"
        left="0"
        width="100%"
        maxWidth="450px"
        margin="0 auto"
        background="transparent"
        overflow="hidden"
        borderRadius="0"
        zIndex="1000"
        marginLeft="auto"
        marginRight="auto"
        right="0"
        opacity={1}
        visibility="visible"
        height="auto"
        pointerEvents="auto"
      >
        <MusicPlayer2
          isVisible={showSpotify}
          onClose={() => {
            if (setShowSpotify && typeof setShowSpotify === 'function') {
              setShowSpotify(false);
            }
          }}
          autoPlay={true}
          is80sMode={is80sMode}
        />
      </Box>
    );
  };

  // Function to update the button state and UI based on the iframe's signal button
  
  
  // Add this useEffect to monitor the iframe's signal button state
  useEffect(() => {
    if (!missionControlIframeRef.current || !iframeReady) return;
    
    const checkSignalButtonInterval = setInterval(updateSignalButtonState, 1000);
    
    return () => clearInterval(checkSignalButtonInterval);
  }, [iframeReady, updateSignalButtonState]);

  // Add these functions before the return statement

  // Function to load transcript based on language
  const loadTranscript = (language) => {
    const transcriptContent = document.getElementById("transcript-content");
    if (!transcriptContent) return;
    
    // Store transcripts for different languages
    const transcripts = {
      en: [
        { time: 0, text: "Welcome to the Cyberpunk Mission Control interface." },
        { time: 3, text: "This orientation will guide you through the basic functions." },
        { time: 7, text: "You can connect with our AI assistant by clicking the CONNECT button." },
        { time: 12, text: "Once connected, you'll be able to interact through text messages." },
        { time: 16, text: "A text input field will appear for sending messages." },
        { time: 20, text: "You can disconnect at any time to end the session." },
        { time: 24, text: "For text transcription, the CC button will show this panel." },
        { time: 28, text: "Enjoy your exploration of our cyberpunk universe!" }
      ],
      es: [
        { time: 0, text: "Bienvenido a la interfaz de Control de Misión Cyberpunk." },
        { time: 3, text: "Esta orientación te guiará a través de las funciones básicas." },
        { time: 7, text: "Puedes conectarte con nuestro asistente de IA haciendo clic en el botón CONECTAR." },
        { time: 12, text: "Una vez conectado, podrás interactuar mediante mensajes de texto." },
        { time: 16, text: "Aparecerá un campo de texto para enviar mensajes." },
        { time: 20, text: "Puedes desconectarte en cualquier momento para finalizar la sesión." },
        { time: 24, text: "Para la transcripción de texto, el botón CC mostrará este panel." },
        { time: 28, text: "¡Disfruta tu exploración de nuestro universo cyberpunk!" }
      ],
      fr: [
        { time: 0, text: "Bienvenue dans l'interface de Contrôle de Mission Cyberpunk." },
        { time: 3, text: "Cette orientation vous guidera à travers les fonctions de base." },
        { time: 7, text: "Vous pouvez vous connecter avec notre assistant IA en cliquant sur le bouton CONNECTER." },
        { time: 12, text: "Une fois connecté, vous pourrez interagir via des messages texte." },
        { time: 16, text: "Un champ de texte apparaîtra pour envoyer des messages." },
        { time: 20, text: "Vous pouvez vous déconnecter à tout moment pour terminer la session." },
        { time: 24, text: "Pour la transcription du texte, le bouton CC affichera ce panneau." },
        { time: 28, text: "Profitez de votre exploration de notre univers cyberpunk!" }
      ]
    };
    
    // Clear existing content
    transcriptContent.innerHTML = '';
    
    // Get the transcript for the selected language or default to English
    const selectedTranscript = transcripts[language] || transcripts.en;
    
    // Add the lines as paragraphs
    selectedTranscript.forEach(line => {
      const paragraph = document.createElement('p');
      paragraph.textContent = line.text;
      paragraph.dataset.time = line.time;
      paragraph.style.marginBottom = '8px';
      paragraph.style.opacity = '0.7';
      transcriptContent.appendChild(paragraph);
    });
  };

  // Function to update transcript highlighting based on video time
  const updateTranscriptHighlight = (currentTime) => {
    const transcriptContent = document.getElementById("transcript-content");
    if (!transcriptContent) return;
    
    const paragraphs = transcriptContent.querySelectorAll('p');
    if (!paragraphs.length) return;
    
    // Find the paragraph that should be highlighted
    let activeIndex = 0;
    for (let i = paragraphs.length - 1; i >= 0; i--) {
      const time = parseFloat(paragraphs[i].dataset.time);
      if (currentTime >= time) {
        activeIndex = i;
        break;
      }
    }
    
    // Update styles for all paragraphs
    paragraphs.forEach((p, index) => {
      if (index === activeIndex) {
        p.classList.add('active');
        // Scroll to the active paragraph
        p.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        p.classList.remove('active');
      }
    });
  };

  // Modify openVideoScreenAndInitialize to properly handle the orientation video completion
  const openVideoScreenAndInitialize = () => {
    console.log('Signal button clicked, musicPlayerControls:', musicPlayerControls);
    
    // Stop music if it's playing (to avoid interference with video audio)
    if (musicPlayerControls && musicPlayerControls.pause) {
      musicPlayerControls.pause();
      console.log('🎵 Stopping music for video playback');
    } else {
      console.log('⚠️ Music player controls not available or pause method missing');
    }
    
    // Also close the music player UI completely
    if (showMobileMusicPlayer) {
      handleMusicPlayerClose();
      console.log('🎵 Closing music player UI');
    }
    
    // First open the video screen
    openVideoScreen();
    
    // Initialize with a small delay to ensure video screen has rendered
    setTimeout(() => {
      // 1. Find the video feed area
      let videoFeed = document.getElementById("video-feed");
      
      // Create it if it doesn't exist
      if (!videoFeed) {
        // Try to find the video-display-area first
        const videoDisplayArea = document.getElementById("video-display-area");
        
        if (videoDisplayArea) {
          // Create the video-feed div
          videoFeed = document.createElement("div");
          videoFeed.id = "video-feed";
          videoFeed.style.position = "absolute";
          videoFeed.style.top = "0";
          videoFeed.style.left = "0";
          videoFeed.style.width = "100%";
          videoFeed.style.height = "100%";
          videoFeed.style.zIndex = "15"; // Above offline display
          
          videoDisplayArea.appendChild(videoFeed);
        }
      }
      
      // Show the CC button (but keep transcript hidden by default)
      const ccButton = document.getElementById("transcript-toggle-btn");
      if (ccButton) {
        ccButton.style.display = "flex";
        ccButton.style.backgroundColor = "#1f2937"; // Ensure inactive state
        ccButton.style.boxShadow = "0 0 5px rgba(6, 182, 212, 0.3)";
      }
      
      // Ensure transcript container starts hidden
      const transcriptContainer = document.getElementById("transcript-container");
      if (transcriptContainer) {
        transcriptContainer.style.display = "none";
      }
      
      // Pre-load the default transcript (but keep it hidden)
      loadTranscript('en');
      
      // 2. Check if we already have an orientation video
      let orientationVideo = document.querySelector("video[data-orientation]");
      
      // Create the video if it doesn't exist
      if (!orientationVideo && videoFeed) {
        orientationVideo = document.createElement("video");
        orientationVideo.setAttribute("data-orientation", "true");
        orientationVideo.setAttribute("src", "/orientation.mp4");
        orientationVideo.setAttribute("autoplay", "");
        orientationVideo.setAttribute("playsinline", "");
        orientationVideo.style.position = "absolute";
        orientationVideo.style.top = "0";
        orientationVideo.style.left = "0";
        orientationVideo.style.width = "100%";
        orientationVideo.style.height = "100%";
        orientationVideo.style.objectFit = "cover";
        orientationVideo.style.zIndex = "10";
        
        // Add video to the feed
        videoFeed.appendChild(orientationVideo);
        
        // Disable music when orientation video starts
        if (showMobileMusicPlayer) {
          console.log("🎵 Disabling music for orientation video");
          setShowMobileMusicPlayer(false);
          setMusicPlayerVisible(false);
        }
        
        // Play the video
        orientationVideo.play().catch(err => console.warn("Could not autoplay orientation video:", err));
        
        // Add timeupdate event listener to update transcript
        orientationVideo.addEventListener("timeupdate", () => {
          updateTranscriptHighlight(orientationVideo.currentTime);
        });
        
        // Listen for video end to show CONNECT button
        orientationVideo.addEventListener("ended", () => {
          console.log("Orientation video ended");
          
          // Hide the orientation video properly
          orientationVideo.pause();
          orientationVideo.style.display = "none";
          
          // Restore the offline display
          restoreOfflineState();
          
          // Hide transcript container
          const transcriptContainer = document.getElementById("transcript-container");
          if (transcriptContainer) {
            transcriptContainer.style.display = "none";
          }
          
          // Hide CC button
          if (ccButton) {
            ccButton.style.display = "none";
          }
          
          // Show the CONNECT button prominently
          const connectButton = document.getElementById("signal-button");
          if (connectButton) {
            connectButton.style.display = "flex";
            connectButton.style.animation = "pulse-attention 2s infinite";
          }
        });
      }
      
      // 3. Show the CONNECT button
      const connectButton = document.getElementById("signal-button");
      if (connectButton) {
        connectButton.style.display = "flex";
        connectButton.textContent = "CONNECT";
        connectButton.classList.add("connect-pulse");
      }
      
      // 4. Change video status indicator to active
      const videoStatusIndicator = document.getElementById("video-status-indicator");
      if (videoStatusIndicator) {
        videoStatusIndicator.classList.add("active");
        videoStatusIndicator.style.backgroundColor = "#10b981"; // Green for video playing
      }
      
      // 5. Style the offline display (make it hidden/transparent when video is playing)
      const offlineDisplay = document.getElementById("offline-display");
      if (offlineDisplay) {
        // Make the container visible but content transparent
        offlineDisplay.style.display = "flex";
        offlineDisplay.style.backgroundColor = "transparent";
        
        // Hide the label text
        const offlineText = offlineDisplay.querySelector("span");
        if (offlineText) {
          offlineText.style.opacity = "0";
        }
        
        // Hide the crosshairs
        const crosshairs = offlineDisplay.querySelectorAll('.crosshair-h, .crosshair-v');
        crosshairs.forEach(el => {
          el.style.opacity = "0";
        });
        
        // Keep scanlines with reduced opacity for aesthetic effect
        const scanlines = offlineDisplay.querySelector('.scanlines-overlay');
        if (scanlines) {
          scanlines.style.opacity = "0.3";
        }
      }
    }, 300);
  };

  // New function to restore offline state
  const restoreOfflineState = () => {
    const offlineDisplay = document.getElementById("offline-display");
    if (offlineDisplay) {
      // Make sure the offline display is visible
      offlineDisplay.style.display = "flex";
      offlineDisplay.style.backgroundColor = "#111827";
      
      // Show the label text
      const offlineText = offlineDisplay.querySelector("span");
      if (offlineText) {
        offlineText.style.opacity = "1";
      }
      
      // Show the crosshairs
      const crosshairs = offlineDisplay.querySelectorAll('.crosshair-h, .crosshair-v');
      crosshairs.forEach(el => {
        el.style.opacity = "1";
      });
      
      // Restore scanlines
      const scanlines = offlineDisplay.querySelector('.scanlines-overlay');
      if (scanlines) {
        scanlines.style.opacity = "1";
      }
    }
    
    // Set video status indicator to offline
    const videoStatusIndicator = document.getElementById("video-status-indicator");
    if (videoStatusIndicator) {
      videoStatusIndicator.style.backgroundColor = "#4b5563"; // Gray for offline state
    }
  };

  // Add this new function
  const handleIgnitionClick = useCallback(() => {
    console.log('Ignition button clicked in MobileSidePanel');
    if (handleIgnition) {
      console.log('Calling handleIgnition prop');
      handleIgnition();
      // Also send message to iframe to update its state
      if (missionControlIframeRef.current && missionControlIframeRef.current.contentWindow) {
        missionControlIframeRef.current.contentWindow.postMessage(
          { type: 'IGNITION_CLICKED' },
          '*'
        );
      }
    } else {
      console.warn('handleIgnition prop not provided to MobileSidePanel');
    }
  }, [handleIgnition]);

  // Update the message handler to handle START_SYNTHWAVE_TRANSITION
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'PRE_TRANSITION_CAMERA_ZOOM') {
        console.log('Mobile: PRE_TRANSITION_CAMERA_ZOOM received, calling onRequestZoomAndSwitch');
        if (onRequestZoomAndSwitch) {
          onRequestZoomAndSwitch();
        } else {
          console.warn('Mobile: onRequestZoomAndSwitch prop not provided. Falling back to direct ignition.');
          if (handleIgnition) handleIgnition(); // Fallback to old behavior
        }
      }
      else if (event.data && event.data.type === 'START_SYNTHWAVE_TRANSITION') { // Keep existing for now
        console.log('Mobile: Legacy START_SYNTHWAVE_TRANSITION received. Prefer PRE_TRANSITION_CAMERA_ZOOM.');
        if (onRequestZoomAndSwitch) {
          onRequestZoomAndSwitch();
        } else {
          if (handleIgnition) handleIgnition();
        }
      }
      else if (event.data && event.data.type === 'SITEPAL_TEXT_MESSAGE') {
        // Handle text message to SitePal
        console.log('Received text message for SitePal:', event.data.message);
        
        // Validate message before sending to SitePal
        const messageText = event.data.message;
        if (!messageText || typeof messageText !== 'string' || messageText.trim() === '') {
          console.warn("⚠️ Invalid message text provided to SitePal");
          return;
        }
        
        // Try to send directly to SitePal AI functions first
        if (window.vhss_ai_sayPreAI && typeof window.vhss_ai_sayPreAI === 'function') {
          try {
            window.vhss_ai_sayPreAI(messageText.trim());
            console.log("✅ Message forwarded to SitePal via vhss_ai_sayPreAI");
          } catch (e) {
            console.warn("⚠️ Error forwarding via vhss_ai_sayPreAI:", e);
          }
        } else {
          // Fallback: Forward to SitePal iframe if available
          const iframe = document.querySelector('#video-feed iframe');
          if (iframe) {
            iframe.contentWindow.postMessage({
              type: 'SITEPAL_TEXT_MESSAGE',
              message: messageText.trim()
            }, '*');
            console.log("📤 Message forwarded to iframe");
          } else {
            console.warn("⚠️ No SitePal function or iframe available");
          }
        }
      }
      // Handle other message types...
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleIgnitionClick, isConstellationsVisible, toggleConstellationVisibility, router, user, isSignedIn, updateVideoPosition, connectionPhase, isMuted, sitepalSceneLoaded, updateSignalButtonState, onRequestZoomAndSwitch, handleIgnition]); // Added onRequestZoomAndSwitch and handleIgnition

  return (
    <>
      {/* Top Corner Buttons */}
      {/* Music Player - Top Right Above 80s Mode Toggle */}
      {!showMobileMusicPlayer ? (
        // Music Icon Button
        <IconButton
          position="fixed"
          top="20px"
          right="20px"
          zIndex="1100"
          aria-label="Music Player"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          }
          color="white"
          bg="transparent"
          size="md"
          onClick={() => {
            setShowMusicChoice(false); // Don't show choice, just start playing
            setShowMobileMusicPlayer(true);
            setMusicPlayerVisible(true);
          }}
          _hover={{
            bg: "rgba(255, 255, 255, 0.1)",
          }}
        />
      ) : (
        // Minimal Music Player
        <Box
          position="fixed"
          top="20px"
          right="20px"
          zIndex="1100"
          display="flex"
          alignItems="center"
          gap="8px"
        >
          {/* Spinning Album Art */}
          <Box
            width="40px"
            height="40px"
            borderRadius="50%"
            backgroundImage="url('/virginRecords.jpg')"
            backgroundSize="cover"
            backgroundPosition="center"
            transition="all 0.3s ease"
            sx={{
              animation: musicPlayerVisible && isPlaying ? "spin 3s linear infinite" : "none",
              "@keyframes spin": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" }
              }
            }}
          />
          
          {/* Skip Button */}
          <IconButton
            aria-label="Next Track"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 4 15 12 5 20 5 4"/>
                <line x1="19" y1="5" x2="19" y2="19"/>
              </svg>
            }
            color="white"
            bg="rgba(255, 255, 255, 0.1)"
            size="sm"
            minW="32px"
            height="32px"
            onClick={() => {
              if (musicPlayerControls && musicPlayerControls.skipTrack) {
                musicPlayerControls.skipTrack();
              }
            }}
            _hover={{
              bg: "rgba(255, 255, 255, 0.2)",
            }}
          />
          
          {/* Close Button */}
          <IconButton
            aria-label="Close Music Player"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            }
            color="white"
            bg="rgba(255, 255, 255, 0.1)"
            size="sm"
            minW="28px"
            height="28px"
            onClick={() => {
              setShowMobileMusicPlayer(false);
              setMusicPlayerVisible(false);
              handleMusicPlayerClose();
            }}
            _hover={{
              bg: "rgba(255, 255, 255, 0.2)",
            }}
          />
        </Box>
      )}
      
      {/* 80s Mode Toggle - Top Right Below Music Icon */}
      <Box
        position="fixed"
        top="70px"
        right="20px"
        zIndex="1100"
        display="flex"
        alignItems="center"
        gap="8px"
      >
        <Text
          color="white"
          fontSize="12px"
          fontWeight="bold"
          letterSpacing="0.5px"
          textTransform="uppercase"
          opacity={0.8}
        >
          80s Mode
        </Text>
        <Box
          as="button"
          position="relative"
          width="44px"
          height="24px"
          borderRadius="12px"
          bg={is80sMode ? "#d946ef" : "rgba(255, 255, 255, 0.2)"}
          border={is80sMode ? "1px solid #d946ef" : "1px solid rgba(255, 255, 255, 0.3)"}
          cursor="pointer"
          transition="all 0.3s ease"
          onClick={() => {
            console.log('80s mode toggle clicked, current state:', is80sMode);
            toggle80sMode();
          }}
          _hover={{
            bg: is80sMode ? "#e879f9" : "rgba(255, 255, 255, 0.3)",
          }}
        >
          <Box
            position="absolute"
            top="2px"
            left={is80sMode ? "22px" : "2px"}
            width="18px"
            height="18px"
            borderRadius="50%"
            bg="white"
            transition="all 0.3s ease"
            boxShadow={is80sMode ? "0 0 8px rgba(217, 70, 239, 0.6)" : "0 2px 4px rgba(0,0,0,0.2)"}
          />
        </Box>
      </Box>
      
      {/* Bottom Navigation Bar */}
      <Box
        position="fixed"
        bottom="0"
        left="0"
        width="100%"
        height="70px"
        paddingBottom="env(safe-area-inset-bottom, 10px)"
        background={is80sMode ? 
          "linear-gradient(180deg, rgba(139, 0, 139, 0.95) 0%, rgba(75, 0, 130, 0.98) 100%)" :
          "linear-gradient(180deg, rgba(13, 25, 42, 0.95) 0%, rgba(3, 10, 25, 0.98) 100%)"
        }
        backdropFilter="none"
        display="flex"
        justifyContent="space-around"
        alignItems="center"
        borderTop={is80sMode ? "2px solid #ff00ff" : "2px solid #0e7490"}
        boxShadow={is80sMode ? 
          "0 -5px 15px rgba(255, 0, 255, 0.3), 0 -10px 30px rgba(0, 255, 255, 0.2)" :
          "0 -5px 15px rgba(6, 182, 212, 0.2)"
        }
        zIndex="1000"
        _after={{
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: is80sMode ? 
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 0, 255, 0.1) 2px, rgba(255, 0, 255, 0.1) 4px)" :
            "#0f172a",
          opacity: is80sMode ? 0.3 : 0.85,
          zIndex: -1
        }}
        sx={{
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" }
          },
          "@keyframes pulse": {
            "0%": { opacity: 1 },
            "50%": { opacity: 0.5 },
            "100%": { opacity: 1 }
          },
          "@keyframes pulse-attention": {
            "0%": { transform: "scale(1)", boxShadow: "0 0 3px rgba(6, 182, 212, 0.2)" },
            "50%": { transform: "scale(1.1)", boxShadow: "0 0 10px rgba(6, 182, 212, 0.6)" },
            "100%": { transform: "scale(1)", boxShadow: "0 0 3px rgba(6, 182, 212, 0.2)" }
          },
          "@keyframes connect-pulse": {
            "0%": { boxShadow: "0 0 5px rgba(6, 182, 212, 0.3)", borderColor: "#134e4a" },
            "50%": { boxShadow: "0 0 15px rgba(6, 182, 212, 0.7)", borderColor: "#22d3ee" },
            "100%": { boxShadow: "0 0 5px rgba(6, 182, 212, 0.3)", borderColor: "#134e4a" }
          },
          "@keyframes transmission-flicker": {
            "0%": { opacity: 0.8 },
            "5%": { opacity: 0.6 },
            "10%": { opacity: 0.9 },
            "15%": { opacity: 0.5 },
            "20%": { opacity: 0.7 },
            "50%": { opacity: 0.9 },
            "70%": { opacity: 0.7 },
            "80%": { opacity: 1 },
            "90%": { opacity: 0.8 },
            "100%": { opacity: 0.9 }
          },
          "@keyframes pulse": {
            "0%": { transform: "scale(1)", opacity: 0.8 },
            "50%": { transform: "scale(1.1)", opacity: 1 },
            "100%": { transform: "scale(1)", opacity: 0.8 }
          },
          "@keyframes fadeInOut": {
            "0%": { opacity: 0.6 },
            "50%": { opacity: 1 },
            "100%": { opacity: 0.6 }
          }
        }}
      >
        
        {/* SPARKLES Button (Left Side) - Placeholder */}
        <IconButton
          aria-label="Sparkles"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles-icon lucide-sparkles">
              <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
              <path d="M20 3v4"/>
              <path d="M22 5h-4"/>
              <path d="M4 17v2"/>
              <path d="M5 18H3"/>
            </svg>
          }
          color={is80sMode ? "#ff00ff" : "#67e8f9"}
          bg={is80sMode ? "rgba(139, 0, 139, 0.3)" : "rgba(13, 25, 42, 0.95)"}
          borderRadius="full"
          boxShadow={is80sMode ? 
            "0 0 10px rgba(255, 0, 255, 0.4), inset 0 0 6px rgba(0, 255, 255, 0.2)" :
            "0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 6px rgba(6, 182, 212, 0.2)"
          }
          border={is80sMode ? "1px solid #ff00ff" : "1px solid #0e7490"}
          isDisabled={true}
          opacity={0.6}
          cursor="not-allowed"
          _hover={{
            // No hover effect since it's disabled
          }}
          size="lg"
        />
        
        {/* ROCKET MODEL Button (Left-Mid Side) - Simple Toggle */}
        <IconButton
          aria-label={rocketModelVisible ? "Hide Rocket" : "Show Rocket"}
          icon={
            // Always show rocket icon
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
              <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
              <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
              <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
            </svg>
          }
          color={rocketModelVisible ? "#39ff14" : (is80sMode ? "#00ffff" : "#67e8f9")}
          bg={rocketModelVisible ? 
            (is80sMode ? "rgba(57, 255, 20, 0.25)" : "rgba(57, 255, 20, 0.15)") : 
            (is80sMode ? "rgba(0, 255, 255, 0.2)" : "rgba(13, 25, 42, 0.95)")
          }
          borderRadius="full"
          boxShadow={rocketModelVisible ? 
            (is80sMode ? 
              "0 0 20px rgba(57, 255, 20, 0.6), 0 0 30px rgba(255, 0, 255, 0.3)" :
              "0 0 15px rgba(57, 255, 20, 0.4), inset 0 0 8px rgba(57, 255, 20, 0.2)"
            ) :
            (is80sMode ? 
              "0 0 15px rgba(0, 255, 255, 0.5), inset 0 0 8px rgba(255, 0, 255, 0.2)" :
              "0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 6px rgba(6, 182, 212, 0.2)"
            )
          }
          border={rocketModelVisible ? "#39ff14" : (is80sMode ? "1px solid #00ffff" : "1px solid #0e7490")}
          onClick={() => {
            // Simple toggle
            console.log("🚀 Mobile: Toggling rocket visibility");
            handleRocketModelToggle();
          }}
          _hover={{
            bg: rocketModelVisible ? 
              (is80sMode ? "rgba(57, 255, 20, 0.35)" : "rgba(57, 255, 20, 0.25)") :
              (is80sMode ? "rgba(0, 255, 255, 0.3)" : "rgba(19, 36, 63, 0.95)"),
            transform: "scale(1.08)",
            boxShadow: rocketModelVisible ?
              (is80sMode ? "0 0 25px rgba(57, 255, 20, 0.8)" : "0 0 20px rgba(57, 255, 20, 0.6)") :
              (is80sMode ? "0 0 20px rgba(0, 255, 255, 0.7)" : "0 0 15px rgba(6, 182, 212, 0.5)"),
          }}
          size="lg"
        />
        
        {/* SIGNAL Button (Center) */}
        <Button
          borderRadius="full"
          height="60px"
          width="60px"
          marginBottom="20px"
          background={is80sMode ? 
            "linear-gradient(135deg, rgba(255, 0, 255, 0.3), rgba(0, 255, 255, 0.3))" :
            "linear-gradient(135deg, rgba(13, 25, 42, 0.95), rgba(3, 10, 25, 0.95))"
          }
          color={is80sMode ? "#ff00ff" : "#67e8f9"}
          border="2px solid"
          borderColor={is80sMode ? "#ff00ff" : "#0e7490"}
          boxShadow={is80sMode ?
            "0 0 20px rgba(255, 0, 255, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.3), 0 0 40px rgba(255, 0, 255, 0.3)" :
            "0 0 15px rgba(6, 182, 212, 0.4), inset 0 0 8px rgba(6, 182, 212, 0.2)"
          }
          onClick={openVideoScreenAndInitialize}
          _hover={{
            background: is80sMode ?
              "linear-gradient(135deg, rgba(255, 0, 255, 0.4), rgba(0, 255, 255, 0.4))" :
              "linear-gradient(135deg, rgba(19, 36, 63, 0.95), rgba(7, 20, 42, 0.95))",
            borderColor: is80sMode ? "#00ffff" : "#22d3ee",
            transform: "scale(1.08)",
            boxShadow: is80sMode ?
              "0 0 30px rgba(255, 0, 255, 0.7), 0 0 50px rgba(0, 255, 255, 0.4)" :
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
            background: is80sMode ?
              "conic-gradient(from 0deg, #ff00ff, #00ffff, #ff00ff, #00ffff, #ff00ff)" :
              "conic-gradient(from 215deg, #22d3ee, #06b6d4, #0891b2, #0e7490, #155e75, #0e7490, #0891b2, #06b6d4, #22d3ee)",
            opacity: is80sMode ? "0.6" : "0.4",
            filter: "blur(4px)",
            zIndex: "-1",
            animation: is80sMode ? "rotateConic 4s linear infinite" : "rotateConic 8s linear infinite",
          }}
          _after={{
            content: '""',
            position: "absolute",
            inset: "-1px",
            borderRadius: "full",
            background: "radial-gradient(circle at center, transparent 60%, rgba(6, 182, 212, 0.2))",
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
          {/* Radio Tower Icon */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            width="36px"
            height="36px"
            position="relative"
            zIndex="2"
            margin="0 auto"
            animation={is80sMode ? "radioPulse80s 2s ease-in-out infinite" : "radioPulse 2s ease-in-out infinite"}
            sx={{
              "@keyframes radioPulse": {
                "0%": { 
                  transform: "scale(1)",
                  filter: "drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))"
                },
                "50%": { 
                  transform: "scale(1.1)",
                  filter: "drop-shadow(0 0 8px rgba(6, 182, 212, 0.8))"
                },
                "100%": { 
                  transform: "scale(1)",
                  filter: "drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))"
                },
              },
              "@keyframes radioPulse80s": {
                "0%": { 
                  transform: "scale(1)",
                  filter: "drop-shadow(0 0 6px rgba(255, 0, 255, 0.6))"
                },
                "50%": { 
                  transform: "scale(1.1)",
                  filter: "drop-shadow(0 0 12px rgba(0, 255, 255, 0.8))"
                },
                "100%": { 
                  transform: "scale(1)",
                  filter: "drop-shadow(0 0 6px rgba(255, 0, 255, 0.6))"
                },
              },
            }}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="28" 
              height="28" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke={is80sMode ? "#ff00ff" : "#67e8f9"}
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                filter: is80sMode ? 
                  "drop-shadow(0 0 3px #ff00ff) drop-shadow(0 0 6px rgba(255, 0, 255, 0.4))" :
                  "drop-shadow(0 0 2px #67e8f9) drop-shadow(0 0 4px rgba(103, 232, 249, 0.3))"
              }}
            >
              <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/>
              <path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/>
              <circle cx="12" cy="9" r="2"/>
              <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/>
              <path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
              <path d="M9.5 18h5"/>
              <path d="m8 22 4-11 4 11"/>
            </svg>
          </Box>
        </Button>
        
        {/* Launch Confirmation (When rocket is visible) */}
        {rocketModelVisible && (
          <Box
            position="absolute"
            bottom="75px"
            left="50%"
            transform="translateX(-50%)"
            display="flex"
            flexDirection="row"
            alignItems="center"
            gap="8px"
            zIndex="1001"
            bg="rgba(0, 0, 0, 0.8)"
            borderRadius="full"
            px="20px"
            py="10px"
            border="2px solid #39ff14"
            boxShadow="0 0 20px rgba(57, 255, 20, 0.3)"
          >
            <Text color="#39ff14" fontSize="14px" fontWeight="bold">
              Launch?
            </Text>
            <Button
              size="sm"
              bg="rgba(57, 255, 20, 0.2)"
              color="#39ff14"
              border="1px solid #39ff14"
              borderRadius="full"
              _hover={{
                bg: "rgba(57, 255, 20, 0.3)",
                transform: "scale(1.05)"
              }}
              onClick={() => {
                console.log("🚀 Mobile: Launch confirmed!");
                
                // Send launch message to parent window
                if (window.parent) {
                  window.parent.postMessage({
                    type: 'ROCKET_LAUNCH',
                    timestamp: Date.now()
                  }, '*');
                }
                
                // Also send to iframe for compatibility
                if (missionControlIframeRef.current) {
                  missionControlIframeRef.current.contentWindow.postMessage({
                    type: 'ROCKET_LAUNCH'
                  }, '*');
                }
                
                // Call the ignition handler
                if (handleIgnition) {
                  handleIgnition();
                }
              }}
            >
              OK
            </Button>
            <Button
              size="sm"
              bg="rgba(255, 0, 0, 0.2)"
              color="#ff6b6b"
              border="1px solid #ff6b6b"
              borderRadius="full"
              _hover={{
                bg: "rgba(255, 0, 0, 0.3)",
                transform: "scale(1.05)"
              }}
              onClick={() => {
                console.log("🚀 Mobile: Launch cancelled");
                // Just hide the launch dialog by toggling the rocket back
                handleRocketModelToggle();
              }}
            >
              Cancel
            </Button>
          </Box>
        )}
        
        {/* Pagination Indicator with Arrows (Above Signal Button) */}
        {paginationState && !rocketModelVisible && (
          <Box
            position="absolute"
            bottom="100px"
            left="50%"
            transform="translateX(-50%)"
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap="4px"
            zIndex="1001"
          >
            <Box
              display="flex"
              alignItems="center"
              gap="12px"
            >
              {/* Left Arrow */}
              <IconButton
                aria-label="Previous Page"
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6"/>
                  </svg>
                }
                color="#ffffff"
                bg="transparent"
                borderRadius="full"
                border="2px solid rgba(255,255,255,0.8)"
                onClick={() => {
                  console.log('Left arrow clicked, paginationState:', paginationState);
                  
                  // Check if candle viewer is open and can handle navigation
                  if (window.isCandleViewerOpen && window.candleViewerNavigate) {
                    console.log('Candle viewer is open, navigating in viewer');
                    window.candleViewerNavigate('prev');
                    return;
                  }
                  
                  if (paginationState) {
                    const { currentPage, totalPages, setCurrentPage } = paginationState;
                    const newPage = (currentPage - 1 + totalPages) % totalPages;
                    setCurrentPage(newPage);
                  }
                }}
                _hover={{
                  bg: "rgba(255,255,255,0.1)",
                  borderColor: "#ffffff",
                  transform: "scale(1.1)",
                }}
                size="lg"
                minW="48px"
                h="48px"
                p="12px"
              />
              
              <Text 
                className={!is80sMode ? "thelma1" : ""}
                fontSize="2rem"
                // Override styles in 80s mode for chrome/neon effect
                sx={is80sMode ? {
                  fontWeight: "900",
                  lineHeight: "0.8",
                  transform: "rotate(-8deg) skew(-15deg)",
                  background: "linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  position: "relative",
         
                  filter: `
                    drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))
                    drop-shadow(0 0 16px rgba(255, 255, 255, 0.7))
                    drop-shadow(0 0 24px rgba(255, 255, 255, 0.5))
                    drop-shadow(0 0 40px rgba(0, 255, 255, 0.6))
                    drop-shadow(0 0 60px rgba(255, 0, 255, 0.5))
                  `,
                  animation: "neonPulse 2s ease-in-out infinite alternate",
                  // Add TWO pseudo-elements - one for white outline, one for colorful text
                  _after: {
                    content: "'THE ILLUMIN80'",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: -1,
                    color: "transparent",
                    WebkitTextStroke: "2px white",
                    filter: "blur(3px)",
                    opacity: 0.7,
                  },
                  "@keyframes neonPulse": {
                    "0%": {
                      filter: `
                        drop-shadow(0 0 8px rgba(255, 255, 255, 0.9))
                        drop-shadow(0 0 16px rgba(255, 255, 255, 0.7))
                        drop-shadow(0 0 24px rgba(255, 255, 255, 0.5))
                        drop-shadow(0 0 40px rgba(0, 255, 255, 0.6))
                        drop-shadow(0 0 60px rgba(255, 0, 255, 0.5))
                      `,
                    },
                    "100%": {
                      filter: `
                        drop-shadow(0 0 12px rgba(255, 255, 255, 1))
                        drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))
                        drop-shadow(0 0 32px rgba(255, 255, 255, 0.6))
                        drop-shadow(0 0 50px rgba(0, 255, 255, 0.8))
                        drop-shadow(0 0 70px rgba(255, 0, 255, 0.6))
                      `,
                    }
                  }
                } : {}}
              >
                THE ILLUMIN80
              </Text>
              
              {/* Right Arrow */}
              <IconButton
                aria-label="Next Page"
                icon={
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                }
                color="#ffffff"
                bg="transparent"
                borderRadius="full"
                border="2px solid rgba(255,255,255,0.8)"
                onClick={() => {
                  console.log('Right arrow clicked, paginationState:', paginationState);
                  
                  // Check if candle viewer is open and can handle navigation
                  if (window.isCandleViewerOpen && window.candleViewerNavigate) {
                    console.log('Candle viewer is open, navigating in viewer');
                    window.candleViewerNavigate('next');
                    return;
                  }
                  
                  if (paginationState) {
                    const { currentPage, totalPages, setCurrentPage } = paginationState;
                    const newPage = (currentPage + 1) % totalPages;
                    console.log('Calculating new page:', currentPage, '+1 %', totalPages, '=', newPage);
                    setCurrentPage(newPage);
                  }
                }}
                _hover={{
                  bg: "rgba(255,255,255,0.1)",
                  borderColor: "#ffffff",
                  transform: "scale(1.1)",
                }}
                size="lg"
                minW="48px"
                h="48px"
                p="12px"
              />
            </Box>
            
            <Box display="flex" gap="4px" alignItems="center">
              {paginationState.totalPages <= 10 ? (
                Array.from({ length: paginationState.totalPages }).map((_, i) => (
                  <Box
                    key={i}
                    width={i === paginationState.currentPage ? "16px" : "6px"}
                    height="6px"
                    borderRadius={i === paginationState.currentPage ? "3px" : "50%"}
                    bg={i === paginationState.currentPage ? "#ffffff" : "rgba(255,255,255,0.6)"}
                    transition="all 0.3s ease"
                  />
                ))
              ) : (
                <Text fontSize="1rem" color="#ffffff" opacity="0.8">
                  {paginationState.currentPage + 1} / {paginationState.totalPages}
                </Text>
              )}
            </Box>
            
            <Text
              fontSize="1rem"
              color="#ffffff"
              opacity="0.8"
            >
              {paginationState.visibleRange.start}-{paginationState.visibleRange.end} of {paginationState.total}
            </Text>
          </Box>
        )}
        
        {/* FLAME Button (Right-Mid Side) - Inactive */}
        <IconButton
          aria-label="Flame (Inactive)"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          }
          color={is80sMode ? "#ff66ff" : "#64748b"}
          bg={is80sMode ? "rgba(139, 0, 139, 0.2)" : "rgba(13, 25, 42, 0.5)"}
          borderRadius="full"
          boxShadow={is80sMode ?
            "0 0 5px rgba(255, 102, 255, 0.3), inset 0 0 3px rgba(255, 0, 255, 0.2)" :
            "0 0 5px rgba(100, 116, 139, 0.2), inset 0 0 3px rgba(100, 116, 139, 0.1)"
          }
          border={is80sMode ? "1px solid #ff66ff" : "1px solid #475569"}
          isDisabled={true}
          cursor="not-allowed"
          opacity={0.6}
          _hover={{}}
          _disabled={{
            opacity: 0.6,
            cursor: "not-allowed",
            bg: is80sMode ? "rgba(139, 0, 139, 0.2)" : "rgba(13, 25, 42, 0.5)",
            color: is80sMode ? "#ff66ff" : "#64748b"
          }}
          size="lg"
        />
        
        {/* EXIT Button (Right Side) */}
        <IconButton
          aria-label="Exit to Home"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 17 5-5-5-5"/>
              <path d="M21 12H9"/>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            </svg>
          }
          color={is80sMode ? "#ff00ff" : "#67e8f9"}
          bg={is80sMode ? "rgba(255, 0, 255, 0.2)" : "rgba(13, 25, 42, 0.95)"}
          borderRadius="full"
          boxShadow={is80sMode ?
            "0 0 10px rgba(255, 0, 255, 0.4), inset 0 0 6px rgba(0, 255, 255, 0.2)" :
            "0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 6px rgba(6, 182, 212, 0.2)"
          }
          border={is80sMode ? "1px solid #ff00ff" : "1px solid #0e7490"}
          onClick={() => router.push("/home")}
          _hover={{
            bg: is80sMode ? "rgba(255, 0, 255, 0.3)" : "rgba(19, 36, 63, 0.95)",
            transform: "scale(1.08)",
            boxShadow: is80sMode ?
              "0 0 15px rgba(255, 0, 255, 0.6), 0 0 25px rgba(0, 255, 255, 0.3)" :
              "0 0 15px rgba(6, 182, 212, 0.5)",
          }}
          size="lg"
        />
        
      </Box>

      {/* Ensure no backdrop is visible when video screen is closed */}
      <Box
        position="fixed"
        top="0"
        left="0"
        width="100%"
        height="100%"
        bg="transparent"
        backdropFilter="none"
        zIndex={isVideoScreenOpen ? "-1" : "-1"}
        opacity={0}
        visibility="hidden"
        display="none"
        pointerEvents="none"
      />

      {/* Video Screen Popup - Completely redesigned */}
      {isVideoScreenOpen && (
        <>
          {/* Overlay */}
          <Box
            position="fixed"
            top="0"
            left="0"
            width="100%"
            height="100%"
            bg="rgba(0, 0, 0, 0.7)"
            backdropFilter="blur(5px)"
            zIndex="1500"
            onClick={closeVideoScreen}
            cursor="pointer"
            transition="opacity 0.3s ease-in-out"
            opacity={1}
            visibility="visible"
            display="block"
            pointerEvents="auto"
          />
          
          {/* Standalone Video Screen Container */}
          <Box
            position="fixed"
            bottom="80px"
            left="0"
            right="0"
            width="90%"
            maxWidth="350px"
            margin="0 auto"
            bg="rgba(13, 25, 42, 0.95)"
            zIndex="1600"
            borderRadius="16px"
            boxShadow="0 0 25px rgba(6, 182, 212, 0.3)"
            border="2px solid #0e7490"
            overflow="hidden"
            onClick={e => e.stopPropagation()}
            paddingBottom="0"
          >
            {/* Close Button */}
            <Button
              position="absolute"
              color="#67e8f9"
              top="10px"
              right="10px"
              zIndex="1700"
              bg="rgba(13, 25, 42, 0.95)"
              borderRadius="full"
              p={2}
              size="sm"
              boxShadow="0 0 10px rgba(6, 182, 212, 0.4)"
              border="1px solid #0e7490"
              onClick={closeVideoScreen}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
            
            {/* Video Display Area */}
            <Box
              width="100%"
              position="relative"
              minHeight="17rem"
              borderRadius="16px 16px 0 0"
              overflow="hidden"
              bg="#111827"
              border="1px solid #134e4a"
            >
              {/* Video Header */}
              <Box
                width="100%"
                height="32px"
                bg="#111827"
                borderBottom="1px solid #134e4a"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                px={3}
              >
                <Text fontSize="0.75rem" color="#67e8f9">COMM:/lunar_base_alpha</Text>
                <Box 
                  height="8px" 
                  width="8px" 
                  borderRadius="50%" 
                  bg="#4b5563"
                  id="video-status-indicator"
                />
              </Box>
              
              {/* Video Display */}
              <Box
                width="100%"
                height="180px"
                position="relative"
                bg="linear-gradient(45deg, #041c2c, #000)"
                id="video-display-area"
              >
                {/* Offline Display */}
                <Box
                  position="absolute"
                  top="0"
                  left="0"
                  width="100%"
                  height="100%"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  bg="#111827"
                  color="#4b5563"
                  fontSize="0.875rem"
                  fontFamily="monospace"
                  id="offline-display"
                >
                  <Text>SYS//OFFLINE</Text>
                  <Box position="absolute" width="100%" height="1px" bg="#374151" top="50%" left="0"></Box>
                  <Box position="absolute" height="100%" width="1px" bg="#374151" left="50%" top="0"></Box>
                  <Box position="absolute" inset="0" bgImage="repeating-linear-gradient(transparent, transparent 1px, rgba(6, 182, 212, 0.02) 1px, rgba(6, 182, 212, 0.02) 2px)" bgSize="100% 2px" pointerEvents="none"></Box>
                </Box>
                
                {/* Video Feed */}
                <Box
                  position="absolute"
                  top="0"
                  left="0"
                  width="100%"
                  height="100%"
                  id="video-feed"
                >
                  {/* Video will be dynamically added here */}
                </Box>
                
                {/* Touch to Unmute Overlay - Mobile Only */}
                {console.log('Unmute overlay render check:', { showUnmuteOverlay, isVideoScreenOpen })}
                {showUnmuteOverlay && (
                  <Box
                    position="absolute"
                    top="0"
                    left="0"
                    width="100%"
                    height="100%"
                    bg="rgba(0, 0, 0, 0.8)"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    zIndex={10000}
                    cursor="pointer"
                    style={{ zIndex: 10000, pointerEvents: 'auto' }} // Ensure z-index is applied and blocking interactions
                    onClick={() => {
                      console.log("Unmute overlay clicked - triggering greeting");
                      setShowUnmuteOverlay(false);
                      
                      // Trigger SitePal greeting with proper parameters
                      if (!window.greetingPlayed) {
                        try {
                          if (window.sayText && typeof window.sayText === 'function') {
                            // Use the exact same parameters as the working version
                            window.sayText("Welcome to cyberpunk mission control. I am ready to assist you.", 9, 1, 7);
                            console.log("✅ SitePal greeting spoken via unmute overlay");
                            window.greetingPlayed = true;
                          } else if (window.sayHi && typeof window.sayHi === 'function') {
                            // Fallback to sayHi if sayText not available
                            window.sayHi();
                            console.log("✅ Greeting triggered via sayHi() fallback");
                            window.greetingPlayed = true;
                          } else {
                            console.warn("⚠️ No greeting function available");
                          }
                        } catch (e) {
                          console.warn("⚠️ Error triggering greeting:", e);
                        }
                      } else {
                        console.log("ℹ️ Greeting already played");
                      }
                    }}
                  >
                    <Box
                      bg="rgba(6, 182, 212, 0.2)"
                      borderRadius="full"
                      p={6}
                      animation="pulse 2s infinite"
                      border="2px solid rgba(6, 182, 212, 0.4)"
                      mb={4}
                    >
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#67e8f9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                      </svg>
                    </Box>
                    <Text
                      color="#67e8f9"
                      fontSize="1.2rem"
                      fontWeight="bold"
                      textAlign="center"
                      animation="fadeInOut 2s infinite"
                    >
                      Touch to Un-mute
                    </Text>
                  </Box>
                )}
              </Box>
              
              {/* Video Controls */}
              <Box
                width="100%"
                height="36px"
                bg="#111827"
                borderTop="1px solid #134e4a"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                px={3}
              >
                <Box as="select" 
                  bg="#1f2937" 
                  color="#22d3ee" 
                  fontSize="0.75rem" 
                  fontFamily="monospace" 
                  px={2}
                  py={1} 
                  border="1px solid #134e4a" 
                  borderRadius="4px" 
                  boxShadow="0 0 3px rgba(6, 182, 212, 0.2)"
                  id="station-select"
                >
                  <option>LUNAR BASE ALPHA</option>
                  <option>MARS OUTPOST</option>
                  <option>ORBITAL STATION</option>
                  <option>EARTH HQ</option>
                </Box>
                
                <Box display="flex" alignItems="center" gap={2}>
                  {/* CONNECT Button */}
                  <Button
                    id="signal-button"
                    fontSize="0.75rem"
                    fontFamily="monospace"
                    py={1}
                    px={2}
                    borderRadius="4px"
                    bg="#1f2937"
                    color="#22d3ee"
                    border="1px solid #134e4a"
                    boxShadow="0 0 5px rgba(6, 182, 212, 0.3)"
                    className={connectionPhase === 3 ? "unmute" : connectionPhase === 4 ? "disconnect" : ""}
                    _hover={{
                      bg: "#2a2f3a",
                      boxShadow: "0 0 8px rgba(6, 182, 212, 0.5)"
                    }}
                    _active={{
                      transform: "scale(0.98)"
                    }}
                    onClick={toggleCall}
                    display="none" // Initially hidden, will be shown after video starts
                  >
                    CONNECT
                  </Button>
                  
                  {/* CC Button */}
                  <Button
                    fontSize="0.75rem"
                    fontFamily="monospace"
                    py={1}
                    px={2}
                    borderRadius="4px"
                    bg="#1f2937"
                    color="#22d3ee"
                    border="1px solid #134e4a"
                    boxShadow="0 0 5px rgba(6, 182, 212, 0.3)"
                    id="transcript-toggle-btn"
                    onClick={(e) => {
                      const transcriptContainer = document.getElementById("transcript-container");
                      const button = e.target;
                      
                      if (transcriptContainer) {
                        const isVisible = transcriptContainer.style.display === "block";
                        
                        if (isVisible) {
                          // Hiding transcript
                          transcriptContainer.style.display = "none";
                          button.style.backgroundColor = "#1f2937";
                          button.style.boxShadow = "0 0 5px rgba(6, 182, 212, 0.3)";
                        } else {
                          // Showing transcript
                          transcriptContainer.style.display = "block";
                          button.style.backgroundColor = "#0e7490";
                          button.style.boxShadow = "0 0 8px rgba(6, 182, 212, 0.6)";
                          
                          // Load default transcript if not already loaded
                          const transcriptContent = document.getElementById("transcript-content");
                          if (transcriptContent && !transcriptContent.children.length) {
                            loadTranscript('en');
                          }
                        }
                      }
                    }}
                    _hover={{
                      bg: "#2a2f3a",
                      boxShadow: "0 0 8px rgba(6, 182, 212, 0.5)"
                    }}
                  >
                    CC
                  </Button>
                </Box>
              </Box>
            </Box>
            
            {/* Transcript Area - Compact Mobile Design */}
            <Box
              width="100%"
              maxHeight="90px"
              bg="rgba(15, 23, 42, 0.95)"
              border="1px solid #134e4a"
              borderRadius="0 0 16px 16px"
              overflow="hidden"
              fontFamily="monospace"
              color="#22d3ee"
              fontSize="0.7rem"
              display="none"
              id="transcript-container"
              backdropFilter="blur(8px)"
              boxShadow="0 -2px 8px rgba(0, 0, 0, 0.4)"
            >
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                p={1}
                bg="rgba(31, 41, 55, 0.9)"
                borderBottom="1px solid #134e4a"
              >
                <Text fontSize="0.65rem" fontWeight="bold" color="#67e8f9">Video Transcript</Text>
                <Box as="select" 
                  fontSize="0.6rem" 
                  bg="rgba(31, 41, 55, 0.9)" 
                  color="#22d3ee" 
                  border="1px solid #134e4a" 
                  borderRadius="3px" 
                  py={0.5} 
                  px={1}
                  onChange={(e) => {
                    const language = e.target.value;
                    loadTranscript(language);
                  }}
                >
                  <option value="en">EN</option>
                  <option value="es">ES</option>
                  <option value="fr">FR</option>
                </Box>
              </Box>
              
              <Box p={1} maxHeight="65px" overflowY="auto" id="transcript-content" 
                lineHeight="1.2"
              >
                {/* Transcript content will appear here */}
              </Box>
            </Box>
            
            {/* Text Input Interface for SitePal Communication */}
            <Box
              id="text-input-container"
              display="none"
              position="absolute"
              bottom="0"
              left="0"
              width="100%"
              bg="rgba(15, 23, 42, 0.95)"
              border="1px solid #134e4a"
              borderRadius="0 0 16px 16px"
              p={3}
              pt={12}
              pb={0}
              backdropFilter="blur(8px)"
              boxShadow="0 -2px 8px rgba(0, 0, 0, 0.4)"
            >
              <Box position="relative" width="100%">
                <input
                  type="text"
                  id="sitepal-text-input"
                  placeholder="Type your message and press Enter..."
                  disabled={showUnmuteOverlay}
                  className={showUnmuteOverlay ? 'overlay-visible' : ''}
                  style={{
                    width: "100%",
                    padding: "12px 50px 12px 16px",
                    background: "rgba(31, 41, 55, 0.9)",
                    border: "1px solid #134e4a",
                    borderRadius: "8px",
                    color: "#22d3ee",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    outline: "none",
                    height: "48px",
                    boxSizing: "border-box"
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      // Prevent interaction if unmute overlay is visible
                      if (showUnmuteOverlay) {
                        console.log("⚠️ Ignoring input - unmute overlay is visible");
                        return;
                      }
                      
                      const textInput = e.target;
                      const message = textInput.value.trim();
                      
                      if (message) {
                        console.log('Sending message to SitePal:', message);
                        
                        // Try to send directly to SitePal AI functions (similar to desktop version)
                        if (window.vhss_ai_sayPreAI && typeof window.vhss_ai_sayPreAI === 'function') {
                          try {
                            window.vhss_ai_sayPreAI(message);
                            console.log("✅ Message sent to SitePal via vhss_ai_sayPreAI");
                          } catch (e) {
                            console.warn("⚠️ Error sending via vhss_ai_sayPreAI:", e);
                          }
                        } else if (window.parent) {
                          // Fallback: send to parent window
                          window.parent.postMessage({
                            type: 'SITEPAL_TEXT_MESSAGE',
                            message: message
                          }, '*');
                          console.log("📤 Message sent to parent window");
                        } else {
                          console.warn("⚠️ No SitePal AI function available");
                          console.log("Available window functions:", Object.keys(window).filter(key => key.includes('vhss') || key.includes('ai')));
                        }
                        
                        // Clear input
                        textInput.value = '';
                      }
                    }
                  }}
                />
                {/* Send Icon */}
                <Box
                  position="absolute"
                  right="12px"
                  top="50%"
                  transform="translateY(-50%)"
                  cursor="pointer"
                  color="#22d3ee"
                  fontSize="1.2rem"
                  _hover={{
                    color: "#67e8f9",
                    transform: "translateY(-50%) scale(1.1)"
                  }}
                  onClick={() => {
                    // Prevent interaction if unmute overlay is visible
                    if (showUnmuteOverlay) {
                      console.log("⚠️ Ignoring click - unmute overlay is visible");
                      return;
                    }
                    
                    const textInput = document.getElementById('sitepal-text-input');
                    const message = textInput.value.trim();
                    
                    if (message) {
                      console.log('Sending message to SitePal:', message);
                      
                      // Try to send directly to SitePal AI functions (similar to desktop version)
                      if (window.vhss_ai_sayPreAI && typeof window.vhss_ai_sayPreAI === 'function') {
                        try {
                          window.vhss_ai_sayPreAI(message);
                          console.log("✅ Message sent to SitePal via vhss_ai_sayPreAI");
                        } catch (e) {
                          console.warn("⚠️ Error sending via vhss_ai_sayPreAI:", e);
                        }
                      } else if (window.parent) {
                        // Fallback: send to parent window
                        window.parent.postMessage({
                          type: 'SITEPAL_TEXT_MESSAGE',
                          message: message
                        }, '*');
                        console.log("📤 Message sent to parent window");
                      } else {
                        console.warn("⚠️ No SitePal AI function available");
                        console.log("Available window functions:", Object.keys(window).filter(key => key.includes('vhss') || key.includes('ai')));
                      }
                      
                      // Clear input
                      textInput.value = '';
                      textInput.focus();
                    }
                  }}
                >
                  ➤
                </Box>
              </Box>
            </Box>
            
            {/* Music Player component if showSpotify is true */}
            {renderMusicPlayer()}
          </Box>
        </>
      )}

      {/* Settings Popup */}
      {isSettingsOpen && (
        <>
          {/* Overlay - Explicit visibility settings */}
          <Box
            position="fixed"
            top="0"
            left="0"
            width="100%"
            height="100%"
            bg="rgba(0, 0, 0, 0.5)"
            backdropFilter="blur(5px)"
            zIndex="1500"
            onClick={closeSettings}
            cursor="pointer"
            transition="opacity 0.3s ease-in-out"
            opacity={1}
            visibility="visible"
            display="block"
            pointerEvents="auto"
          />
          
          {/* Settings Content */}
          <Box
            position="fixed"
            bottom="80px" // Position above the nav bar
            left="0"
            right="0"
            width="90%"
            minHeight="17"
            maxWidth="350px"
            margin="0 auto"
            bg="rgba(13, 25, 42, 0.95)"
            zIndex="1600"
            borderRadius="16px"
            boxShadow="0 0 25px rgba(6, 182, 212, 0.3)"
            border="2px solid #0e7490"
            overflow="hidden"
            onClick={e => e.stopPropagation()}
            padding="20px"
          >
            {/* Settings Title */}
            <Text
              color="#67e8f9"
              fontSize="18px"
              fontWeight="bold"
              textAlign="center"
              marginBottom="20px"
              textShadow="0 0 5px rgba(6, 182, 212, 0.7)"
            >
              Control Panel
            </Text>
            
            {/* Settings List */}
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel htmlFor="80s-mode" color="#67e8f9" margin="0" fontSize="14px">
                  80s Mode
                </FormLabel>
                <Switch
                  id="80s-mode"
                  isChecked={is80sMode}
                  onChange={handle80sModeToggle}
                  colorScheme="cyan"
                />
              </FormControl>
              
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel htmlFor="monster-mode" color="#67e8f9" margin="0" fontSize="14px">
                  Launch Mode
                </FormLabel>
                <Switch
                  id="monster-mode"
                  isChecked={monsterMode}
                  onChange={handleMonsterModeToggle}
                  colorScheme="cyan"
                />
              </FormControl>
              
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel htmlFor="spotify-toggle" color="#67e8f9" margin="0" fontSize="14px">
                  Music Player
                </FormLabel>
                <Switch
                  id="spotify-toggle"
                  isChecked={showSpotify}
                  onChange={() => {
                    if (setShowSpotify && typeof setShowSpotify === 'function') {
                      setShowSpotify(!showSpotify);
                    }
                  }}
                  colorScheme="cyan"
                />
              </FormControl>
              
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel htmlFor="rocket-toggle" color="#67e8f9" margin="0" fontSize="14px">
                  Rocket Model
                </FormLabel>
                <Switch
                  id="rocket-toggle"
                  isChecked={rocketModelVisible}
                  onChange={handleRocketModelToggle}
                  colorScheme="cyan"
                />
              </FormControl>
              
              <FormControl display="flex" alignItems="center" justifyContent="space-between">
                <FormLabel htmlFor="constellations-toggle" color="#67e8f9" margin="0" fontSize="14px">
                  Constellations
                </FormLabel>
                <Switch
                  id="constellations-toggle"
                  isChecked={isConstellationsVisible}
                  onChange={toggleConstellationVisibility}
                  colorScheme="cyan"
                />
              </FormControl>
            </VStack>
            
            {/* Close Button */}
            <Button
              width="100%"
              mt={6}
              colorScheme="cyan"
              variant="outline"
              onClick={closeSettings}
              _hover={{
                bg: "rgba(6, 182, 212, 0.2)",
              }}
            >
              Close
            </Button>
          </Box>
        </>
      )}

      {/* Hidden iframes for mission control and SitePal */}
      <iframe
        ref={missionControlIframeRef}
        src="/cyberpunk_mission_control_clean.html"
        style={{
          width: "1px",
          height: "1px",
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
          border: "none",
          overflow: "hidden",
          display: "block",
          backgroundColor: "transparent",
          opacity: 0,
          visibility: "hidden"
        }}
        title="Mission Control Panel"
        onLoad={handleIframeLoad}
      />

      {/* Add these CSS classes in the JSX block where the video screen is defined */}
      <style jsx global>{`
        /* Unmute button style */
        #signal-button.unmute {
          color: #22d3ee;
          border-color: #0e7490;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
          animation: connect-pulse 1.5s infinite ease-in-out;
        }
        
        /* Disconnect button style */
        #signal-button.disconnect {
          color: #ef4444;
          border-color: #991b1b;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        
        /* Connect pulse animation for CONNECT button */
        #signal-button.connect-pulse {
          animation: connect-pulse 1.5s infinite ease-in-out;
        }
        
        /* Pulse attention animation - for emphasizing the CONNECT button after video ends */
        @keyframes pulse-attention {
          0% {
            transform: scale(1);
            box-shadow: 0 0 5px rgba(6, 182, 212, 0.3);
          }
          50% {
            transform: scale(1.1);
            box-shadow: 0 0 15px rgba(6, 182, 212, 0.7);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 5px rgba(6, 182, 212, 0.3);
          }
        }
        
        /* Video status indicator when active */
        #video-status-indicator.active {
          background-color: #ef4444;
          animation: pulse 2s infinite;
        }
        
        /* Animation for the pulse effect */
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        /* Animation for connect pulse effect */
        @keyframes connect-pulse {
          0% {
            box-shadow: 0 0 5px rgba(6, 182, 212, 0.3);
            border-color: #134e4a;
          }
          50% {
            box-shadow: 0 0 10px rgba(6, 182, 212, 0.6);
            border-color: #22d3ee;
          }
          100% {
            box-shadow: 0 0 5px rgba(6, 182, 212, 0.3);
            border-color: #134e4a;
          }
        }
        
        /* Mobile-optimized transcript styles */
        #transcript-content p {
          transition: all 0.3s ease;
          margin: 2px 0;
          padding: 2px 4px;
          font-size: 0.65rem;
          line-height: 1.2;
          opacity: 0.7;
          border-radius: 2px;
        }
        
        #transcript-content p.active {
          color: #67e8f9;
          opacity: 1;
          font-weight: bold;
          padding-left: 8px;
          border-left: 2px solid #67e8f9;
          background: rgba(103, 232, 249, 0.1);
          transform: translateX(2px);
        }
        
        /* Ensure CC button shows active state */
        #transcript-toggle-btn.active {
          background-color: #0e7490 !important;
          box-shadow: 0 0 8px rgba(6, 182, 212, 0.6) !important;
        }
        
        /* 80s mode animations */
        @keyframes neonPulse {
          0% {
            filter: drop-shadow(0 0 20px rgba(255, 0, 255, 0.8)) drop-shadow(0 0 40px rgba(0, 255, 255, 0.6));
          }
          100% {
            filter: drop-shadow(0 0 30px rgba(255, 0, 255, 1)) drop-shadow(0 0 60px rgba(0, 255, 255, 0.8));
          }
        }
        
        @keyframes chromeShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>

      {/* Music Player - Always rendered but hidden for ref access */}
      <Box
        position="fixed"
        bottom="10px"
        left="20px"
        zIndex="1500"
        display={showMobileMusicPlayer ? "block" : "none"}
      >
        <MobileMusicPlayer
          isVisible={showMobileMusicPlayer}
          onClose={handleMusicPlayerClose}
          autoPlay={!showMusicChoice}
          is80sMode={is80sMode}
          onModeChange={(newMode) => {
            handleMusicModeChange(newMode);
            setShowMusicChoice(false);
          }}
          showInitialChoice={showMusicChoice}
          onPlayingStateChange={setIsPlaying}
          hideUI={true}
          onControlsReady={handleMusicControlsReady}
        />
      </Box>
    </>
  );
};

export default MobileSidePanel;