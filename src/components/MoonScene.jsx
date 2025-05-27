import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import HolographicStatueMoon from './3DVotiveStand/HolographicStatueMoon';
import ConstellationModel from "./3DVotiveStand/ConstellationModel";
import StarField from "./3DVotiveStand/StarField";

import { 
  OrbitControls, 
  useGLTF, 
  Stars, 
  Environment, 
  Html, 
  useProgress,
  ContactShadows,
  Box,
  useHelper
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { PointLightHelper } from 'three';
import AstronautCustomizerModal from './AstronautCustomizerModal';
import Flag from './Flag';
import ParticleBackground from './ParticleBackground';
import SidePanel from './SidePanel';
import MobileSidePanel from './MobileSidePanel';
import CometSystem from './CometDemo';

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

// Component to report readiness once mounted after Suspense
function ReportReady({ onReady }) {
  useEffect(() => {
    if (onReady) {
      onReady();
    }
  }, [onReady]);
  return null; // This component doesn't render anything visible
}

// Point light with helper component
function PointLightWithHelper({ position, color, intensity, distance, decay, showHelper = true }) {
  const lightRef = useRef();
  
  // Only show helper if showHelper is true
  if (showHelper) {
    useHelper(lightRef, PointLightHelper, 0.3);
  }
  
  return (
    <pointLight
      ref={lightRef}
      position={position}
      color={color}
      intensity={intensity}
      distance={distance}
      decay={decay}
      castShadow={false}
    />
  );
}

// Moon model component
function Moon(props) {
  const { onMoonClick } = props;
  const moonRef = useRef();
  const flagRef = useRef();
  const { scene } = useGLTF('/Ochi_moon01.glb');

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
    }
  }, [flagAnchor, flagRef]);
  
  useEffect(() => {
    // Add emissive properties to the moon materials
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone(); // Clone to avoid affecting other instances
        child.material.emissive = new THREE.Color(0x00ffff); // Subtle blue-white glow
        child.material.emissiveIntensity = 0.02; // Moderate intensity
        child.material.depthTest = true;
        child.material.depthWrite = true;
        child.material.needsUpdate = true;
        child.material.envMapIntensity = 0.3;
        child.material.reflectivity = 0.3;
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
         
          {/* <HolographicStatue
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
          /> */}
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

// Info display component for focused astronauts
function AstronautInfoDisplay({ userData, astronautIndex, parentObject }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mock data - in real app this would come from userData
  const expandedInfo = {
    quote: userData.quote || "Exploring the cosmos, one line of code at a time! 🚀",
    status: userData.status || "Building something amazing",
    links: userData.links || [
      { type: 'website', url: '#', icon: '🌐' },
      { type: 'twitter', url: '#', icon: '🐦' },
      { type: 'github', url: '#', icon: '⚡' }
    ],
    location: userData.location || "Earth Orbit"
  };

  return (
    <Html
      transform
      sprite
      scale={0.12} // Much smaller scale for close-up view
      depthTest={true}
      depthWrite={false}
      geometry={<planeGeometry args={[.15, .15]} />}
      distanceFactor={3} // Closer distance factor
      position={[0.0, 0.15, -0.1]} // Positioned closer to astronaut
      style={{
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
      {...{ parent: parentObject }}
    >
      <div style={{
        // Conditional styling - glass panel only when expanded
        background: isExpanded 
          ? 'linear-gradient(135deg, rgba(0,100,255,0.15) 0%, rgba(100,200,255,0.25) 50%, rgba(0,150,255,0.15) 100%)'
          : 'transparent',
        color: '#e8f4fd',
        borderRadius: isExpanded ? '16px' : '0',
        padding: isExpanded ? '20px' : '0',
        width: isExpanded ? '280px' : 'auto',
        height: isExpanded ? 'auto' : 'auto',
        fontFamily: 'UnifrakturMaguntia',
        fontSize: isExpanded ? '11px' : '16px',
        textAlign: isExpanded ? 'left' : 'center',
        textShadow: isExpanded ? '0 0 0.5em rgba(255,255,255,0.8), 0 0 1em rgba(0,200,255,0.6)' : 'none',
        animation: 'none',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        backdropFilter: isExpanded ? 'blur(20px) saturate(1.8)' : 'none',
        border: isExpanded ? '1px solid rgba(200,240,255,0.3)' : 'none',
        boxShadow: isExpanded 
          ? '0 8px 32px rgba(0,100,255,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px rgba(255,255,255,0.1)'
          : 'none',
        position: 'relative',
        overflow: isExpanded ? 'hidden' : 'visible',
        display: 'flex',
        flexDirection: 'column',
        alignItems: isExpanded ? 'stretch' : 'center',
        justifyContent: isExpanded ? 'flex-start' : 'center',
        // Glass morphism effect only when expanded
        WebkitBackdropFilter: isExpanded ? 'blur(20px) saturate(1.8)' : 'none',
      }}>
        <style>
          {`
            @keyframes pulse {
              0% { text-shadow: 0 0 0.1em #fff, 0 0 0.2em #0ff, 0 0 0.3em #f0f; }
              100% { text-shadow: 0 0 0.15em #fff, 0 0 0.25em #0ff, 0 0 0.4em #f0f; }
            }
            @keyframes starPulse {
              0% { 
                transform: scale(1);
                text-shadow: 0 0 0.5em rgba(100,200,255,0.8), 0 0 1em rgba(0,200,255,0.6);
              }
              50% { 
                transform: scale(1.1);
                text-shadow: 0 0 1em rgba(150,220,255,1), 0 0 1.5em rgba(100,200,255,0.8);
              }
              100% { 
                transform: scale(1);
                text-shadow: 0 0 0.5em rgba(100,200,255,0.8), 0 0 1em rgba(0,200,255,0.6);
              }
            }
          `}
        </style>
        
        {/* Glass panel shimmer effect */}
        {isExpanded && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            animation: 'shimmer 3s infinite',
            transform: 'skewX(-20deg)',
          }} />
        )}
        
        <style>
          {`
            @keyframes shimmer {
              0% { left: -100%; }
              100% { left: 100%; }
            }
          `}
        </style>

        {!isExpanded ? (
          // Collapsed view - glowing username with asterisk info icon
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '6px',
            background: 'rgba(255,0,0,0.0)', // Transparent background like original
            border: 'none',
            borderRadius: '0'
          }}>
            <span style={{
              fontFamily: 'UnifrakturMaguntia',
              fontSize: '1.5rem',
              color: 'white',
              textShadow: '0 0 0.1em #fff, 0 0 0.2em #0ff, 0 0 0.3em #f0f',
              animation: 'pulse 1.5s infinite alternate'
            }}>
              {userData.username}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#e8f4fd',
                fontSize: '18px', // Bigger star
                transition: 'all 0.3s ease',
                textShadow: '0 0 0.5em rgba(100,200,255,0.8), 0 0 1em rgba(0,200,255,0.6)',
                padding: '0',
                margin: '0',
                lineHeight: '1',
                animation: 'starPulse 2s infinite ease-in-out' // Add pulsing animation
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.3)';
                e.target.style.textShadow = '0 0 1.5em rgba(150,220,255,1), 0 0 0.8em rgba(100,200,255,0.9)';
                e.target.style.animation = 'none'; // Stop pulse on hover for cleaner effect
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.textShadow = '0 0 0.5em rgba(100,200,255,0.8), 0 0 1em rgba(0,200,255,0.6)';
                e.target.style.animation = 'starPulse 2s infinite ease-in-out'; // Resume pulse
              }}
            >
              ✦
            </button>
          </div>
        ) : (
          // Expanded view - futuristic glass panel profile
          <div style={{ position: 'relative' }}>
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(false);
              }}
              style={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                background: 'linear-gradient(135deg, rgba(255,100,100,0.8), rgba(200,50,50,0.9))',
                border: '1px solid rgba(255,150,150,0.5)',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 8px rgba(255,0,0,0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)';
                e.target.style.boxShadow = '0 4px 12px rgba(255,50,50,0.6)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)';
                e.target.style.boxShadow = '0 2px 8px rgba(255,0,0,0.4)';
              }}
            >
              ×
            </button>

            {/* Header with classical styling */}
            <div style={{ 
              textAlign: 'center', 
              marginBottom: '16px',
              borderBottom: '1px solid rgba(200,240,255,0.3)',
              paddingBottom: '12px'
            }}>
              <div style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                color: '#ffffff',
                textShadow: '0 0 1em rgba(100,200,255,0.8)',
                marginBottom: '4px'
              }}>
                {userData.username}
              </div>
              <div style={{ 
                fontSize: '9px', 
                color: '#b8e0ff',
                fontStyle: 'italic'
              }}>
                ✦ {expandedInfo.location} ✦
              </div>
            </div>

            {/* Quote in classical scroll style */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(100,200,255,0.12))', 
              padding: '12px', 
              borderRadius: '12px', 
              marginBottom: '12px',
              fontSize: '10px',
              fontStyle: 'italic',
              border: '1px solid rgba(200,240,255,0.2)',
              position: 'relative',
              textAlign: 'center'
            }}>
              <div style={{
                position: 'absolute',
                top: '-5px',
                left: '8px',
                fontSize: '16px',
                color: 'rgba(100,200,255,0.6)'
              }}>❝</div>
              {expandedInfo.quote}
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                right: '8px',
                fontSize: '16px',
                color: 'rgba(100,200,255,0.6)'
              }}>❞</div>
            </div>

            {/* Status */}
            <div style={{ 
              marginBottom: '12px', 
              fontSize: '10px',
              textAlign: 'center',
              color: '#c8e8ff'
            }}>
              <span style={{ color: 'rgba(100,255,150,0.9)' }}>◦ Status:</span> {expandedInfo.status}
            </div>

            {/* Links as classical medallions */}
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              justifyContent: 'center',
              marginTop: '8px'
            }}>
              {expandedInfo.links.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  style={{
                    background: 'linear-gradient(135deg, rgba(100,200,255,0.2), rgba(0,150,255,0.3))',
                    border: '1px solid rgba(200,240,255,0.4)',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e8f4fd',
                    textDecoration: 'none',
                    fontSize: '10px',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(5px)',
                    boxShadow: '0 2px 8px rgba(0,100,255,0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(150,220,255,0.3), rgba(50,180,255,0.5))';
                    e.target.style.transform = 'scale(1.1) rotate(5deg)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,150,255,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(100,200,255,0.2), rgba(0,150,255,0.3))';
                    e.target.style.transform = 'scale(1) rotate(0deg)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0,100,255,0.3)';
                  }}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </Html>
  );
}

