import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Custom shader material for the particles
const PointMaterial = shaderMaterial(
  { time: 0 },
  // Vertex shader
  `
    attribute float size;
    varying vec3 vColor;
    varying float vDistance;
    uniform float time;
    
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vDistance = -mvPosition.z;
      float pulse = sin(time * 2.0 + length(position)) * 0.15 + 1.0;
      vec3 pos = position;
      pos.x += sin(time + position.z * 0.5) * 0.05;
      pos.y += cos(time + position.x * 0.5) * 0.05;
      pos.z += sin(time + position.y * 0.5) * 0.05;
      mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = size * (300.0 / -mvPosition.z) * pulse;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment shader
  `
    varying vec3 vColor;
    varying float vDistance;
    uniform float time;
    
    void main() {
      vec2 cxy = 2.0 * gl_PointCoord - 1.0;
      float r = dot(cxy, cxy);
      if (r > 1.0) discard;
      float glow = exp(-r * 2.5);
      float outerGlow = exp(-r * 1.5) * 0.3;
      vec3 finalColor = vColor * (1.2 + sin(time * 0.5) * 0.1);
      finalColor += vec3(0.2, 0.4, 0.6) * outerGlow;
      float distanceFade = 1.0 - smoothstep(0.0, 50.0, vDistance);
      float intensity = mix(0.2, 1.0, distanceFade);
      gl_FragColor = vec4(finalColor * intensity, (glow + outerGlow) * distanceFade);
    }
  `
);

extend({ PointMaterial });

// Core sphere component
function CoreSphere({ radius = 4, particleCount = 25000 }) {
  const ref = useRef();
  const materialRef = useRef();
  
  const sphereColors = useMemo(() => [
    new THREE.Color(0x00ffff).multiplyScalar(1.2),
    new THREE.Color(0xff1493).multiplyScalar(1.1),
    new THREE.Color(0x4169e1).multiplyScalar(1.2),
    new THREE.Color(0xff69b4).multiplyScalar(1.1),
    new THREE.Color(0x00bfff).multiplyScalar(1.2)
  ], []);
  
  const { positions, colors, sizes } = useMemo(() => {
    const positions = [];
    const colors = [];
    const sizes = [];
    
    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      positions.push(x, y, z);
      
      const colorPos = i / particleCount;
      const color1 = sphereColors[Math.floor(colorPos * (sphereColors.length - 1))];
      const color2 = sphereColors[Math.ceil(colorPos * (sphereColors.length - 1))];
      const mixRatio = (colorPos * (sphereColors.length - 1)) % 1;
      const finalColor = new THREE.Color().lerpColors(color1, color2, mixRatio);
      colors.push(finalColor.r, finalColor.g, finalColor.b);
      sizes.push(Math.random() * 0.15 + 0.08);
    }
    
    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes)
    };
  }, [radius, particleCount, sphereColors]);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.001;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      // const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
      // ref.current.scale.set(breathe, breathe, breathe);
    }
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
}

// Single orbit ring component
function OrbitRing({ radius, thickness, index, count }) {
  const ref = useRef();
  const materialRef = useRef();
  
  const { positions, colors, sizes } = useMemo(() => {
    const positions = [];
    const colors = [];
    const sizes = [];
    const particleCount = 3000;
    
    for (let j = 0; j < particleCount; j++) {
      const angle = (j / particleCount) * Math.PI * 2;
      const radiusVariation = radius + (Math.random() - 0.5) * thickness;
      const x = Math.cos(angle) * radiusVariation;
      const y = (Math.random() - 0.5) * thickness;
      const z = Math.sin(angle) * radiusVariation;
      positions.push(x, y, z);
      
      const hue = (index / count) * 0.7 + (j / particleCount) * 0.3;
      const color = new THREE.Color().setHSL(hue, 1, 0.6);
      color.multiplyScalar(1.2);
      colors.push(color.r, color.g, color.b);
      sizes.push(Math.random() * 0.12 + 0.06);
    }
    
    return {
      positions: new Float32Array(positions),
      colors: new Float32Array(colors),
      sizes: new Float32Array(sizes)
    };
  }, [radius, thickness, index, count]);
  
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.elapsedTime;
      const dynamicSpeed = 0.001 * (Math.sin(time * 0.2) + 2.0) * (index + 1);
      ref.current.rotation.z += dynamicSpeed;
      ref.current.rotation.x += dynamicSpeed * 0.6;
      ref.current.rotation.y += dynamicSpeed * 0.4;
    }
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <points
      ref={ref}
      rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={sizes.length}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
      />
    </points>
  );
}

// Main planet component
export default function Planet({ position = [0, 0, 0], scale = 1.2 }) {
  return (
    <group position={position} scale={scale}>
      <CoreSphere />
      {Array.from({ length: 6 }, (_, i) => (
        <OrbitRing
          key={i}
          radius={5.8}
          thickness={0.4}
          index={i}
          count={6}
        />
      ))}
    </group>
  );
}