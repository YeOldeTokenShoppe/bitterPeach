import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Drawer,
  DrawerContent,
  DrawerCloseButton,
  DrawerOverlay,
  useDisclosure,
} from "@chakra-ui/react";
import { useUser } from "@clerk/nextjs";

const MobileSidePanel = ({
  is80sMode,
  toggle80sMode,
  monsterMode,
  toggleMonsterMode,
  showSpotify,
  setShowSpotify,
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [activeCall, setActiveCall] = useState(false);
  const [currentStation, setCurrentStation] = useState("LUNAR BASE ALPHA");

  const sitepalIframeRef = useRef(null);
  const [connectionPhase, setConnectionPhase] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const microphoneStreamRef = useRef(null);
  const [sitepalSceneLoaded, setSitepalSceneLoaded] = useState(false);
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

  // Update the message handler for SitePal events
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || !event.data.type) return;

      switch (event.data.type) {
        case "SITEPAL_READY":
          // SitePal is initialized but scene isn't loaded yet
          break;

        case "SITEPAL_SCENE_LOADED":
          setSitepalSceneLoaded(true);
          // If we're in an active call, try to initialize microphone
          if (activeCall && isMuted && connectionPhase === 4) {
            activateSitepalMic();
          }
          break;

        case "SITEPAL_STATE_CHANGE":
          setIsMuted(!event.data.isListening);
          break;

        case "SITEPAL_ERROR":
          // Handle error if needed
          break;

        case "EIGHTIES_MODE_CHANGE":
          if (monsterMode) toggleMonsterMode();
          toggle80sMode();
          break;

        case "LAUNCH_MODE_TOGGLE":
          if (is80sMode) toggle80sMode();
          toggleMonsterMode();
          break;

        case "MUSIC_TOGGLE":
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
    connectionPhase,
  ]);

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
      sendMessageToIframe({
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
    sendMessageToIframe({
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
    sendMessageToIframe({
      type: "PRIME_AUDIO_IOS",
    });
  };

  // Function to activate SitePal microphone
  const activateSitepalMic = () => {
    if (!sitepalSceneLoaded) return;
    primeAudioOnIOS();
    sendMessageToIframe({
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
          maxHeight="80vh"
          height="80vh"
          overflow="auto"
          position="fixed"
          bottom="0"
          left="0"
          width="100%"
          margin="0"
          paddingBottom="env(safe-area-inset-bottom, 20px)"
        >
          <DrawerCloseButton
            position="fixed"
            color="#67e8f9"
            size="lg"
            top="10px"
            right="10px"
            zIndex="2000"
            bg="rgba(0,0,0,0.6)"
            borderRadius="full"
            p={2}
            _hover={{
              bg: "rgba(0,0,0,0.8)",
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
              pt="40px"
              display="flex"
              justifyContent="center"
              pb="70px"
            >
              <iframe
                src="/cyberpunk_mission_control.html"
                style={{
                  width: "100%",
                  maxWidth: "450px",
                  height: "100%",
                  minHeight: "550px",
                  border: "none",
                  overflow: "visible",
                  display: "block",
                  backgroundColor: "transparent",
                }}
                title="Mission Control Panel Mobile"
                onLoad={(e) => {
                  // Pass Firebase config to iframe
                  const iframe = e.target;
                  iframe.contentWindow.FIREBASE_API_KEY =
                    process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
                  iframe.contentWindow.FIREBASE_AUTH_DOMAIN =
                    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
                  iframe.contentWindow.FIREBASE_PROJECT_ID =
                    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
                  iframe.contentWindow.FIREBASE_STORAGE_BUCKET =
                    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
                  iframe.contentWindow.FIREBASE_MESSAGING_SENDER_ID =
                    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
                  iframe.contentWindow.FIREBASE_APP_ID =
                    process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
                }}
              />
            </Box>
          </Box>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileSidePanel;
