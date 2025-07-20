import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// ASCII characters sorted by visual density
const ASCII_CHARS = ' .:-=+*#%@';

const ASCIIParticleEffect = ({ 
  targetMesh, 
  particleCount = 5000, 
  transitionDuration = 3,
  fontSize = 0.1,
  color = '#00ff00',
  enableAnimation = true 
}) => {
  const groupRef = useRef();
  const { camera } = useThree();
  const [particles, setParticles] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionRef = useRef(0);
  
  // Sample points from mesh surface
  useEffect(() => {
    if (!targetMesh) {
      console.log('No target mesh provided');
      return;
    }
    
    const geometry = targetMesh.geometry;
    if (!geometry) {
      console.log('Target mesh has no geometry');
      return;
    }
    
    console.log('Processing geometry with', geometry.attributes.position?.count, 'vertices');
    
    // Clone and ensure we have proper attributes
    const clonedGeometry = geometry.clone();
    
    // Convert to non-indexed geometry if needed
    if (clonedGeometry.index) {
      console.log('Converting indexed geometry');
      clonedGeometry.toNonIndexed();
    }
    
    // Get position attribute
    const positions = clonedGeometry.attributes.position;
    const normals = clonedGeometry.attributes.normal;
    
    if (!positions) {
      console.error('No position attribute found in geometry');
      return;
    }
    
    const newParticles = [];
    const usedIndices = new Set();
    
    // Sample points from the geometry
    for (let i = 0; i < particleCount; i++) {
      let vertexIndex;
      
      // Try to get unique vertices
      do {
        vertexIndex = Math.floor(Math.random() * positions.count);
      } while (usedIndices.has(vertexIndex) && usedIndices.size < positions.count);
      
      usedIndices.add(vertexIndex);
      
      const x = positions.getX(vertexIndex);
      const y = positions.getY(vertexIndex);
      const z = positions.getZ(vertexIndex);
      
      // Get normal if available
      let nx = 0, ny = 1, nz = 0;
      if (normals) {
        nx = normals.getX(vertexIndex);
        ny = normals.getY(vertexIndex);
        nz = normals.getZ(vertexIndex);
      }
      
      // Random ASCII character
      const char = ASCII_CHARS[Math.floor(Math.random() * ASCII_CHARS.length)];
      
      // Apply mesh transformation
      const worldPos = new THREE.Vector3(x, y, z);
      worldPos.applyMatrix4(targetMesh.matrixWorld);
      
      newParticles.push({
        id: i,
        position: worldPos,
        normal: new THREE.Vector3(nx, ny, nz),
        char: char,
        // Animation properties
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5,
        amplitude: 0.1 + Math.random() * 0.2,
        // Transition properties
        originalPos: worldPos.clone(),
        targetPos: new THREE.Vector3(
          worldPos.x + (Math.random() - 0.5) * 10,
          worldPos.y + Math.random() * 5,
          worldPos.z + (Math.random() - 0.5) * 10
        ),
        delay: Math.random() * 0.5,
        rotationSpeed: (Math.random() - 0.5) * 2
      });
    }
    
    console.log('Created', newParticles.length, 'ASCII particles');
    setParticles(newParticles);
  }, [targetMesh, particleCount]);
  
  // Animation frame
  useFrame((state, delta) => {
    if (!groupRef.current || particles.length === 0) return;
    
    const time = state.clock.elapsedTime;
    
    // Update transition
    if (isTransitioning) {
      transitionRef.current = Math.min(transitionRef.current + delta / transitionDuration, 1);
      if (transitionRef.current >= 1) {
        setIsTransitioning(false);
      }
    }
    
    // Update each particle
    groupRef.current.children.forEach((child, i) => {
      const particle = particles[i];
      if (!particle) return;
      
      // Calculate position
      let pos;
      if (isTransitioning) {
        const t = Math.max(0, Math.min(1, (transitionRef.current - particle.delay) * 2));
        const easeT = t * t * (3 - 2 * t); // Smooth step
        pos = particle.originalPos.clone().lerp(particle.targetPos, easeT);
      } else {
        pos = particle.originalPos.clone();
        
        if (enableAnimation) {
          // Floating animation
          pos.y += Math.sin(time * particle.speed + particle.phase) * particle.amplitude;
          
          // Slight rotation around origin
          const angle = time * particle.speed * 0.2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          const x = pos.x;
          const z = pos.z;
          pos.x = x * cos - z * sin;
          pos.z = x * sin + z * cos;
        }
      }
      
      child.position.copy(pos);
      
      // Face camera
      child.lookAt(camera.position);
      
      // Rotation animation
      if (isTransitioning) {
        child.rotation.z = time * particle.rotationSpeed;
      }
      
      // Update character based on distance to camera
      if (enableAnimation) {
        const distance = camera.position.distanceTo(pos);
        const charIndex = Math.floor((distance / 50) * ASCII_CHARS.length) % ASCII_CHARS.length;
        if (child.children[0] && child.children[0].text !== ASCII_CHARS[charIndex]) {
          child.children[0].text = ASCII_CHARS[charIndex];
        }
      }
      
      // Fade based on distance
      const opacity = isTransitioning 
        ? 1 - transitionRef.current 
        : Math.max(0.3, 1 - (camera.position.distanceTo(pos) / 100));
      
      if (child.children[0] && child.children[0].material) {
        child.children[0].material.opacity = opacity;
      }
    });
  });
  
  return (
    <group ref={groupRef}>
      {particles.map((particle) => (
        <group key={particle.id} position={particle.position}>
          <Text
            fontSize={fontSize}
            color={color}
            anchorX="center"
            anchorY="middle"
            material-transparent={true}
            material-opacity={1}
          >
            {particle.char}
          </Text>
        </group>
      ))}
    </group>
  );
};

export default ASCIIParticleEffect;