import React from 'react';
import { useGLTF } from '@react-three/drei';

// Simplified Madonna Model
const SimpleMadonna = () => {
  const { scene } = useGLTF('/madonna-pose1.glb');
  
  return (
    <primitive 
      object={scene} 
      position={[0, -10, 0]} 
      scale={15}
    />
  );
};

useGLTF.preload('/madonna-pose1.glb');

const BasicScene = () => {
  return (
    <>
      {/* Basic lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} />
      
      {/* Simple god ray effect using basic geometry */}
      <group>
        {/* Central light beam */}
        <mesh position={[0, 40, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[15, 80, 4, 1, true]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.05}
            depthWrite={false}
          />
        </mesh>
        
        {/* Additional light beams */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          return (
            <mesh 
              key={i}
              position={[Math.sin(angle) * 10, 35, Math.cos(angle) * 10]} 
              rotation={[Math.PI * 0.9, 0, angle]}
            >
              <coneGeometry args={[8, 60, 3, 1, true]} />
              <meshBasicMaterial
                color="#ffffcc"
                transparent
                opacity={0.03}
                depthWrite={false}
              />
            </mesh>
          );
        })}
      </group>
      
      {/* Madonna Model */}
      <SimpleMadonna />
    </>
  );
};

export default BasicScene;