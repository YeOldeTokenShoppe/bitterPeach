import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const LightningSystem = ({ onLightning }) => {
  const lightningGroupRef = useRef();
  const lightningMeshRef = useRef();
  const materialRef = useRef();
  const lastLightningTime = useRef(0);
  const nextLightningDelay = useRef(Math.random() * 5000 + 3000);
  
  useEffect(() => {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 3,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });
    
    materialRef.current = material;
    
    const createLightningBolt = () => {
      const points = [];
      const startPoint = new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        50,
        (Math.random() - 0.5) * 50
      );
      points.push(startPoint);
      
      let currentPoint = startPoint.clone();
      const segments = 8 + Math.floor(Math.random() * 5);
      
      for (let i = 0; i < segments; i++) {
        const nextPoint = new THREE.Vector3(
          currentPoint.x + (Math.random() - 0.5) * 15,
          currentPoint.y - (50 / segments) - Math.random() * 5,
          currentPoint.z + (Math.random() - 0.5) * 10
        );
        points.push(nextPoint);
        currentPoint = nextPoint;
      }
      
      return points;
    };
    
    if (lightningMeshRef.current) {
      const points = createLightningBolt();
      geometry.setFromPoints(points);
      lightningMeshRef.current.geometry = geometry;
      lightningMeshRef.current.material = material;
    }
  }, []);
  
  useFrame((state) => {
    const time = state.clock.elapsedTime * 1000;
    
    if (time - lastLightningTime.current > nextLightningDelay.current) {
      const material = materialRef.current;
      if (material) {
        material.opacity = 1;
        
        if (onLightning) {
          onLightning();
        }
        
        const geometry = new THREE.BufferGeometry();
        const points = [];
        const startPoint = new THREE.Vector3(
          (Math.random() - 0.5) * 100,
          50,
          (Math.random() - 0.5) * 50
        );
        points.push(startPoint);
        
        let currentPoint = startPoint.clone();
        const segments = 8 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < segments; i++) {
          const nextPoint = new THREE.Vector3(
            currentPoint.x + (Math.random() - 0.5) * 15,
            currentPoint.y - (50 / segments) - Math.random() * 5,
            currentPoint.z + (Math.random() - 0.5) * 10
          );
          points.push(nextPoint);
          
          if (Math.random() > 0.7) {
            const branchEnd = new THREE.Vector3(
              nextPoint.x + (Math.random() - 0.5) * 20,
              nextPoint.y - Math.random() * 10,
              nextPoint.z + (Math.random() - 0.5) * 15
            );
            points.push(branchEnd);
            points.push(nextPoint);
          }
          
          currentPoint = nextPoint;
        }
        
        geometry.setFromPoints(points);
        if (lightningMeshRef.current) {
          lightningMeshRef.current.geometry = geometry;
        }
      }
      
      lastLightningTime.current = time;
      nextLightningDelay.current = Math.random() * 8000 + 2000;
    }
    
    if (materialRef.current && materialRef.current.opacity > 0) {
      materialRef.current.opacity -= 0.05;
      if (materialRef.current.opacity < 0) {
        materialRef.current.opacity = 0;
      }
    }
  });
  
  return (
    <group ref={lightningGroupRef}>
      <line ref={lightningMeshRef}>
        <bufferGeometry />
        <lineBasicMaterial 
          color={0xffffff}
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </line>
    </group>
  );
};

export default LightningSystem;