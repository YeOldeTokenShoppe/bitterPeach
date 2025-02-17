import React, { useRef, useState, useEffect } from "react";
import { Cloud, Clouds } from "@react-three/drei";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

function DarkClouds() {
  const lightningRef = useRef();
  const [flash, setFlash] = useState(false);
  const [intensity, setIntensity] = useState(0);

  // Refs for cloud groups
  const cloudGroup1 = useRef();
  const cloudGroup2 = useRef();
  const cloudGroup3 = useRef();
  const cloudGroup4 = useRef();
  const bigCloudGroup = useRef(); // Large cloud base

  // Random lightning effect
  useEffect(() => {
    const interval = setInterval(() => {
      setFlash(true);
      setTimeout(() => setFlash(false), 150 + Math.random() * 300);
    }, 1200 + Math.random() * 1500);

    return () => clearInterval(interval);
  }, []);

  useFrame((state, delta) => {
    if (flash) {
      setIntensity(10 + Math.random() * 20);
    } else {
      setIntensity((prev) => Math.max(0, prev - 1.5));
    }

    if (lightningRef.current) {
      lightningRef.current.intensity = intensity;
    }

    [cloudGroup1, cloudGroup2, cloudGroup3, cloudGroup4, bigCloudGroup].forEach(
      (group) => {
        if (group?.current) {
          group.current.children.forEach((cloud) => {
            if (cloud.material) {
              cloud.material.emissive = new THREE.Color(
                `rgb(${intensity * 10}, ${intensity * 10}, ${intensity * 12})`
              );
              cloud.material.needsUpdate = true;
            }
          });
        }
      }
    );

    const time = state.clock.elapsedTime;

    if (cloudGroup1.current) cloudGroup1.current.position.x += 0.01 * delta;
    if (cloudGroup2.current) cloudGroup2.current.position.x -= 0.008 * delta;
    if (cloudGroup3.current) cloudGroup3.current.position.z += 0.005 * delta;
    if (cloudGroup4.current) cloudGroup4.current.position.z -= 0.006 * delta;

    // if (bigCloudGroup.current) {
    //   bigCloudGroup.current.position.y += Math.sin(time * 0.2) * 0.008; // Gentle floating
    // }
  });

  return (
    <group>
      {/* ⚡ Lightning Source */}
      <pointLight
        ref={lightningRef}
        color={"#ffffff"}
        intensity={0}
        distance={200}
        position={[0, 60, 0]}
        decay={1.5}
      />

      <Clouds material={THREE.MeshStandardMaterial}>
        {/* ☁️ Cloud group 1 - center */}
        <group ref={cloudGroup1} position={[0, 45, 0]}>
          <Cloud
            seed={1}
            fade={30}
            speed={0.1}
            growth={4}
            segments={40}
            volume={6}
            opacity={0.7}
            bounds={[10, 2, 10]}
          />
          <Cloud
            seed={2}
            fade={30}
            speed={0.5}
            growth={4}
            volume={8}
            opacity={0.5}
            bounds={[8, 2, 8]}
            position={[2, 1, 2]}
          />
        </group>

        {/* ☁️ Cloud group 2 - left */}
        <group ref={cloudGroup2} position={[-20, 40, -10]}>
          <Cloud
            seed={3}
            fade={30}
            speed={0.2}
            growth={4}
            segments={40}
            volume={5}
            opacity={0.6}
            bounds={[8, 2, 8]}
          />
        </group>

        {/* ☁️ Cloud group 3 - right */}
        <group ref={cloudGroup3} position={[20, 42, 10]}>
          <Cloud
            seed={4}
            fade={30}
            speed={0.15}
            growth={4}
            segments={40}
            volume={7}
            opacity={0.6}
            bounds={[9, 2, 9]}
          />
        </group>

        {/* ☁️ Cloud group 4 - back */}
        <group ref={cloudGroup4} position={[5, 43, -15]}>
          <Cloud
            seed={5}
            fade={30}
            speed={0.1}
            growth={4}
            segments={40}
            volume={6}
            opacity={0.5}
            bounds={[7, 2, 7]}
          />
        </group>

        {/* ☁️ Large cloud base at the bottom */}
        <group ref={bigCloudGroup} position={[0, -8, 0]}>
          <Cloud
            seed={6}
            fade={40}
            speed={0.05}
            growth={2}
            segments={50}
            volume={22}
            opacity={0.6}
            position={[0, -3, 0]}
          />
          <Cloud
            seed={7}
            fade={40}
            speed={0.04}
            growth={9}
            volume={24}
            opacity={0.5}
            bounds={[28, -3, 28]}
            position={[0, -3, 0]}
          />
          <Cloud
            seed={8}
            fade={40}
            speed={0.03}
            growth={10}
            volume={26}
            opacity={0.4}
            bounds={[26, -3, 26]}
            position={[0, -3, 0]}
          />
        </group>
      </Clouds>
    </group>
  );
}

export default DarkClouds;
