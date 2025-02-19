import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

function FlyInEffect({ cameraRef, controlsRef, duration = 4 }) {
  const animationCompleted = useRef(false);

  useEffect(() => {
    if (
      !cameraRef?.current ||
      !controlsRef?.current ||
      animationCompleted.current
    )
      return;

    const camera = cameraRef.current;
    const controls = controlsRef.current;
    animationCompleted.current = true;

    // Store original target and position for reference
    const targetPosition = new THREE.Vector3();
    controls.target.clone(targetPosition);
    const finalCameraPosition = new THREE.Vector3().copy(camera.position);

    // Disable controls during animation
    controls.enabled = false;

    // Initial setup - start from above the scene
    const startDistance = 100;
    camera.position.set(0, startDistance, 0);

    // Create a temporary target that will move toward the final target
    const tempTarget = new THREE.Vector3(0, 0, 0);
    controls.target.copy(tempTarget);

    // Create a timeline for sequential animations
    const tl = gsap.timeline({
      onComplete: () => {
        // Re-enable controls after animation
        controls.enabled = true;
      },
    });

    // Animate camera position
    tl.to(camera.position, {
      x: finalCameraPosition.x,
      y: finalCameraPosition.y,
      z: finalCameraPosition.z,
      duration: duration * 0.8,
      ease: "power2.inOut",
    });

    // Simultaneously animate the orbit controls target
    tl.to(
      tempTarget,
      {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: duration * 0.8,
        ease: "power2.inOut",
        onUpdate: () => {
          controls.target.copy(tempTarget);
          controls.update();
        },
      },
      "<"
    ); // Start at same time as previous animation

    return () => {
      // Clean up animations if component unmounts during animation
      tl.kill();
    };
  }, [cameraRef, controlsRef, duration]);

  return null;
}

export default FlyInEffect;