// Floating astronaut component with user textures
function Astronauts(props) {
  const { userHelmetTextures, onAstronautClick, focusedAstronaut, debugMode = false } = props;

  // Debug mode - controlled by prop
  const DEBUG_MODE = debugMode;
  
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

    if (!initialInstanceData.length || !instancesRef.current || !instancesRef.current.children) return;
    const time = state.clock.getElapsedTime();

    initialInstanceData.forEach((data, index) => {
      const instance = instancesRef.current.children[index];
      if (!instance || !instance.userData || instance.userData.astronautIndex === undefined) {
        return;
      }

      const isFocused = focusedAstronaut && focusedAstronaut.index === index;

      // Common bobbing calculations - Amplitude significantly reduced
      const bobAmplitude = 0.03; // Reduced for less bobbing
      const bobSpeed = 0.8; 

      const bobHeightOffset = Math.sin(time * bobSpeed + index * 0.5) * bobAmplitude;
      const bobSideOffset = Math.cos(time * bobSpeed * 0.7 + index * 1.0) * bobAmplitude * 0.7;
      const circleRadius = bobAmplitude * 0.5; // Will also be smaller due to reduced bobAmplitude
      const circleXOffset = Math.cos(time * bobSpeed * 0.5 + index * 1.5) * circleRadius;
      const circleZOffset = Math.sin(time * bobSpeed * 0.5 + index * 2.0) * circleRadius;

      // Tumbling parameters (common for focused model and non-focused instance)
      const tumbleRange = Math.PI / 4; 
      const zTumbleRange = Math.PI / 2; 
      const xTumbleRange = Math.PI / 2; 

      const phaseX = data.initialRotation.x;
      const phaseY = data.initialRotation.y + 1; 
      const phaseZ = data.initialRotation.z + 2;

      // Calculate tumble angles based on individual rotation speed and phase
      const currentTumbleX = Math.sin(time * data.rotationSpeed.x + phaseX) * xTumbleRange;
      const currentTumbleY_local = Math.sin(time * data.rotationSpeed.y + phaseY) * tumbleRange; // For local Y tumble
      const currentTumbleZ = Math.cos(time * data.rotationSpeed.z + phaseZ) * zTumbleRange;

      if (isFocused) {
        // For focused astronauts, find the shared animated scene in the group
        const focusedAnimatedModel = instance.children.find(child => child === animatedScene);

        if (focusedAnimatedModel) {
            // Apply subtle bobbing to the local position of the animated model
            focusedAnimatedModel.position.set(
                bobSideOffset + circleXOffset, 
                bobHeightOffset, 
                circleZOffset
            );
            
            // For focused models, rotate to always face the camera instead of tumbling
            // Get camera position from state
            const cameraPosition = state.camera.position;
            
            // Use lookAt to make the model face the camera directly
            // Since the model's face is in +X direction, we need to adjust the lookAt
            focusedAnimatedModel.lookAt(cameraPosition);
            
            // The lookAt assumes the model faces +Z, but our model faces +X
            // So we need to rotate it 90 degrees around Y to correct this
            focusedAnimatedModel.rotateY(-Math.PI / 2);
            
            console.log("Model facing camera via lookAt + Y rotation correction");
        } else {
            console.log("No animated model found for focused astronaut", index);
        }
      } else {
        // For non-focused astronauts:
        // Apply bobbing to the main instance position
        const basePosition = data.initialPosition.clone();
        instance.position.copy(basePosition);
        instance.position.y += bobHeightOffset;
        instance.position.x += bobSideOffset + circleXOffset;
        instance.position.z += circleZOffset;
        
        // Apply tumbling rotation to the main instance, keeping it facing outward
        const directionFromMoonAfterBob = instance.position.clone().normalize();
        let currentRotationY_facingOut = Math.atan2(directionFromMoonAfterBob.z, directionFromMoonAfterBob.x);
        
        instance.rotation.set(
          data.initialRotation.x + currentTumbleX, // Use pre-calculated tumble
          currentRotationY_facingOut + currentTumbleY_local, // Combine outward facing with local Y tumble
          data.initialRotation.z + currentTumbleZ  // Use pre-calculated tumble
        );
      }
      
      // Universal minimum distance check for the astronaut's group position
      const distanceToMoonCenter = instance.position.length();
      if (distanceToMoonCenter < MIN_DISTANCE) {
        const direction = instance.position.clone().normalize();
        instance.position.copy(direction.multiplyScalar(MIN_DISTANCE));
      }
    });
  }, -1);

  // Astronaut positioning and instance data
  useEffect(() => {
    if (!staticScene || !animatedScene || !userHelmetTextures) return;

    const numInstances = userHelmetTextures.length;
    const newInstanceData = [];
    const moonRadius = 3.5;

    // Clear existing instances
    if (instancesRef.current) {
      while (instancesRef.current.children.length > 0) {
        instancesRef.current.remove(instancesRef.current.children[0]);
      }
    }

    for (let i = 0; i < numInstances; i++) {
      const userData = userHelmetTextures[i];
      
      // Clone only the static scene for this astronaut
      const staticAstronautScene = staticScene.clone();
      
      // Find and apply textures to helmet objects in static scene
      let staticHelmetObjects = [];
      staticAstronautScene.traverse((child) => {
        if (child.name && child.name.toLowerCase().includes('helmet')) {
          staticHelmetObjects.push(child);
        }
      });

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

      // Simple random distribution around the moon
      const phi = Math.acos(-1 + (2 * i) / numInstances);
      const theta = Math.sqrt(numInstances * Math.PI) * phi;
      let x = moonRadius * Math.sin(phi) * Math.cos(theta);
      let y = moonRadius * Math.sin(phi) * Math.sin(theta);
      let z = moonRadius * Math.cos(phi);
      
      const randomDisplacementFactor = (Math.random() - 0.5) * 0.5;
      const displacement = new THREE.Vector3(x, y, z).normalize().multiplyScalar(randomDisplacementFactor);
      
      const initialPosition = new THREE.Vector3(x + displacement.x, y + displacement.y, z + displacement.z);

      // Calculate rotation to face outward from moon center
      const direction = initialPosition.clone().normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const right = new THREE.Vector3().crossVectors(up, direction).normalize();
      const correctedUp = new THREE.Vector3().crossVectors(direction, right).normalize();

      const rotationMatrix = new THREE.Matrix4();
      rotationMatrix.makeBasis(right, correctedUp, direction);
      const initialRotation = new THREE.Euler().setFromRotationMatrix(rotationMatrix);


      // Create a group for the astronaut
      const astronautGroup = new THREE.Group();
      astronautGroup.userData = { 
        astronautIndex: i, 
        userData: userData,
        staticScene: staticAstronautScene
      };
      
      // Add the static astronaut model to the group initially
      staticAstronautScene.scale.set(0.15, 0.15, 0.15);
      astronautGroup.add(staticAstronautScene);
      
      // Set the group position and rotation
      astronautGroup.position.copy(initialPosition);
      astronautGroup.rotation.copy(initialRotation);
      
      // Add the group to the scene
      instancesRef.current.add(astronautGroup);

      newInstanceData.push({
        initialPosition,
        initialRotation,
        userData: userData,
        astronautIndex: i,
        bobSpeed: Math.random() * 0.05 + 0.02,
        bobAmplitude: Math.random() * 0.015 + 0.005,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.9,
          (Math.random() - 0.5) * 0.2,
          (Math.random() - 0.5) * 0.2
        )
      });
    }

    setInitialInstanceData(newInstanceData);
  }, [staticScene, animatedScene, userHelmetTextures, onAstronautClick]);

  // Effect to handle model switching when focused
  useEffect(() => {
    if (!instancesRef.current || !animatedHelmet) return;

    instancesRef.current.children.forEach((astronautGroup) => {
      const { astronautIndex, staticScene, userData } = astronautGroup.userData;
      const isFocused = focusedAstronaut && focusedAstronaut.index === astronautIndex;

      // Remove current scene
      while (astronautGroup.children.length > 0) {
        astronautGroup.remove(astronautGroup.children[0]);
      }

      // Add appropriate scene
      if (isFocused) {
        // Apply user texture to the shared animated helmet
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
        
        console.log(`Switching astronaut ${astronautIndex} to ANIMATED model`);
      } else {
        // Use static scene for non-focused state
        astronautGroup.add(staticScene);
        
        console.log(`Switching astronaut ${astronautIndex} to STATIC model`);
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

  return (
    <group ref={instancesRef} onClick={handleClick} {...props}>
      {/* Point lights for each astronaut */}
      {initialInstanceData.map((data, i) => {
        // Use the initial position data directly instead of trying to access group position
        const lightPosition = [
          data.initialPosition.x,
          data.initialPosition.y + 1,
          data.initialPosition.z
        ];
        
        // Use a consistent white/blue-white color for all lights
        // const lightColor = new THREE.Color(0xffffff); // Pure white light
        const lightColor = new THREE.Color(0xe8f4fd); // Subtle blue-white
        
        console.log(`Debug sphere ${i} at position:`, lightPosition, `color:`, lightColor);
        
        return (
          <PointLightWithHelper
            key={`light-${i}`}
            position={lightPosition}
            color={lightColor}
            intensity={focusedAstronaut && focusedAstronaut.index === i ? 4.0 : 1.5}
            distance={3}
            decay={2}
            showHelper={DEBUG_MODE} // Show helpers only in debug mode
          />
        );
      })}
      
      {/* Info displays for focused astronauts */}
      {initialInstanceData.map((data, i) => 
        focusedAstronaut && focusedAstronaut.index === i ? (
          <AstronautInfoDisplay
            key={i}
            userData={data.userData}
            astronautIndex={i}
            parentObject={instancesRef.current ? instancesRef.current.children[i] : null}
          />
        ) : null
      )}
    </group>
  );
}

// Scene lighting and camera setup
function SceneSetup({ isMobileView }) {
  const { camera } = useThree();
  
  useEffect(() => {
    // Set camera position based on screen size
    if (isMobileView) {
      // Position camera further back on mobile for better moon visibility
      camera.position.set(0, 0, 15);
      console.log("Mobile camera positioned at:", camera.position);
    } else {
      // Default desktop position
      camera.position.set(0, 0, 8);
      console.log("Desktop camera positioned at:", camera.position);
    }
    
    // Update camera matrix after position change
    camera.updateProjectionMatrix();
  }, [camera, isMobileView]);

  return (
    <>
      {/* Reduced ambient light for more dramatic shadows */}
      <ambientLight intensity={0.15} />
      
      {/* Main directional light from the left side of screen - simulates sun */}
      <directionalLight 
        position={[-10, 2, 5]} 
        intensity={2.0} 
        castShadow 
        shadow-mapSize-width={2048} 
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        color="#ffffff"
      />
      
      {/* Subtle rim light from the opposite side for depth */}
      <directionalLight 
        position={[8, -2, -3]} 
        intensity={0.3} 
        color="#4a90e2" 
      />
      
      {/* Very subtle fill light from below to prevent pure black shadows */}
      <pointLight 
        position={[0, -8, 0]} 
        intensity={0.1} 
        color="#6b7280" 
        distance={20}
        decay={2}
      />
    </>
  );
}

// Simple orbit controls for rotating around the moon
function SimpleOrbitCamera({ focusedTarget, isMobileView }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const followModeRef = useRef(false);
  const neutralPositionRef = useRef(new THREE.Vector3(0, 0, isMobileView ? 14 : 8));
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
      controlsRef.current.maxDistance = 18;
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.1;
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.1;
      
      // Set neutral position based on mobile view
      const neutralZ = isMobileView ? 14 : 8;
      neutralPositionRef.current.set(0, 0, neutralZ);
      neutralTargetRef.current.copy(controlsRef.current.target);
      
      console.log("OrbitControls neutral position set to:", neutralPositionRef.current);
    }
  }, [camera, gl, isMobileView]);

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
        
        // Since the animated model will rotate to face the camera,
        // we just need to position the camera at a good distance from the astronaut
        astronautInstance.getWorldPosition(lookAtTargetPos);
        
        // Adjust the look-at point to be slightly higher (toward the head/face area)
        lookAtTargetPos.y += 0.1; // Move target point up slightly for better framing
        
        // Position camera at a nice distance for a close-up view
        const moonCenter = new THREE.Vector3(0, 0, 0);
        const directionFromMoon = new THREE.Vector3()
          .subVectors(lookAtTargetPos, moonCenter)
          .normalize();
        
        const cameraDistance = 0.6; // Close enough for face view
        idealFinalCameraPos.copy(lookAtTargetPos)
          .add(directionFromMoon.multiplyScalar(cameraDistance));
        
        console.log("Camera positioning for auto-facing model at:", lookAtTargetPos);
      } else if (focusedTarget.type === 'rocket') {
        targetObject.getWorldPosition(lookAtTargetPos);
        
        // Adjust the look-at point higher for better rocket view angle
        lookAtTargetPos.y += 0.1; // Raise the target point to look higher on the rocket
        
        const rocketDist = 0.5;
        const viewDirection = new THREE.Vector3().subVectors(lookAtTargetPos, camera.position).normalize();
        if (viewDirection.lengthSq() === 0) viewDirection.set(0,0.3,1).normalize();
        idealFinalCameraPos.subVectors(lookAtTargetPos, viewDirection.multiplyScalar(rocketDist));
        
        console.log("Camera positioning for rocket at:", lookAtTargetPos);
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



function SceneManager({ userHelmetTextures, focusedTarget, onAstronautClick, onSceneObjectClick, onReady, isConstellationsVisible, is80sMode, isMobileView, debugMode = false }) {
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
      <SceneSetup isMobileView={isMobileView} />
      <Moon position={[0, 0, 0]} scale={MOON_RADIUS} onMoonClick={handleMoonOrRocketClick} />
      
      
      <Astronauts 
        userHelmetTextures={userHelmetTextures} 
        onAstronautClick={onAstronautClick}
        focusedAstronaut={focusedTarget?.type === 'astronaut' ? focusedTarget : null}
        debugMode={debugMode}
      />
      
      {/* Demo Comet System */}
      {/* <CometSystem /> */}
      
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
      <SimpleOrbitCamera focusedTarget={focusedTarget} isMobileView={isMobileView} />
      <ReportReady onReady={onReady} /> {/* Call onReady when this part of the scene is ready */}
    </>
  );
}

export default function MoonSceneComponent({userHelmetTextures, currentUser, onSceneReady}) {
  const [focusedTarget, setFocusedTarget] = useState(null);
  const focusedTargetRef = useRef(null); // Keep a ref to restore after context loss
  
  // Keep ref in sync with state
  useEffect(() => {
    focusedTargetRef.current = focusedTarget;
  }, [focusedTarget]);
  
  // Debug: Track focusedTarget changes
  useEffect(() => {
    console.log("focusedTarget changed to:", focusedTarget?.type ? `${focusedTarget.type} ${focusedTarget.index}` : 'null');
  }, [focusedTarget]);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const [monsterMode, setMonsterMode] = useState(false);
  const [rocketModelVisible, setRocketModelVisible] = useState(false);
  const [isConstellationsVisible, setIsConstellationsVisible] = useState(false);
  const [debugMode, setDebugMode] = useState(false); // Set to true to show light helpers

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

  const handleAstronautClick = (index, astronautObject, userData) => {
    console.log("handleAstronautClick called with:", { index, focusedTarget: focusedTarget?.index });
    
    if (index === null) { // Direct deselect signal
      console.log("Deselecting astronaut (index was null)");
      setFocusedTarget(null);
      return;
    }
    
    const newTarget = { type: 'astronaut', index, object3D: astronautObject, userData };
    
    // Check if clicking the same astronaut that's already focused
    if (focusedTarget && focusedTarget.type === 'astronaut' && focusedTarget.index === index) {
      console.log("Clicking same focused astronaut - clearing focus");
      setFocusedTarget(null);
      return;
    }

    console.log("Setting new focused target:", index);
    setFocusedTarget(newTarget);
  };

  const handleSceneObjectClick = (targetInfo) => {
    if (targetInfo === null) {
      setFocusedTarget(null);
    } else if (targetInfo.type === 'rocket') {
      if (
        focusedTarget &&
        focusedTarget.type === 'rocket' &&
        focusedTarget.object3D === targetInfo.object3D
      ) {
        setFocusedTarget(null);
      } else {
        setFocusedTarget(targetInfo);
      }
    }
  };

  const handleCanvasClick = (event) => {
    // Only clear focus if clicking directly on the canvas
    if (event.target === event.currentTarget) {
      console.log("Canvas clicked - clearing focus");
      setFocusedTarget(null);
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
    
      <Canvas 
        shadows 
        dpr={isMobileView ? [1, 1] : [1, 1.5]} // Further reduce pixel ratio to prevent context loss
        camera={{ fov: 50, position: [0,0,8], near: 0.1, far: 1000 }}
        onClick={handleCanvasClick}
        gl={{ 
          antialias: false, // Disable antialiasing to reduce GPU load
          alpha: false,
          powerPreference: "high-performance",
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          // Handle WebGL context loss/restoration
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            console.warn("WebGL Context Lost - astronaut focus will be restored after context restoration");
            event.preventDefault();
          });
          
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log("WebGL Context Restored - attempting to restore focus state");
            // Restore the focused state after a brief delay to let Three.js reinitialize
            setTimeout(() => {
              if (focusedTargetRef.current) {
                console.log("Restoring focus to:", focusedTargetRef.current.type, focusedTargetRef.current.index);
                // Force a re-render by temporarily clearing and restoring the focus
                setFocusedTarget(null);
                setTimeout(() => {
                  setFocusedTarget(focusedTargetRef.current);
                }, 100);
              }
            }, 500);
          });
        }}
      >
        {/* <color attach="background" args={['#000010']} /> */}
        <fog attach="fog" args={['#000010', 10, 50]} />
           {/* <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} /> */}
            {/* Add the constellation model before the star field */}
            <Suspense fallback={null}>
          <ConstellationModel 
            isVisible={isConstellationsVisible} 
            groupScale={[1, 1, 1]} // Significantly smaller scale for MoonScene
            groupPosition={[0, 0, -15]}   // Positioned behind the default moon view
            groupRotation={[0, 0, 0]}
          />
        </Suspense>

        {/* Render the stars last */}
        <Suspense fallback={null}>
          <StarField 
            is80sMode={is80sMode} 
            radius={40} // Smaller radius for MoonScene
          />
        </Suspense>
        <Suspense fallback={<Loader />}>
          {/* <ParticleBackground /> */}
          <SceneManager
            userHelmetTextures={userHelmetTextures}
            focusedTarget={focusedTarget}
            onAstronautClick={handleAstronautClick}
            onSceneObjectClick={handleSceneObjectClick}
            onReady={onSceneReady}
            isConstellationsVisible={isConstellationsVisible}
            is80sMode={is80sMode}
            isMobileView={isMobileView}
            debugMode={debugMode}
          />
        </Suspense>
      </Canvas>
      </div>
      {/* Add SidePanel/MobileSidePanel */}
      {isMobileView ? (
        <MobileSidePanel
          onButtonClick={() => {}}
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
          onButtonClick={() => {}}
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
    </div>
  );
}

useGLTF.preload('/Ochi_moon01.glb');
useGLTF.preload('/Astronaut2.glb');
useGLTF.preload('/Astronaut02.glb');
