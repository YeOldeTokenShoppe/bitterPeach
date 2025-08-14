import React from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const StormySky = () => {
  const skyRef = React.useRef();
  
  useFrame((state) => {
    if (skyRef.current) {
      const time = state.clock.elapsedTime;
      const material = skyRef.current.material;
      
      const baseColor = new THREE.Color('#1a2030');
      const stormColor = new THREE.Color('#2a3040');
      const flashColor = new THREE.Color('#3a4050');
      
      const pulse = Math.sin(time * 0.5) * 0.5 + 0.5;
      material.color.lerpColors(baseColor, stormColor, pulse);
      
      if (Math.random() > 0.995) {
        material.color = flashColor;
      }
    }
  });
  
  return (
    <mesh ref={skyRef} scale={[500, 500, 500]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial 
        color="#1a2030" 
        side={THREE.BackSide}
        fog={false}
      />
    </mesh>
  );
};

export default StormySky;