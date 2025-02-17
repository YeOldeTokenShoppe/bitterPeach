import React, { useState } from "react";
import { Box, Flex, Button, Text } from "@chakra-ui/react";
import AnimatedRadioButtons from "./3DVotiveStand/CyberButtons";
import Communion3 from "./Communion3";

const SidePanel = () => {
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true);
  const buttonWidth = "3rem"; // Width of the button tab

  const handlePanelClick = () => {
    setIsTextBoxVisible(false);
  };

  const handleButtonClick = (e) => {
    e.stopPropagation(); // Prevent panel click event from firing
    setIsTextBoxVisible(!isTextBoxVisible);
  };

  return (
    <Box
      position="absolute"
      top="0"
      right={`-${buttonWidth}`} // Offset by button width
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
          The Illumin80
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
