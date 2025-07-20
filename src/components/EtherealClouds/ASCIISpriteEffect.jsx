import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Create ASCII texture outside component to avoid recreation
const createASCIITexture = (char, color) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = color;
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(char, 32, 32);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
};

const ASCIISpriteEffect = ({ 
  meshes = [], 
  particlesPerMesh = 200,
  color = '#00ff41',
  size = 0.5,
  enableAnimation = true 
}) => {
  const groupRef = useRef();
  
  // Create sprite positions and data
  const { positions, animationData } = useMemo(() => {
    if (!meshes || meshes.length === 0) return { positions: [], animationData: [] };
    
    const allPositions = [];
    const allAnimData = [];
    
    meshes.forEach((mesh, meshIndex) => {
      if (!mesh || !mesh.geometry || !mesh.geometry.attributes.position) return;
      
      mesh.updateMatrixWorld(true);
      
      const geo = mesh.geometry;
      const positionAttr = geo.attributes.position;
      const spriteCount = Math.min(particlesPerMesh, positionAttr.count);
      
      for (let i = 0; i < spriteCount; i++) {
        const vertexIndex = Math.floor(Math.random() * positionAttr.count);
        
        const x = positionAttr.getX(vertexIndex);
        const y = positionAttr.getY(vertexIndex);
        const z = positionAttr.getZ(vertexIndex);
        
        const worldPos = new THREE.Vector3(x, y, z);
        if (!mesh.isSkinnedMesh) {
          worldPos.applyMatrix4(mesh.matrixWorld);
        }
        
        allPositions.push([worldPos.x, worldPos.y, worldPos.z]);
        
        allAnimData.push({
          originalY: worldPos.y,
          phase: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 0.5,
          amplitude: 0.05 + Math.random() * 0.1
        });
      }
    });
    
    return { positions: allPositions, animationData: allAnimData };
  }, [meshes, particlesPerMesh]);
  
  // Create materials once
  const materials = useMemo(() => {
    const asciiChars = ['@', '#', '*', '+', '=', '-', '.'];
    return asciiChars.map(char => {
      const texture = createASCIITexture(char, color);
      return new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
        depthWrite: false,
        depthTest: true
      });
    });
  }, [color]);
  
  // Animation
  useFrame((state) => {
    if (!groupRef.current || !enableAnimation) return;
    
    const time = state.clock.elapsedTime;
    
    groupRef.current.children.forEach((sprite, index) => {
      const data = animationData[index];
      if (data) {
        sprite.position.y = data.originalY + 
          Math.sin(time * data.speed + data.phase) * data.amplitude;
      }
    });
    
    groupRef.current.rotation.y = time * 0.05;
  });
  
  return (
    <group ref={groupRef}>
      {positions.map((pos, index) => {
        const materialIndex = index % materials.length;
        return (
          <sprite 
            key={index} 
            position={pos} 
            scale={[size, size, size]}
            material={materials[materialIndex]}
          />
        );
      })}
    </group>
  );
};

export default ASCIISpriteEffect;