// components/TextMarquee.js
"use client";
import React from "react";
import Marquee from "react-fast-marquee";
import { Text } from "./ui/text";

const TextItem = ({ image }) => {
  return (
    <div className="mx-4 relative flex items-center">
      <Text className="text-xl font-bold">
        {" "}{image.userName} -{" "}
        <span style={{ color: "orange" }}>
          Burned: {image.burnedAmount} tokens
        </span>
        {" "}{" "}{" "}{" "}{" "}{" "}★{" "}{" "}{" "}{" "}{" "}{" "}
      </Text>
    </div>
  );
};

const TextMarquee = ({ images }) => {
  return (
    <div
      className="h-[2rem] px-8 mt-8 flex items-center"
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
    </div>
  );
};

export default TextMarquee;
