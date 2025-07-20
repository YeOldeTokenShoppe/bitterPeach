import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SimpleGlitchTint = () => {
  const { scene } = useThree();
  const targetMeshesRef = useRef([]);
  const originalEmissiveRef = useRef(new Map());
  const timeRef = useRef(0);
  
  useEffect(() => {
    if (!scene) return;
    
    // Clear previous references
    targetMeshesRef.current = [];
    originalEmissiveRef.current.clear();
    
    // Find character meshes
    const characterMeshes = [];
    scene.traverse((child) => {
      if (child.isMesh && child.name) {
        const lowerName = child.name.toLowerCase();
        if (
          lowerName.includes('body') ||
          lowerName.includes('head') ||
          lowerName.includes('mesh') ||
          lowerName.includes('fabric') ||
          lowerName.includes('wear') ||
          lowerName.includes('madonnina') ||
          lowerName.includes('clothing') ||
          lowerName.includes('simulation') ||
          (child.parent && child.parent.name && (
            child.parent.name.toLowerCase().includes('armature') ||
            child.parent.name.toLowerCase().includes('ourlady') ||
            child.parent.name === 'individual'
          ))
        ) {
          characterMeshes.push(child);
          console.log(`[SimpleGlitchTint] Found character mesh: ${child.name}, material type: ${child.material?.type}`);
          
          // Store original emissive properties
          if (child.material) {
            originalEmissiveRef.current.set(child.uuid, {
              emissive: child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0, 0, 0),
              emissiveIntensity: child.material.emissiveIntensity || 0
            });
            
            // Ensure the material supports emissive
            if (!child.material.emissive) {
              // Convert to MeshStandardMaterial if needed
              const oldMaterial = child.material;
              child.material = new THREE.MeshStandardMaterial({
                color: oldMaterial.color || new THREE.Color(1, 1, 1),
                map: oldMaterial.map || null,
                normalMap: oldMaterial.normalMap || null,
                roughness: oldMaterial.roughness || 0.5,
                metalness: oldMaterial.metalness || 0.5,
                emissive: new THREE.Color(0, 0, 0),
                emissiveIntensity: 0
              });
              console.log(`[SimpleGlitchTint] Converted ${child.name} to MeshStandardMaterial`);
            }
          }
        }
      }
    });
    
    targetMeshesRef.current = characterMeshes;
    console.log(`[SimpleGlitchTint] Total meshes found: ${characterMeshes.length}`);
    
    return () => {
      // Restore original emissive properties
      targetMeshesRef.current.forEach((mesh) => {
        const original = originalEmissiveRef.current.get(mesh.uuid);
        if (original && mesh.material) {
          mesh.material.emissive = original.emissive;
          mesh.material.emissiveIntensity = original.emissiveIntensity;
        }
      });
    };
  }, [scene]);
  
  useFrame((_, delta) => {
    if (targetMeshesRef.current.length === 0) return;
    
    timeRef.current += delta;
    
    targetMeshesRef.current.forEach((mesh) => {
      if (!mesh.material) return;
      
      // Always use subtle green glitch tint regardless of mode
      const glitchIntensity = 0.3 + Math.sin(timeRef.current * 1.5) * 0.2;
      const flicker = Math.random() < 0.02;
      
      if (mesh.material.emissive) {
        mesh.material.emissive.setRGB(0, glitchIntensity, glitchIntensity * 0.3);
        mesh.material.emissiveIntensity = flicker ? 1.0 : 0.5;
      }
    });
  });
  
  return null;
};

export default SimpleGlitchTint;