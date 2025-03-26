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

  // Toggle video call
  const toggleCall = () => {
    setActiveCall(!activeCall);
  };

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
            <VStack spacing={4} width="100%">
              {/* Video Call Screen */}
              <Box
                mb="3"
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

                <Box h="28" position="relative">
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
                            {/* Placeholder for station feed */}
                            <Box
                              w="100%"
                              h="100%"
                              position="relative"
                              overflow="hidden"
                            >
                              <Box
                                w="100%"
                                h="100%"
                                bg="gray.800"
                                opacity="0.6"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                                fontSize="xs"
                                color="gray.500"
                                animation="fadeIn 0.5s ease-in"
                              >
                                STATION VIEW
                              </Box>
                            </Box>
                          </Flex>
                          <Box
                            position="absolute"
                            bottom="2"
                            right="2"
                            bg="gray.900"
                            border="1px"
                            borderColor="blue.500"
                            p="1"
                            rounded="sm"
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
                            >
                              YOU
                            </Box>
                          </Box>
                          <Box
                            position="absolute"
                            top="0"
                            left="0"
                            w="full"
                            h="full"
                            bgGradient="linear(to-b, transparent, black)"
                            opacity="0.4"
                          />
                          <Text
                            position="absolute"
                            bottom="2"
                            left="2"
                            color="green.500"
                            fontSize="xs"
                            fontFamily="mono"
                            animation="pulse 2s infinite"
                          >
                            LIVE
                          </Text>
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
                    bg={activeCall ? "red.700" : "green.700"}
                    color="white"
                    _hover={{ bg: activeCall ? "red.600" : "green.600" }}
                    onClick={toggleCall}
                    size="xs"
                  >
                    {activeCall ? "END CALL" : "CONNECT"}
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
              <Grid templateColumns="repeat(2, 1fr)" gap={3} width="100%">
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
              <Flex width="100%" gap={2}>
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
                      BTTF
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
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileSidePanel;
