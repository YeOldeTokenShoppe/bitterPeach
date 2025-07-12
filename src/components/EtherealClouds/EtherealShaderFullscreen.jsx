import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EtherealShaderFullscreen = () => {
  const mesh = useRef();
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  }), []);

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime * 0.001;
  });

  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec2 uResolution;
    varying vec3 vWorldPosition;
    
    void main() {
      vec3 direction = normalize(vWorldPosition);
      vec2 I = direction.xy * uResolution * 0.5;
      vec4 O;
      float t = uTime, i, z, d;
      
      for(O *= i; i++ < 1e2;
          O += (cos(z + t + vec4(6, 1, 2, 3)) + 1.) / d / 3e3)
      {
          vec3 p = z * direction;
          p.z -= t;
          for(d = 1.; d < 9.; d /= .7)
              p += cos(p.yzx * d + z * .2) / d;
          z += d = .02 + .1 * abs(3. - length(p.xy));
      }
      
      gl_FragColor = O;
    }
  `;

  return (
    <mesh 
      ref={mesh} 
      scale={[500, 500, 500]}
      position={[0, 0, 0]}
      renderOrder={-1000}
    >
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={true}
        transparent={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
};

export default EtherealShaderFullscreen;