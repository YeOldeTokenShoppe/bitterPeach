import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Star component
function Stars() {
  const ref = useRef();
  const count = 300;
  
  const [positions, sizes] = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
      sizes[i] = Math.random() * 2 + 0.5;
    }
    
    return [positions, sizes];
  }, []);
  
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.0001;
      // Twinkle effect
      ref.current.material.uniforms.time.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        transparent
        uniforms={{
          time: { value: 0 }
        }}
        vertexShader={`
          attribute float size;
          uniform float time;
          varying float vBrightness;
          
          void main() {
            vBrightness = sin(time * 2.0 + position.x * 0.5) * 0.5 + 0.5;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          varying float vBrightness;
          
          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            
            float alpha = 1.0 - (dist * 2.0);
            gl_FragColor = vec4(1.0, 1.0, 1.0, alpha * vBrightness);
          }
        `}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Single nebula cloud
export function NebulaCloud({ position, color, scale }) {
  const ref = useRef();
  const rotationSpeed = useMemo(() => (Math.random() - 0.5) * 0.001, []);
  
  // Generate cloud shape
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const color3 = new THREE.Color(color);
    
    for (let i = 0; i < particleCount; i++) {
      // Create irregular cloud shape
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * scale;
      const distortion = Math.random() * 0.5 + 0.5;
      
      positions[i * 3] = Math.cos(angle) * radius * distortion;
      positions[i * 3 + 1] = Math.sin(angle) * radius * distortion;
      positions[i * 3 + 2] = (Math.random() - 0.5) * scale * 0.3;
      
      colors[i * 3] = color3.r;
      colors[i * 3 + 1] = color3.g;
      colors[i * 3 + 2] = color3.b;
      
      sizes[i] = Math.random() * 5 + 2;
    }
    
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    return geo;
  }, [color, scale]);
  
  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.z += rotationSpeed;
    }
  });
  
  return (
    <points ref={ref} position={position}>
      <primitive object={geometry} />
      <shaderMaterial
        transparent
        vertexColors
        uniforms={{
          opacity: { value: 0.15 }
        }}
        vertexShader={`
          attribute float size;
          varying vec3 vColor;
          
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = size * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform float opacity;
          varying vec3 vColor;
          
          void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
            
            // Add glow effect
            float glow = exp(-dist * 3.0);
            
            gl_FragColor = vec4(vColor, alpha * opacity * glow);
          }
        `}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

// Main nebula scene
function NebulaScene() {
  const nebulaClouds = useMemo(() => {
    const colors = [
      '#4169E1', // Royal Blue
      '#8A2BE2', // Blue Violet
      '#FF1493', // Deep Pink
      '#4B0082', // Indigo
      '#9370DB', // Medium Purple
      '#DA70D6'  // Orchid
    ];
    
    const clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        position: [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20
        ],
        color: colors[Math.floor(Math.random() * colors.length)],
        scale: Math.random() * 10 + 5
      });
    }
    return clouds;
  }, []);
  
  return (
    <>
      {/* Background gradient effect */}
      <mesh>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial color="#0c0d1d" />
      </mesh>
      
      {/* Stars */}
      {/* <Stars /> */}
      
      {/* Nebula clouds */}
      {nebulaClouds.map((cloud, index) => (
        <NebulaCloud key={index} {...cloud} />
      ))}
      
      {/* Ambient light for subtle illumination */}
      <ambientLight intensity={0.1} />
    </>
  );
}

// Main component
// export default function ThreeJsNebula() {
//   return (
//     <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
//       <Canvas
//         camera={{ position: [0, 0, 30], fov: 75 }}
//         gl={{ antialias: true }}
//       >
//         <NebulaScene />
//       </Canvas>
//     </div>
//   );
// }