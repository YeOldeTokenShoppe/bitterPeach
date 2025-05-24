import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import HolographicStatueMoon from './3DVotiveStand/HolographicStatueMoon';
// Loader for finding flag position and hiding flag placeholder

import { 
  OrbitControls, 
  useGLTF, 
  Stars, 
  Environment, 
  Html, 
  useProgress,
  ContactShadows,
  Box,

} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import AstronautCustomizerModal from './AstronautCustomizerModal';
import AstronautDetailModal from './AstronautDetailModal';
import Flag from './Flag';
import ParticleBackground from './ParticleBackground';
import SidePanel from './SidePanel';
import MobileSidePanel from './MobileSidePanel';

// Constants for collision detection
const MOON_RADIUS = 2.5; // Matches the moon scale
const ASTRONAUT_RADIUS = 0.15; // Approximate radius of an astronaut
const MIN_DISTANCE = MOON_RADIUS + ASTRONAUT_RADIUS; // Minimum distance from moon center


// Loading indicator
function Loader() {
  const { progress } = useProgress();
  return <Html center>
    <div className="bg-black/70 text-white px-6 py-3 rounded-lg backdrop-blur-md">
      <div className="text-xl">Loading Models</div>
      <div className="w-full bg-gray-800 h-2 mt-2 rounded-full overflow-hidden">
        <div 
          className="bg-blue-400 h-full transition-all duration-300 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-center mt-1">{progress.toFixed(0)}%</div>
    </div>
  </Html>;
}

// Moon model component
function Moon(props) {
  const { onMoonClick } = props;
  const moonRef = useRef();
  const flagRef = useRef();
  const { scene } = useGLTF('/low_poly_moon2.glb');

  // Add debug logging for moon model structure
  useEffect(() => {
    if (!scene) return;
    
    console.log("Inspecting moon model structure:");
    scene.traverse((child) => {
      if (child.name && child.name.toLowerCase().includes('mary')) {
        console.log("Found Mary object:", {
          name: child.name,
          position: child.position,
          worldPosition: child.getWorldPosition(new THREE.Vector3()),
          parent: child.parent?.name
        });
      }
    });
  }, [scene]);

  const [flagAnchor, setFlagAnchor] = useState(null);
  const [lightAnchor, setLightAnchor] = useState(null);
  const [lightAnchor2, setLightAnchor2] = useState(null);
  const [maryPosition, setMaryPosition] = useState(null);

  useEffect(() => {
    if (!scene) return;
    let fAnchor = null;
    let lAnchor = null;
    let lAnchor2 = null;
    scene.traverse((child) => {
      if (child.name === "FlagAnchor") {
        fAnchor = child;
      }
      if (child.name === "LightAnchor") {
        lAnchor = child;
      }
      if (child.name === "LightAnchor2") {
        lAnchor2 = child;
      }
      if (child.name && child.name.toLowerCase().includes('mary')) {
        const worldPos = child.getWorldPosition(new THREE.Vector3());
        console.log("Found Mary object:", {
          name: child.name,
          localPosition: child.position,
          worldPosition: worldPos
        });
        setMaryPosition(worldPos);
      }
    });
    setFlagAnchor(fAnchor);
    setLightAnchor(lAnchor);
    setLightAnchor2(lAnchor2);
  }, [scene]);

  // Parent flag mesh to anchor
  useEffect(() => {
    if (flagAnchor && flagRef.current) {
      flagAnchor.add(flagRef.current);
      // Optionally reset local transform here
      // flagRef.current.position.set(0, 0, 0);
      // flagRef.current.rotation.set(0, 0, 0);
      // flagRef.current.scale.set(1, 1, 1);
    }
  }, [flagAnchor, flagRef]);
  
  useEffect(() => {
    // Add emissive properties to the moon materials
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone(); // Clone to avoid affecting other instances
        child.material.emissive = new THREE.Color(0x404080); // Subtle blue-white glow
        child.material.emissiveIntensity = 0.3; // Moderate intensity
        child.material.depthTest = true;
        child.material.depthWrite = true;
        child.material.needsUpdate = true;
      }
    });
  }, [scene]);
  
  // Add gentle rotation to the moon
  useFrame((state, delta) => {
    if (moonRef.current) {
      // Very slow rotation on Y axis (0.03 radians per second)
      moonRef.current.rotation.y += delta * 0.03;
    }
  });
  
  return (
    
    <group ref={moonRef} {...props} onClick={onMoonClick} dispose={null}>
      <primitive object={scene} />
      <Flag flagRef={flagRef} />
      
      {/* HolographicStatue parented to moon */}
      {/* <HolographicStatueMoon
        position={[0.03, 1.005, 0.2]}
        scale={[0.05, 0.05, 0.05]}
        rotation={[0, 0, 0]}
        hover={true}
        rotate={true}
        parentRef={moonRef}
        onLoad={() => {
          console.log("HolographicStatueMoon loaded at position:", [0.2, 2.52, 0.2]);
        }}
      /> */}

      {maryPosition && (
        <>
          {/* Debug marker */}
          <mesh position={[3.059, 100.845, 19.877]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>
          <HolographicStatue
            position={[3.059, 100.845, 19.877]}
            scale={[0.01, 0.01, 0.01]} // Much smaller scale to match moon's scale
            rotation={[0, 0, 0]}
            hover={true}
            rotate={true}
            isInMarkerView={false}
            isMobileView={false}
            setShowSpotify={() => {}}
            showSpotify={false}
            isModalOpen={false}
            setIsModalOpen={() => {}}
            onSpawnReady={() => {
              console.log("HolographicStatue spawned");
            }}
            is80sMode={false}
            userData={null}
            onLoad={() => {
              console.log("HolographicStatue loaded at local position:", [3.059, 100.845, 19.877]);
            }}
          />
        </>
      )}
      {lightAnchor && (
        <pointLight
          position={[0, 0, 0]}
          color={new THREE.Color(0x87ceeb)}
          intensity={0.6}
          distance={0.5}
          decay={0.5}
          castShadow={false}
          onUpdate={(self) => lightAnchor.add(self)}
        />
      )}
      {lightAnchor2 && (
        <pointLight
          position={[0, 0, 0]}
          color={new THREE.Color(0xFF8C00)}
          intensity={1.2}
          distance={0.7}
          decay={0.6}
          castShadow={false}
          onUpdate={(self) => lightAnchor2.add(self)}
        />
      )}
    </group>
  );
}

