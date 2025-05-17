import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, Html, Sky, GradientTexture } from '@react-three/drei';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Import HolographicStatue component
import DashboardHolograph from './3DVotiveStand/DashboardHolograph';

// Preload the model
useGLTF.preload('/lamboScene.glb');

// Define the target position as a constant so it's available everywhere
const TARGET_POSITION = new THREE.Vector3(0.0216, 0.5077, 0.3390);

// Create a context to share camera data with components outside of Canvas
const CameraContext = React.createContext(null);

// Camera data provider component
function CameraDataProvider({ children }) {
  const { camera } = useThree();
  const [camData, setCamData] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    fov: 0
  });

  useFrame(() => {
    setCamData({
      position: {
        x: camera.position.x.toFixed(4),
        y: camera.position.y.toFixed(4),
        z: camera.position.z.toFixed(4)
      },
      rotation: {
        x: camera.rotation.x.toFixed(4),
        y: camera.rotation.y.toFixed(4),
        z: camera.rotation.z.toFixed(4)
      },
      fov: camera.fov.toFixed(2)
    });
  });

  return (
    <CameraContext.Provider value={camData}>
      {children}
    </CameraContext.Provider>
  );
}

// Simple model component without target finding
function DeLoreanModel() {
  const { scene } = useGLTF('/lamboScene.glb');
  const [isStatueLoaded, setIsStatueLoaded] = useState(false);
  const modelRef = useRef();
  const [headTargetInfo, setHeadTargetInfo] = useState(null);
  const videoRef = useRef();
  
  // Handle statue loaded notification
  const handleStatueLoaded = () => {
    setIsStatueLoaded(true);
  };
  
  // Create a video texture and apply it to the 'Display' object
  useEffect(() => {
    if (scene) {
      // Create video element
      const video = document.createElement('video');
      video.src = '/headroom.mp4'; // Path to your video file
      video.crossOrigin = 'Anonymous';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;
      videoRef.current = video;
      
      // Create video texture
      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBAFormat;
      
      // Find the 'Display' object
      scene.traverse((object) => {
        if (object.name.includes('Display')) {
          console.log('Found Display object:', object.name);
          
          // Create a new material with the video texture
          if (object.material) {
            // Save original material properties
            const originalColor = object.material.color ? object.material.color.clone() : new THREE.Color(1, 1, 1);
            const originalMetalness = object.material.metalness !== undefined ? object.material.metalness : 0;
            const originalRoughness = object.material.roughness !== undefined ? object.material.roughness : 1;
            
            // Create new material with video texture
            const videoMaterial = new THREE.MeshStandardMaterial({
              map: videoTexture,
              color: originalColor,
              metalness: originalMetalness,
              roughness: originalRoughness,
              emissive: new THREE.Color(1, 1, 1),
              emissiveMap: videoTexture,
              emissiveIntensity: 0.5
            });
            
            // Apply material to object
            object.material = videoMaterial;
            
            // Start playing the video
            video.play().catch(err => {
              console.error('Error playing video:', err);
              
              // Try playing on user interaction as fallback
              document.addEventListener('click', () => {
                video.play().catch(e => console.error('Failed to play on click:', e));
              }, { once: true });
            });
          }
        }
      });
      
      // Log all object names to help identify the correct name if needed
      console.log('All objects in the scene:');
      scene.traverse((object) => {
        if (object.isMesh) {
          console.log(` - ${object.name}`);
        }
      });
    }
    
    // Clean up video on unmount
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current = null;
      }
    };
  }, [scene]);
  
  return (
    <>
      <primitive object={scene} ref={modelRef} />
      
      {/* Permanent DashboardHolograph with fixed position and scale */}
      {/* <DashboardHolograph 
        onLoad={handleStatueLoaded}
        position={[0.045, 0.432, 0.645]}
        rotation={[0, 0, 0]}
        scale={[0.05, 0.05, 0.05]}
      /> */}
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
  const initialPosition = { x: 0.01, y: 0.51, z: 0.6};
  
  // Store position for keyboard controls
  const [position, setPosition] = useState(initialPosition);
  const [fov, setFov] = useState(2);
  
  // Store saved positions for animations
  const [savedPositions, setSavedPositions] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Camera preset positions
  const presets = {
    position1: { 
      x: 0.0711, y: 0.503, z: -0.2412, 
      fov: 20, 
      target: { x: -0.0137, y: 0.5019, z: 0.2878 }
    },
    position2: { 
      x: 0.5791, y: 0.805, z: -0.6848, 
      fov: 20,
      target: { x: 0.0356, y: 0.4476, z: 0.2713 }
    },
    position3: { 
      x: 0.1912, y: 0.533, z: 3.1731, 
      fov: 20,
      target: { x: -0.1119, y: 0.4302, z: 0.426 }
    },
    position4: { 
      x: -5.0927, y: 3.9886, z: 12.4432, 
      fov: 20,
      target: { x: -0.2125, y: 1.0975, z: 0.1229 }
    }
  };
  
  // Create a sequence array with the positions we want to play on load
  const autoPlaySequence = [
    presets.position1,
    presets.position2,
    // presets.position3,
    // presets.position4
  ];
  
  // Function to make camera look at target
  const lookAtTarget = (targetPos = TARGET_POSITION) => {
    if (window.camera) {
      window.camera.lookAt(targetPos);
      window.camera.updateMatrixWorld();
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
        fov: window.camera.fov,
        target: {
          x: TARGET_POSITION.x,
          y: TARGET_POSITION.y, 
          z: TARGET_POSITION.z
        }
      };
      
      setSavedPositions(prev => [...prev, newPosition]);
      
      return newPosition;
    }
  };
  
  // Function to animate between positions
  const animateTo = (targetPosition, duration = 22) => {
    if (window.camera && !isAnimating) {
      setIsAnimating(true);
      
      // Create target vector from position's target or use default
      const targetVector = targetPosition.target 
        ? new THREE.Vector3(targetPosition.target.x, targetPosition.target.y, targetPosition.target.z)
        : TARGET_POSITION;
        
      // If we have OrbitControls, update its target too
      const orbitControls = window.orbitControlsRef?.current;
      if (orbitControls) {
        gsap.to(orbitControls.target, {
          x: targetVector.x,
          y: targetVector.y,
          z: targetVector.z,
          duration: duration,
          ease: "power2.inOut"
        });
      }
      
      gsap.to(window.camera.position, {
        x: targetPosition.x,
        y: targetPosition.y,
        z: targetPosition.z,
        duration: duration,
        ease: "power2.inOut",
        onUpdate: () => {
          lookAtTarget(targetVector);
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
      
      // Create target vector from position's target or use default
      const targetVector = target.target 
        ? new THREE.Vector3(target.target.x, target.target.y, target.target.z)
        : TARGET_POSITION;
        
      // Get current camera position and target for smooth interpolation
      const currentCameraPosition = { 
        x: window.camera.position.x,
        y: window.camera.position.y,
        z: window.camera.position.z
      };
      
      // Use window.orbitControlsRef instead of controlsRef
      const orbitControls = window.orbitControlsRef?.current;
      const currentOrbitTarget = orbitControls ? {
        x: orbitControls.target.x,
        y: orbitControls.target.y,
        z: orbitControls.target.z
      } : { x: TARGET_POSITION.x, y: TARGET_POSITION.y, z: TARGET_POSITION.z };

      const currentFov = window.camera.fov;

      // Create a master timeline for synchronized animations
      const timeline = gsap.timeline({
        onComplete: () => {
          currentIndex++;
          if (currentIndex < autoPlaySequence.length) {
            setTimeout(() => animateNext(), 3000); // 3 second pause between positions
          } else {
            setIsAnimating(false);
          }
        }
      });
      
      // First, smoothly move the orbit target (where the camera looks)
      // This needs to happen first or slightly before camera movement
      if (orbitControls) {
        timeline.to(orbitControls.target, {
          x: targetVector.x,
          y: targetVector.y,
          z: targetVector.z,
          duration: 6, // Longer duration for smoother movement
          ease: "power2.inOut", // Smooth acceleration and deceleration
          overwrite: "auto",
          onUpdate: () => {
            // Force orbit controls to update each frame
            orbitControls.update();
          }
        }, 0); // Start at the beginning of the timeline
      }
      
      // Then move the camera position with a slight delay
      timeline.to(window.camera.position, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 7, // Even longer duration for camera position
        delay: 0.2, // Slight delay so target starts moving first
        ease: "power3.inOut", // More pronounced ease for smoother stops
        overwrite: "auto",
        onUpdate: () => {
          // Calculate interpolation factor (0 to 1)
          const progress = timeline.progress();
          
          // Apply lookAt during transition for smoother rotation
          if (progress < 0.9) { // Only until near the end
            // Calculate interpolated look target
            const interpTarget = new THREE.Vector3(
              gsap.utils.interpolate(currentOrbitTarget.x, targetVector.x, progress),
              gsap.utils.interpolate(currentOrbitTarget.y, targetVector.y, progress),
              gsap.utils.interpolate(currentOrbitTarget.z, targetVector.z, progress)
            );
            
            // Look at the interpolated target
            window.camera.lookAt(interpTarget);
          }
          
          // Update position state
          setPosition({
            x: window.camera.position.x,
            y: window.camera.position.y,
            z: window.camera.position.z
          });
        }
      }, 0.1); // Start slightly after the target animation
      
      // Smoothly animate the FOV change
      timeline.to(window.camera, {
        fov: target.fov,
        duration: 5, // Moderate duration for FOV change
        ease: "power2.inOut",
        onUpdate: () => {
          window.camera.updateProjectionMatrix();
          setFov(window.camera.fov);
        }
      }, 0.5); // Start a bit later in the sequence
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
   
      
      gsap.to(window.camera.position, {
        x: target.x,
        y: target.y,
        z: target.z,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: () => {
          lookAtTarget(target.target);
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
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [showLightHelper, setShowLightHelper] = useState(false);
  const [showCameraGUI, setShowCameraGUI] = useState(true);
  const controlsRef = useRef();
  
  // Store orbit controls ref in window for access in camera functions
  useEffect(() => {
    window.orbitControlsRef = controlsRef;
  }, [controlsRef]);
  
  // State to store camera data outside of Canvas
  const [externalCamData, setExternalCamData] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    fov: 0
  });

  // Function to log current camera data to console
  const logCameraPosition = () => {
    if (window.camera) {
      const position = {
        x: Number(window.camera.position.x.toFixed(4)),
        y: Number(window.camera.position.y.toFixed(4)),
        z: Number(window.camera.position.z.toFixed(4))
      };
      
      const rotation = {
        x: Number(window.camera.rotation.x.toFixed(4)),
        y: Number(window.camera.rotation.y.toFixed(4)),
        z: Number(window.camera.rotation.z.toFixed(4))
      };
      
      const target = {
        x: Number(controlsRef.current?.target.x.toFixed(4)) || TARGET_POSITION.x,
        y: Number(controlsRef.current?.target.y.toFixed(4)) || TARGET_POSITION.y,
        z: Number(controlsRef.current?.target.z.toFixed(4)) || TARGET_POSITION.z
      };
      
      const cameraData = {
        position,
        rotation,
        target,
        fov: Number(window.camera.fov.toFixed(2))
      };
      
      console.log('Camera Data:', cameraData);
      
      // Format for copy to clipboard - now in proper preset format
      const formattedPreset = `{
  x: ${position.x}, y: ${position.y}, z: ${position.z},
  fov: ${cameraData.fov},
  target: { x: ${target.x}, y: ${target.y}, z: ${target.z} }
}`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(formattedPreset)
        .then(() => {
          console.log('Camera preset copied to clipboard!');
          alert('Camera preset copied to clipboard in format ready for presets object');
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          alert('Failed to copy to clipboard. See console for data.');
        });
    }
  };

  // Effect to update camera data from window.camera
  useEffect(() => {
    const updateCameraData = () => {
      if (window.camera) {
        setExternalCamData({
          position: {
            x: window.camera.position.x.toFixed(4),
            y: window.camera.position.y.toFixed(4),
            z: window.camera.position.z.toFixed(4)
          },
          rotation: {
            x: window.camera.rotation.x.toFixed(4),
            y: window.camera.rotation.y.toFixed(4),
            z: window.camera.rotation.z.toFixed(4)
          },
          fov: window.camera.fov.toFixed(2)
        });
      }
    };
    
    // Update camera data initially and on animation frames
    updateCameraData();
    const intervalId = setInterval(updateCameraData, 100);
    
    return () => clearInterval(intervalId);
  }, []);

  // Add keyboard event listener for shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if focus is in an input field
      if (e.target.tagName === 'INPUT') return;
      
      switch (e.key.toLowerCase()) {
        case 'c': // 'C' to toggle camera controls
          setControlsEnabled(prev => !prev);
          break;
        case 'l': // 'L' to toggle light helper
          setShowLightHelper(prev => !prev);
          break;
        case 'g': // 'G' to toggle camera GUI
          setShowCameraGUI(prev => !prev);
          console.log('Camera GUI toggled:', !showCameraGUI); // Add debug log
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controlsEnabled, showLightHelper, showCameraGUI]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{
          fov: 20,
          position: [0.05, 0.55, 0.65],
          near: 0.01,
          far: 300
        }}
        onCreated={({ camera, gl }) => {
          window.camera = camera;
          camera.up.set(0, 1, 0);
          camera.lookAt(TARGET_POSITION);
        }}
      >
        <CameraDataProvider>
          <Suspense fallback={null}>
            <DeLoreanModel />
            <CameraControls />
            <Environment preset="night" />
            
            {/* Sky component with synthwave colors */}
            <Sky 
              distance={450000} 
              sunPosition={[0, -0.05, -1]} 
              inclination={0.1} 
              azimuth={0.25}
              turbidity={10}
              rayleigh={1.5}
              mieCoefficient={0.005}
              mieDirectionalG={0.8}
              moonPosition={[3, 0.5, -1]}
              exposure={0.6}
            />
            
            {/* Synthwave background sphere */}
            <mesh>
              <sphereGeometry args={[50, 32, 32]} />
              <meshStandardMaterial 
                side={THREE.BackSide}
                color="#000000"
                emissive="#560088"
                emissiveIntensity={0.3}
                metalness={0.8}
                roughness={0.4}
                wireframe={false}
                fog={false}
              />
            </mesh>
            
            {/* Sun/horizon glow */}
            <mesh position={[0, 10, -80]} rotation={[0, 0, 0]}>
              <planeGeometry args={[300, 50]} />
              <meshBasicMaterial 
                side={THREE.DoubleSide}
                transparent={true}
                opacity={0.6}
                color="#ff0066"
              />
            </mesh>
            
            {/* Grid floor for synthwave effect */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
              <planeGeometry args={[500, 500, 200, 200]} />
              <meshStandardMaterial 
                color="#5b5c87"
                emissive="#5b5c87"
                emissiveIntensity={0.2}
                wireframe={true}
                fog={true}
              />
            </mesh>
            
            {/* Debugging sphere to visually confirm target */}
            {/* <mesh position={[TARGET_POSITION.x, TARGET_POSITION.y, TARGET_POSITION.z]}>
              <sphereGeometry args={[0.01, 16, 16]} />
              <meshBasicMaterial color="yellow" />
            </mesh> */}
            <ContactShadows
              position={[0, -0.5, 0]}
              opacity={0.5}
              scale={10}
              blur={1}
              far={4}
            />
            <pointLight position={[0.045, 0.22, 0.51]} intensity={1} color="#ff00ff" />
            
            {/* Hemisphere light with sunset colors */}
            <hemisphereLight 
              skyColor="#ff7e5f" // Warm orange/pink for sky
              groundColor="#371e57" // Deep purple for ground
              intensity={1.5}
              position={[0, 5, 0]}
            />
          </Suspense>
          
          <OrbitControls
            ref={controlsRef}
            target={[TARGET_POSITION.x, TARGET_POSITION.y, TARGET_POSITION.z]}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={0.5}
            enabled={controlsEnabled}
            zoomToCursor={true}
            near={0.01}
            far={100}
            // Limit zoom distance to stay inside the skybox
            minDistance={0.1}
            maxDistance={12} 
            // Restrict vertical rotation to stay above model
            minPolarAngle={0} // Can look directly from above
            maxPolarAngle={Math.PI / 2.2} // Slightly above horizon
            // Restrict damping for smoother controls
            dampingFactor={0.05}
            enableDamping={true}
          />
        </CameraDataProvider>
      </Canvas>
      
      {/* Camera position capture button */}
      <button 
        onClick={logCameraPosition}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          backgroundColor: '#ff00ff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: 'pointer',
          zIndex: 1000,
          boxShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}
      >
        Capture Camera Position
      </button>
      
      {/* Camera GUI outside of Canvas - guaranteed to be visible */}
      {showCameraGUI && (
        <div style={{
          position: 'absolute',
          top: '180px',
          left: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#00ff00',
          padding: '10px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '12px',
          userSelect: 'text',
          zIndex: 1000
        }}>
          <div><b>Position:</b> x:{externalCamData.position.x} y:{externalCamData.position.y} z:{externalCamData.position.z}</div>
          <div><b>Rotation:</b> x:{externalCamData.rotation.x} y:{externalCamData.rotation.y} z:{externalCamData.rotation.z}</div>
          <div><b>FOV:</b> {externalCamData.fov}</div>
          <div><b>Target:</b> x:{TARGET_POSITION.x.toFixed(4)} y:{TARGET_POSITION.y.toFixed(4)} z:{TARGET_POSITION.z.toFixed(4)}</div>
        </div>
      )}
      
      {/* Permanent instructions that are always visible */}
      {/* <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        fontFamily: 'monospace',
        fontSize: '12px',
        userSelect: 'text',
        zIndex: 1000
      }}>
        <h3 style={{margin: '0 0 5px 0'}}>Camera Controls</h3>
        <div>Press G to toggle camera data ({showCameraGUI ? 'ON' : 'OFF'})</div>
        <div>Press C to toggle orbit controls ({controlsEnabled ? 'ON' : 'OFF'})</div>
        <div>Arrow keys to move camera</div>
        <div>Or click the button at the bottom to capture position</div>
      </div> */}
    </div>
  );
}

export default Synthwave; 