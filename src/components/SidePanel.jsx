import React, { useState, useEffect, useRef } from "react";
import { Box, Flex, Button, Text } from "@chakra-ui/react";
import AnimatedRadioButtons from "./3DVotiveStand/CyberButtons";
import Communion3 from "./Communion3";

const SidePanel = ({ onButtonClick }) => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true); // Start open
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const panelRef = useRef(null);
  const hotzoneSize = 20; // Size in pixels for the hotzone

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

      // Show panel when mouse is near right edge
      if (rightEdgeDistance < hotzoneSize) {
        setIsTextBoxVisible(true);
      } else if (rightEdgeDistance > 300) {
        // Hide when mouse moves away
        setIsTextBoxVisible(false);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [hasUserInteracted, isTouchDevice, hotzoneSize]);

  const handleButtonClick = (e) => {
    e.stopPropagation();
    setIsTextBoxVisible(!isTextBoxVisible);
    setHasUserInteracted(true);
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
        width="25%"
        height="100%"
        background="rgba(0, 0, 0, 0.8)"
        color="white"
        p="1rem"
        borderRadius="8px 0 0 8px"
        zIndex="5000"
        transform={isTextBoxVisible ? "translateX(0)" : "translateX(100%)"}
        transition="transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)"
        boxShadow="-5px 0 15px rgba(0, 0, 0, 0.3)"
        style={{ willChange: "transform" }}
      >
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
          boxShadow={
            isTextBoxVisible
              ? "0 0 10px rgba(0, 0, 0, 0.5)"
              : "0 0 15px rgba(255, 255, 255, 0.5)"
          }
          borderRadius="4px 0 0 4px"
          display={isTouchDevice && !isTextBoxVisible ? "none" : "flex"}
          zIndex="5001"
          transition="box-shadow 0.6s ease, background 0.3s ease, transform 0.3s ease"
          _active={{ transform: "translateY(-50%) scale(0.95)" }}
          animation={!isTextBoxVisible ? "glow 2s infinite" : "none"}
          sx={{
            "@keyframes glow": {
              "0%": { boxShadow: "0 0 5px rgba(255, 255, 255, 0.3)" },
              "50%": { boxShadow: "0 0 15px rgba(255, 255, 255, 0.7)" },
              "100%": { boxShadow: "0 0 5px rgba(255, 255, 255, 0.3)" },
            },
          }}
        >
          {isTextBoxVisible ? "❯" : "❮"}
        </Button>

        <Flex
          justify="space-between"
          align="right"
          position="relative"
          top="10%"
          opacity={isTextBoxVisible ? 1 : 0}
          transform={isTextBoxVisible ? "translateX(0)" : "translateX(20px)"}
          transition="opacity 0.6s ease, transform 0.6s ease"
          transitionDelay="0.1s"
        >
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

        <Text
          position="relative"
          top="9%"
          marginTop="1rem"
          fontSize="1rem"
          marginBottom="1rem"
          opacity={isTextBoxVisible ? 1 : 0}
          transform={isTextBoxVisible ? "translateX(0)" : "translateX(20px)"}
          transition="opacity 0.6s ease, transform 0.6s ease"
          transitionDelay="0.2s"
        >
          Lorem ipsum dolor sit amet, ea est mutat viris nostrud. Vix eros
          quodsi insolens ad, oblique recteque ex sit. Vim no clita suavitate
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
          opacity={isTextBoxVisible ? 1 : 0}
          transform={isTextBoxVisible ? "translateX(0)" : "translateX(20px)"}
          transition="opacity 0.6s ease, transform 0.6s ease"
          transitionDelay="0.3s"
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
          opacity={isTextBoxVisible ? 1 : 0}
          transition="opacity 0.6s ease"
          transitionDelay="0.4s"
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
    </>
  );
};

export default SidePanel;
