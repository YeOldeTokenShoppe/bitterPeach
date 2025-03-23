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

  // Music toggle handler remains the same
  const handleMusicToggle = (e) => {
    e.stopPropagation();
    console.log("Music button clicked, current state:", showSpotify);
    setShowSpotify(!showSpotify);
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

  return (
    <>
      {/* Mission Control FAB */}
      <Button
        position="fixed"
        bottom="15px"
        right="15px"
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
          maxHeight="70vh"
          borderTop="2px solid"
          borderColor="blue.500"
          boxShadow="0 -5px 15px rgba(0, 123, 255, 0.2)"
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

          <DrawerBody bg="rgba(0, 0, 0, 0.5)">
            <VStack spacing={6} width="100%" p={4}>
              {/* Control Grid */}
              <Grid templateColumns="repeat(2, 1fr)" gap={4} width="100%">
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
                  onClick={() => onButtonClick("LAUNCH")}
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

              {/* System Controls */}
              <Box
                bg="gray.800"
                p="4"
                rounded="md"
                border="1px"
                borderColor="gray.700"
                width="100%"
              >
                <Flex justify="space-between" align="center" mb="4">
                  <Text
                    fontFamily="mono"
                    fontSize="sm"
                    color={is80sMode ? "pink.300" : "gray.400"}
                  >
                    80&apos;S MODE
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
                bg="black"
                rounded="md"
                border="2px"
                borderColor="gray.700"
                p="3"
                width="100%"
                fontFamily="mono"
                color="green.500"
                fontSize="sm"
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

                <Box maxH="120px" overflowY="auto">
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
              <Flex width="100%" justify="space-between" mt="2">
                <Flex align="center">
                  <Box
                    w="3"
                    h="3"
                    rounded="full"
                    mr="2"
                    bg={is80sMode || monsterMode ? "green.500" : "red.500"}
                  />
                  <Text fontSize="xs" fontFamily="mono">
                    STATUS
                  </Text>
                </Flex>
                <Text fontSize="xs" fontFamily="mono" color="gray.500">
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
