import React from 'react';
import * as THREE from 'three';

const SafeVolumetricLight = ({ 
  position = [0, 100, 10], 
  target = [0, -20, 0],
  color = '#ffffee',
  intensity = 2
}) => {
  // Simple static rays without animation or complex calculations
  const rays = [];
  const rayCount = 30;
  
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const radius = 20;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    
    rays.push(
      <mesh
        key={i}
        position={[
          position[0] + x * 0.5,
          position[1] - 60,
          position[2] + z * 0.5
        ]}
        rotation={[Math.PI, 0, 0]}
      >
        <coneGeometry args={[6 + i * 0.2, 120, 4, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.01 + (i % 3) * 0.005}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    );
  }
  
  return (
    <group>
      {/* Simple directional light */}
      <directionalLight
        position={position}
        target-position={target}
        intensity={intensity}
        color={color}
      />
      
      {/* Central beam */}
      <mesh
        position={[position[0], position[1] - 75, position[2]]}
        rotation={[Math.PI, 0, 0]}
      >
        <cylinderGeometry args={[10, 20, 150, 6, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.02}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Ray meshes */}
      {rays}
    </group>
  );
};

export default SafeVolumetricLight;