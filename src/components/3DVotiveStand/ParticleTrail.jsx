import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function ParticleTrail({ position, isActive, is80sMode }) {
  const particlesRef = useRef();
  const particleCount = 80; // Increased for more dramatic burst
  const hasSpawnedRef = useRef(false);
  
  // Create particle geometry
  const particles = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Initial positions at the spawn point
      positions[i * 3] = position[0];
      positions[i * 3 + 1] = position[1] + 2;
      positions[i * 3 + 2] = position[2];
      
      // Random velocities - smaller explosion, mostly upward/outward
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI * 0.4 - Math.PI * 0.1; // -18 to 54 degrees (mostly upward)
      const speed = Math.random() * 0.02 + 0.01; // Reduced speed for smaller explosion
      
      velocities[i * 3] = Math.cos(angle) * Math.cos(elevation) * speed;
      velocities[i * 3 + 1] = Math.sin(elevation) * speed + 0.00015; // Strong upward bias
      velocities[i * 3 + 2] = Math.sin(angle) * Math.cos(elevation) * speed;
      
      // Random sizes - much smaller
      sizes[i] = Math.random() * 0.05 + 0.2; // 0.2-0.7 size range
      
      // All particles start with full lifetime
      lifetimes[i] = 1.5 + Math.random() * 0.5; // 1.5-2 seconds
      
      // Colors - cyan/green for 80s mode, gold/orange for normal
      if (is80sMode) {
        const isCyan = Math.random() > 0.5;
        if (isCyan) {
          // #67e8f9 cyan
          colors[i * 3] = 0.403;
          colors[i * 3 + 1] = 0.91;
          colors[i * 3 + 2] = 0.976;
        } else {
          // #00ff41 green
          colors[i * 3] = 0;
          colors[i * 3 + 1] = 1;
          colors[i * 3 + 2] = 0.254;
        }
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
  }, [position, is80sMode]);
  
  // Store particle data in refs
  const velocitiesRef = useRef(particles.velocities);
  const lifetimesRef = useRef(particles.lifetimes);
  const initialLifetimesRef = useRef([...particles.lifetimes]);
  
  // Animate particles
  useFrame((_, delta) => {
    if (!particlesRef.current || !isActive) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    const sizes = particlesRef.current.geometry.attributes.size.array;
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Only animate if particle still has lifetime
      if (lifetimesRef.current[i] > 0) {
        // Update lifetime
        lifetimesRef.current[i] -= delta;
        
        // Update position based on velocity
        positions[i3] += velocitiesRef.current[i3];
        positions[i3 + 1] += velocitiesRef.current[i3 + 1];
        positions[i3 + 2] += velocitiesRef.current[i3 + 2];
        
        // Apply upward force to counteract any downward movement
        if (velocitiesRef.current[i3 + 1] < 0) {
          velocitiesRef.current[i3 + 1] *= 0.9; // Quickly dampen downward velocity
        }
        
        // Slow down all movement over time
        velocitiesRef.current[i3] *= 0.96;
        velocitiesRef.current[i3 + 1] *= 0.97;
        velocitiesRef.current[i3 + 2] *= 0.96;
        
        // Fade out based on lifetime
        const lifeRatio = Math.max(0, lifetimesRef.current[i] / initialLifetimesRef.current[i]);
        const baseSize = Math.random() * 0.5 + 0.2; // Keep consistent with initial size range
        sizes[i] = baseSize * lifeRatio * lifeRatio; // Quadratic fade for smoother effect
      } else {
        // Particle is dead, set size to 0
        sizes[i] = 0;
      }
    }
    
    // Update attributes
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.size.needsUpdate = true;
    
    // Update material opacity based on overall lifetime
    if (particlesRef.current.material) {
      const maxLifetime = Math.max(...lifetimesRef.current);
      particlesRef.current.material.opacity = Math.min(0.8, maxLifetime);
    }
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
        size={0.5} // Reduced base size
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