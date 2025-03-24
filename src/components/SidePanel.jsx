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
    const handleFirstClick = (e) => {
      // Don't close if clicking inside the panel
      if (panelRef.current?.contains(e.target)) {
        return;
      }

      setIsTextBoxVisible(false);
      setHasUserInteracted(true);
    };

    // Add click listener if panel is visible
    if (isTextBoxVisible) {
      document.addEventListener("click", handleFirstClick);
    }

    return () => {
      document.removeEventListener("click", handleFirstClick);
    };
  }, [isTextBoxVisible]); // Add isTextBoxVisible to dependencies

  // Handle mouse movement for panel visibility after first interaction
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

  // Toggle video call
  const toggleCall = () => {
    setActiveCall(!activeCall);
  };

  // Add useEffect for client-side rendering
  useEffect(() => {
    setMounted(true);
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
        color="blue.300"
        p="1rem"
        borderLeft="2px solid"
        borderColor="blue.500"
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
        }}
      >
        {/* Mission Control Header */}
        <Box
          textAlign="center"
          mb="4"
          borderBottom="2px solid"
          borderColor="blue.500"
          pb="2"
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
                      {/* Placeholder for station feed - could be replaced with actual feed */}
                      <Box
                        w="100%"
                        h="100%"
                        position="relative"
                        overflow="hidden"
                      >
                        {/* This would be where you'd put a real video feed */}
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
                      {/* Placeholder for user feed */}
                      <Box
                        w="40px"
                        h="30px"
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
              {/* 80&apos;S MODE */}
              BTTF
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
          <Text fontSize="xs" fontFamily="mono" color="gray.500">
            MCP v1.0
          </Text>
        </Flex>
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
