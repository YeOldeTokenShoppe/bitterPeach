import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import WaterEffect from './WaterEffect';

// Example component showing a pedestal with water in the inset
const PedestalWithWater = () => {
  // Here you would load your pedestal model
  // e.g., using useGLTF from drei, or custom mesh creation

  return (
    <Canvas shadows camera={{ position: [0, 2, 5], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[-1, 2.6, 1.4]} intensity={2} castShadow />
      
      {/* This would be your existing pedestal model */}
      <mesh position={[0, 0, 0]} receiveShadow>
        {/* Example pedestal with a circular inset */}
        <cylinderGeometry args={[1.5, 1.5, 0.5, 32]} />
        <meshStandardMaterial color="#c0c0c0" />
      </mesh>
      
      {/* The inset area (example) */}
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 0.01, 32]} />
        <meshStandardMaterial color="#909090" />
      </mesh>
      
      {/* Add the water effect in the inset */}
      <WaterEffect 
        position={[0, 0.26, 0]} 
        pedestalInsetRadius={1.2} 
        waterColor={0x9bd2ec}
        waterDepth={0.01}
      />
      
      <OrbitControls />
    </Canvas>
  );
};

export default PedestalWithWater; 