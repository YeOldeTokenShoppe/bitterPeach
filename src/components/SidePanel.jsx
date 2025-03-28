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
  const [sitepalLoaded, setSitepalLoaded] = useState(false); // New state for Sitepal
  const sitepalContainerRef = useRef(null); // New ref for Sitepal container
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

  // Detect touch devices
  useEffect(() => {
    const isTouchCapable =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(isTouchCapable);
  }, []);

  // Handle first click to close panel and mark user interaction
  // Replace the problematic useEffect with this improved version
  useEffect(() => {
    // Only set up click handler if panel is visible
    if (!isTextBoxVisible) return;

    const handleOutsideClick = (e) => {
      // Don't close if clicking inside the panel
      if (panelRef.current && panelRef.current.contains(e.target)) {
        return;
      }

      // Only close panel and mark user interaction if clicking outside
      setIsTextBoxVisible(false);
      setHasUserInteracted(true);
    };

    // Add click listener to document
    document.addEventListener("click", handleOutsideClick);

    // Clean up listener when component unmounts or dependencies change
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isTextBoxVisible]); // Re-run effect when panel visibility changes
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

  // Updated toggle call function that works with SitePal's elements
  // Update the toggleCall function to ensure event propagation is stopped
  const toggleCall = (e) => {
    // Always stop propagation when the button is clicked
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!activeCall) {
      // Request microphone permissions immediately when connecting
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Stop the stream immediately - we just needed the permission
          stream.getTracks().forEach((track) => track.stop());

          // Start connection sequence after permissions granted
          setActiveCall(true);
          setConnectionPhase(1);
          setIsMuted(true);
          setSitepalLoadingStage(1);

          setTimeout(() => setConnectionPhase(2), 1200);
          setTimeout(() => setConnectionPhase(3), 3000);
          setTimeout(() => {
            setConnectionPhase(4);
            // Pre-initialize SitePal's audio system
            simulateUserInteraction();
          }, 4500);
        })
        .catch((err) => {
          console.error("Microphone permission error:", err);
          alert("Please allow microphone access to chat with the avatar");
        });
    } else if (activeCall && connectionPhase === 4 && isMuted) {
      // Now when unmuting, we can proceed directly since permissions are already granted
      console.log("Setting muted state to false");
      setIsMuted(false);

      // Ensure SitePal is properly activated
      simulateUserInteraction();

      // Create the floating button if needed
      if (!window.initialUnmuteAttempted) {
        window.initialUnmuteAttempted = true;
        // ... rest of the floating button code ...
      }
    } else {
      // End call
      setActiveCall(false);
      setConnectionPhase(0);
      setSitepalLoadingStage(0);
      setSitepalLoaded(false);
      setIsMuted(true);
    }
  };

  // Update the call button to ensure it stops propagation
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
    onClick={(e) => {
      e.stopPropagation(); // Make sure click doesn't bubble up
      toggleCall(e);
    }}
    size="xs"
    position="relative"
  >
    {!activeCall
      ? "CONNECT"
      : isMuted && connectionPhase === 4
      ? "UN-MUTE"
      : "END CALL"}
  </Button>;

  // Also update the microphone button that appears when connected
  {
    connectionPhase === 4 && (
      <Button
        position="absolute"
        bottom="2"
        right="2"
        size="xs"
        colorScheme="green"
        borderRadius="full"
        width="40px"
        height="40px"
        opacity="0.7"
        _hover={{ opacity: "1" }}
        zIndex="1999" // Just below the SitePal container
        onClick={(e) => {
          e.stopPropagation(); // Make sure click doesn't bubble up
          toggleCall(e);
        }}
      >
        🎤
      </Button>
    );
  }
  // Add useEffect for client-side rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update the useEffect for initialization
  useEffect(() => {
    // First check if we're in a browser environment
    setIsBrowser(typeof window !== "undefined");
  }, []);

  useEffect(() => {
    if (
      isBrowser &&
      mounted &&
      activeCall &&
      sitepalContainerRef.current &&
      connectionPhase === 4
    ) {
      console.log("Initializing SitePal with direct DOM manipulation");

      // Clear container first
      sitepalContainerRef.current.innerHTML = "";

      // Create the required div element
      const aiPlayerDiv = document.createElement("div");
      aiPlayerDiv.id = "vhss_aiPlayer";
      sitepalContainerRef.current.appendChild(aiPlayerDiv);

      // Load the SitePal embed function
      const script = document.createElement("script");
      script.src = "//vhss-d.oddcast.com/ai_embed_functions_v1.php";
      script.async = true;
      script.onload = function () {
        try {
          // Add a hook to intercept SitePal's initialization
          window.AI_vhost_original = window.AI_vhost_embed;
          window.AI_vhost_embed = function (...args) {
            console.log("SitePal embed function called with args:", args);

            // Call the original function
            window.AI_vhost_original(...args);

            // After SitePal loads, add our own hooks
            setTimeout(() => {
              // Find all SitePal functions and log them
              for (const key in window) {
                if (
                  typeof window[key] === "function" &&
                  (key.includes("vhss") ||
                    key.includes("AI") ||
                    key.includes("VHOST"))
                ) {
                  console.log("Found SitePal function:", key);
                }
              }

              // Create our own global controls
              window.startSitePalListening = function () {
                return simulateUserInteraction();
              };
            }, 2000);
          };

          // Call the SitePal embed function with the right parameters
          window.AI_vhost_embed(800, 600, 9157686, 244, 0, 0);

          // Create a direct overlay for SitePal
          setTimeout(() => {
            const container = document.getElementById("vhssPreEmbedContainer");
            if (container) {
              // Position the container correctly
              container.style.position = "absolute";
              container.style.top = "0";
              container.style.left = "0";
              container.style.width = "100%";
              container.style.height = "100%";
              container.style.background = "transparent";
              container.style.zIndex = "2000";

              // Create a global click handler that will watch for clicks on our unmute button
              window.addEventListener("unmuteSitepal", function () {
                console.log(
                  "Unmute event detected, searching for SitePal elements"
                );

                // Try multiple methods to click the SitePal listening button

                // Method 1: Find and click buttons directly in the main document
                const tryDirectClick = () => {
                  const elements = [
                    document.querySelector(".ai-listening-button"),
                    document.querySelector(".vhss-ai-button"),
                    document.querySelector(".vhss-aiplayer-aiform-mic"),
                    document.querySelector("#vhss-aiplayer-status"),
                    // Try finding elements by title
                    document.querySelector(
                      '[title="Click to start listening"]'
                    ),
                    document.querySelector('[title*="listen"]'),
                    // Try CSS selectors that might match
                    document.querySelector('img[src*="btn_listening"]'),
                  ];

                  for (const el of elements) {
                    if (el) {
                      console.log("Found element, clicking:", el);
                      el.click();
                      return true;
                    }
                  }
                  return false;
                };

                // Method 2: Search within all iframes
                const tryFrameClick = () => {
                  const iframes = document.querySelectorAll("iframe");
                  for (const iframe of iframes) {
                    try {
                      const iframeDoc =
                        iframe.contentDocument || iframe.contentWindow.document;
                      const elements = [
                        iframeDoc.querySelector(".ai-listening-button"),
                        iframeDoc.querySelector(".vhss-ai-button"),
                        iframeDoc.querySelector(".vhss-aiplayer-aiform-mic"),
                        iframeDoc.querySelector("#vhss-aiplayer-status"),
                        iframeDoc.querySelector(
                          '[title="Click to start listening"]'
                        ),
                        iframeDoc.querySelector('img[src*="btn_listening"]'),
                      ];

                      for (const el of elements) {
                        if (el) {
                          console.log("Found element in iframe, clicking:", el);
                          el.click();
                          return true;
                        }
                      }

                      // If specific elements not found, try clicking anywhere that might be relevant
                      const allImgs = iframeDoc.querySelectorAll("img");
                      for (const img of allImgs) {
                        if (
                          img.src &&
                          img.src.toLowerCase().includes("listen")
                        ) {
                          console.log("Found potential listening image:", img);
                          img.click();
                          return true;
                        }
                      }
                    } catch (e) {
                      console.log(
                        "Could not access iframe due to cross-origin restrictions"
                      );
                    }
                  }
                  return false;
                };

                // Method 3: Create a click interceptor overlay
                const createClickInterceptor = () => {
                  // Find the SitePal container
                  const container = document.getElementById(
                    "vhssPreEmbedContainer"
                  );
                  if (!container) return false;

                  // Create a transparent overlay that will display for 1 second
                  const overlay = document.createElement("div");
                  overlay.style.position = "absolute";
                  overlay.style.left = "0";
                  overlay.style.top = "0";
                  overlay.style.width = "100%";
                  overlay.style.height = "100%";
                  overlay.style.backgroundColor = "rgba(255,0,0,0.1)";
                  overlay.style.zIndex = "9999";
                  overlay.style.cursor = "pointer";

                  // Add it to the document
                  container.appendChild(overlay);

                  // Create an array of potential click positions
                  const positions = [
                    { x: 50, y: 50 }, // Center
                    { x: 80, y: 20 }, // Top right
                    { x: 20, y: 20 }, // Top left
                    { x: 80, y: 80 }, // Bottom right
                    { x: 20, y: 80 }, // Bottom left
                  ];

                  // Click at each position
                  positions.forEach((pos, index) => {
                    setTimeout(() => {
                      const clickX = container.offsetWidth * (pos.x / 100);
                      const clickY = container.offsetHeight * (pos.y / 100);

                      // Create and dispatch a click event
                      const clickEvent = new MouseEvent("click", {
                        bubbles: true,
                        cancelable: true,
                        view: window,
                        clientX: container.offsetLeft + clickX,
                        clientY: container.offsetTop + clickY,
                      });

                      // Dispatch the event directly on the container
                      container.dispatchEvent(clickEvent);

                      console.log(`Clicked at position: ${pos.x}%, ${pos.y}%`);

                      // Change overlay color briefly to show where clicked
                      overlay.style.backgroundColor = "rgba(0,255,0,0.2)";
                      setTimeout(() => {
                        overlay.style.backgroundColor = "rgba(255,0,0,0.1)";
                      }, 100);

                      // Remove overlay after last click
                      if (index === positions.length - 1) {
                        setTimeout(() => {
                          overlay.remove();
                        }, 200);
                      }
                    }, index * 200);
                  });

                  return true;
                };

                // Try direct click first
                if (!tryDirectClick()) {
                  // If that fails, try iframe approach
                  if (!tryFrameClick()) {
                    // As a last resort, try click interceptor
                    createClickInterceptor();
                  }
                }
              });

              setSitepalLoaded(true);
            }
          }, 1000);
        } catch (e) {
          console.error("Error initializing SitePal:", e);
        }
      };

      document.body.appendChild(script);

      return () => {
        // Cleanup
        if (!activeCall) {
          if (sitepalContainerRef.current) {
            sitepalContainerRef.current.innerHTML = "";
          }

          const container = document.getElementById("vhssPreEmbedContainer");
          if (container) container.remove();

          document
            .querySelectorAll('script[src*="oddcast.com"]')
            .forEach((s) => s.remove());

          setSitepalLoaded(false);
        }
      };
    }
  }, [isBrowser, mounted, activeCall, connectionPhase]);

  // Add a separate effect to trigger loading when connection phase is complete
  useEffect(() => {
    if (
      connectionPhase === 4 &&
      activeCall &&
      typeof window.loadSitePal === "function"
    ) {
      // When connection effects are complete, load the SitePal scene
      setTimeout(() => {
        try {
          window.loadSitePal();
          setSitepalLoaded(true);
        } catch (e) {
          console.error("Error loading SitePal:", e);
          setSitepalLoaded(true); // Still mark as loaded to avoid hanging
        }
      }, 500);
    }
  }, [connectionPhase, activeCall]);

  // Add a new effect to set up the SitePal button integration
  useEffect(() => {
    if (connectionPhase === 4 && activeCall && isMuted) {
      // When SitePal is loaded and active, establish the connection between our UI and SitePal
      const setupSitePalButtonIntegration = () => {
        try {
          // Find the SitePal listening button
          const sitePalButton = document.querySelector(".vhss-ai-button");

          if (sitePalButton) {
            console.log("Found SitePal button, setting up integration");

            // Create a MutationObserver to watch for changes to the SitePal interface
            const observer = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                if (
                  mutation.type === "attributes" ||
                  mutation.type === "childList"
                ) {
                  // Check if any of the SitePal images have been displayed
                  const activeListeningButton = document.querySelector(
                    '.ai-active-listening-button[style*="display: block"]'
                  );
                  if (activeListeningButton) {
                    console.log("SitePal is actively listening");
                    setIsMuted(false);
                  }

                  // Check if the not-listening button is shown again
                  const notListeningButton = document.querySelector(
                    '.ai-not-listening-button[style*="display: block"]'
                  );
                  if (notListeningButton) {
                    console.log("SitePal stopped listening");
                    setIsMuted(true);
                  }
                }
              }
            });

            // Start observing the SitePal button
            observer.observe(sitePalButton, {
              attributes: true,
              childList: true,
              subtree: true,
            });

            // Store the observer for cleanup
            window.sitePalObserver = observer;

            // Also hook into our proxy button
            const proxyButton = document.querySelector(".vhss-ai-button-proxy");
            if (proxyButton) {
              // Replace the click handler with one that directly triggers the SitePal button
              proxyButton.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Forward the click to the actual SitePal button
                sitePalButton.click();

                return false;
              });
            }
          }
        } catch (error) {
          console.error("Error setting up SitePal button integration:", error);
        }
      };

      // Attempt to set up integration immediately
      setupSitePalButtonIntegration();

      // Also set up a retry mechanism since SitePal loads asynchronously
      const integrationInterval = setInterval(() => {
        const sitePalButton = document.querySelector(".vhss-ai-button");
        if (sitePalButton) {
          setupSitePalButtonIntegration();
          clearInterval(integrationInterval);
        }
      }, 500);

      // Clean up interval if component unmounts
      return () => {
        clearInterval(integrationInterval);
        if (window.sitePalObserver) {
          window.sitePalObserver.disconnect();
          delete window.sitePalObserver;
        }
      };
    }
  }, [connectionPhase, activeCall, isMuted]);

  // Add this function at the top level of your component
  const simulateUserInteraction = () => {
    console.log("Attempting to simulate user interaction with SitePal...");

    // Track whether we've found the button
    let buttonFound = false;

    // 1. Try to access the SitePal via the iframe directly with keyboard events
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      try {
        // Try to send a key event to the iframe
        console.log("Sending keyboard events to iframe...");

        // Send a Tab key to try to focus on any interactive elements
        const keyEvent = new KeyboardEvent("keydown", {
          key: "Tab",
          code: "Tab",
          keyCode: 9,
          which: 9,
          bubbles: true,
          cancelable: true,
        });

        if (iframe.contentDocument) {
          iframe.contentDocument.dispatchEvent(keyEvent);

          // Then try to send a Space key to activate whatever got focused
          setTimeout(() => {
            const spaceEvent = new KeyboardEvent("keydown", {
              key: " ",
              code: "Space",
              keyCode: 32,
              which: 32,
              bubbles: true,
              cancelable: true,
            });
            iframe.contentDocument.dispatchEvent(spaceEvent);
          }, 100);
        }
      } catch (e) {
        console.log("Could not access iframe:", e);
      }
    });

    // 2. Try to find and click any element with specific text content related to listening
    const allElements = document.querySelectorAll("*");
    for (const el of allElements) {
      if (
        el.textContent &&
        (el.textContent.includes("listen") ||
          el.textContent.includes("Listen") ||
          el.textContent.includes("mic") ||
          el.textContent.includes("Mic"))
      ) {
        console.log("Found element with listening text:", el);
        el.click();
        buttonFound = true;
      }
    }

    // 3. Inject a direct click handler for SitePal
    const injectClickHandler = () => {
      // Try to find the container
      const container =
        document.getElementById("vhssPreEmbedContainer") ||
        document.querySelector('[id*="vhss"]') ||
        document.querySelector(".vhss_main_container");

      if (container) {
        console.log("Found SitePal container, injecting direct click handler");

        // Create a fullscreen clickable overlay
        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100%";
        overlay.style.height = "100%";
        overlay.style.zIndex = "9999";
        overlay.style.cursor = "pointer";
        overlay.style.backgroundColor = "rgba(0,0,0,0.1)";

        // Set a click handler that specifically calls SitePal functions
        overlay.addEventListener("click", function (e) {
          console.log(
            "Overlay clicked, attempting to access SitePal functions"
          );

          try {
            // Try to directly call known SitePal functions
            if (window.AI_callAI) {
              console.log("Calling AI_callAI function");
              window.AI_callAI();
              buttonFound = true;
            } else if (window.vhsshtml5_clickListenButton) {
              console.log("Calling vhsshtml5_clickListenButton function");
              window.vhsshtml5_clickListenButton();
              buttonFound = true;
            } else {
              // Look for any SitePal function that might help
              for (const key in window) {
                if (
                  typeof window[key] === "function" &&
                  (key.includes("listen") ||
                    key.includes("Listen") ||
                    key.includes("AI") ||
                    key.includes("vhss"))
                ) {
                  console.log("Found potential SitePal function:", key);
                  try {
                    window[key]();
                    buttonFound = true;
                  } catch (err) {
                    console.log(`Error calling ${key}:`, err);
                  }
                }
              }
            }
          } catch (err) {
            console.log("Error accessing SitePal functions:", err);
          }

          // Remove the overlay after click
          overlay.remove();
        });

        container.appendChild(overlay);

        // Auto-click after a short delay
        setTimeout(() => {
          overlay.click();
        }, 500);

        return true;
      }

      return false;
    };

    if (!buttonFound) {
      injectClickHandler();
    }

    // 4. As a last resort, try to find and modify SitePal internal state directly
    setTimeout(() => {
      if (!buttonFound) {
        console.log("Attempting to directly modify SitePal internal state...");

        // Look for any global variables that might control the listen state
        for (const key in window) {
          if (
            key.includes("vhss") ||
            key.includes("AI") ||
            key.includes("VHOST")
          ) {
            console.log("Found SitePal global:", key, window[key]);
          }
        }

        // Try to click on areas where the button might be
        const clickOnCoordinates = (element, x, y) => {
          if (!element) return;

          const rect = element.getBoundingClientRect();
          const clickX = rect.left + rect.width * (x / 100);
          const clickY = rect.top + rect.height * (y / 100);

          const clickEvent = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: clickX,
            clientY: clickY,
          });

          element.dispatchEvent(clickEvent);
          console.log(`Clicked at ${x}%,${y}% of element:`, element);
        };

        // Click on various parts of the container
        const containers = [
          document.getElementById("vhssPreEmbedContainer"),
          document.querySelector(".vhss_main_container"),
          document.querySelector('[id*="vhss"]'),
          ...document.querySelectorAll("iframe"),
        ];

        for (const container of containers) {
          if (container) {
            // Try clicking center and all corners
            clickOnCoordinates(container, 50, 50); // Center
            clickOnCoordinates(container, 20, 20); // Top left
            clickOnCoordinates(container, 80, 20); // Top right
            clickOnCoordinates(container, 20, 80); // Bottom left
            clickOnCoordinates(container, 80, 80); // Bottom right
          }
        }
      }
    }, 1000);

    return buttonFound;
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
          "& #vhssPreEmbedContainer": {
            position: "absolute !important",
            top: "0 !important",
            left: "0 !important",
            width: "100% !important",
            height: "100% !important",
            transform: "scale(1) !important",
            transformOrigin: "center center !important",
            background: "transparent !important",
            pointerEvents: "auto !important",
            zIndex: "5 !important",

            "& iframe": {
              width: "100%",
              height: "100%",
              border: "none",
              background: "transparent",
              zIndex: "5",
            },
          },
          // SitePal integration styles
          ".vhss-aiplayer-aiform-mic": {
            opacity: "1 !important",
            position: "fixed !important",
            top: "-1000px !important",
            left: "-1000px !important",
            width: "1px !important",
            height: "1px !important",
            overflow: "hidden !important",
            pointerEvents: "none !important",
            zIndex: "-1 !important",
          },

          // When our button is clicked, forward the click to SitePal's button
          ".vhss-ai-button-proxy": {
            cursor: "pointer",
            position: "relative",
          },

          // Make SitePal button accessible but invisible
          ".vhss-ai-button": {
            opacity: "1 !important",
            cursor: "pointer !important",
            zIndex: "3000 !important",
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
          <Flex align="center" justify="center" mb="1">
            <Text
              fontSize="xl"
              fontFamily="mono"
              letterSpacing="wider"
              color="blue.100"
            >
              MISSION CONTROL
            </Text>
          </Flex>
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

                        {/* Replace the old video with Sitepal integration */}
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          width="100%"
                          height="100%"
                          objectFit="cover"
                          zIndex="1"
                          ref={sitepalContainerRef}
                          sx={{
                            filter:
                              connectionPhase < 4
                                ? connectionPhase === 1
                                  ? "brightness(0.4) contrast(1.5) hue-rotate(10deg)"
                                  : connectionPhase === 2
                                  ? "brightness(0.6) contrast(1.3) hue-rotate(5deg)"
                                  : connectionPhase === 3
                                  ? "brightness(0.8) contrast(1.1)"
                                  : "none"
                                : "none",
                            animation:
                              connectionPhase < 4
                                ? connectionPhase === 1
                                  ? "glitch 0.3s infinite"
                                  : connectionPhase === 2
                                  ? "glitch 0.6s infinite"
                                  : connectionPhase === 3
                                  ? "glitch 1.2s infinite"
                                  : "none"
                                : "none",
                            transition: "filter 0.5s ease",
                            "@keyframes glitch": {
                              "0%": { transform: "translate(0)" },
                              "20%": { transform: "translate(-2px, 2px)" },
                              "40%": { transform: "translate(-2px, -2px)" },
                              "60%": { transform: "translate(2px, 2px)" },
                              "80%": { transform: "translate(2px, -2px)" },
                              "100%": { transform: "translate(0)" },
                            },
                            "& iframe": {
                              width: "100%",
                              height: "100%",
                              border: "none",
                              overflow: "hidden",
                            },
                          }}
                        />

                        {/* Scanlines overlay */}
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          width="100%"
                          height="100%"
                          zIndex="3"
                          opacity={
                            connectionPhase < 4
                              ? connectionPhase === 1
                                ? 0.8
                                : connectionPhase === 2
                                ? 0.6
                                : connectionPhase === 3
                                ? 0.3
                                : 0
                              : 0
                          }
                          transition="opacity 0.8s ease"
                          sx={{
                            background:
                              "linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.25) 50%)",
                            backgroundSize: "100% 4px",
                            pointerEvents: "none",
                          }}
                        />

                        {/* Connection status text - changes with phases */}
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

                        {/* Intermittent signal loss effect */}
                        {connectionPhase === 2 && (
                          <Box
                            position="absolute"
                            top="0"
                            left="0"
                            width="100%"
                            height="100%"
                            zIndex="5"
                            bg="black"
                            opacity="0"
                            animation="signalLoss 3s infinite"
                            sx={{
                              "@keyframes signalLoss": {
                                "0%": { opacity: 0 },
                                "5%": { opacity: 0.8 },
                                "7%": { opacity: 0 },
                                "30%": { opacity: 0 },
                                "32%": { opacity: 0.6 },
                                "33%": { opacity: 0 },
                                "80%": { opacity: 0 },
                                "82%": { opacity: 0.7 },
                                "83%": { opacity: 0 },
                                "100%": { opacity: 0 },
                              },
                            }}
                          />
                        )}

                        {/* Color distortion effect */}
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          width="100%"
                          height="100%"
                          zIndex="3"
                          opacity={connectionPhase < 3 ? 0.15 : 0}
                          transition="opacity 0.8s ease"
                          mixBlendMode="color"
                          bg="red.500"
                          animation={
                            connectionPhase < 3
                              ? "colorShift 4s infinite"
                              : "none"
                          }
                          sx={{
                            "@keyframes colorShift": {
                              "0%": { backgroundColor: "red.500" },
                              "33%": { backgroundColor: "blue.500" },
                              "66%": { backgroundColor: "green.500" },
                              "100%": { backgroundColor: "red.500" },
                            },
                          }}
                        />

                        {/* Add a visual audio indicator when connection is established */}
                        {connectionPhase === 4 && (
                          <Box
                            position="absolute"
                            top="2"
                            right="2"
                            zIndex="10"
                            px="2"
                            py="1"
                            borderRadius="md"
                            bg="rgba(0,0,0,0.6)"
                            color="green.400"
                            fontSize="xs"
                            fontFamily="mono"
                            display="flex"
                            alignItems="center"
                          >
                            <Box
                              as="span"
                              mr="1"
                              animation="audioWave 1.5s infinite"
                              display="inline-block"
                              sx={{
                                "@keyframes audioWave": {
                                  "0%": { opacity: 0.4 },
                                  "50%": { opacity: 1 },
                                  "100%": { opacity: 0.4 },
                                },
                              }}
                            >
                              🔊
                            </Box>
                            AUDIO
                          </Box>
                        )}
                      </Box>
                    </Flex>
                    {connectionPhase === 4 && (
                      <Button
                        position="absolute"
                        bottom="2"
                        right="2"
                        size="xs"
                        colorScheme="green"
                        borderRadius="full"
                        width="40px"
                        height="40px"
                        opacity="0.7"
                        _hover={{ opacity: "1" }}
                        zIndex="1999" // Just below the SitePal container
                        onClick={toggleCall}
                      >
                        🎤
                      </Button>
                    )}
                    {/* User camera placeholder - updated to show Clerk avatar if available */}
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
                        w="40px"
                        h="30px"
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
                            width={40}
                            height={30}
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
                          <>
                            <Box
                              as="span"
                              fontSize="24px"
                              position="relative"
                              top="-1px"
                            >
                              😊
                            </Box>
                          </>
                        )}

                        {/* Overlay frame to give it a webcam look */}
                        <Box
                          position="absolute"
                          top="0"
                          left="0"
                          right="0"
                          bottom="0"
                          border="1px solid rgba(0,30,60,0.3)"
                          boxShadow="inset 0 0 5px rgba(0,0,0,0.5)"
                          pointerEvents="none"
                          zIndex="1"
                        />

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
              position="relative"
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
          <Image
            src="/favicon.svg"
            width={24}
            height={24}
            alt="Mission Logo"
            mr="2"
          />
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
