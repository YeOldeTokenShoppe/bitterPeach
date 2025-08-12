import React, { useRef, useState, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Character model configurations
const CHARACTER_LIBRARY = [
  { 
    id: 'cyborg0',
    path: '/models/cyborg0.glb',
    animations: ['Pray', 'Stand', 'SAMBA0', 'SALSA'],
    scale: [1, 1, 1]
  },
  { 
    id: 'cyborg2',
    path: '/models/cyborg2.glb',
    animations: ['Sit', 'SitIdle2', 'SitClap', 'Cheer'],
    scale: [1, 1, 1]
  },
  { 
    id: 'cyborg3',
    path: '/models/cyborg3.glb',
    animations: ['SitIdle2', 'StandClap', 'SitClap'],
    scale: [1, 1, 1]
  },
  { 
    id: 'cyborg4',
    path: '/models/cyborg4.glb',
    animations: ['Leaning', 'Stand', 'BBOYHIPHOP'],
    scale: [1, 1, 1]
  },
  { 
    id: 'cyborgAlley',
    path: '/models/cyborgAlley.glb',
    animations: ['StandDrink', 'GUITAR', 'SALSA'],
    scale: [1, 1, 1]
  }
];

// Spawn points in the cathedral
const SPAWN_POINTS = [
  { position: [0, 0, 5], rotation: [0, Math.PI, 0], type: 'altar' },
  { position: [-8, 0, 3], rotation: [0, Math.PI/4, 0], type: 'corner' },
  { position: [8, 0, 3], rotation: [0, -Math.PI/4, 0], type: 'corner' },
  { position: [-12, 0, 0], rotation: [0, Math.PI/2, 0], type: 'wall' },
  { position: [12, 0, 0], rotation: [0, -Math.PI/2, 0], type: 'wall' },
  { position: [0, 0, -5], rotation: [0, 0, 0], type: 'center' },
  { position: [-6, 0, -8], rotation: [0, Math.PI/6, 0], type: 'back' },
  { position: [6, 0, -8], rotation: [0, -Math.PI/6, 0], type: 'back' },
  { position: [-10, 0, 8], rotation: [0, Math.PI*3/4, 0], type: 'side' },
  { position: [10, 0, 8], rotation: [0, -Math.PI*3/4, 0], type: 'side' }
];

// Individual character component
function DynamicCharacter({ config, spawnPoint, isPlaying }) {
  const gltf = useGLTF(config.path);
  const group = useRef();
  const { actions, mixer } = useAnimations(gltf.animations, group);
  const [currentAnimation, setCurrentAnimation] = useState(null);
  
  // Initialize with random idle animation
  useEffect(() => {
    if (!actions) return;
    
    const idleAnims = config.animations.filter(a => 
      !a.includes('SAMBA') && !a.includes('SALSA') && !a.includes('GUITAR')
    );
    const randomIdle = idleAnims[Math.floor(Math.random() * idleAnims.length)];
    
    if (actions[randomIdle]) {
      actions[randomIdle].reset();
      actions[randomIdle].setLoop(THREE.LoopRepeat);
      actions[randomIdle].play();
      setCurrentAnimation(randomIdle);
    }
  }, [actions, config.animations]);
  
  // Switch animations based on music
  useEffect(() => {
    if (!actions || !currentAnimation) return;
    
    if (isPlaying) {
      // Stop current animation
      if (actions[currentAnimation]) {
        actions[currentAnimation].fadeOut(0.5);
      }
      
      // Play dance animation
      const danceAnims = config.animations.filter(a => 
        a.includes('SAMBA') || a.includes('SALSA') || a.includes('GUITAR') || a.includes('HIPHOP')
      );
      const randomDance = danceAnims[Math.floor(Math.random() * danceAnims.length)];
      
      if (actions[randomDance]) {
        actions[randomDance].reset();
        actions[randomDance].fadeIn(0.5);
        actions[randomDance].setLoop(THREE.LoopRepeat);
        actions[randomDance].play();
        setCurrentAnimation(randomDance);
      }
    } else {
      // Return to idle
      const idleAnims = config.animations.filter(a => 
        !a.includes('SAMBA') && !a.includes('SALSA') && !a.includes('GUITAR')
      );
      const randomIdle = idleAnims[Math.floor(Math.random() * idleAnims.length)];
      
      if (actions[currentAnimation]) {
        actions[currentAnimation].fadeOut(0.5);
      }
      
      if (actions[randomIdle]) {
        actions[randomIdle].reset();
        actions[randomIdle].fadeIn(0.5);
        actions[randomIdle].setLoop(THREE.LoopRepeat);
        actions[randomIdle].play();
        setCurrentAnimation(randomIdle);
      }
    }
  }, [isPlaying, actions, config.animations]);
  
  // Update mixer
  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
  });
  
  return (
    <group ref={group}>
      <primitive 
        object={gltf.scene} 
        position={spawnPoint.position}
        rotation={spawnPoint.rotation}
        scale={config.scale}
      />
    </group>
  );
}

// Main dynamic character system
export default function DynamicCharacterSystem({ isPlaying, maxCharacters = 5 }) {
  const [characterSetup, setCharacterSetup] = useState([]);
  
  // Generate random character placement on mount
  useEffect(() => {
    const setup = [];
    const availableSpawns = [...SPAWN_POINTS];
    const availableCharacters = [...CHARACTER_LIBRARY];
    
    // Randomly select characters and positions
    for (let i = 0; i < Math.min(maxCharacters, availableSpawns.length); i++) {
      // Pick random character
      const charIndex = Math.floor(Math.random() * availableCharacters.length);
      const character = availableCharacters[charIndex];
      
      // Pick random spawn point
      const spawnIndex = Math.floor(Math.random() * availableSpawns.length);
      const spawn = availableSpawns[spawnIndex];
      availableSpawns.splice(spawnIndex, 1);
      
      setup.push({
        character,
        spawn,
        key: `${character.id}_${i}`
      });
    }
    
    setCharacterSetup(setup);
    console.log('Generated character setup:', setup);
  }, [maxCharacters]);
  
  return (
    <>
      {characterSetup.map(({ character, spawn, key }) => (
        <DynamicCharacter
          key={key}
          config={character}
          spawnPoint={spawn}
          isPlaying={isPlaying}
        />
      ))}
    </>
  );
}

// Preload all character models
CHARACTER_LIBRARY.forEach(char => {
  useGLTF.preload(char.path);
});