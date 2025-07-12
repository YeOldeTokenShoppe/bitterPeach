import React from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
// import EtherealShaderFullscreen from './EtherealShaderFullscreen';
import DarkClouds from '../3DVotiveStand/Clouds';
import SafeClouds from './SafeClouds';
import PostProcessingEffects from '../3DVotiveStand/PostProcessingEffects';
// import VolumetricLight from './VolumetricLight';
// import SimpleVolumetricLight from './SimpleVolumetricLight';
import EnhancedVolumetricLight from './EnhancedVolumetricLight';
import SkySphere from './SkySphere';
import SafeVolumetricLight from './SafeVolumetricLight';
import SpiralDollarBills from './SpiralDollarBills';

// Madonna Model Component
const MadonnaModel = ({ position = [0, -1, 1], scale = 1, goldCoinRef }) => {
  const { scene, animations } = useGLTF('/madonna-pose1.glb');
  const ourLadyRef = React.useRef();
  const { actions } = useAnimations(animations, ourLadyRef);
  // Animation state removed - was unused
  
  
  // Ensure all materials are properly configured
  React.useEffect(() => {
    // Find the OurLady object
    const ourLadyObject = scene.getObjectByName('OurLady');
    if (ourLadyObject) {
      ourLadyRef.current = ourLadyObject;
      console.log('Found OurLady object, setting as animation target');
    }
    
    // Find the GoldCoin object - look for the actual mesh
    let goldCoinMesh = scene.getObjectByName('GoldCoinBlank_GoldCoinBlank_0');
    if (!goldCoinMesh) {
      // If not found, try to find it through the hierarchy
      const goldCoinContainer = scene.getObjectByName('GoldCoin');
      if (goldCoinContainer) {
        goldCoinContainer.traverse((child) => {
          if (child.isMesh && !goldCoinMesh) {
            goldCoinMesh = child;
          }
        });
      }
    }
    
    if (goldCoinMesh && goldCoinRef) {
      goldCoinRef.current = goldCoinMesh;
      console.log('Found GoldCoin mesh for rotation:', goldCoinMesh.name);
    }
    
    // First log all objects in the scene with hierarchy
    console.log('Scene structure:');
    const logHierarchy = (obj, indent = '') => {
      if (obj.name || obj.type !== 'Object3D') {
        console.log(`${indent}${obj.type}: ${obj.name || 'unnamed'}`);
        
        // Look for Individual or clothing objects
        if (obj.name && (obj.name.toLowerCase().includes('individual') || 
                        obj.name.toLowerCase().includes('clothing') ||
                        obj.name === 'Plane' || 
                        obj.name === 'Plane.001')) {
          console.log(`${indent}  ^ Important object found!`);
        }
      }
      
      obj.children.forEach(child => {
        logHierarchy(child, indent + '  ');
      });
    };
    
    logHierarchy(scene);
    
    scene.traverse((child) => {
      if (child.isMesh) {
        // Hide collision mesh
        if (child.name === 'collision') {
          child.visible = false;
          return;
        }
        
        // Make sure other meshes are visible
        child.visible = true;
        
        // Make the body semi-transparent to see clothing underneath
        if (child.name === 'Madonnina') {
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(mat => {
              mat.transparent = true;
              mat.opacity = 0.3;
            });
            console.log('Made Madonnina semi-transparent');
          }
        }
        
        // Check for morph targets
        if (child.morphTargetInfluences && child.morphTargetInfluences.length > 0) {
          console.log(`Morph targets found on ${child.name}:`, child.morphTargetDictionary);
        }
        
        // Enable skinning if the mesh has a skeleton
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
          console.log(`Skinned mesh found: ${child.name}, skeleton: ${child.skeleton ? 'yes' : 'no'}`);
          
          // Log skeleton root bone for debugging
          if (child.skeleton && child.skeleton.bones.length > 0) {
            console.log(`  - Root bone: ${child.skeleton.bones[0].name}`);
            console.log(`  - Total bones: ${child.skeleton.bones.length}`);
          }
        }
        
        // Handle materials - some might be arrays
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            mat.transparent = false;
            mat.opacity = 1;

            mat.side = THREE.DoubleSide; // Show both sides to ensure clothing renders
            // Ensure metalness and roughness are set
            if (mat.metalness !== undefined) mat.metalness = 0.1;
            if (mat.roughness !== undefined) mat.roughness = 0.8;
          });
        }
        
      }
    });
    
    // Log available animations with more details
    if (animations && animations.length > 0) {
      console.log('Available animations:');
      animations.forEach(anim => {
        console.log(`- ${anim.name}: ${anim.duration}s, ${anim.tracks.length} tracks`);
        // Check first few track names
        const sampleTracks = anim.tracks.slice(0, 3).map(t => t.name);
        console.log(`  Sample tracks: ${sampleTracks.join(', ')}`);
      });
    }
    
    // Set the Action animation
    if (actions) {
      console.log('Available actions:', Object.keys(actions));
      
      if (actions['Action.001']) {
        const action = actions['Action.001'];
        action.reset();
        action.play();
        action.setLoop(THREE.LoopRepeat);
        
        // Log animation details
        const clip = action.getClip();
        console.log('Action.001 details:', {
          duration: clip.duration,
          tracks: clip.tracks.length,
          trackNames: clip.tracks.map(t => t.name).slice(0, 10) // First 10 track names
        });
        
        // Log more details about what's being animated
        console.log('Sample track details:', clip.tracks[0]);
        
        // Check if any tracks target the clothing group or Plane meshes
        const clothingTracks = clip.tracks.filter(track => 
          track.name.toLowerCase().includes('clothing') || 
          track.name.toLowerCase().includes('individual') ||
          track.name.includes('Plane') ||
          track.name.includes('8001') ||  // These might be the clothing meshes
          track.name.includes('9001')
        );
        console.log('Clothing/Plane-related tracks:', clothingTracks.length);
        if (clothingTracks.length > 0) {
          console.log('First few clothing tracks:', clothingTracks.slice(0, 5).map(t => t.name));
        }
        
        // Try different time scales to make animation more visible
        action.timeScale = 2.0; // Play at 2x speed
        
        // Also ensure the action has proper weight
        action.setEffectiveWeight(1.0);
        action.setEffectiveTimeScale(1.0);
        
        // Set up an interval to log animation progress
        // const interval = setInterval(() => {
        //   if (action.isRunning()) {
        //     console.log('Animation time:', action.time.toFixed(2), '/', clip.duration.toFixed(2));
        //     setAnimationTime(action.time);
        //   }
        // }, 1000);
        
        // console.log('Playing Action.001 animation');
        
        // return () => clearInterval(interval);
      } else {
        console.log('Action.001 not found in actions');
      }
    }
  }, [scene, actions, animations]);
  
  return (
    <primitive 
      object={scene} 
      position={position} 
      scale={scale}
      rotation={[0, 0, 0]}
    />
  );
};

