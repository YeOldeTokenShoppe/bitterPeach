import React, { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  useGLTF, 
  OrbitControls,
  Environment,
  useAnimations,
  PerspectiveCamera
} from "@react-three/drei";
import * as THREE from "three";

// Preload the model
useGLTF.preload("/SynthwaveRoad2.glb");

// Model component that handles the actual GLB
function Model() {
  const modelRef = useRef();
  
  // Load the model with animations
  const { nodes, materials, animations } = useGLTF("/SynthwaveRoad2.glb");
  
  // Use animations hook to access and control animations
  const { actions, mixer } = useAnimations(animations, modelRef);
  
  // Play animation when model loads
  React.useEffect(() => {
    if (actions && actions["Animation"]) {
      actions["Animation"].reset().fadeIn(0.5).play();
    }
  }, [actions]);
  
  // Update animation mixer on each frame
  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
  });
  
  return (
    <group ref={modelRef} dispose={null}>
      <primitive object={nodes.Scene} />
    </group>
  );
}

// Main component that sets up the Canvas and scene
function SynthRoad() {
  // Fixed camera settings
  const cameraPosition = [0.1, 0.1, 0];
  const cameraTarget = [-10, 0.6, -0.9];
  
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <Canvas shadows>
        <color attach="background" args={["#000020"]} />
        
                 {/* Simple camera setup with fixed position */}
         <OrbitControls 
           makeDefault
           target={cameraTarget}
           enableDamping
         />
         <PerspectiveCamera 
           makeDefault 
           position={cameraPosition} 
           fov={55}
         />
        
        {/* Basic lighting */}
        <ambientLight intensity={0.5} />
        {/* <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow /> */}
        
        {/* Model with Suspense */}
        <Suspense fallback={null}>
          <Model />
          <Environment preset="sunset" />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default SynthRoad; 