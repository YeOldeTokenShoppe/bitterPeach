import { useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import Model from "./Model";

function VotiveStand() {
  const controlsRef = useRef();

  return (
    <Canvas>
      <OrbitControls ref={controlsRef} />

      <Model cameraControlsRef={controlsRef} />
    </Canvas>
  );
}

export default VotiveStand;
