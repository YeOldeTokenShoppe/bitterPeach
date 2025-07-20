import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';

// Create custom anamorphic shader material
const AnamorphicMaterial = shaderMaterial(
  {
    time: 0,
    distortionAmount: 1.0,
    cameraPosition: new THREE.Vector3(),
    hologramStrength: 0.5,
    glitchIntensity: 0.1,
    map: null,
  },
  // Vertex shader
  `
    uniform float time;
    uniform float distortionAmount;
    uniform vec3 cameraPosition;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying float vDistortion;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      // Calculate view angle for anamorphic distortion
      vec3 viewDirection = normalize(cameraPosition - worldPosition.xyz);
      float viewAngle = dot(viewDirection, vec3(0.0, 1.0, 0.0));
      
      // Cylindrical anamorphic distortion
      float distortion = sin(viewAngle * 3.14159) * distortionAmount;
      vec3 distortedPosition = position;
      
      // Distort based on height and view angle
      distortedPosition.x += sin(position.y * 2.0 + time) * distortion * 0.3;
      distortedPosition.z += cos(position.y * 2.0 + time) * distortion * 0.3;
      
      // Add subtle wave effect
      distortedPosition.y += sin(position.x * 5.0 + time * 2.0) * 0.02 * distortion;
      
      vDistortion = distortion;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(distortedPosition, 1.0);
    }
  `,
  // Fragment shader
  `
    uniform float time;
    uniform float hologramStrength;
    uniform float glitchIntensity;
    uniform sampler2D map;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying float vDistortion;
    
    // Hologram effect
    vec3 hologram(vec3 color, float strength) {
      float scanline = sin(vWorldPosition.y * 100.0 + time * 5.0) * 0.04;
      vec3 holoColor = color + vec3(0.0, 0.3, 0.5) * strength;
      
      // Add chromatic aberration
      float r = texture2D(map, vUv + vec2(0.002, 0.0)).r;
      float g = texture2D(map, vUv).g;
      float b = texture2D(map, vUv - vec2(0.002, 0.0)).b;
      
      return mix(color, vec3(r, g, b) + scanline, strength);
    }
    
    // Glitch effect
    vec3 glitch(vec3 color, float intensity) {
      float glitchTime = floor(time * 20.0) / 20.0;
      float glitchAmount = step(0.95, sin(glitchTime * 20.0)) * intensity;
      
      vec2 glitchUv = vUv;
      glitchUv.x += sin(glitchTime * 100.0) * glitchAmount * 0.1;
      
      vec3 glitchColor = texture2D(map, glitchUv).rgb;
      return mix(color, glitchColor, glitchAmount);
    }
    
    void main() {
      vec4 texColor = texture2D(map, vUv);
      vec3 color = texColor.rgb;
      
      // Apply hologram effect based on distortion
      color = hologram(color, hologramStrength * (1.0 + vDistortion * 0.5));
      
      // Apply glitch effect
      color = glitch(color, glitchIntensity);
      
      // Edge glow based on viewing angle
      float edgeFactor = pow(1.0 - abs(dot(vNormal, normalize(cameraPosition - vWorldPosition))), 2.0);
      color += vec3(0.2, 0.5, 1.0) * edgeFactor * 0.5;
      
      gl_FragColor = vec4(color, texColor.a);
    }
  `
);

// Extend Three.js with our custom material
extend({ AnamorphicMaterial });

const AnamorphicMadonna = ({ children, distortionAmount = 1.0, hologramStrength = 0.5, glitchIntensity = 0.1 }) => {
  const materialRef = useRef();
  const { camera } = useThree();
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.time = state.clock.elapsedTime;
      materialRef.current.cameraPosition = camera.position;
    }
  });
  
  return (
    <>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === 'primitive') {
          // Clone the primitive and traverse to apply material
          return React.cloneElement(child, {
            ref: (ref) => {
              if (ref) {
                ref.traverse((node) => {
                  if (node.isMesh && node.material) {
                    const originalMap = node.material.map;
                    node.material = new AnamorphicMaterial({
                      map: originalMap,
                      distortionAmount,
                      hologramStrength,
                      glitchIntensity,
                    });
                    materialRef.current = node.material;
                  }
                });
              }
            }
          });
        }
        return child;
      })}
    </>
  );
};

export default AnamorphicMadonna;