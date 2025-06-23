// Theatre.js Camera Animation Example
// This shows how to properly use Theatre.js for camera animations

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getProject } from '@theatre/core';
import studio from '@theatre/studio';

const TheatreJsExample = () => {
  const mountRef = useRef(null);
  
  useEffect(() => {
    // Initialize Theatre.js studio in development
    if (process.env.NODE_ENV === 'development') {
      studio.initialize();
    }
    
    // Create project
    const project = getProject('CameraAnimation');
    const sheet = project.sheet('Scene');
    
    // Create Three.js scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
    
    // Add a cube to look at
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // Create Theatre.js object for camera
    const cameraObject = sheet.object('Camera', {
      position: {
        x: 5,
        y: 5,
        z: 5
      },
      rotation: {
        x: 0,
        y: 0,
        z: 0
      }
    });
    
    // Subscribe to value changes
    cameraObject.onValuesChange((values) => {
      camera.position.x = values.position.x;
      camera.position.y = values.position.y;
      camera.position.z = values.position.z;
      camera.rotation.x = values.rotation.x;
      camera.rotation.y = values.rotation.y;
      camera.rotation.z = values.rotation.z;
    });
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    
    // Play the animation
    sheet.sequence.play({ iterationCount: Infinity, range: [0, 4] });
    
    // Cleanup
    return () => {
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);
  
  return <div ref={mountRef} />;
};

export default TheatreJsExample;

/* 
USAGE NOTES:

1. Theatre.js Studio:
   - Press Ctrl+Space to toggle the studio UI
   - Use the studio to create keyframes visually
   - Export the state using studio.createContentOfSaveFile()

2. Programmatic Keyframes:
   - You can set keyframes programmatically, but it's more complex
   - Theatre.js is designed for visual editing

3. For your camera fly-in:
   - The implementation in PalmTreeDrive.jsx uses a hybrid approach
   - It uses a single "progress" value that interpolates between your existing keyframes
   - This allows you to keep your existing keyframe data while using Theatre.js

4. To enable the Theatre.js studio for editing:
   - The studio will appear when running in development mode
   - You can adjust the camera animation visually
   - Save the state and load it back later
*/