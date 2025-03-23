import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

function ReturnButton3D({ currentParams, onNavigate }) {
  const groupRef = useRef();
  const [hovered, setHovered] = useState(false);

  // Only show when viewing an item
  const isActive = !!currentParams?.id;

  useFrame((state) => {
    if (!groupRef.current || !isActive) return;

    // Always face the camera
    groupRef.current.quaternion.copy(state.camera.quaternion);

    // Position in front of camera, slightly to the left
    const offset = new THREE.Vector3(-0.8, -0.6, -1.5);
    offset.applyQuaternion(state.camera.quaternion);
    groupRef.current.position.copy(state.camera.position).add(offset);

    // Slightly pulse when hovered
    const scale = hovered
      ? 1 + Math.sin(state.clock.elapsedTime * 5) * 0.05
      : 1;
    groupRef.current.scale.set(scale, scale, scale);
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef}>
      <mesh
        onClick={() => onNavigate("/")}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <planeGeometry args={[0.6, 0.2, 1]} />
        <meshBasicMaterial color={hovered ? "#ff9f1c" : "#ffffff"} />

        <Text
          position={[0, 0, 0.01]}
          fontSize={0.08}
          color="#000000"
          anchorX="center"
          anchorY="middle"
        >
          ← BACK
        </Text>
      </mesh>
    </group>
  );
}

export default ReturnButton3D;
