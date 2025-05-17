import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
  ChromaticAberration,
  Scanline,
  GodRays,
  Glitch,
} from "@react-three/postprocessing";
import { BlendFunction, GlitchMode } from "postprocessing";

// Set default is80sMode to false so component can be used without props
const PostProcessingEffects = ({ is80sMode = false }) => {
  const { scene } = useThree();
  const composerRef = useRef();
  const timeRef = useRef(0);

  // Increase time for animated effects
  useFrame((state, delta) => {
    timeRef.current += delta;
  });

  // Make the component visible from window for debugging
  useEffect(() => {
    // Store a reference to this component on window for external access
    window.postProcessingEffects = {
      composerRef,
      filmScanlines: 0
    };
    
    return () => {
      delete window.postProcessingEffects;
    };
  }, []);

  // Regular effects for normal mode with enhanced sunset bloom
  const normalEffects = (
    <>
      <Bloom
        intensity={1.2}           // Increased from 0.8
        luminanceThreshold={0.3}  // Lowered from 0.4 to catch more of the sunset colors
        luminanceSmoothing={0.7}  // Adjusted from 0.9 for sharper bloom edges
        height={400}              // Increased from 300 for more detail
        blendFunction={BlendFunction.SCREEN} // Use SCREEN blend mode for a more natural glow
      />
      <Vignette eskil={false} offset={0.15} darkness={0.35} />
    </>
  );

  // Enhanced effects for 80s mode with even stronger bloom
  const eightiesEffects = (
    <>
      <Bloom
        intensity={1.8}           // Increased from 1.5
        luminanceThreshold={0.05} // Lowered from 0.1 to catch more colors
        luminanceSmoothing={0.3}  // Decreased for sharper bloom
        height={400}              // Increased for more detail
        blendFunction={BlendFunction.SCREEN}
      />
      <ChromaticAberration
        offset={[0.005, 0.005]}
        radialModulation={true}
        modulationOffset={0.3}
      />
      <Scanline
        density={1.5}
        opacity={0.2}
        blendFunction={BlendFunction.OVERLAY}
      />
      <Noise opacity={0.08} />
      <Vignette eskil={false} offset={0.1} darkness={0.7} />
    </>
  );

  return (
    <EffectComposer ref={composerRef}>
      {/* In Synthwave context, we'll always use normalEffects */}
      {is80sMode ? eightiesEffects : normalEffects}
    </EffectComposer>
  );
};

export default PostProcessingEffects;
