import { useEffect } from "react";
import * as THREE from "three";
import { gsap } from "gsap";

const FlyInEffect = ({ cameraRef, controlsRef, duration = 6 }) => {
  useEffect(() => {
    if (!cameraRef.current) return; // wait until camera is available

    const camera = cameraRef.current;
    // Get the current target from OrbitControls (fallback to (0,0,0) if not available)
    const target =
      controlsRef.current && controlsRef.current.target
        ? controlsRef.current.target.clone()
        : new THREE.Vector3(0, 0, 0);

    // Final camera position (predefined via setCameraSettings) is already in place.
    const finalPos = camera.position.clone();

    // Determine the vector from the target to the final camera position.
    const finalVector = new THREE.Vector3().subVectors(finalPos, target);
    const finalDistance = finalVector.length();
    const finalAngle = Math.atan2(finalVector.z, finalVector.x);

    // Define parameters for a combined orbit and zoom effect:
    // - Start with a significantly farther distance (e.g., 4.5 times the final distance)
    // - Start with an angle offset such that we can perform an extra full rotation (2π) over the duration
    // - Start at a higher Y to give a dramatic descent effect.
    const startDistance = finalDistance * 4.5;
    // Starting angle is offset from finalAngle – here we add an extra 180° offset as base.
    const startAngle = finalAngle + THREE.MathUtils.degToRad(180);
    const startY = finalPos.y + 20; // Starting height offset

    // Compute starting position.
    const startX = target.x + startDistance * Math.cos(startAngle);
    const startZ = target.z + startDistance * Math.sin(startAngle);
    const startPos = new THREE.Vector3(startX, startY, startZ);

    // Set the camera immediately to the starting position.
    camera.position.copy(startPos);
    camera.lookAt(target);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }

    // Create a dummy object with properties to tween.
    const dummy = { angle: startAngle, distance: startDistance, y: startY };

    // Animate all three properties simultaneously.
    gsap.to(dummy, {
      angle: finalAngle + Math.PI * 2, // add a full rotation (2π) then settle to finalAngle
      distance: finalDistance,
      y: finalPos.y,
      duration: duration,
      ease: "power2.inOut",
      onUpdate: () => {
        const currentX = target.x + dummy.distance * Math.cos(dummy.angle);
        const currentZ = target.z + dummy.distance * Math.sin(dummy.angle);

        camera.position.set(currentX, dummy.y, currentZ);
        camera.lookAt(target);
        if (controlsRef.current) {
          controlsRef.current.target.copy(target);
          controlsRef.current.update();
        }
      },
      onComplete: () => {
        // Ensure the camera exactly reaches the predefined final position.
        camera.position.copy(finalPos);
        camera.lookAt(target);
        if (controlsRef.current) {
          controlsRef.current.target.copy(target);
          controlsRef.current.update();
        }
      },
    });
  }, [cameraRef, controlsRef, duration]);

  return null; // This component doesn't render any JSX
};

export default FlyInEffect;