// Floating astronaut component with user textures
function Astronauts(props) {
  const { userHelmetTextures, onAstronautClick, focusedAstronaut } = props;

  // Debug mode - set to true to see FaceTarget and axes
  const DEBUG_MODE = false; // Temporarily enable debug mode
  
  // Load both static and animated models
  const { scene: staticScene } = useGLTF('/Astronaut2.glb');
  const { scene: animatedScene, animations } = useGLTF('/Astronaut02.glb');
  const instancesRef = useRef();
  const [initialInstanceData, setInitialInstanceData] = useState([]);
  const mixerRef = useRef(null);

  // Find and store the helmet object from the animated scene
  const [animatedHelmet, setAnimatedHelmet] = useState(null);
  
  useEffect(() => {
    if (!animatedScene) return;
    
    // Find the helmet in the animated scene
    animatedScene.traverse((child) => {
      if (child.name && child.name.toLowerCase().includes('helmet')) {
        setAnimatedHelmet(child);
        if (DEBUG_MODE) {
          console.log("Found animated helmet:", child.name);
        }
      }
    });
  }, [animatedScene]);

  // Set up animation mixer
  useEffect(() => {
    if (!animations || !animatedScene) return;

    // Create animation mixer
    mixerRef.current = new THREE.AnimationMixer(animatedScene);

    // Find all three animations
    const float1Animation = animations.find(anim => anim.name === "Astronaut Float 1");
    const float2Animation = animations.find(anim => anim.name === "Astronaut Float 2");
    const float3Animation = animations.find(anim => anim.name === "Astronaut Float 3");
    
    if (float1Animation && float2Animation && float3Animation) {
      if (DEBUG_MODE) {
        console.log("Found float animations:", { 
          float1: float1Animation.name, 
          float1Duration: float1Animation.duration,
          float2: float2Animation.name,
          float2Duration: float2Animation.duration,
          float3: float3Animation.name,
          float3Duration: float3Animation.duration
        });
      }
      
      // Create animation actions
      const action1 = mixerRef.current.clipAction(float1Animation);
      const action2 = mixerRef.current.clipAction(float2Animation);
      const action3 = mixerRef.current.clipAction(float3Animation);
      
      // Configure all actions
      [action1, action2, action3].forEach(action => {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;
      });

      // Set up the sequence
      const actions = [action1, action2, action3];
      let currentIndex = 0;
      let currentAction = actions[currentIndex];
      
      // Function to switch to next animation
      const switchToNextAnimation = () => {
        // Get next action index
        currentIndex = (currentIndex + 1) % actions.length;
        const nextAction = actions[currentIndex];
        
        if (DEBUG_MODE) {
          console.log("Switching animation from", currentAction.getClip().name, "to", nextAction.getClip().name);
        }
        
        // Crossfade between animations
        nextAction.reset();
        nextAction.play();
        currentAction.crossFadeTo(nextAction, 1.0, true);
        
        // Update current action
        currentAction = nextAction;
      };

      // Start with Float 1
      currentAction.play();
      if (DEBUG_MODE) {
        console.log("Started with animation:", currentAction.getClip().name);
      }

      // Set up animation completion listener using the mixer's finished event
      const onFinished = (event) => {
        if (DEBUG_MODE) {
          console.log("Animation finished:", event.action.getClip().name);
        }
        if (event.action === currentAction) {
          switchToNextAnimation();
        }
      };

      mixerRef.current.addEventListener('finished', onFinished);

      // Cleanup function
      return () => {
        mixerRef.current.removeEventListener('finished', onFinished);
      };
    } else if (DEBUG_MODE) {
      console.warn("Could not find required animations");
      console.log("Available animations:", animations.map(a => a.name));
    }
  }, [animations, animatedScene]);

  // Update animation mixer in the animation loop
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  useEffect(() => {
    if (!staticScene || !animatedScene || !userHelmetTextures || !userHelmetTextures.length) return;
    
    const numInstances = userHelmetTextures.length;

    if (instancesRef.current) {
      while (instancesRef.current.children.length > 0) {
        instancesRef.current.remove(instancesRef.current.children[0]);
      }
    }
    
    const moonRadius = 3.5;
    const newInstanceData = [];
    
    for (let i = 0; i < numInstances; i++) {
      const userData = userHelmetTextures[i];
      // Only clone the static scene
      const staticAstronautScene = staticScene.clone();
      
      // Find the Astronaut_2 parent and helmet objects in static scene
      let staticAstronautParent = null;
      let staticHelmetObjects = [];
      
      staticAstronautScene.traverse((child) => {
        if (child.name === 'Astronaut_2') {
          staticAstronautParent = child;
        }
        if (child.name && child.name.toLowerCase().includes('helmet')) {
          staticHelmetObjects.push(child);
        }
      });

      if (DEBUG_MODE) {
        console.log(`Astronaut ${i} structure:`, {
          hasStaticAstronautParent: !!staticAstronautParent,
          staticHelmetCount: staticHelmetObjects.length
        });
      }

      // Apply materials to static helmet objects
      staticHelmetObjects.forEach(helmet => {
        if (helmet.material) {
          helmet.material = helmet.material.clone();
          helmet.material.map = userData.texture;
          helmet.material.emissive = new THREE.Color(0xa1fcea);
          helmet.material.emissiveIntensity = 0.3;
          helmet.material.emissiveMap = userData.texture;
          helmet.material.needsUpdate = true;
        }
      });

      // Apply glass material properties to static scene
      staticAstronautScene.traverse((child) => {
        if (child.isMesh) {
          const nameLower = child.name.toLowerCase();
          if (nameLower.includes('glass')) {
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 0.1;
            child.material.side = THREE.DoubleSide;
            child.material.emissive = new THREE.Color(0xa1fcea);
            child.material.emissiveIntensity = 0.3;
            child.material.needsUpdate = true;
          }
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData = { astronautIndex: i, userData: userData };
        }
      });
      
      // Create a group for the astronaut and its label
      const astronautGroup = new THREE.Group();
      astronautGroup.userData = { 
        astronautIndex: i, 
        userData: userData,
        staticScene: staticAstronautScene,
        animatedScene: animatedScene // Store reference to original animated scene
      };
      
      // Add the static astronaut model to the group initially
      staticAstronautScene.scale.set(0.15, 0.15, 0.15);
      astronautGroup.add(staticAstronautScene);
      
      // Calculate position and rotation
      const phi = Math.acos(-1 + (2 * i) / numInstances);
      const theta = Math.sqrt(numInstances * Math.PI) * phi;
      let x = moonRadius * Math.sin(phi) * Math.cos(theta);
      let y = moonRadius * Math.sin(phi) * Math.sin(theta);
      let z = moonRadius * Math.cos(phi);
      
      const randomDisplacementFactor = (Math.random() - 0.5) * 0.5;
      const displacement = new THREE.Vector3(x, y, z).normalize().multiplyScalar(randomDisplacementFactor);
      
      const initialPosition = new THREE.Vector3(x + displacement.x, y + displacement.y, z + displacement.z);
      const initialRotation = new THREE.Euler(
        Math.random() * 2 * Math.PI,
        Math.random() * 2 * Math.PI,
        Math.random() * 2 * Math.PI
      );
      
      newInstanceData.push({
        initialPosition,
        initialRotation,
        userData: userData,
        astronautIndex: i,
        bobSpeed: Math.random() * 0.05 + 0.02,
        bobAmplitude: Math.random() * 0.015 + 0.005,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        )
      });
      
      // Set the group position and rotation
      astronautGroup.position.copy(initialPosition);
      astronautGroup.rotation.copy(initialRotation);
      
      // Add the group to the scene
      instancesRef.current.add(astronautGroup);
    }
    
    setInitialInstanceData(newInstanceData);
  }, [staticScene, animatedScene, userHelmetTextures, onAstronautClick]);

  // Effect to handle model switching when focused
  useEffect(() => {
    if (!instancesRef.current || !animatedHelmet) return;

    instancesRef.current.children.forEach((astronautGroup) => {
      const { astronautIndex, staticScene, animatedScene, userData } = astronautGroup.userData;
      const isFocused = focusedAstronaut && focusedAstronaut.index === astronautIndex;

      // Remove current scene
      while (astronautGroup.children.length > 0) {
        astronautGroup.remove(astronautGroup.children[0]);
      }

      // Add appropriate scene
      if (isFocused) {
        // Apply user texture to animated helmet
        if (animatedHelmet.material) {
          animatedHelmet.material = animatedHelmet.material.clone();
          animatedHelmet.material.map = userData.texture;
          animatedHelmet.material.emissive = new THREE.Color(0xa1fcea);
          animatedHelmet.material.emissiveIntensity = 0.3;
          animatedHelmet.material.emissiveMap = userData.texture;
          animatedHelmet.material.needsUpdate = true;
        }
        
        // Scale the animated scene when adding it
        animatedScene.scale.set(0.15, 0.15, 0.15);
        astronautGroup.add(animatedScene);

        // Reset animation mixer time when switching to animated model
        if (mixerRef.current) {
          mixerRef.current.setTime(0);
        }
      } else {
        // Use static scene for non-focused state
        astronautGroup.add(staticScene);
      }
    });
  }, [focusedAstronaut, animatedHelmet]);
  
  // Handle clicks on astronauts using R3F's event system on the group
  const handleClick = (event) => {
    // Skip if the clicked object is the FaceTarget
    if (event.object.name === "FaceTarget" || 
        event.object.userData?.nonInteractive) {
      return;
    }
    
    event.stopPropagation(); // Important: stop propagation here
    
    // event.object is the mesh that was clicked.
    // We need to find the actual astronaut scene instance (its parent group)
    let clickedAstronautInstance = null;
    let currentObject = event.object;
    
    // Traverse up to find the main astronaut group, which is a direct child of instancesRef.current
    // and has the correct userData.
    while (currentObject) {
      if (currentObject.parent === instancesRef.current && currentObject.userData && currentObject.userData.astronautIndex !== undefined) {
        clickedAstronautInstance = currentObject;
        break;
      }
      if (currentObject === instancesRef.current) { // Stop if we reach the main group itself
        break;
      }
      currentObject = currentObject.parent;
    }

    if (clickedAstronautInstance) {
      const { astronautIndex, userData } = clickedAstronautInstance.userData;

      if (onAstronautClick) {
        onAstronautClick(astronautIndex, clickedAstronautInstance, userData);
      }
    } else {
      // Fallback: if event.object itself has the astronaut's direct userData
      if (event.object.userData && event.object.userData.astronautIndex !== undefined) {
        const { astronautIndex, userData } = event.object.userData;
   
        // We need the main astronaut scene object (parent group) for positioning
        let mainAstronautGroup = event.object;
        while(mainAstronautGroup.parent !== instancesRef.current && mainAstronautGroup.parent) {
          mainAstronautGroup = mainAstronautGroup.parent;
        }
        if (mainAstronautGroup.parent === instancesRef.current) {
          if (onAstronautClick) {
            onAstronautClick(astronautIndex, mainAstronautGroup, userData);
          }
        } else {
          console.log("Fallback failed to find main astronaut group.");
        }
      }
    }
  };

  // Animate the astronauts
  useFrame((state, delta) => {
    if (!initialInstanceData.length || !instancesRef.current) return;
    const time = state.clock.getElapsedTime();
    initialInstanceData.forEach((data, index) => {
      const instance = instancesRef.current.children[index];
      if (!instance || instance.userData.astronautIndex === undefined) return;

      // Skip floating motion for focused astronaut (it has its own animation)
      if (focusedAstronaut && focusedAstronaut.index === index) {
        return;
      }

      // Enhanced floating motion
      const basePosition = data.initialPosition.clone();
      
      // Increased movement values for more noticeable motion
      const bobAmplitude = 0.1;
      const bobSpeed = 0.5;
      
      // Gentle bobbing motion
      const bobHeight = Math.sin(time * bobSpeed + index) * bobAmplitude;
      const bobSide = Math.cos(time * bobSpeed * 0.7 + index * 1.5) * bobAmplitude * 0.7;
      
      // Add a slight circular motion
      const circleRadius = bobAmplitude * 0.5;
      const circleX = Math.cos(time * bobSpeed * 0.5 + index) * circleRadius;
      const circleZ = Math.sin(time * bobSpeed * 0.5 + index) * circleRadius;
      
      // Combine all motions
      instance.position.copy(basePosition);
      instance.position.y += bobHeight;
      instance.position.x += bobSide + circleX;
      instance.position.z += circleZ;
      
      if (DEBUG_MODE && index === 0) {
        console.log('Astronaut position:', {
          base: basePosition,
          current: instance.position,
          bobHeight,
          bobSide,
          circleX,
          circleZ
        });
      }
      
      // Ensure minimum distance from moon
      const distanceToMoonCenter = instance.position.length();
      if (distanceToMoonCenter < MIN_DISTANCE) {
        const direction = instance.position.clone().normalize();
        instance.position.copy(direction.multiplyScalar(MIN_DISTANCE));
      }
      
      // Enhanced rotation for tumbling effect
      const tumbleSpeed = 0.3;
      const tumbleRange = Math.PI / 4; // Increased from PI/6 to PI/4 (45 degrees)
      const zTumbleRange = Math.PI / 2; // Increased from PI/3 to PI/2 (90 degrees)
      const xTumbleRange = Math.PI / 2; // New specific range for X-axis (90 degrees)
      
      // Base rotation that keeps astronaut facing outward from moon
      const directionFromMoon = instance.position.clone().normalize();
      let currentRotationY = Math.atan2(directionFromMoon.z, directionFromMoon.x);
      
      // Create a more complex tumbling motion
      const tumbleX = Math.sin(time * tumbleSpeed * 0.7) * xTumbleRange; // Using new X range
      const tumbleY = Math.sin(time * tumbleSpeed * 0.5 + 1) * tumbleRange;
      const tumbleZ = Math.cos(time * tumbleSpeed * 0.3 + 2) * zTumbleRange;
      
      // Combine base rotation with tumbling
      instance.rotation.set(
        data.initialRotation.x + tumbleX,
        currentRotationY + tumbleY,
        data.initialRotation.z + tumbleZ
      );

      if (DEBUG_MODE && index === 0) {
        console.log('Astronaut rotation:', {
          tumbleX,
          tumbleY,
          tumbleZ,
          current: instance.rotation
        });
      }
    });
  }, -1);
  
  return (
    <group ref={instancesRef} onClick={handleClick} {...props}>
      {initialInstanceData.map((data, i) => 
        focusedAstronaut && focusedAstronaut.index === i ? (
          <Html
            key={i}
            transform
            sprite
            depthTest={true}
            depthWrite={false}
            geometry={<planeGeometry args={[.15, .15]} />}
            distanceFactor={8}
            position={[0.0, 0.2, 0]} // Position slightly above astronaut
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            {...{ parent: instancesRef.current ? instancesRef.current.children[i] : null }}
            attachCamera={true}
            needsUpdate={true}
          >
            <div style={{
              background: 'rgba(255,0,0,0.0)',
              color: 'white',
              borderRadius: '5%',
              marginTop: '0.03em',
              paddingTop: '0.03em',
              width: '120%',
              height: '100%',
              fontFamily: 'UnifrakturMaguntia',
              fontSize: '0.08em',
              display: 'block',
              textAlign: 'center',
              textShadow: '0 0 0.1em #fff, 0 0 0.2em #0ff, 0 0 0.3em #f0f',
              animation: 'pulse 1.5s infinite alternate',
            }}>
              <style>
                {`
                  @keyframes pulse {
                    0% { text-shadow: 0 0 0.1em #fff, 0 0 0.2em #0ff, 0 0 0.3em #f0f; }
                    100% { text-shadow: 0 0 0.15em #fff, 0 0 0.25em #0ff, 0 0 0.4em #f0f; }
                  }
                `}
              </style>
              {data.userData.username}
            </div>
          </Html>
        ) : null
      )}
    </group>
  );
}

