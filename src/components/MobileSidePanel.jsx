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
    if (sitepalIframeRef.current) {
      try {
        console.log("Mobile: Sending message to iframe:", message);

        // Handle both string and object messages
        if (typeof message === "string") {
          sitepalIframeRef.current.contentWindow.postMessage(message, "*");
        } else {
          sitepalIframeRef.current.contentWindow.postMessage(message, "*");
        }

        console.log("Mobile: Message sent successfully");
      } catch (error) {
        console.error("Mobile: Error sending message to iframe:", error);

        // Try to diagnose the issue
        if (!sitepalIframeRef.current) {
          console.error("Mobile: iframe ref is null");
        } else if (!sitepalIframeRef.current.contentWindow) {
          console.error(
            "Mobile: iframe contentWindow is null - this can happen if iframe hasn't loaded or has been navigated to a different origin"
          );
        }
      }
    } else {
      console.error("Mobile: Cannot send message - iframe ref is null");
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

  // Toggle video call
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
          }, 4500);
        })
        .catch((err) => {
          console.error("Microphone permission error:", err);
          alert("Please allow microphone access to chat with the avatar");
        });
    } else if (activeCall && connectionPhase === 4 && isMuted) {
      // Unmute - Send a message to the iframe to click the button
      try {
        console.log("Sending 'triggerListenClick' message to iframe...");
        sendMessageToIframe("triggerListenClick");
        setIsMuted(false); // Update state optimistically
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

  // Add this useEffect to handle messages from the iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || !event.data.type) return;

      console.log("Message from SitePal iframe:", event.data);

      switch (event.data.type) {
        case "SITEPAL_READY":
          console.log("SitePal is ready");
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

  // Add cleanup useEffect
  useEffect(() => {
    return () => {
      // Component cleanup
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        microphoneStreamRef.current = null;
      }

      // Reset iframe
      if (sitepalIframeRef.current) {
        sitepalIframeRef.current.src = "about:blank";
      }
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

  // Modify the close button handler to be more direct
  const handleCloseClick = (e) => {
    // Stop any event propagation
    if (e) {
      e.stopPropagation();
    }

    // Force close the drawer
    console.log("Close button clicked");
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

  // Add useEffect for client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

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
        color="blue.300"
        border="2px solid"
        borderColor="blue.500"
        boxShadow="0 0 10px rgba(0, 123, 255, 0.3)"
        zIndex="1000"
        onClick={onOpen}
        _hover={{
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          transform: "scale(1.1)",
          boxShadow: "0 0 15px rgba(0, 123, 255, 0.5)",
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
          backgroundColor="gray.900"
          borderTopRadius="20px"
          maxHeight="85vh"
          borderTop="2px solid"
          borderColor="blue.500"
          boxShadow="0 -5px 15px rgba(0, 123, 255, 0.2)"
          sx={{
            "@keyframes fadeIn": {
              "0%": { opacity: 0 },
              "100%": { opacity: 0.4 },
            },
          }}
        >
          <DrawerCloseButton
            color="blue.300"
            size="lg"
            top="8px"
            right="8px"
            zIndex="2000"
          />
          {/* Mission Control Header */}
          <DrawerHeader
            borderBottom="2px solid"
            borderColor="blue.500"
            pb="2"
            textAlign="center"
          >
            <Text
              fontSize="xl"
              fontFamily="mono"
              letterSpacing="wider"
              color="blue.100"
            >
              MISSION CONTROL
            </Text>
            <Text fontSize="xs" color="blue.400" fontFamily="mono">
              LUNAR OPERATIONS
            </Text>
          </DrawerHeader>

          <DrawerBody bg="rgba(0, 0, 0, 0.5)" p="3">
            {/* Video Call Section */}
            <Box
              mb="4"
              bg="black"
              rounded="md"
              border="2px"
              borderColor="gray.700"
              overflow="hidden"
              width="100%"
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

              <Box h="40" position="relative">
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

                            {/* SitePal iframe - positioned exactly like desktop */}
                            <Box
                              position="absolute"
                              top="0"
                              left="0"
                              width="100%"
                              height="100%"
                              objectFit="cover"
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                              zIndex="1"
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
                                    transformOrigin: "center center",
                                  }}
                                  onLoad={handleIframeLoad}
                                />
                              )}
                            </Box>

                            {/* Connection status text */}
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
                          </Box>
                        </Flex>

                        {/* User camera placeholder */}
                        <Box
                          position="absolute"
                          bottom="2"
                          right="2"
                          bg="gray.900"
                          border="1px"
                          borderColor="blue.500"
                          p="1"
                          rounded="sm"
                          zIndex="10"
                        >
                          <Box
                            w="35px"
                            h="25px"
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
                                width={35}
                                height={25}
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
                              <Box as="span" fontSize="16px">
                                😊
                              </Box>
                            )}

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
                  onClick={toggleCall}
                  size="xs"
                >
                  {!activeCall
                    ? "CONNECT"
                    : isMuted && connectionPhase === 4
                    ? "UN-MUTE"
                    : "END CALL"}
                </Button>
                <Select
                  bg="gray.900"
                  color="blue.300"
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

            {/* Control Grid */}
            <Grid templateColumns="repeat(2, 1fr)" gap={3} width="100%" mb="4">
              <Button
                bg="red.700"
                _hover={{ bg: "red.600" }}
                rounded="lg"
                p="2"
                color="white"
                fontFamily="mono"
                boxShadow="md"
                border="2px solid"
                borderColor="red.500"
                flexDirection="column"
                onClick={() => onButtonClick("LAUNCH")}
                size="sm"
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
                p="2"
                color="white"
                fontFamily="mono"
                boxShadow="md"
                border="2px solid"
                borderColor="blue.500"
                flexDirection="column"
                onClick={() => onButtonClick("ORBIT")}
                size="sm"
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
                p="2"
                color="white"
                fontFamily="mono"
                boxShadow="md"
                border="2px solid"
                borderColor="green.500"
                flexDirection="column"
                onClick={() => onButtonClick("COMMS")}
                size="sm"
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
                p="2"
                color="white"
                fontFamily="mono"
                boxShadow="md"
                border="2px solid"
                borderColor="yellow.500"
                flexDirection="column"
                onClick={() => onButtonClick("RETURN")}
                size="sm"
              >
                <Text fontSize="xs" mb="1">
                  PLAN
                </Text>
                <Text fontWeight="bold">RETURN</Text>
              </Button>
            </Grid>

            {/* Controls Row - Made more compact */}
            <Flex width="100%" gap={2} mb="4">
              {/* System Controls - reduced padding */}
              <Box
                bg="gray.800"
                p="2"
                rounded="md"
                border="1px"
                borderColor="gray.700"
                flex="1"
              >
                <Flex justify="space-between" align="center" mb="1">
                  <Text
                    fontFamily="mono"
                    fontSize="xs"
                    color={is80sMode ? "pink.300" : "gray.400"}
                  >
                    80s Mode
                  </Text>
                  <Switch
                    isChecked={is80sMode}
                    onChange={handle80sModeToggle}
                    size="sm"
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
                    fontSize="xs"
                    color={monsterMode ? "cyan.300" : "gray.400"}
                  >
                    MISSION
                  </Text>
                  <Switch
                    isChecked={monsterMode}
                    onChange={handleMonsterModeToggle}
                    size="sm"
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

              {/* Music Player Toggle - updated for better visual */}
              <Box
                bg="gray.800"
                p="2"
                rounded="md"
                border="1px"
                borderColor="gray.700"
                flex="1"
                position="relative"
                overflow="hidden"
              >
                <Flex justify="space-between" align="center" mb="1">
                  <Text
                    fontFamily="mono"
                    fontSize="xs"
                    color={showSpotify ? "yellow.300" : "gray.400"}
                  >
                    MUSIC
                  </Text>
                  <Switch
                    isChecked={showSpotify}
                    onChange={handleMusicToggle}
                    size="sm"
                    sx={{
                      "& .chakra-switch__track": {
                        background: showSpotify ? "#f0c000" : "#8e662b",
                        boxShadow: showSpotify ? "0 0 10px #f0c000" : "none",
                      },
                      "& .chakra-switch__thumb": {
                        background: "white",
                      },
                    }}
                  />
                </Flex>

                {/* Visualizer effect */}
                <Flex align="center" justify="center">
                  <Box
                    h="4px"
                    w="90%"
                    bg="gray.700"
                    rounded="full"
                    overflow="hidden"
                  >
                    <Box
                      h="full"
                      w={showSpotify ? "60%" : "0%"}
                      bg="yellow.500"
                      transition="width 0.3s ease"
                    />
                  </Box>
                </Flex>

                {/* Audio equalizer effect - only when music is on */}
                {showSpotify && (
                  <Flex
                    position="absolute"
                    bottom="0"
                    left="0"
                    width="100%"
                    height="8px"
                    justify="space-around"
                    align="flex-end"
                    px="2"
                  >
                    {[...Array(8)].map((_, i) => (
                      <Box
                        key={i}
                        width="2px"
                        height={`${Math.floor(Math.random() * 8) + 2}px`}
                        bg="yellow.300"
                        opacity="0.7"
                        animation={`equalizer${(i % 4) + 1} 1s infinite`}
                        sx={{
                          "@keyframes equalizer1": {
                            "0%, 100%": { height: "2px" },
                            "50%": { height: "8px" },
                          },
                          "@keyframes equalizer2": {
                            "0%, 100%": { height: "8px" },
                            "50%": { height: "4px" },
                          },
                          "@keyframes equalizer3": {
                            "0%, 100%": { height: "5px" },
                            "50%": { height: "2px" },
                          },
                          "@keyframes equalizer4": {
                            "0%, 100%": { height: "3px" },
                            "50%": { height: "7px" },
                          },
                        }}
                      />
                    ))}
                  </Flex>
                )}
              </Box>
            </Flex>

            {/* Compact Leaderboard */}
            <Box
              bg="black"
              rounded="md"
              border="2px"
              borderColor="gray.700"
              p="2"
              width="100%"
              fontFamily="mono"
              color="green.500"
              fontSize="xs"
              height="80px"
              overflow="hidden"
              mb="3"
            >
              <Text
                textAlign="center"
                borderBottom="1px"
                borderColor="green.800"
                pb="1"
                mb="1"
                fontSize="2xs"
              >
                MISSION LEADERBOARD
              </Text>

              <Box overflowY="auto" maxH="55px" px="1">
                {leaderboardData.slice(0, 3).map((entry, index) => (
                  <Flex
                    key={index}
                    justify="space-between"
                    py="0.5"
                    color={index === 0 ? "yellow.400" : "inherit"}
                    fontWeight={index === 0 ? "bold" : "normal"}
                  >
                    <Text>{entry.name}</Text>
                    <Text>{entry.score}</Text>
                  </Flex>
                ))}
              </Box>
            </Box>

            {/* Status Footer */}
            <Flex width="100%" justify="space-between" mt="1">
              <Flex align="center">
                <Box
                  w="2"
                  h="2"
                  rounded="full"
                  mr="2"
                  bg={
                    activeCall || is80sMode || monsterMode
                      ? "green.500"
                      : "red.500"
                  }
                />
                <Text fontSize="2xs" fontFamily="mono">
                  STATUS
                </Text>
              </Flex>
              <Text fontSize="2xs" fontFamily="mono" color="gray.500">
                MCP v1.0
              </Text>
            </Flex>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileSidePanel;
