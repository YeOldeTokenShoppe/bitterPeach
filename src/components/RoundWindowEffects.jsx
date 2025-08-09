import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D tDiffuse;
  uniform float time;
  uniform float effectActive;
  uniform float glitchIntensity;
  uniform float chromaticIntensity;
  uniform vec2 resolution;
  varying vec2 vUv;
  
  // Random function
  float random(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  // Noise function for glitch
  float noise(vec2 p) {
    return random(p) * 2.0 - 1.0;
  }
  
  // Convert RGB to HSL
  vec3 rgb2hsl(vec3 color) {
    float maxColor = max(max(color.r, color.g), color.b);
    float minColor = min(min(color.r, color.g), color.b);
    float delta = maxColor - minColor;
    
    vec3 hsl = vec3(0.0, 0.0, (maxColor + minColor) / 2.0);
    
    if (delta != 0.0) {
      if (hsl.z < 0.5) {
        hsl.y = delta / (maxColor + minColor);
      } else {
        hsl.y = delta / (2.0 - maxColor - minColor);
      }
      
      if (color.r == maxColor) {
        hsl.x = (color.g - color.b) / delta + (color.g < color.b ? 6.0 : 0.0);
      } else if (color.g == maxColor) {
        hsl.x = (color.b - color.r) / delta + 2.0;
      } else {
        hsl.x = (color.r - color.g) / delta + 4.0;
      }
      hsl.x /= 6.0;
    }
    
    return hsl;
  }
  
  // Convert HSL to RGB
  vec3 hsl2rgb(vec3 hsl) {
    float r, g, b;
    
    if (hsl.y == 0.0) {
      r = g = b = hsl.z;
    } else {
      float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
      float p = 2.0 * hsl.z - q;
      
      float hk = hsl.x;
      float tr = hk + 1.0/3.0;
      float tg = hk;
      float tb = hk - 1.0/3.0;
      
      if (tr < 0.0) tr += 1.0;
      if (tr > 1.0) tr -= 1.0;
      if (tg < 0.0) tg += 1.0;
      if (tg > 1.0) tg -= 1.0;
      if (tb < 0.0) tb += 1.0;
      if (tb > 1.0) tb -= 1.0;
      
      r = tr < 1.0/6.0 ? p + (q - p) * 6.0 * tr :
          tr < 0.5 ? q :
          tr < 2.0/3.0 ? p + (q - p) * (2.0/3.0 - tr) * 6.0 :
          p;
          
      g = tg < 1.0/6.0 ? p + (q - p) * 6.0 * tg :
          tg < 0.5 ? q :
          tg < 2.0/3.0 ? p + (q - p) * (2.0/3.0 - tg) * 6.0 :
          p;
          
      b = tb < 1.0/6.0 ? p + (q - p) * 6.0 * tb :
          tb < 0.5 ? q :
          tb < 2.0/3.0 ? p + (q - p) * (2.0/3.0 - tb) * 6.0 :
          p;
    }
    
    return vec3(r, g, b);
  }
  
  void main() {
    vec2 uv = vUv;
    
    // Sample the original texture
    vec4 texColor = texture2D(tDiffuse, uv);
    vec3 originalColor = texColor.rgb;
    vec3 color = originalColor;
    
    // Only apply effects when effectActive is 1.0 (music is playing)
    if (effectActive > 0.5) {
      // Convert to HSL
      vec3 hsl = rgb2hsl(color);
      
      // Rotate the hue continuously based on time
      hsl.x = mod(hsl.x + time * 0.1, 1.0); // 0.1 controls rotation speed
      
      // Convert back to RGB
      color = hsl2rgb(hsl);
      
      // Add some saturation boost for more vivid colors
      hsl = rgb2hsl(color);
      hsl.y = min(hsl.y * 1.3, 1.0); // Boost saturation by 30%
      color = hsl2rgb(hsl);
      
      // Mix between original and effect based on effectActive
      color = mix(originalColor, color, effectActive);
    }
    
    // Add emissive glow
    color *= 1.0; // Normal brightness when not active
    
    gl_FragColor = vec4(color, texColor.a);
  }
`;

function RoundWindowEffects({ isPlaying = false }) {
  const { scene, gl } = useThree();
  const windowMaterialsRef = useRef([]);
  const originalMaterialsRef = useRef(new Map());
  const timeRef = useRef(0);
  
  useEffect(() => {
    if (!scene) return;
    
    // Add a small delay to ensure the model is fully loaded
    const searchTimeout = setTimeout(() => {
      // console.log('RoundWindowEffects: Starting search for RoundWindows...');
      
      // Find all RoundWindow objects in the scene
      const roundWindows = [];
      const foundObjects = [];
      
      scene.traverse((child) => {
        // Log all objects with 'Window' or 'Round' in their name
        if (child.name && (child.name.toLowerCase().includes('window') || 
            child.name.toLowerCase().includes('round'))) {
          foundObjects.push({
            name: child.name,
            type: child.type,
            hasMaterial: !!child.material,
            materialName: child.material?.name
          });
        }
        
        // Check for RoundWindow or RoundWindow2 by name
        if (child.name === 'RoundWindow' || 
            child.name === 'RoundWindow2' ||
            (child.material && (child.material.name === 'RoundWindow' || child.material.name === 'RoundWindow2')) ||
            (child.isMesh && (child.name.includes('RoundWindow')))) {
          roundWindows.push(child);
          // console.log('Found window:', child.name, child);
        }
      });
      
      // console.log('Objects with Window/Round in name:', foundObjects);
      // console.log(`Found ${roundWindows.length} RoundWindow object(s)`);
      
      if (roundWindows.length === 0) {
        // console.log('No RoundWindow objects found');
        return;
      }
      
      // Process each window
      roundWindows.forEach((roundWindow, index) => {
        if (!roundWindow.material) {
          // console.log(`Window ${roundWindow.name} has no material`);
          return;
        }
        
        // Store original material
        originalMaterialsRef.current.set(roundWindow, roundWindow.material);
        
        // Get the original texture if it exists
        const originalTexture = roundWindow.material.map || roundWindow.material.emissiveMap;
        
        if (!originalTexture) {
          // console.log(`Window ${roundWindow.name} has no texture to apply effects to`);
          return;
        }
        
        // console.log(`Processing window ${index + 1}:`, roundWindow.name);
        // console.log('Original material:', roundWindow.material);
        // console.log('Original texture:', originalTexture);
        
        // Create custom shader material
        const customMaterial = new THREE.ShaderMaterial({
          uniforms: {
            tDiffuse: { value: originalTexture },
            time: { value: 0 },
            effectActive: { value: isPlaying ? 1.0 : 0.0 },
            glitchIntensity: { value: 2.5 },
            chromaticIntensity: { value: 5.0 },
            resolution: { value: new THREE.Vector2(gl.domElement.width, gl.domElement.height) }
          },
          vertexShader,
          fragmentShader,
          side: roundWindow.material.side || THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        
        // Apply the new material
        roundWindow.material = customMaterial;
        windowMaterialsRef.current.push({ window: roundWindow, material: customMaterial });
        
        // console.log(`Effects applied to ${roundWindow.name}`);
      });
      
      // console.log('RoundWindowEffects setup complete');
      
    }, 1000); // 1 second delay to ensure model is loaded
    
    // Cleanup
    return () => {
      clearTimeout(searchTimeout);
      
      // Restore original materials
      originalMaterialsRef.current.forEach((originalMaterial, window) => {
        window.material = originalMaterial;
      });
      
      // Dispose of custom materials
      windowMaterialsRef.current.forEach(({ material }) => {
        if (material) {
          material.dispose();
        }
      });
      
      windowMaterialsRef.current = [];
      originalMaterialsRef.current.clear();
    };
  }, [scene, gl, isPlaying]);
  
  // Update effectActive uniform when isPlaying changes
  useEffect(() => {
    windowMaterialsRef.current.forEach(({ material }) => {
      if (material && material.uniforms) {
        material.uniforms.effectActive.value = isPlaying ? 1.0 : 0.0;
      }
    });
  }, [isPlaying]);
  
  // Update time uniform for animated effects
  useFrame((_, delta) => {
    // Only update time when music is playing
    if (isPlaying) {
      timeRef.current += delta;
    }
    
    windowMaterialsRef.current.forEach(({ material }) => {
      if (material && material.uniforms) {
        material.uniforms.time.value = timeRef.current;
      }
    });
  });
  
  return null;
}

export default RoundWindowEffects;