// Scene lighting and camera setup
function SceneSetup() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 0, 8);
  }, [camera]);

  return (
    <>
      {/* Adding ambient light for overall illumination */}
      <ambientLight intensity={0.3} />
      
      {/* Main directional light to simulate sun */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
      />
      
      {/* Rim light to highlight the edges */}
      <directionalLight 
        position={[-5, 5, -5]} 
        intensity={0.4} 
        color="#a0a0ff" 
      />
      
      {/* Bottom fill light */}
      <pointLight 
        position={[0, -5, 0]} 
        intensity={0.2} 
        color="#404060" 
      />
    </>
  );
}

// Simple orbit controls for rotating around the moon
function SimpleOrbitCamera({ focusedTarget }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const followModeRef = useRef(false);
  const neutralPositionRef = useRef(new THREE.Vector3(0, 0, 8));
  const neutralTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const animationFrameIdRef = useRef(null);
  const autoRotateRef = useRef(true);

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }
  
  function easeInOutQuintic(x) {
    return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
  }

  const targetPositionVecRef = useRef(new THREE.Vector3());
  const originalFovRef = useRef(null);

  // Effect for initial OrbitControls setup
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enablePan = true;
      controlsRef.current.minDistance = 0.3;
      controlsRef.current.maxDistance = 15;
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.1;
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.1;
      neutralPositionRef.current.copy(camera.position);
      neutralTargetRef.current.copy(controlsRef.current.target);
    }
  }, [camera, gl]);

  // Add useFrame to handle continuous rotation when not focused
  useFrame(() => {
    if (controlsRef.current && !focusedTarget && autoRotateRef.current) {
      controlsRef.current.update();
    }
  });

  // Main effect for handling focus changes
  useEffect(() => {
    if (camera && originalFovRef.current === null) {
      originalFovRef.current = camera.fov;
    }

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (focusedTarget && focusedTarget.object3D) {
      // Disable auto-rotation when focused
      autoRotateRef.current = false;
      if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      const targetObject = focusedTarget.object3D;
      let idealFinalCameraPos = new THREE.Vector3();
      let lookAtTargetPos = new THREE.Vector3();
      const animationDuration = 0.8;

      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      
      camera.updateMatrixWorld();
      targetObject.matrixAutoUpdate = true;
      targetObject.traverse(obj => obj.matrixAutoUpdate = true);
      targetObject.updateMatrixWorld(true);

      if (focusedTarget.type === 'astronaut') {
        const astronautInstance = targetObject;
        console.log(`Camera focusing on astronaut ${focusedTarget.index}`);
        
        // Find the FaceTarget within the astronaut
        let faceTarget = null;
        astronautInstance.traverse((child) => {
          if (child.name && child.name.toLowerCase().includes('facetarget') && 
              !child.name.toLowerCase().includes('marker')) {
            faceTarget = child;
            console.log("Camera found FaceTarget:", child.name, "at local pos:", child.position);
          }
        });

        if (faceTarget) {
          astronautInstance.updateMatrixWorld(true);
          faceTarget.updateMatrixWorld(true);
          
          const faceTargetWorldPos = new THREE.Vector3();
          faceTarget.getWorldPosition(faceTargetWorldPos);
          
          const astronautWorldPos = new THREE.Vector3();
          astronautInstance.getWorldPosition(astronautWorldPos);
          
          const astronautWorldQuaternion = new THREE.Quaternion();
          astronautInstance.getWorldQuaternion(astronautWorldQuaternion);
          
          const astronautForward = new THREE.Vector3(1, 0, 0)
            .applyQuaternion(astronautWorldQuaternion);
          
          const approachVector = new THREE.Vector3()
            .subVectors(astronautWorldPos, camera.position)
            .normalize();
          
          const dotProduct = astronautForward.dot(approachVector);
          
          let cameraDirection;
          if (dotProduct > 0.01) {
            cameraDirection = astronautForward.clone();
          } else if (dotProduct < -0.01) {
            cameraDirection = approachVector.clone().negate();
          } else {
            cameraDirection = astronautForward.clone();
          }
          
          const cameraDistance = 0.8;
          idealFinalCameraPos.copy(astronautWorldPos)
            .add(cameraDirection.multiplyScalar(cameraDistance));
          
          lookAtTargetPos.copy(faceTargetWorldPos);
        } else {
          astronautInstance.getWorldPosition(lookAtTargetPos);
          const moonCenter = new THREE.Vector3(0, 0, 0);
          const directionFromMoon = new THREE.Vector3()
            .subVectors(lookAtTargetPos, moonCenter)
            .normalize();
          
          const cameraDistance = 1.5;
          idealFinalCameraPos.copy(lookAtTargetPos)
            .add(directionFromMoon.multiplyScalar(cameraDistance));
        }
      } else if (focusedTarget.type === 'rocket') {
        targetObject.getWorldPosition(lookAtTargetPos);
        const rocketDist = 0.3;
        const viewDirection = new THREE.Vector3().subVectors(lookAtTargetPos, camera.position).normalize();
        if (viewDirection.lengthSq() === 0) viewDirection.set(0,0.3,1).normalize();
        idealFinalCameraPos.subVectors(lookAtTargetPos, viewDirection.multiplyScalar(rocketDist));
      }

      const startPosition = camera.position.clone();
      const endPosition = idealFinalCameraPos;
      const startTime = Date.now();

      const animateCamera = () => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsedTime / animationDuration, 1);
        const easeProgress = easeInOutQuintic(progress);
        
        camera.position.lerpVectors(startPosition, endPosition, easeProgress);
        camera.up.set(0,1,0);
        camera.lookAt(lookAtTargetPos);

        if (progress < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animateCamera);
        } else {
          animationFrameIdRef.current = null;
          camera.position.copy(endPosition);
          camera.up.set(0,1,0);
          camera.lookAt(lookAtTargetPos);
          
          if (controlsRef.current) {
            controlsRef.current.target.copy(lookAtTargetPos);
            controlsRef.current.enabled = true;
            controlsRef.current.update();
          }
          followModeRef.current = true;
        }
      };
      animationFrameIdRef.current = requestAnimationFrame(animateCamera);

    } else {
      // Re-enable auto-rotation when not focused
      autoRotateRef.current = true;
      followModeRef.current = false;
      
      if (controlsRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.target.copy(neutralTargetRef.current);
        controlsRef.current.enabled = true;

        const startPositionCam = camera.position.clone();
        const startTargetCam = controlsRef.current.target.clone();
        const endPositionCam = neutralPositionRef.current.clone();
        const endTargetCam = neutralTargetRef.current.clone();
        const durationReturn = 0.8;
        const startTimeReturn = Date.now();

        const animateBackToNeutral = () => {
          const elapsedTime = (Date.now() - startTimeReturn) / 1000;
          const progress = Math.min(elapsedTime / durationReturn, 1);
          const easeProgress = easeOutCubic(progress);
          
          controlsRef.current.target.lerpVectors(startTargetCam, endTargetCam, easeProgress);
          camera.position.lerpVectors(startPositionCam, endPositionCam, easeProgress);
          controlsRef.current.update();
          
          if (progress < 1) {
            animationFrameIdRef.current = requestAnimationFrame(animateBackToNeutral);
          } else {
            animationFrameIdRef.current = null;
          }
        };
        animationFrameIdRef.current = requestAnimationFrame(animateBackToNeutral);
      }
    }
  }, [focusedTarget, camera, gl]);

  return <OrbitControls ref={controlsRef} args={[camera, gl.domElement]} />;
}

