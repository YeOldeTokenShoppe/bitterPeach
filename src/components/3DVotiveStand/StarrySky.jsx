import React, { useRef } from "react";
import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const StarrySky = ({ is80sMode = false }) => {
  const starsRef = useRef();

  // Add subtle rotation
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });

  // The color is applied directly through props rather than trying to modify material
  return (
    <Stars
      ref={starsRef}
      radius={300}
      depth={100}
      count={5000}
      factor={4}
      fade={true}
      speed={0.5}
      color={is80sMode ? "#ff88ff" : "#ffffff"}
    />
  );
};

export default StarrySky;
