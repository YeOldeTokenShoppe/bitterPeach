import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor, MeshPortalMaterial, Text } from "@react-three/drei";
import { useRoute, useLocation } from "wouter";
import { easing } from "maath";

function PortalFrame({
  id,
  name,
  author,
  bg = "#ffffff",
  width = 1,
  height = 1.61803398875, // Golden ratio by default
  children,
  ...props
}) {
  const portal = useRef();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/item/:id");
  const [hovered, hover] = useState(false);

  // Enable cursor change when hovering
  useCursor(hovered);

  // Animate the portal blend based on route
  useFrame((state, dt) => {
    if (portal.current) {
      easing.damp(portal.current, "blend", params?.id === id ? 1 : 0, 0.2, dt);
    }
  });

  return (
    <group {...props}>
      {/* Title text */}
      <Text
        fontSize={0.3}
        anchorY="top"
        anchorX="left"
        lineHeight={0.8}
        position={[-0.375, 0.715, 0.01]}
        material-toneMapped={false}
      >
        {name}
      </Text>

      {/* ID text */}
      <Text
        fontSize={0.1}
        anchorX="right"
        position={[0.4, -0.659, 0.01]}
        material-toneMapped={false}
      >
        /{id}
      </Text>

      {/* Author text */}
      <Text
        fontSize={0.04}
        anchorX="right"
        position={[0.0, -0.677, 0.01]}
        material-toneMapped={false}
      >
        {author}
      </Text>

      {/* Portal mesh */}
      <mesh
        name={id}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setLocation("/item/" + e.object.name);
        }}
        onPointerOver={(e) => hover(true)}
        onPointerOut={() => hover(false)}
      >
        <roundedPlaneGeometry args={[width, height, 0.1]} />
        <MeshPortalMaterial
          ref={portal}
          events={params?.id === id}
          side={THREE.DoubleSide}
        >
          <color attach="background" args={[bg]} />
          {children}
        </MeshPortalMaterial>
      </mesh>
    </group>
  );
}

export default PortalFrame;
