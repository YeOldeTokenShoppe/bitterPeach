import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const ASCIIMultiMesh = ({ 
  meshes = [], 
  particlesPerMesh = 500,
  color = '#00ff41',
  particleSize = 0.5,
  enableAnimation = true 
}) => {
  const pointsRef = useRef();
  const { camera } = useThree();
  
  // Create geometry and material from multiple meshes
  const { geometry, material, particleData } = useMemo(() => {
    if (!meshes || meshes.length === 0) {
      console.log('No meshes provided');
      return { geometry: null, material: null, particleData: [] };
    }
    
    console.log('Creating particles from', meshes.length, 'meshes');
    
    const allPositions = [];
    const allColors = [];
    const allSizes = [];
    const particles = [];
    
    // Process each mesh
    meshes.forEach((mesh, meshIndex) => {
      if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position) {
        console.log('Skipping invalid mesh');
        return;
      }
      
      // Update world matrix first
      mesh.updateMatrixWorld(true);
      
      const geo = mesh.geometry;
      const positions = geo.attributes.position;
      const meshParticleCount = Math.min(particlesPerMesh, positions.count);
      
      console.log(`Mesh ${meshIndex} (${mesh.name}): sampling ${meshParticleCount} from ${positions.count} vertices`);
      console.log(`Mesh position:`, mesh.position, `scale:`, mesh.scale);
      
      // Sample points from this mesh
      for (let i = 0; i < meshParticleCount; i++) {
        const vertexIndex = Math.floor(Math.random() * positions.count);
        
        // Get position from vertex
        const x = positions.getX(vertexIndex);
        const y = positions.getY(vertexIndex);
        const z = positions.getZ(vertexIndex);
        
        // Create world position
        const worldPos = new THREE.Vector3(x, y, z);
        
        // For skinned meshes, positions are in local space
        if (mesh.isSkinnedMesh) {
          // Just use local positions for now
          worldPos.copy(new THREE.Vector3(x, y, z));
        } else {
          // Apply mesh transformation for regular meshes
          worldPos.applyMatrix4(mesh.matrixWorld);
        }
        
        allPositions.push(worldPos.x, worldPos.y, worldPos.z);
        
        // Set color with variation based on mesh
        const colorObj = new THREE.Color(color);
        const hueShift = meshIndex * 0.1;
        colorObj.offsetHSL(hueShift, 0, 0);
        const brightness = 0.5 + Math.random() * 0.5;
        allColors.push(
          colorObj.r * brightness,
          colorObj.g * brightness,
          colorObj.b * brightness
        );
        
        // Set size
        allSizes.push(particleSize * (0.5 + Math.random() * 0.5));
        
        // Store particle data for animation
        particles.push({
          originalPos: worldPos.clone(),
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5,
          amplitude: 0.1 + Math.random() * 0.2,
          meshIndex: meshIndex
        });
      }
    });
    
    if (allPositions.length === 0) {
      console.log('No particles created');
      return { geometry: null, material: null, particleData: [] };
    }
    
    // Create buffer geometry
    const pointGeometry = new THREE.BufferGeometry();
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3));
    pointGeometry.setAttribute('color', new THREE.Float32BufferAttribute(allColors, 3));
    pointGeometry.setAttribute('size', new THREE.Float32BufferAttribute(allSizes, 1));
    
    // Create material
    const pointMaterial = new THREE.PointsMaterial({
      size: particleSize * 10, // Increase size
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    console.log('Created', particles.length, 'total particles');
    
    // Log sample positions to debug
    if (allPositions.length > 0) {
      console.log('Sample particle positions:', 
        allPositions.slice(0, 9).map((v, i) => i % 3 === 0 ? [v, allPositions[i+1], allPositions[i+2]] : null).filter(Boolean)
      );
    }
    
    return { 
      geometry: pointGeometry, 
      material: pointMaterial,
      particleData: particles
    };
  }, [meshes, particlesPerMesh, color, particleSize]);
  
  // Animation
  useFrame((state) => {
    if (!pointsRef.current || !geometry || particleData.length === 0) return;
    
    const time = state.clock.elapsedTime;
    const positions = geometry.attributes.position;
    
    if (enableAnimation) {
      particleData.forEach((particle, i) => {
        const i3 = i * 3;
        
        // Floating animation with mesh-based variation
        const meshOffset = particle.meshIndex * 0.5;
        positions.array[i3] = particle.originalPos.x;
        positions.array[i3 + 1] = particle.originalPos.y + 
          Math.sin(time * particle.speed + particle.phase + meshOffset) * particle.amplitude;
        positions.array[i3 + 2] = particle.originalPos.z;
      });
      
      positions.needsUpdate = true;
    }
    
    // Gentle rotation
    pointsRef.current.rotation.y = time * 0.05;
  });
  
  if (!geometry || !material) {
    console.log('No geometry or material - returning null');
    return null;
  }
  
  console.log('Rendering points with', geometry.attributes.position.count, 'vertices');
  
  return (
    <group>
      <points ref={pointsRef} geometry={geometry} material={material} />
      {/* Debug sphere to verify component is rendering */}

    </group>
  );
};

export default ASCIIMultiMesh;