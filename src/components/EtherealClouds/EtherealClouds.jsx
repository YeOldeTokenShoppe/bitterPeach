import React from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import DarkClouds from '../3DVotiveStand/Clouds';
import PostProcessingEffects from '../3DVotiveStand/PostProcessingEffects';
import EnhancedVolumetricLight from './EnhancedVolumetricLight';
import SkySphere from './SkySphere';
import SpiralDollarBills from './SpiralDollarBills';

// Madonna Model Component
const MadonnaModel = ({ position = [0, -1, 1], scale = 1, goldCoinRef }) => {
  const { scene } = useGLTF('/madonnina-static-pose-no-animations.glb');
  
  React.useEffect(() => {
    // Log all meshes to identify the duplicate feet
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
    
    // Look for meshes that might be feet based on position or name
    const possibleFeet = meshList.filter(mesh => {
      // Check if mesh is low (feet would be at negative Y)
      // or if name contains foot-related terms
      return mesh.worldPosition.y < -10 || 
             mesh.name.toLowerCase().includes('foot') ||
             mesh.name.toLowerCase().includes('feet') ||
             mesh.name.toLowerCase().includes('shoe') ||
             mesh.name.toLowerCase().includes('leg');
    });
    
    console.log('=== Possible feet meshes ===', possibleFeet);
    
    // Standard visibility setup
    scene.traverse((child) => {
      if (child.isMesh) {
        // Hide collision mesh
        if (child.name === 'collision') {
          child.visible = false;
          return;
        }
        
        // Hide the T-pose version
        if (child.parent?.name === 'lady' && child.parent?.parent?.name === 'lady') {
          child.visible = false;
          console.log('Hiding T-pose mesh:', child.name);
          return;
        }
        
        // Show everything else
        child.visible = true;
      }
    });
    
    // Find the GoldCoin object
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
    
    // Configure materials only for visible meshes
    scene.traverse((child) => {
      if (child.isMesh && child.visible) {
        // Enable skinning if needed
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
        }
        
        // Handle materials
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            mat.transparent = false;
            mat.opacity = 1;
            mat.side = THREE.DoubleSide;
            if (mat.metalness !== undefined) mat.metalness = 0.1;
            if (mat.roughness !== undefined) mat.roughness = 0.8;
          });
        }
      }
    });
    
    // Log scene structure for debugging
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

// Preload the model
useGLTF.preload('/madonnina-static-pose-no-animations.glb');

const EtherealClouds = () => {
  const goldCoinRef = React.useRef();
  
  // Rotate the gold coin around its own axis
  useFrame((state, delta) => {
    if (goldCoinRef.current) {
      goldCoinRef.current.rotateZ(0.01);
    }
  });
  
  return (
    <>
      {/* Sky sphere background */}
      <SkySphere />
      
      {/* Additional lights for better model visibility */}
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1.2} 
        castShadow
      />
      <directionalLight 
        position={[-5, 5, 5]} 
        intensity={0.8} 
        color="#ffffff"
      />
      
      {/* Front light to ensure clothing details are visible */}
      <directionalLight 
        position={[0, 5, 10]} 
        intensity={1.0} 
        color="#ffffff"
      />
      
      {/* Dark clouds for atmosphere */}
      <DarkClouds />
      
      {/* Post-processing effects */}
      <PostProcessingEffects />
      
      {/* Enhanced volumetric light rays */}
      <EnhancedVolumetricLight 
        position={[0, 120, 20]} 
        target={[3, -30, 0]}
        color="#ffffee"
        intensity={2.0}
      />
      
      {/* Madonna Model in center */}
      <MadonnaModel position={[1, -15, -5]} scale={15} goldCoinRef={goldCoinRef} />
      
      {/* Spiraling Dollar Bills */}
      <SpiralDollarBills 
        count={40} 
        radius={30} 
        height={170} 
        speed={3}
        startY={120}
        endY={-50}
      />
    </>
  );
};

export default EtherealClouds;