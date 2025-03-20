import { OrbitControls } from "@react-three/drei";

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
