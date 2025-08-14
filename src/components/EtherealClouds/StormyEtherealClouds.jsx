import React, { useRef, useState, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import StormClouds from './StormClouds';
import PostProcessingEffects from '../3DVotiveStand/PostProcessingEffects';
import EnhancedVolumetricLight from './EnhancedVolumetricLight';
import StormySky from './StormySky';
import BurningDollarBills from './BurningDollarBills';
import RainEffect from './RainEffect';
import LightningSystem from './LightningSystem';

const MadonnaModel = ({ position = [0, -1, 1], scale = 1, goldCoinRef }) => {
  const { scene } = useGLTF('/madonnina-static-pose-no-animations.glb');
  
  React.useEffect(() => {
    console.log('=== All meshes in scene ===');
    const meshList = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        const bounds = new THREE.Box3().setFromObject(child);
        const size = new THREE.Vector3();
        bounds.getSize(size);
        
        meshList.push({
          name: child.name,
          parent: child.parent?.name,
          position: child.position,
          worldPosition: child.getWorldPosition(new THREE.Vector3()),
          size: size,
          visible: child.visible
        });
        
        console.log(`Mesh: ${child.name}`, {
          parent: child.parent?.name,
          position: `(${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`,
          size: `(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`,
        });
      }
    });
    
    const possibleFeet = meshList.filter(mesh => {
      return mesh.worldPosition.y < -10 || 
             mesh.name.toLowerCase().includes('foot') ||
             mesh.name.toLowerCase().includes('feet') ||
             mesh.name.toLowerCase().includes('shoe') ||
             mesh.name.toLowerCase().includes('leg');
    });
    
    console.log('=== Possible feet meshes ===', possibleFeet);
    
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name === 'collision') {
          child.visible = false;
          return;
        }
        
        if (child.parent?.name === 'lady' && child.parent?.parent?.name === 'lady') {
          child.visible = false;
          console.log('Hiding T-pose mesh:', child.name);
          return;
        }
        
        child.visible = true;
      }
    });
    
    let goldCoinMesh = scene.getObjectByName('GoldCoinBlank_GoldCoinBlank_0');
    if (!goldCoinMesh) {
      const goldCoinContainer = scene.getObjectByName('GoldCoin');
      if (goldCoinContainer) {
        goldCoinContainer.traverse((child) => {
          if (child.isMesh && !goldCoinMesh) {
            goldCoinMesh = child;
          }
        });
      }
    }
    
    if (goldCoinMesh && goldCoinRef) {
      goldCoinRef.current = goldCoinMesh;
      console.log('Found GoldCoin mesh for rotation');
    }
    
    scene.traverse((child) => {
      if (child.isMesh && child.visible) {
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
        }
        
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            mat.transparent = false;
            mat.opacity = 1;
            mat.side = THREE.DoubleSide;
            if (mat.metalness !== undefined) mat.metalness = 0.3;
            if (mat.roughness !== undefined) mat.roughness = 0.6;
          });
        }
      }
    });
    
    console.log('Scene structure:');
    scene.traverse((obj) => {
      if (obj.name) {
        console.log(`${obj.type}: ${obj.name}`);
      }
    });
    
  }, [scene, goldCoinRef]);
  
  return (
    <primitive 
      object={scene} 
      position={position} 
      scale={scale}
      rotation={[0, -0.5, 0]}
    />
  );
};

useGLTF.preload('/madonnina-static-pose-no-animations.glb');

const StormyEtherealClouds = () => {
  const goldCoinRef = React.useRef();
  const lightningFlashRef = useRef();
  const [lightningIntensity, setLightningIntensity] = useState(0);
  
  useFrame((state, delta) => {
    if (goldCoinRef.current) {
      goldCoinRef.current.rotateZ(0.01);
    }
    
    if (lightningFlashRef.current && lightningIntensity > 0) {
      lightningFlashRef.current.intensity = lightningIntensity;
      setLightningIntensity(prev => Math.max(0, prev - delta * 5));
    }
  });
  
  const triggerLightning = () => {
    setLightningIntensity(Math.random() * 3 + 2);
  };
  
  return (
    <>
      <StormySky />
      
      <ambientLight intensity={0.15} color="#3a4a5a" />
      
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={0.3} 
        color="#7a8a9a"
        castShadow
      />
      <directionalLight 
        position={[-5, 5, 5]} 
        intensity={0.2} 
        color="#6a7a8a"
      />
      
      <directionalLight 
        position={[0, 5, 10]} 
        intensity={0.25} 
        color="#8a9aaa"
      />
      
      <pointLight
        ref={lightningFlashRef}
        position={[0, 30, 0]}
        intensity={0}
        color="#e0f0ff"
        distance={200}
        decay={1.5}
      />
      
      <StormClouds />
      
      <PostProcessingEffects />
      
      <EnhancedVolumetricLight 
        position={[0, 120, 20]} 
        target={[3, -30, 0]}
        color="#8a9aaa"
        intensity={0.5}
      />
      
      <MadonnaModel position={[1, -15, -5]} scale={15} goldCoinRef={goldCoinRef} />
      
      {/* Spotlight on Madonna */}
      <spotLight
        position={[0, 20, 20]}
        target-position={[1, -15, -5]}
        angle={0.3}
        penumbra={0.5}
        intensity={2}
        color="#ffffff"
        castShadow
      />
      
      {/* Rim lighting from behind */}
      <spotLight
        position={[-10, 0, -20]}
        target-position={[1, -15, -5]}
        angle={0.4}
        penumbra={0.3}
        intensity={1.5}
        color="#8ac8ff"
      />
      
      {/* Fill light from below for dramatic effect */}
      <pointLight
        position={[1, -25, 5]}
        intensity={1}
        color="#ffffff"
        distance={30}
        decay={2}
      />
      
      {/* Holy glow around Madonna */}
      <pointLight
        position={[1, -10, -3]}
        intensity={0.8}
        color="#ffffcc"
        distance={25}
        decay={1.5}
      />
      
      <BurningDollarBills 
        count={40} 
        radius={30} 
        height={170} 
        speed={5}
        startY={120}
        endY={-50}
      />
      
      <RainEffect />
      
      <LightningSystem onLightning={triggerLightning} />
    </>
  );
};

export default StormyEtherealClouds;