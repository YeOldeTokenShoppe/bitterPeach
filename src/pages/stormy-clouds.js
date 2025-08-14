import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import StormyEtherealClouds from '../components/EtherealClouds/StormyEtherealClouds';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export default function StormyCloudsPage() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a' }}>
      <Canvas
        camera={{ position: [0, 0, 50], fov: 60 }}
        shadows
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={null}>
          <StormyEtherealClouds />
          <OrbitControls 
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            maxDistance={20}
            minDistance={1}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}