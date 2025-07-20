import React, { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ASCII characters sorted by visual density
const ASCII_CHARS = '.,-~:;=!*#$@';

const ASCIITextEffect = ({ 
  meshes = [], 
  particlesPerMesh = 200, // Lower count for text
  color = '#00ff41',
  fontSize = 0.5,
  enableAnimation = true 
}) => {
  
  // Create ASCII particles from meshes
  const particles = useMemo(() => {
    if (!meshes || meshes.length === 0) {
      console.log('No meshes provided for ASCII text');
      return [];
    }
    
    const allParticles = [];
    
    // Process each mesh
    meshes.forEach((mesh, meshIndex) => {
      if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position) {
        return;
      }
      
      // Update world matrix
      mesh.updateMatrixWorld(true);
      
      const geo = mesh.geometry;
      const positions = geo.attributes.position;
      const meshParticleCount = Math.min(particlesPerMesh, positions.count);
      
      console.log(`Creating ASCII for ${mesh.name}: ${meshParticleCount} characters`);
      
      // Sample points from this mesh
      for (let i = 0; i < meshParticleCount; i++) {
        const vertexIndex = Math.floor(Math.random() * positions.count);
        
        // Get position from vertex
        const x = positions.getX(vertexIndex);
        const y = positions.getY(vertexIndex);
        const z = positions.getZ(vertexIndex);
        
        // Create world position
        const worldPos = new THREE.Vector3(x, y, z);
        
        // For skinned meshes, just use local space
        if (!mesh.isSkinnedMesh) {
          worldPos.applyMatrix4(mesh.matrixWorld);
        }
        
        // Select ASCII character based on position or randomness
        const charIndex = Math.floor(Math.random() * ASCII_CHARS.length);
        const char = ASCII_CHARS[charIndex];
        
        allParticles.push({
          id: `${meshIndex}-${i}`,
          position: [worldPos.x, worldPos.y, worldPos.z],
          char: char,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5,
          amplitude: 0.1 + Math.random() * 0.2,
          originalY: worldPos.y
        });
      }
    });
    
    console.log(`Created ${allParticles.length} ASCII characters total`);
    return allParticles;
  }, [meshes, particlesPerMesh]);
  
  return (
    <group>
      {particles.map((particle) => (
        <Text
          key={particle.id}
          position={particle.position}
          fontSize={fontSize}
          color={color}
          anchorX="center"
          anchorY="middle"
        >
          {particle.char}
        </Text>
      ))}
    </group>
  );
};

export default ASCIITextEffect;