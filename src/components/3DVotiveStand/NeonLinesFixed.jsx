import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';

const NeonLinesFixed = ({ enabled = true, linesAmount = 10 }) => {
  const groupRef = useRef();
  const { viewport, camera } = useThree();
  const linesRef = useRef([]);
  
  console.log('🎨 NeonLinesFixed render:', { enabled, linesAmount });
  
  // Generate line data
  const lineData = useMemo(() => {
    const lines = [];
    const actualAmount = Math.min(linesAmount, 20); // Cap at 20 for performance
    
    for (let i = 0; i < actualAmount; i++) {
      const angle = (i / actualAmount) * Math.PI * 2;
      const radius = 15 + Math.random() * 10;
      const height = (Math.random() - 0.5) * 20;
      
      // Create 3D positions
      const start = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      const endAngle = angle + (Math.random() - 0.5) * Math.PI;
      const endRadius = radius + (Math.random() - 0.5) * 10;
      const endHeight = height + (Math.random() - 0.5) * 10;
      
      const end = new THREE.Vector3(
        Math.cos(endAngle) * endRadius,
        endHeight,
        Math.sin(endAngle) * endRadius
      );
      
      // Generate color
      const hue = (i / actualAmount) * 360;
      const color = new THREE.Color().setHSL(hue / 360, 1, 0.7);
      
      lines.push({
        start,
        end,
        color,
        speed: 0.5 + Math.random() * 1.5,
        offset: Math.random() * Math.PI * 2
      });
    }
    
    return lines;
  }, [linesAmount]);
  
  // Animate lines
  useFrame((state) => {
    if (!enabled || !groupRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    lineData.forEach((line, idx) => {
      if (linesRef.current[idx]) {
        const lineRef = linesRef.current[idx];
        
        // Animate opacity for pulsing effect
        const pulse = Math.sin(time * line.speed + line.offset) * 0.5 + 0.5;
        lineRef.material.opacity = 0.3 + pulse * 0.7;
        
        // Optional: animate line positions slightly
        const wobble = Math.sin(time * 0.5 + idx) * 0.1;
        lineRef.position.y = wobble;
      }
    });
    
    // Rotate the entire group slowly
    groupRef.current.rotation.y = time * 0.1;
  });
  
  if (!enabled) return null;
  
  return (
    <group ref={groupRef} position={[0, 5, 0]}>
      {lineData.map((line, idx) => (
        <Line
          key={idx}
          ref={(el) => (linesRef.current[idx] = el)}
          points={[line.start, line.end]}
          color={line.color}
          lineWidth={2}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
          renderOrder={100 + idx}
        />
      ))}
    </group>
  );
};

export default NeonLinesFixed;