// Add this component after the Astronauts component
function ModelInspector() {
  const { scene } = useGLTF('/Astronaut2.glb');
  
  useEffect(() => {
    // console.log("Model Inspector: Examining astronaut1.glb structure"); // Keep this if desired
    const inspectNode = (node, depth = 0) => {
      const indent = ' '.repeat(depth * 2);
      const type = node.type || (node.isMesh ? 'Mesh' : (node.isGroup ? 'Group' : 'Object3D'));

      
      if (node.isMesh) {
        // console.log(`${indent}  Material: ${node.material ? node.material.name || 'unnamed' : 'none'}`);
        // console.log(`${indent}  Geometry: ${node.geometry ? 'present' : 'none'} (vertices: ${node.geometry?.attributes?.position?.count || 'unknown'})`);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => inspectNode(child, depth + 1));
      }
    };
    // console.log("Model hierarchy:");
    // inspectNode(scene);
    // ... rest of ModelInspector ...
  }, [scene]);
  return null; 
}



function SceneManager({ userHelmetTextures, focusedTarget, onAstronautClick, onSceneObjectClick }) {
  const handleMoonOrRocketClick = (event) => {
    event.stopPropagation(); // Stop event from bubbling to canvas click handler
    let clickedObjectName = event.object.name;
    let targetObject = event.object;

    // Traverse up to find a named parent if the directly clicked mesh is unnamed or part of a larger assembly
    let tempObj = event.object;
    while (tempObj.parent && !tempObj.name && tempObj.parent.isObject3D) {
        if (tempObj.parent.name) { // Prefer named parent
            clickedObjectName = tempObj.parent.name;
            targetObject = tempObj.parent;
            break;
        }
        tempObj = tempObj.parent;
    }
    


    if (clickedObjectName && clickedObjectName.toLowerCase().includes('rocket')) {

      onSceneObjectClick({ type: 'rocket', object3D: targetObject });
    } else {
      // Clicked on Moon surface or other non-specific part

      onSceneObjectClick(null); // Signal general deselect
    }
  };

  
  
  return (
    <>
      <SceneSetup />
      <Moon position={[0, 0, 0]} scale={MOON_RADIUS} onMoonClick={handleMoonOrRocketClick} />
      <Astronauts 
        userHelmetTextures={userHelmetTextures} 
        onAstronautClick={onAstronautClick}
        focusedAstronaut={focusedTarget?.type === 'astronaut' ? focusedTarget : null}
      />
      <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      {/* <ContactShadows 
        position={[0, -2.6, 0]}   // Lowered to be below moon (radius 2.5)
        opacity={0.4} 
        scale={10}  // Increased scale to cover more area if plane is lower
        blur={2.5} 
        far={3}     // Adjusted far for potentially larger shadow casting area
      /> */}
      <EffectComposer>
        <Bloom 
          intensity={0.5} 
          luminanceThreshold={0.1} 
          luminanceSmoothing={0.9} 
          kernelSize={3}
        />
        <Vignette 
          opacity={0.3} 
          darkness={0.8} 
        />
      </EffectComposer>
      <SimpleOrbitCamera focusedTarget={focusedTarget} />
    </>
  );
}

