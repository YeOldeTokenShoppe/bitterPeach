import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Simple shader material for testing
const TestNeonMaterial = shaderMaterial(
  {
    time: 0.0,
    color1: new THREE.Color('#00ff41'), // Neon green
    color2: new THREE.Color('#67e8f9'), // Cyan
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader - simple test pattern
  `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec2 vUv;
    
    void main() {
      // Create animated lines pattern
      vec2 uv = vUv * 10.0; // Scale up the pattern
      
      // Horizontal lines
      float line1 = smoothstep(0.45, 0.5, fract(uv.y + time * 0.1));
      float line2 = smoothstep(0.55, 0.5, fract(uv.y + time * 0.1));
      float hLines = line1 * line2;
      
      // Vertical lines
      float line3 = smoothstep(0.45, 0.5, fract(uv.x + time * 0.15));
      float line4 = smoothstep(0.55, 0.5, fract(uv.x + time * 0.15));
      float vLines = line3 * line4;
      
      // Combine lines
      float lines = max(hLines, vLines);
      
      // Mix colors
      vec3 color = mix(color1, color2, fract(time * 0.2));
      
      // Add glow
      float glow = lines * (1.0 + sin(time * 2.0) * 0.3);
      
      gl_FragColor = vec4(color * glow, lines);
    }
  `
);

// Extend for use in JSX
extend({ TestNeonMaterial });

const NeonLinesSimple = ({ enabled = true }) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const { viewport } = useThree();
  
  console.log('🎨 NeonLinesSimple render:', { enabled });
  
  // Animate
  useFrame((state, delta) => {
    if (!enabled || !materialRef.current || !materialRef.current.uniforms) return;
    if (materialRef.current.uniforms.time) {
      materialRef.current.uniforms.time.value += delta;
    }
  });
  
  if (!enabled) return null;
  
  return (
    <mesh 
      ref={meshRef}
      position={[0, 0, -10]}
      scale={[viewport.width * 2, viewport.height * 2, 1]}
    >
      <planeGeometry args={[1, 1]} />
      <testNeonMaterial
        ref={materialRef}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
};

export default NeonLinesSimple;