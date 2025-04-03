import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  FormControl,
  FormLabel,
  Switch,
  useDisclosure,
  Text,
  Flex,
  Grid,
  Select,
} from "@chakra-ui/react";
import {
  useUser,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";

import { useRouter } from "next/router";
import Image from "next/image";
const MobileSidePanel = ({
  onButtonClick,
  is80sMode,
  toggle80sMode,
  monsterMode,
  toggleMonsterMode,
  showSpotify,
  setShowSpotify,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState(router.asPath);
  const [emoji, setEmoji] = useState("😇");
  const [mounted, setMounted] = useState(false);

  // Add state for video call functionality
  const [activeCall, setActiveCall] = useState(false);
  const [currentStation, setCurrentStation] = useState("LUNAR BASE ALPHA");

  const sitepalIframeRef = useRef(null); // Keep ref for src manipulation
  const [connectionPhase, setConnectionPhase] = useState(0); // 0=not started, 1=static, 2=connecting, 3=stabilizing, 4=connected
  const [isMuted, setIsMuted] = useState(true);
  const microphoneStreamRef = useRef(null);
  const { isLoaded, isSignedIn, user } = useUser();
  // Add this function to send messages to the iframe
  const sendMessageToIframe = (message) => {
    const iframe = document.querySelector(
      'iframe[title="Mission Control Panel Mobile"]'
    );
    if (iframe) {
      try {
        iframe.contentWindow.postMessage(message, "*");
      } catch (error) {
        console.error("Error sending message to iframe:", error);
      }
    }
  };
  const handleIframeLoad = () => {
    console.log("Mobile: SitePal iframe loaded");

    // Give the iframe content time to initialize
    setTimeout(() => {
      if (sitepalIframeRef.current) {
        try {
          // 1. Send a post message to the iframe to ensure it's responsive
          console.log("Mobile: Sending test message to iframe");
          sitepalIframeRef.current.contentWindow.postMessage(
            {
              type: "MOBILE_TEST_MESSAGE",
              message: "Testing iframe communication",
            },
            "*"
          );

          // 2. Try to access the iframe document to check visibility
          // Note: This may fail due to same-origin policy if iframe src is different domain
          try {
            const iframeDoc =
              sitepalIframeRef.current.contentDocument ||
              sitepalIframeRef.current.contentWindow.document;
            console.log("Mobile: Successfully accessed iframe document");
          } catch (err) {
            console.log(
              "Mobile: Could not access iframe document due to same-origin policy"
            );
          }

          // 3. Apply scaling to the iframe for better visibility
          sitepalIframeRef.current.style.transform = "scale(1.2)";
          sitepalIframeRef.current.style.transformOrigin = "center center";

          // 4. Apply specific style fixes to ensure visibility
          const container = sitepalIframeRef.current.parentElement;
          if (container) {
            container.style.display = "flex";
            container.style.alignItems = "center";
            container.style.justifyContent = "center";
            container.style.width = "100%";
            container.style.height = "100%";
            container.style.minHeight = "150px"; // Ensure minimum height
          }
        } catch (error) {
          console.error("Mobile: Error in iframe load handler:", error);
        }
      }
    }, 500);
  };

  // Add state for tracking SitePal loading progress
  const [sitepalLoadingStage, setSitepalLoadingStage] = useState(0); // 0=not started, 1=loading, 2=ready

  // Add state to track if the iframe content has loaded
  const [isIframeLoaded, setIsIframeLoaded] = useState(false);

  // Add state to track if we're in a browser environment
  const [isBrowser, setIsBrowser] = useState(false);

  // Add state to track if we're on iOS
  const [isIOS, setIsIOS] = useState(false);

  // Update the useEffect for initialization
  useEffect(() => {
    // First check if we're in a browser environment
    setIsBrowser(typeof window !== "undefined");

    // Check if we're on iOS
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);

  // Add useEffect for iframe size checking
  useEffect(() => {
    if (sitepalIframeRef.current) {
      const checkIframeSize = () => {
        const iframe = sitepalIframeRef.current;
        if (iframe) {
          const rect = iframe.getBoundingClientRect();
          console.log("Mobile: Iframe dimensions:", {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
          });

          // Ensure iframe has proper dimensions
          if (rect.width === 0 || rect.height === 0) {
            console.warn(
              "Mobile: Iframe has zero dimensions, attempting to fix..."
            );
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

  // Update the message handler for SitePal events
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || !event.data.type) return;

      console.log("Mobile: Message from SitePal iframe:", event.data);

      switch (event.data.type) {
        case "SITEPAL_READY":
          console.log("Mobile: SitePal is ready");
          setIsIframeLoaded(true);
          setSitepalLoadingStage(2);
          // Try to activate microphone when SitePal is ready
          if (activeCall && isMuted) {
            initializeSitePalAndActivateMic();
          }
          break;

        case "SITEPAL_STATE_CHANGE":
          console.log("Mobile: SitePal state changed:", event.data.isListening);
          setIsMuted(!event.data.isListening);
          if (event.data.isListening) {
            console.log("Mobile: SitePal is now listening");
          }
          break;

        case "SITEPAL_ERROR":
          console.error("Mobile: SitePal error:", event.data.error);
          // Try to recover from error
          if (activeCall) {
            setTimeout(initializeSitePalAndActivateMic, 1000);
          }
          break;

        case "EIGHTIES_MODE_CHANGE":
          console.log("Mobile: 80s mode toggle requested");
          if (monsterMode) {
            toggleMonsterMode();
          }
          toggle80sMode();
          break;

        case "LAUNCH_MODE_TOGGLE":
          console.log("Mobile: Launch mode toggle requested");
          if (is80sMode) {
            toggle80sMode();
          }
          toggleMonsterMode();
          break;

        case "MUSIC_TOGGLE":
          console.log("Mobile: Music toggle requested");
          setShowSpotify(!showSpotify);
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
    showSpotify,
    setShowSpotify,
    activeCall,
    isMuted,
  ]);

  // Update the toggleCall function with iOS-specific handling
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
          setSitepalLoadingStage(1);

          // Progress through connection phases with timeouts
          setTimeout(() => setConnectionPhase(2), 1200);
          setTimeout(() => setConnectionPhase(3), 3000);
          setTimeout(() => {
            setConnectionPhase(4);
            setSitepalLoadingStage(2);

            // Initialize SitePal and activate microphone
            initializeSitePalAndActivateMic();
          }, 4500);
        })
        .catch((err) => {
          console.error("Mobile: Microphone permission error:", err);
          alert("Please allow microphone access to chat with the avatar");
        });
    } else if (activeCall && connectionPhase === 4 && isMuted) {
      // Unmute - Handle iOS differently
      if (isIOS) {
        // Attempt to unlock audio on iOS by playing a silent audio sample
        const silentAudio = new Audio("data:audio/mp3;base64,//uQxAAAAD/4Q==");
        silentAudio
          .play()
          .then(() => {
            console.log("Mobile: Silent audio played successfully on iOS");
            initializeSitePalAndActivateMic();
            setIsMuted(false);
          })
          .catch((error) => {
            console.error("Mobile: Error playing silent audio:", error);
            // Fallback: open popup window if silent audio fails
            const popup = window.open(
              "/sitepal/index.html",
              "sitepalPopup",
              "width=320,height=480,scrollbars=no,resizable=no"
            );
            console.log("Mobile: Fallback: Opened SitePal popup for iOS");
            setIsMuted(false);
          });
      } else {
        initializeSitePalAndActivateMic();
        setIsMuted(false);
      }
    } else {
      // End call - clean up and reset everything
      setActiveCall(false);
      setConnectionPhase(0);
      setSitepalLoadingStage(0);
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

  // New function to initialize SitePal and activate microphone
  const initializeSitePalAndActivateMic = () => {
    console.log("Mobile: Initializing SitePal and activating microphone...");

    // First, ensure SitePal is initialized
    sendMessageToIframe({
      type: "INIT_SITEPAL",
      width: 280,
      height: 180,
      accountId: 9157686,
      characterId: 244,
      autoStart: true,
    });

    // Wait a short moment for initialization
    setTimeout(() => {
      // Try multiple approaches to activate the microphone
      try {
        // 1. Prime the audio context
        sendMessageToIframe({
          type: "PRIME_AUDIO",
        });

        // 2. Send direct API call
        sendMessageToIframe({
          type: "SITEPAL_API_CALL",
          function: "startListening",
        });

        // 3. Send button click simulation
        sendMessageToIframe({
          type: "SIMULATE_CALL_BUTTON_CLICK",
          action: "unmute",
        });

        // 4. Send direct mic activation
        sendMessageToIframe({
          type: "ACTIVATE_SITEPAL_MIC",
        });

        // 5. Additional iOS-specific activation
        if (isIOS) {
          sendMessageToIframe({
            type: "IOS_MIC_ACTIVATION",
          });
        }

        console.log("Mobile: All mic activation messages sent");
      } catch (error) {
        console.error("Mobile: Error in mic activation sequence:", error);
      }
    }, 500);
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

  // Add useEffect for client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Modify the close button handler
  const handleCloseClick = (e) => {
    if (e) {
      e.stopPropagation();
    }
    onClose();
  };

  useEffect(() => {
    const emojiInterval = setInterval(() => {
      setEmoji((prevEmoji) => (prevEmoji === "😇" ? "😈" : "😇"));
    }, 3000);

    return () => clearInterval(emojiInterval);
  }, []);

  useEffect(() => {
    let audioIndicatorInterval;

    if (activeCall && connectionPhase === 4 && !isMuted) {
      // Create pulsing audio indicator when actively listening
      audioIndicatorInterval = setInterval(() => {
        // This could update a visual indicator in the UI
        console.log("Listening active...");
      }, 1000);
    }

    return () => {
      if (audioIndicatorInterval) {
        clearInterval(audioIndicatorInterval);
      }
    };
  }, [activeCall, connectionPhase, isMuted]);

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

  // Ensure this gets called during component unmount
  useEffect(() => {
    return () => {
      fullMicCleanup();
    };
  }, []);

  const leaderboardData = [
    { name: "Armstrong", score: 1969 },
    { name: "Aldrin", score: 1930 },
    { name: "Collins", score: 1890 },
    { name: "Lovell", score: 1850 },
    { name: "Cernan", score: 1800 },
  ];

  // Simplified direct handlers for the mode toggles
  const handle80sModeToggle = () => {
    if (monsterMode) {
      // If monster mode is on, turn it off first
      toggleMonsterMode();
    }
    // Then toggle 80s mode
    toggle80sMode();
  };

  const handleMonsterModeToggle = () => {
    if (is80sMode) {
      // If 80s mode is on, turn it off first
      toggle80sMode();
    }
    // Then toggle monster mode
    toggleMonsterMode();
  };

  // Update the music toggle handler to trigger autoplay
  const handleMusicToggle = (e) => {
    if (e) e.stopPropagation();

    // Toggle music state
    setShowSpotify(!showSpotify);

    // Find any existing MusicPlayer2 instances and control them
    if (typeof window !== "undefined") {
      // We'll use a small timeout to ensure state has updated
      setTimeout(() => {
        const musicIframe = document.querySelector(".spotify-iframe");
        if (musicIframe) {
          try {
            if (!showSpotify) {
              // We're turning ON - start playing
              console.log("Starting music playback");
              // You might need to adjust this based on how your MusicPlayer2 works
              // Some implementations might require postMessage or other methods

              // If it's a standard iframe with src, you can try reloading it
              const currentSrc = musicIframe.src;
              musicIframe.src = "";
              musicIframe.src = currentSrc + "&autoplay=1";
            } else {
              // We're turning OFF - pause or stop
              console.log("Stopping music playback");
              // Depending on implementation, you might need to:
              // 1. Remove/hide the iframe
              // 2. Pause the player via API
              // 3. Set src to empty
            }
          } catch (err) {
            console.error("Error controlling music player:", err);
          }
        }
      }, 100);
    }
  };

  return (
    <>
      {/* Mission Control FAB */}
      <Button
        position="fixed"
        bottom="1.5rem"
        right="1.5rem"
        width="50px"
        height="50px"
        borderRadius="full"
        backgroundColor="rgba(0, 0, 0, 0.8)"
        color="#67e8f9"
        border="2px solid"
        borderColor="#0e7490"
        boxShadow="0 0 10px rgba(6, 182, 212, 0.3)"
        zIndex="1000"
        onClick={onOpen}
        _hover={{
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          transform: "scale(1.1)",
          boxShadow: "0 0 15px rgba(6, 182, 212, 0.5)",
        }}
      >
        ☰
      </Button>

      <Drawer
        isOpen={isOpen}
        placement="bottom"
        onClose={handleCloseClick}
        size="full"
        closeOnOverlayClick={true}
        closeOnEsc={true}
      >
        <DrawerOverlay bg="rgba(0, 0, 0, 0.5)" backdropFilter="blur(5px)" />
        <DrawerContent
          backgroundColor="transparent"
          maxHeight="100vh"
          overflow="hidden"
        >
          <DrawerCloseButton
            color="#67e8f9"
            size="lg"
            top="8px"
            right="8px"
            zIndex="2000"
          />

          {/* Mission Control Panel */}
          <Box
            height="100vh"
            width="100%"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            position="relative"
          >
            <Box
              width="280px"
              height="100vh"
              overflow="hidden"
              position="relative"
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
                title="Mission Control Panel Mobile"
              />
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileSidePanel;
