import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Instance, Instances } from '@react-three/drei';

// Component for individual line instance
const NeonLineInstance = ({ start, end, color, speed, offset, index }) => {
  const ref = useRef();
  
  useFrame((state) => {
    if (!ref.current) return;
    
    const time = state.clock.elapsedTime;
    const pulse = Math.sin(time * speed + offset) * 0.5 + 0.5;
    
    // Update color with pulse
    ref.current.color.setRGB(
      color.r * (0.5 + pulse * 0.5),
      color.g * (0.5 + pulse * 0.5),
      color.b * (0.5 + pulse * 0.5)
    );
    
    // Add subtle movement
    const wobble = Math.sin(time * 0.3 + index) * 0.2;
    ref.current.position.y = (start.y + end.y) / 2 + wobble;
  });
  
  // Calculate line transformation
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  
  // Create rotation to align cylinder with line direction
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  quaternion.setFromUnitVectors(up, direction.normalize());
  
  return (
    <Instance
      ref={ref}
      position={midpoint}
      quaternion={quaternion}
      scale={[0.1, length, 0.1]} // Thin cylinder
      color={color}
    />
  );
};

const NeonLinesFinal = ({ enabled = true, linesAmount = 12 }) => {
  const groupRef = useRef();
  
  // Generate line data
  const lineData = useMemo(() => {
    const lines = [];
    const actualAmount = Math.min(linesAmount, 30); // Cap for performance
    
    for (let i = 0; i < actualAmount; i++) {
      const angle = (i / actualAmount) * Math.PI * 2;
      const radius = 12 + Math.random() * 8;
      const height = (Math.random() - 0.5) * 15;
      
      // Create dynamic line positions
      const start = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      // Create interesting patterns
      const pattern = i % 3;
      let end;
      
      if (pattern === 0) {
        // Radial lines
        end = new THREE.Vector3(
          Math.cos(angle) * (radius * 0.3),
          height + (Math.random() - 0.5) * 5,
          Math.sin(angle) * (radius * 0.3)
        );
      } else if (pattern === 1) {
        // Tangential lines
        const tangentAngle = angle + Math.PI / 2;
        end = new THREE.Vector3(
          start.x + Math.cos(tangentAngle) * 5,
          height + (Math.random() - 0.5) * 3,
          start.z + Math.sin(tangentAngle) * 5
        );
      } else {
        // Vertical lines
        end = new THREE.Vector3(
          start.x + (Math.random() - 0.5) * 2,
          height + 5 + Math.random() * 5,
          start.z + (Math.random() - 0.5) * 2
        );
      }
      
      // 80s neon colors from CLAUDE.md: white (#67e8f9) and green (#00ff41)
      const color = i % 2 === 0 
        ? new THREE.Color('#67e8f9') // Cyan
        : new THREE.Color('#00ff41'); // Neon green
      
      lines.push({
        start,
        end,
        color,
        speed: 1 + Math.random() * 2,
        offset: Math.random() * Math.PI * 2,
        index: i
      });
    }
    
    return lines;
  }, [linesAmount]);
  
  // Animate group rotation
  useFrame((state) => {
    if (!enabled || !groupRef.current) return;
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
  });
  
  if (!enabled) return null;
  
  return (
    <group ref={groupRef} position={[0, 5, 0]}>
      <Instances limit={linesAmount}>
        <cylinderGeometry args={[1, 1, 1, 8]} />
        <meshBasicMaterial 
          color="#00ff41"
          emissive="#00ff41"
          emissiveIntensity={2}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          transparent
          opacity={0.8}
          depthWrite={false}
        />
        {lineData.map((line, idx) => (
          <NeonLineInstance key={idx} {...line} />
        ))}
      </Instances>
    </group>
  );
};

export default NeonLinesFinal;