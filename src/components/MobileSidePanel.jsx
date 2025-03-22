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
      {/* Make FAB button slightly smaller */}
      <Button
        position="fixed"
        bottom="15px"
        right="15px"
        width="50px"
        height="50px"
        borderRadius="full"
        backgroundColor="rgba(0, 0, 0, 0.8)"
        color="white"
        zIndex="1000"
        onClick={onOpen}
        boxShadow="0 0 10px rgba(255, 255, 255, 0.2)"
        _hover={{
          backgroundColor: "rgba(0, 0, 0, 0.9)",
          transform: "scale(1.1)",
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
        <DrawerOverlay />
        <DrawerContent
          backgroundColor="rgba(0, 0, 0, 0.95)"
          borderTopRadius="20px"
          maxHeight="75vh"
        >
          <DrawerCloseButton
            color="white"
            onClick={handleCloseClick}
            size="lg"
            top="8px"
            right="8px"
            backgroundColor="rgba(20, 20, 20, 0.5)"
            padding="8px"
            _hover={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              transform: "scale(1.1)",
            }}
            zIndex="2000"
          />
          <DrawerHeader
            color="white"
            textAlign="center"
            className="thelma1"
            mt={6}
            mb={4}
            style={{ fontSize: "2rem", py: 2 }}
          >
            The Moon Room
          </DrawerHeader>

          <DrawerBody>
            <VStack spacing={4} width="100%" p={2}>
              {/* Add an additional close button at the top */}
              {/* <Box width="100%" display="flex" justifyContent="flex-end" mb={0}>
                <Button
                  size="sm"
                  variant="ghost"
                  color="white"
                  onClick={handleCloseClick}
                  _hover={{ backgroundColor: "rgba(255, 255, 255, 0.1)" }}
                >
                  Close
                </Button>
              </Box> */}

              {/* User Profile Section - made more compact */}
              {/* <Box width="100%" display="flex" justifyContent="center" mb={2}>
                  id="sign-in-button"
                 <div
                 style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    fontSize: "2rem",
                    border: "3px solid goldenrod",
                    background: "#444",
                    width: "3rem",
                    height: "3rem",
                    minWidth: "3rem",
                    overflow: "hidden",
                    marginLeft: "1rem",
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
                      <Button
                        style={{
                          fontSize: "2rem",
                          position: "relative",
                          top: "0",
                        }}
                      >
                        {emoji}
                      </Button>
                    </SignInButton>
                  </SignedOut>
                </div>
              </Box> */}

              {/* Mode Toggles - updated to match Music Player styling */}
              <VStack width="100%" spacing={2}>
                {/* Updated FormControl for mode buttons */}
                <FormControl
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={2}
                >
                  <FormLabel
                    color={
                      is80sMode || monsterMode
                        ? is80sMode
                          ? "#ff71ce"
                          : "#01cdfe"
                        : "#8e662b"
                    }
                    mb="0"
                    fontWeight={is80sMode || monsterMode ? "bold" : "normal"}
                  >
                    Mode
                  </FormLabel>
                  <Flex>
                    <Button
                      size="sm"
                      mr={2}
                      colorScheme={is80sMode ? "pink" : "gray"}
                      variant={is80sMode ? "solid" : "outline"}
                      onClick={handle80sModeToggle}
                      boxShadow={is80sMode ? "0 0 10px #ff71ce" : "none"}
                      color={is80sMode ? "white" : "#8e662b"}
                      _hover={{
                        opacity: 0.9,
                        transform: "scale(1.05)",
                      }}
                    >
                      80's
                    </Button>
                    <Button
                      size="sm"
                      colorScheme={monsterMode ? "cyan" : "gray"}
                      variant={monsterMode ? "solid" : "outline"}
                      onClick={handleMonsterModeToggle}
                      boxShadow={monsterMode ? "0 0 10px #01cdfe" : "none"}
                      color={monsterMode ? "white" : "#8e662b"}
                      _hover={{
                        opacity: 0.9,
                        transform: "scale(1.05)",
                      }}
                    >
                      Mission
                    </Button>
                  </Flex>
                </FormControl>

                {/* Music Player Toggle - no changes needed here */}
                <FormControl
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={2}
                >
                  <FormLabel
                    color={showSpotify ? "#f0c000" : "#8e662b"}
                    mb="0"
                    fontWeight={showSpotify ? "bold" : "normal"}
                  >
                    Music Player
                  </FormLabel>
                  <Button
                    size="sm"
                    colorScheme={showSpotify ? "yellow" : "gray"}
                    variant={showSpotify ? "solid" : "outline"}
                    onClick={handleMusicToggle}
                    boxShadow={showSpotify ? "0 0 10px #f0c000" : "none"}
                    color={showSpotify ? "black" : "#8e662b"} // Make text visible when off
                  >
                    {showSpotify ? "On" : "Off"}
                  </Button>
                </FormControl>
              </VStack>

              {/* Action Buttons - reduced spacing and size */}
              <VStack width="100%" spacing={2} mt={2}>
                <button
                  style={{
                    color: "#1b1724",
                    transform: "skew(-10deg)",
                    width: "6rem",
                    marginBottom: "0.5rem",
                  }}
                  className="shimmer-button"
                  data-shimmer-index="1"
                >
                  Buy<span className="shimmer"></span>
                </button>
                <button
                  style={{
                    color: "#1b1724",
                    transform: "skew(-10deg)",
                    width: "6rem",
                    marginBottom: "0.5rem",
                  }}
                  className="shimmer-button"
                  data-shimmer-index="2"
                >
                  Earn<span className="shimmer"></span>
                </button>
                <button
                  style={{
                    color: "#1b1724",
                    transform: "skew(-10deg)",
                    width: "6rem",
                    marginBottom: "0.5rem",
                  }}
                  className="shimmer-button"
                  data-shimmer-index="3"
                >
                  Redeem<span className="shimmer"></span>
                </button>
              </VStack>

              {/* Home Button with updated shadow styling */}
              <Box
                as="button"
                mt="1rem"
                width="50px"
                height="50px"
                borderRadius="50%"
                background="rgba(0, 0, 0, 0.7)"
                color="white"
                fontSize="28px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                onClick={() => router.push("/home")}
                transition="all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)"
                _hover={{
                  background: "rgba(0, 0, 0, 0.9)",
                  transform: "scale(1.1)",
                }}
                _active={{
                  transform: "scale(0.95)",
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
                  boxShadow:
                    "0 0 5px #fff, 0 0 10px #fff, 0 0 15px #8e662b, 0 0 20px turquoise, 0 0 25px turquoise, 2px 2px 3px rgba(0, 0, 0, 0.5)",
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
                  "&:hover": {
                    boxShadow:
                      "0 0 10px #fff, 0 0 15px #fff, 0 0 20px #8e662b, 0 0 25px turquoise, 0 0 30px turquoise, 3px 3px 5px rgba(0, 0, 0, 0.7)",
                  },
                }}
              >
                <span
                  style={{
                    fontSize: "1.75rem",
                    // textShadow:
                    //   "0 0 5px #fff, 0 0 10px #fff, 0 0 15px #8e662b, 0 0 20px turquoise, 0 0 25px turquoise, 2px 2px 3px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  🚪
                </span>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileSidePanel;
