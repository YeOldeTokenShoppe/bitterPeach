import React, { useState, useEffect, useRef } from "react";
import { Box, Flex, Button, Text, useMediaQuery } from "@chakra-ui/react";
import AnimatedRadioButtons from "./3DVotiveStand/CyberButtons";
import Communion3 from "./Communion3";

const SidePanel = ({ onButtonClick }) => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true); // Start open
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const buttonWidth = "3rem";
  const hotzoneSize = "20px";
  const panelRef = useRef(null);

  // Detect touch devices
  useEffect(() => {
    const isTouchCapable =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(isTouchCapable);
  }, []);

  const handlePanelClick = (e) => {
    e.stopPropagation();
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    setIsTextBoxVisible(!isTextBoxVisible);
  };

  // Handle mouse movement for panel visibility (only for non-touch devices)
  useEffect(() => {
    if (isTouchDevice) return; // Skip for touch devices

    // Function to handle mouse movement near the edge
    const handleMouseMove = (event) => {
      // If mouse is near the right edge, show the panel
      if (event.clientX > window.innerWidth - 20) {
        setIsTextBoxVisible(true);
      }
    };

    // Function to handle mouse leaving the document
    const handleMouseLeave = () => {
      setIsTextBoxVisible(false);
    };

    // Add event listeners
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Clean up
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [isTouchDevice]);

  // Handle document clicks to close the panel
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // If click is outside the panel, close it
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsTextBoxVisible(false);
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <Box
      ref={panelRef}
      position="absolute"
      top="0"
      right={`-${buttonWidth}`}
      zIndex="5000"
      textAlign="right"
      width="25%"
      height="100%"
      background="rgba(0, 0, 0, 0.8)"
      color="white"
      p="1rem"
      borderRadius="8px"
      pointerEvents="auto"
      transform={
        isTextBoxVisible
          ? "translateX(0)"
          : `translateX(calc(100% + ${buttonWidth}))`
      }
      transition="transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.4s ease-in-out"
      onClick={handlePanelClick}
      cursor="pointer"
    >
      <Flex justify="space-between" align="right" position="relative" top="10%">
        <Button
          onClick={handleButtonClick}
          size="lg"
          background={
            isTouchDevice ? "rgba(255, 255, 255, 0.2)" : "transparent"
          }
          position="absolute"
          color="white"
          top="-"
          left={`-${buttonWidth}`}
          width={buttonWidth}
          height="4rem"
          _hover={{ background: "rgba(255, 255, 255, 0.2)" }}
          // Make button more visible on touch devices
          boxShadow={
            isTouchDevice ? "0 0 10px rgba(255, 255, 255, 0.5)" : "none"
          }
          // Always show the button on touch devices
          opacity={isTouchDevice || isTextBoxVisible ? 1 : 0.5}
          transition="opacity 0.3s ease, background 0.3s ease, box-shadow 0.3s ease"
        >
          {isTextBoxVisible ? "❯" : "❮"}
        </Button>

        <h1
          style={{
            position: "relative",
            top: "1rem",
            marginBottom: "2rem",
          }}
          className="thelma1"
        >
          The Moon Room
        </h1>
      </Flex>

      {/* Touch indicator for tablets/mobile */}
      {isTouchDevice && !isTextBoxVisible && (
        <Box
          position="fixed"
          right="0"
          top="50%"
          transform="translateY(-50%)"
          width="15px"
          height="100px"
          background="rgba(255, 255, 255, 0.3)"
          borderRadius="4px 0 0 4px"
          zIndex="5001"
          onClick={handleButtonClick}
          display={isTextBoxVisible ? "none" : "block"}
          animation="pulse 2s infinite"
          sx={{
            "@keyframes pulse": {
              "0%": { opacity: 0.3 },
              "50%": { opacity: 0.7 },
              "100%": { opacity: 0.3 },
            },
          }}
        />
      )}

      <Text
        position="relative"
        top="9%"
        marginTop="1rem"
        fontSize="1rem"
        marginBottom="1rem"
      >
        Lorem ipsum dolor sit amet, ea est mutat viris nostrud. Vix eros quodsi
        insolens ad, oblique recteque ex sit. Vim no clita suavitate
        necessitatibus, impetus vocibus invenire his id. Mei no dolor maiorum
        similique.
      </Text>

      <Flex
        position="relative"
        top="15%"
        width="100%"
        justifyContent="center"
        alignItems="center"
        direction="column"
      >
        <AnimatedRadioButtons onButtonClick={onButtonClick} />
      </Flex>

      <Box
        position="absolute"
        bottom="0"
        width="100%"
        display="flex"
        justifyContent="center"
        alignItems="center"
        color="white"
      >
        <Box
          display="flex"
          alignItems="center"
          width="100%"
          maxWidth="99%"
          transform="scale(0.4)"
          transformOrigin="center center"
        >
          {/* <Communion3 /> */}
        </Box>
      </Box>
    </Box>
  );
};

export default SidePanel;
