import React, { useRef, useEffect } from "react";
import { useFrame, useLoader, useThree, extend } from "@react-three/fiber";
import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";

const SmokeMaterial = shaderMaterial(
  {
    uTime: 0,
    uPerlinTexture: null,
  },
  // Vertex shader unchanged
  `
    uniform float uTime;
    uniform sampler2D uPerlinTexture;
    varying vec2 vUv;
    
    vec2 rotate2D(vec2 value, float angle) {
      float s = sin(angle);
      float c = cos(angle);
      mat2 m = mat2(c, s, -s, c);
      return m * value;
    }
    
    void main() {
      vec3 newPosition = position;
      
      float twistPerlin = texture(
        uPerlinTexture,
        vec2(0.5, uv.y * 0.2 - uTime * 0.005)
      ).r;
      
      float angle = twistPerlin * 10.0;
      newPosition.xz = rotate2D(newPosition.xz, angle);
      
      vec2 windOffset = vec2(
        texture(uPerlinTexture, vec2(0.25, uTime * 0.01)).r - 0.5,
        texture(uPerlinTexture, vec2(0.75, uTime * 0.01)).r - 0.5
      );
      windOffset *= pow(uv.y, 2.0) * 2.0;
      newPosition.xz += windOffset;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      vUv = uv;
    }
  `,
  // Fragment shader unchanged
  `
    uniform float uTime;
    uniform sampler2D uPerlinTexture;
    varying vec2 vUv;
    
    void main() {
      vec2 smokeUv = vUv;
      smokeUv.x *= 0.5;
      smokeUv.y *= 0.3;
      smokeUv.y -= uTime * 0.03;
      
      float smoke = texture(uPerlinTexture, smokeUv).r;
      smoke = smoothstep(0.4, 1.0, smoke);
      
      smoke *= smoothstep(0.0, 0.1, vUv.x);
      smoke *= smoothstep(1.0, 0.9, vUv.x);
      smoke *= smoothstep(0.0, 0.1, vUv.y);
      smoke *= smoothstep(1.0, 0.4, vUv.y);
      
      vec3 smokeColor = vec3(0.95);
      gl_FragColor = vec4(smokeColor, smoke * 0.3);
    }
  `
);

extend({ SmokeMaterial });

const CoffeeSmoke = () => {
  const materialRef = useRef();
  const { scene } = useThree();

  const perlinTexture = useLoader(THREE.TextureLoader, "/perlin.png");
  perlinTexture.wrapS = THREE.RepeatWrapping;
  perlinTexture.wrapT = THREE.RepeatWrapping;

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.getElapsedTime();
      if (materialRef.current.uPerlinTexture !== perlinTexture) {
        materialRef.current.uPerlinTexture = perlinTexture;
      }
    }
  });

  useEffect(() => {
    // Find the chair object
    const chair = scene.getObjectByName("Chair");
    if (chair) {
      // Set chair to a specific layer (layer 1)
      chair.traverse((obj) => {
        if (obj.isMesh) {
          obj.layers.enable(1);
        }
      });
    }
  }, [scene]);

  return (
    <mesh
      position={[11.41, 10, -4.89]} // Slightly lowered Y position
    >
      <planeGeometry args={[0.75, 2]} /> {/* Reduced from [1.5, 6] */}
      <smokeMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        depthTest={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

export default CoffeeSmoke;
