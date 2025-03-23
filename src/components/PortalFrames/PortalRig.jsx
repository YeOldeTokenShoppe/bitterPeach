import * as THREE from "three";
import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";

function PortalRig({
  position = new THREE.Vector3(0, 0, 2),
  focus = new THREE.Vector3(0, 0, 0),
  currentParams,
}) {
  const { controls, scene } = useThree();

  useEffect(() => {
    // Find the active object by name based on the route
    if (currentParams?.id) {
      const active = scene.getObjectByName(currentParams.id);
      if (active) {
        // Calculate position and focus points based on active object
        active.parent.localToWorld(position.set(0, 0.5, 0.25));
        active.parent.localToWorld(focus.set(0, 0, -2));
      }
    }

    // Set camera controls to look at calculated points
    controls?.setLookAt(...position.toArray(), ...focus.toArray(), true);
  }, [controls, scene, currentParams, position, focus]);

  return (
    <CameraControls
      makeDefault
      minPolarAngle={0.5}
      maxPolarAngle={Math.PI / 2}
      minAzimuthAngle={-Math.PI / 2.5}
      maxAzimuthAngle={Math.PI / 2.5}
    />
  );
}

export default PortalRig;
