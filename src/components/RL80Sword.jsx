import React, { useRef, useEffect } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

export default function RL80Sword({ scale = 1, position = [0, 0, 0], rotation = [0, 0.5, 0] }) {
  const group = useRef();
  const { scene, animations } = useGLTF('/RL80_sword.glb');
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    // Play all animations with clamping and reset
    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach(action => {
        // Set to clamp when finished (play once and hold last frame)
        action.clampWhenFinished = true;
        
        // Set to not loop
        action.setLoop(THREE.LoopOnce);
        
        // Add event listener for when animation finishes
        action.getMixer().addEventListener('finished', (e) => {
          if (e.action === action) {
            // Reset the animation
            action.reset();
            // Play again
            action.play();
          }
        });
        
        // Start playing
        action.play();
      });
    }

    // Log animation names for debugging
    console.log('Available animations:', animations.map(anim => anim.name));
  }, [actions, animations]);

  return (
    <group ref={group} dispose={null}>
      <primitive 
        object={scene} 
        scale={scale}
        position={position}
        rotation={rotation}
      />
    </group>
  );
}

// Preload the model
useGLTF.preload('/RL80_sword.glb');