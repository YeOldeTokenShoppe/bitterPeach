import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CoinSparkles = ({ coinPosition = [0, 0, 0], particleCount = 30 }) => {
  const particlesRef = useRef();
  const timeRef = useRef(0);
  
  // Create particle geometry with random positions
  const [positions, velocities, lifetimes, sizes] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const life = new Float32Array(particleCount);
    const size = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // Random position around coin
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 2;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = Math.sin(angle) * radius;
      
      // Random velocity
      vel[i * 3] = (Math.random() - 0.5) * 0.5;
      vel[i * 3 + 1] = Math.random() * 0.5 + 0.5;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      
      // Random lifetime
      life[i] = Math.random();
      
      // Random size
      size[i] = Math.random() * 0.003 + 0.001;
    }
    
    return [pos, vel, life, size];
  }, [particleCount]);
  
  useFrame((state, delta) => {
    if (!particlesRef.current) return;
    
    timeRef.current += delta;
    const positions = particlesRef.current.geometry.attributes.position.array;
    const opacities = particlesRef.current.geometry.attributes.opacity.array;
    
    for (let i = 0; i < particleCount; i++) {
      // Update lifetime
      lifetimes[i] -= delta * 0.5;
      
      if (lifetimes[i] <= 0) {
        // Reset particle
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        
        velocities[i * 3] = (Math.random() - 0.5) * 0.5;
        velocities[i * 3 + 1] = Math.random() * 0.5 + 0.5;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        
        lifetimes[i] = 1;
      } else {
        // Update position
        positions[i * 3] += velocities[i * 3] * delta;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
      }
      
      // Update opacity based on lifetime
      opacities[i] = lifetimes[i] * 0.8;
      
      // Add sparkle effect
      const sparkle = Math.sin(timeRef.current * 10 + i * 2) * 0.5 + 0.5;
      opacities[i] *= sparkle;
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
    particlesRef.current.geometry.attributes.opacity.needsUpdate = true;
  });
  
  return (
    <points ref={particlesRef} position={coinPosition}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-opacity"
          count={particleCount}
          array={new Float32Array(particleCount).fill(1)}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2.0}
        color="#FFD700"
        transparent
        opacity={1.0}
        vertexColors={false}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
        map={(() => {
          // Create a star/sparkle texture programmatically
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          const centerX = 64;
          const centerY = 64;
          
          // Clear canvas
          ctx.clearRect(0, 0, 128, 128);
          
          // Draw a star-like sparkle
          ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
          ctx.fillStyle = 'rgba(255, 255, 255, 1)';
          
          // Draw cross (main sparkle)
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(centerX, 0);
          ctx.lineTo(centerX, 128);
          ctx.moveTo(0, centerY);
          ctx.lineTo(128, centerY);
          ctx.stroke();
          
          // Draw diagonal lines (secondary sparkle)
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7;
          ctx.beginPath();
          ctx.moveTo(20, 20);
          ctx.lineTo(108, 108);
          ctx.moveTo(108, 20);
          ctx.lineTo(20, 108);
          ctx.stroke();
          
          // Draw bright center dot
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
          ctx.fill();
          
          // Add glow effect
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 40);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
          gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
          gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 128, 128);
          
          const texture = new THREE.CanvasTexture(canvas);
          texture.needsUpdate = true;
          return texture;
        })()}
      />
    </points>
  );
};

export default CoinSparkles;