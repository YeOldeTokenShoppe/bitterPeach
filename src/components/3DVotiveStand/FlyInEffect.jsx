import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";
import { getCameraConfig, getScreenCategory } from "./cameraConfig";

function FlyInEffect({ cameraRef, duration = 4 }) {
  const animationCompleted = useRef(false);

  useEffect(() => {
    if (!cameraRef.current || animationCompleted.current) return;

    const camera = cameraRef.current;
    animationCompleted.current = true;

    const config = getCameraConfig();
    const category = getScreenCategory();

    if (category.startsWith("phone")) {
      camera.position.set(...config.position);
      camera.lookAt(new THREE.Vector3(...config.target));
      return;
    }

    // Initial setup
    const startDistance = 100;
    camera.position.set(0, startDistance, 0);

    const tempLookAt = new THREE.Vector3();
    const targetLookAt = new THREE.Vector3(...config.target);

    // Create a timeline for sequential animations
    const tl = gsap.timeline();

    // First animation: fly in to initial position
    tl.to(camera.position, {
      x: config.position[0],
      y: config.position[1],
      z: config.position[2],
      duration: duration * 0.8, // Use 70% of total duration for first animation
      ease: "power2.inOut",
      onUpdate: () => {
        tempLookAt.lerp(targetLookAt, 0.1);
        camera.lookAt(tempLookAt);
      },
    });

    // Second animation: subtle zoom in
    // tl.to(camera.position, {
    //   x: config.position[0] * 0.75, // Move 15% closer
    //   y: config.position[1] * 0.75,
    //   z: config.position[2] * 0.75,
    //   duration: duration * 0.4, // Use remaining 30% of duration
    //   ease: "power1.inOut",
    //   onUpdate: () => {
    //     camera.lookAt(targetLookAt);
    //   },
    // });
  }, [cameraRef, duration]);

  return null;
}

export default FlyInEffect;
