import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Import HolographicStatue component
import DashboardHolograph from './3DVotiveStand/DashboardHolograph';

// Preload the model
useGLTF.preload('/deloreanScene2.glb');

// Define the target position as a constant so it's available everywhere
const TARGET_POSITION = new THREE.Vector3(0.045, 0.45, 0.25);

// Simple model component without target finding
function DeLoreanModel() {
  const { scene } = useGLTF('/deloreanScene2.glb');
  const [isStatueLoaded, setIsStatueLoaded] = useState(false);
  const modelRef = useRef();
  
  // Handle statue loaded notification
  const handleStatueLoaded = () => {
    console.log('Dashboard holograph loaded');
    setIsStatueLoaded(true);
  };
  
  return (
    <>
      <primitive object={scene} ref={modelRef} />
      
      {/* Permanent DashboardHolograph with fixed position and scale */}
      <DashboardHolograph 
        onLoad={handleStatueLoaded}
        position={[0.045, 0.432, 0.245]}
        rotation={[0, 0, 0]}
        scale={[0.05, 0.05, 0.05]}
      />
    </>
  );
}

// Camera target helper - visual indicator of where camera is looking
function CameraTarget() {
  return (
    <mesh position={[TARGET_POSITION.x, TARGET_POSITION.y, TARGET_POSITION.z]} visible={true}>
      <sphereGeometry args={[0.01, 16, 16]} />
      <meshBasicMaterial color="red" transparent opacity={0.6} />
    </mesh>
  );
}

// Camera position helper - visual indicator of camera position 
function CameraHelper() {
  const cameraPos = useRef(new THREE.Vector3());
  
  useFrame(() => {
    if (window.camera) {
      cameraPos.current.copy(window.camera.position);
    }
  });
  
  return null;
}

// Line connecting camera to target - to help visualize where camera is looking
function LookAtHelper() {
  const lineRef = useRef();
  const cameraPos = useRef(new THREE.Vector3());
  
  useFrame(() => {
    if (window.camera && lineRef.current) {
      cameraPos.current.copy(window.camera.position);
      
      // Update line geometry to connect camera and target
      const points = [
        cameraPos.current,
        TARGET_POSITION
      ];
      
      lineRef.current.geometry.setFromPoints(points);
      lineRef.current.geometry.verticesNeedUpdate = true;
    }
  });
  
  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="yellow" opacity={0.5} transparent />
    </line>
  );
}

// Simplified Point Light Helper
function PointLightHelper({ position, color, intensity }) {
  const lightRef = useRef();
  
  return (
    <pointLight 
      ref={lightRef} 
      position={position}
      intensity={intensity} 
      color={color} 
    />
  );
}

