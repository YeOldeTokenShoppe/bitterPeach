// components/TextMarquee.js
"use client";
import React from "react";
import Marquee from "react-fast-marquee";
import { Box, Text } from "@chakra-ui/react";

const TextItem = ({ image }) => {
  return (
    <Box mx={4} position="relative" display="flex" alignItems="center">
      <Text fontSize="1.5rem" fontWeight="bold">
        {image.userName} -{" "}
        <span style={{ color: "orange" }}>
          Burned: {image.burnedAmount} tokens
        </span>
      </Text>
    </Box>
  );
};

const TextMarquee = ({ images }) => {
  return (
    <Box
      height="2rems"
      paddingX="2rem"
      marginTop="2rem"
      // marginBottom="2rem"
      display="flex"
      alignItems="center"
    >
      <Marquee
        pauseOnHover
        speed={30}
        gradient={false}
        loop={0}
        style={{ height: "100%", overflow: "hidden" }}
      >
        {images.map((image, index) => (
          <TextItem key={index} image={image} />
        ))}
      </Marquee>
    </Box>
  );
};

export default TextMarquee;
