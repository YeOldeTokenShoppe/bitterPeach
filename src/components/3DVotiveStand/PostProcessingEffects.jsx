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

const PostProcessingEffects = ({ is80sMode }) => {
  const { scene } = useThree();
  const composerRef = useRef();
  const timeRef = useRef(0);
  const bloomRef = useRef();

  // Increase time for animated effects
  useFrame((state, delta) => {
    timeRef.current += delta;
  });

  // Update bloom settings when 80s mode changes
  useEffect(() => {
    if (bloomRef.current) {
      // Enhance bloom effect when in 80s mode
      bloomRef.current.intensity = is80sMode ? 1.5 : 0.3;
      bloomRef.current.luminanceThreshold = is80sMode ? 0.6 : 0.9;
    }
  }, [is80sMode]);

  // Regular effects for normal mode
  const normalEffects = (
    <>
      <Bloom
        intensity={0.8}
        luminanceThreshold={0.4}
        luminanceSmoothing={0.9}
        height={300}
      />
      {/* <Noise opacity={0.02} /> */}
      {/* <Vignette eskil={false} offset={0.1} darkness={0.5} /> */}
    </>
  );

  // Enhanced effects for 80s mode
  const eightiesEffects = (
    <>
      <Bloom
        ref={bloomRef}
        intensity={is80sMode ? 1.5 : 0.3}
        luminanceThreshold={is80sMode ? 0.6 : 0.9}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      <ChromaticAberration
        offset={[0.003, 0.003]}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={true}
        modulationOffset={0.2}
      />
      <Scanline
        density={1.5}
        opacity={0.2}
        blendFunction={BlendFunction.OVERLAY}
      />
      <Noise opacity={0.08} />
      <Vignette eskil={false} offset={0.1} darkness={0.7} />
      <Glitch
        delay={[1.5, 3.5]} // min and max delay between glitches
        duration={[0.1, 0.3]} // min and max duration of a glitch
        strength={[0.3, 0.6]} // min and max strength
        mode={GlitchMode.CONSTANT} // glitch mode
        active={true} // turn on/off the effect (switches between "mode" prop and GlitchMode.DISABLED)
        ratio={0.85} // Threshold for strong glitches, 0 - no weak glitches, 1 - no strong glitches.
      />
    </>
  );

  return (
    <EffectComposer ref={composerRef}>
      {is80sMode ? eightiesEffects : normalEffects}
    </EffectComposer>
  );
};

export default PostProcessingEffects;
