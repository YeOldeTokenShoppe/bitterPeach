import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function CinematicCamera({ 
  onComplete, 
  duration = 6000, 
  startDelay = 500,
  enableLogging = false,
  autoStart = true
}) {
  const { camera, controls } = useThree();
  const progressRef = useRef(0);
  const isAnimatingRef = useRef(false);
  const startTimeRef = useRef(null);
  const [animationStarted, setAnimationStarted] = useState(false);
  
  // Camera path keyframes for dolly shot
  const keyframes = [
    {
      time: 0,
      position: new THREE.Vector3(-5.41, -47.69, -8.00), // Very close to statue
      lookAt: new THREE.Vector3(-5.63, -47.71, -7.57), // Looking at statue base
      fov: 45 // Narrower FOV for close-up
    },
    {
      time: 1,
      position: new THREE.Vector3(11.35, -55.59, -36.25), // Start pulling back
      lookAt: new THREE.Vector3(-0.58, -49.70, -10.19), // Still focused on statue
      fov: 55
    },
    // {
    //   time: 0.5,
    //   position: new THREE.Vector3(-10, -45, -30), // Pull back and start moving to side
    //   lookAt: new THREE.Vector3(0, -50, -10), // Start looking at wider scene
    //   fov: 35
    // },
    // {
    //   time: 0.8,
    //   position: new THREE.Vector3(-15, -44, -40), // Further to the side
    //   lookAt: new THREE.Vector3(0, -50, -5), // Look at cathedral center
    //   fov: 38
    // },
    // {
    //   time: 1,
    //   position: new THREE.Vector3(0.37, -52.12, -50.52), // Final position
    //   lookAt: new THREE.Vector3(0.00, -50.00, -5.00), // Final look at
    //   fov: 60 // Original FOV
    // }
  ];
  
  // Logging helper
  const logCameraState = (label = 'Camera') => {
    if (!enableLogging) return;
    
    const state = {
      position: {
        x: camera.position.x.toFixed(2),
        y: camera.position.y.toFixed(2),
        z: camera.position.z.toFixed(2)
      },
      rotation: {
        x: (camera.rotation.x * 180 / Math.PI).toFixed(2) + '°',
        y: (camera.rotation.y * 180 / Math.PI).toFixed(2) + '°',
        z: (camera.rotation.z * 180 / Math.PI).toFixed(2) + '°'
      },
      fov: camera.fov?.toFixed(1) || 'N/A',
      lookingAt: controls?.target ? {
        x: controls.target.x.toFixed(2),
        y: controls.target.y.toFixed(2),
        z: controls.target.z.toFixed(2)
      } : 'N/A'
    };
    
    console.log(`📸 ${label}:`, state);
    console.log(`Copy for keyframe: { position: new THREE.Vector3(${state.position.x}, ${state.position.y}, ${state.position.z}), lookAt: new THREE.Vector3(${state.lookingAt?.x || 0}, ${state.lookingAt?.y || 0}, ${state.lookingAt?.z || 0}), fov: ${state.fov} }`);
  };
  
  // Get interpolated values between keyframes
  const getInterpolatedKeyframe = (progress) => {
    // Find which keyframes we're between
    let fromIndex = 0;
    let toIndex = 1;
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
        fromIndex = i;
        toIndex = i + 1;
        break;
      }
    }
    
    const from = keyframes[fromIndex];
    const to = keyframes[toIndex];
    
    // Calculate local progress between these keyframes
    const localProgress = (progress - from.time) / (to.time - from.time);
    
    return { from, to, localProgress };
  };
  
  useEffect(() => {
    if (!autoStart) return;
    
    // Disable controls during animation
    if (controls) {
      controls.enabled = false;
    }
    
    // Set initial camera state
    const firstKeyframe = keyframes[0];
    camera.position.copy(firstKeyframe.position);
    camera.fov = firstKeyframe.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(firstKeyframe.lookAt);
    
    logCameraState('Initial Position');
    
    // Start animation after delay
    const delayTimeout = setTimeout(() => {
      isAnimatingRef.current = true;
      startTimeRef.current = Date.now();
      setAnimationStarted(true);
      logCameraState('Animation Started');
    }, startDelay);
    
    return () => {
      clearTimeout(delayTimeout);
      isAnimatingRef.current = false;
      if (controls) {
        controls.enabled = true;
      }
    };
  }, [camera, controls, startDelay, autoStart]);
  
  // Skip animation function
  const skipAnimation = useCallback(() => {
    if (!isAnimatingRef.current) return;
    
    isAnimatingRef.current = false;
    progressRef.current = 1;
    
    // Set camera to final position
    const finalKeyframe = keyframes[keyframes.length - 1];
    camera.position.copy(finalKeyframe.position);
    camera.fov = finalKeyframe.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(finalKeyframe.lookAt);
    
    // Update controls
    if (controls) {
      controls.target.copy(finalKeyframe.lookAt);
      controls.enabled = true;
      controls.update();
    }
    
    console.log('⏭️ Animation Skipped');
    logCameraState('Animation Skipped - Final Position');
    
    if (onComplete) {
      onComplete();
    }
  }, [camera, controls, onComplete, logCameraState]);

  // Keyboard controls for logging and skipping
  useEffect(() => {
    const handleKeyPress = (e) => {
      switch(e.key.toLowerCase()) {
        case 'c':
          logCameraState('Manual Log');
          break;
        case 'p':
          // Pause/resume animation
          if (isAnimatingRef.current) {
            isAnimatingRef.current = false;
            console.log('⏸️  Animation Paused');
          } else if (animationStarted && progressRef.current < 1) {
            isAnimatingRef.current = true;
            startTimeRef.current = Date.now() - (progressRef.current * duration);
            console.log('▶️  Animation Resumed');
          }
          break;
        case 'r':
          // Restart animation
          progressRef.current = 0;
          startTimeRef.current = Date.now();
          isAnimatingRef.current = true;
          setAnimationStarted(true);
          console.log('🔄 Animation Restarted');
          break;
        case 'escape':
          // Skip animation
          skipAnimation();
          break;
      }
    };
    
    // Handle click/touch to skip
    const handleSkipClick = (e) => {
      // Only skip if animation is running
      if (isAnimatingRef.current) {
        skipAnimation();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleSkipClick);
    window.addEventListener('touchstart', handleSkipClick);
    
    if (enableLogging || isAnimatingRef.current) {
      console.log('🎬 Cinematic Camera Controls:');
      if (enableLogging) {
        console.log('  C - Log current camera state');
        console.log('  P - Pause/Resume animation');
        console.log('  R - Restart animation');
      }
      console.log('  ESC or Click/Tap - Skip animation');
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleSkipClick);
      window.removeEventListener('touchstart', handleSkipClick);
    };
  }, [enableLogging, animationStarted, duration, skipAnimation]);
  
  useFrame(() => {
    if (!isAnimatingRef.current) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min(elapsed / duration, 1);
    progressRef.current = progress;
    
    // Debug logging for timing
    if (enableLogging && elapsed < 100) {
      console.log(`🎬 Animation started - Duration: ${duration}ms`);
    }
    
    // Ease in-out cubic function for smooth motion
    const easeInOutCubic = (t) => {
      return t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };
    
    // Apply easing only once to the overall progress
    const easedProgress = easeInOutCubic(progress);
    const { from, to, localProgress } = getInterpolatedKeyframe(easedProgress);
    
    // Use linear interpolation between keyframes (no double easing)
    // This creates smooth continuous motion
    camera.position.lerpVectors(from.position, to.position, localProgress);
    
    // Interpolate FOV
    camera.fov = THREE.MathUtils.lerp(from.fov, to.fov, localProgress);
    camera.updateProjectionMatrix();
    
    // Interpolate look at target
    const currentLookAt = new THREE.Vector3().lerpVectors(from.lookAt, to.lookAt, localProgress);
    camera.lookAt(currentLookAt);
    
    // Update controls target if they exist
    if (controls && controls.target) {
      controls.target.copy(currentLookAt);
    }
    
    // Log at milestones
    if (enableLogging) {
      const milestones = [0.25, 0.5, 0.75];
      milestones.forEach(milestone => {
        if (Math.abs(progress - milestone) < 0.01 && Math.abs(progressRef.current - milestone) > 0.02) {
          logCameraState(`Progress ${(milestone * 100).toFixed(0)}%`);
        }
      });
    }
    
    // Check if animation is complete
    if (progress >= 1) {
      isAnimatingRef.current = false;
      
      // Re-enable controls
      if (controls) {
        controls.enabled = true;
        controls.update();
      }
      
      if (enableLogging) {
        const totalTime = Date.now() - startTimeRef.current;
        console.log(`⏱️ Animation completed in ${totalTime}ms (expected: ${duration}ms)`);
      }
      
      logCameraState('Animation Complete');
      
      if (onComplete) {
        onComplete();
      }
    }
  });
  
  return null;
}

export default CinematicCamera;