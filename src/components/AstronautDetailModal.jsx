import React, { Suspense, useMemo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center, Html } from '@react-three/drei';
import * as THREE from 'three';

// Astronaut model specifically for the modal
function ModalAstronaut({ helmetTextureUrl }) {
  const { scene } = useGLTF('/astronaut1.glb'); 

  const astronautModel = useMemo(() => {
    const clonedScene = scene.clone();
    let textureToApply = null;

    if (helmetTextureUrl instanceof THREE.Texture) {
      textureToApply = helmetTextureUrl;
    } else if (typeof helmetTextureUrl === 'string') {
      console.log("ModalAstronaut received texture URL (needs loading - not implemented yet for strings):", helmetTextureUrl);
    }

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('helmet')) {
          if (textureToApply) {
            child.material.map = textureToApply;
            child.material.emissiveMap = textureToApply;
          }
          child.material.emissive = new THREE.Color(0x222277);
          child.material.emissiveIntensity = 0.5;
          child.material.needsUpdate = true;
        }
        if (nameLower.includes('glass')) {
          child.material.transparent = true;
          child.material.opacity = 0.2;
          child.material.color = new THREE.Color(0xbbccff);
          child.material.roughness = 0.1;
          child.material.metalness = 0.2;
          child.material.envMapIntensity = 0.8;
          child.material.side = THREE.DoubleSide;
          child.material.needsUpdate = true;
        }
      }
    });
    return clonedScene;
  }, [scene, helmetTextureUrl]);

  return <primitive object={astronautModel} scale={1}   rotation={[0, -Math.PI*0.5, 0]} />;
}

export default function AstronautDetailModal({ isOpen, onClose, astronautData }) {
  if (!isOpen || !astronautData) return null;

  const { username, texture } = astronautData;

  // console.log("AstronautDetailModal received astronautData:", astronautData);
  // console.log("AstronautDetailModal texture object:", texture);

  return (
      // Actual Modal Content - apply fixed positioning directly here
      <div 
        // onClick={(e) => e.stopPropagation()} // No longer needed if no backdrop
        style={{
          position: 'fixed', // Apply fixed positioning here
          top: '50px',
          right: '20px',
          width: '280px',
          maxHeight: 'calc(100vh - 100px)',
          backgroundColor: 'rgba(10, 20, 40, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(100, 120, 150, 0.5)',
          borderRadius: '12px',
          padding: '20px',
          color: 'white',
          zIndex: 1001, // Ensure it's above other UI
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
         
        }}
      >
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            background:'transparent', 
            border:'1px solid rgba(255,255,255,0.3)',
            color:'white', 
            fontSize:'14px',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            lineHeight: '1'
            // zIndex: 1002, // Ensure button is above other modal content if needed
          }}
          aria-label="Close"
        >
          &times;
        </button>
        <h4 style={{ marginTop: 0, marginBottom: '10px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
          {username || 'Astronaut Info'}
        </h4>
        
        <div style={{ width: '100%', height: '200px', borderRadius:'8px', background: 'rgba(0,0,0,0.2)', overflow:'hidden' }}>
          <Canvas shadows camera={{ position: [0, 0.2, 2.5], fov: 50 }}>
            <Suspense fallback={<Html center style={{color:'white'}}>Loading model...</Html>}>
              <ambientLight intensity={0.8} />
              <directionalLight position={[2, 3, 1]} intensity={1.2} />
              <Center>
                <ModalAstronaut helmetTextureUrl={texture} />
              </Center>
              <Environment preset="studio" background={false} blur={0.5} />
            </Suspense>
            <OrbitControls enableZoom={true} enablePan={false} minDistance={0.5} maxDistance={3} autoRotate={false} />
          </Canvas>
        </div>

        <div style={{fontSize: '0.9em', opacity: 0.8}}>
          <p>User: <strong>{username || 'N/A'}</strong></p>
        </div>
      </div>
  );
}

useGLTF.preload('/astronaut1.glb'); 