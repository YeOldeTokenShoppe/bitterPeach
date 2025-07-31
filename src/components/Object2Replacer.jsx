import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import HolographicStatue2 from './3DVotiveStand/HolographicStatue2';

const Object2Replacer = () => {
  const { scene } = useThree();
  const [object2Transform, setObject2Transform] = useState(null);

  useEffect(() => {
    if (!scene) return;

    const findObject2 = () => {
      scene.traverse((child) => {
        if (child.name === 'Object_2') {
          console.log('Found Object_2:', child);
          
          // Get the world transform
          const worldPosition = new THREE.Vector3();
          const worldQuaternion = new THREE.Quaternion();
          const worldScale = new THREE.Vector3();
          
          child.getWorldPosition(worldPosition);
          child.getWorldQuaternion(worldQuaternion);
          child.getWorldScale(worldScale);
          
          // Convert quaternion to euler angles
          const worldRotation = new THREE.Euler().setFromQuaternion(worldQuaternion);
          
          console.log('Object_2 World Transform:', {
            position: worldPosition,
            rotation: worldRotation,
            scale: worldScale
          });
          
          // Hide the original object
          child.visible = false;
          
          // Store the transform
          setObject2Transform({
            position: [worldPosition.x, worldPosition.y, worldPosition.z],
            rotation: [worldRotation.x, worldRotation.y - .2, worldRotation.z], // Add 90 degrees to X
            scale: [worldScale.x * 12, worldScale.y * 12, worldScale.z * 12] // Scale up 4x more (20 * 4 = 80)
          });
        }
      });
    };

    // Try immediately
    findObject2();
    
    // Also try after a delay
    const timeout = setTimeout(findObject2, 1000);
    
    return () => clearTimeout(timeout);
  }, [scene]);

  if (!object2Transform) return null;

  return (
    <HolographicStatue2
      position={object2Transform.position}
      rotation={object2Transform.rotation}
      scale={object2Transform.scale}
      hover={true}
      rotate={true}
    />
  );
};

export default Object2Replacer;