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
import AnamorphicMadonna from './AnamorphicMadonna';
import SimpleGlitchTint from '../3DVotiveStand/SimpleGlitchTint';

// Helper function to get full object path
const getObjectPath = (obj) => {
  const path = [];
  let current = obj;
  while (current) {
    path.unshift(current.name || current.type);
    current = current.parent;
  }
  return path.join(' > ');
};

// Madonna Model Component
const MadonnaModel = ({ position = [0, -1, 1], scale = 1, goldCoinRef }) => {
  const { scene, animations } = useGLTF('/madonnina-clothing2.glb');
  const ourLadyRef = React.useRef();
  const { actions, mixer } = useAnimations(animations, ourLadyRef);
  const clothMeshRefs = React.useRef([]);
  const capeMeshRefs = React.useRef([]);
  const animationTime = React.useRef(3); // Start at frame 90 (3 seconds at 30fps)
  const textingAction = React.useRef(null);
  
  
  // Ensure all materials are properly configured
  React.useEffect(() => {
    // Find the OurLady object
    const ourLadyObject = scene.getObjectByName('OurLady');
    if (ourLadyObject) {
      ourLadyRef.current = ourLadyObject;
      console.log('Found OurLady object, setting as animation target');
    }
    
    // Find the Madonnina object for Body_O.001 animation
    const madonninaObject = scene.getObjectByName('Madonnina');
    if (madonninaObject) {
      console.log('Found Madonnina object for Body_O.001 animation');
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
    
    // Log scene structure to find all objects
    console.log('Scene structure:');
    const logHierarchy = (obj, indent = '') => {
      if (obj.name || obj.type !== 'Object3D') {
        let info = `${indent}${obj.type}: ${obj.name || 'unnamed'}`;
        
        // Add extra info for meshes
        if (obj.isMesh || obj.isSkinnedMesh) {
          if (obj.morphTargetInfluences && obj.morphTargetInfluences.length > 0) {
            info += ` [${obj.morphTargetInfluences.length} morph targets]`;
          }
          if (obj.isSkinnedMesh) {
            info += ' [skinned]';
          }
        }
        
        console.log(info);
        
        // Look for important objects
        if (obj.name && (obj.name.toLowerCase().includes('madonnina') ||
                        obj.name.toLowerCase().includes('individual') || 
                        obj.name.toLowerCase().includes('clothing') ||
                        obj.name.toLowerCase().includes('legacy') ||
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
        // if (child.name === 'OurLady') {
        //   if (child.material) {
        //     const materials = Array.isArray(child.material) ? child.material : [child.material];
        //     materials.forEach(mat => {
        //       mat.transparent = true;
        //       mat.opacity = 0.3;
        //     });
        //     console.log('Made Madonnina semi-transparent');
        //   }
        // }
        
        // Check for morph targets - these might control clothing deformations
        if (child.morphTargetInfluences && child.morphTargetInfluences.length > 0) {
          console.log(`Morph targets found on ${child.name}:`, child.morphTargetDictionary);
          console.log(`Number of morph targets: ${child.morphTargetInfluences.length}`);
          
          // For clothing meshes (8001, 9001) and Plane001, ensure morph targets are properly initialized
          if (child.name.includes('8001') || child.name.includes('9001') || child.name.includes('Plane001')) {
            console.log(`Mesh ${child.name} with morph targets detected`);
            
            // Log the morph target dictionary keys
            if (child.morphTargetDictionary) {
              const morphKeys = Object.keys(child.morphTargetDictionary);
              console.log(`  Morph target keys: ${morphKeys.join(', ')}`);
              
              // Log current values
              morphKeys.forEach(key => {
                const index = child.morphTargetDictionary[key];
                console.log(`    ${key}: index=${index}, value=${child.morphTargetInfluences[index]}`);
              });
            }
            
            // Ensure the mesh updates when morph targets change
            child.morphTargetsRelative = true;
          }
          
          // Enable morph target animation
          child.morphTargetInfluences.forEach((influence, index) => {
            if (influence !== 0) {
              console.log(`  Active morph target ${index}: ${influence}`);
            }
          });
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
        
        // Look for morph target or shape key tracks
        const morphTracks = anim.tracks.filter(track => 
          track.name.includes('.morphTargetInfluences') || 
          track.name.includes('Shape') ||
          track.name.includes('Key') ||
          track.name.includes('Legacy')
        );
        if (morphTracks.length > 0) {
          console.log(`  Found ${morphTracks.length} morph/shape key tracks:`);
          morphTracks.slice(0, 5).forEach(track => {
            console.log(`    - ${track.name}`);
          });
        }
      });
    }
    
    // Set the animations
    if (actions) {
      console.log('Available actions:', Object.keys(actions));
      
      // Check if KeyAction exists in the available actions
      if (actions['KeyAction']) {
        console.log('✓ KeyAction is available in actions list');
      }
      
      // Play the Texting.001 animation if available
      if (actions['Texting.001']) {
        const action = actions['Texting.001'];
        textingAction.current = action; // Store reference for syncing
        
        // Clip the animation to only play frames 90-642
        const clip = action.getClip();
        const startTime = 90 / 30; // 3 seconds
        const endTime = 642 / 30; // 21.4 seconds
        
        // Play the animation normally
        action.reset();
        action.play();
        action.setLoop(THREE.LoopRepeat);
        
        // Set animation properties
        action.time = startTime; // Start at 3 seconds (frame 90)
        action.setEffectiveTimeScale(1.0);
        action.setEffectiveWeight(1.0);
        
        console.log('Texting.001 animation setup:', {
          duration: clip.duration,
          startTime: startTime,
          endTime: endTime,
          startFrame: 90,
          endFrame: 642
        });
        
        // Log more details about what's being animated
        console.log('Sample track details:', clip.tracks[0]);
        
        // Check if any tracks target the clothing group or Plane meshes
        const clothingTracks = clip.tracks.filter(track => 
          track.name.toLowerCase().includes('clothing') || 
          track.name.toLowerCase().includes('individual') ||
          track.name.includes('Plane') ||
          track.name.includes('8001') ||  // These are the clothing meshes with morph targets
          track.name.includes('9001') ||  // These are the clothing meshes with morph targets
          track.name.includes('.morphTargetInfluences')
        );
        console.log('Clothing/Plane-related tracks:', clothingTracks.length);
        if (clothingTracks.length > 0) {
          console.log('First few clothing tracks:', clothingTracks.slice(0, 5).map(t => t.name));
        }
        
        // Check for morph target tracks specifically
        const morphTargetTracks = clip.tracks.filter(track => 
          track.name.includes('.morphTargetInfluences')
        );
        if (morphTargetTracks.length > 0) {
          console.log(`Found ${morphTargetTracks.length} morph target tracks in Texting.001`);
          morphTargetTracks.forEach(track => {
            console.log(`  Morph track: ${track.name}`);
            // Extract the object name and morph target index
            const match = track.name.match(/(.+)\.morphTargetInfluences\[(\d+)\]/);
            if (match) {
              console.log(`    Object: ${match[1]}, Morph index: ${match[2]}`);
            }
          });
        }
        
        // Set the animation to play at normal speed
        action.timeScale = 1.0;
        
        // Also ensure the action has proper weight
        action.setEffectiveWeight(1.0);
        action.setEffectiveTimeScale(1.0);
        
        console.log(`Texting.001 duration: ${clip.duration}s`);
      } else {
        console.log('Texting.001 not found in actions');
      }
      
      // Play the Body_O.001Action animation for Madonnina object
      if (actions['Body_O.001Action']) {
        const bodyAction = actions['Body_O.001Action'];
        bodyAction.reset();
        bodyAction.play();
        bodyAction.setLoop(THREE.LoopRepeat);
        
        // Log animation details
        const bodyClip = bodyAction.getClip();
        console.log('Body_O.001Action animation details:', {
          duration: bodyClip.duration,
          tracks: bodyClip.tracks.length,
          trackNames: bodyClip.tracks.map(t => t.name).slice(0, 10) // First 10 track names
        });
        
        // Check which object this animation targets
        const madonninaTracks = bodyClip.tracks.filter(track => 
          track.name.includes('Madonnina')
        );
        console.log('Madonnina tracks in Body_O.001Action:', madonninaTracks.length);
        if (madonninaTracks.length > 0) {
          console.log('First few Madonnina tracks:', madonninaTracks.slice(0, 5).map(t => t.name));
        }
        
        // Check for clothing morph target tracks in Body_O.001Action
        const bodyMorphTracks = bodyClip.tracks.filter(track => 
          track.name.includes('.morphTargetInfluences') ||
          track.name.includes('8001') ||
          track.name.includes('9001')
        );
        if (bodyMorphTracks.length > 0) {
          console.log(`Found ${bodyMorphTracks.length} clothing/morph tracks in Body_O.001Action:`);
          bodyMorphTracks.forEach(track => {
            console.log(`  Track: ${track.name}`);
          });
        }
        
        // Set animation properties
        bodyAction.timeScale = 1.0;
        bodyAction.setEffectiveWeight(1.0);
        bodyAction.setEffectiveTimeScale(1.0);
        
        console.log('Playing Body_O.001Action animation for Madonnina');
      } else {
        console.log('Body_O.001Action not found in actions');
      }
      
      // Let's check all animations for morph target tracks
      console.log('\nChecking ALL animations for morph target tracks:');
      animations.forEach(anim => {
        console.log(`\nAnalyzing animation: ${anim.name}`);
        
        const morphTracks = anim.tracks.filter(track => 
          track.name.includes('.morphTargetInfluences')
        );
        if (morphTracks.length > 0) {
          console.log(`  Found ${morphTracks.length} morph target tracks:`);
          morphTracks.forEach(track => {
            console.log(`    - ${track.name}`);
          });
        }
        
        // Also check for Plane tracks (both under clothing and simulation)
        const planeTracks = anim.tracks.filter(track => 
          track.name.includes('Plane') || 
          track.name.includes('simulation') ||
          track.name.includes('clothing') ||
          track.name.includes('individual')
        );
        if (planeTracks.length > 0) {
          console.log(`  Found ${planeTracks.length} tracks referencing Plane/clothing/simulation:`);
          planeTracks.slice(0, 10).forEach(track => {
            console.log(`    - ${track.name}`);
          });
        }
      });
      
      // Look for KeyAction animation specifically
      if (actions['KeyAction']) {
        console.log('\n✓ Found KeyAction animation!');
        const keyAction = actions['KeyAction'];
        
        // Don't play KeyAction - we'll handle it manually
        // This prevents conflicts with our manual morph target animation
        keyAction.stop();
        
        const keyClip = keyAction.getClip();
        console.log('KeyAction details:', {
          duration: keyClip.duration,
          tracks: keyClip.tracks.length
        });
        
        // Log what this animation contains
        const keyMorphTracks = keyClip.tracks.filter(track => 
          track.name.includes('.morphTargetInfluences')
        );
        console.log(`KeyAction has ${keyMorphTracks.length} morph target tracks`);
        if (keyMorphTracks.length > 0) {
          keyMorphTracks.forEach(track => {
            console.log(`  - ${track.name}`);
            // Check the keyframe times to understand the animation range
            if (track.times && track.times.length > 0) {
              console.log(`    Time range: ${track.times[0]}s to ${track.times[track.times.length - 1]}s`);
              console.log(`    Keyframe count: ${track.times.length}`);
            }
          });
        }
      }
      
      // Look for cloth meshes and check their morph targets
      const clothMeshes = [];
      scene.traverse((child) => {
        if (child.isMesh) {
          const fullPath = getObjectPath(child);
          
          // Log all mesh paths to understand structure better
          if (child.name.includes('Plane') || fullPath.includes('clothing') || fullPath.includes('simulation')) {
            console.log(`\nMesh: ${child.name}`);
            console.log('  Full path:', fullPath);
            console.log('  Has morph targets:', !!child.morphTargetDictionary);
            if (child.morphTargetDictionary) {
              console.log('  Morph target count:', Object.keys(child.morphTargetDictionary).length);
            }
          }
          
          // Collect all meshes with morph targets
          if (child.morphTargetDictionary && Object.keys(child.morphTargetDictionary).length > 0) {
            clothMeshes.push({
              mesh: child,
              path: fullPath,
              parent: child.parent?.name,
              morphCount: Object.keys(child.morphTargetDictionary).length
            });
          }
        }
      });
      
      // Now categorize the meshes
      clothMeshes.forEach(({mesh, path, parent, morphCount}) => {
        console.log(`\nCategorizing mesh: ${mesh.name}`);
        console.log('  Path:', path);
        console.log('  Parent:', parent);
        console.log('  Morph targets:', morphCount);
        
        // For now, let's handle all morph target meshes the same way
        // but log them so we can see the structure
        if (mesh.name === 'Plane001' || mesh.name === 'Plane001_1') {
          capeMeshRefs.current.push(mesh);
          console.log(`  -> Added to animated meshes: ${mesh.name}`);
          
          // Initialize all morph targets to 0
          if (mesh.morphTargetInfluences) {
            for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
              mesh.morphTargetInfluences[i] = 0;
            }
          }
          
          // Set render order to help with layering
          mesh.renderOrder = mesh.name === 'Plane001' ? 1 : 2;
          
          // Ensure materials are set up properly for depth testing
          if (mesh.material) {
            mesh.material.depthWrite = true;
            mesh.material.depthTest = true;
            mesh.material.transparent = false;
            mesh.material.side = THREE.DoubleSide;
            
            // Force material update
            mesh.material.needsUpdate = true;
          }
          
          // Also set frustum culling off for animated meshes
          mesh.frustumCulled = false;
        }
      });
      
      console.log(`\nTotal cape meshes: ${capeMeshRefs.current.length}`);
      console.log(`Total regular cloth meshes: ${clothMeshRefs.current.length}`);
    }
  }, [scene, actions, animations]);
  
  // Animate cloth morph targets frame by frame
  useFrame((state, delta) => {
    if (capeMeshRefs.current.length > 0 && textingAction.current) {
      // Get the current time from the Texting.001 animation
      let currentTime = textingAction.current.time;
      
      // Animation parameters
      const startTime = 90 / 30; // 3 seconds (frame 90)
      const endTime = 642 / 30; // 21.4 seconds (frame 642)
      const totalMorphFrames = 553; // We have 553 morph targets (0-552)
      
      // Check if we need to loop the animation
      if (currentTime >= endTime) {
        textingAction.current.time = startTime;
        currentTime = startTime;
      } else if (currentTime < startTime) {
        // If somehow we're before the start, jump to start
        textingAction.current.time = startTime;
        currentTime = startTime;
      }
      
      // Calculate which morph frame to show
      // Map time range [3s, 21.4s] to morph frame range [0, 552]
      const normalizedTime = (currentTime - startTime) / (endTime - startTime);
      const clampedTime = Math.max(0, Math.min(1, normalizedTime));
      const morphFrameToShow = clampedTime * (totalMorphFrames - 1);
      
      // Get integer frame indices for interpolation
      const morphFrameIndex1 = Math.floor(morphFrameToShow);
      const morphFrameIndex2 = Math.min(morphFrameIndex1 + 1, totalMorphFrames - 1);
      
      // Calculate interpolation factor
      const interpolationFactor = morphFrameToShow - morphFrameIndex1;
      
      // Update morph targets for all animated meshes
      capeMeshRefs.current.forEach((mesh, meshIndex) => {
        if (mesh.morphTargetInfluences && mesh.morphTargetInfluences.length > 0) {
          // Reset all morph targets to 0
          for (let i = 0; i < mesh.morphTargetInfluences.length; i++) {
            mesh.morphTargetInfluences[i] = 0;
          }
          
          // Apply interpolated morph targets for smoother animation
          if (morphFrameIndex1 < mesh.morphTargetInfluences.length) {
            // Set the weight for the current frame
            mesh.morphTargetInfluences[morphFrameIndex1] = 1 - interpolationFactor;
            
            // Set the weight for the next frame (interpolation)
            if (morphFrameIndex2 < mesh.morphTargetInfluences.length && morphFrameIndex2 !== morphFrameIndex1) {
              mesh.morphTargetInfluences[morphFrameIndex2] = interpolationFactor;
            }
            
            // Log every second
            const currentAnimFrame = Math.floor(currentTime * 30); // 30 fps
            if (currentAnimFrame % 30 === 0 && meshIndex === 0) {
              console.log(`Cloth animation synced with Texting.001: Time ${currentTime.toFixed(2)}s, Morph frames ${morphFrameIndex1}-${morphFrameIndex2} (${(interpolationFactor * 100).toFixed(1)}%)`);
            }
          }
        }
      });
    }
  });
  
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
useGLTF.preload('/madonnina-clothing2.glb');

const EtherealClouds = () => {
  const goldCoinRef = React.useRef();
  const cloudsRef = React.useRef();
  
  
  // Rotate the gold coin around its own axis
  useFrame((state, delta) => {
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
      
      {/* Glitch effect for Madonnina and clothing */}
      <SimpleGlitchTint />
      
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