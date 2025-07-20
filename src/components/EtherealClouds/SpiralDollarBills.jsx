import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const SpiralDollarBills = ({ count = 10, radius = 5, height = 20, speed = 0.5, startY = 10, endY = -10 }) => {
  const { scene } = useGLTF('/100DollarBill.glb');
  const meshRef = useRef();
  const [billGeometry, setBillGeometry] = useState(null);
  const [billTexture, setBillTexture] = useState(null);
  const shaderMaterialRef = useRef();
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const positions = useMemo(() => {
    const pos = [];
    for (let i = 0; i < count; i++) {
      // Distribute bills across multiple spiral layers
      const layer = i % 3; // 3 spiral layers
      const angleOffset = (layer * Math.PI * 2) / 3; // 120 degrees apart
      const angle = (i / count) * Math.PI * 2 + angleOffset;
      
      // Spread bills more evenly across the height with randomization
      const baseY = (i / count) * height;
      const y = startY - baseY + (Math.random() - 0.5) * 5;
      
      // Vary the radius for each layer
      const layerRadius = radius + (layer - 1) * 2;
      
      pos.push({
        angle,
        y,
        radius: layerRadius,
        phase: Math.random() * Math.PI * 2,
        rotationSpeed: 0.5 + Math.random() * 0.5,
        spiralSpeed: 0.3 + Math.random() * 0.3,
        verticalOffset: Math.random() * 0.5,
        // Random initial orientations
        flipX: Math.random() > 0.5 ? Math.PI : 0,
        flipY: Math.random() > 0.5 ? Math.PI : 0,
        baseRotation: Math.random() * Math.PI * 2
      });
    }
    return pos;
  }, [count, height, radius, startY]);
  
  useEffect(() => {
    if (scene) {
      let foundMesh = null;
      scene.traverse((child) => {
        if (child.isMesh && !foundMesh) {
          foundMesh = child;
          setBillGeometry(child.geometry.clone());
          
          // Store the texture from the original material
          if (child.material.map) {
            setBillTexture(child.material.map);
            console.log('Texture found:', child.material.map);
          }
          
          console.log('Found dollar bill mesh:', child.name);
          console.log('Material type:', child.material.type);
        }
      });
    }
  }, [scene]);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Update shader time uniform
    if (shaderMaterialRef.current) {
      shaderMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    
    positions.forEach((pos, i) => {
      // Apply vertical offset for smoother falling
      pos.y -= speed * delta * (1 + pos.verticalOffset * 0.3);
      
      if (pos.y < endY) {
        // Respawn at random height for continuous flow
        pos.y = startY + Math.random() * (height + 10);
        
        // Re-randomize position for straight falling bills
        if (pos.isStraightFalling) {
          const spreadRadius = radius * 1.5;
          pos.straightX = (Math.random() - 0.5) * spreadRadius * 2;
          pos.straightZ = (Math.random() - 0.5) * spreadRadius * 2;
        }
      }
      
      let x, z;
      if (pos.isStraightFalling) {
        // Straight falling bills maintain their X/Z position
        x = pos.straightX;
        z = pos.straightZ;
      } else {
        // Spiraling bills
        const currentAngle = pos.angle + state.clock.elapsedTime * pos.spiralSpeed;
        x = Math.cos(currentAngle) * pos.radius;
        z = Math.sin(currentAngle) * pos.radius;
      }
      
      dummy.position.set(x, pos.y, z);
      dummy.rotation.x = pos.flipX + Math.sin(state.clock.elapsedTime * pos.rotationSpeed + pos.phase) * 0.5;
      dummy.rotation.y = pos.flipY + pos.baseRotation + state.clock.elapsedTime * pos.rotationSpeed;
      dummy.rotation.z = Math.cos(state.clock.elapsedTime * pos.rotationSpeed + pos.phase) * 0.3;
      
      dummy.scale.setScalar(1);
      
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  // Create shader material with bending effect
  const shaderMaterial = useMemo(() => {
    if (!billTexture) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: billTexture },
        time: { value: 0 },
        bendAmount: { value: 1.8 }
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float time;
        uniform float bendAmount;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // Create a bending effect along the bill
          float bend = sin(uv.x * 3.14159) * bendAmount;
          float wave = sin(time * 3.0 + uv.y * 10.0) * 0.05;
          float flutter = sin(time * 4.0 + uv.x * 15.0) * 0.03;
          
          // Apply bending to z position - make it more pronounced
          pos.z += bend * (0.5 + 0.5 * sin(time * 2.0));
          pos.z += wave;
          pos.y += flutter * (1.0 - uv.x); // More flutter on one side
          
          // Strong edge flutter
          if (uv.x < 0.1 || uv.x > 0.9) {
            pos.y += sin(time * 8.0 + uv.y * 20.0) * 0.05;
            pos.z += cos(time * 6.0 + uv.y * 15.0) * 0.04;
          }
          
          // Apply instance transformation
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        varying vec2 vUv;
        
        void main() {
          vec4 texColor = texture2D(map, vUv);
          gl_FragColor = texColor;
        }
      `,
      side: THREE.DoubleSide,
      transparent: true
    });
  }, [billTexture]);
  
  // Store material ref for animation
  useEffect(() => {
    shaderMaterialRef.current = shaderMaterial;
  }, [shaderMaterial]);
  
  if (!billGeometry || !shaderMaterial) return null;
  
  return (
    <instancedMesh ref={meshRef} args={[billGeometry, shaderMaterial, count]} />
  );
};

useGLTF.preload('/100DollarBill.glb');

export default SpiralDollarBills;