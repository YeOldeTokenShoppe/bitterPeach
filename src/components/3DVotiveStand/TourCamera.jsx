import { useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";

export default function TourCamera({ points }) {
  const { camera } = useThree();
  const controls = useRef();

  useEffect(() => {
    let timeline = gsap.timeline({ repeat: 0 }); // Ensure it only plays once

    // Loop through points and animate the camera
    points.forEach((point, index) => {
      timeline.to(
        camera.position,
        {
          x: point.position[0],
          y: point.position[1],
          z: point.position[2],
          duration: 2, // Duration of the "swoop"
          ease: "power2.inOut",
          onUpdate: () => {
            camera.lookAt(...point.lookAt); // Update the camera's lookAt
            controls.current?.update(); // Update OrbitControls
          },
        },
        index * 3 // Delay each swoop (index * 3 seconds)
      );
    });

    return () => {
      timeline.kill(); // Cleanup on component unmount
    };
  }, [camera, points]);

  return <OrbitControls ref={controls} />;
}
