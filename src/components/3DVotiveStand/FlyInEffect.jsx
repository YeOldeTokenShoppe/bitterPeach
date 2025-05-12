import React, { useEffect, useRef } from 'react';
import * as THREE from "three";
import { gsap } from "gsap";
import { useRouter } from 'next/router';

const FlyInEffect = ({ cameraRef, controlsRef, onComplete }) => {
  const router = useRouter();
  const animationRef = useRef();

  useEffect(() => {
    console.log('FlyInEffect mounted');
    if (!cameraRef?.current || !controlsRef?.current) {
      console.log('Missing refs:', { cameraRef: !!cameraRef?.current, controlsRef: !!controlsRef?.current });
      return;
    }

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const target = new THREE.Vector3(0, 0, 0);

    // Store initial positions
    const initialPosition = camera.position.clone();
    const initialDistance = camera.position.distanceTo(target);

    // Calculate final position (zoomed in with vertical offset)
    const finalDistance = initialDistance * 0.01; // Zoom in to 1% of original distance
    const direction = new THREE.Vector3()
      .subVectors(target, initialPosition)
      .normalize();
    const finalPosition = new THREE.Vector3()
      .copy(target)
      .sub(direction.multiplyScalar(finalDistance))
      .add(new THREE.Vector3(0, 6, 0)); // Add vertical offset

    console.log('Starting fly-in effect', {
      initialPosition,
      finalPosition,
      initialDistance,
      finalDistance,
      controlsEnabled: controls.enabled
    });

    // Disable controls during animation
    controls.enabled = false;

    // Create animation
    animationRef.current = gsap.to(camera.position, {
      x: finalPosition.x,
      y: finalPosition.y,
      z: finalPosition.z,
      duration: 4,
      ease: "power2.inOut",
      onUpdate: () => {
        camera.lookAt(target);
      },
      onComplete: () => {
        console.log('Fly-in effect completed');
        // Re-enable controls
        controls.enabled = true;
        // Call the completion callback
        if (onComplete) onComplete();
        // Navigate to Synthwave page after a short delay
        setTimeout(() => {
          router.push('/synthwave');
        }, 1000);
      }
    });

    return () => {
      console.log('FlyInEffect cleanup');
      if (animationRef.current) {
        animationRef.current.kill();
      }
      controls.enabled = true;
    };
  }, [cameraRef, controlsRef, onComplete, router]);

  return null;
};

export default FlyInEffect;
