import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import HolographicStatueMoon from './3DVotiveStand/HolographicStatueMoon';
import ConstellationModel from "./3DVotiveStand/ConstellationModel";
import StarField from "./3DVotiveStand/StarField";
// Removed Leva import - using hardcoded camera position



import { 
  OrbitControls, 
  useGLTF, 
  Stars, 
  Environment, 
  Html, 
  useProgress,
  ContactShadows,
  Box,
  useHelper,
  Float, // Add Float import

} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { PointLightHelper } from 'three';
import AstronautCustomizerModal from './AstronautCustomizerModal';
import Flag from './Flag';
import ParticleBackground from './ParticleBackground';
import LunarSidePanel from './LunarSidePanel'; // Changed to use lunar-specific panel
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
  
  // Always call the hook, but conditionally pass the helper class
  useHelper(lightRef, showHelper ? PointLightHelper : null, 0.3);
  
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
  const { onMoonClick, isMobileView, highlightedRocket, focusedTarget, isTelescopeView } = props;
  const moonRef = useRef();
  const flagRef = useRef();
  const videoRef = useRef();
  const { scene, materials } = useGLTF('/Ochi_moon01.glb');
  const [rocketObjects, setRocketObjects] = useState([]);
  const [flagVisible, setFlagVisible] = useState(false); // Hide flag initially to prevent flash

  // Add debug logging for moon model structure and store rocket objects
  useEffect(() => {
    if (!scene) return;
    
    const rockets = [];

    scene.traverse((child) => {
      if (child.name && child.name.toLowerCase().includes('mary')) {
       
      }
      // Look for rocket objects - exact name match for 'Rocket'
      if (child.name === 'Rocket' || (child.name && child.name.toLowerCase().includes('rocket'))) {
        
        rockets.push(child);
      }
      // Look for screen object
      if (child.name && (child.name.toLowerCase().includes('screen') || child.name.toLowerCase().includes('display'))) {
       
      }
      // Look for telescope object
      if (child.name && child.name.toLowerCase().includes('telescope')) {
        console.log('Found telescope object:', child.name);
      }
    });
    setRocketObjects(rockets);
  }, [scene]);

  const [flagAnchor, setFlagAnchor] = useState(null);
  const [lightAnchor, setLightAnchor] = useState(null);
  const [lightAnchor2, setLightAnchor2] = useState(null);
  const [maryPosition, setMaryPosition] = useState(null);
  const [screenObject, setScreenObject] = useState(null);
  const tvLightRef = useRef(null);
  const [telescopeObject, setTelescopeObject] = useState(null);
  const [insideRocketLight, setInsideRocketLight] = useState(null);

  const videoTextureRef = useRef(null);

  useEffect(() => {
    if (!scene) return;
    let fAnchor = null;
    let lAnchor = null;
    let lAnchor2 = null;
    let screen = null;
    let insideRocketLightAnchor = null;
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
      if (child.name === "insideRocketLight") {
        insideRocketLightAnchor = child;
        console.log('Found insideRocketLight:', child.name, 'at position:', child.position);
      }
      if (child.name && child.name.toLowerCase().includes('mary')) {
        const worldPos = child.getWorldPosition(new THREE.Vector3());
        
        setMaryPosition(worldPos);
      }
      // Look for screen object
      if (child.name === 'screen' || child.name === 'Screen' || 
          child.name.toLowerCase().includes('screen') || 
          child.name.toLowerCase().includes('display')) {
        console.log('Found screen object:', child.name);
        screen = child;
      }
      // Look for telescope object in this traversal too
      if (child.name && child.name.toLowerCase().includes('telescope')) {
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);
        console.log('Found telescope object:', child.name, 'at local position:', child.position, 'world position:', worldPos);
        setTelescopeObject(child);
      }
    });
    setFlagAnchor(fAnchor);
    setLightAnchor(lAnchor);
    setLightAnchor2(lAnchor2);
    setScreenObject(screen);
    setInsideRocketLight(insideRocketLightAnchor);
    
    if (!screen) {
      console.log('Warning: No screen object found in the scene');
      // Log all object names to help debug
      console.log('All object names in scene:');
      scene.traverse((child) => {
        if (child.name) {
          console.log('- ', child.name);
        }
      });
    }
  }, [scene]);

  // Parent flag mesh to anchor and show it once ready
  useEffect(() => {
    if (flagAnchor && flagRef.current) {
      flagAnchor.add(flagRef.current);
      // Show flag after a short delay to ensure it's properly positioned
      setTimeout(() => {
        setFlagVisible(true);
      }, 100);
    }
  }, [flagAnchor, flagRef]);

  // Set up video texture for screen
  useEffect(() => {
    if (!screenObject || !screenObject.isMesh) return;

    // Create video element
    const video = document.createElement('video');
    video.src = '/3.mp4';
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true; // Required for autoplay
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.flipY = true;

    videoRef.current = video;

    // Create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    
    // Set texture transformation center
    videoTexture.center.set(0.5, 0.5); // Set rotation center to middle of texture
    
    // === TEXTURE ROTATION OPTIONS ===
    
    // Option 1: Simple Z-axis rotation (in radians)
    // videoTexture.rotation = -Math.PI / 2; // 90 degrees clockwise
    videoTexture.rotation = Math.PI + Math.PI / 2; // 225 degrees (180 + 45 degrees clockwise)
    // videoTexture.rotation = -Math.PI / 2; // 90 degrees counter-clockwise
    
    // Option 2: Flip the texture (simulates 180° Y-axis rotation)
    videoTexture.flipY = true; // Flip vertically
    
    // Option 3: Use repeat and offset for mirroring effect
    videoTexture.repeat.set(-1, 1); // Mirror horizontally (like Y-axis 180° rotation)
    // videoTexture.offset.set(1, 0); // Adjust offset when mirroring
    
    // Option 4: Combined transformations
    // videoTexture.rotation = -Math.PI; // Rotate 180 degrees

    
    videoTextureRef.current = videoTexture;

    // Create material with video texture
    const videoMaterial = new THREE.MeshBasicMaterial({
      map: videoTexture,
      side: THREE.DoubleSide,
      toneMapped: false
    });

    // Store original material
    const originalMaterial = screenObject.material;

    // Apply video material
    screenObject.material = videoMaterial;
    screenObject.material.needsUpdate = true;

    // Try to play video
    const playVideo = async () => {
      try {
        await video.play();
      
      } catch (err) {
       
        const handleFirstInteraction = async () => {
          try {
            await video.play();
      
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
          } catch (e) {
            console.error("Failed to play video:", e);
          }
        };
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('touchstart', handleFirstInteraction);
      }
    };

    playVideo();

    // Cleanup
    return () => {
      video.pause();
      video.src = '';
      videoTexture.dispose();
      screenObject.material = originalMaterial;
    };
  }, [screenObject]);
  
  // Apply video texture to screen and emissive properties to moon materials
  useEffect(() => {
    if (!scene) return;

    // Create video element
    const video = document.createElement('video');
    video.src = '/3.mp4'; // Or any video in your public folder
    video.crossOrigin = 'Anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    videoRef.current = video;
    
    // Flag to prevent multiple play attempts
    let videoPlayAttempted = false;
    
    // Create video texture
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBAFormat;
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    
    scene.traverse((child) => {
      // Apply video texture to screen object
      if (child.isMesh && child.name && 
          (child.name.toLowerCase().includes('screen') || 
           child.name.toLowerCase().includes('display') ||
           child.name === 'Object_3' || // Based on your GLB structure
           child.name === 'Plane')) { // Common name for screens
        

        
        // Create video material
        const videoMaterial = new THREE.MeshStandardMaterial({
          map: videoTexture,
          emissive: new THREE.Color(0.2, 0.2, 0.2),
          emissiveMap: videoTexture,
          emissiveIntensity: 0.5,
          metalness: 0,
          roughness: 0.5,
          side: THREE.DoubleSide
        });
        
        child.material = videoMaterial;
        
        // Start playing the video only once
        if (!videoPlayAttempted) {
          videoPlayAttempted = true;
          video.play().catch(err => {
            console.error('Error playing video:', err);
            // Try playing on user interaction
            document.addEventListener('click', () => {
              video.play().catch(e => console.error('Failed to play on click:', e));
            }, { once: true });
          });
        }
      }
      // Apply realistic moon material properties
      else if (child.isMesh && child.material) {
        // Skip video screen materials
        if (child.name && (child.name.toLowerCase().includes('screen') || 
            child.name.toLowerCase().includes('display'))) {
          return;
        }
        
        // Debug: Log material info
        console.log(`Mesh: ${child.name}`, {
          hasMap: !!child.material.map,
          materialType: child.material.type,
          color: child.material.color?.getHexString(),
          emissive: child.material.emissive?.getHexString()
        });
        
        // Don't clone material - modify in place to preserve texture references
        // child.material = child.material.clone(); 
        
        // Only adjust material properties, don't override textures or colors
        if (child.material.map) {
          // If there's a texture, ensure it's set up correctly
          child.material.map.colorSpace = THREE.SRGBColorSpace;
          child.material.map.needsUpdate = true;
        }
        
        // Very subtle emissive for moon-like glow
        if (!child.material.emissiveMap) {
          child.material.emissive = new THREE.Color(0x4a4a48);
          child.material.emissiveIntensity = 0.02;
        }
        
        // Adjust material properties for moon-like appearance
        if (child.material.metalness !== undefined) {
          child.material.metalness = 0.0; // Moon is not metallic
        }
        if (child.material.roughness !== undefined) {
          child.material.roughness = 0.9; // Rough but not too rough
        }
        
        // Ensure proper rendering
        child.material.needsUpdate = true;
        
        // Lower environment effects to preserve texture appearance
        if (child.material.envMapIntensity !== undefined) {
          child.material.envMapIntensity = 0.1;
        }
      }
    });
    
    // Clean up video on unmount
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current = null;
      }
    };
  }, [scene]);
  
  // // Add mobile touch helpers and selection rings for rockets
  // useEffect(() => {
  //   if (!isMobileView || rocketObjects.length === 0) return;

  //   rocketObjects.forEach((rocket) => {
  //     // Check if helpers already exist
  //     const existingHelper = rocket.getObjectByName('rocketTouchHelper');
  //     const existingRing = rocket.getObjectByName('rocketSelectionRing');
      
  //     if (!existingHelper) {
  //       // Add invisible touch helper sphere for easier selection
  //       const touchHelperGeometry = new THREE.SphereGeometry(0.6, 8, 8); // Larger for rocket
  //       const touchHelperMaterial = new THREE.MeshBasicMaterial({ 
  //         visible: false 
  //       });
  //       const touchHelper = new THREE.Mesh(touchHelperGeometry, touchHelperMaterial);
  //       touchHelper.name = 'rocketTouchHelper';
  //       touchHelper.userData.isRocket = true;
  //       touchHelper.userData.rocketObject = rocket;
  //       rocket.add(touchHelper);
  //     }
      
  //     if (!existingRing) {
  //       // Create selection ring sprite
  //       const canvas = document.createElement('canvas');
  //       canvas.width = 128;
  //       canvas.height = 128;
  //       const ctx = canvas.getContext('2d');
        
  //       // Draw a green ring
  //       ctx.strokeStyle = '#00ff00';
  //       ctx.lineWidth = 8;
  //       ctx.beginPath();
  //       ctx.arc(64, 64, 56, 0, Math.PI * 2);
  //       ctx.stroke();
        
  //       const texture = new THREE.CanvasTexture(canvas);
  //       const spriteMaterial = new THREE.SpriteMaterial({ 
  //         map: texture,
  //         transparent: true,
  //         opacity: 0.7
  //       });
  //       const selectionRing = new THREE.Sprite(spriteMaterial);
  //       selectionRing.name = 'rocketSelectionRing';
  //       selectionRing.visible = false;
  //       selectionRing.scale.set(1.5, 1.5, 1); // Larger ring for rocket
  //       selectionRing.userData.nonInteractive = true;
  //       rocket.add(selectionRing);
  //     }
  //   });
  // }, [isMobileView, rocketObjects]);

  // Update selection ring visibility and animation
  // useEffect(() => {
  //   if (!isMobileView) return;
    
  //   rocketObjects.forEach((rocket) => {
  //     const selectionRing = rocket.getObjectByName('rocketSelectionRing');
  //     if (selectionRing) {
  //       const isHighlighted = highlightedRocket && highlightedRocket.object3D === rocket;
  //       const anyObjectFocused = focusedTarget !== null;
        
  //       // Show ring only when highlighted and nothing is focused
  //       selectionRing.visible = isHighlighted && !anyObjectFocused;
  //     }
  //   });
  // }, [isMobileView, rocketObjects, highlightedRocket, focusedTarget]);

  // Add gentle rotation to the moon and update rocket selection rings
  useFrame((state, delta) => {
    if (moonRef.current) {
      // Very slow rotation on Y axis (0.03 radians per second)
      moonRef.current.rotation.y += delta * 0.03;
    }
    
    // Update video texture if needed
    if (videoTextureRef.current && videoRef.current && !videoRef.current.paused) {
      videoTextureRef.current.needsUpdate = true;
    }
    
    // Animate telescope glow
    if (telescopeObject && telescopeObject.material && telescopeObject.userData.glowAnimation) {
      const time = state.clock.getElapsedTime();
      const { baseIntensity, pulseSpeed } = telescopeObject.userData.glowAnimation;
      telescopeObject.material.emissiveIntensity = baseIntensity + Math.sin(time * pulseSpeed) * 0.2;
    }
    
    // Update TV light position
    if (tvLightRef.current && screenObject) {
      const worldPos = new THREE.Vector3();
      screenObject.getWorldPosition(worldPos);
      
      // Get the screen's bounding box to position light properly
      const box = new THREE.Box3().setFromObject(screenObject);
      const size = box.getSize(new THREE.Vector3());
      
      // Position light in front of screen center
      tvLightRef.current.position.copy(worldPos);
      
      // Get screen's world matrix to determine its orientation
      const worldMatrix = screenObject.matrixWorld;
      // Use negative Z since the screen faces the opposite direction
      const forward = new THREE.Vector3(0, 0, -1);
      forward.transformDirection(worldMatrix);
      
      // Position light in front of the screen (where viewer would be)
      // The moon radius is 2.5, so we want the light to be outside the moon surface
      const lightDistance = 3.0; // Position light outside the moon
      tvLightRef.current.position.copy(worldPos);
      tvLightRef.current.position.add(forward.multiplyScalar(lightDistance));
      
      // Update spotlight target to point back at the screen
      if (tvLightRef.current.target) {
        tvLightRef.current.target.position.copy(worldPos);
        tvLightRef.current.target.updateMatrixWorld();
      }
      
      // Log once per second to avoid spam
      if (Math.floor(state.clock.elapsedTime) % 2 === 0 && 
          Math.floor(state.clock.elapsedTime * 10) % 10 === 0) {

      }
    }
    
    // Animate rocket selection rings
    if (isMobileView && highlightedRocket && !focusedTarget) {
      const time = state.clock.getElapsedTime();
      rocketObjects.forEach((rocket) => {
        const selectionRing = rocket.getObjectByName('rocketSelectionRing');
        if (selectionRing && selectionRing.visible) {
          // Pulse animation
          const pulse = Math.sin(time * 3) * 0.3 + 0.7;
          selectionRing.material.opacity = pulse;
          const scale = 1.5 + Math.sin(time * 2) * 0.15;
          selectionRing.scale.set(scale, scale, 1);
        }
      });
    }
  });

  // Add telescope glow effect and marker
  useEffect(() => {
    if (!telescopeObject) return;

    // Add pulsing glow to telescope itself
    if (telescopeObject.isMesh && telescopeObject.material) {
      // Clone material to avoid affecting other objects
      telescopeObject.material = telescopeObject.material.clone();
      telescopeObject.material.emissive = new THREE.Color(0x0066ff);
      telescopeObject.material.emissiveIntensity = 0.3;
      
      // Store original values for animation
      telescopeObject.userData.glowAnimation = {
        baseIntensity: 0.3,
        pulseSpeed: 3
      };
    }

    // Create marker using Three.js directly
    const markerGroup = new THREE.Group();
    markerGroup.name = 'telescopeMarker';
    
    // Create gradient texture
    function createGradientTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");

      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, "#0044aa");
      gradient.addColorStop(0.5, "#0088ff");
      gradient.addColorStop(1, "#0044aa");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    // Glowing blue circle center
    const markerGeometry = new THREE.CircleGeometry(0.15, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
    markerMesh.position.z = 0.001;
    markerGroup.add(markerMesh);

    // Blue gradient ring border
    const borderGeometry = new THREE.RingGeometry(0.16, 0.2, 32);
    const borderMaterial = new THREE.MeshStandardMaterial({
      map: createGradientTexture(),
      emissive: 0x0088ff,
      emissiveIntensity: 1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
    borderMesh.position.z = 0;
    markerGroup.add(borderMesh);

    // Position and scale the marker
    markerGroup.position.set(0, 0.05, 0); // Position slightly above tiny telescope
    markerGroup.scale.set(0.02, 0.02, 0.02); // Very small scale for tiny telescope

    // Add pulsing animation and billboard behavior
    let pulseTime = 0;
    markerGroup.onBeforeRender = (renderer, scene, camera) => {
      // Billboard behavior - always face camera
      markerGroup.lookAt(camera.position);
      
      // Pulsing animation
      pulseTime += 0.05;
      const scale = 1 + Math.sin(pulseTime * 3) * 0.15;
      borderMesh.scale.set(scale, scale, scale);
      borderMaterial.emissiveIntensity = 0.8 + Math.sin(pulseTime * 3) * 0.2;
      markerMaterial.opacity = 0.6 + Math.sin(pulseTime * 3) * 0.2;
    };

    // Add invisible touch helper for easier selection on mobile
    if (isMobileView) {
      const touchHelperGeometry = new THREE.SphereGeometry(0.3, 8, 8);
      const touchHelperMaterial = new THREE.MeshBasicMaterial({ 
        visible: false 
      });
      const touchHelper = new THREE.Mesh(touchHelperGeometry, touchHelperMaterial);
      touchHelper.name = 'telescopeTouchHelper';
      touchHelper.userData.isTelescope = true;
      touchHelper.userData.telescopeObject = telescopeObject;
      telescopeObject.add(touchHelper);
    }

    // Add marker to telescope
    telescopeObject.add(markerGroup);
    console.log('Added glow and marker to telescope:', telescopeObject.name);

    // Cleanup
    return () => {
      telescopeObject.remove(markerGroup);
      markerGeometry.dispose();
      markerMaterial.dispose();
      borderGeometry.dispose();
      borderMaterial.dispose();
      if (telescopeObject.material && telescopeObject.material.emissive) {
        telescopeObject.material.emissive = new THREE.Color(0x000000);
        telescopeObject.material.emissiveIntensity = 0;
      }
    };
  }, [telescopeObject, isMobileView]);


  
  return (
    
    <group ref={moonRef} {...props} onClick={onMoonClick} dispose={null}>
      <primitive object={scene} />
      <Suspense fallback={null}>
        {flagVisible && <Flag flagRef={flagRef} />}
      </Suspense>


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
          distance={0.4}
          decay={0.3}
          castShadow={false}
          onUpdate={(self) => lightAnchor2.add(self)}
        />
      )}
      {/* Rocket interior light */}
      {insideRocketLight && (
        <pointLight
          position={[0, 0, 0]}
          color={new THREE.Color(0x5c5ed5)} // Blue-green/turquoise color
          intensity={0.8}
          distance={0.2}
          decay={0.2}
          castShadow={false}
          onUpdate={(self) => insideRocketLight.add(self)}
        />
      )}
      {/* TV screen light */}
      {screenObject && (
        <>
          {/* Main TV spot light */}
          <spotLight
            ref={tvLightRef}
            position={[0, 0.35, 0.1]}
            color={new THREE.Color(0x6495ed)} // Cornflower blue TV glow
            intensity={20.0}
            distance={20.0}
            angle={Math.PI / 3} // 60 degree cone
            penumbra={0.5} // Soft edges
            decay={1.0}
            castShadow={false}
            target-position={[0, 0, 0]} // Will be updated in useFrame
          />
          {/* Ambient point light for general glow */}
          <pointLight
            position={[0, 0.35, 0.1]}
            color={new THREE.Color(0x87ceeb)} // Lighter blue
            intensity={10.0}
            distance={15.0}
            decay={1.5}
            castShadow={false}
            onUpdate={(self) => {
              if (tvLightRef.current) {
                // Position this light at the same spot as TV light
                self.position.copy(tvLightRef.current.position);
              }
            }}
          />
        </>
      )}
         <Environment preset="night" />
      
      {/* Telescope Marker is now parented directly to telescope object via useEffect */}
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
      scale={0.2} // Further increased scale for better visibility
      depthTest={true}
      depthWrite={false}
      geometry={<planeGeometry args={[.15, .15]} />}
      distanceFactor={3} // Closer distance factor
      position={[0.0, 0.35, 0.0]} // Positioned slightly higher
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
            borderRadius: '0',
            minWidth: '120px' // Ensure minimum width
          }}>
            <span style={{
              fontFamily: 'UnifrakturMaguntia, serif', // Original gothic font with fallback
              fontSize: '16px', // Keep the pixel size that works
              color: '#ffffff',
              textShadow: '0 0 0.1em #fff, 0 0 0.2em #0ff, 0 0 0.3em #f0f',
              animation: 'pulse 1.5s infinite alternate',
              whiteSpace: 'nowrap',
              display: 'inline-block',
              fontWeight: 'normal',
              letterSpacing: '0.02em',
              padding: '0 5px' // Keep some padding for better visibility
            }}>
              {userData.username || 'Anonymous'}
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
                fontSize: '0.7rem', // Adjusted star size to match
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

