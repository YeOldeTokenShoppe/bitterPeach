import React, { useState, useEffect, useRef } from "react";
import { Box, Flex, Button, Text } from "@chakra-ui/react";
import AnimatedRadioButtons from "./3DVotiveStand/CyberButtons";
import Communion3 from "./Communion3";

const SidePanel = () => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true); // Open by default
  const panelRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Handle hover-based show/hide for desktop only
  useEffect(() => {
    if (isMobile) return;

    const handleMouseEnter = () => setIsTextBoxVisible(true);
    const handleMouseLeave = (event) => {
      if (!panelRef.current.contains(event.relatedTarget)) {
        setIsTextBoxVisible(false);
      }
    };

    const panelElement = panelRef.current;
    if (panelElement) {
      panelElement.addEventListener("mouseenter", handleMouseEnter);
      panelElement.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (panelElement) {
        panelElement.removeEventListener("mouseenter", handleMouseEnter);
        panelElement.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [isMobile]);

  // Toggle button click (for mobile & manual desktop toggle)
  const handleButtonClick = (e) => {
    e.stopPropagation();
    setIsTextBoxVisible(!isTextBoxVisible);
  };

  return (
    <Box
      ref={panelRef}
      position="fixed"
      top="0"
      right="0"
      zIndex="5000"
      textAlign="right"
      width={isMobile ? "80%" : "25%"} // Mobile expands width
      height="100%"
      background="rgba(0, 0, 0, 0.8)"
      color="white"
      p="1rem"
      borderRadius="8px"
      pointerEvents="auto"
      transform={isTextBoxVisible ? "translateX(0)" : `translateX(100%)`}
      transition="transform 0.3s ease-in-out"
      cursor="pointer"
    >
      {/* Invisible hover hotzone (Desktop Only) */}
      {!isMobile && (
        <Box
          position="absolute"
          top="0"
          right="100%"
          width="1.5rem"
          height="100%"
        />
      )}

      {/* Manual Toggle Button (Now Larger & Centered for Mobile) */}
      <Button
        onClick={handleButtonClick}
        size="lg"
        background="transparent"
        position="absolute"
        color="white"
        left={isMobile ? "-3.5rem" : "-3rem"} // Adjust button position
        top={isMobile ? "50%" : "50%"} // Center vertically for mobile
        transform="translateY(-50%)" // Ensure it stays in the center
        width={isMobile ? "4rem" : "3rem"} // Make it larger on mobile
        height={isMobile ? "4rem" : "4rem"} // Make it a bigger tap target
        fontSize={isMobile ? "2rem" : "1.5rem"} // Increase icon size for mobile
        borderRadius="50%" // Circular button for better aesthetics
        _hover={{ background: "rgba(255, 255, 255, 0.2)" }}
      >
        {isTextBoxVisible ? "❯" : "❮"}
      </Button>

      <Flex justify="space-between" align="right" position="relative" top="10%">
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
        <AnimatedRadioButtons />
      </Flex>

      <Box
        position="absolute"
        bottom="0"
        width="100%"
        display="flex"
        justifyContent="center"
        alignItems="center"
        p="0.5rem"
        color="white"
      >
        <Box
          display="flex"
          justifyContent="space-around"
          alignItems="center"
          width="100%"
          maxWidth="99%"
          transform="scale(0.5)"
          transformOrigin="center center"
        >
          <Communion3 />
        </Box>
      </Box>
    </Box>
  );
};

export default SidePanel;