// Preload the model
useGLTF.preload('/madonna-pose1.glb');

const EtherealClouds = () => {
  const goldCoinRef = React.useRef();
  const cloudsRef = React.useRef();
  
  
  // Rotate the gold coin around its own axis
  useFrame(() => {
    if (goldCoinRef.current) {
      // Rotate around its local Y axis
      goldCoinRef.current.rotateZ(0.01);
    }
  });
  
  
  return (
    <>
      {/* Sky sphere background */}
      <SkySphere />
      
      {/* Soft ambient lighting */}
      {/* <ambientLight intensity={0.8} color="#ffffff" /> */}
      
      {/* Bright sun light from above - positioned high and pointing down */}
      {/* <directionalLight 
        position={[0, 100, 10]} 
        intensity={3.0} 
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        target-position={[0, -10, 0]}
      /> */}
      
      {/* Additional lights for better model visibility */}
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1.2} 
        castShadow
      />
      <directionalLight 
        position={[-5, 5, 5]} 
        intensity={0.8} 
        color="#ffffff"
      />
      
      {/* Front light to ensure clothing details are visible */}
      <directionalLight 
        position={[0, 5, 10]} 
        intensity={1.0} 
        color="#ffffff"
      />
      {/* Safe clouds for atmosphere */}
      {/* <SafeClouds /> */}
      <DarkClouds />
      {/* Post-processing effects without god rays */}
      <PostProcessingEffects />
      
      {/* Safe volumetric light rays */}
      {/* <SafeVolumetricLight 
        position={[0, 120, 20]} 
        target={[3, -30, 0]}
        color="#ffffee"
        intensity={2.0}
      /> */}
      <EnhancedVolumetricLight 
        position={[0, 120, 20]} 
        target={[3, -30, 0]}
        color="#ffffee"
        intensity={2.0}
      />
      {/* Central god ray - pure divine light */}
      {/* <SpotLight
        depthBuffer={depthBuffer}
        position={[0, 100, -10]}
        angle={0.25}
        attenuation={0.5}
        anglePower={3}
        intensity={12}
        distance={200}
        color="#ffffff"
        opacity={0.95}
        volumetric
        penumbra={0.05}
        decay={0.8}
        target-position={[0, -20, -30]}
      /> */}
      
      {/* Secondary god rays for additional atmosphere */}
      {/* <SpotLight
        depthBuffer={depthBuffer}
        position={[-5, 55, 5]}
        angle={0.2}
        attenuation={2}
        anglePower={2}
        intensity={5}
        distance={120}
        color="#e6f2ff"
        opacity={0.6}
        volumetric
        penumbra={0.2}
        decay={1.5}
        target-position={[-5, -20, -15]}
      /> */}
      
      {/* <SpotLight
        depthBuffer={depthBuffer}
        position={[5, 55, 5]}
        angle={0.2}
        attenuation={2}
        anglePower={2}
        intensity={5}
        distance={120}
        color="#f0f8ff"
        opacity={0.6}
        volumetric
        penumbra={0.2}
        decay={1.5}
        target-position={[5, -20, -15]}
      /> */}
      
      {/* Sky with classical blue gradient */}
      {/* <Sky 
        distance={450000}
        sunPosition={[0, 100, 0]}
        inclination={0.5}
        azimuth={0.25}
        rayleigh={2}
        turbidity={1}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      /> */}
      
      {/* Fullscreen ethereal shader background - positioned far back */}
      {/* <EtherealShaderFullscreen /> */}
      
      {/* Madonna Model in center */}
      <MadonnaModel position={[3, -14, -5]} scale={20} goldCoinRef={goldCoinRef} />
      
      {/* Spiraling Dollar Bills */}
      <SpiralDollarBills 
        count={40} 
        radius={30} 
        height={170} 
        speed={3}
        startY={120}
        endY={-50}
      />
      
      {/* Cloud elements for atmosphere */}
      {/* <Cloud
        position={[-15, 5, -20]}
        speed={0.4}
        opacity={0.7}
        color="#ffffff"
        volumetric
        bounds={[20, 15, 10]}
      />
      <Cloud
        position={[15, 8, -25]}
        speed={0.3}
        opacity={0.6}
        color="#f0f8ff"
        volumetric
        bounds={[25, 20, 12]}
      /> */}

      
      {/* Soft atmospheric fog to enhance god rays */}
      {/* <fog attach="fog" color="#e8e8e8" near={20} far={320} /> */}
    </>
  );
};

export default EtherealClouds;