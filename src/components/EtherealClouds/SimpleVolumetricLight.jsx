import React from 'react';
import * as THREE from 'three';

const SimpleVolumetricLight = ({ 
  position = [0, 80, 20], 
  target = [0, 0, 0],
  color = '#ffffff',
  intensity = 0.5,
  rayCount = 15
}) => {
  // Create simple cone meshes for god rays
  const rays = [];
  
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2;
    const spread = 10;
    const xOffset = Math.sin(angle) * spread;
    const zOffset = Math.cos(angle) * spread;
    
    rays.push(
      <mesh
        key={i}
        position={[
          position[0] + xOffset * 0.5,
          position[1] - 40,
          position[2] + zOffset * 0.5
        ]}
        rotation={[Math.PI, 0, 0]}
      >
        <coneGeometry args={[8, 80, 3, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    );
  }
  
  return (
    <group>
      {rays}
      {/* Simple spotlight for additional effect */}
      <spotLight
        position={position}
        target-position={target}
        angle={0.5}
        penumbra={0.5}
        intensity={intensity}
        color={color}
        castShadow
      />
    </group>
  );
};

export default SimpleVolumetricLight;