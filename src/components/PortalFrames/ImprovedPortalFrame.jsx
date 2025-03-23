import * as THREE from "three";
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useCursor, MeshPortalMaterial, Text } from "@react-three/drei";
import { easing } from "maath";

function PortalFrame({
  id,
  name,
  author,
  bg = "#ffffff",
  width = 1,
  height = 1.61803398875, // Golden ratio by default
  children,
  currentParams,
  onNavigate,
  ...props
}) {
  const portal = useRef();
  const [hovered, hover] = useState(false);
  const childrenRef = useRef(children);

  // Store children in ref to prevent re-rendering causing blinking
  useEffect(() => {
    childrenRef.current = children;
  }, [children]);

  // Enable cursor change when hovering
  useCursor(hovered);

  // Animate the portal blend based on route
  useFrame((state, dt) => {
    if (portal.current) {
      // Smoother easing with slightly longer duration
      easing.damp(
        portal.current,
        "blend",
        currentParams?.id === id ? 1 : 0,
        0.25,
        dt
      );
    }
  });

  return (
    <group {...props}>
      {/* Title text */}
      <Text
        color="black"
        fontSize={0.25}
        letterSpacing={-0.025}
        anchorY="top"
        anchorX="left"
        lineHeight={0.8}
        position={[-0.375, 0.715, 0.01]}
      >
        {name}
      </Text>

      {/* ID text */}
      <Text
        color="black"
        fontSize={0.1}
        anchorX="right"
        position={[0.4, -0.659, 0.01]}
      >
        /{id}
      </Text>

      {/* Author text */}
      <Text
        color="black"
        fontSize={0.04}
        anchorX="left"
        position={[0.0, -0.677, 0.01]}
      >
        {author}
      </Text>

      {/* Background shadow frame - this adds the black outline/shadow */}
      <mesh name={id + "_shadow"} position={[0, 0, -0.001]}>
        <roundedPlaneGeometry args={[width + 0.05, height + 0.05, 0.12]} />
        <meshBasicMaterial color="black" />
      </mesh>

      {/* Portal mesh - front face */}
      <mesh
        name={id}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onNavigate("/item/" + e.object.name);
        }}
        onPointerOver={(e) => hover(true)}
        onPointerOut={() => hover(false)}
      >
        <roundedPlaneGeometry args={[width, height, 0.1]} />
        <MeshPortalMaterial
          ref={portal}
          events={currentParams?.id === id}
          side={THREE.DoubleSide}
          // Add portal material settings to reduce flickering
          transparent={false}
          blending={THREE.NoBlending}
        >
          {/* Add background color */}
          <color attach="background" args={[bg]} />
          {childrenRef.current}
        </MeshPortalMaterial>
      </mesh>
    </group>
  );
}

export default PortalFrame;
