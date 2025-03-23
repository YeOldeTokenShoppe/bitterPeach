import * as THREE from "three";
import { useMemo, useRef } from "react";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { extend, useFrame } from "@react-three/fiber";

// Extend Three.js with the meshline components
extend({ MeshLineGeometry, MeshLineMaterial });

function Fatline({ curve, width, color, speed, dash }) {
  const ref = useRef();

  // Animation for the line
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.material.dashOffset -= (delta * speed) / 10;
    }
  });

  return (
    <mesh ref={ref}>
      <meshLineGeometry points={curve} />
      <meshLineMaterial
        transparent
        lineWidth={width}
        color={color}
        depthWrite={false}
        dashArray={0.25}
        dashRatio={dash}
        toneMapped={false}
      />
    </mesh>
  );
}

function Lines({
  dash = 0.9,
  count = 30,
  colors,
  radius = 50,
  rand = THREE.MathUtils.randFloatSpread,
}) {
  const lines = useMemo(() => {
    console.log("Generating neon confetti lines");
    return Array.from({ length: count }, () => {
      const pos = new THREE.Vector3(rand(radius), rand(radius), rand(radius));
      const points = Array.from({ length: 10 }, () =>
        pos
          .add(new THREE.Vector3(rand(radius), rand(radius), rand(radius)))
          .clone()
      );
      const curve = new THREE.CatmullRomCurve3(points).getPoints(300);
      return {
        color: colors[parseInt(colors.length * Math.random())],
        width: Math.max(radius / 100, (radius / 50) * Math.random()),
        speed: Math.max(0.1, 1 * Math.random()),
        curve: curve.flatMap((point) => point.toArray()),
      };
    });
  }, [colors, count, radius]);

  return lines.map((props, index) => (
    <Fatline key={index} dash={dash} {...props} />
  ));
}

// Export a simplified component that doesn't include EffectComposer
export default function NeonConfetti({ isActive = false }) {
  // Just return early if not active
  if (!isActive) return null;

  // More vibrant 80s colors
  const neonColors = [
    "#ff71ce", // Hot pink
    "#01cdfe", // Bright cyan
    "#05ffa1", // Neon green
    "#b967ff", // Electric purple
    "#fffb96", // Bright yellow
  ];

  return (
    <group>
      <Lines dash={0.4} count={10} radius={20} colors={neonColors} />
    </group>
  );
}
