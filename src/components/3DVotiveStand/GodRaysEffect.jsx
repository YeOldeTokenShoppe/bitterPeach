import React, { useRef, forwardRef } from 'react';
import { GodRays } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';

const GodRaysEffect = forwardRef(({ sunRef }, ref) => {
  if (!sunRef?.current) return null;

  return (
    <GodRays
      sun={sunRef.current}
      blendFunction={BlendFunction.SCREEN}
      samples={40}
      density={0.92}
      decay={0.93}
      weight={0.3}
      exposure={0.4}
      clampMax={1}
      width={KernelSize.SMALL}
      height={KernelSize.SMALL}
      kernelSize={KernelSize.SMALL}
      blur={true}
    />
  );
});

GodRaysEffect.displayName = 'GodRaysEffect';

export default GodRaysEffect;