// Simple camera controls component
function CameraControls() {
  const initialPosition = { x: 0.01, y: 0.4, z: 0.4};
  
  // Store position for keyboard controls
  const [position, setPosition] = useState(initialPosition);
  const [fov, setFov] = useState(2);
  
  // Store saved positions for animations
  const [savedPositions, setSavedPositions] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Camera preset positions
  const presets = {
    position1: { x: 0.045, y: 0.419, z: 0.741, fov: 40 },
    // position2: { x: -0.9, y: 0.9, z: -4.31, fov: 12 },
    position3: { x: -2.71, y: 2.1, z: 3.75, fov: 60 }
  };
  
  // Create a sequence array with the positions we want to play on load
  const autoPlaySequence = [
    presets.position1,
    presets.position3
  ];
  
  // Function to make camera look at target
  const lookAtTarget = () => {
    if (window.camera) {
      window.camera.lookAt(TARGET_POSITION);
      window.camera.updateMatrixWorld();
      console.log('Camera looking at target:', TARGET_POSITION);
    }
  };
  
  // Function to save the current camera position
  const savePosition = (name) => {
    if (window.camera) {
      const newPosition = {
        name: name || `Position ${savedPositions.length + 1}`,
        x: window.camera.position.x,
        y: window.camera.position.y,
        z: window.camera.position.z,
        fov: window.camera.fov
      };
      
      setSavedPositions(prev => [...prev, newPosition]);
      console.log('Saved camera position:', newPosition);
      
      return newPosition;
    }
  };
  
  // Function to animate between positions
  const animateTo = (targetPosition, duration = 22) => {
    if (window.camera && !isAnimating) {
      setIsAnimating(true);
      
      gsap.to(window.camera.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: duration,
        ease: "power2.inOut",
        onUpdate: () => {
          lookAtTarget();
          setPosition({
            x: window.camera.position.x,
            y: window.camera.position.y,
            z: window.camera.position.z
          });
        },
        onComplete: () => {
          gsap.to(window.camera, {
            fov: targetPosition.fov,
            duration: duration / 3,
            ease: "power2.inOut",
            onUpdate: () => {
              window.camera.updateProjectionMatrix();
              setFov(window.camera.fov);
            },
            onComplete: () => {
              setIsAnimating(false);
              console.log('Animation complete');
            }
          });
        }
      });
    }
  };
  
  // Function to play the auto sequence
  const playAutoSequence = () => {
    if (autoPlaySequence.length < 2 || isAnimating) return;
    
    setIsAnimating(true);
    let currentIndex = 0;
    
    const animateNext = () => {
      if (currentIndex >= autoPlaySequence.length) {
        setIsAnimating(false);
        return;
      }
      
      const target = autoPlaySequence[currentIndex];
      console.log(`Animating to position ${currentIndex + 1}`);
      
      // Animate position and FOV simultaneously
      const timeline = gsap.timeline({
        onComplete: () => {
          currentIndex++;
          if (currentIndex < autoPlaySequence.length) {
            animateNext(); // Remove pause between positions
          } else {
            setIsAnimating(false);
          }
        }
      });
      
      // Position animation
      timeline.to(window.camera.position, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 4,
        ease: "power2.inOut",
        onUpdate: () => {
          lookAtTarget();
          setPosition({
            x: window.camera.position.x,
            y: window.camera.position.y,
            z: window.camera.position.z
          });
        }
      }, 0);
      
      // FOV animation (runs simultaneously)
      timeline.to(window.camera, {
        fov: target.fov,
        duration: 4,
        ease: "power2.inOut",
        onUpdate: () => {
          window.camera.updateProjectionMatrix();
          setFov(window.camera.fov);
        }
      }, 0); // Start at the same time as position animation
    };
    
    animateNext();
  };
  
  // Function to animate through all saved positions
  const playSequence = (loop = false) => {
    if (savedPositions.length < 2 || isAnimating) return;
    
    setIsAnimating(true);
    let currentIndex = 0;
    
    const animateNext = () => {
      if (currentIndex >= savedPositions.length) {
        if (loop) {
          currentIndex = 0;
        } else {
          setIsAnimating(false);
          return;
        }
      }
      
      const target = savedPositions[currentIndex];
      console.log(`Animating to position ${currentIndex + 1}: ${target.name}`);
      
      gsap.to(window.camera.position, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: () => {
          lookAtTarget();
          setPosition({
            x: window.camera.position.x,
            y: window.camera.position.y,
            z: window.camera.position.z
          });
        },
        onComplete: () => {
          gsap.to(window.camera, {
            fov: target.fov,
            duration: 1,
            ease: "power2.inOut",
            onUpdate: () => {
              window.camera.updateProjectionMatrix();
              setFov(window.camera.fov);
            },
            onComplete: () => {
              currentIndex++;
              if (currentIndex < savedPositions.length || loop) {
                setTimeout(animateNext, 1000); // 1 second pause between positions
              } else {
                setIsAnimating(false);
              }
            }
          });
        }
      });
    };
    
    animateNext();
  };
  
  // Start automatic playback when component mounts
  useEffect(() => {
    // Wait for camera to be initialized
    const timer = setTimeout(() => {
      if (window.camera) {
        console.log("Starting auto camera sequence");
        playAutoSequence();
      }
    }, 2000); // 2 second delay to ensure scene is loaded
    
    return () => clearTimeout(timer);
  }, []);
  
  // Function to apply a preset
  // const applyPreset = (presetName) => {
  //   const preset = presets[presetName];
  //   if (preset && window.camera) {
  //     window.camera.position.set(preset.x, preset.y, preset.z);
  //     window.camera.fov = preset.fov;
  //     lookAtTarget();
  //     window.camera.updateProjectionMatrix();
  //     window.camera.updateMatrixWorld();
      
  //     setPosition({x: preset.x, y: preset.y, z: preset.z});
  //     setFov(preset.fov);
      
  //     console.log(`Applied preset ${presetName}:`, preset);
  //   }
  // };
  
  // Keyboard controls for fine camera adjustments
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if focus is in an input field
      if (e.target.tagName === 'INPUT') return;
      
      let updated = false;
      const speed = e.shiftKey ? 0.01 : 0.001;
      const newPos = {...position};
      
      switch (e.key) {
        case 'ArrowUp':
          newPos.y += speed;
          updated = true;
          break;
        case 'ArrowDown':
          newPos.y -= speed;
          updated = true;
          break;
        case 'ArrowLeft':
          newPos.x -= speed;
          updated = true;
          break;
        case 'ArrowRight':
          newPos.x += speed;
          updated = true;
          break;
        case 'w':
          newPos.z -= speed;
          updated = true;
          break;
        case 's':
          newPos.z += speed;
          updated = true;
          break;
        case '+':
        case '=':
          setFov(prev => {
            const newFov = Math.max(1, prev - 1);
            window.camera.fov = newFov;
            window.camera.updateProjectionMatrix();
            return newFov;
          });
          break;
        case '-':
        case '_':
          setFov(prev => {
            const newFov = Math.min(180, prev + 1);
            window.camera.fov = newFov;
            window.camera.updateProjectionMatrix();
            return newFov;
          });
          break;
        case ' ':
          lookAtTarget();
          break;
        case 'p':
          console.log('Current camera position:', {
            x: window.camera.position.x,
            y: window.camera.position.y,
            z: window.camera.position.z,
            fov: window.camera.fov
          });
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            // Save position with Ctrl+R
            e.preventDefault();
            savePosition();
          }
          break;
        default:
          break;
      }
      
      if (updated && window.camera) {
        window.camera.position.set(newPos.x, newPos.y, newPos.z);
        lookAtTarget();
        window.camera.updateMatrixWorld();
        setPosition(newPos);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position]);
  
  // Update camera position on component mount
  useEffect(() => {
    if (window.camera) {
      window.camera.position.set(initialPosition.x, initialPosition.y, initialPosition.z);
      lookAtTarget();
      window.camera.updateMatrixWorld();
    }
  }, []);
  
  return null;
}