// Component to wrap astronaut with Float
function FloatingAstronautWrapper({ children, enabled = true, isFocused = false }) {
  // Only apply Float to non-focused astronauts when enabled
  if (enabled && !isFocused) {
    return (
      <Float
        speed={1.5} // Animation speed, adjust to taste
        rotationIntensity={0.5} // XYZ rotation intensity, adjust to taste  
        floatIntensity={0.3} // Up/down float intensity, adjust to taste
        floatingRange={[-0.1, 0.1]} // Range of y-axis values the object will float within
      >
        {children}
      </Float>
    );
  }
  
  // For focused astronauts or when Float is disabled, render children directly
  return <>{children}</>;
}

// Floating astronaut component with user textures
function Astronauts(props) {
  const { userHelmetTextures, onAstronautClick, focusedAstronaut, highlightedAstronaut, debugMode = false, isMobileView = false, useFloatEffect = false } = props;

  // Debug mode - controlled by prop
  const DEBUG_MODE = debugMode;
  
  // Load both static and animated models
  const { scene: staticScene } = useGLTF('/Astronaut2.glb');
  const { scene: animatedScene, animations } = useGLTF('/Astronaut02.glb');
  const instancesRef = useRef();
  const [initialInstanceData, setInitialInstanceData] = useState([]);
  const [astronautComponents, setAstronautComponents] = useState([]); // For declarative rendering with Float
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
      const isHighlighted = highlightedAstronaut && highlightedAstronaut.index === index;
      
      // Update selection ring animation on mobile
      // Hide ALL rings when ANY astronaut is focused
      const anyAstronautFocused = focusedAstronaut !== null;
      if (isMobileView && isHighlighted && !anyAstronautFocused) {
        const selectionRing = instance.getObjectByName('selectionRing');
        if (selectionRing && selectionRing.material) {
          // Pulse animation for sprite
          const pulse = Math.sin(time * 3) * 0.3 + 0.7;
          selectionRing.material.opacity = pulse;
          const scale = 1 + Math.sin(time * 2) * 0.1;
          selectionRing.scale.set(scale, scale, 1);
        }
      } else if (isMobileView && anyAstronautFocused) {
        // Explicitly hide ring when any astronaut is focused
        const selectionRing = instance.getObjectByName('selectionRing');
        if (selectionRing) {
          selectionRing.visible = false;
        }
      }

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
            

        // } else {
        //     console.log("No animated model found for focused astronaut", index);
        }
      } else {
        // For non-focused astronauts:
        // Skip manual bobbing if Float component is being used
        if (!instance.userData.useFloat) {
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
        staticScene: staticAstronautScene,
        useFloat: useFloatEffect // Use the prop to determine if Float should be used
      };
      
      // Add selection ring for mobile (invisible by default)
      if (isMobileView) {
        // Create a sprite that always faces the camera
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        // Draw a green ring
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(64, 64, 56, 0, Math.PI * 2);
        ctx.stroke();
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
          map: texture,
          transparent: true,
          opacity: 0.7
        });
        const selectionRing = new THREE.Sprite(spriteMaterial);
        selectionRing.name = 'selectionRing';
        selectionRing.visible = false;
        selectionRing.scale.set(1, 1, 1);
        selectionRing.userData.nonInteractive = true;
        astronautGroup.add(selectionRing);
        
        // Add invisible touch helper sphere for easier selection
        const touchHelperGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const touchHelperMaterial = new THREE.MeshBasicMaterial({ 
          visible: false 
        });
        const touchHelper = new THREE.Mesh(touchHelperGeometry, touchHelperMaterial);
        touchHelper.name = 'touchHelper';
        astronautGroup.add(touchHelper);
      }
      
      // Add the static astronaut model to the group initially
      // Scale astronauts larger on mobile for easier selection
      const astronautScale = isMobileView ? 0.25 : 0.15; // 66% larger on mobile
      staticAstronautScene.scale.set(astronautScale, astronautScale, astronautScale);
      astronautGroup.add(staticAstronautScene);
      
      // Set the group position and rotation
      // When using Float effect, position will be handled by wrapper but keep rotation
      if (!useFloatEffect) {
        astronautGroup.position.copy(initialPosition);
        astronautGroup.rotation.copy(initialRotation);
      } else {
        // Reset position when using Float since we apply it to the wrapper
        astronautGroup.position.set(0, 0, 0);
        // Keep the rotation so astronauts face outward from the moon
        astronautGroup.rotation.copy(initialRotation);
      }
      
      // Add the group to the instancesRef
      // When useFloatEffect is false, it will be added directly to the group
      // When useFloatEffect is true, we'll still need the reference for declarative rendering
      if (!instancesRef.current) {
        instancesRef.current = new THREE.Group();
      }
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

  // Effect to handle model switching when focused and selection ring visibility
  useEffect(() => {
    if (!instancesRef.current || !animatedHelmet) return;

    instancesRef.current.children.forEach((astronautGroup) => {
      const { astronautIndex, staticScene, userData } = astronautGroup.userData;
      const isFocused = focusedAstronaut && focusedAstronaut.index === astronautIndex;
      const isHighlighted = highlightedAstronaut && highlightedAstronaut.index === astronautIndex;
      
      // Always hide ring when ANY astronaut is focused (for cleaner zoom view)
      const shouldShowRing = isHighlighted && !focusedAstronaut;
      
      // Update selection ring visibility on mobile
      let selectionRing = null;
      let touchHelper = null;
      
      if (isMobileView) {
        selectionRing = astronautGroup.getObjectByName('selectionRing');
        touchHelper = astronautGroup.getObjectByName('touchHelper');
        
        // Re-create selection ring if it was accidentally removed
        if (!selectionRing) {
          const canvas = document.createElement('canvas');
          canvas.width = 128;
          canvas.height = 128;
          const ctx = canvas.getContext('2d');
          
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(64, 64, 56, 0, Math.PI * 2);
          ctx.stroke();
          
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.7
          });
          selectionRing = new THREE.Sprite(spriteMaterial);
          selectionRing.name = 'selectionRing';
          selectionRing.visible = false;
          selectionRing.scale.set(1, 1, 1);
          selectionRing.userData.nonInteractive = true;
          astronautGroup.add(selectionRing);
        }
        
        // Re-create touch helper if it was accidentally removed
        if (!touchHelper) {
          const touchHelperGeometry = new THREE.SphereGeometry(0.4, 8, 8);
          const touchHelperMaterial = new THREE.MeshBasicMaterial({ 
            visible: false 
          });
          touchHelper = new THREE.Mesh(touchHelperGeometry, touchHelperMaterial);
          touchHelper.name = 'touchHelper';
          astronautGroup.add(touchHelper);
        }
        
        if (selectionRing) {
          // Use shouldShowRing which hides ALL rings when ANY astronaut is focused
          selectionRing.visible = shouldShowRing;
          // Animate the ring
          if (shouldShowRing) {
            selectionRing.material.opacity = 0.7 + Math.sin(Date.now() * 0.003) * 0.3;
          }
        }
      }

      // Remove current scene (but preserve selection ring and touch helper)
      const childrenToRemove = [];
      astronautGroup.children.forEach(child => {
        if (child.name !== 'selectionRing' && child.name !== 'touchHelper') {
          childrenToRemove.push(child);
        }
      });
      
      childrenToRemove.forEach(child => {
        astronautGroup.remove(child);
      });

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
        const astronautScale = isMobileView ? 0.25 : 0.15; // Match mobile scaling
        animatedScene.scale.set(astronautScale, astronautScale, astronautScale);
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
  }, [focusedAstronaut, highlightedAstronaut, animatedHelmet, isMobileView]);
  
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
    <group onClick={handleClick} {...props}>
      {/* Render astronauts with Float effect */}
      {useFloatEffect ? (
        // When Float is enabled, render astronauts declaratively
        <>
          {initialInstanceData.map((data, i) => {
            const isFocused = focusedAstronaut && focusedAstronaut.index === i;
            const astronautGroup = instancesRef.current?.children[i];
            
            if (!astronautGroup) return null;
            
            // Apply only the position to the wrapper group
            // Rotation is kept on the astronaut group itself
            return (
              <group 
                key={`astronaut-position-${i}`}
                position={[data.initialPosition.x, data.initialPosition.y, data.initialPosition.z]}
              >
                <FloatingAstronautWrapper 
                  enabled={useFloatEffect} 
                  isFocused={isFocused}
                >
                  <primitive object={astronautGroup} />
                </FloatingAstronautWrapper>
              </group>
            );
          })}
        </>
      ) : (
        // When Float is disabled, use the original approach
        <group ref={instancesRef} />
      )}
      
      {/* Point lights for each astronaut */}
      {initialInstanceData.map((data, i) => {
        // Use the initial position data directly instead of trying to access group position
        const lightPosition = [
          data.initialPosition.x,
          data.initialPosition.y + 0.3,
          data.initialPosition.z
        ];
        
        // Ethereal color options for astronaut lights
        // const lightColor = new THREE.Color(0xb19cd9); // Soft lavender purple
        // const lightColor = new THREE.Color(0x87ceeb); // Sky blue
        // const lightColor = new THREE.Color(0xdda0dd); // Plum
        // const lightColor = new THREE.Color(0xe0b0ff); // Mauve/pale violet
        // const lightColor = new THREE.Color(0xffc0cb); // Soft pink
        // const lightColor = new THREE.Color(0x9370db); // Medium purple
        const lightColor = new THREE.Color(0xc8b2db); // Soft periwinkle - blend of lavender and blue
        
    
        
        return (
          <PointLightWithHelper
            key={`light-${i}`}
            position={lightPosition}
            color={lightColor}
            intensity={focusedAstronaut && focusedAstronaut.index === i ? 0.1 : 0.2}
            distance={1.5}
            decay={3}
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

// Telescope view components
function TelescopeStars() {
  const starsRef = useRef();
  
  useFrame((state) => {
    if (starsRef.current) {
      // Rotate star field slowly
      starsRef.current.rotation.y += 0.0001;
      starsRef.current.rotation.x += 0.00005;
    }
  });
  
  // Create star positions and colors
  const starCount = 5000;
  const positions = new Float32Array(starCount * 3);
  const colors = new Float32Array(starCount * 3);
  
  for (let i = 0; i < starCount; i++) {
    const i3 = i * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);
    const r = 800 + Math.random() * 200;
    
    positions[i3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);
    
    const colorChoice = Math.random();
    if (colorChoice < 0.7) {
      colors[i3] = colors[i3 + 1] = colors[i3 + 2] = 1; // White
    } else if (colorChoice < 0.85) {
      colors[i3] = 0.8;
      colors[i3 + 1] = 0.8;
      colors[i3 + 2] = 1; // Blue
    } else {
      colors[i3] = 1;
      colors[i3 + 1] = 0.9;
      colors[i3 + 2] = 0.7; // Yellow
    }
  }
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={starCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={2}
        sizeAttenuation={true}
        vertexColors={true}
        transparent={true}
        opacity={0.9}
      />
    </points>
  );
}

function TelescopePlanets() {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      // Rotate planets slowly
      groupRef.current.children.forEach((planet, i) => {
        planet.rotation.y += 0.001 * (i + 1);
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {/* Red planet */}
      <mesh position={[100, 50, -200]}>
        <sphereGeometry args={[8, 32, 32]} />
        <meshPhongMaterial color={0xff4444} emissive={0x440000} emissiveIntensity={0.2} />
      </mesh>
      
      {/* Blue planet with ring */}
      <group position={[-150, -80, -300]}>
        <mesh>
          <sphereGeometry args={[12, 32, 32]} />
          <meshPhongMaterial color={0x4488ff} emissive={0x000044} emissiveIntensity={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 3, 0, 0]}>
          <ringGeometry args={[18, 25, 64]} />
          <meshBasicMaterial color={0x888888} side={THREE.DoubleSide} transparent opacity={0.7} />
        </mesh>
      </group>
      
      {/* Green planet */}
      <mesh position={[80, -60, -250]}>
        <sphereGeometry args={[6, 32, 32]} />
        <meshPhongMaterial color={0x44ff44} emissive={0x004400} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

// Scene lighting and camera setup
function SceneSetup({ isMobileView, isTelescopeView }) {
  const { camera } = useThree();
  
  useEffect(() => {
    // Set camera position based on screen size
    if (isMobileView) {
      // Position camera closer on mobile for better astronaut visibility
      camera.position.set(0, 0, 9);
    
    } else {
      // Default desktop position
      camera.position.set(0, 0, 8);
    
    }
    
    // Update camera matrix after position change
    camera.updateProjectionMatrix();
  }, [camera, isMobileView]);

  // Different lighting for telescope view
  if (isTelescopeView) {
    return (
      <>
        <ambientLight intensity={0.2} />
        <directionalLight position={[100, 100, 100]} intensity={0.8} color="#ffffff" />
      </>
    );
  }

  return (
    <>
      {/* Increased ambient light for better moon visibility */}
      <ambientLight intensity={0.3} />
      
      {/* Main directional light from the right side - simulates sun */}
      <directionalLight 
        position={[-10, 2, 5]} 
        intensity={1.5} 
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
      {/* <directionalLight 
        position={[-8, -2, -3]} 
        intensity={0.3} 
        color="#4a90e2" 
      /> */}
      
      {/* Very subtle fill light from below to prevent pure black shadows */}
      {/* <pointLight 
        position={[0, -8, 0]} 
        intensity={0.1} 
        color="#6b7280" 
        distance={20}
        decay={2}
      /> */}
    </>
  );
}

// Simple orbit controls for rotating around the moon
function SimpleOrbitCamera({ focusedTarget, isMobileView, onAnimationComplete, isTelescopeView, forceCompleteAnimation, setForceCompleteAnimation }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const followModeRef = useRef(false);
  const neutralPositionRef = useRef(new THREE.Vector3(0, 0, isMobileView ? 9 : 8));
  const neutralTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const animationFrameIdRef = useRef(null);
  const autoRotateRef = useRef(true);
  const initialAnimationRef = useRef(false);
  const initialAnimationStartRef = useRef(null);
  const animationPhaseRef = useRef(null); // 'orbit' | 'zoom' | 'complete' - start as null
  const userInterruptedRef = useRef(false);
  const initialPositionSetRef = useRef(false);
  
  // Add refs for smooth transition
  const transitionStartTimeRef = useRef(null);
  const transitionStartPositionRef = useRef(new THREE.Vector3());
  
  // Store camera state before telescope view
  const preTelesopeStateRef = useRef({
    position: new THREE.Vector3(),
    target: new THREE.Vector3(),
    fov: 75
  });
  
  // CAMERA CONFIGURATION
  // =====================
  // Adjust these values to change where the camera starts when entering the moon scene
  // The camera will start close to this position (looking at the rocket) and zoom out
  // 
  // Common positions to try:
  // - new THREE.Vector3(1.5, 2.6, -1.0)   // Right side of moon
  // - new THREE.Vector3(-1.5, 2.6, 1.0)   // Left side of moon  
  // - new THREE.Vector3(0, 2.7, 1.5)      // Top of moon
  // - new THREE.Vector3(2.0, 1.5, 0)      // Side of moon
  //
  // To find the correct position:
  // 1. Click on the rocket in the moon scene
  // 2. Check the console for "🚀 ROCKET CLICKED - World Position:"
  // 3. Copy those coordinates here
  const ROCKET_LANDING_POSITION = new THREE.Vector3( .05, 1.2, -0.15);
  
  // Animation timings
  const ORBIT_DURATION = 55000; 
  const ZOOM_DURATION = 4000;  // 4 seconds for the zoom out
  const ORBIT_RADIUS = 0.85;    // Radius of the orbit around the landing area
  const ORBIT_HEIGHT = 1.25;    // Height above landing position for lateral view (lower = more horizontal)

  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }
  
  function easeInOutQuintic(x) {
    return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
  }

  const targetPositionVecRef = useRef(new THREE.Vector3());
  const originalFovRef = useRef(null);

  // Effect for initial OrbitControls setup and initial animation
  useEffect(() => {
    if (controlsRef.current && !initialAnimationRef.current) {
      controlsRef.current.enablePan = true;
      controlsRef.current.minDistance = 0.3;
      controlsRef.current.maxDistance = 18;
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.1;
      controlsRef.current.autoRotate = true; // Disable during initial animation
      controlsRef.current.autoRotateSpeed = 0.1;
      controlsRef.current.enabled = false; // Disable controls during initial animation
      
      // Set neutral position based on mobile view
      const neutralZ = isMobileView ? 9 : 8;
      neutralPositionRef.current.set(0, 0, neutralZ);
      neutralTargetRef.current.copy(controlsRef.current.target);
      console.log('🎯 Setting neutral position - isMobileView:', isMobileView, 'neutralZ:', neutralZ);
      console.log('🎯 neutralPositionRef.current:', neutralPositionRef.current);
      
      // Start from a position looking at the moon's surface where the rocket would have landed
      // Use the predefined landing position
      let landingAreaPosition = ROCKET_LANDING_POSITION.clone();
      
      const scene = gl.domElement.parentElement?.__r3f?.scene;
      if (scene) {
        let foundLandingArea = false;
        
        // Debug: Log all objects with positions to help identify landing area
        console.log('=== Moon Scene Objects with Positions ===');
        const objectsWithPositions = [];
        scene.traverse((child) => {
          if (child.name && (child.isMesh || child.isObject3D)) {
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            objectsWithPositions.push({ name: child.name, position: worldPos.clone() });
            console.log(`Object: ${child.name}, Position:`, worldPos, 'Type:', child.type);
          }
        });
        console.log('=== End of Moon Scene Objects ===');
        
        scene.traverse((child) => {
          // Look for objects that might be at the landing area
          if (!foundLandingArea && child.name) {
            // Check for FlagAnchor first - likely at landing site
            if (child.name === 'FlagAnchor') {
              child.getWorldPosition(landingAreaPosition);
              console.log('🏁 Found FlagAnchor at landing area, position:', landingAreaPosition);
              foundLandingArea = true;
            }
            // Check for rocket objects
            else if (child.name === 'Rocket' || child.name.toLowerCase().includes('rocket')) {
              child.getWorldPosition(landingAreaPosition);
              console.log('🚀 Found static rocket in moon scene at position:', landingAreaPosition);
              foundLandingArea = true;
            }
            // Check for screen/TV objects
            else if (child.name.toLowerCase().includes('screen') || 
                     child.name.toLowerCase().includes('display') ||
                     child.name === 'Object_3' || 
                     child.name === 'Plane') {
              child.getWorldPosition(landingAreaPosition);
              // If screen is at center (0,0,0), look for a better reference point
              if (Math.abs(landingAreaPosition.x) < 0.1 && Math.abs(landingAreaPosition.z) < 0.1) {
                console.log('⚠️ Screen is at moon center, not using as landing reference');
                // Don't use center position
              } else {
                console.log('🎯 Found screen/TV at landing area, position:', landingAreaPosition);
                foundLandingArea = true;
              }
            }
          }
        });
        if (!foundLandingArea) {
          console.log('⚠️ No landing area objects found, using default position:', landingAreaPosition);
        }
      }
      
      // Start camera at an orbital position around the landing area
      const initialAngle = 0; // Starting angle for orbit
      const closePosition = new THREE.Vector3(
        landingAreaPosition.x + Math.cos(initialAngle) * ORBIT_RADIUS,
        landingAreaPosition.y + ORBIT_HEIGHT,
        landingAreaPosition.z + Math.sin(initialAngle) * ORBIT_RADIUS
      );
      
      camera.position.copy(closePosition);
      controlsRef.current.target.copy(landingAreaPosition);
      controlsRef.current.update();
      
      // No need to store positions anymore - interaction detection is via events only
      
      // Mark animation as started
      initialAnimationRef.current = true;
      initialAnimationStartRef.current = Date.now();
      animationPhaseRef.current = 'orbit';
      userInterruptedRef.current = false;
      initialPositionSetRef.current = true; // Add this line
      
      console.log('🎬 Starting camera animation sequence - Phase: Orbit');
      console.log('📍 Landing position:', landingAreaPosition);
      console.log('📷 Initial camera position:', closePosition);
      console.log('🎯 Animation refs set:', {
        initialAnimation: initialAnimationRef.current,
        animationPhase: animationPhaseRef.current,
        initialPositionSet: initialPositionSetRef.current
      });
    }
  }, [camera, gl, isMobileView]);
  
  // Add event listeners for user interaction detection
  useEffect(() => {
    if (!gl || !gl.domElement) return;
    
    const handleUserInteraction = (e) => {
      // Only handle clicks during the orbit phase, not during zoom
      if (initialAnimationRef.current && animationPhaseRef.current === 'orbit' && !forceCompleteAnimation) {
        console.log('🎮 User clicked during orbit animation - initiating smooth transition');
        // Set forceCompleteAnimation to trigger smooth transition in useFrame
        setForceCompleteAnimation(true);
        // Don't mark as complete yet - let the smooth transition handle that
      }
    };
    
    // Listen for click/tap events only (not pointerdown which is too sensitive)
    gl.domElement.addEventListener('click', handleUserInteraction);
    gl.domElement.addEventListener('touchend', handleUserInteraction);
    
    return () => {
      gl.domElement.removeEventListener('click', handleUserInteraction);
      gl.domElement.removeEventListener('touchend', handleUserInteraction);
    };
  }, [gl, forceCompleteAnimation, setForceCompleteAnimation]);

  // Handle telescope view camera setup
  useEffect(() => {
    if (isTelescopeView && camera && controlsRef.current) {
      // Save current camera state before entering telescope view
      preTelesopeStateRef.current.position.copy(camera.position);
      preTelesopeStateRef.current.target.copy(controlsRef.current.target);
      preTelesopeStateRef.current.fov = camera.fov;
      
      // Animate to telescope view
      const startFov = camera.fov;
      const targetFov = 30; // Zoomed in view
      const startTime = Date.now();
      const duration = 1500; // 1.5 seconds
      
      const animateToTelescope = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeInOutQuintic(progress);
        
        // Animate FOV for zoom effect
        camera.fov = startFov + (targetFov - startFov) * easeProgress;
        camera.updateProjectionMatrix();
        
        if (progress < 1) {
          requestAnimationFrame(animateToTelescope);
        } else {
          // Final telescope setup
          if (controlsRef.current) {
            controlsRef.current.enabled = true;
            controlsRef.current.enablePan = false;
            controlsRef.current.enableZoom = true;
            controlsRef.current.minDistance = 50;
            controlsRef.current.maxDistance = 200;
            controlsRef.current.autoRotate = false;
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
          }
        }
      };
      
      animateToTelescope();
    } else if (!isTelescopeView && camera && preTelesopeStateRef.current && controlsRef.current) {
      // Restore camera state when exiting telescope view
      const startTime = Date.now();
      const duration = 800; // 0.8 seconds for exit animation
      const startPos = camera.position.clone();
      const startFov = camera.fov;
      const startTarget = controlsRef.current.target.clone();
      
      const animateFromTelescope = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = easeOutCubic(progress);
        
        // Animate camera position
        camera.position.lerpVectors(startPos, preTelesopeStateRef.current.position, easeProgress);
        
        // Animate FOV
        camera.fov = startFov + (preTelesopeStateRef.current.fov - startFov) * easeProgress;
        camera.updateProjectionMatrix();
        
        // Animate controls target
        if (controlsRef.current) {
          controlsRef.current.target.lerpVectors(startTarget, preTelesopeStateRef.current.target, easeProgress);
          controlsRef.current.update();
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateFromTelescope);
        } else {
          // Restore controls settings
          if (controlsRef.current) {
            controlsRef.current.enabled = true;
            controlsRef.current.enablePan = true;
            controlsRef.current.enableZoom = true;
            controlsRef.current.minDistance = 0.3;
            controlsRef.current.maxDistance = 18;
            controlsRef.current.autoRotate = !focusedTarget;
            controlsRef.current.autoRotateSpeed = 0.1;
          }
        }
      };
      
      animateFromTelescope();
    }
  }, [isTelescopeView, camera, focusedTarget]);

  // Add useFrame to handle continuous rotation when not focused and track rocket
  // Handle force complete animation
  useEffect(() => {
    console.log('🔍 Force complete effect:', {
      forceCompleteAnimation,
      animationPhase: animationPhaseRef.current,
      initialAnimation: initialAnimationRef.current
    });
    
    // We're now handling the smooth transition in useFrame
    // This effect just logs the state change
  }, [forceCompleteAnimation]);
  
  useFrame((state) => {
    // Check if we should force complete the animation
    if (forceCompleteAnimation && animationPhaseRef.current !== 'complete') {
      // Initialize transition if not already started
      if (!transitionStartTimeRef.current) {
        console.log('🚀 Starting smooth camera transition');
        transitionStartTimeRef.current = Date.now();
        transitionStartPositionRef.current.copy(camera.position);
      }
      
      // Calculate transition progress
      const transitionDuration = 1500; // 1.5 seconds for smooth transition
      const elapsed = Date.now() - transitionStartTimeRef.current;
      const progress = Math.min(elapsed / transitionDuration, 1);
      
      // Use ease-out cubic for smooth deceleration
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      // Smoothly interpolate camera position
      camera.position.lerpVectors(
        transitionStartPositionRef.current,
        neutralPositionRef.current,
        easedProgress
      );
      
      if (controlsRef.current) {
        // Also interpolate the target
        const currentTarget = controlsRef.current.target.clone();
        controlsRef.current.target.lerpVectors(
          currentTarget,
          neutralTargetRef.current,
          easedProgress * 0.1 // Slower target interpolation for smoother motion
        );
        controlsRef.current.update();
      }
      
      // Check if transition is complete
      if (progress >= 1) {
        console.log('🚀 Smooth transition complete');
        // Ensure final position is exact
        camera.position.copy(neutralPositionRef.current);
        if (controlsRef.current) {
          controlsRef.current.target.copy(neutralTargetRef.current);
          controlsRef.current.update();
          
          // Mark animation as complete
          animationPhaseRef.current = 'complete';
          initialAnimationRef.current = false;
          controlsRef.current.enabled = true;
          controlsRef.current.autoRotate = false;
          autoRotateRef.current = false;
        }
        
        // Notify parent
        if (onAnimationComplete) {
          onAnimationComplete();
        }
        
        // Reset transition refs for potential future use
        transitionStartTimeRef.current = null;
      }
      
      return; // Skip the rest of the frame
    }
    
      // Handle telescope view mouse tracking
    if (isTelescopeView && controlsRef.current) {
      // Parallax effect based on mouse position
      const mouseX = (window.__mouseTrail?.xPx || 0) - window.innerWidth / 2;
      const mouseY = (window.__mouseTrail?.yPx || 0) - window.innerHeight / 2;
      
      // Smooth parallax movement
      const targetX = mouseX * 0.15;
      const targetY = -mouseY * 0.15;
      
      camera.position.x += (targetX - camera.position.x) * 0.1;
      camera.position.y += (targetY - camera.position.y) * 0.1;
      camera.lookAt(0, 0, 0);
      controlsRef.current.update();
      return; // Skip other camera animations when in telescope view
    }
    
    // The user interaction is now handled by event listeners only
    // This prevents false positives from animation-induced position changes
    
    // Log animation state once per second
    if (Math.floor(state.clock.elapsedTime) % 1 === 0 && 
        Math.floor(state.clock.elapsedTime * 10) % 10 === 0) {
      console.log('🎬 Animation state:', {
        initialAnimation: initialAnimationRef.current,
        animationPhase: animationPhaseRef.current,
        forceComplete: forceCompleteAnimation
      });
    }
    
    // Handle initial animation sequence
    if (initialAnimationRef.current && initialPositionSetRef.current && initialAnimationStartRef.current && controlsRef.current && !userInterruptedRef.current && animationPhaseRef.current !== 'complete') {
      const elapsed = Date.now() - initialAnimationStartRef.current;
      const landingAreaPosition = ROCKET_LANDING_POSITION.clone();
      
      if (animationPhaseRef.current === 'orbit') {
        // Phase 1: Orbit around the landing area
        const orbitProgress = Math.min(elapsed / ORBIT_DURATION, 1);
        
        if (orbitProgress < 1) {
          // Calculate orbit position
          const angle = orbitProgress * Math.PI * 2; // Full circle
          // Keep camera at a consistent low height for lateral view
          const orbitHeight = ORBIT_HEIGHT + Math.sin(orbitProgress * Math.PI) * 0.1; // Very subtle height variation
          
          const orbitPosition = new THREE.Vector3(
            landingAreaPosition.x + Math.cos(angle) * ORBIT_RADIUS,
            landingAreaPosition.y + orbitHeight,
            landingAreaPosition.z + Math.sin(angle) * ORBIT_RADIUS
          );
          
          camera.position.copy(orbitPosition);
          // Look at a point slightly above the landing position for better framing
          const lookAtPoint = landingAreaPosition.clone();
          lookAtPoint.y += 1.3; // Look slightly above ground level
          camera.lookAt(lookAtPoint);
          controlsRef.current.target.copy(lookAtPoint);
          controlsRef.current.update();
          
          // Animation is progressing
        } else {
          // Transition to zoom phase
          console.log('🎬 Transitioning to zoom phase');
          animationPhaseRef.current = 'zoom';
          initialAnimationStartRef.current = Date.now(); // Reset timer for zoom phase
        }
      } else if (animationPhaseRef.current === 'zoom') {
        // Phase 2: Zoom out to neutral position with intermediate waypoint
        const zoomProgress = Math.min(elapsed / ZOOM_DURATION, 1);
        
        if (zoomProgress < 1) {
          // Calculate current orbit position (end of orbit)
          const finalOrbitAngle = Math.PI * 2;
          const orbitPosition = new THREE.Vector3(
            landingAreaPosition.x + Math.cos(finalOrbitAngle) * ORBIT_RADIUS,
            landingAreaPosition.y + ORBIT_HEIGHT, // Keep the same low height as orbit
            landingAreaPosition.z + Math.sin(finalOrbitAngle) * ORBIT_RADIUS
          );
          
          // Create intermediate waypoint - pull back and up first
          const intermediatePosition = new THREE.Vector3();
          const finalPosition = neutralPositionRef.current;
          
          if (zoomProgress < 0.5) {
            // First half: Move away from moon and slightly up
            const firstHalfProgress = zoomProgress * 2; // 0 to 1 for first half
            const easedFirstHalf = easeOutCubic(firstHalfProgress);
            
            // Calculate direction away from moon center
            const awayFromMoon = orbitPosition.clone().normalize();
            
            // Intermediate position: back away and slightly up
            intermediatePosition.copy(orbitPosition);
            intermediatePosition.add(awayFromMoon.multiplyScalar(3 * easedFirstHalf)); // Move 3 units away
            intermediatePosition.y += 2 * easedFirstHalf; // Move 2 units up
            
            camera.position.copy(intermediatePosition);
            // Keep looking at landing area during first half
            controlsRef.current.target.copy(landingAreaPosition);
          } else {
            // Second half: Move from intermediate to final position
            const secondHalfProgress = (zoomProgress - 0.5) * 2; // 0 to 1 for second half
            const easedSecondHalf = easeInOutQuintic(secondHalfProgress);
            
            // Calculate the intermediate position at 50% progress
            const awayFromMoon = orbitPosition.clone().normalize();
            intermediatePosition.copy(orbitPosition);
            intermediatePosition.add(awayFromMoon.multiplyScalar(3));
            intermediatePosition.y += 2;
            
            // Interpolate from intermediate to final
            camera.position.lerpVectors(intermediatePosition, finalPosition, easedSecondHalf);
            // Also interpolate the target
            controlsRef.current.target.lerpVectors(landingAreaPosition, neutralTargetRef.current, easedSecondHalf);
          }
          
          controlsRef.current.update();
          
          // Animation is progressing
        } else {
          // Animation complete
          animationPhaseRef.current = 'complete';
          initialAnimationRef.current = false;
          controlsRef.current.enabled = true; // Re-enable controls
          controlsRef.current.autoRotate = false;
          autoRotateRef.current = false;
          console.log('🎬 Camera animation sequence complete');
          console.log('📷 Final camera position:', camera.position);
          console.log('📷 Neutral position ref:', neutralPositionRef.current);
          console.log('📷 Is mobile view:', isMobileView);
          
          // Notify parent that animation completed naturally
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }
      }
    }
    
    if (controlsRef.current && !focusedTarget && autoRotateRef.current && !initialAnimationRef.current) {
      controlsRef.current.update();
    }
    
    // Track rocket position when focused
    if (focusedTarget && focusedTarget.type === 'rocket' && focusedTarget.object3D && controlsRef.current) {
      // Get rocket's current world position
      const rocketWorldPos = new THREE.Vector3();
      focusedTarget.object3D.getWorldPosition(rocketWorldPos);
      
      // Update camera target to follow the rocket
      controlsRef.current.target.copy(rocketWorldPos);
      controlsRef.current.target.y += 0.1; // Slight offset to look higher on the rocket
      
      // Don't update camera position here - let OrbitControls handle it
      // This prevents the camera from being forced to look down
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
   
        
        // Since the animated model will rotate to face the camera,
        // we just need to position the camera at a good distance from the astronaut
        astronautInstance.getWorldPosition(lookAtTargetPos);
        
        // Adjust the look-at point to be slightly higher (toward the head/face area)
        lookAtTargetPos.y += 0.3; // Move target point up slightly for better framing
        
        // Position camera at a nice distance for a close-up view
        const moonCenter = new THREE.Vector3(0, 0, 0);
        const directionFromMoon = new THREE.Vector3()
          .subVectors(lookAtTargetPos, moonCenter)
          .normalize();
        
        const cameraDistance = 0.85; // Close enough for face view
        idealFinalCameraPos.copy(lookAtTargetPos)
          .add(directionFromMoon.multiplyScalar(cameraDistance));
        
 
      } else if (focusedTarget.type === 'rocket') {
        targetObject.getWorldPosition(lookAtTargetPos);
        
        // LOG THE ROCKET POSITION FOR CAMERA ANIMATION
        console.log('🚀 ROCKET CLICKED - World Position:', lookAtTargetPos.clone());
        console.log('🚀 Copy this for manual override: new THREE.Vector3(', 
          lookAtTargetPos.x + ',', lookAtTargetPos.y + ',', lookAtTargetPos.z + ')');
        
        // Save rocket position globally for debugging
        window.moonSceneRocketPosition = lookAtTargetPos.clone();
        
        // Adjust the look-at point higher for better rocket view angle
        lookAtTargetPos.y += 0.25; // Slight offset to look at rocket center
        
        // Calculate direction from moon center to rocket (outward direction)
        const moonCenter = new THREE.Vector3(0, 0, 0);
        const directionFromMoon = new THREE.Vector3()
          .subVectors(lookAtTargetPos, moonCenter)
          .normalize();
        
        // Position camera along the outward direction from the rocket
        const rocketDist = 0.7; // Distance from rocket
        idealFinalCameraPos.copy(lookAtTargetPos)
          .add(directionFromMoon.multiplyScalar(rocketDist));
        
        // Adjust camera height to be more level with the rocket (not looking down)
        // This creates a more horizontal viewing angle
        idealFinalCameraPos.y = lookAtTargetPos.y - 0.05; // Camera slightly above rocket height
        
        // Optional: Add some horizontal offset for a 3/4 view
        idealFinalCameraPos.x -= 0.01; // Shift camera to the side
        idealFinalCameraPos.z -= 0.75; // Shift camera to the side
        
      
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
          
          if (controlsRef.current) {
            // Check if we're inside the moon (camera Y is low)
            const needsAvoidance = startPositionCam.y < 2.5 && startPositionCam.length() < 3;
            
            if (needsAvoidance && progress < 0.5) {
              // First half: Move up and back to avoid going through moon
              const firstHalfProgress = progress * 2;
              const easedFirstHalf = easeOutCubic(firstHalfProgress);
              
              // Calculate intermediate position - up and slightly back
              const intermediatePos = startPositionCam.clone();
              const directionOut = startPositionCam.clone().normalize();
              intermediatePos.add(directionOut.multiplyScalar(2 * easedFirstHalf));
              intermediatePos.y = Math.max(intermediatePos.y + 2 * easedFirstHalf, 3);
              
              camera.position.copy(intermediatePos);
              // Keep looking at the start target initially
              controlsRef.current.target.lerpVectors(startTargetCam, endTargetCam, easedFirstHalf * 0.5);
            } else if (needsAvoidance) {
              // Second half: From intermediate to final
              const secondHalfProgress = (progress - 0.5) * 2;
              const easedSecondHalf = easeInOutQuintic(secondHalfProgress);
              
              // Calculate intermediate position at 50%
              const intermediatePos = startPositionCam.clone();
              const directionOut = startPositionCam.clone().normalize();
              intermediatePos.add(directionOut.multiplyScalar(2));
              intermediatePos.y = Math.max(intermediatePos.y + 2, 3);
              
              camera.position.lerpVectors(intermediatePos, endPositionCam, easedSecondHalf);
              controlsRef.current.target.lerpVectors(startTargetCam, endTargetCam, 0.5 + easedSecondHalf * 0.5);
            } else {
              // Normal direct interpolation if not inside moon
              const easeProgress = easeOutCubic(progress);
              controlsRef.current.target.lerpVectors(startTargetCam, endTargetCam, easeProgress);
              camera.position.lerpVectors(startPositionCam, endPositionCam, easeProgress);
            }
            
            controlsRef.current.update();
          }
          
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
   
    const inspectNode = (node, depth = 0) => {
      const indent = ' '.repeat(depth * 2);
      const type = node.type || (node.isMesh ? 'Mesh' : (node.isGroup ? 'Group' : 'Object3D'));

      
      if (node.isMesh) {
        
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => inspectNode(child, depth + 1));
      }
    };

  }, [scene]);
  return null; 
}



function SceneManager({ userHelmetTextures, focusedTarget, highlightedAstronaut, highlightedRocket, onAstronautClick, onSceneObjectClick, onReady, isConstellationsVisible, is80sMode, isMobileView, debugMode = false, onAnimationComplete, isTelescopeView, forceCompleteAnimation, setForceCompleteAnimation }) {
  const handleMoonOrRocketClick = (event) => {
    console.log('🌙 Moon/Rocket clicked - stopping propagation');
    event.stopPropagation(); // Stop event from bubbling to canvas click handler
    let clickedObjectName = event.object.name;
    let targetObject = event.object;

    // Check if it's a rocket touch helper
    if (event.object.userData?.isRocket) {
      targetObject = event.object.userData.rocketObject;
      clickedObjectName = targetObject.name;
    } else {
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
    }
    


    if (clickedObjectName && (clickedObjectName === 'Rocket' || clickedObjectName.toLowerCase().includes('rocket'))) {

      onSceneObjectClick({ type: 'rocket', object3D: targetObject });
    } else if (event.object.userData?.isTelescope || (clickedObjectName && clickedObjectName.toLowerCase().includes('telescope'))) {
      // Handle telescope click
      const telescopeTarget = event.object.userData?.telescopeObject || targetObject;
      console.log('Telescope clicked:', telescopeTarget);
      onSceneObjectClick({ type: 'telescope', object3D: telescopeTarget });
    } else {
      // Clicked on Moon surface or other non-specific part

      onSceneObjectClick(null); // Signal general deselect
    }
  };

  
  
  // Render telescope view if active
  if (isTelescopeView) {
    return (
      <>
        <SceneSetup isMobileView={isMobileView} isTelescopeView={isTelescopeView} />
        <TelescopeStars />
        <TelescopePlanets />
      </>
    );
  }

  return (
    <>
      <SceneSetup isMobileView={isMobileView} isTelescopeView={isTelescopeView} />
      <Moon 
        position={[0, 0, 0]} 
        scale={MOON_RADIUS} 
        onMoonClick={handleMoonOrRocketClick} 
        isMobileView={isMobileView}
        highlightedRocket={highlightedRocket}
        focusedTarget={focusedTarget}
        isTelescopeView={isTelescopeView}
      />
      
      
      <Astronauts 
        userHelmetTextures={userHelmetTextures} 
        onAstronautClick={onAstronautClick}
        focusedAstronaut={focusedTarget?.type === 'astronaut' ? focusedTarget : null}
        highlightedAstronaut={highlightedAstronaut}
        debugMode={debugMode}
        isMobileView={isMobileView}
        useFloatEffect={false} // Disable Float effect - use manual animation
      />
      
      
      <Suspense fallback={null}>
        <EffectComposer
          multisampling={0}
          renderPriority={1}
          stencilBuffer={false}
          disableNormalPass
          depthBuffer={true}
          autoClear={true}
        >
          <Bloom 
            intensity={0.3} 
            luminanceThreshold={0.9} 
            luminanceSmoothing={0.9} 
            kernelSize={2}
          />
          <Vignette 
            opacity={0.3} 
            darkness={0.8} 
          />
        </EffectComposer>
      </Suspense>
      <SimpleOrbitCamera focusedTarget={focusedTarget} isMobileView={isMobileView} onAnimationComplete={onAnimationComplete} forceCompleteAnimation={forceCompleteAnimation} setForceCompleteAnimation={setForceCompleteAnimation} />
      <ReportReady onReady={onReady} /> {/* Call onReady when this part of the scene is ready */}
    </>
  );
}

export default function LunarLanding({userHelmetTextures, currentUser, onSceneReady}) {
  const [focusedTarget, setFocusedTarget] = useState(null);
  const [highlightedAstronaut, setHighlightedAstronaut] = useState(null); // For mobile two-stage selection
  const [highlightedRocket, setHighlightedRocket] = useState(null); // For mobile two-stage rocket selection
  const [showMobileHint, setShowMobileHint] = useState(false); // Don't show hint initially
  const [forceCompleteAnimation, setForceCompleteAnimation] = useState(false); // Force camera animation to complete
  const focusedTargetRef = useRef(null); // Keep a ref to restore after context loss
  const sceneLoadTimeRef = useRef(Date.now()); // Track when scene loaded
  
  // Debug initial state
  useEffect(() => {
    console.log('🚀 LunarLanding mounted with initial showMobileHint:', showMobileHint);
    sceneLoadTimeRef.current = Date.now();
  }, []);
  
  // Debug forceCompleteAnimation changes
  useEffect(() => {
    console.log('🔄 forceCompleteAnimation changed to:', forceCompleteAnimation);
  }, [forceCompleteAnimation]);
  
  // Keep ref in sync with state
  useEffect(() => {
    focusedTargetRef.current = focusedTarget;
  }, [focusedTarget]);
  
  // Debug: Track focusedTarget changes
  useEffect(() => {
    
  }, [focusedTarget]);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const [monsterMode, setMonsterMode] = useState(false);
  const [rocketModelVisible, setRocketModelVisible] = useState(false);
  const [isConstellationsVisible, setIsConstellationsVisible] = useState(false);
  const [debugMode, setDebugMode] = useState(false); // Set to true to show light helpers
  const [isCameraAnimationComplete, setIsCameraAnimationComplete] = useState(false); // Track camera animation state
  const [isTelescopeView, setIsTelescopeView] = useState(false); // Track telescope view state
  const [hasInteractedPostAnimation, setHasInteractedPostAnimation] = useState(false); // Track if user has clicked after animation

  // Add mobile view detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = typeof window !== "undefined" && window.innerWidth <= 576;
      console.log('📱 Mobile detection:', { 
        innerWidth: window.innerWidth, 
        isMobile: mobile,
        userAgent: navigator.userAgent 
      });
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
    setIsConstellationsVisible(prev => {
      const newState = !prev;
      console.log("🌟 LunarLanding: Toggling constellation visibility from", prev, "to", newState);
      return newState;
    });
  }, []);

  const handleAstronautClick = (index, astronautObject, userData) => {
  
    
    // If camera animation is not complete and user clicks an astronaut, complete the animation first
    if (!isCameraAnimationComplete) {
      console.log('📸 User clicked astronaut during intro animation - completing animation', { isMobileView });
      // Force complete the camera animation
      setForceCompleteAnimation(true);
      // Don't process the click further - let them click again after animation completes
      return;
    }
    
    // Track that user has interacted after animation
    if (isCameraAnimationComplete && isMobileView && !hasInteractedPostAnimation) {
      setHasInteractedPostAnimation(true);
      // Don't show hint on first interaction
    } else if (isCameraAnimationComplete && isMobileView && hasInteractedPostAnimation && !showMobileHint) {
      // Second interaction - now show the hint
      setShowMobileHint(true);
    }
    
    if (index === null) { // Direct deselect signal
    
      setFocusedTarget(null);
      setHighlightedAstronaut(null);
      return;
    }
    
    const newTarget = { type: 'astronaut', index, object3D: astronautObject, userData };
    
    // Mobile two-stage selection
    if (isMobileView) {
      // If this astronaut is already highlighted, zoom in (second tap)
      if (highlightedAstronaut && highlightedAstronaut.index === index) {
       
        setFocusedTarget(newTarget);
        setHighlightedAstronaut(null); // Clear highlight when zooming
        return;
      }
      
      // First tap - just highlight
    
      setHighlightedAstronaut(newTarget);
      // Clear any existing focus
      if (focusedTarget) {
        setFocusedTarget(null);
      }
      return;
    }
    
    // Desktop behavior - immediate zoom
    // Check if clicking the same astronaut that's already focused
    if (focusedTarget && focusedTarget.type === 'astronaut' && focusedTarget.index === index) {
     
      setFocusedTarget(null);
      return;
    }

   
    setFocusedTarget(newTarget);
  };

  const handleSceneObjectClick = (targetInfo) => {
    console.log('🔍 handleSceneObjectClick called:', {
      isCameraAnimationComplete,
      isMobileView,
      hasInteractedPostAnimation,
      showMobileHint,
      targetInfo
    });
    
    // If camera animation is not complete and user clicks anywhere, complete the animation first
    if (!isCameraAnimationComplete) {
      console.log('📸 User clicked during intro animation - completing animation', { isMobileView });
      // Force complete the camera animation
      console.log('🎯 Setting forceCompleteAnimation to true');
      setForceCompleteAnimation(true);
      // Don't process the click further - let them click again after animation completes
      return;
    }
    
    // Track that user has interacted after animation
    if (isCameraAnimationComplete && isMobileView && !hasInteractedPostAnimation) {
      console.log('📱 First interaction after animation complete');
      setHasInteractedPostAnimation(true);
      // Don't show hint here - wait for second interaction
      // This ensures user sees the full scene first
    } else if (isCameraAnimationComplete && isMobileView && hasInteractedPostAnimation && !showMobileHint) {
      // Second interaction - now show the hint
      console.log('📱 Second interaction - showing hint');
      setShowMobileHint(true);
    }
    
    if (targetInfo === null) {
      setFocusedTarget(null);
      setHighlightedRocket(null);
    } else if (targetInfo.type === 'rocket') {
      // Mobile two-stage selection for rocket
      if (isMobileView) {
        // If this rocket is already highlighted, zoom in (second tap)
        if (highlightedRocket && highlightedRocket.object3D === targetInfo.object3D) {
        
          setFocusedTarget(targetInfo);
          setHighlightedRocket(null); // Clear highlight when zooming
          return;
        }
        
        // First tap - just highlight
      
        setHighlightedRocket(targetInfo);
        // Clear any existing focus
        if (focusedTarget) {
          setFocusedTarget(null);
        }
        return;
      }
      
      // Desktop behavior - immediate zoom
      if (
        focusedTarget &&
        focusedTarget.type === 'rocket' &&
        focusedTarget.object3D === targetInfo.object3D
      ) {
        setFocusedTarget(null);
      } else {
        setFocusedTarget(targetInfo);
      }
    } else if (targetInfo.type === 'telescope') {
      console.log('Telescope object clicked, entering telescope view');
      setIsTelescopeView(true);
      setFocusedTarget(null); // Clear any existing focus
      setHighlightedAstronaut(null);
      setHighlightedRocket(null);
    }
  };

  const handleCanvasClick = (event) => {
    console.log('🎯 Canvas clicked:', {
      isCameraAnimationComplete,
      isMobileView,
      hasInteractedPostAnimation,
      eventTarget: event.target,
      eventCurrentTarget: event.currentTarget
    });
    
    // During intro animation, any click should complete it
    if (!isCameraAnimationComplete) {
      console.log('📸 Canvas clicked during intro animation - completing animation', { isMobileView });
      console.log('🎯 Setting forceCompleteAnimation to true from canvas click');
      setForceCompleteAnimation(true);
      return;
    }
    
    // Only clear focus if clicking directly on the canvas
    if (event.target === event.currentTarget) {
    
      setFocusedTarget(null);
      setHighlightedAstronaut(null);
      setHighlightedRocket(null);
    }
  };

  const handleSaveCustomizations = useCallback((customizations) => {

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
        camera={{ fov: 50, position: [0, 0, isMobileView ? 3 : 8], near: 0.1, far: 1000 }}
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
           
            // Restore the focused state after a brief delay to let Three.js reinitialize
            setTimeout(() => {
              if (focusedTargetRef.current) {
               
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
        <color attach="background" args={['#000010']} />
        <fog attach="fog" args={['#000020', 15, 60]} />
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
        <Suspense fallback={null}>
          {/* <ParticleBackground /> */}
          <SceneManager
            userHelmetTextures={userHelmetTextures}
            focusedTarget={focusedTarget}
            highlightedAstronaut={highlightedAstronaut}
            highlightedRocket={highlightedRocket}
            onAstronautClick={handleAstronautClick}
            onSceneObjectClick={handleSceneObjectClick}
            onReady={() => {
              if (typeof onSceneReady === 'function') {
                onSceneReady();
              }
            }}
            isConstellationsVisible={isConstellationsVisible}
            is80sMode={is80sMode}
            isMobileView={isMobileView}
            debugMode={debugMode}
            forceCompleteAnimation={forceCompleteAnimation}
            setForceCompleteAnimation={setForceCompleteAnimation}
            onAnimationComplete={() => {
              const timeSinceLoad = Date.now() - sceneLoadTimeRef.current;
              console.log('📸 Camera animation complete:', {
                isMobileView,
                forceCompleteAnimation,
                hasInteractedPostAnimation,
                showMobileHint,
                timeSinceLoad
              });
              setIsCameraAnimationComplete(true);
              
              // Only show hint for natural completion if enough time has passed
              // This prevents the hint from showing if animation completes too quickly (emulator issue)
              const MIN_ANIMATION_TIME = 5000; // At least 5 seconds should pass
              
              if (isMobileView && !forceCompleteAnimation && timeSinceLoad > MIN_ANIMATION_TIME && !hasInteractedPostAnimation) {
                console.log('🎬 Natural animation completion after sufficient time - will show hint in 1s');
                setTimeout(() => {
                  // Double check that user hasn't interacted before showing
                  if (!hasInteractedPostAnimation) {
                    console.log('💡 Setting showMobileHint to true (natural completion)');
                    setShowMobileHint(true);
                  }
                }, 1000); // Show hint 1 second after animation completes
              } else if (isMobileView && !forceCompleteAnimation) {
                console.log('⚠️ Animation completed too quickly or user already interacted, not showing hint automatically');
              }
            }}
            isTelescopeView={isTelescopeView}
          />
        </Suspense>
      </Canvas>
      </div>
      
      {/* Telescope view overlay and exit button */}
      {isTelescopeView && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              opacity: 1,
              background: 'radial-gradient(circle at center, transparent 0%, transparent 38%, transparent 38.5%, black 39%, black 100%)',
              zIndex: 10,
            }}
          />
          <button
            onClick={() => {
              console.log('Exiting telescope view');
              setIsTelescopeView(false);
            }}
            style={{
              position: 'fixed',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid white',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '5px',
              fontSize: '16px',
              transition: 'all 0.3s',
              zIndex: 20,
              backdropFilter: 'blur(10px)',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            Exit Telescope View
          </button>
        </>
      )}
      {/* Add SidePanel/MobileSidePanel - always render but hide until camera animation completes or in telescope view */}
      <div style={{ 
        opacity: isCameraAnimationComplete && !isTelescopeView ? 1 : 0,
        pointerEvents: isCameraAnimationComplete && !isTelescopeView ? 'auto' : 'none',
        transition: 'opacity 0.5s ease-in-out'
      }}>
        {isMobileView ? (
          <MobileSidePanel
            onButtonClick={() => {}}
            is80sMode={is80sMode}
            toggle80sMode={toggle80sMode}
            monsterMode={monsterMode}
            toggleMonsterMode={toggleMonsterMode}
            rocketModelVisible={rocketModelVisible}
            toggleRocketModel={toggleRocketModel}
            toggleConstellationVisibility={toggleConstellationVisibility}
            isConstellationsVisible={isConstellationsVisible}
          />
        ) : (
          <LunarSidePanel // Changed to use lunar-specific panel
            onButtonClick={() => {}}
            is80sMode={is80sMode}
            toggle80sMode={toggle80sMode}
            monsterMode={monsterMode}
            toggleMonsterMode={toggleMonsterMode}
            rocketModelVisible={rocketModelVisible}
            toggleRocketModel={toggleRocketModel}
            toggleConstellationVisibility={toggleConstellationVisibility}
            isConstellationsVisible={isConstellationsVisible}
          />
        )}
      </div>
      {/* {isCameraAnimationComplete && (
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
      )} */}
      
      {/* <AstronautCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => {
      
          setIsCustomizerOpen(false);
        }}
        onSave={handleSaveCustomizations}
        defaultProfileImage={currentUser?.profileImage}
      />
       */}
      {/* Mobile hint overlay - only show after camera animation */}
      {isMobileView && showMobileHint && isCameraAnimationComplete && (
        <div
          style={{
            position: 'fixed',
            bottom: '120px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '20px',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            textAlign: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            animation: 'fadeInUp 0.5s ease-out',
            cursor: 'pointer',
          }}
          onClick={() => setShowMobileHint(false)}
        >
          <button
            style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowMobileHint(false);
            }}
          >
            ×
          </button>
          <div style={{ marginBottom: '4px' }}>👆 Tap astronaut or rocket to select</div>
          <div>👆👆 Tap again to zoom</div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
      `}</style>
    </div>
  );
}

useGLTF.preload('/Ochi_moon01.glb');
useGLTF.preload('/Astronaut2.glb');
useGLTF.preload('/Astronaut02.glb');
