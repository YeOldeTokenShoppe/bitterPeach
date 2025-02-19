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
    const lightningFlash = () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 80 + Math.random() * 200);
      setTimeout(() => {
        if (Math.random() > 0.6) {
          setFlash(true);
          setTimeout(() => setFlash(false), 50 + Math.random() * 150);
        }
      }, 200 + Math.random() * 500);
    };

    const interval = setInterval(lightningFlash, 1000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  useFrame((state, delta) => {
    if (flash) {
      setIntensity(20 + Math.random() * 40); // More dramatic lightning
    } else {
      setIntensity((prev) => Math.max(0, prev - 3)); // Faster fade-out
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
        color={"#a0c8ff"} // Slight blue tint for realistic lightning
        intensity={0}
        distance={500} // Extend reach
        decay={2} // Slower fade-off
        position={[0, 80, 0]}
      />
      <Clouds material={THREE.MeshStandardMaterial}>
        {/* ☁️ Cloud group 1 - center */}
        <group ref={cloudGroup1} position={[0, 36, 0]}>
          <Cloud
            seed={1}
            fade={30}
            speed={0.1}
            growth={4}
            segments={40}
            volume={9}
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
        <group ref={cloudGroup2} position={[-20, 35, -10]}>
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
        <group ref={cloudGroup3} position={[20, 32, 10]}>
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
      </Clouds>
    </group>
  );
}

export default DarkClouds;
