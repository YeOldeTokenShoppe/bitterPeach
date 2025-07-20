import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ASCII characters sorted by visual density
const ASCII_CHARS = ['.', ':', '-', '=', '+', '*', '#', '%', '@'];

const ASCIIParticleEffectSimple = ({ 
  targetMesh, 
  particleCount = 5000, 
  color = '#00ff41',
  particleSize = 0.5,
  enableAnimation = true 
}) => {
  const pointsRef = useRef();
  const { camera } = useThree();
  
  // Create geometry and material
  const { geometry, material, particleData } = useMemo(() => {
    if (!targetMesh || !targetMesh.geometry) {
      console.log('No target mesh or geometry');
      return { geometry: null, material: null, particleData: [] };
    }
    
    const geo = targetMesh.geometry;
    console.log('Creating particles from geometry with', geo.attributes.position?.count, 'vertices');
    
    // Sample points from the geometry
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const particles = [];
    
    // Get vertex positions
    const sourcePositions = geo.attributes.position;
    if (!sourcePositions) {
      console.error('No position attribute in geometry');
      return { geometry: null, material: null, particleData: [] };
    }
    
    // Sample random vertices
    for (let i = 0; i < particleCount; i++) {
      const vertexIndex = Math.floor(Math.random() * sourcePositions.count);
      const i3 = i * 3;
      
      // Get position from vertex
      const x = sourcePositions.getX(vertexIndex);
      const y = sourcePositions.getY(vertexIndex);
      const z = sourcePositions.getZ(vertexIndex);
      
      // Apply mesh transformation
      const worldPos = new THREE.Vector3(x, y, z);
      worldPos.applyMatrix4(targetMesh.matrixWorld);
      
      positions[i3] = worldPos.x;
      positions[i3 + 1] = worldPos.y;
      positions[i3 + 2] = worldPos.z;
      
      // Set color (with slight variation)
      const colorObj = new THREE.Color(color);
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i3] = colorObj.r * brightness;
      colors[i3 + 1] = colorObj.g * brightness;
      colors[i3 + 2] = colorObj.b * brightness;
      
      // Set size
      sizes[i] = particleSize * (0.5 + Math.random() * 0.5);
      
      // Store particle data for animation
      particles.push({
        originalPos: worldPos.clone(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        amplitude: 0.1 + Math.random() * 0.2
      });
    }
    
    // Create buffer geometry
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pointGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create material
    const pointMaterial = new THREE.PointsMaterial({
      size: particleSize,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    console.log('Created', particleCount, 'particles');
    
    return { 
      geometry: pointGeometry, 
      material: pointMaterial,
      particleData: particles
    };
  }, [targetMesh, particleCount, color, particleSize]);
  
  // Animation
  useFrame((state) => {
    if (!pointsRef.current || !geometry || particleData.length === 0) return;
    
    const time = state.clock.elapsedTime;
    const positions = geometry.attributes.position;
    
    if (enableAnimation) {
      particleData.forEach((particle, i) => {
        const i3 = i * 3;
        
        // Floating animation
        positions.array[i3] = particle.originalPos.x;
        positions.array[i3 + 1] = particle.originalPos.y + 
          Math.sin(time * particle.speed + particle.phase) * particle.amplitude;
        positions.array[i3 + 2] = particle.originalPos.z;
      });
      
      positions.needsUpdate = true;
    }
    
    // Rotate the entire particle system slowly
    pointsRef.current.rotation.y = time * 0.1;
  });
  
  if (!geometry || !material) {
    console.log('No geometry or material created');
    return null;
  }
  
  return <points ref={pointsRef} geometry={geometry} material={material} />;
};

export default ASCIIParticleEffectSimple;