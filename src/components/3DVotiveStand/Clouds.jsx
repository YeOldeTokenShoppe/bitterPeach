import React, {
  useRef,
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
import { Cloud, Clouds } from "@react-three/drei";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { random } from "maath";

// Create context for sharing lightning effects
const lightningContext = createContext();

function DarkClouds() {
  const shake = useRef(); // For camera shake effect if you use CameraShake
  const [flash] = useState(
    () =>
      new random.FlashGen({
        count: 10,
        minDuration: 40,
        maxDuration: 200,
      })
  );

  // Refs for cloud groups
  const cloudGroup1 = useRef();
  const cloudGroup2 = useRef();
  const cloudGroup3 = useRef();
  const cloudGroup4 = useRef();
  const bigCloudGroup = useRef();

  // Multiple lightning sources for more dramatic effect
  const lightningRef1 = useRef();
  const lightningRef2 = useRef();
  const lightningRef3 = useRef();

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Update lightning with flash generator from maath
    const impulse = flash.update(time, delta);

    // Apply intensity to all lightning sources with variation
    if (lightningRef1.current) lightningRef1.current.intensity = impulse * 150;
    if (lightningRef2.current) lightningRef2.current.intensity = impulse * 80;
    if (lightningRef3.current) lightningRef3.current.intensity = impulse * 100;

    // Trigger camera shake if available
    if (impulse === 1 && shake?.current) {
      shake.current.setIntensity(0.8);
    }

    // Apply emissive glow to all cloud groups based on lightning
    [cloudGroup1, cloudGroup2, cloudGroup3, cloudGroup4, bigCloudGroup].forEach(
      (group) => {
        if (group?.current) {
          group.current.children.forEach((cloud) => {
            if (cloud.material) {
              // More dramatic blue-white emissive color
              cloud.material.emissive = new THREE.Color(
                `rgb(${impulse * 150}, ${impulse * 180}, ${impulse * 255})`
              );
              cloud.material.needsUpdate = true;
            }
          });
        }
      }
    );

    // Subtle cloud movement
    if (cloudGroup1.current) cloudGroup1.current.position.x += 0.01 * delta;
    if (cloudGroup2.current) cloudGroup2.current.position.x -= 0.008 * delta;
    if (cloudGroup3.current) cloudGroup3.current.position.z += 0.005 * delta;
    if (cloudGroup4.current) cloudGroup4.current.position.z -= 0.006 * delta;

    // Gentle floating for big cloud group
    if (bigCloudGroup.current) {
      bigCloudGroup.current.position.y += Math.sin(time * 0.2) * 0.001;
    }
  });

  // Manually trigger lightning bursts randomly
  useEffect(() => {
    const triggerRandomLightning = () => {
      if (Math.random() > 0.3) {
        flash.burst();
      }
    };

    const interval = setInterval(
      triggerRandomLightning,
      800 + Math.random() * 3000
    );
    return () => clearInterval(interval);
  }, [flash]);

  return (
    <lightningContext.Provider value={{ flash, shake }}>
      <group>
        {/* Multiple lightning sources for more dramatic effect */}
        <pointLight
          ref={lightningRef1}
          color="#a0c8ff" // Blue tint
          intensity={0}
          distance={500}
          decay={1.5}
          position={[0, 80, 0]}
        />
        <pointLight
          ref={lightningRef2}
          color="#d1e6ff" // Lighter blue tint
          intensity={0}
          distance={450}
          decay={2}
          position={[-50, 70, -20]}
        />
        <pointLight
          ref={lightningRef3}
          color="#f5f9ff" // Almost white with slight blue
          intensity={0}
          distance={550}
          decay={1.8}
          position={[40, 75, 30]}
        />

        <Clouds material={THREE.MeshStandardMaterial}>
          {/* ☁️ Cloud group 1 - center */}
          <group ref={cloudGroup1} position={[0, 25, 0]}>
            <Cloud
              seed={1}
              fade={30}
              speed={0.1}
              growth={4}
              segments={30}
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
          <group ref={cloudGroup2} position={[-20, 26, -10]}>
            <Cloud
              seed={3}
              fade={30}
              speed={0.2}
              growth={4}
              segments={30}
              volume={5}
              opacity={0.6}
              bounds={[8, 2, 8]}
            />
          </group>

          {/* ☁️ Cloud group 3 - right */}
          <group ref={cloudGroup3} position={[20, 27, 10]}>
            <Cloud
              seed={4}
              fade={30}
              speed={0.15}
              growth={4}
              segments={30}
              volume={7}
              opacity={0.6}
              bounds={[9, 2, 9]}
            />
          </group>

          {/* ☁️ Cloud group 4 - back */}
          <group ref={cloudGroup4} position={[5, 28, -15]}>
            <Cloud
              seed={5}
              fade={30}
              speed={0.1}
              growth={4}
              segments={30}
              volume={6}
              opacity={0.5}
              bounds={[7, 2, 7]}
            />
            {/* Add dedicated lightning source inside a cloud for glow effect */}
            <pointLight color="#dcebff" intensity={0} distance={12} decay={2} />
          </group>

          {/* New cloud group with internal lightning */}
          <group ref={bigCloudGroup} position={[-15, 30, 12]}>
            <Cloud
              seed={6}
              fade={30}
              speed={0.05}
              growth={5}
              segments={45}
              volume={10}
              opacity={0.65}
              bounds={[12, 3, 12]}
            />
            {/* Hidden light source inside cloud */}
            <PuffyLightning position={[0, 0, 0]} />
          </group>
        </Clouds>
      </group>
    </lightningContext.Provider>
  );
}

// Component for cloud with internal lightning - similar to Puffycloud from example
function PuffyLightning({ position = [0, 0, 0] }) {
  const light = useRef();
  const { flash } = useContext(lightningContext);

  useFrame((state, delta) => {
    const impulse = flash.update(state.clock.elapsedTime, delta);
    if (light.current) {
      light.current.intensity = impulse * 80;
    }
  });

  return (
    <group position={position}>
      <pointLight
        ref={light}
        color="#b1d5ff"
        intensity={0}
        distance={15}
        decay={2}
      />
    </group>
  );
}

export default DarkClouds;
