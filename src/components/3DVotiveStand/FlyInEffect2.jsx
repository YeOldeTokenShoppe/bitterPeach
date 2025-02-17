import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

function FlyInEffect2({ cameraRef, duration = 6 }) {
  const animationCompleted = useRef(false);

  useEffect(() => {
    if (!cameraRef.current || animationCompleted.current) return;

    const camera = cameraRef.current;
    animationCompleted.current = true;

    const targetPosition = [-6.86, 13.3, 12.19]; // Your MOBILE_CAMERA_SETTINGS position
    const targetLookAt = [-3, 22, -8.4]; // Your MOBILE_CONTROL_SETTINGS target

    // Start position modified to match new angle
    camera.position.set(-10, 35, 25);

    const tempLookAt = new THREE.Vector3(...targetLookAt);
    const customEase = gsap.parseEase("power3.out");

    // Use distance from camera to target as radius
    const radius = Math.sqrt(
      Math.pow(targetPosition[0] - targetLookAt[0], 2) +
        Math.pow(targetPosition[2] - targetLookAt[2], 2)
    );

    const tween = gsap.to(
      { progress: 0 },
      {
        progress: 1,
        duration: duration,
        ease: "power2.inOut",
        onUpdate: function () {
          if (!cameraRef.current) return;

          const progress = this.progress();
          const rotationProgress = customEase(progress);
          const rotation = rotationProgress * Math.PI * 2;

          const x = Math.sin(rotation) * radius + targetLookAt[0];
          const z = Math.cos(rotation) * radius + targetLookAt[2];

          const y = gsap.utils.interpolate(
            35,
            targetPosition[1],
            gsap.parseEase("power3.inOut")(progress)
          );

          cameraRef.current.position.set(x, y, z);
          cameraRef.current.lookAt(tempLookAt);
        },
      }
    );

    return () => tween?.kill();
  }, [cameraRef, duration]);

  return null;
}
export default FlyInEffect2;
