import React, { useRef, Suspense, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

function CathedralModel({ position }) {
  const gltf = useGLTF('/cathedral.glb');
  const modelRef = useRef();

  useFrame(() => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.003;
    }
  });

  return (
    <primitive 
      ref={modelRef}
      object={gltf.scene} 
      scale={1} 
      position={position}
    />
  );
}

function CathedralDebug() {
  const [modelY, setModelY] = useState(-10);
  const [cameraY, setCameraY] = useState(15);
  const [targetY, setTargetY] = useState(-5);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: 'rgba(0,0,0,0.8)', padding: '10px', color: 'white' }}>
        <div>
          Model Y: <input type="range" min="-50" max="50" value={modelY} onChange={(e) => setModelY(Number(e.target.value))} />
          <span>{modelY}</span>
        </div>
        <div>
          Camera Y: <input type="range" min="-50" max="50" value={cameraY} onChange={(e) => setCameraY(Number(e.target.value))} />
          <span>{cameraY}</span>
        </div>
        <div>
          Target Y: <input type="range" min="-50" max="50" value={targetY} onChange={(e) => setTargetY(Number(e.target.value))} />
          <span>{targetY}</span>
        </div>
      </div>
      
      <Canvas shadows camera={{ position: [5, cameraY, 20], fov: 50 }}>
        <OrbitControls 
            target={[0, targetY, 0]}
            enablePan={true} 
            enableRotate={true} 
            enableZoom={true}
            minDistance={5}
            maxDistance={100}
        />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
        
        <Suspense fallback={null}>
          <CathedralModel position={[0, modelY, 0]} />
        </Suspense>
        
        <Environment preset="sunset" background />
        
        {/* Add a reference grid */}
        <gridHelper args={[100, 100]} position={[0, 0, 0]} />
        
        {/* Add axes helper */}
        <axesHelper args={[50]} />
      </Canvas>
    </div>
  );
}

export default CathedralDebug;