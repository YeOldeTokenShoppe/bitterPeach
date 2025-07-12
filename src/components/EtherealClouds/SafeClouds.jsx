import React, { useRef } from "react";
import { Cloud, Clouds } from "@react-three/drei";
import * as THREE from "three";

const SafeClouds = React.forwardRef((props, ref) => {
  const sunRef = useRef();
  
  // Expose sun ref for potential god rays
  React.useImperativeHandle(ref, () => ({
    sunRef: sunRef
  }), []);

  return (
    <group>
      {/* Sun mesh for god rays - positioned high above */}
      <mesh ref={sunRef} position={[0, 80, -30]}>
        <sphereGeometry args={[20, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Simple clouds without material modifications */}
      <Clouds material={THREE.MeshLambertMaterial}>
        <Cloud 
          position={[-50, 40, -80]} 
          speed={0.2} 
          opacity={0.8}
          color="#1a1a1a"
          scale={[30, 15, 30]}
        />
        <Cloud 
          position={[50, 35, -90]} 
          speed={0.15} 
          opacity={0.7}
          color="#2a2a2a"
          scale={[35, 20, 35]}
        />
        <Cloud 
          position={[0, 45, -70]} 
          speed={0.1} 
          opacity={0.9}
          color="#0f0f0f"
          scale={[40, 25, 40]}
        />
        <Cloud 
          position={[-30, 30, -100]} 
          speed={0.18} 
          opacity={0.75}
          color="#1f1f1f"
          scale={[25, 15, 25]}
        />
        <Cloud 
          position={[40, 38, -85]} 
          speed={0.12} 
          opacity={0.85}
          color="#151515"
          scale={[32, 18, 32]}
        />
      </Clouds>
    </group>
  );
});

SafeClouds.displayName = 'SafeClouds';

export default SafeClouds;