import React, { useRef, useEffect, Suspense, useCallback, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, useAnimations, Text, Center } from '@react-three/drei';
import * as THREE from 'three';

// Add a custom hook for detecting mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    // Check if the device is mobile based on screen width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Common breakpoint for tablets/mobile
    };
    
    // Set initial value
    checkMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);
    
    // Clean up event listener
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

// Internal component to handle the 3D scene content for the scroll
function SceneContentForScroll({ scrollData }) {
  const scrollModelPath = "/Scroll.glb"; // Fixed path to the standalone scroll model
  const { scene, animations } = useGLTF(scrollModelPath);
  const modelRootRef = useRef(); // Ref for the root of the loaded scene, for useAnimations
  const [showText, setShowText] = useState(false);
  const textRef = useRef();
  const textOpacityRef = useRef(0);
  const isMobile = useIsMobile(); // Use our mobile detection hook

  // Start fade-in after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowText(true);
      console.log("Starting text fade-in animation");
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Animate text opacity using useFrame
  useFrame(() => {
    if (showText && textRef.current && textRef.current.material) {
      // Gradually increase opacity for smooth fade-in
      if (textOpacityRef.current < 1) {
        textOpacityRef.current += 0.01; // Adjust speed as needed
        textRef.current.material.opacity = textOpacityRef.current;
      }
    }
  });

  // Important: useAnimations hook should target the object that actually contains the animated nodes (e.g., Armature)
  // If Scroll.glb has an Armature at its root or as a direct child of `scene` that drives animations,
  // then `modelRootRef` (pointing to `scene`) is appropriate.
  // If animations target something deeper, `modelRootRef` might need to point to that specific object once found.
  const { actions } = useAnimations(animations, modelRootRef); 

  useEffect(() => {
    if (scene) {
      console.log("ScrollDetailViewer: Loaded /Scroll.glb scene object:", scene);
      // Optional: Calculate and apply centering based on bounding box
      // This helps if the model's pivot isn't at its geometric center.
      // const box = new THREE.Box3().setFromObject(scene);
      // const center = box.getCenter(new THREE.Vector3());
      // scene.position.sub(center); // Center the model
      // console.log("ScrollDetailViewer: Model bounding box center:", center);
    }
  }, [scene]);

  useEffect(() => {
    if (!actions || animations.length === 0 || !scene) return;

    console.log("ScrollDetailViewer: Available animations in", scrollModelPath, animations.map(a => a.name));

    // Use the exact animation name we expect from Scroll.glb, which you confirmed is the same
    const openAnimationName = 'Armature|3_Opened Action _Armature'; 
    const openAction = actions[openAnimationName];

    if (openAction) {
      console.log(`ScrollDetailViewer: Playing animation '${openAnimationName}'`);
      openAction.reset().setLoop(THREE.LoopOnce).play();
      openAction.clampWhenFinished = true;
    } else {
      console.warn(`ScrollDetailViewer: Animation '${openAnimationName}' not found in Scroll.glb. Available:`, Object.keys(actions));
      // Fallback: Try to play the first animation if the named one isn't found
      if (animations.length > 0 && actions[animations[0].name]){
        console.warn("ScrollDetailViewer: Playing first available animation as fallback:", animations[0].name);
        actions[animations[0].name].reset().setLoop(THREE.LoopOnce).play();
        actions[animations[0].name].clampWhenFinished = true;
      }
    }
  }, [actions, animations, scene]); // Depend on actions and animations

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[5, 10, 7]} intensity={1.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      {/* <axesHelper args={[5]} /> Visual aid for origin and axes */}
      
      {/* Drei's <Center> component can automatically center the model */}
      <Center onCentered={({ center, boundingBox }) => {
        console.log('ScrollDetailViewer: Model centered by <Center> component.');
        console.log('ScrollDetailViewer: Center position:', center);
        console.log('ScrollDetailViewer: BoundingBox:', boundingBox);
      }}>
        {/* Add a group here to apply initial rotation to the scroll model if needed */}
        <group rotation={[0, THREE.MathUtils.degToRad(270), 0]}> {/* TODO: Adjust this Y rotation (and X or Z if needed) */}
          <primitive 
            ref={modelRootRef} 
            object={scene} 
            scale={isMobile ? 4.5 : 5.5}     
          />
        </group>
      </Center>

      {/* Only render Text after timer expires */}
      {scrollData?.message && showText && (
        <Text
          ref={textRef}
          position={[0, 0, isMobile ? 0.09 : 0.07]} // Move text out slightly for better visibility on mobile
          rotation={[0, 0, 0]}
          fontSize={isMobile ? 0.12 : 0.10}          
          color="#202020"           
          anchorX="center"        
          anchorY="middle"        
          maxWidth={isMobile ? 1.2 : 1.0}
          lineHeight={1.3}         
          textAlign="center"      
          font="/fonts/UnifrakturMaguntia-Regular.ttf"
          opacity={0} // Start at 0 and animate up
          transparent
        >
          {scrollData.message}
        </Text>
      )}
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        enableDamping={true}
        dampingFactor={0.5} // Lower value for smoother, more gradual stopping
        rotateSpeed={0.5} // Reduced rotation speed for smoother control
        zoomSpeed={0.7} // Slightly reduced zoom speed
        minDistance={isMobile ? 1.5 : 2} // Allow closer zoom on mobile
        maxDistance={isMobile ? 5 : 4} // Allow more zoom out on mobile
        target={[0, 0, 0]} // Should be fine if model is centered at origin
      />
    </>
  );
}

function ScrollDetailViewer({ isVisible, onClose, scrollData }) {
  const isMobile = useIsMobile();
  
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);
  
  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Slightly darker overlay
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2000, // Higher zIndex
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          width: isMobile ? "95vw" : "60vw",
          height: isMobile ? "80vh" : "90vh",
          backgroundColor: 'rgba(0, 0, 0, 0.35)', // Parchment-like background for the modal box
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden', 
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        <Canvas
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "10px",
            }}
          shadows
          camera={{ 
            position: [0, 0, isMobile ? 4.0 : 3.5], 
            fov: isMobile ? 60 : 50 
          }}
          dpr={[1, 1.5]}
        >
          <Suspense fallback={null}>
            <SceneContentForScroll scrollData={scrollData} />
          </Suspense>
        </Canvas>
        
        {/* Instructions overlay with close button - matching CandleInteraction.jsx style */}
        <div
          style={{
            position: "absolute",
            bottom: isMobile ? "10px" : "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255, 255, 255, 0.2)",
            padding: isMobile ? "8px 15px" : "10px 20px",
            borderRadius: "20px",
            fontSize: isMobile ? "12px" : "14px",
            pointerEvents: "auto",
            zIndex: 12,
            whiteSpace: isMobile ? "normal" : "nowrap",
            textAlign: isMobile ? "center" : "left",
            maxWidth: isMobile ? "90%" : "auto",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            gap: isMobile ? "10px" : "15px",
          }}
        >
          <span>Use one finger to rotate • Two fingers to zoom</span>
          {/* <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid rgba(0, 0, 0, 0.3)",
              borderRadius: "15px",
              padding: "5px 12px",
              cursor: "pointer",
              fontSize: isMobile ? "12px" : "14px",
              fontWeight: "bold",
              color: "#333",
              transition: "all 0.2s ease",
              userSelect: "none",
              width: isMobile ? "100%" : "auto",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            aria-label="Close viewer"
          >
            Close Viewer
          </button> */}
        </div>
      </div>
    </div>
  );
}

useGLTF.preload("/Scroll.glb");

export default ScrollDetailViewer; 