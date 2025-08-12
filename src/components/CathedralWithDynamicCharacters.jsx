import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import DynamicCharacterSystem from './DynamicCharacterSystem';

// Cathedral without baked-in characters
function CathedralShell() {
  // Load a version of cathedral3.glb that has no characters
  // Or hide existing characters
  const gltf = useGLTF('/cathedral3_no_characters.glb');
  
  return <primitive object={gltf.scene} />;
}

export default function CathedralWithDynamicCharacters({ isPlaying }) {
  return (
    <Canvas>
      <Suspense fallback={null}>
        {/* Cathedral building/environment only */}
        <CathedralShell />
        
        {/* Dynamic character system */}
        <DynamicCharacterSystem 
          isPlaying={isPlaying}
          maxCharacters={5} // Can easily change to 10, 20, etc
        />
      </Suspense>
    </Canvas>
  );
}