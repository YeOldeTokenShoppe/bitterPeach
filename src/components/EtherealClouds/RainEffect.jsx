import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const RainEffect = ({ count = 2000, speed = 0.5, windStrength = 0.1 }) => {
  const rainRef = useRef();
  const particlesRef = useRef();
  const maxCount = 3000; // Fixed maximum particle count
  
  const particles = useMemo(() => {
    const positions = new Float32Array(maxCount * 3);
    const velocities = new Float32Array(maxCount * 3);
    const sizes = new Float32Array(maxCount);
    const opacities = new Float32Array(maxCount);
    
    for (let i = 0; i < maxCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      
      velocities[i * 3] = (Math.random() - 0.5) * windStrength;
      velocities[i * 3 + 1] = -speed - Math.random() * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * windStrength * 0.5;
      
      sizes[i] = Math.random() * 0.5 + 0.1;
      opacities[i] = i < count ? 1.0 : 0.0; // Only show particles up to count
    }
    
    return { positions, velocities, sizes, opacities };
  }, [maxCount, speed, windStrength]); // Note: removed count from dependencies
  
  useFrame((state, delta) => {
    if (rainRef.current) {
      const positions = rainRef.current.geometry.attributes.position.array;
      const velocities = particles.velocities;
      const opacities = rainRef.current.geometry.attributes.opacity?.array;
      
      // Update opacity based on current count
      if (opacities) {
        for (let i = 0; i < maxCount; i++) {
          opacities[i] = i < count ? 0.6 : 0.0;
        }
        rainRef.current.geometry.attributes.opacity.needsUpdate = true;
      }
      
      for (let i = 0; i < maxCount; i++) { // Always update all particles
        positions[i * 3] += velocities[i * 3] * delta * 60;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta * 60;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta * 60;
        
        if (positions[i * 3 + 1] < -50) {
          positions[i * 3] = (Math.random() - 0.5) * 100;
          positions[i * 3 + 1] = 50 + Math.random() * 50;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        }
        
        const windEffect = Math.sin(state.clock.elapsedTime + i) * 0.02;
        positions[i * 3] += windEffect;
      }
      
      rainRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  return (
    <points ref={rainRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={maxCount}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={maxCount}
          array={particles.sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={maxCount}
          array={particles.opacities}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#aabbcc"
        size={0.15}
        sizeAttenuation={true}
        transparent={true}
        vertexColors={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        alphaTest={0.01}
      />
    </points>
  );
};

export default RainEffect;