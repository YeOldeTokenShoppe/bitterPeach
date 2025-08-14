import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EnhancedVolumetricLight = ({ 
  position = [0, 100, 10], 
  target = [0, 0, 0],
  color = '#ffffff',
  intensity = 3,
  rayCount = 50,
  spread = 30,
  opacity = 0.015
}) => {
  const groupRef = useRef();
  const time = useRef(0);
  
  // Create ray data with more natural distribution
  const rays = useMemo(() => {
    const raysArray = [];
    const lightPos = new THREE.Vector3(...position);
    const targetPos = new THREE.Vector3(...target);
    const direction = targetPos.clone().sub(lightPos).normalize();
    const distance = lightPos.distanceTo(targetPos);
    
    // Create multiple layers of rays for depth
    for (let layer = 0; layer < 3; layer++) {
      const layerRayCount = Math.floor(rayCount / 3);
      const layerSpread = spread * (1 + layer * 0.3);
      const layerOpacity = opacity * (1 - layer * 0.2);
      
      for (let i = 0; i < layerRayCount; i++) {
        // Use golden ratio for better distribution
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const theta = goldenAngle * i;
        const y = 1 - (i / layerRayCount) * 2;
        const radius = Math.sqrt(1 - y * y) * layerSpread;
        
        const x = Math.cos(theta) * radius;
        const z = Math.sin(theta) * radius;
        
        // Add some randomness for natural look
        const randomOffset = new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        );
        
        const rayStart = lightPos.clone().add(new THREE.Vector3(x, 0, z)).add(randomOffset);
        // Extend rays much further down (to -200 instead of -10)
        const rayEnd = targetPos.clone().add(new THREE.Vector3(x * 0.2, -200, z * 0.2));
        const rayLength = rayStart.distanceTo(rayEnd);
        const rayDirection = rayEnd.clone().sub(rayStart).normalize();
        
        // Vary the cone width based on distance
        const coneRadius = (4 + Math.random() * 3) * (1 + layer * 0.5);
        
        raysArray.push({
          id: `${layer}-${i}`,
          position: rayStart.clone().add(rayDirection.clone().multiplyScalar(rayLength / 2)),
          rotation: new THREE.Euler(
            Math.acos(rayDirection.y) + Math.PI,
            Math.atan2(rayDirection.x, rayDirection.z),
            0
          ),
          scale: [coneRadius, rayLength, coneRadius],
          opacity: layerOpacity * (0.5 + Math.random() * 0.5),
          pulseSpeed: 0.2 + Math.random() * 0.3,
          pulsePhase: Math.random() * Math.PI * 2
        });
      }
    }
    
    return raysArray;
  }, [position, target, rayCount, spread, opacity]);
  
  // Animate the rays
  useFrame((state) => {
    time.current = state.clock.getElapsedTime();
    
    if (groupRef.current) {
      // Gentle rotation of the entire light group
      groupRef.current.rotation.y = Math.sin(time.current * 0.1) * 0.02;
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Main light source */}
      <pointLight
        position={position}
        color={color}
        intensity={intensity}
        distance={500}
        decay={1.5}
      />
      
      {/* Additional spot light for focused beam */}
      <spotLight
        position={position}
        target-position={target}
        angle={0.9}
        penumbra={0.8}
        intensity={intensity * 0.5}
        color={color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={500}
      />
      
      {/* Volumetric ray meshes */}
      {rays.map((ray) => (
        <mesh
          key={ray.id}
          position={ray.position}
          rotation={ray.rotation}
          scale={ray.scale}
        >
          <coneGeometry args={[1, 1, 6, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={ray.opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      
      {/* Central bright core ray - extended much further */}
      <mesh
        position={[position[0], position[1] - 150, position[2]]}
        rotation={[Math.PI, 0, 0]}
      >
        <cylinderGeometry args={[8, 25, 500, 8, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 1.2}  // Reduced from 2
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      
      {/* Atmospheric glow at the source - commented out to hide sphere */}
      {/* <mesh position={position}>
        <sphereGeometry args={[20, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh> */}
    </group>
  );
};

export default EnhancedVolumetricLight;