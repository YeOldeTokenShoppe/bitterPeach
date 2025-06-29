import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import RL80Sword from '../components/RL80Sword';

export default function RL80SwordPage() {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas
        camera={{ position: [3, 0, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          
          {/* Environment for reflections */}
          <Environment preset="city" />
          
          {/* The Model */}
          <RL80Sword scale={1} position={[1, -1, 1]} />
          
          {/* Grid for reference */}
          <Grid 
            args={[10, 10]} 
            cellSize={0.5} 
            cellThickness={0.5} 
            cellColor="#67e8f9" 
            sectionSize={5} 
            sectionThickness={1} 
            sectionColor="#00ff41" 
            fadeDistance={20}
          />
          
          {/* Controls */}
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            autoRotateSpeed={1}
          />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div className="absolute top-4 left-4 text-white">
        <h1 className="text-2xl font-bold mb-2">RL80 Sword Model</h1>
        <p className="text-sm opacity-70">Use mouse to rotate • Scroll to zoom</p>
      </div>
    </div>
  );
}