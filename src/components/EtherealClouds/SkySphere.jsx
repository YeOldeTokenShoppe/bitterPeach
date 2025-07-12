import React from 'react';
import * as THREE from 'three';

const SkySphere = () => {
  return (
    <mesh scale={[500, 500, 500]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial 
        color="#87CEEB" 
        side={THREE.BackSide}
        fog={false}
      />
    </mesh>
  );
};

export default SkySphere;