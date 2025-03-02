import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Flex,
  Button,
  Text,
  Icon,
  Switch,
  FormControl,
  FormLabel,
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

const SidePanel = ({ onButtonClick, is80sMode, toggle80sMode }) => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true); // Start open
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
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

  // Letters for scramble effect
  const letters = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "0",
    "🜁",
    "β",
    "Σ",
    "λ",
    "π",
    "$",
    "∞",
    "Ð",
    "Θ",
    "Λ",
    "Ξ",
    "Π",
  ];

  // Add debounce timer state
  const [debounceTimer, setDebounceTimer] = useState(null);

  // Update panel width based on screen size
  const [panelWidth, setPanelWidth] = useState("25%");

  // Add new state for toggle modes
  const [monsterMode, setMonsterMode] = useState(false);

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
      if (!hasUserInteracted && !panelRef.current?.contains(e.target)) {
        setIsTextBoxVisible(false);
        setHasUserInteracted(true);
        document.removeEventListener("click", handleFirstClick);
      }
    };

    if (!hasUserInteracted) {
      document.addEventListener("click", handleFirstClick);
    }

    return () => {
      document.removeEventListener("click", handleFirstClick);
    };
  }, [hasUserInteracted]);

  // Handle mouse movement for panel visibility after first interaction
  useEffect(() => {
    if (isTouchDevice || !hasUserInteracted) return;

    const handleMouseMove = (event) => {
      const rightEdgeDistance = window.innerWidth - event.clientX;

      // Keep panel open if menu is open
      if (menuOpen) {
        setIsTextBoxVisible(true);
        return;
      }

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
          // Hide when mouse moves away, but only if menu is closed
          setIsTextBoxVisible(false);
        }
      }, 100); // 100ms debounce delay

      setDebounceTimer(timer);
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [
    hasUserInteracted,
    isTouchDevice,
    hotzoneSize,
    menuOpen,
    isTextBoxVisible,
    debounceTimer,
  ]);

  const handleButtonClick = (e) => {
    e.stopPropagation();

    // Simple toggle without complex animations
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
  const signIntoFirebaseWithClerk = async () => {
    try {
      const token = await getToken({ template: "integration_firebase" });
      if (!token) throw new Error("No Firebase token from Clerk.");

      const userCredentials = await signInWithCustomToken(auth, token || "");

      return userCredentials.user;
    } catch (error) {
      console.error("Error signing into Firebase:", error);
    }
  };

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
  }, [isLoaded, isSignedIn, user]);

  // Update panel width based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth <= 768) {
          setPanelWidth("85%");
        } else if (window.innerWidth <= 1024) {
          setPanelWidth("40%");
        } else {
          setPanelWidth("25%");
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

  // Toggle handlers for new modes
  const toggleMonsterMode = () => {
    setMonsterMode(!monsterMode);
    // Here you would add any side effects for enabling monster mode
    console.log("Monster mode:", !monsterMode);
  };

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

      {/* Main panel */}
      <Box
        ref={panelRef}
        position="fixed"
        top="0"
        right="0"
        width={panelWidth}
        height="100%"
        background="rgba(0, 0, 0, 0.8)"
        color="white"
        p="1.5rem 2rem"
        borderRadius="8px 0 0 8px"
        zIndex="5000"
        className={isTextBoxVisible ? "panel-visible" : "panel-hidden"}
        boxShadow="-5px 0 15px rgba(0, 0, 0, 0.3)"
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
        }}
      >
        {/* Panel toggle button */}
        <Button
          onClick={handleButtonClick}
          size="lg"
          background="rgba(0, 0, 0, 0.7)"
          position="absolute"
          color="white"
          top="50%"
          left="-30px"
          transform="translateY(-50%)"
          height="80px"
          width="30px"
          _hover={{ background: "rgba(0, 0, 0, 0.9)" }}
          boxShadow="0 0 10px rgba(0, 0, 0, 0.5)"
          borderRadius="4px 0 0 4px"
          display={isTouchDevice && !isTextBoxVisible ? "none" : "flex"}
          zIndex="5001"
          transition="background 0.3s ease"
        >
          {isTextBoxVisible ? "❯" : "❮"}
        </Button>

        {/* Header with toggle buttons and sign-in button */}
        <Flex
          justify="space-between"
          align="center"
          width="100%"
          marginBottom="2rem"
          position="relative"
        >
          {/* Toggle Buttons (left) */}
          <Flex
            direction="column"
            gap="0.75rem"
            ml="0.5rem"
            mt="0.5rem"
            minWidth="110px"
            maxWidth="130px"
          >
            <FormControl
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              size="sm"
            >
              <FormLabel
                htmlFor="eighties-mode"
                mb="0"
                fontSize="0.8rem"
                fontWeight="600"
                color={is80sMode ? "#ff71ce" : "#8e662b"}
                mr="0.5rem"
              >
                80&apos;s Mode
              </FormLabel>
              <Switch
                id="eighties-mode"
                size="sm"
                isChecked={is80sMode}
                onChange={toggle80sMode}
                colorScheme="pink"
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
            </FormControl>

            <FormControl
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              size="sm"
            >
              <FormLabel
                htmlFor="monster-mode"
                mb="0"
                fontSize="0.8rem"
                fontWeight="600"
                color={monsterMode ? "#01cdfe" : "#8e662b"}
                mr="0.5rem"
              >
                Monster Mode
              </FormLabel>
              <Switch
                id="monster-mode"
                size="sm"
                isChecked={monsterMode}
                onChange={toggleMonsterMode}
                colorScheme="cyan"
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
            </FormControl>
          </Flex>

          {/* Sign-in Button (right) */}
          <div
            id="sign-in-button"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "2.5rem",
              objectFit: "cover",
              border: "3px solid goldenrod",
              background: "#444",
              width: "3.5rem",
              height: "3.5rem",
              minWidth: "3.5rem",
              overflow: "hidden",
              marginLeft: "1.5rem",
              marginRight: "0.5rem",
            }}
          >
            <SignedIn>
              <SignOutButton redirectUrl={currentPath}>
                <UserButton afterSignOutUrl={currentPath} />
              </SignOutButton>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl={currentPath}>
                <Button style={{ fontSize: "2rem" }}>{emoji}</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </Flex>
        <h1
          style={{
            position: "relative",
            top: "0",
            fontSize: "4rem",
          }}
          className="thelma2"
        >
          The Moon Room
        </h1>
        <Text
          position="relative"
          marginTop="1rem"
          fontSize="1rem"
          marginBottom="1rem"
        >
          Lorem ipsum dolor sit amet, ea est mutat viris nostrud. Vix eros
          quodsi insolens ad, oblique recteque ex sit. Vim no clita suavitate
          necessitatibus, impetus vocibus invenire his id.
        </Text>

        <Flex
          position="relative"
          top="0"
          width="100%"
          justifyContent="center"
          alignItems="center"
          direction="column"
          marginBottom="5rem"
        >
          <Link href="#">
            <button
              style={{
                color: "#1b1724",
                transform: "skew(-10deg)",
                width: "7rem",
                marginBottom: "0.5rem",
              }}
              className="shimmer-button"
              data-shimmer-index="1"
            >
              Buy RL80<span className="shimmer"></span>
            </button>
            {/* <RadioButton2 text="Buy RL80" link="https://example.com/" /> */}
          </Link>
          <Link href="#">
            <button
              style={{
                color: "#1b1724",
                transform: "skew(-10deg)",
                width: "7rem",
                marginBottom: "0.5rem",
              }}
              className="shimmer-button"
              data-shimmer-index="2"
            >
              Stake RL80<span className="shimmer"></span>
            </button>
            {/* <RadioButton2 text="Buy RL80" link="https://example.com/" /> */}
          </Link>
          <Link href="#">
            <button
              style={{
                color: "#1b1724",
                transform: "skew(-10deg)",
                width: "7rem",
                marginBottom: "0.5rem",
              }}
              className="shimmer-button"
              data-shimmer-index="3"
            >
              Burn Pi80<span className="shimmer"></span>
            </button>
            {/* <RadioButton2 text="Buy RL80" link="https://example.com/" /> */}
          </Link>
          {/* <AnimatedRadioButtons onButtonClick={onButtonClick} /> */}

          {/* Door icon for main landing page */}
          <Box
            as="button"
            mt="2rem"
            width="60px"
            height="60px"
            borderRadius="50%"
            background="rgba(0, 0, 0, 0.7)"
            color="white"
            fontSize="28px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            boxShadow="0 0 10px 2px rgba(186, 85, 211, 0.8), 0 0 25px 5px rgba(255, 105, 180, 0.6), 0 0 60px 15px rgba(186, 85, 211, 0.4)"
            onClick={() => router.push("/home")}
            transition="all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)"
            _hover={{
              background: "rgba(0, 0, 0, 0.9)",
              transform: "scale(1.1)",
              boxShadow:
                "0 0 15px 5px rgba(186, 85, 211, 0.9), 0 0 30px 8px rgba(255, 105, 180, 0.8), 0 0 70px 20px rgba(186, 85, 211, 0.6)",
            }}
            _active={{
              transform: "scale(0.95)",
              boxShadow: "0 0 20px 6px rgba(255, 105, 180, 1)",
            }}
            cursor="pointer"
            sx={{
              "@keyframes springIn": {
                "0%": { transform: "scale(0)" },
                "60%": { transform: "scale(1.1)" },
                "80%": { transform: "scale(0.95)" },
                "100%": { transform: "scale(1)" },
              },
              animation: "springIn 0.5s ease-out forwards",
              position: "relative",
              "&::before": {
                content: '""',
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                backgroundColor: "#24252c",
                backgroundImage:
                  "repeating-linear-gradient(0deg, #181a29, #181a29 1px, #202436 1px, #202436 2px)",
                zIndex: -1,
              },
              "&:hover::before": {
                backgroundColor: "#9400D3",
                backgroundImage:
                  "repeating-linear-gradient(45deg, #9400D3, #FF69B4 10px, #9400D3 20px)",
              },
            }}
          >
            <span style={{ fontSize: "2rem" }}> 🚪</span>
          </Box>
        </Flex>
      </Box>

      {/* Keep the burger menu for now, but we'll hide it since we're using the circular menu */}
      <div
        ref={menuNode}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: "auto",
          zIndex: "5002",
          opacity: 0, // Hide the old menu
          pointerEvents: "none", // Disable interaction with old menu
          transition: "opacity 0.4s ease-out",
        }}
      >
        <Menu
          isOpen={menuOpen}
          onStateChange={({ isOpen }) => setMenuOpen(isOpen)}
          width={menuWidth}
          right
          className="header-two"
          styles={{
            bmMenu: {
              textAlign: "center",
              background: "rgba(0, 0, 0, 0.9)",
              padding: "2.5em 1.5em 0",
              borderLeft: "1px solid rgba(142, 102, 43, 0.5)",
              transition: "all 0.4s ease-out",
            },
            bmMenuWrap: {
              textAlign: "center",
              position: "fixed",
              height: "100%",
              right: 0,
              left: "auto",
              transition: "all 0.4s ease-out",
            },
            bmItem: {
              display: "inline-block",
              textAlign: "center",
              padding: "0.8em",
              color: "white",
              textDecoration: "none",
              fontSize: "1.5rem",
            },
            bmItemList: {
              textAlign: "center",
              padding: "0.8em",
            },
            bmOverlay: {
              background: "rgba(0, 0, 0, 0.3)",
              transition: "opacity 0.4s ease-out",
            },
            bmBurgerButton: {
              display: "none", // Hide the default burger button
            },
          }}
        >
          <Link
            href="/home"
            className="menu-item"
            onClick={() => setMenuOpen(false)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-value="Home"
          >
            Home
          </Link>
          <Link
            href="/thesis"
            className="menu-item"
            onClick={() => setMenuOpen(false)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-value="Unorthodoxy"
          >
            Unorthodoxy
          </Link>
          <Link
            href="/numerology"
            className="menu-item"
            onClick={() => setMenuOpen(false)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-value="Numerology"
          >
            Numerology
          </Link>
          <Link
            href="/gallery"
            className="menu-item"
            onClick={() => setMenuOpen(false)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-value="Moon Room"
          >
            Moon Room
          </Link>
          <Link
            href="/communion"
            className="menu-item"
            onClick={() => setMenuOpen(false)}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            data-value="RL80 Faire"
          >
            RL80 Faire
          </Link>
        </Menu>
      </div>
    </>
  );
};

export default SidePanel;
