import React, { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, ContactShadows, AccumulativeShadows, Html, Sky, GradientTexture } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { FaMapMarkerAlt } from 'react-icons/fa';

// Import HolographicStatue component
import DashboardHolograph from './3DVotiveStand/DashboardHolograph';

// Create a context for music control
const MusicContext = React.createContext(null);

// Specialized post-processing effects for sunset/sunrise visual

// Synthwave Marker Component
function SynthwaveMarker({ position = [0, 0.7, 0.2], onClick }) {
  const markerRef = useRef();
  const [showPopup, setShowPopup] = useState(false);
  const { camera } = useThree();
  
  // Handle marker click
  const handleMarkerClick = (e) => {
    e.stopPropagation();
    setShowPopup(true);
  };
  
  // Handle OK button click - move camera to car
  const handleOkClick = () => {
    setShowPopup(false);
    
    // First, play the door opening animation immediately
    if (window.modelAnimations && window.modelAnimations.playAnimation001) {
      console.log("Playing Animation.002 (door opening) immediately");
      window.modelAnimations.playAnimation001();
    }
    
    // Wait for doors to start opening before moving camera (give animation time to be visible)
    setTimeout(() => {
      // Target position for the camera
      const targetCameraPos = {
        x: 0.132, 
        y: 0.4791, 
        z: -0.1333
      };
      
      // Target look-at point
      const targetLookAt = {
        x: 0.1222, 
        y: 0.4627, 
        z: -0.0814
      };
      
      // Get orbit controls
      const orbitControls = window.orbitControlsRef?.current;
      
      // Create timeline for smooth camera movement
      const timeline = gsap.timeline({
        onComplete: () => {
          // Disable autoRotate after animation completes
          if (orbitControls) {
            orbitControls.autoRotate = false;
            console.log("Camera movement complete, autoRotate disabled");
          }
        }
      });
      
      // Animate camera position
      timeline.to(camera.position, {
        x: targetCameraPos.x,
        y: targetCameraPos.y,
        z: targetCameraPos.z,
        duration: 4.5,
        ease: "power2.inOut"
      });
      
      // Animate orbit controls target if available
      if (orbitControls) {
        timeline.to(orbitControls.target, {
          x: targetLookAt.x,
          y: targetLookAt.y,
          z: targetLookAt.z,
          duration: 4.5,
          ease: "power2.inOut",
          onUpdate: () => {
            // Make camera look at the changing target during animation
            camera.lookAt(orbitControls.target);
          }
        }, 0); // Run in parallel with position animation
      }
      
      // Animate FOV
      timeline.to(camera, {
        fov: 46,
        duration: 4.5,
        ease: "power2.inOut",
        onUpdate: () => {
          camera.updateProjectionMatrix();
        }
      }, 0); // Run in parallel
    }, 2000); // Wait 2 seconds for doors to begin opening before camera moves
  };
  
  // Animate the marker and make it face the camera (billboard effect)
  useFrame(({ clock }) => {
    if (markerRef.current) {
      // Make marker always face the camera (billboard effect)
      markerRef.current.quaternion.copy(camera.quaternion);
      
      // Slight hover animation
      const time = clock.getElapsedTime();
      markerRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.01;
    }
  });
  
  // Map marker colors with synthwave gradient
  const markerStyle = {
    fontSize: '48px',
    animation: 'pulse 2s infinite',
    filter: 'drop-shadow(0 0 8px #ff00cc)',
    color: '#ff00cc',
    background: 'transparent'
  };
  
  // CSS for pulsing animation
  const pulseAnimation = `
    @keyframes pulse {
      0% {
        filter: drop-shadow(0 0 5px #ff00cc);
        transform: scale(1);
      }
      50% {
        filter: drop-shadow(0 0 12px #ff00cc) drop-shadow(0 0 20px #00ccff);
        transform: scale(1.15);
      }
      100% {
        filter: drop-shadow(0 0 5px #ff00cc);
        transform: scale(1);
      }
    }
  `;
  
  return (
    <group position={position} ref={markerRef} onClick={handleMarkerClick}>
      {/* Style for the pulse animation */}
      <Html style={{ pointerEvents: 'none' }}>
        <style>{pulseAnimation}</style>
      </Html>
      
      {/* Map Marker Icon - only visible when popup is not shown */}
      {!showPopup && (
        <Html center>
          <div style={{ cursor: 'pointer', pointerEvents: 'auto' }} onClick={handleMarkerClick}>
            <FaMapMarkerAlt style={markerStyle} />
          </div>
        </Html>
      )}
      
      {/* HTML popup */}
      {showPopup && (
        <Html position={[0.12, 0.1, 0.01]} center>
          <div style={{
            width: '200px',
            backgroundColor: '#000000',
            border: '2px solid #ff00aa',
            borderRadius: '10px',
            padding: '15px',
            color: '#00ccff',
            fontFamily: 'sans-serif',
            boxShadow: '0 0 10px #ff00aa, 0 0 20px #bb00ff'
          }}>
            <div style={{ marginBottom: '10px', textAlign: 'center', fontWeight: 'bold' }}>
              You have a message
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={handleOkClick}
                style={{
                  background: 'linear-gradient(45deg, #ff00aa, #bb00ff)',
                  border: 'none',
                  color: 'white',
                  padding: '5px 15px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 0 5px #ff00aa'
                }}
              >
                OK
              </button>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Preload the model
useGLTF.preload('/lamboScene4.glb');

// Define the target position as a constant so it's available everywhere
// const TARGET_POSITION = new THREE.Vector3(0.0216, 0.5077, 0.3390);
const TARGET_POSITION = new THREE.Vector3(0.0346, 0.5195, 0.2656);

// Create a context to share camera data with components outside of Canvas
const CameraContext = React.createContext(null);

// Camera data provider component
function CameraDataProvider({ children }) {
  const { camera } = useThree();
  const [camData, setCamData] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    fov: 1
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
  // Force reloading the model when component mounts to reset its state
  const { scene, animations } = useGLTF('/lamboScene4.glb', true); // true enables refresh
  const [isStatueLoaded, setIsStatueLoaded] = useState(false);
  const modelRef = useRef();
  const [headTargetInfo, setHeadTargetInfo] = useState(null);
  const videoRef = useRef();
  const smokeRef = useRef(null);
  const mixerRef = useRef(null);
  
  // Handle statue loaded notification
  const handleStatueLoaded = () => {
    setIsStatueLoaded(true);
  };
  
  // Set up animation mixer
  useEffect(() => {
    if (scene && animations && animations.length > 0) {
      // Create animation mixer
      const mixer = new THREE.AnimationMixer(scene);
      mixerRef.current = mixer;
      
      // Find animation named "Animation.002"
      const targetAnimation = animations.find(anim => anim.name === "Animation.002");
      
      // Find KEY animation
      const keyAnimation = animations.find(anim => anim.name === "KEYAction");
      
      // Set up the door animation
      if (targetAnimation) {
        console.log("Found Animation.002, ready to play");
        // Create action but don't play immediately
        const action = mixer.clipAction(targetAnimation);
        action.loop = THREE.LoopOnce;
        action.clampWhenFinished = true;
        
        // Add animation finished callback
        action.getMixer().addEventListener('finished', function(e) {
          if (e.action === action) {
            console.log("Animation.002 completed, hiding smoke");
            // Hide all smoke objects when doors are open
            if (smokeRef.current) {
              smokeRef.current.forEach(smoke => {
                smoke.visible = false;
              });
            }
          }
        });
        
        // Create KEY animation action
        let keyAction = null;
        if (keyAnimation) {
          console.log("Found KEYAction animation, ready to play on click");
          keyAction = mixer.clipAction(keyAnimation);
          keyAction.loop = THREE.LoopOnce;
          keyAction.clampWhenFinished = true;
        } else {
          console.log("KEYAction animation not found in model", animations.map(a => a.name));
        }
        
        // Store actions on the window for access from camera controls
        window.modelAnimations = {
          playAnimation001: () => {
            console.log("Playing Animation.002");
            action.reset();
            action.play();
          },
          playKeyAnimation: () => {
            if (keyAction) {
              console.log("Playing KEYAction");
              keyAction.reset();
              keyAction.play();
            }
          }
        };
        
        // Find and add click listener to the KEY object
        scene.traverse((object) => {
          if (object.name === 'KEY') {
            console.log('Found KEY object, adding click listener');
            
            // Make the KEY interactive
            object.userData.clickable = true;
            
            // Ensure the KEY has proper material for interaction highlight
            if (object.material) {
              // Store original material properties
              const originalEmissive = object.material.emissive ? object.material.emissive.clone() : new THREE.Color(0, 0, 0);
              
              // Store original properties in userData
              object.userData.originalEmissive = originalEmissive;
              
              // Make the KEY slightly glow to indicate interactivity
              object.material.emissive = new THREE.Color(0.2, 0.2, 0.4);
              object.material.emissiveIntensity = 0.5;
            }
          }
        });
      } else {
        console.log("Animation.002 not found in model", animations.map(a => a.name));
      }
    }
    
    // Clean up mixer and animations when component unmounts
    return () => {
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current.uncacheRoot(scene);
      }
      
      // Reset any smoke visibility
      if (smokeRef.current) {
        smokeRef.current.forEach(smoke => {
          if (smoke) smoke.visible = true;
        });
      }
    };
  }, [scene, animations]);
  
  // Add click handling for interactive objects
  useEffect(() => {
    if (!scene) return;
    
    // Set up raycaster for click detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // Track current song index
    let currentSongIndex = 0;
    
    // Setup actual songs (as global variables to avoid hooks)
    const songUrls = [
      "https://storage.googleapis.com/bitter-peach.appspot.com/audio/320k/for-those-about-to-rock-ac-dc.m4a",
      "https://storage.googleapis.com/bitter-peach.appspot.com/audio/320k/dirty-cash.m4a",
      "https://storage.googleapis.com/bitter-peach.appspot.com/audio/320k/intergalactic-beastie-boys.m4a",
      "https://storage.googleapis.com/bitter-peach.appspot.com/audio/320k/good-life-inner-city.m4a",
      "https://storage.googleapis.com/bitter-peach.appspot.com/audio/320k/like-a-prayer-madonna.m4a",
      "https://storage.googleapis.com/bitter-peach.appspot.com/audio/320k/99-luftballoons-nena.m4a",
      "https://storage.googleapis.com/bitter-peach.appspot.com/audio/320k/sweet-dreams-eurythmics.m4a"
    ];
    
    // Setup local fallback songs (in case cloud storage doesn't work)
    const localSongUrls = [
      "/audio/synthwave-beat.mp3",
      "/audio/retro-beat.mp3",
      "/audio/cyberpunk-loop.mp3",
      "/audio/neon-city.mp3",
      "/audio/digital-dreams.mp3",
      "/audio/night-drive.mp3",
      "/audio/future-retro.mp3"
    ];
    
    // Use a guaranteed-to-work MP3 data URL
    // This is a 1-second beep sound encoded as base64
    const testToneUrl = "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3T09PT09PT09PT09PT09PT09PT0+np6enp6enp6enp6enp6enp6ekAAABQTEFNRTMuMTAwBEgAAAAAAAAAABUgJAMGQQABmgAABlAiznawAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=";
    
    // Direct MP3 URLs that *should* work (short beep sounds)
    const workingAudioUrls = [
        "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3T09PT09PT09PT09PT09PT09PT0+np6enp6enp6enp6enp6enp6ekAAABQTEFNRTMuMTAwBEgAAAAAAAAAABUgJAMGQQABmgAABlAiznawAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=",
        "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3T09PT09PT09PT09PT09PT09PT0+np6enp6enp6enp6enp6enp6ekAAABQTEFNRTMuMTAwBEgAAAAAAAAAABUgJAMGQQABmgAABlAiznawAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=",
        "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3T09PT09PT09PT09PT09PT09PT0+np6enp6enp6enp6enp6enp6ekAAABQTEFNRTMuMTAwBEgAAAAAAAAAABUgJAMGQQABmgAABlAiznawAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=",
        "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3T09PT09PT09PT09PT09PT09PT0+np6enp6enp6enp6enp6enp6ekAAABQTEFNRTMuMTAwBEgAAAAAAAAAABUgJAMGQQABmgAABlAiznawAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=",
        "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3T09PT09PT09PT09PT09PT09PT0+np6enp6enp6enp6enp6enp6ekAAABQTEFNRTMuMTAwBEgAAAAAAAAAABUgJAMGQQABmgAABlAiznawAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=",
        "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAAFAAAGUACFhYWFhYWFhYWFhYWFhYWFhYWFvb29vb29vb29vb29vb29vb29vb3T09PT09PT09PT09PT09PT09PT0+np6enp6enp6enp6enp6enp6ekAAABQTEFNRTMuMTAwBEgAAAAAAAAAABUgJAMGQQABmgAABlAiznawAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADwAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=",
    ];
    
    // Song names for display
    const songNames = [
      "For Those About To Rock - AC/DC",
      "Dirty Cash - The Adventures of Stevie V",
      "Intergalactic - Beastie Boys",
      "Good Life - Inner City",
      "Like A Prayer - Madonna",
      "99 Luftballoons - Nena",
      "Sweet Dreams - Eurythmics",
    ];
    
    // Helper function for trying playback with fallbacks
    const tryPlayWithFallbacks = (index, tryCount = 0) => {
      const audio = window.radioAudio;
      if (!audio) return;
      
      let sourceUrl;
      if (tryCount === 0) {
        // Just use the direct MP3 data URL immediately - guaranteed to work
        sourceUrl = workingAudioUrls[index % workingAudioUrls.length];
        console.log(`Radio: Using direct MP3 data URL for song ${index}`);
      } else {
        // Test tone as backup
        sourceUrl = testToneUrl;
        console.log(`Radio: Using test tone as fallback for song ${index}`);
      }
      
      // Set source and play
      audio.src = sourceUrl;
      return audio.play()
        .then(() => console.log(`Radio: Successfully playing song ${index} (${songNames[index]})`))
        .catch(err => {
          console.error(`Radio: Playback failed for song ${index} (attempt ${tryCount + 1}):`, err);
          
          // Try fallback if first attempt failed
          if (tryCount < 1) {
            console.log(`Radio: Trying fallback option for song ${index}...`);
            return tryPlayWithFallbacks(index, tryCount + 1);
          } else {
            console.error(`Radio: All playback options failed for song ${index}`);
            throw err;
          }
        });
    };

    // Create a static Audio API object and radio state
    if (typeof window !== 'undefined') {
      if (!window.radioAudio) {
        window.radioAudio = new Audio();
        window.radioAudio.volume = 0.5;
        
        // Handle autoplay of next song when current one ends
        window.radioAudio.addEventListener('ended', () => {
          console.log('Song ended, playing again');
          
          // Just play the same song on loop
          window.radioAudio.currentTime = 0;
          window.radioAudio.play()
            .catch(err => console.error('Error replaying song:', err));
        });
      }
      
      // Initialize radio state if not already done
      if (window.radioState === undefined) {
        // States: 0 = OFF, 1 = Intergalactic, 2 = Good Life
        window.radioState = 0;
      }
    }

    // Store refs in window for access from event handlers
    window.smokeRef = smokeRef;
    window.mixerRef = mixerRef;
      
    // Function to handle radio interaction - cycles through different "stations"
    const handleRadioClick = () => {
      const audio = window.radioAudio;
      if (!audio) {
        console.error('Radio audio not initialized (browser may not support Audio API)');
        return;
      }
      
      // Advance to next state (cycle through radio stations)
      window.radioState = (window.radioState + 1) % 3; // Cycle: 0 -> 1 -> 2 -> 0
      
      // Stop any current playback
      audio.pause();
      
      // Handle based on new state
      switch(window.radioState) {
        case 0: // OFF
          console.log('Radio: Turned off');
          audio.currentTime = 0; // Reset position
          break;
          
        case 1: // SONG 1 - Intergalactic
          console.log('Radio: Playing Station 1 - Intergalactic by Beastie Boys');
          audio.src = '/Intergalactic Beastie Boys.m4a';
          audio.play()
            .then(() => console.log('Radio: Playback started successfully'))
            .catch(err => console.error('Radio: Playback failed:', err));
          break;
          
        case 2: // SONG 2 - Good Life
          console.log('Radio: Playing Station 2 - Good Life by Inner City');
          audio.src = '/good-life-inner-city.m4a';
          audio.play()
            .then(() => console.log('Radio: Playback started successfully'))
            .catch(err => console.error('Radio: Playback failed:', err));
          break;
      }
      
      // Make radio object glow to indicate state
      scene.traverse((object) => {
        if (object.name === 'radio') {
          if (object.material) {
            // Cancel any existing pulse animation
            if (object.userData.pulseAnimationId) {
              cancelAnimationFrame(object.userData.pulseAnimationId);
              object.userData.pulseAnimationId = null;
            }
            
            // Set color based on radio state
            switch(window.radioState) {
              case 0: // OFF - dim gray glow
                object.material.emissive = new THREE.Color(0.3, 0.3, 0.3);
                object.material.emissiveIntensity = 0.3;
                break;
              
              case 1: // SONG 1 - Intergalactic - blue glow
                object.material.emissive = new THREE.Color(0.2, 0.6, 1); // Blue-ish color
                object.material.emissiveIntensity = 1;
                
                // Pulse effect for playing state
                const pulseAnimation1 = () => {
                  if (!object.material) return;
                  
                  const time = Date.now() * 0.001; // Get time in seconds
                  const pulseValue = 0.5 + Math.sin(time * 3) * 0.3; // Pulsing between 0.2 and 0.8
                  
                  object.material.emissiveIntensity = pulseValue;
                  
                  // Continue animation if object still exists and still on this song
                  if (object.material && window.radioState === 1) {
                    object.userData.pulseAnimationId = requestAnimationFrame(pulseAnimation1);
                  }
                };
                
                // Start pulse animation
                pulseAnimation1();
                break;
              
              case 2: // SONG 2 - Good Life - green glow
                object.material.emissive = new THREE.Color(0.0, 0.9, 0.4); // Green color
                object.material.emissiveIntensity = 1;
                
                // Pulse effect for playing state (different pattern)
                const pulseAnimation2 = () => {
                  if (!object.material) return;
                  
                  const time = Date.now() * 0.001; // Get time in seconds
                  // Different pulse pattern for second song
                  const pulseValue = 0.5 + Math.sin(time * 5) * 0.4; // Faster, stronger pulse
                  
                  object.material.emissiveIntensity = pulseValue;
                  
                  // Continue animation if object still exists and still on this song
                  if (object.material && window.radioState === 2) {
                    object.userData.pulseAnimationId = requestAnimationFrame(pulseAnimation2);
                  }
                };
                
                // Start pulse animation
                pulseAnimation2();
                break;
            }
          }
        }
      });
      
      // Display song info as floating text above the radio
      if (!audio.paused) {
        console.log('Now playing: Intergalactic - Beastie Boys');
      } else {
        console.log('Music paused');
      }
    };
    
    // Click handler function
    const handleClick = (event) => {
      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const canvas = document.querySelector('canvas');
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, window.camera);
      
      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      // Check if we hit an interactive object
      for (let i = 0; i < intersects.length; i++) {
        const object = intersects[i].object;
        
        // Check if the clicked object is the KEY
        if (object.name === 'KEY' || object.parent?.name === 'KEY') {
          console.log('KEY clicked!');
          if (window.modelAnimations && window.modelAnimations.playKeyAnimation) {
            window.modelAnimations.playKeyAnimation();
          }
          
          // Play the door animation in reverse (close the doors)
          // and make smoke visible again
          if (window.modelAnimations && window.modelAnimations.playAnimation001) {
            // Create a flag to track door state (open/closed)
            if (window.doorState === undefined) {
              window.doorState = 'open'; // Initial state (doors are open)
            }
            
            // Toggle door state
            if (window.doorState === 'open') {
              console.log('Closing doors...');
              
               // Play Animation.002 in reverse to close the doors
               // First get the mixer and find the Animation.002 action
               if (window.mixerRef && window.mixerRef.current) {
                 // Find all actions in the mixer
                 const actions = window.mixerRef.current._actions || [];
                 const doorAction = actions.find(action => 
                   action._clip && action._clip.name === "Animation.002"
                 );
                 
                 if (doorAction) {
                   // Set time scale to negative for reverse playback
                   doorAction.timeScale = -1;
                   
                   // Make sure we start from the end
                   doorAction.time = doorAction._clip.duration;
                   doorAction.paused = false;
                   doorAction.enabled = true;
                   doorAction.play();
                   
                   // Make smoke visible again when animation ends
                   doorAction.getMixer().addEventListener('finished', function onFinished(e) {
                     if (e.action === doorAction) {
                       console.log("Door closing animation completed, making smoke visible");
                       // Show all smoke objects
                       if (window.smokeRef && window.smokeRef.current) {
                         window.smokeRef.current.forEach(smoke => {
                           smoke.visible = true;
                         });
                       }
                      
                      // Remove this event listener to avoid duplicates
                      doorAction.getMixer().removeEventListener('finished', onFinished);
                      
                      // Reset timeScale back to positive for next time
                      doorAction.timeScale = 1;
                      
                      // Update door state
                      window.doorState = 'closed';
                    }
                  });
                } else {
                  console.warn("Could not find Animation.002 action for reverse playback");
                }
              }
            } else {
              // Doors are closed, open them
              console.log('Opening doors...');
              
              // Hide smoke objects BEFORE playing the door opening animation
              if (window.smokeRef && window.smokeRef.current) {
                console.log("Hiding smoke objects before door opens");
                window.smokeRef.current.forEach(smoke => {
                  smoke.visible = false;
                });
              }
              
              // Then play the door opening animation
              window.modelAnimations.playAnimation001();
              window.doorState = 'open';
            }
          }
          
          // Find the StartButton and toggle its glow
          scene.traverse((sceneObject) => {
            if (sceneObject.name === 'StartButton') {
              console.log('Found StartButton, toggling green glow');
              
              // Store original material state if not already stored
              if (!sceneObject.userData.originalMaterial) {
                sceneObject.userData.originalMaterial = {
                  emissive: sceneObject.material?.emissive ? sceneObject.material.emissive.clone() : new THREE.Color(0, 0, 0),
                  emissiveIntensity: sceneObject.material?.emissiveIntensity || 0,
                  color: sceneObject.material?.color ? sceneObject.material.color.clone() : new THREE.Color(1, 1, 1)
                };
              }
              
              // Toggle between green glow and original state
              if (sceneObject.material) {
                // Check if the button is currently glowing
                const isGlowing = sceneObject.userData.isGlowing;
                
                if (isGlowing) {
                  // Turn off glow - restore original material properties
                  console.log('Turning off green glow');
                  const original = sceneObject.userData.originalMaterial;
                  sceneObject.material.emissive = original.emissive;
                  sceneObject.material.emissiveIntensity = original.emissiveIntensity;
                  
                  // Stop any existing pulse animation
                  if (sceneObject.userData.pulseAnimationId) {
                    cancelAnimationFrame(sceneObject.userData.pulseAnimationId);
                    sceneObject.userData.pulseAnimationId = null;
                  }
                  
                  // Update state
                  sceneObject.userData.isGlowing = false;
                } else {
                  // Turn on green glow
                  console.log('Turning on green glow');
                  sceneObject.material.emissive = new THREE.Color(0, 1, 0); // Bright green glow
                  sceneObject.material.emissiveIntensity = 2.0; // Stronger glow
                  
                  // Optional: add pulse animation
                  const pulseAnimation = () => {
                    if (!sceneObject.material) return; // Safety check
                    
                    const time = Date.now() * 0.001; // Get time in seconds
                    const pulseValue = 1.0 + Math.sin(time * 3) * 0.5; // Pulsing between 0.5 and 1.5
                    
                    sceneObject.material.emissiveIntensity = pulseValue;
                    
                    // Continue animation if object still exists and should be glowing
                    if (sceneObject.material && sceneObject.userData.isGlowing) {
                      sceneObject.userData.pulseAnimationId = requestAnimationFrame(pulseAnimation);
                    }
                  };
                  
                  // Start pulse animation
                  sceneObject.userData.isGlowing = true;
                  pulseAnimation();
                }
              }
            }
          });
          
          break;
        }
        
        // Check if the clicked object is the radio
        if (object.name === 'radio' || object.parent?.name === 'radio') {
          console.log('Radio clicked!');
          handleRadioClick();
          break;
        }
      }
    };
    
    // Add click event listener to the canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleClick);
    }
    
    // Clean up event listener
    return () => {
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [scene]);

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
        
        // Add emissive property to Object_92
        if (object.name === 'Object_92' && object.material) {
          console.log('Found Object_92, adding white emissive property');
          object.material.emissive = new THREE.Color(1, 1, 1); // White
          object.material.emissiveIntensity = 1.5;
        }
        
        // Add emissive property to Sunset
        if (object.name.includes('Sunset')) {
          console.log('Found Sunset object:', object.name);
          
          // Define colors for each segment - darker synthwave palette from amber/orange to deep purple
          const sunsetColors = {
            'Sunset0': { color: new THREE.Color(1.0, 0.6, 0.1), emissive: new THREE.Color(1.0, 0.5, 0.0), intensity: 2.5 },  // Amber
            'Sunset1': { color: new THREE.Color(1.0, 0.4, 0.0), emissive: new THREE.Color(0.9, 0.3, 0.0), intensity: 2.2 },  // Dark orange
            'Sunset2': { color: new THREE.Color(0.9, 0.25, 0.05), emissive: new THREE.Color(0.8, 0.2, 0.05), intensity: 2.3 }, // Burnt orange
            'Sunset3': { color: new THREE.Color(0.8, 0.15, 0.1), emissive: new THREE.Color(0.7, 0.1, 0.1), intensity: 2.5 },  // Dark red-orange
            'Sunset4': { color: new THREE.Color(0.7, 0.05, 0.2), emissive: new THREE.Color(0.6, 0.05, 0.25), intensity: 2.3 }, // Crimson
            'Sunset5': { color: new THREE.Color(0.6, 0.0, 0.35), emissive: new THREE.Color(0.5, 0.0, 0.4), intensity: 2.0 },   // Dark magenta
            'Sunset6': { color: new THREE.Color(0.4, 0.0, 0.5), emissive: new THREE.Color(0.3, 0.0, 0.6), intensity: 1.8 },    // Deep purple
            'Sunset7': { color: new THREE.Color(0.2, 0.0, 0.6), emissive: new THREE.Color(0.15, 0.0, 0.7), intensity: 1.5 },   // Indigo/deep purple
          };
          
          // Get the appropriate color set for this sunset segment
          const colorSet = sunsetColors[object.name] || sunsetColors['Sunset4']; // Default to mid-orange if name not found
          
          // Create a custom material for this sunset segment
          const sunsetMaterial = new THREE.MeshStandardMaterial({
            color: colorSet.color,
            emissive: colorSet.emissive,
            emissiveIntensity: colorSet.intensity,
            toneMapped: false,
            metalness: 0.1,
            roughness: 0.7,
            transparent: true,           // Add transparency
            opacity: 0.85,               // Slight transparency
          });
          
          // Apply the material to this segment
          object.material = sunsetMaterial;
        }
        
        // Add dynamic smoke effect to Object_22
        if (object.name.includes('Object_22') && object.material) {
          console.log('Found smoke object:', object.name);
          
          // Create a glowing, semi-transparent material for smoke
          const smokeMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0.3, 0.5, 0.9), // Bluish base color
            transparent: true,
            opacity: 0.7,
            emissive: new THREE.Color(0.2, 0.4, 0.8), // Blue glow
            emissiveIntensity: 0.8,
            metalness: 0.2,
            roughness: 0.8
          });
          
          // Apply the material
          object.material = smokeMaterial;
          
          // Store reference to smoke objects for animation
          if (!smokeRef.current) smokeRef.current = [];
          smokeRef.current.push(object);
        }
      });
      
      // Log all object names to help identify the correct name if needed
      console.log('All objects in the scene:');
      scene.traverse((object) => {
        if (object.isMesh) {
          console.log(` - ${object.name}`);
          
          // Enable shadows for all meshes
          object.castShadow = true;
          object.receiveShadow = true;
          
          // Make dashboard-related objects receive shadows more prominently
          if (object.name.includes('Mary') || object.name.includes('Object_45')) {
            object.receiveShadow = true;
          }
          
          // START - Added code for palm tree materials
          // Replace with the actual name of your palm leaf mesh
          if (object.name === 'PalmLeaves') { 
            console.log('Applying green material to palm leaves:', object.name);
            const leafMaterial = new THREE.MeshStandardMaterial({
              color: '#367e6c', // You can use a hex code like #2E8B57 for a specific green
              roughness: 0.7,
              metalness: 0.0, // Important for non-metallic look
            });
            // If your original leaves have a texture you want to keep, uncomment and adapt:
            // if (object.material && object.material.map) {
            //   leafMaterial.map = object.material.map;
            // }
            object.material = leafMaterial;
          }
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
  
  // Update animation mixer on each frame
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
    
    // Animate smoke objects
    if (smokeRef.current && smokeRef.current.length > 0) {
      // Get time for animation
      const time = state.clock.getElapsedTime();
      
      smokeRef.current.forEach((smoke, index) => {
        // Create unique animation per smoke cloud
        const offset = index * 0.5;
        
        // Pulse opacity
        smoke.material.opacity = 0.6 + Math.sin(time * 0.8 + offset) * 0.2;
        
        // Subtle rotation
        smoke.rotation.z = Math.sin(time * 0.2 + offset) * 0.1;
        
        // Color shifting - restricted to blue, cyan, and pink range
        // Map time to a value that cycles between 0 and 1
        const timeValue = (time * 0.05 + index * 0.2) % 1;
        
        // Create a color mapping function that only uses blue-cyan-pink range
        // 0.5-0.7 is cyan/blue range and 0.8-1.0 is pink/purple range
        let hue;
        if (timeValue < 0.5) {
          // Map 0-0.5 to the blue/cyan range (0.5-0.7)
          hue = 0.5 + (timeValue * 0.4); // Maps to 0.5-0.7 range
        } else {
          // Map 0.5-1.0 to the pink/purple range (0.8-1.0)
          hue = 0.8 + ((timeValue - 0.5) * 0.4); // Maps to 0.8-1.0 range
          if (hue > 1) hue -= 1; // Wrap around if over 1
        }
        
        // Apply the restricted color palette
        const color = new THREE.Color().setHSL(hue, 0.8, 0.6);
        const emissiveColor = new THREE.Color().setHSL(hue, 0.9, 0.4);
        
        smoke.material.color = color;
        smoke.material.emissive = emissiveColor;
        
        // Subtle scale pulsing
        const scale = 1 + Math.sin(time * 0.4 + offset) * 0.05;
        smoke.scale.set(scale, scale, scale);
      });
    }
  
  });
  
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
// function CameraTarget() {
//   return (
//     <mesh position={[TARGET_POSITION.x, TARGET_POSITION.y, TARGET_POSITION.z]} visible={true}>
//       <sphereGeometry args={[0.01, 16, 16]} />
//       <meshBasicMaterial color="red" transparent opacity={0.6} />
//     </mesh>
//   );
// }

// // Camera position helper - visual indicator of camera position 
// function CameraHelper() {
//   const cameraPos = useRef(new THREE.Vector3());
  
//   useFrame(() => {
//     if (window.camera) {
//       cameraPos.current.copy(window.camera.position);
//     }
//   });
  
//   return null;
// }

// // Line connecting camera to target - to help visualize where camera is looking
// function LookAtHelper() {
//   const lineRef = useRef();
//   const cameraPos = useRef(new THREE.Vector3());
  
//   useFrame(() => {
//     if (window.camera && lineRef.current) {
//       cameraPos.current.copy(window.camera.position);
      
//       // Update line geometry to connect camera and target
//       const points = [
//         cameraPos.current,
//         TARGET_POSITION
//       ];
      
//       lineRef.current.geometry.setFromPoints(points);
//       lineRef.current.geometry.verticesNeedUpdate = true;
//     }
//   });
  
//   return (
//     <line ref={lineRef}>
//       <bufferGeometry />
//       <lineBasicMaterial color="yellow" opacity={0.5} transparent />
//     </line>
//   );
// }

// Simplified Point Light Helper
// function PointLightHelper({ position, color, intensity }) {
//   const lightRef = useRef();
  
//   return (
//     <pointLight 
//       ref={lightRef} 
//       position={position}
//       intensity={1} 
//       color={color} 
//     />
//   );
// }

// Simple camera controls component
function CameraControls({ onAnimationComplete }) {
  const initialPosition = { x: 0.0448, y: 0.5314, z: 0.1835};
  
  // Store position for keyboard controls
  const [position, setPosition] = useState(initialPosition);
  const [fov, setFov] = useState(1); // Changed from 0 to match Canvas camera
  
  // Store saved positions for animations
  const [savedPositions, setSavedPositions] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Camera preset positions
  // const presets = {
  //   position1: { 
  //     x: 0.0711, y: 0.503, z: -0.2412, 
  //     fov: 20, 
  //     target: { x: -0.0137, y: 0.5019, z: 0.2878 }
  //   },
  //   position2: { 
  //     x: 0.5791, y: 0.805, z: -0.6848, 
  //     fov: 20,
  //     target: { x: 0.0356, y: 0.4476, z: 0.2713 }
  //   },
  //   position3: { 
  //     x: 0.1912, y: 0.533, z: 3.1731, 
  //     fov: 20,
  //     target: { x: -0.1119, y: 0.4302, z: 0.426 }
  //   },
  //   position4: { 
  //     x: -5.0927, y: 3.9886, z: 12.4432, 
  //     fov: 20,
  //     target: { x: -0.2125, y: 1.0975, z: 0.1229 }
  //   }
  // };
  
  // Create a sequence array with the positions we want to play on load
  // const autoPlaySequence = [
  //   // presets.position1,
  //   presets.position2,
  //   // presets.position3,
  //   // presets.position4
  // ];
  
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
  
  // Function for initial camera transition
  const initialCameraTransition = () => {
    if (window.camera && !isAnimating) {
      setIsAnimating(true);
      
      // Define the sequence of camera positions and targets
      const cameraSequence = [
        {
          position: { x: 0.1263, y: 0.4731, z: -0.25 },
          
          fov: 40,
          target: { x: 0.0346, y: 0.3995, z: 0.2656 },
          duration: 9
        },
        {
          position: { x: 4.1164, y: 2.3104, z: 4.7383 },
          fov: 45,
          target: { x: 0.0346, y: 0.5195, z: 0.2656 },
          duration: 22
        }
      ];
      
      // Create a master timeline for all animations
      const masterTimeline = gsap.timeline({
        onComplete: () => {
          setIsAnimating(false);
          const orbitControls = window.orbitControlsRef?.current;
          if (orbitControls) {
            orbitControls.enabled = true; // Re-enable controls
            orbitControls.autoRotate = true; // Enable autoRotate after animation
          }
          
          // Notify parent component that animation is complete
          if (onAnimationComplete) {
            console.log("Animation sequence complete, notifying parent");
            onAnimationComplete(false); // false indicates normal completion, not interruption
          }
        }
      });
      
      // Store the timeline for possible interruption
      window.cameraTimeline = masterTimeline;
      
      // Get orbit controls reference
      const orbitControls = window.orbitControlsRef?.current;
      
      // Add each camera move to the timeline
      let timePosition = 0;
      cameraSequence.forEach((move, index) => {
        const targetVector = new THREE.Vector3(move.target.x, move.target.y, move.target.z);
        
        // Create a label for this camera position
        const posLabel = `pos${index}`;
        masterTimeline.addLabel(posLabel, timePosition);
        
        // Call onStart callback if provided
        if (move.onStart) {
          masterTimeline.call(move.onStart, [], posLabel);
        }
        
        // Add orbit control target animation
        if (orbitControls) {
          masterTimeline.to(orbitControls.target, {
            x: targetVector.x,
            y: targetVector.y,
            z: targetVector.z,
            duration: move.duration,
            ease: "power1.inOut"
          }, posLabel);
        }
        
        // Add camera position animation - at the same time
        masterTimeline.to(window.camera.position, {
          x: move.position.x,
          y: move.position.y,
          z: move.position.z,
          duration: move.duration,
          ease: "power1.inOut",
          onUpdate: () => {
            lookAtTarget(targetVector);
            setPosition({
              x: window.camera.position.x,
              y: window.camera.position.y,
              z: window.camera.position.z
            });
          }
        }, posLabel);
        
        // Add FOV animation - at the same time
        masterTimeline.to(window.camera, {
          fov: move.fov,
          duration: move.duration,
          ease: "power1.inOut",
          onUpdate: () => {
            window.camera.updateProjectionMatrix();
            setFov(window.camera.fov);
          }
        }, posLabel);
        
        // Update time position for next animation set
        timePosition += move.duration;
      });
    }
  };
  
  // Function to stop ongoing camera animations
  const stopCameraAnimations = () => {
    if (window.cameraTimeline && isAnimating) {
      window.cameraTimeline.kill(); // Kill the animation
      setIsAnimating(false);
      console.log("Animation stopped by user interaction");
      
      // Notify that animation was interrupted
      if (onAnimationComplete) {
        console.log("Animation interrupted by user, still showing marker");
        onAnimationComplete(true); // Pass true to indicate interruption
      }
    }
  };
  
  // Add event listeners to detect user interaction
  useEffect(() => {
    // Function to handle user camera control via OrbitControls
    const handleOrbitControlStart = () => {
      stopCameraAnimations();
    };
    
    // Add event listeners to orbit controls when available
    const orbitControls = window.orbitControlsRef?.current;
    if (orbitControls) {
      orbitControls.addEventListener('start', handleOrbitControlStart);
    }
    
    return () => {
      // Clean up event listeners
      if (orbitControls) {
        orbitControls.removeEventListener('start', handleOrbitControlStart);
      }
    };
  }, [isAnimating]); // Re-run when isAnimating changes
  
  // Function to update camera state from outside components
  const updateCameraState = (newPosition, newFov) => {
    setPosition(newPosition);
    if (newFov) setFov(newFov);
  };
  
  // Store update function for access in onCreated
  useEffect(() => {
    window.updateCameraState = updateCameraState;
    return () => {
      delete window.updateCameraState;
    };
  }, []);

  // Start automatic playback when component mounts
  useEffect(() => {
    if (window.camera) {
      initialCameraTransition();
    }
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
  
  // Enhanced keyboard controls for fine camera adjustments
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Skip if focus is in an input field
      if (e.target.tagName === 'INPUT') return;
      
      // Stop animations if camera control keys are pressed
      const cameraControlKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', '+', '-', '=', '_'];
      if (cameraControlKeys.includes(e.key)) {
        stopCameraAnimations();
      }
      
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
            const newFov = Math.max(1, prev - 5);
            window.camera.fov = newFov;
            window.camera.updateProjectionMatrix();
            return newFov;
          });
          break;
        case '-':
        case '_':
          setFov(prev => {
            const newFov = Math.min(180, prev + 5);
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
  
  return null;
}

// Add a simple PointLightHelper component
function PointLightVisualizer({ position, color, intensity, size = 0.1 }) {
  const lightRef = useRef();
  
  return (
    <>
      <pointLight 
        ref={lightRef} 
        position={position}
        color={color}
        intensity={intensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.01}
        shadow-camera-far={5}
        shadow-radius={8}
      />
      <mesh position={position}>
        <sphereGeometry args={[size, 8, 8]} />
        <meshBasicMaterial color="#5485b6" wireframe={true} />
      </mesh>
    </>
  );
}

// Directional Light Helper
function DirectionalLightVisualizer({ position, intensity, color = "white", targetPosition = [0, 0, 0] }) {
  const lightRef = useRef();
  const lineRef = useRef();
  
  // Update line connecting light to target
  useFrame(() => {
    if (lineRef.current) {
      const points = [
        new THREE.Vector3(...position),
        new THREE.Vector3(...targetPosition)
      ];
      
      lineRef.current.geometry.setFromPoints(points);
      lineRef.current.geometry.verticesNeedUpdate = true;
    }
  });
  
  return (
    <>
      <directionalLight 
        ref={lightRef} 
        position={position}
        intensity={intensity} 
        color={color}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.01}
        shadow-camera-far={10}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
      />
      {/* Visualize light position */}
      <mesh position={position}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial color="#5485b6" wireframe={true} />
      </mesh>
      
      {/* Visualize target */}
      <mesh position={targetPosition}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#5485b6" wireframe={true} />
      </mesh>
      
      {/* Line connecting light to target */}
      <line ref={lineRef}>
        <bufferGeometry attach="geometry" />
        <lineBasicMaterial attach="material" color={color} opacity={0.5} transparent />
      </line>
    </>
  );
}

// Hemisphere Light Helper
function HemisphereLightVisualizer({ position, intensity, skyColor, groundColor }) {
  const lightRef = useRef();
  
  return (
    <>
         <hemisphereLight 
              skyColor="#ff7e5f" // Warm orange/pink for sky
              groundColor="#371e57" // Deep purple for ground
              intensity={1.5}
              position={[0, 5, 0]}
            />
      
      {/* Visualize hemisphere with half-spheres */}
      <group position={position}>
        {/* Upper half - sky color */}
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color={skyColor} wireframe={true} side={THREE.BackSide} />
        </mesh>
        
        {/* Lower half - ground color */}
        <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.15, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color={groundColor} wireframe={true} side={THREE.BackSide} />
        </mesh>
      </group>
    </>
  );
}

// Sun glow helper
// function SunGlowVisualizer({ position, rotation, size, color, opacity }) {
//   return (
//     <>
//       <mesh position={position} rotation={rotation}>
//         <planeGeometry args={[size[0], size[1]]} />
//         <meshBasicMaterial 
//           side={THREE.DoubleSide}
//           transparent={true}
//           opacity={opacity}
//           color={color}
//         />
//         {/* Add wireframe outline to help visualize the glow plane */}
//         <lineSegments>
//           <edgesGeometry attach="geometry" args={[new THREE.PlaneGeometry(size[0], size[1])]} />
//           <lineBasicMaterial color="#5485b6" transparent opacity={0.4} />
//         </lineSegments>
//       </mesh>
//     </>
//   );
// }

function Synthwave() {
  const [controlsEnabled, setControlsEnabled] = useState(true);
  const [showLightHelper, setShowLightHelper] = useState(false);
  const [showSunHelper, setShowSunHelper] = useState(false);
  const [showDirectionalHelper, setShowDirectionalHelper] = useState(false);
  const [showHemisphereHelper, setShowHemisphereHelper] = useState(false);
  const [showCameraGUI, setShowCameraGUI] = useState(true);
  const [showMarker, setShowMarker] = useState(false);
  const controlsRef = useRef();
  const pinkLightRef = useRef();
  
  // Radio music state
  const [currentSong, setCurrentSong] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Array of song information
  const songs = [
    { id: 1, title: "Synthwave Dreams", file: "/music/synthwave-dreams.mp3" },
    { id: 2, title: "Neon Cruise", file: "/music/neon-cruise.mp3" },
    { id: 3, title: "Digital Sunset", file: "/music/digital-sunset.mp3" }
  ];
  
  // Function to control music from parent component
  const playNextSong = () => {
    setCurrentSong((prev) => (prev + 1) % songs.length);
    setIsPlaying(true);
    
    // Notify parent component to change song via window event
    window.dispatchEvent(new CustomEvent('playSynthwaveSong', { 
      detail: { 
        songIndex: (currentSong + 1) % songs.length,
        songInfo: songs[(currentSong + 1) % songs.length],
        play: true 
      } 
    }));
  };
  
  const togglePlayPause = () => {
    const newIsPlaying = !isPlaying;
    setIsPlaying(newIsPlaying);
    
    // Notify parent component to toggle play/pause via window event
    window.dispatchEvent(new CustomEvent('toggleSynthwaveMusic', { 
      detail: { 
        songIndex: currentSong,
        songInfo: songs[currentSong],
        play: newIsPlaying 
      } 
    }));
  };
  
  // Expose music controls to child components via context
  const musicContextValue = {
    currentSong,
    isPlaying,
    songs,
    playNextSong,
    togglePlayPause
  };
  
  // Create a ref to track all timeouts for cleanup
  useEffect(() => {
    // Initialize array to track timeout IDs
    window.timeoutIds = [];
    
    // Override setTimeout to track IDs
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback, delay, ...args) {
      const id = originalSetTimeout(callback, delay, ...args);
      window.timeoutIds.push(id);
      return id;
    };
    
    return () => {
      // Restore original setTimeout
      window.setTimeout = originalSetTimeout;
    };
  }, []);
  
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
        case 's': // 'S' to toggle sun helper
          setShowSunHelper(prev => !prev);
          break;
        case 'd': // 'D' to toggle directional light helper
          setShowDirectionalHelper(prev => !prev);
          break;
        case 'h': // 'H' to toggle hemisphere light helper
          setShowHemisphereHelper(prev => !prev);
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
  }, [controlsEnabled, showLightHelper, showSunHelper, showDirectionalHelper, showHemisphereHelper, showCameraGUI]);

  const [lightIntensity, setLightIntensity] = useState(0.3);
  const [lightPosition, setLightPosition] = useState([0.0626, 0.3788, -0.0075]);
  
  // Directional light state
  const [dirLightPosition, setDirLightPosition] = useState([0.2, 0.8, 0.2]);
  const [dirLightIntensity, setDirLightIntensity] = useState(0.8);
  const [dirLightTarget, setDirLightTarget] = useState([0, 0, 0]);
  
  // Hemisphere light state
  const [hemiLightPosition, setHemiLightPosition] = useState([0, 4, 0]);
  const [hemiLightIntensity, setHemiLightIntensity] = useState(1.1);
  const [hemiSkyColor, setHemiSkyColor] = useState("#519ca0");
  const [hemiGroundColor, setHemiGroundColor] = useState("#ff6a23");

  useEffect(() => {
    const timer = setTimeout(() => {
      setLightIntensity(0.6);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Handle animation completion
  const handleAnimationComplete = (wasInterrupted = false) => {
    // Add a small delay before showing marker for completed animations
    // Show immediately if interrupted
    const delay = wasInterrupted ? 0 : 2000;
    
    setTimeout(() => {
      setShowMarker(true);
      console.log(`Showing marker after animation ${wasInterrupted ? 'interruption' : 'completes'}`);
    }, delay);
  };
  
  // Reset component state when unmounting (when Back button is clicked)
  useEffect(() => {
    return () => {
      // Reset all state
      console.log('Component unmounting - resetting animations and state');
      
      // Reset camera animation timeline if it exists
      if (window.cameraTimeline) {
        window.cameraTimeline.kill();
      }
      
      // Reset animation mixer and animations
      if (window.modelAnimations) {
        // Delete the animation functions to prevent them from being called after unmount
        delete window.modelAnimations;
      }
      
      // Clear any timeouts/intervals
      const existingTimeouts = window.timeoutIds || [];
      existingTimeouts.forEach(id => clearTimeout(id));
      
      // Reset any other global state
      if (window.orbitControlsRef) {
        window.orbitControlsRef = null;
      }
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        camera={{
          fov: 1,
          position: [0.0448, 0.5314, 0.1835],
          near: 0.1,
          far: 300
        }}
        shadows
        onCreated={({ camera, gl }) => {
          window.camera = camera;
          camera.up.set(0, 1, 0);
          camera.lookAt(TARGET_POSITION);
          
          // Update position state to match initial camera position
          if (window.updateCameraState) {
            window.updateCameraState({
              x: camera.position.x,
              y: camera.position.y,
              z: camera.position.z
            }, camera.fov);
          }
          
          // Enable better shadow mapping
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
          
          // Add near the top of your Synthwave component  
          // scene.fog = new THREE.FogExp2('#200030', 0.05);
        }}
      >
        <CameraDataProvider>
          <Suspense fallback={null}>
            <DeLoreanModel />
            <CameraControls onAnimationComplete={handleAnimationComplete} />
            <Environment preset="night" />

            {/* Custom synthwave environment setup */}
            {/* <Environment background={false} preset={null}> */}
              {/* Custom environment for reflections */}
              <ambientLight intensity={2} color="#b0c4ff" /> 
              {/* <directionalLight 
                position={[5, 5, 5]} 
                intensity={0.6}
                color="#ff00cc" 
              /> */}
              {/* <directionalLight 
                position={[-5, 12, -5]} 
                intensity={0.6}
                color="#00ccff" 
              /> */}
              {/* Additional light from front to illuminate car */}
              {/* <directionalLight 
                position={[0, 0, 6]} 
                intensity={0.5}
                color="#ffffff" 
              /> */}
            {/* </Environment> */}
            {/* <mesh>
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
            </mesh> */}
            
            {/* Background sphere with deep space gradient for the sky */}
            {/* <mesh scale={150} rotation={[-Math.PI/2, 0, -Math.PI/3]}> 
              <sphereGeometry args={[1, 32, 32]} />
              <meshBasicMaterial 
                side={THREE.BackSide}
                fog={false}
                depthWrite={false}
              >
                <GradientTexture 
                  stops={[0, 0.3, 0.6, 1]} 
                  colors={["#000000", "#050014", "#0a0029", "#14003d"]} 
                  size={1024}
                />
              </meshBasicMaterial>
            </mesh> */}
            
            {/* Add the marker after animation completes */}
            {showMarker && <SynthwaveMarker position={[0.47, 0.77, -0.25]} />}
            {/* <Sky 
  distance={450000}
  sunPosition={[0, -.038, -1]}
  turbidity={0.1}
  rayleigh={0.7}
  inclination={0.1}
  azimuth={0.25}
  mieCoefficient={0.001}
  mieDirectionalG={0.65}
  exposure={0.25}
/> */}
<mesh scale={[100, 100, 100]} rotation={[0, 0, 0]}>
  <sphereGeometry args={[1, 64, 64]} />
  <meshBasicMaterial side={THREE.BackSide} fog={false} opacity={0.2} transparent={true}>

    <GradientTexture 
      stops={[0, 0.3, 0.6, 1]} 
      colors={["#000000", "#300350", "#5f0096", "#ff0066"]} 
      size={1024}
    />
  </meshBasicMaterial>
</mesh>
            
            {/* Sky component with synthwave colors */}
            <Sky 
              distance={450000} 
              sunPosition={[5, -5, -2]} 
              inclination={0.1} 
              azimuth={0.25}
              turbidity={10}
              rayleigh={1.5}
              mieCoefficient={0.005}
              mieDirectionalG={0.8}
              moonPosition={[3, 0.5, -1]}
              exposure={0.3}
            />
            
            {/* Synthwave background sphere */}
            {/* <mesh>
              <sphereGeometry args={[50, 32, 32]} />
              <meshStandardMaterial 
                side={THREE.BackSide}
                // position={[0, 2, 0]}
                color="#000000"
                emissive="#560088"
                emissiveIntensity={0.3}
                metalness={0.8}
                roughness={0.4}
                wireframe={false}
                fog={false}
                depthWrite={true}
              />
            </mesh> */}
            
            {/* Grid floor for synthwave effect */}
            {/* <mesh rotation={[-Math.PI / 2, -Math.PI, 0]} position={[0, -0.8, 0]}>
              <planeGeometry args={[300, 300, 300, 300]} />
              <meshStandardMaterial 
                color="#0000000"
                emissive="#000000"
                emissiveIntensity={0.2}
        
                wireframe={true} // Enable wireframe
                wireframeLinewidth={8.5} // Optional: control line thickness
              wireframeLinecap='miter'
                metalness={0.8}
                roughness={0.4}
                depthWrite={true}
                vertexColors={true}
                fog={true}
              />
            </mesh> */}
            
            {/* Debugging sphere to visually confirm target */}
            {/* <mesh position={[TARGET_POSITION.x, TARGET_POSITION.y, TARGET_POSITION.z]}>
              <sphereGeometry args={[0.01, 16, 16]} />
              <meshBasicMaterial color="yellow" />
            </mesh> */}
            <ContactShadows
              position={[5, -0.1, 0]}
              opacity={1}
              scale={7}
              blur={2}
              far={2}
            />
            
            {/* Directional light */}
            <directionalLight
              position={[0, 3, 1]}
              intensity={1.8}
              color="#ff7e5f"
              castShadow
              shadow-mapSize-width={1024}
              shadow-mapSize-height={1024}
              shadow-camera-near={0.01}
              shadow-camera-far={5}
              shadow-camera-left={-1}
              shadow-camera-right={1}
              shadow-camera-top={1}
              shadow-camera-bottom={-1}
            />
        
            
            {/* Hemisphere light */}
            {/* {showHemisphereHelper ? (
              <HemisphereLightVisualizer
                position={hemiLightPosition}
                intensity={hemiLightIntensity}
                skyColor={hemiSkyColor}
                groundColor={hemiGroundColor}
              />
            ) : (
              <hemisphereLight 
                skyColor={hemiSkyColor}
                groundColor={hemiGroundColor}
                intensity={hemiLightIntensity}
                position={hemiLightPosition}
              />
            )} */}

            {/* Additional fill light for the statue  enhance blue color */}
            <pointLight 
              position={[0.025, 0.455, 0.38]} 
              intensity={0.6} 
              color="#ff00ff"
              distance={.7}
              decay={0.2}
              width={.9}
            />
         
            {/* Optimized directional light for car exterior illumination */}
            <directionalLight
              position={[1.5, 3.2, 2]}
              intensity={1.2}
              color="#ff7e5f"
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
              shadow-camera-near={0.01}
              shadow-camera-far={10}
              shadow-camera-left={-2}
              shadow-camera-right={2}
              shadow-camera-top={2}
              shadow-camera-bottom={-2}
              shadow-bias={-0.0001}
              shadow-normalBias={0.02}
            />

            {/* Add rim light for car edges */}
            <directionalLight
              position={[-1.5, 0.8, -2]}
              intensity={0.7}
              color="#ff9e7a"
              castShadow={false}
            />

            {/* <mesh position={[0, 10, -80]} rotation={[0, 0, 0]}>
              <planeGeometry args={[300, 50]} />
              <meshBasicMaterial 
                side={THREE.DoubleSide}
                transparent={true}
                opacity={0.6}
                color="#ff0066"
              />
            </mesh> */}

            {/* Pink point light with helper */}
            {/* {showLightHelper ? (
              <PointLightVisualizer
                position={lightPosition}
                intensity={lightIntensity}
                color="#ff00cc"
                size={0.1}
              />
            ) : (
              <pointLight
                ref={pinkLightRef}
                position={lightPosition}
                intensity={lightIntensity}
                color="#ff00cc"
                castShadow
              />
            )} */}
         <pointLight position={[0.015, 0.13, 0.51]} intensity={0.8} color="#ff00ff" />

         {/* <hemisphereLight 
              skyColor="#ff7e5f" // Warm orange/pink for sky
              groundColor="#371e57" // Deep purple for ground
              intensity={3.5}
              position={[0, 3, 0]}
            /> */}
            {/* <Sky 
              distance={850000} 
              sunPosition={[0, 0, -Math.PI/1.5]} 
              inclination={-0.7} 
              azimuth={0.25}
              turbidity={2.9}
              rayleigh={3.5}
              mieCoefficient={0.005}
              mieDirectionalG={0.95}
              moonPosition={[3, 0.5, -1]}


            /> */}
            {/* Additional pink point lights */}
            {/* <pointLight
              position={[-0.0674, 0.1888, 0.2725]}
              intensity={.01  }
              color="#ff00cc"
              castShadow
            /> */}
            {/* <pointLight
              position={[0.0126, 0.3188, 0.0075]}
       
              intensity={.1}
              color="#ff00cc"
              castShadow
            /> */}

            {/* Replace PostProcessingEffects with our custom sunset effects */}
            {/* <SunriseSunsetEffects /> */}
          </Suspense>
          
          <OrbitControls
            ref={controlsRef}
            target={[TARGET_POSITION.x, TARGET_POSITION.y, TARGET_POSITION.z]}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            autoRotate={true}
            autoRotateSpeed={.7}
            enabled={controlsEnabled}
            zoomToCursor={true}
            near={0.1}
            far={15}
            minDistance={0.1}
            maxDistance={7}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2.2}
            dampingFactor={0.1}
            enableDamping={true}
          />
        </CameraDataProvider>
      </Canvas>
      
      {/* Camera position capture button */}
      {/* <button 
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
      </button> */}
      
      {/* Camera GUI outside of Canvas - guaranteed to be visible */}
      {/* {showCameraGUI && (
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
      )} */}
      
      {/* Light position controls */}
      {showLightHelper && (
        <div style={{
          // position: 'absolute',
          // top: '300px',
          // left: '10px',
          // backgroundColor: 'rgba(0,0,0,0.7)',
          // color: '#ff00ff',
          // padding: '10px',
          // borderRadius: '5px',
          // fontFamily: 'monospace',
          // fontSize: '12px',
          // zIndex: 1000
        }}>
          <div><b>Light Position:</b> [{lightPosition[0].toFixed(4)}, {lightPosition[1].toFixed(4)}, {lightPosition[2].toFixed(4)}]</div>
          <div><b>Intensity:</b> {lightIntensity}</div>
          
          <div style={{marginTop: '10px'}}>
            <button onClick={() => setLightIntensity(Math.max(0.1, lightIntensity - 0.2))} style={{marginRight: '5px'}}>-</button>
            Intensity
            <button onClick={() => setLightIntensity(lightIntensity + 0.2)} style={{marginLeft: '5px'}}>+</button>
          </div>
          
          <div style={{marginTop: '10px'}}>
            <div>
              <button 
                onClick={() => setLightPosition([lightPosition[0] - 0.01, lightPosition[1], lightPosition[2]])} 
                style={{marginRight: '5px', width: '30px'}}
              >-</button>
              X Position
              <button 
                onClick={() => setLightPosition([lightPosition[0] + 0.01, lightPosition[1], lightPosition[2]])} 
                style={{marginLeft: '5px', width: '30px'}}
              >+</button>
            </div>
            <div style={{marginTop: '5px'}}>
              <button 
                onClick={() => setLightPosition([lightPosition[0], lightPosition[1] - 0.01, lightPosition[2]])} 
                style={{marginRight: '5px', width: '30px'}}
              >-</button>
              Y Position
              <button 
                onClick={() => setLightPosition([lightPosition[0], lightPosition[1] + 0.01, lightPosition[2]])} 
                style={{marginLeft: '5px', width: '30px'}}
              >+</button>
            </div>
            <div style={{marginTop: '5px'}}>
              <button 
                onClick={() => setLightPosition([lightPosition[0], lightPosition[1], lightPosition[2] - 0.01])} 
                style={{marginRight: '5px', width: '30px'}}
              >-</button>
              Z Position
              <button 
                onClick={() => setLightPosition([lightPosition[0], lightPosition[1], lightPosition[2] + 0.01])} 
                style={{marginLeft: '5px', width: '30px'}}
              >+</button>
            </div>
          </div>
          
          <div style={{marginTop: '10px'}}>Use L key to toggle helper visibility</div>
        </div>
      )}
      
   
                  {/* Additional fill light for the car body to enhance blue color */}
                  {/* <pointLight 
              position={[2, 1, 1]} 
              intensity={0.8} 
              color="#8ebbff"
              distance={10}
              decay={2}
            /> */}

            {/* Pink point light with helper */}
            {/* {showLightHelper ? (
              <PointLightVisualizer
                position={lightPosition}
                intensity={lightIntensity}
                color="#ff00cc"
                size={0.1}
              />
            ) : (
              <pointLight
                ref={pinkLightRef}
                position={lightPosition}
                intensity={lightIntensity}
                color="#ff00cc"
                castShadow
              />
            )} */}
  

            {/* Replace PostProcessingEffects with our custom sunset effects */}
      {/* Hemisphere light controls */}
      {showHemisphereHelper && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: '#ffffff',
          padding: '10px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '12px',
          zIndex: 1000
        }}>
          <div><b>Hemisphere Light</b></div>
          <div><b>Position:</b> [{hemiLightPosition[0].toFixed(2)}, {hemiLightPosition[1].toFixed(2)}, {hemiLightPosition[2].toFixed(2)}]</div>
          <div><b>Intensity:</b> {hemiLightIntensity.toFixed(2)}</div>
          <div><b>Sky Color:</b> <span style={{color: hemiSkyColor}}>{hemiSkyColor}</span></div>
          <div><b>Ground Color:</b> <span style={{color: hemiGroundColor}}>{hemiGroundColor}</span></div>
          
          <div style={{marginTop: '10px'}}>
            <button 
              onClick={() => setHemiLightIntensity(Math.max(0.1, hemiLightIntensity - 0.1))} 
              style={{marginRight: '5px', width: '30px'}}
            >-</button>
            Intensity
            <button 
              onClick={() => setHemiLightIntensity(hemiLightIntensity + 0.1)} 
              style={{marginLeft: '5px', width: '30px'}}
            >+</button>
          </div>
          
          <div style={{marginTop: '10px'}}><b>Position:</b></div>
          <div style={{display: 'flex', marginTop: '5px'}}>
            <div>
              <button 
                onClick={() => setHemiLightPosition([hemiLightPosition[0] - 1, hemiLightPosition[1], hemiLightPosition[2]])} 
                style={{marginRight: '5px', width: '30px'}}
              >-</button>
              X
              <button 
                onClick={() => setHemiLightPosition([hemiLightPosition[0] + 1, hemiLightPosition[1], hemiLightPosition[2]])} 
                style={{marginLeft: '5px', width: '30px'}}
              >+</button>
            </div>
            <div style={{marginLeft: '10px'}}>
              <button 
                onClick={() => setHemiLightPosition([hemiLightPosition[0], hemiLightPosition[1] - 1, hemiLightPosition[2]])} 
                style={{marginRight: '5px', width: '30px'}}
              >-</button>
              Y
              <button 
                onClick={() => setHemiLightPosition([hemiLightPosition[0], hemiLightPosition[1] + 1, hemiLightPosition[2]])} 
                style={{marginLeft: '5px', width: '30px'}}
              >+</button>
            </div>
            <div style={{marginLeft: '10px'}}>
              <button 
                onClick={() => setHemiLightPosition([hemiLightPosition[0], hemiLightPosition[1], hemiLightPosition[2] - 1])} 
                style={{marginRight: '5px', width: '30px'}}
              >-</button>
              Z
              <button 
                onClick={() => setHemiLightPosition([hemiLightPosition[0], hemiLightPosition[1], hemiLightPosition[2] + 1])} 
                style={{marginLeft: '5px', width: '30px'}}
              >+</button>
            </div>
          </div>
          
          <div style={{marginTop: '10px'}}>Use H key to toggle helper visibility</div>
        </div>
      )}
    </div>
  );
}

export default Synthwave; 
// Modified
