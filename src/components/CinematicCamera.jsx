import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function CinematicCamera({ 
  onComplete, 
  duration = 4000, 
  startDelay = 500,
  startPosition = [30, -30, -80],
  endPosition = [0, -43, -49],
  lookAtTarget = [0, -50, -5],
  dynamicLookAt = true
}) {
  const { camera } = useThree();
  const progressRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const startTimeRef = useRef(null);
  
  // Convert arrays to Vector3
  const startPos = new THREE.Vector3(...startPosition);
  const endPos = new THREE.Vector3(...endPosition);
  const lookAt = new THREE.Vector3(...lookAtTarget);
  
  useEffect(() => {
    // Set initial camera position
    camera.position.copy(startPos);
    camera.lookAt(lookAt);
    
    // Start animation after delay
    const delayTimeout = setTimeout(() => {
      isAnimatingRef.current = true;
      startTimeRef.current = Date.now();
    }, startDelay);
    
    return () => {
      clearTimeout(delayTimeout);
      isAnimatingRef.current = false;
    };
  }, [camera, startDelay, startPos, lookAt]);
  
  useFrame(() => {
    if (!isAnimatingRef.current) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease in-out cubic function for smooth motion
    const easeInOutCubic = (t) => {
      return t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    
    const easedProgress = easeInOutCubic(progress);
    
    // Interpolate camera position
    const currentPosition = new THREE.Vector3().lerpVectors(
      startPos, 
      endPos, 
      easedProgress
    );
    
    camera.position.copy(currentPosition);
    
    // Slightly adjust look-at target for more dynamic movement
    if (dynamicLookAt) {
      const dynamicTarget = lookAt.clone();
      dynamicTarget.y += Math.sin(easedProgress * Math.PI) * 2; // Subtle vertical drift
      camera.lookAt(dynamicTarget);
    } else {
      camera.lookAt(lookAt);
    }
    
    // Check if animation is complete
    if (progress >= 1) {
      isAnimatingRef.current = false;
      camera.lookAt(lookAt); // Final look at exact target
      if (onComplete) {
        onComplete();
      }
    }
    
    progressRef.current = progress;
  });
  
  return null;
}

export default CinematicCamera;