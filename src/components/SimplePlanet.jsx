import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export default function SimplePlanet({ position = [0, 0, 0], scale = 1 }) {
  const groupRef = useRef();
  const coreRef = useRef();
  const ringsRef = useRef([]);
  
  // Create particle positions for the core
  const coreParticles = useMemo(() => {
    const positions = [];
    const colors = [];
    const count = 5000;
    const radius = 4;
    
    for (let i = 0; i < count; i++) {
      // Distribute points on sphere surface
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions.push(x, y, z);
      
      // Create gradient colors
      const t = i / count;
      colors.push(
        0.2 + t * 0.8,  // R: from dark to bright cyan
        0.8 + t * 0.2,  // G: mostly bright
        1.0             // B: full blue
      );
    }
    
    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors)
    };
  }, []);
  
  // Create ring particles
  const ringData = useMemo(() => {
    const rings = [];
    const ringCount = 3;
    
    for (let r = 0; r < ringCount; r++) {
      const positions = [];
      const colors = [];
      const particleCount = 2000;
      const radius = 6 + r * 2;
      const thickness = 0.5;
      
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const radiusOffset = (Math.random() - 0.5) * thickness;
        
        positions.push(
          Math.cos(angle) * (radius + radiusOffset),
          (Math.random() - 0.5) * thickness,
          Math.sin(angle) * (radius + radiusOffset)
        );
        
        // Different color for each ring
        const hue = r / ringCount;
        colors.push(
          1.0 - hue * 0.5,     // R
          0.2 + hue * 0.3,     // G  
          0.8 + hue * 0.2      // B
        );
      }
      
      rings.push({
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        rotation: [
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          0
        ]
      });
    }
    
    return rings;
  }, []);
  
  // Animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
    
    if (coreRef.current) {
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      coreRef.current.scale.setScalar(breathe);
    }
    
    // Rotate rings
    ringsRef.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.z += 0.002 * (i + 1);
        ring.rotation.x += 0.001 * (i + 1);
      }
    });
  });
  
  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Core particles */}
      <points ref={coreRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={coreParticles.positions.length / 3}
            array={coreParticles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={coreParticles.colors.length / 3}
            array={coreParticles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Glowing core mesh */}
      <mesh>
        <sphereGeometry args={[3.5, 32, 32]} />
        <meshBasicMaterial
          color={0x00ffff}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Ring particles */}
      {ringData.map((ring, index) => (
        <points
          key={index}
          ref={el => ringsRef.current[index] = el}
          rotation={ring.rotation}
        >
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={ring.positions.length / 3}
              array={ring.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={ring.colors.length / 3}
              array={ring.colors}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.08}
            vertexColors
            transparent
            opacity={0.8}
            sizeAttenuation={true}
            blending={THREE.AdditiveBlending}
          />
        </points>
      ))}
      
      {/* Ring meshes for better visibility */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`ring-mesh-${i}`}
          rotation={[Math.PI / 2 + i * 0.2, 0, i * 0.5]}
        >
          <torusGeometry args={[6 + i * 2, 0.1, 8, 64]} />
          <meshBasicMaterial
            color={new THREE.Color().setHSL(i / 3, 1, 0.6)}
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
}