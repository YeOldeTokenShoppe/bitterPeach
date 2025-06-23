import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';

function VideoScreens() {
  const { scene } = useThree();
  const video1Ref = useRef();
  const video2Ref = useRef();
  const texture1Ref = useRef();
  const texture2Ref = useRef();

  useEffect(() => {
    // Create video elements
    const video1 = document.createElement('video');
    video1.src = '/23.mp4';
    video1.loop = true;
    video1.muted = true; // Required for autoplay
    video1.playsInline = true;
    video1.crossOrigin = 'anonymous';
    video1Ref.current = video1;

    const video2 = document.createElement('video');
    video2.src = '/23.mp4';
    video2.loop = true;
    video2.muted = true; // Required for autoplay
    video2.playsInline = true;
    video2.crossOrigin = 'anonymous';
    video2Ref.current = video2;

    // Create video textures
    const texture1 = new THREE.VideoTexture(video1);
    texture1.minFilter = THREE.LinearFilter;
    texture1.magFilter = THREE.LinearFilter;
    texture1.format = THREE.RGBFormat;
    texture1Ref.current = texture1;

    const texture2 = new THREE.VideoTexture(video2);
    texture2.minFilter = THREE.LinearFilter;
    texture2.magFilter = THREE.LinearFilter;
    texture2.format = THREE.RGBFormat;
    texture2Ref.current = texture2;

    // Find screens and apply textures
    const findAndSetupScreens = () => {
      let screen1Found = false;
      let screen2Found = false;

      scene.traverse((child) => {
        if (child.isMesh && child.name === 'Screen1' && !screen1Found) {
          // console.log('[VideoScreens] Found Screen1:', child);
          
          // Create material with video texture
          const material = new THREE.MeshBasicMaterial({
            map: texture1,
            side: THREE.FrontSide,
            toneMapped: false,
          });
          
          // Replace the material
          child.material = material;
          screen1Found = true;
          
          // Start video playback
          video1.play().catch(e => {
            console.log('[VideoScreens] Video 1 autoplay failed, waiting for user interaction');
          });
        }
        
        if (child.isMesh && child.name === 'Screen2' && !screen2Found) {
          console.log('[VideoScreens] Found Screen2:', child);
          
          // Create material with video texture
          const material = new THREE.MeshBasicMaterial({
            map: texture2,
            side: THREE.FrontSide,
            toneMapped: false,
          });
          
          // Replace the material
          child.material = material;
          screen2Found = true;
          
          // Start video playback
          video2.play().catch(e => {
            console.log('[VideoScreens] Video 2 autoplay failed, waiting for user interaction');
          });
        }
      });

      if (!screen1Found || !screen2Found) {
        console.log(`[VideoScreens] Screens found: Screen1=${screen1Found}, Screen2=${screen2Found}. Retrying...`);
        setTimeout(findAndSetupScreens, 500);
      } else {
        console.log('[VideoScreens] Both screens setup complete');
        
        // Add click handler to start videos if autoplay fails
        const handleInteraction = () => {
          video1.play().catch(() => {});
          video2.play().catch(() => {});
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('touchstart', handleInteraction);
        };
        
        document.addEventListener('click', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);
      }
    };

    findAndSetupScreens();

    // Cleanup
    return () => {
      if (video1Ref.current) {
        video1Ref.current.pause();
        video1Ref.current.src = '';
      }
      if (video2Ref.current) {
        video2Ref.current.pause();
        video2Ref.current.src = '';
      }
      if (texture1Ref.current) texture1Ref.current.dispose();
      if (texture2Ref.current) texture2Ref.current.dispose();
    };
  }, [scene]);

  return null;
}

export default VideoScreens;