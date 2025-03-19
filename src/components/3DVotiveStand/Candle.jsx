import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

function Candle({ scene, position, userData = {}, onCandle = null, index }) {
  const candleRef = useRef();
  const meltingStateRef = useRef({});

  useEffect(() => {
    // Candle loading and initialization logic here
    // ...

    return () => {
      // Cleanup candle resources
      // ...
    };
  }, []);

  // Melting animation logic in useFrame
  useFrame((state, delta) => {
    if (!candleRef.current) return;

    // Handle candle melting logic
    // ...
  });

  return (
    <group ref={candleRef} position={position}>
      {/* Candle mesh and components */}
    </group>
  );
}

export default Candle;
