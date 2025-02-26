import React, { useState, useEffect, useRef } from "react";
import { Box, Flex, Button, Text } from "@chakra-ui/react";
import AnimatedRadioButtons from "./3DVotiveStand/CyberButtons";
import Communion3 from "./Communion3";

const SidePanel = ({ onButtonClick }) => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true); // Start open
  const buttonWidth = "3rem";
  const hotzoneSize = "20px";
  const panelRef = useRef(null);

  const handlePanelClick = (e) => {
    e.stopPropagation();
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    setIsTextBoxVisible(!isTextBoxVisible);
  };

  // Handle mouse movement for panel visibility
  useEffect(() => {
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
  }, []);

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
          background="transparent"
          position="absolute"
          color="white"
          top="-"
          left={`-${buttonWidth}`}
          width={buttonWidth}
          height="4rem"
          _hover={{ background: "rgba(255, 255, 255, 0.2)" }}
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
