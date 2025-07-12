import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTexture } from '@react-three/drei';

const VolumetricLight = ({ 
  position = [0, 100, 10], 
  target = [0, 0, 0],
  color = '#ffffff',
  intensity = 2,
  angle = Math.PI / 6,
  distance = 150,
  penumbra = 0.3,
  decay = 2,
  rayCount = 30,
  rayOpacity = 0.03
}) => {
  const groupRef = useRef();
  const meshRefs = useRef([]);
  
  // Create ray geometries
  const rays = useMemo(() => {
    const raysArray = [];
    const lightDir = new THREE.Vector3(...target).sub(new THREE.Vector3(...position)).normalize();
    const lightDist = new THREE.Vector3(...position).distanceTo(new THREE.Vector3(...target));
    
    for (let i = 0; i < rayCount; i++) {
      // Create cone-shaped rays with slight variations
      const rayAngle = (Math.random() - 0.5) * angle;
      const rayRotation = Math.random() * Math.PI * 2;
      
      // Calculate ray direction with slight randomness
      const rayDir = lightDir.clone();
      rayDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), rayAngle * Math.cos(rayRotation));
      rayDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), rayAngle * Math.sin(rayRotation));
      
      // Random length variation
      const rayLength = lightDist * (0.7 + Math.random() * 0.6);
      const rayWidth = Math.tan(angle) * rayLength * (0.3 + Math.random() * 0.4);
      
      raysArray.push({
        id: i,
        position: new THREE.Vector3(...position),
        direction: rayDir,
        length: rayLength,
        width: rayWidth,
        opacity: rayOpacity * (0.5 + Math.random() * 0.5),
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
    
    return raysArray;
  }, [position, target, angle, rayCount, rayOpacity]);
  
  // Animate rays
  useFrame((state) => {
    if (!groupRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    rays.forEach((ray, index) => {
      const mesh = meshRefs.current[index];
      if (!mesh) return;
      
      // Animate opacity with subtle pulsing
      const animatedOpacity = ray.opacity * (0.8 + 0.2 * Math.sin(time * ray.speed + ray.phase));
      mesh.material.opacity = animatedOpacity;
      
      // Slight rotation animation
      mesh.rotation.z = Math.sin(time * 0.3 + ray.phase) * 0.02;
    });
  });
  
  return (
    <group ref={groupRef}>
      {rays.map((ray, index) => {
        const midPoint = ray.position.clone().add(
          ray.direction.clone().multiplyScalar(ray.length / 2)
        );
        
        return (
          <mesh
            key={ray.id}
            ref={(el) => (meshRefs.current[index] = el)}
            position={midPoint}
            rotation={[
              Math.acos(ray.direction.y),
              Math.atan2(ray.direction.x, ray.direction.z),
              0
            ]}
          >
            <coneGeometry args={[ray.width, ray.length, 8, 1, true]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={ray.opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
      
      {/* Add a subtle point light at the source */}
      <pointLight
        position={position}
        color={color}
        intensity={intensity * 0.5}
        distance={distance}
        decay={decay}
      />
    </group>
  );
};

export default VolumetricLight;