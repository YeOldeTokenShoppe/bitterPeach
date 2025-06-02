import React, { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Effects, useTexture, CameraShake } from '@react-three/drei';
import { UnrealBloomPass, ShaderPass } from 'three-stdlib';
import { extend } from '@react-three/fiber';

// Extend Three.js components for JSX usage
extend({ UnrealBloomPass, ShaderPass });

// Custom warp shader for the transition effect
const WarpShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0.0 },
    intensity: { value: 0.0 },
    warpSpeed: { value: 1.0 },
    chromaticAberration: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float intensity;
    uniform float warpSpeed;
    uniform float chromaticAberration;
    varying vec2 vUv;
    
    vec2 warp(vec2 uv, float amt) {
      vec2 center = vec2(0.5);
      vec2 toCenter = center - uv;
      float dist = length(toCenter);
      // Reduced frequency from 5.0 to 2.0 for smoother, less blocky distortion
      float warpAmount = sin(dist * 2.0 - time * warpSpeed) * amt * 0.1;
      return uv + normalize(toCenter) * warpAmount * dist * 0.3;
    }
    
    void main() {
      // Apply warp distortion - reduced even further
      vec2 warpedUv = warp(vUv, intensity * 0.05);
      
      // Chromatic aberration for extra sci-fi effect
      vec3 color;
      if (chromaticAberration > 0.0) {
        float aberration = chromaticAberration * intensity;
        color.r = texture2D(tDiffuse, warp(vUv, intensity * 0.05 + aberration * 0.005)).r;
        color.g = texture2D(tDiffuse, warpedUv).g;
        color.b = texture2D(tDiffuse, warp(vUv, intensity * 0.05 - aberration * 0.005)).b;
      } else {
        color = texture2D(tDiffuse, warpedUv).rgb;
      }
      
      // Add subtle glow at peak intensity (further reduced)
      float flash = smoothstep(0.8, 1.0, intensity) * 0.05;
      color += vec3(flash);
      
      // Fade to black instead of white for less jarring transition
      float fadeToBlack = smoothstep(0.95, 1.0, intensity) * 0.8;
      color = mix(color, vec3(0.0), fadeToBlack);
      
      gl_FragColor = vec4(color, 1.0);
    }
  `
};

// Portal/Wormhole visual effect component
const WormholeEffect = ({ active, onComplete }) => {
  const meshRef = useRef();
  const materialRef = useRef();
  const startTime = useRef(null);
  
  useFrame((state) => {
    if (!active || !meshRef.current) return;
    
    if (!startTime.current) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    const progress = Math.min(elapsed / 3, 1); // 3 second animation
    
    // Rotate the wormhole
    meshRef.current.rotation.z = elapsed * 0.5;
    
    // Scale up the wormhole
    const scale = progress * 50;
    meshRef.current.scale.set(scale, scale, 1);
    
    // Update material opacity
    if (materialRef.current) {
      materialRef.current.opacity = Math.sin(progress * Math.PI) * 0.8;
    }
    
    // Call completion callback
    if (progress >= 1 && onComplete) {
      onComplete();
    }
  });
  
  if (!active) return null;
  
  return (
    <mesh ref={meshRef} position={[0, 0, -10]}>
      <planeGeometry args={[2, 2, 32, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
      >
        <shaderMaterial
          fragmentShader={`
            varying vec2 vUv;
            uniform float time;
            
            void main() {
              vec2 center = vUv - 0.5;
              float dist = length(center);
              float angle = atan(center.y, center.x);
              
              // Spiral pattern
              float spiral = sin(dist * 20.0 - angle * 3.0 - time * 2.0);
              float rings = sin(dist * 30.0 - time * 3.0);
              
              // Color based on distance and pattern
              vec3 color = vec3(0.1, 0.3, 0.8); // Blue base
              color += vec3(0.5, 0.0, 0.5) * spiral; // Purple spiral
              color += vec3(0.0, 0.5, 0.5) * rings; // Cyan rings
              
              // Fade out at edges
              float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
              
              gl_FragColor = vec4(color, alpha);
            }
          `}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          uniforms={{
            time: { value: 0 }
          }}
        />
      </meshBasicMaterial>
    </mesh>
  );
};

// Main cinematic transition component
export const CinematicTransition = ({ active, onComplete, type = 'warp' }) => {
  const [phase, setPhase] = useState('inactive');
  const [shakeIntensity, setShakeIntensity] = useState(0);
  const shaderRef = useRef();
  const bloomRef = useRef();
  const startTime = useRef(null);
  
  useEffect(() => {
    if (active) {
      setPhase('starting');
      startTime.current = null;
    }
  }, [active]);
  
  useFrame((state) => {
    if (phase === 'inactive') return;
    
    if (!startTime.current) {
      startTime.current = state.clock.elapsedTime;
    }
    
    const elapsed = state.clock.elapsedTime - startTime.current;
    
    // Update shader uniforms
    if (shaderRef.current && shaderRef.current.uniforms) {
      if (shaderRef.current.uniforms.time) {
        shaderRef.current.uniforms.time.value = elapsed;
      }
      
      // Intensity curve: ease in, peak, then stay at max
      let intensity = 0.0;
      if (elapsed < 2) {
        // Ramp up over 2 seconds
        intensity = Math.pow(elapsed / 2, 2);
      } else {
        // Stay at max intensity
        intensity = 1.0;
      }
      
      if (shaderRef.current.uniforms.intensity) {
        shaderRef.current.uniforms.intensity.value = intensity;
      }
      if (shaderRef.current.uniforms.chromaticAberration) {
        shaderRef.current.uniforms.chromaticAberration.value = intensity * 0.05; // Much less chromatic aberration
      }
    }
    
    // Update bloom intensity (reduced from 3 to 1.2 for subtler effect)
    if (bloomRef.current) {
      const bloomIntensity = Math.sin(Math.min(elapsed / 2, 1) * Math.PI) * 1.2;
      bloomRef.current.strength = bloomIntensity;
    }
    
    // Update camera shake intensity based on effect progress (increased intensity)
    if (elapsed < 0.5) {
      // Stronger build-up
      setShakeIntensity(elapsed * 0.6);
    } else if (elapsed < 2) {
      // Much more intense shake during warp
      const shakePhase = (elapsed - 0.5) / 1.5;
      setShakeIntensity(0.3 + Math.sin(shakePhase * Math.PI) * 2.5);
    } else if (elapsed < 2.5) {
      // Quick fade out
      setShakeIntensity((2.5 - elapsed) * 4);
    } else {
      setShakeIntensity(0);
    }
    
    // Trigger navigation after peak effect
    if (elapsed > 2.5 && phase === 'starting') {
      console.log('🎬 CinematicTransition: Peak reached, triggering onComplete');
      console.log('🎬 onComplete function:', onComplete);
      console.log('🎬 typeof onComplete:', typeof onComplete);
      setPhase('completing');
      if (onComplete) {
        console.log('🎬 Calling onComplete callback...');
        onComplete();
        console.log('🎬 onComplete callback called successfully');
      } else {
        console.error('🎬 ERROR: onComplete callback is not defined!');
      }
    }
  });
  
  if (!active) return null;
  
  return (
    <>
      {/* Camera shake effect - significantly increased values */}
      {/* <CameraShake
        maxYaw={0.01} // Increased 3x (was 0.05)
        maxPitch={0.15 * shakeIntensity} // Increased 3x (was 0.05)
        maxRoll={0.08 * shakeIntensity} // Increased 4x (was 0.02)
        // yawFrequency={3 + shakeIntensity * 5} // Faster shake
        pitchFrequency={3 + shakeIntensity * 5}
        rollFrequency={2 + shakeIntensity * 3}
        intensity={.1}
        decay={false} // We're controlling intensity manually
      /> */}
      
      {/* Wormhole visual effect */}
      {type === 'wormhole' && (
        <WormholeEffect active={active} />
      )}
      
      {/* Post-processing effects */}
      <Effects>
        <unrealBloomPass
          ref={bloomRef}
          strength={0}
          radius={1}
          threshold={0.5}
        />
        <shaderPass
          ref={shaderRef}
          args={[WarpShader]}
          uniforms-warpSpeed-value={1.5}
        />
      </Effects>
      
      {/* Full screen fade overlay - changed to black */}
      <mesh position={[0, 0, 100]} renderOrder={9999}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial
          transparent
          opacity={phase === 'completing' ? 0.9 : 0} // Black fade
          color="black"
          depthTest={false}
        />
      </mesh>
    </>
  );
};

// HTML overlay for additional effects
export const TransitionOverlay = ({ active }) => {
  const [opacity, setOpacity] = useState(0);
  
  useEffect(() => {
    if (active) {
      // Start fade in after delay
      setTimeout(() => setOpacity(1), 2000);
    } else {
      setOpacity(0);
    }
  }, [active]);
  
  if (!active) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'black',
        opacity: opacity * 0.9, // Cap at 90% opacity
        transition: 'opacity 0.5s ease-in-out',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
};