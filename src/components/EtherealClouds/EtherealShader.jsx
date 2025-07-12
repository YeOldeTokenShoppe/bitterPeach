import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

const EtherealMaterial = shaderMaterial(
  {
    uTime: 0,
    uResolution: new THREE.Vector2(1, 1),
  },
  // Vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader (converted from Shadertoy)
  `
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec2 vUv;
    
    void main() {
      vec2 I = vUv * uResolution;
      vec4 O = vec4(0.0);
      float t = uTime;
      float i, z, d;
      
      for(float j = 0.0; j < 100.0; j++) {
        i = j;
        vec3 p = z * normalize(vec3((I + I) - uResolution, 0.0) - vec3(uResolution.x, uResolution.y, uResolution.y));
        p.z -= t;
        
        for(d = 1.0; d < 9.0; d /= 0.7) {
          p += cos(p.yzx * d + z * 0.2) / d;
        }
        
        d = 0.02 + 0.1 * abs(3.0 - length(p.xy));
        z += d;
        O += (cos(z + t + vec4(6.0, 1.0, 2.0, 3.0)) + 1.0) / d;
      }
      
      O = tanh(O / 3000.0);
      
      // Add blue tint for ethereal sky effect
      O.rgb = mix(O.rgb, vec3(0.5, 0.7, 1.0), 0.3);
      
      gl_FragColor = O;
    }
  `
);

extend({ EtherealMaterial });

const EtherealShader = ({ position = [0, 0, -50], scale = [200, 100, 1] }) => {
  const meshRef = useRef();
  const materialRef = useRef();

  useFrame((state) => {
    if (materialRef.current && materialRef.current.uniforms) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime * 0.5;
      materialRef.current.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <etherealMaterial ref={materialRef} side={THREE.DoubleSide} transparent />
    </mesh>
  );
};

export default EtherealShader;