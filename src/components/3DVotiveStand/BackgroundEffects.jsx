import React, { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const BackgroundEffects = () => {
  const groupRef = useRef();
  const starsRef = useRef();
  const { scene } = useThree();

  // Create stars as a separate geometry
  const starPoints = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];

    for (let i = 0; i < 100; i++) {
      const radius = 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      vertices.push(x, y, z);

      const color = new THREE.Color();
      const hue = THREE.MathUtils.randFloat(0.6, 0.7);
      const saturation = THREE.MathUtils.randFloat(0, 0.2);
      const lightness = THREE.MathUtils.randFloat(0.8, 1);
      color.setHSL(hue, saturation, lightness);
      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    return new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        size: 1,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      })
    );
  }, []);

  // Create gradient background sphere
  const backgroundSphere = useMemo(() => {
    const geometry = new THREE.SphereGeometry(195, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color("#000B1E") },
        color2: { value: new THREE.Color("#0B1A3E") },
      },
      vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
      fragmentShader: `
          uniform vec3 color1;
          uniform vec3 color2;
          varying vec2 vUv;
          void main() {
            vec3 color = mix(color1, color2, pow(vUv.y, 0.5));
            gl_FragColor = vec4(color, 1.0);
          }
        `,
      side: THREE.BackSide,
    });

    return new THREE.Mesh(geometry, material);
  }, []);

  // Set up fog
  useEffect(() => {
    // Using exponential fog for more dramatic effect
    scene.fog = new THREE.FogExp2("#000B1E", 0.01);

    // Clean up
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // Subtle rotation animation
  //   useFrame((state, delta) => {
  //     if (groupRef.current) {
  //       groupRef.current.rotation.y += delta * 0.02;
  //     }
  //     if (starsRef.current) {
  //       starsRef.current.rotation.y -= delta * 0.01;
  //     }
  //   });

  return (
    <group>
      <primitive object={backgroundSphere} />
      <group ref={groupRef}>
        <primitive ref={starsRef} object={starPoints} />
      </group>
    </group>
  );
};

export default BackgroundEffects;
