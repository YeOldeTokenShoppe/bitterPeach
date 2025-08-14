import React, { useRef, useMemo } from 'react';
import { Cloud, Clouds, CameraShake } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DynamicCloudSystem = ({ fearGreedIndex = 50, weatherState = 'neutral' }) => {
  const cloudsRef = useRef();
  const shakeRef = useRef();
  
  // Calculate cloud parameters based on Fear & Greed Index
  const normalized = fearGreedIndex / 100;
  
  // Cloud configuration based on weather state
  const cloudConfig = useMemo(() => {
    const configs = {
      extremeFear: {
        count: 15,
        baseColor: '#1a1a1a',
        topColor: '#2a2a2a',
        opacity: 0.95,
        speed: 0.8,
        growth: 15,
        volume: 60,
        concentrate: 'inside',
        spread: 35,
        yPosition: -5,
        scale: 1.5
      },
      fear: {
        count: 12,
        baseColor: '#3a3a3a',
        topColor: '#4a4a4a',
        opacity: 0.85,
        speed: 0.6,
        growth: 12,
        volume: 50,
        concentrate: 'inside',
        spread: 30,
        yPosition: -3,
        scale: 1.3
      },
      neutral: {
        count: 8,
        baseColor: '#6a6a6a',
        topColor: '#8a8a8a',
        opacity: 0.7,
        speed: 0.4,
        growth: 10,
        volume: 40,
        concentrate: 'random',
        spread: 25,
        yPosition: 0,
        scale: 1.0
      },
      greed: {
        count: 6,
        baseColor: '#aaaaaa',
        topColor: '#cccccc',
        opacity: 0.5,
        speed: 0.3,
        growth: 8,
        volume: 30,
        concentrate: 'outside',
        spread: 20,
        yPosition: 2,
        scale: 0.8
      },
      extremeGreed: {
        count: 4,
        baseColor: '#eeeeee',
        topColor: '#ffffff',
        opacity: 0.3,
        speed: 0.2,
        growth: 6,
        volume: 20,
        concentrate: 'outside',
        spread: 15,
        yPosition: 5,
        scale: 0.6
      }
    };
    
    return configs[weatherState] || configs.neutral;
  }, [weatherState]);
  
  // Generate cloud positions with progressive gathering
  const cloudPositions = useMemo(() => {
    const positions = [];
    const { count, spread } = cloudConfig;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = spread * (1 - normalized * 0.5); // Clouds gather closer in fear
      const height = cloudConfig.yPosition + (Math.random() - 0.5) * 10;
      
      positions.push({
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * 10,
        y: height,
        z: Math.sin(angle) * radius + (Math.random() - 0.5) * 10,
        seed: i + 1,
        scale: cloudConfig.scale * (0.8 + Math.random() * 0.4)
      });
    }
    
    return positions;
  }, [cloudConfig, normalized]);
  
  // Animate clouds
  useFrame((state, delta) => {
    if (cloudsRef.current) {
      const time = state.clock.elapsedTime;
      
      // Rotate cloud system based on weather intensity
      cloudsRef.current.rotation.y += delta * cloudConfig.speed * 0.05;
      
      // Vertical movement for storm effect
      const stormIntensity = 1 - normalized;
      cloudsRef.current.position.y = Math.sin(time * stormIntensity) * stormIntensity * 2;
      
      // Camera shake for extreme fear
      if (weatherState === 'extremeFear' && shakeRef.current) {
        if (Math.random() > 0.98) {
          shakeRef.current.setIntensity(1);
          shakeRef.current.setDecayRate(0.5);
        }
      }
    }
  });
  
  return (
    <>
      {/* Camera shake for storm effects */}
      <CameraShake
        ref={shakeRef}
        maxYaw={0.01}
        maxPitch={0.01}
        maxRoll={0.01}
        yawFrequency={2}
        pitchFrequency={2}
        rollFrequency={2}
        intensity={0}
        decayRate={0.5}
      />
      
      {/* Dynamic fog based on weather */}
      <fog 
        attach="fog" 
        args={[
          weatherState === 'extremeFear' ? '#1a1a1a' : 
          weatherState === 'fear' ? '#3a3a3a' :
          weatherState === 'neutral' ? '#6a6a6a' :
          weatherState === 'greed' ? '#aaaaaa' : '#eeeeee',
          10,
          100 - normalized * 50 // Fog gets closer in fear states
        ]} 
      />
      
      {/* Progressive cloud system */}
      <group ref={cloudsRef}>
        <Clouds material={THREE.MeshLambertMaterial} limit={400}>
          {cloudPositions.map((pos, i) => (
            <Cloud
              key={i}
              seed={pos.seed}
              position={[pos.x, pos.y, pos.z]}
              speed={cloudConfig.speed}
              opacity={cloudConfig.opacity}
              growth={cloudConfig.growth}
              volume={cloudConfig.volume}
              color={i % 2 === 0 ? cloudConfig.baseColor : cloudConfig.topColor}
              scale={pos.scale}
              bounds={[10, 5, 5]}
              concentrate={cloudConfig.concentrate}
              fade={100}
            />
          ))}
          
          {/* Additional storm clouds for fear states */}
          {(weatherState === 'extremeFear' || weatherState === 'fear') && (
            <>
              <Cloud
                seed={100}
                position={[0, -15, 0]}
                speed={1.2}
                opacity={0.9}
                growth={20}
                volume={80}
                color="#0a0a0a"
                scale={2}
                bounds={[30, 10, 30]}
                concentrate="inside"
              />
              <Cloud
                seed={101}
                position={[0, 15, -10]}
                speed={0.8}
                opacity={0.85}
                growth={18}
                volume={70}
                color="#1a1a1a"
                scale={1.8}
                bounds={[25, 8, 25]}
                concentrate="inside"
              />
            </>
          )}
          
          {/* Light wispy clouds for greed states */}
          {(weatherState === 'extremeGreed' || weatherState === 'greed') && (
            <>
              <Cloud
                seed={200}
                position={[20, 10, 10]}
                speed={0.1}
                opacity={0.2}
                growth={4}
                volume={15}
                color="#ffffff"
                scale={0.5}
                bounds={[8, 3, 8]}
                concentrate="outside"
              />
              <Cloud
                seed={201}
                position={[-20, 12, -10]}
                speed={0.15}
                opacity={0.25}
                growth={5}
                volume={18}
                color="#ffffee"
                scale={0.6}
                bounds={[10, 4, 10]}
                concentrate="outside"
              />
            </>
          )}
        </Clouds>
      </group>
      
      {/* Atmospheric lighting effects */}
      <group>
        {/* Storm lighting for fear states */}
        {(weatherState === 'extremeFear' || weatherState === 'fear') && (
          <>
            <pointLight
              position={[0, -10, 0]}
              intensity={0.2}
              color="#4a5a6a"
              distance={50}
            />
            <hemisphereLight
              skyColor="#2a3a4a"
              groundColor="#1a2a3a"
              intensity={0.5}
            />
          </>
        )}
        
        {/* Heavenly lighting for greed states */}
        {(weatherState === 'extremeGreed' || weatherState === 'greed') && (
          <>
            <pointLight
              position={[0, 20, 0]}
              intensity={1.5}
              color="#ffffcc"
              distance={100}
            />
            <hemisphereLight
              skyColor="#ffffff"
              groundColor="#ffffee"
              intensity={1.2}
            />
          </>
        )}
      </group>
    </>
  );
};

export default DynamicCloudSystem;