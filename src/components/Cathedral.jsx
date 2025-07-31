import React, { useRef, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, PerspectiveCamera, useGLTF, useAnimations } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import TickerCanvasTextureApplier from './TickerCanvasTextureApplier';
import ConstellationModel from '../components/3DVotiveStand/ConstellationModel';
import StarField from '../components/3DVotiveStand/StarField';
import HolographicStatue2 from "./3DVotiveStand/HolographicStatue2";
import Object2Replacer from './Object2Replacer';

function CathedralModel({ onModelLoad, children }) {
  const gltf = useGLTF('/cathedral.glb');
  const modelRef = useRef();
  const { actions } = useAnimations(gltf.animations, modelRef);

  useEffect(() => {
    if (gltf.scene && modelRef.current) {
      // Calculate the model's bounding box after positioning
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      console.log('Model world center:', center);
      
      // Pass the center to parent component
      if (onModelLoad) {
        onModelLoad(center);
      }
    }
  }, [gltf, onModelLoad]);

  useEffect(() => {
    // Set up animations for the three characters
    if (actions) {
      console.log('Available animations:', Object.keys(actions));
      
      // Try different animation name formats
      // Robot1: Pray animation
      if (actions['Pray']) {
        console.log('Playing Pray animation');
        actions['Pray'].play();
      }
      
      // Cyborg2: Sit animation
      if (actions['Sit']) {
        console.log('Playing Sit animation');
        actions['Sit'].play();
      }
      
      // Cyborg3: SitClap animation
      if (actions['SitClap']) {
        console.log('Playing SitClap animation');
        actions['SitClap'].play();
      }
      
      // Also try with prefixes if the above don't work
      Object.entries(actions).forEach(([name, action]) => {
        if (name.includes('Pray') || name.includes('Sit') || name.includes('SitClap')) {
          console.log(`Playing animation: ${name}`);
          action.play();
        }
      });
    }
  }, [actions]);

  // No auto-rotation - model will rotate at its center with OrbitControls

  return (
    <primitive 
      ref={modelRef}
      object={gltf.scene} 
      scale={0.7} 
      position={[0, -55, -15]}
      rotation={[0, Math.PI / 1.2, 0]}
    />
  );
}

// Preload the model
useGLTF.preload('/cathedral.glb');

function Cathedral() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas shadows camera={{ position: [0, -43, -49], fov: 40, near: 0.01, far: 200 }}>
      <StarField radius={150} count1={500} count2={300} />
             {/* <StarrySky /> */}
          <ConstellationModel  groupScale={[10, 10, 10]} groupPosition={[0, 15, -80]}    isVisible={true} />
        <OrbitControls 
            target={[0, -50, -5]}
            zoomToCursor={true}
            enablePan={false} 
            enableRotate={true} 
            enableZoom={true}
            zoomSpeed={0.7}
            // panSpeed={0.8}
            rotateSpeed={0.5}
            enableDamping={true}
            dampingFactor={0.9}
            minDistance={1}
            maxDistance={60}
            maxPolarAngle={Math.PI * 0.85}
            minPolarAngle={0}
            minAzimuthAngle={0}
            maxAzimuthAngle={Math.pi/2}
            autoRotate={false}
            makeDefault
            />
          
        
        <ambientLight intensity={0.3} />
        {/* <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
         */}

        <Suspense fallback={null}>
          <CathedralModel />
          <TickerCanvasTextureApplier is80sMode={false} />
          <Object2Replacer />
        </Suspense>
        <Environment preset="night" />
        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.8}
            luminanceSmoothing={0.7}
            height={400}
            blendFunction={BlendFunction.SCREEN}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export default Cathedral;