function Synthwave() {
  const [controlsEnabled, setControlsEnabled] = useState(true); // Enable controls by default
  const [showLightHelper, setShowLightHelper] = useState(false); // Light helper hidden by default
  const controlsRef = useRef();

  // Add keyboard event listener for shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if focus is in an input field
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.key.toLowerCase()) {
        case 'c': // 'C' to toggle camera controls
          setControlsEnabled(prev => !prev);
          console.log(`Camera controls ${!controlsEnabled ? 'enabled' : 'disabled'}`);
          break;
        case 'l': // 'L' to toggle light helper
          setShowLightHelper(prev => !prev);
          console.log(`Light helper ${!showLightHelper ? 'shown' : 'hidden'}`);
          break;
        case 'p': // 'P' to print camera position
          if (window.camera) {
            console.log('Current camera position:', {
              x: window.camera.position.x.toFixed(3),
              y: window.camera.position.y.toFixed(3),
              z: window.camera.position.z.toFixed(3),
              fov: window.camera.fov
            });
          }
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlsEnabled, showLightHelper]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{
          fov: 2,
          position: [0.09, 0.51, 0.45],
          near: 0.1,
          far: 300
        }}
        onCreated={({ camera, gl }) => {
          console.log('Camera initialized at:', camera.position);
          window.camera = camera; // Make camera globally accessible
          camera.up.set(0, 1, 0);
          // Look at target point immediately
          camera.lookAt(TARGET_POSITION);
        }}
      >
        <Suspense fallback={null}>
          <DeLoreanModel />
          <CameraControls />
          <Environment preset="night" />
          <ContactShadows
            position={[0, -0.5, 0]}
            opacity={0.5}
            scale={10}
            blur={1}
            far={4}
          />
          {/* {showLightHelper ? (
            <PointLightHelper position={[0.0435, 0.389, 0.2458]} intensity={1} color="#ff00ff" />
          ) : ( */}
            <pointLight position={[0.045, 0.22, 0.51]} intensity={.2} color="#ff00ff" />
          {/* )} */}
        </Suspense>
        
        <OrbitControls
          ref={controlsRef}
          target={[TARGET_POSITION.x, TARGET_POSITION.y, TARGET_POSITION.z]}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={true}
          autoRotateSpeed={1}
          enabled={controlsEnabled}
          zoomToCursor={true}
        />
      </Canvas>
    </div>
  );
}

export default Synthwave; 