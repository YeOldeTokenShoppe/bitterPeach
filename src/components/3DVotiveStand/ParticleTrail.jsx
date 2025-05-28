import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleTrail({ position, isActive, is80sMode }) {
  const particlesRef = useRef();
  const particleCount = 50;
  
  // Create particle geometry
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Initial positions at origin
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      // Random velocities
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      
      // Random sizes
      sizes[i] = Math.random() * 3 + 1;
      
      // Random lifetimes
      lifetimes[i] = 0;
      
      // Colors - pink/cyan for 80s mode, gold/orange for normal
      if (is80sMode) {
        const isPink = Math.random() > 0.5;
        colors[i * 3] = isPink ? 1 : 0;
        colors[i * 3 + 1] = isPink ? 0 : 1;
        colors[i * 3 + 2] = 1;
      } else {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = Math.random() * 0.5 + 0.5;
        colors[i * 3 + 2] = 0;
      }
    }
    
    return {
      positions,
      colors,
      sizes,
      velocities,
      lifetimes
    };
  }, [is80sMode]);
  
  // Store particle data in refs
  const velocitiesRef = useRef(particles.velocities);
  const lifetimesRef = useRef(particles.lifetimes);
  
  // Animate particles
  useFrame((state, delta) => {
    if (!particlesRef.current || !isActive) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    const colors = particlesRef.current.geometry.attributes.color.array;
    const sizes = particlesRef.current.geometry.attributes.size.array;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Update lifetime
      lifetimesRef.current[i] -= delta;
      
      // Reset particle if lifetime expired
      if (lifetimesRef.current[i] <= 0) {
        // Reset position to current emitter position
        positions[i3] = position[0] + (Math.random() - 0.5) * 0.1;
        positions[i3 + 1] = position[1] + (Math.random() - 0.5) * 0.1;
        positions[i3 + 2] = position[2] + (Math.random() - 0.5) * 0.1;
        
        // Reset lifetime
        lifetimesRef.current[i] = Math.random() * 2 + 1;
        
        // Reset size
        sizes[i] = Math.random() * 3 + 1;
        
        // Update colors for 80s mode
        if (is80sMode) {
          const isPink = Math.random() > 0.5;
          colors[i3] = isPink ? 1 : 0;
          colors[i3 + 1] = isPink ? 0 : 1;
          colors[i3 + 2] = 1;
        }
      } else {
        // Update position based on velocity
        positions[i3] += velocitiesRef.current[i3];
        positions[i3 + 1] += velocitiesRef.current[i3 + 1];
        positions[i3 + 2] += velocitiesRef.current[i3 + 2];
        
        // Apply gravity
        velocitiesRef.current[i3 + 1] -= delta * 0.1;
        
        // Fade out based on lifetime
        const lifeRatio = lifetimesRef.current[i] / 3;
        sizes[i] = (Math.random() * 3 + 1) * lifeRatio;
      }
    }
    
    // Update attributes
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    particlesRef.current.geometry.attributes.color.needsUpdate = true;
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={particles.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={particleCount}
          array={particles.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={particles.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={3}
        vertexColors
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}

export default ParticleTrail;