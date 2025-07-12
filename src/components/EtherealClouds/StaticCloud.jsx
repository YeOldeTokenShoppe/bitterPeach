import React, { useMemo } from 'react';
import * as THREE from 'three';

const StaticCloud = ({ position, scale = 1, color = '#ffffff', opacity = 0.9 }) => {
  // Create multiple spheres to form a cloud shape
  const cloudGeometry = useMemo(() => {
    const spheres = [];
    
    // Create a cluster of spheres with varying sizes and positions
    const numSpheres = 12;
    
    for (let i = 0; i < numSpheres; i++) {
      const size = 0.3 + Math.random() * 0.7;
      const x = (Math.random() - 0.5) * 2;
      const y = (Math.random() - 0.5) * 0.8;
      const z = (Math.random() - 0.5) * 1.5;
      
      spheres.push({
        position: [x, y, z],
        scale: size
      });
    }
    
    return spheres;
  }, []);

  return (
    <group position={position} scale={scale}>
      {cloudGeometry.map((sphere, index) => (
        <mesh key={index} position={sphere.position} scale={sphere.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial
            color={color}
            opacity={opacity}
            transparent
            roughness={1}
            metalness={0}
            emissive={color}
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
    </group>
  );
};

export default StaticCloud;