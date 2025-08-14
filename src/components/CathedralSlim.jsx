import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';


function CathedralModel() {
  const { scene } = useGLTF('/CATHEDRAL_SLIM.glb');
  
  return <primitive object={scene} scale={1} position={[0, 0, 0]} />;
}

useGLTF.preload('/CATHEDRAL_SLIM.glb');

export default function CathedralSlim() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1
        }}
      >
        <PerspectiveCamera 
          makeDefault 
          position={[10, 10, 10]} 
          fov={50}
        />
        
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow 
        />
        
        <Suspense fallback={null}>
          <CathedralModel />
          <Environment preset="night" />
        </Suspense>
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>
    </div>
  );
}