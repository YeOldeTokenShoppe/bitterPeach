import React, { useRef } from 'react';
import { EffectComposer, GodRays } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import DarkClouds from './Clouds';

const CloudsWithGodRays = () => {
  const cloudsRef = useRef();
  const sunMeshRef = useRef();

  return (
    <>
      <DarkClouds ref={cloudsRef} />
      
      {/* Sun mesh for god rays - positioned high above */}
      <mesh ref={sunMeshRef} position={[0, 100, -50]}>
        <sphereGeometry args={[15, 32, 32]} />
        <meshBasicMaterial color="#ffffcc" />
      </mesh>
      
      {/* God rays post-processing effect */}
      <EffectComposer>
        {sunMeshRef.current && (
          <GodRays
            sun={sunMeshRef}
            blendFunction={BlendFunction.SCREEN}
            samples={60}
            density={0.96}
            decay={0.92}
            weight={0.8}
            exposure={0.6}
            clampMax={1}
            width={KernelSize.SMALL}
            height={KernelSize.SMALL}
            kernelSize={KernelSize.SMALL}
            blur={true}
          />
        )}
      </EffectComposer>
    </>
  );
};

export default CloudsWithGodRays;