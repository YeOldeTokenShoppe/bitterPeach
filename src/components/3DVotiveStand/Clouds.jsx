import React, {
  useRef,
  useState,
  useEffect,
  createContext,
  useContext,
} from "react";
import { Cloud, Clouds } from "@react-three/drei";
import * as THREE from "three";
import { useFrame, useLoader } from "@react-three/fiber";
import { random } from "maath";
import dynamic from "next/dynamic";

// Create context for sharing lightning effects
const lightningContext = createContext();

// Define the component first
function DarkCloudsComponent() {
  // Load texture only on client side
  const [cloudTexture, setCloudTexture] = useState(null);

  useEffect(() => {
    // Only load texture on client side
    const loader = new THREE.TextureLoader();
    loader.load("/assets/textures/cloud.png", (texture) => {
      setCloudTexture(texture);
    });
  }, []);

  const shake = useRef(); // For camera shake effect if you use CameraShake

  // Create multiple independent flash generators for distributed lightning
  const [flash1] = useState(
    () =>
      new random.FlashGen({
        count: 6,
        minDuration: 40,
        maxDuration: 200,
      })
  );

  const [flash2] = useState(
    () =>
      new random.FlashGen({
        count: 4,
        minDuration: 60,
        maxDuration: 180,
      })
  );

  const [flash3] = useState(
    () =>
      new random.FlashGen({
        count: 5,
        minDuration: 50,
        maxDuration: 150,
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
  const staticLightRef1 = useRef(); // Add ref for the static light
  const staticLightRef2 = useRef(); // Add ref for the hidden light in bigCloudGroup

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    // Update lightning with independent flash generators
    const impulse1 = flash1.update(time, delta);
    const impulse2 = flash2.update(time, delta);
    const impulse3 = flash3.update(time, delta);

    // Apply intensity to lightning sources with different flash generators
    if (lightningRef1.current) lightningRef1.current.intensity = impulse1 * 150;
    if (lightningRef2.current) lightningRef2.current.intensity = impulse2 * 80;
    if (lightningRef3.current) lightningRef3.current.intensity = impulse3 * 100;

    // Control the static lights with the lightning impulses
    const mixedImpulse = impulse1 * 0.3 + impulse2 * 0.5 + impulse3 * 0.2;
    if (staticLightRef1.current)
      staticLightRef1.current.intensity = mixedImpulse * 1.5;
    if (staticLightRef2.current)
      staticLightRef2.current.intensity = mixedImpulse * 2.5;

    // Trigger camera shake only on major lightning events
    const maxImpulse = Math.max(impulse1, impulse2, impulse3);
    if (maxImpulse === 1 && shake?.current) {
      shake.current.setIntensity(0.6);
    }

    // Apply emissive glow to cloud groups based on different lightning sources
    if (cloudGroup1?.current) {
      cloudGroup1.current.children.forEach((cloud) => {
        if (cloud.material) {
          cloud.material.emissive = new THREE.Color(
            `rgb(${impulse1 * 150}, ${impulse1 * 180}, ${impulse1 * 255})`
          );
          cloud.material.needsUpdate = true;
        }
      });
    }

    if (cloudGroup2?.current) {
      cloudGroup2.current.children.forEach((cloud) => {
        if (cloud.material) {
          cloud.material.emissive = new THREE.Color(
            `rgb(${impulse2 * 150}, ${impulse2 * 180}, ${impulse2 * 255})`
          );
          cloud.material.needsUpdate = true;
        }
      });
    }

    if (cloudGroup3?.current) {
      cloudGroup3.current.children.forEach((cloud) => {
        if (cloud.material) {
          cloud.material.emissive = new THREE.Color(
            `rgb(${impulse3 * 150}, ${impulse3 * 180}, ${impulse3 * 255})`
          );
          cloud.material.needsUpdate = true;
        }
      });
    }

    if (cloudGroup4?.current) {
      cloudGroup4.current.children.forEach((cloud) => {
        if (cloud.material) {
          // Mix of impulse1 and impulse3
          const mixedImpulse = (impulse1 + impulse3) / 2;
          cloud.material.emissive = new THREE.Color(
            `rgb(${mixedImpulse * 150}, ${mixedImpulse * 180}, ${
              mixedImpulse * 255
            })`
          );
          cloud.material.needsUpdate = true;
        }
      });
    }

    if (bigCloudGroup?.current) {
      bigCloudGroup.current.children.forEach((cloud) => {
        if (cloud.material) {
          // Mix of all impulses with emphasis on impulse2
          const mixedImpulse = impulse1 * 0.3 + impulse2 * 0.5 + impulse3 * 0.2;
          cloud.material.emissive = new THREE.Color(
            `rgb(${mixedImpulse * 150}, ${mixedImpulse * 180}, ${
              mixedImpulse * 255
            })`
          );
          cloud.material.needsUpdate = true;
        }
      });
    }

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

  // Manually trigger lightning bursts randomly with different probabilities
  useEffect(() => {
    const triggerRandomLightning = () => {
      // Distribute lightning across different flash generators
      if (Math.random() > 0.7) {
        flash1.burst();
      }

      // Delay second flash generator slightly
      const timer1 = setTimeout(() => {
        if (Math.random() > 0.6) {
          flash2.burst();
        }
      }, Math.random() * 300);

      // Delay third flash generator more
      const timer2 = setTimeout(() => {
        if (Math.random() > 0.65) {
          flash3.burst();
        }
      }, Math.random() * 500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    };

    const interval = setInterval(
      triggerRandomLightning,
      1200 + Math.random() * 3500
    );
    return () => clearInterval(interval);
  }, [flash1, flash2, flash3]);

  return (
    <lightningContext.Provider value={{ flash1, flash2, flash3, shake }}>
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

        {cloudTexture ? (
          <Clouds>
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
                texture={cloudTexture}
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
                texture={cloudTexture}
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
                bounds={[6, 2, 6]}
                texture={cloudTexture}
              />
            </group>

            {/* ☁️ Cloud group 3 - right */}
            <group ref={cloudGroup3} position={[20, 27, 10]}>
              <Cloud
                seed={5}
                fade={30}
                speed={0.3}
                growth={4}
                segments={30}
                volume={6}
                opacity={0.5}
                bounds={[7, 2, 7]}
                texture={cloudTexture}
              />
            </group>

            {/* ☁️ Cloud group 4 - back */}
            <group ref={cloudGroup4} position={[5, 28, -15]}>
              <Cloud
                seed={6}
                fade={30}
                speed={0.2}
                growth={4}
                segments={30}
                volume={7}
                opacity={0.6}
                bounds={[9, 2, 9]}
                texture={cloudTexture}
              />
            </group>

            {/* Add dedicated lightning source inside a cloud for glow effect */}
            <pointLight
              ref={staticLightRef1}
              color="#f0f8ff"
              intensity={0} // Start with intensity 0
              position={[-15, 30, 12]}
              distance={15}
              decay={2}
            />

            {/* New cloud group with internal lightning */}
            <group ref={bigCloudGroup} position={[-15, 30, 12]}>
              <Cloud
                seed={7}
                fade={30}
                speed={0.1}
                growth={5}
                segments={45}
                volume={10}
                opacity={0.65}
                bounds={[12, 3, 12]}
                texture={cloudTexture}
              />
              {/* Hidden light source inside cloud */}
              <pointLight
                ref={staticLightRef2}
                color="#f0f8ff"
                intensity={0} // Start with intensity 0
                distance={10}
                decay={2}
              />
            </group>
          </Clouds>
        ) : (
          // Fallback when texture is not loaded yet
          <Clouds>{/* Empty clouds as placeholder */}</Clouds>
        )}
      </group>
    </lightningContext.Provider>
  );
}

// Use dynamic import with no SSR to avoid 'document is not defined' error
const DarkClouds = dynamic(() => Promise.resolve(DarkCloudsComponent), {
  ssr: false,
});

// Component for cloud with internal lightning - similar to Puffycloud from example
function PuffyLightningComponent({ position = [0, 0, 0] }) {
  const light = useRef();
  const { flash2 } = useContext(lightningContext);

  useFrame((state, delta) => {
    const impulse = flash2.update(state.clock.elapsedTime, delta);
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

// Use dynamic import for PuffyLightning as well
const PuffyLightning = dynamic(() => Promise.resolve(PuffyLightningComponent), {
  ssr: false,
});

export default DarkClouds;
