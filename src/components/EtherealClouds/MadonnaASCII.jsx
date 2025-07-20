import React, { useState, useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ASCIISpriteEffect from './ASCIISpriteEffect';

const MadonnaASCII = ({ 
  position = [0, 0, 0], 
  scale = 1, 
  showOriginal = false,
  asciiColor = '#00ff41',
  particleCount = 3000 
}) => {
  const { scene, animations } = useGLTF('/madonna-pose1.glb');
  const { actions } = useAnimations(animations, scene);
  const [targetMeshes, setTargetMeshes] = useState([]);
  const sceneRef = useRef();
  
  // Set up animation
  useEffect(() => {
    if (actions && actions['Action.001']) {
      const action = actions['Action.001'];
      action.reset();
      action.play();
      action.setLoop(THREE.LoopRepeat);
      console.log('Playing Action.001 animation');
    }
  }, [actions]);
  
  // Collect meshes for ASCII effect
  useEffect(() => {
    if (scene) {
      // Look for specific objects
      const importantMeshes = [];
      const meshNames = [];
      
      scene.traverse((child) => {
        // Look for body and clothing meshes
        if (child.isMesh || child.isSkinnedMesh) {
          // Skip collision and helper meshes
          if (child.name === 'collision' || child.name.includes('GoldCoin')) {
            return;
          }
          
          // Prioritize certain meshes
          const isImportant = child.name === 'Madonnina' || 
                            child.name.includes('Plane') ||
                            child.name.includes('8001') ||
                            child.name.includes('9001') ||
                            child.name === 'Torus';
          
          if (isImportant) {
            importantMeshes.push(child);
            meshNames.push(child.name);
          }
        }
      });
      
      console.log('Found important meshes:', meshNames);
      setTargetMeshes(importantMeshes);
    }
  }, [scene]);
  
  return (
    <group>
      {/* Always render the model to maintain animation */}
      <primitive 
        ref={sceneRef}
        object={scene} 
        position={position} 
        scale={scale}
        visible={showOriginal}
      />
      
      {/* ASCII sprite effect for multiple meshes */}
      {targetMeshes.length > 0 && (
        <group position={position} scale={[scale, scale, scale]}>
          <ASCIISpriteEffect 
            meshes={targetMeshes}
            particlesPerMesh={Math.floor(particleCount / targetMeshes.length / 3)}
            color={asciiColor}
            size={0.5}
            enableAnimation={true}
          />
        </group>
      )}
    </group>
  );
};

// Preload the model
useGLTF.preload('/madonna-pose1.glb');

export default MadonnaASCII;