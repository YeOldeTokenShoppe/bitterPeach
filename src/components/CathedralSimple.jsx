import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';

function Model() {
  const { scene } = useGLTF('/cathedral.glb');
  return <primitive object={scene} />;
}

export default function CathedralSimple() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        <React.Suspense fallback={null}>
          <Model />
        </React.Suspense>
        <OrbitControls />
      </Canvas>
    </div>
  );
}