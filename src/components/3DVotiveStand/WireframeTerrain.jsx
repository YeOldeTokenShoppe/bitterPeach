import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise2D } from "simplex-noise";

const WireframeTerrain = ({ is80sMode }) => {
  const meshRef = useRef();
  const noise2D = useMemo(() => createNoise2D(), []);

  // Create geometry with vertices
  const geometry = useMemo(() => {
    // Make the plane wider but not as deep, and increase resolution
    const geo = new THREE.PlaneGeometry(100, 100, 100, 50);
    const positions = geo.attributes.position;

    // Add height variation using multiple layers of noise for dramatic mountains
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      // Layer 1: Large mountains
      const mountainNoise = noise2D(x * 0.01, y * 0.01) * 0.25;

      // Layer 2: Medium details
      const mediumNoise = noise2D(x * 0.02, y * 0.02) * 0.15;

      // Layer 3: Small details
      const smallNoise = noise2D(x * 0.04, y * 0.04) * 0.5;

      // Combine layers and add height falloff based on Y position
      const falloff = Math.pow(1 - Math.abs(y / 50), 2); // Peaks in the middle, lower at edges
      const finalHeight = (mountainNoise + mediumNoise + smallNoise) * falloff;

      positions.setZ(i, finalHeight);
    }

    geo.computeVertexNormals();
    return geo;
  }, [noise2D]);

  if (!is80sMode) return null;

  return (
    <mesh position={[0, -20, -60]} rotation={[-Math.PI / 2.8, 0, 0]}>
      <primitive object={geometry} attach="geometry" />
      <meshBasicMaterial
        color="#00e5ff"
        wireframe
        wireframeLinewidth={1}
        transparent
        opacity={0.6}
      />
    </mesh>
  );
};

export default WireframeTerrain;