export default function MoonScene({userHelmetTextures, currentUser}) {
  const [focusedTarget, setFocusedTarget] = useState(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const [monsterMode, setMonsterMode] = useState(false);
  const [rocketModelVisible, setRocketModelVisible] = useState(false);
  const [isConstellationsVisible, setIsConstellationsVisible] = useState(false);

  // Add mobile view detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = typeof window !== "undefined" && window.innerWidth <= 576;
      setIsMobileView(mobile);
    };

    if (typeof window !== "undefined") {
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => {
        window.removeEventListener("resize", checkMobile);
      };
    }
  }, []);

  // Add toggle functions
  const toggle80sMode = useCallback(() => {
    setIs80sMode(prev => !prev);
  }, []);

  const toggleMonsterMode = useCallback(() => {
    setMonsterMode(prev => !prev);
  }, []);

  const toggleRocketModel = useCallback(() => {
    setRocketModelVisible(prev => !prev);
  }, []);

  const toggleConstellationVisibility = useCallback(() => {
    setIsConstellationsVisible(prev => !prev);
  }, []);

  const handleButtonClick = useCallback((key) => {
    console.log(`MoonScene: Button clicked with key: ${key}`);
    // Add any button click handling logic here
  }, []);

  const handleAstronautClick = (index, astronautObject, userData) => {
    if (index === null) { // Direct deselect signal (e.g. from modal close that should also deselect)

      setFocusedTarget(null);
      setIsDetailModalOpen(false);
      return;
    }
    const newTarget = { type: 'astronaut', index, object3D: astronautObject, userData };
    if (focusedTarget && focusedTarget.type === 'astronaut' && focusedTarget.index === index && isDetailModalOpen) {

      setFocusedTarget(null);
      setIsDetailModalOpen(false);
      return;
    }

    setFocusedTarget(newTarget);
    setIsDetailModalOpen(true);
  };

  const handleSceneObjectClick = (targetInfo) => {
    if (targetInfo === null) {

      setFocusedTarget(null);
      setIsDetailModalOpen(false);
    } else if (targetInfo.type === 'rocket') {
      if (
        focusedTarget &&
        focusedTarget.type === 'rocket' &&
        focusedTarget.object3D === targetInfo.object3D
      ) {
  
        setFocusedTarget(null);
      } else {
 
        setFocusedTarget(targetInfo);
        setIsDetailModalOpen(false);
      }
    }
  };

  const handleCanvasClick = (event) => {
    if (event.target === event.currentTarget) {

      setFocusedTarget(null);
      setIsDetailModalOpen(false);
    }
  };

  const handleSaveCustomizations = useCallback((customizations) => {
    console.log("Saving customizations:", customizations);
  }, []);

  

  return (
 
      <div style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh',     zIndex: 2, overflow: 'hidden', pointerEvents:'auto' }}   onMouseMove={e => {
        // Convert event.clientX/clientY to NDC
        const { innerWidth, innerHeight } = window;
        const xNDC = (e.clientX / innerWidth) * 2 - 1;
        const yNDC = -(e.clientY / innerHeight) * 2 + 1;
    
        // Pass to ParticleBackground via a global or context
        window.__mouseTrail = { xNDC, yNDC, active: true, xPx: e.clientX, yPx: e.clientY };
      }}
      onMouseLeave={e => {
        window.__mouseTrail = { xNDC: null, yNDC: null, active: false };
      }}>
        {/* Gradient Background */}
        {/* <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            background: 'linear-gradient(180deg, hsl(220,50%,16%) 0%, hsl(290,60%,28%) 100%)',
            filter: 'hue-rotate(0deg)',
            animation: 'hue-rotate-bg 15s linear infinite',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        /> */}
        {/* Canvas with 3D content */}
        <div style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh' }}>
    
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 50, position: [0,0,8], near: 0.1, far: 1000 }}   onClick={handleCanvasClick}>
        {/* <color attach="background" args={['#000010']} /> */}
        <fog attach="fog" args={['#000010', 10, 50]} />
        <Suspense fallback={<Loader />}>
          {/* <ParticleBackground /> */}
          <SceneManager
            userHelmetTextures={userHelmetTextures}
            focusedTarget={focusedTarget}
            onAstronautClick={handleAstronautClick}
            onSceneObjectClick={handleSceneObjectClick}
          />
        </Suspense>
      </Canvas>
      </div>
      {/* Add SidePanel/MobileSidePanel */}
      {isMobileView ? (
        <MobileSidePanel
          onButtonClick={handleButtonClick}
          is80sMode={is80sMode}
          toggle80sMode={toggle80sMode}
          monsterMode={monsterMode}
          toggleMonsterMode={toggleMonsterMode}
          showSpotify={showSpotify}
          setShowSpotify={setShowSpotify}
          rocketModelVisible={rocketModelVisible}
          toggleRocketModel={toggleRocketModel}
          toggleConstellationVisibility={toggleConstellationVisibility}
          isConstellationsVisible={isConstellationsVisible}
        />
      ) : (
        <SidePanel
          onButtonClick={handleButtonClick}
          is80sMode={is80sMode}
          toggle80sMode={toggle80sMode}
          monsterMode={monsterMode}
          toggleMonsterMode={toggleMonsterMode}
          showSpotify={showSpotify}
          setShowSpotify={setShowSpotify}
          rocketModelVisible={rocketModelVisible}
          toggleRocketModel={toggleRocketModel}
          toggleConstellationVisibility={toggleConstellationVisibility}
          isConstellationsVisible={isConstellationsVisible}
        />
      )}
      <div
        className="fixed bottom-6 right-6 z-50"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: isCustomizerOpen ? 'scale(0.8) translateY(70px)' : 'scale(1)',
          opacity: isCustomizerOpen ? 0 : 1,
        }}
      >
        <button
          onClick={() => {
         
            setIsCustomizerOpen(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-colors flex items-center space-x-2 text-lg font-medium"
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.125rem',
            fontWeight: '500',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.7)',
            cursor: 'pointer'
          }}
          aria-label="Open astronaut customizer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: '1.25rem', height: '1.25rem' }}>
            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
          </svg>
          <span>Customize Astronaut</span>
        </button>
      </div>
      <AstronautCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => {
      
          setIsCustomizerOpen(false);
        }}
        onSave={handleSaveCustomizations}
        defaultProfileImage={currentUser?.profileImage}
      />
      <AstronautDetailModal 
        isOpen={isDetailModalOpen && focusedTarget?.type === 'astronaut'}
        onClose={() => {
          setIsDetailModalOpen(false);
        }}
        astronautData={focusedTarget?.type === 'astronaut' ? focusedTarget.userData : null} 
      />
    </div>
  );
}

useGLTF.preload('/low_poly_moon2.glb');
useGLTF.preload('/Astronaut2.glb');
// Ensure these paths are correct and files exist in your public folder if you re-enable them
// useGLTF.preload('/astronaut.glb');
// useGLTF.preload('/astronaut_voyager.glb'); 
