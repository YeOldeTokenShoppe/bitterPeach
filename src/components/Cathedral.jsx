import React, { useRef, Suspense, useEffect, useState, useCallback, useMemo, useContext } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, useAnimations, useHelper, Html, Sky } from '@react-three/drei';
import * as THREE from 'three';
// import DebugCyborg3Position from './DebugCyborg3Position'; // Commented out after coordinate fix
import TickerCanvasTextureApplier from './TickerCanvasTextureApplier';
import ConstellationModel from '../components/3DVotiveStand/ConstellationModel';
import StarField from '../components/3DVotiveStand/StarField';
import Object2Replacer from './Object2Replacer';
import AnnotationSystem from './3DVotiveStand/AnnotationSystem';
import PostProcessingEffects from './3DVotiveStand/PostProcessingEffects';
import FloatingCandleViewer from './3DVotiveStand/CandleInteraction';
import { useFirestoreResults } from '../utilities/useFirestoreResults';
import { detectDevice, getSceneSettings, optimizeTexture, texturePool } from '../utilities/performanceOptimizer';
import { useMusic, MusicContext } from '../contexts/MusicContext';
import CinematicCamera from './CinematicCamera';
import RoundWindowEffects from './RoundWindowEffects';
import VideoWallEffects from './VideoWallEffects';
import PrismaticOverlay from '../components/PrismaticOverlay';
import HolographicStatue2 from './3DVotiveStand/HolographicStatue2';
// import { createShaderMaterial, getShaderByIndex } from './shaders/ShaderCollection'; // Replaced with video system
// Version string for cache busting - update this when model changes
const MODEL_VERSION = '1.0.1';


// Character configuration with position-appropriate animations
const POSITION_CONFIGS = [
  { 
    id: 'wall_left',
    position: [-12, 0, 0], 
    rotation: [0, Math.PI/2, 0],
    idleAnimations: ['Leaning', 'StandDrink', 'Stand'],
    danceAnimations: ['GUITAR', 'BBOYHIPHOP', 'SALSA'],
    requiresWall: true
  },
  { 
    id: 'wall_right',
    position: [12, 0, 0], 
    rotation: [0, -Math.PI/2, 0],
    idleAnimations: ['Leaning', 'StandDrink'],
    danceAnimations: ['GUITAR', 'SALSA'],
    requiresWall: true
  },
  { 
    id: 'altar_front',
    position: [0, 0, 8], 
    rotation: [0, Math.PI, 0],
    idleAnimations: ['Pray', 'Kneel', 'Stand'],
    danceAnimations: ['StandClap', 'SAMBA0', 'Cheer'],
    requiresAltar: true
  },
  { 
    id: 'center_stage',
    position: [0, 0, 3], 
    rotation: [0, 0, 0],
    idleAnimations: ['Stand', 'Idle', 'Wave'],
    danceAnimations: ['SAMBA0', 'SAMBA2', 'BBOYHIPHOP', 'SALSA'],
    requiresSpace: true
  },
  { 
    id: 'corner_sit_left',
    position: [-8, 0, -5], 
    rotation: [0, Math.PI/4, 0],
    idleAnimations: ['Sit', 'SitIdle2'],
    danceAnimations: ['SitClap', 'SitClap2', 'Sit_CyborgDJ'],
    requiresSeat: true
  },
  { 
    id: 'corner_sit_right',
    position: [8, 0, -5], 
    rotation: [0, -Math.PI/4, 0],
    idleAnimations: ['Sit', 'SitIdle2'],
    danceAnimations: ['SitClap', 'SitClap2'],
    requiresSeat: true
  },
  { 
    id: 'mid_left',
    position: [-6, 0, 0], 
    rotation: [0, Math.PI/6, 0],
    idleAnimations: ['Stand', 'Idle', 'LookAround'],
    danceAnimations: ['SAMBA2', 'Cheer', 'Dance'],
    requiresSpace: false
  },
  { 
    id: 'mid_right',
    position: [6, 0, 0], 
    rotation: [0, -Math.PI/6, 0],
    idleAnimations: ['Stand', 'Idle', 'Wave'],
    danceAnimations: ['SALSA', 'Cheer', 'Dance'],
    requiresSpace: false
  },
  { 
    id: 'back_center',
    position: [0, 0, -8], 
    rotation: [0, 0, 0],
    idleAnimations: ['Stand', 'Idle'],
    danceAnimations: ['SAMBA0', 'StandClap'],
    requiresSpace: false
  },
  { 
    id: 'dj_booth',
    position: [10, 0, 5], 
    rotation: [0, -Math.PI*3/4, 0],
    idleAnimations: ['Sit', 'Sit_CyborgDJ'],
    danceAnimations: ['Sit_CyborgDJ', 'SitClap'],
    requiresDJBooth: true
  }
];

// Character models available
const CHARACTER_MODELS = [
  'Cyborg0', 'Cyborg2', 'Cyborg3', 'Cyborg4', 'Armature', 'Armature1', 'Armature2', 'Armature3', 'CyborgDJ'
];

// Function to generate random animation setup for fixed characters
function generateRandomCharacterSetup() {
  // Map each character to their possible animations
  const characterAnimationMap = {
    'Cyborg0': {
      idle: ['Pray', 'Stand', 'Idle'],
      dance: ['SAMBA0', 'SALSA', 'Cheer']
    },
    'Cyborg2': {
      idle: ['Sit', 'SitIdle2'],
      dance: ['SitClap', 'SitClap2', 'Cheer']
    },
    'Cyborg3': {
      idle: ['SitIdle2', 'SitClap2'], // Will be handled by sequence
      dance: ['SitClap', 'StandClap']
    },
    'Cyborg4': {
      idle: ['Leaning', 'Stand'],
      dance: ['BBOYHIPHOP', 'SALSA']
    },
    'Armature': {
      idle: ['SitIdle'],
      dance: ['SitToStand', 'LISTEN']
    },
    'Armature1': {
      idle: ['DRINKING'],
      dance: ['GUITAR']
    },
    'Armature2': {
      idle: ['SITIDLE'],
      dance: ['Stand2Clap', 'Stand2Sit', 'SITIDLE']
    },
    'CyborgDJ': {
      idle: ['Sit', 'Sit_CyborgDJ'],
      dance: ['Sit_CyborgDJ', 'SitClap']
    }
  };
  
  const characterConfigs = [];
  
  // Create configs for each known character
  Object.entries(characterAnimationMap).forEach(([charName, anims]) => {
    const idleAnim = anims.idle[Math.floor(Math.random() * anims.idle.length)];
    const danceAnim = anims.dance[Math.floor(Math.random() * anims.dance.length)];
    
    characterConfigs.push({
      characterModel: charName,
      idleAnimation: idleAnim,
      danceAnimation: danceAnim,
      uniqueId: charName
    });
  });
  
  return characterConfigs;
}

// Individual spotlight with helper
// Dusk atmosphere component - always rendered but visibility controlled
function DuskAtmosphere({ isActive }) {
  const { scene } = useThree();
  const gridRef = useRef();
  const groupRef = useRef();
  
  useEffect(() => {
    if (isActive) {
      // Set dusk fog - lighter and more colorful
      scene.fog = new THREE.Fog('#ff9966', 30, 200); // Warm orange-pink fog
    } else {
      // Clear outdoor effects
      scene.fog = null;
    }
  }, [isActive, scene]);
  
  // Always render but control visibility for better performance
  return (
    <group ref={groupRef} visible={isActive}>
      {/* Sky component from drei for sunset effect */}
      <Sky 
        distance={250000}
        sunPosition={[-1, 0.01, -1]}  // Sun at horizon for sunset
        inclination={0.49}  // Sun inclination (0.5 = horizon)
        azimuth={0.25}  // Sun rotation
        mieCoefficient={0.005}  // Haze amount
        mieDirectionalG={0.6}  // Sun size
        rayleigh={2}  // Sky color intensity
        turbidity={10}  // Atmosphere haziness
      />
      
      {/* Brighter dusk lighting */}
      <ambientLight intensity={0.4} color="#ffa366" />
      {/* Main sunset light - brighter and warmer */}
      <directionalLight 
        position={[-50, 40, -50]} 
        intensity={0.8} 
        color="#ff7f50"
        castShadow={false}
      />
      {/* Sky light for overall brightness */}
      <hemisphereLight 
        skyColor="#87ceeb"
        groundColor="#8b7355"
        intensity={0.5}
      />
      {/* Rim light for dramatic effect */}
      <directionalLight 
        position={[50, 20, -80]} 
        intensity={0.4} 
        color="#dda0dd"
        castShadow={false}
      />
      {/* Single grid plane with wireframe */}
      <mesh 
        ref={gridRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -2, -40]}
      >
        <planeGeometry args={[200, 200, 40, 40]} />
        <meshBasicMaterial 
          color="#00ff00"
          wireframe={true}
        />
      </mesh>
    </group>
  );
}

function StatueSpotlight({ position, targetPosition, intensity, angle, penumbra, distance, color, showHelper, helperColor, label }) {
  const lightRef = useRef();
  
  // Use the useHelper hook to create the spotlight helper with custom color
  useHelper(showHelper && lightRef, THREE.SpotLightHelper, helperColor);
  
  return (
    <>
      <spotLight
        ref={lightRef}
        position={position}
        target-position={targetPosition}
        intensity={intensity}
        angle={angle}
        penumbra={penumbra}
        distance={distance}
        color={color}
        castShadow={false}
      />
      {/* Add a visible sphere at light position for easier identification */}
      {showHelper && (
        <>
          <mesh position={position}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color={helperColor} />
          </mesh>
          {/* Add text label */}
          <Html position={position} center>
            <div style={{
              background: helperColor,
              color: 'white',
              padding: '2px 2px',
              borderRadius: '3px',
              fontSize: '10px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}>
              {label}
            </div>
          </Html>
        </>
      )}
    </>
  );
}

// Spotlight with Helper for debugging
function SpotlightWithHelper({ position, targetPosition, intensity, angle, penumbra, distance, color, helperColor, showHelper = true }) {
  const lightRef = useRef();
  const targetRef = useRef();
  
  // Show helper for debugging
  useHelper(showHelper && lightRef, THREE.SpotLightHelper, helperColor);
  
  useEffect(() => {
    if (lightRef.current && targetRef.current) {
      lightRef.current.target = targetRef.current;
    }
  }, []);
  
  return (
    <>
      <spotLight
        ref={lightRef}
        position={position}
        intensity={intensity}
        angle={angle}
        penumbra={penumbra}
        distance={distance}
        color={color}
        castShadow
      />
      <object3D ref={targetRef} position={targetPosition} />
      
      {/* Visual debug markers */}
      {showHelper && (
        <>
          {/* Light source position marker */}
          <mesh position={position}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color={helperColor} />
          </mesh>
          
          {/* Target position marker */}
          <mesh position={targetPosition}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshBasicMaterial color={helperColor} wireframe />
          </mesh>
          
          {/* Line from light to target */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([...position, ...targetPosition])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={helperColor} />
          </line>
        </>
      )}
    </>
  );
}

// Component to add spotlights to statues - hard-coded values
function StatueSpotlights({ scene, isPlaying }) {
  const [statuePositions, setStatuePositions] = useState([]);
  
  // Hard-coded spotlight configurations - using absolute world positions
  const spotlightConfigs = {
    showHelpers: false,
    lightScale: 1.2,
    statue1: {
      enabled: true,
      position: [-1, -26, -20],
      target: [10, -44, 19.5],
      // intensity: 2000,
      intensity: 500,
      angle: 6, // degrees
      distance: 50,
      // color: '#0000ff'
            color: '#ffffff',
            accent: '#cccccc'
    },
    statue2: {
      enabled: true,
      position: [-1, -26, -20],
      target: [0, -44, 19.5],
      // intensity: 2000,
      intensity: 500,
      angle: 7, // degrees
      distance: 50,
      // color: '#00ff00'
                  color: '#ffffff',
            accent: '#cccccc'
      
    },
    statue3: {
      enabled: true,
      position: [-2, -30, -22.5],
      target: [-9.0, -33, -14.5],
      // intensity: 2000,
      intensity: 500,
      angle: 9, // degrees
      distance: 50,
      // color: '#ff0000'
                  color: '#ffffff',
            accent: '#cccccc'
    },
    statue4: {
      enabled: true,
      position: [-2, -30, -25.5],
      target: [-14, -34, -15],
      // intensity: 2000,
      intensity: 500,
      angle: 8, // degrees
      distance: 50,
      // color: '#0000ff'
                  color: '#ffffff',
            accent: '#cccccc'
    }
  };
  
   // Define unique colors for each statue helper
   const statueColors = {
     'Statue1': { main: '#ff0000', accent: '#ff6666' },
     'Statue2': { main: '#00ff00', accent: '#66ff66' },
     'Statue3': { main: '#0066ff', accent: '#6699ff' },
     'Statue4': { main: '#ff00ff', accent: '#ff66ff' }
   };
  
   useEffect(() => {
     if (!scene) {
       console.log('⚠️ No scene provided to StatueSpotlights');
       return;
     }
    
     const positions = [];
    
     // Debug: Log all object names to find statues
     console.log('🔍 Looking for statues in scene...', scene);
     const allNames = [];
     scene.traverse((child) => {
       if (child.name) {
         allNames.push(child.name);
       }
     });
     console.log('📋 All object names in scene:', allNames);
    
     scene.traverse((child) => {
       // Also look for objects with "statue" in the name (case insensitive)
       if (child.name && (child.name.match(/^Statue[1-4]$/) || child.name.toLowerCase().includes('statue'))) {
         const box = new THREE.Box3().setFromObject(child);
         const center = box.getCenter(new THREE.Vector3());
         const size = box.getSize(new THREE.Vector3());
        
         // Use simpler world position calculation
         // Just use the center as-is since the model transformation is handled by the group
         positions.push({
           name: child.name,
           center: center,
           height: size.y,
           position: child.position.clone()
         });
        
         console.log(`✅ Found statue: ${child.name} at:`, {
           position: [center.x.toFixed(2), center.y.toFixed(2), center.z.toFixed(2)],
           height: size.y.toFixed(2)
         });
       }
     });
    
     if (positions.length === 0) {
       console.log('⚠️ No statues found in the scene. The Leva panel may not appear.');
       console.log('💡 Looking for objects named Statue1, Statue2, Statue3, Statue4 or containing "statue"');
     } else {
       console.log(`🎯 Found ${positions.length} statue(s) for spotlight controls`);
     }
    
     setStatuePositions(positions);
   }, [scene]);
  
   const getControlsForStatue = (statueName) => {
     const num = statueName.replace('Statue', '').toLowerCase();
     const config = spotlightConfigs[`statue${num}`];
     
     if (!config) return null;
     
     return {
       enabled: config.enabled,
       position: config.position,
       target: config.target,
       intensity: config.intensity,
       angle: (config.angle * Math.PI) / 180,
       distance: config.distance,
       color: config.color
     };
   };
  
   // Always create some test spotlights to ensure they're visible
   const testSpotlights = statuePositions.length === 0;
  
   console.log('🔍 StatueSpotlights render:', {
     statuePositions: statuePositions.length,
     testSpotlights,
     statueNames: statuePositions.map(s => s.name),
     spotlightConfigs
   });
  
   return (
     <>
 
      
       {statuePositions.map((statue) => {
         const colors = statueColors[statue.name] || { main: '#ffffff', accent: '#cccccc' };
         const mainControls = getControlsForStatue(statue.name);
        
         console.log(`🎯 Processing ${statue.name}:`, {
           mainControls,
           colors,
           statueCenter: statue.center
         });
        
         if (!mainControls) return null;
         
         return (
           <React.Fragment key={statue.name}>
             {/* Main spotlight - only render if enabled */}
             {mainControls.enabled && (
               <SpotlightWithHelper
                 position={mainControls.position}
                 targetPosition={mainControls.target}
                 intensity={isPlaying ? mainControls.intensity * 2 : mainControls.intensity}
                 angle={mainControls.angle}
                 penumbra={0.5}
                 distance={mainControls.distance}
                 color={isPlaying ? "#c896ff" : mainControls.color}
                 showHelper={false}
                 helperColor={colors.main}
               />
             )}
            
           </React.Fragment>
         );
       })}
     </>
   );
 }

// CharacterGroup component - randomly loads Group1.glb or Group2.glb
function CharacterGroup({ isPlaying = false, currentTrackBPM = 100, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1] }) {
  const [selectedGroup] = useState(() => {
    // Randomly select Group1 or Group2
    const groupNumber = Math.random() < 0.5 ? 1 : 2;
    console.log(`🎭 Selected character group: Group${groupNumber}.glb`);
    return groupNumber;
  });
  
  const groupPath = `/Group${selectedGroup}.glb`;
  const gltf = useGLTF(groupPath);
  const { scene, animations } = gltf;
  const { actions, mixer } = useAnimations(animations, scene);
  const wrapperRef = useRef();
  
  // Refs for managing animation transitions
  const cyborg0ListenerRef = useRef(null);
  const cyborg2ListenerRef = useRef(null);
  const cyborg3ListenerRef = useRef(null);
  const danceTimeoutRef = useRef(null);
  
  // Refs for Armature2 alternating sequence
  const armature2SequenceRef = useRef({ 
    currentAnim: 'Stand2Clap', 
    loopCount: 0,
    targetLoops: 1  // Start with 1 loop of Stand2Clap
  });
  const armature2ListenerRef = useRef(null);
  const armature3ListenerRef = useRef(null);
  const armatureListenerRef = useRef(null);
  
  // Helper function for animation speed based on BPM
  const getAnimationSpeedFromBPM = useCallback((baseBPM = 100) => {
    const speed = currentTrackBPM / baseBPM;
    console.log(`🎵 Animation speed calculation: BPM=${currentTrackBPM}, Speed multiplier=${speed}`);
    return speed;
  }, [currentTrackBPM]);
  
  // Initial setup - play idle animations
  useEffect(() => {
    if (!actions || !mixer) {
      console.log('⚠️ No actions or mixer available');
      return;
    }
    
    const actionList = Object.keys(actions);
    console.log(`🎬 Available animations for Group${selectedGroup}:`, actionList);
    
    // Debug all expected animations
    const expectedAnimations = ['Pray', 'Sit', 'SitIdle', 'SitIdle2', 'DRINKING', 'GUITAR', 
                               'SITIDLE', 'Stand2Clap', 'Stand2Sit', 'Pray2Stand', 'Samba', 'Leaning'];
    expectedAnimations.forEach(animName => {
      if (actions[animName]) {
        console.log(`✅ ${animName} animation found`);
      } else {
        console.log(`❌ ${animName} animation NOT found`);
      }
    });
    
    if (actionList.length > 0) {
      console.log('🎮 Starting idle animations...');
      // Play initial idle animations
      if (actions['Pray']) {
        console.log('▶️ Playing Pray idle animation');
        actions['Pray'].reset().play();
        actions['Pray'].setLoop(THREE.LoopRepeat);
      }
      if (actions['Sit']) {
        console.log('▶️ Playing Sit idle animation');
        actions['Sit'].reset().play();
        actions['Sit'].setLoop(THREE.LoopRepeat);
      }
      if (actions['SitIdle'] || actions['SitIdle2']) {
        const sitIdle = actions['SitIdle'] || actions['SitIdle2'];
        console.log(`▶️ Playing ${actions['SitIdle'] ? 'SitIdle' : 'SitIdle2'} idle animation`);
        sitIdle.reset().play();
        sitIdle.setLoop(THREE.LoopRepeat);
      }
      if (actions['DRINKING']) {
        console.log('▶️ Playing DRINKING idle animation for Armature1');
        actions['DRINKING'].reset();
        actions['DRINKING'].timeScale = 0.5; // Half speed
        actions['DRINKING'].setLoop(THREE.LoopRepeat);
        actions['DRINKING'].play();
      }
      if (actions['SITIDLE']) {
        console.log('▶️ Playing SITIDLE idle animation for Armature2');
        actions['SITIDLE'].reset().play();
        actions['SITIDLE'].setLoop(THREE.LoopRepeat);
      }
      if (actions['Leaning']) {
        console.log('▶️ Playing Leaning idle animation');
        actions['Leaning'].reset().play();
        actions['Leaning'].setLoop(THREE.LoopRepeat);
      }
    }
  }, [actions, mixer, selectedGroup]);
  
  // Handle music playing state changes
  useEffect(() => {
    if (!actions || !mixer) return;
    
    if (isPlaying) {
      console.log('🎵 Music started - transitioning to dance animations');
      
      // Clear any existing timeout
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
      }
      
      // Delay before starting dance animations
      danceTimeoutRef.current = setTimeout(() => {
        // Handle Cyborg0's transition: PrayToStand -> SAMBA0
        if (actions['PrayToStand'] && actions['SAMBA0']) {
          if (actions['Pray']) {
            actions['Pray'].stop();
          }
          
          actions['PrayToStand'].reset();
          actions['PrayToStand'].setLoop(THREE.LoopOnce, 1);
          actions['PrayToStand'].clampWhenFinished = true;
          actions['PrayToStand'].play();
          
          const onTransitionFinished = (e) => {
            if (e.action === actions['PrayToStand']) {
              mixer.removeEventListener('finished', onTransitionFinished);
              cyborg0ListenerRef.current = null;
              actions['PrayToStand'].stop();
              
              if (isPlaying && actions['SAMBA0']) {
                actions['SAMBA0'].reset();
                actions['SAMBA0'].timeScale = 0.5 * getAnimationSpeedFromBPM();
                actions['SAMBA0'].setLoop(THREE.LoopRepeat);
                actions['SAMBA0'].play();
              }
            }
          };
          cyborg0ListenerRef.current = onTransitionFinished;
          mixer.addEventListener('finished', onTransitionFinished);
        }
        
        // Handle Cyborg2's transition: SitToStand -> Cheer
        if (actions['SitToStand'] && actions['Cheer'] && actions['Sit']) {
          actions['Sit'].stop();
          
          actions['SitToStand'].reset();
          actions['SitToStand'].setLoop(THREE.LoopOnce, 1);
          actions['SitToStand'].clampWhenFinished = true;
          actions['SitToStand'].play();
          
          const onCyborg2TransitionFinished = (e) => {
            if (e.action === actions['SitToStand']) {
              mixer.removeEventListener('finished', onCyborg2TransitionFinished);
              cyborg2ListenerRef.current = null;
              actions['SitToStand'].stop();
              
              if (isPlaying && actions['Cheer']) {
                actions['Cheer'].reset();
                actions['Cheer'].timeScale = 0.5 * getAnimationSpeedFromBPM();
                actions['Cheer'].setLoop(THREE.LoopRepeat);
                actions['Cheer'].play();
              }
            }
          };
          cyborg2ListenerRef.current = onCyborg2TransitionFinished;
          mixer.addEventListener('finished', onCyborg2TransitionFinished);
        }
        
        // Handle Cyborg4's BBOYHIPHOP animation
        if (actions['BBOYHIPHOP'] && actions['Leaning']) {
          actions['Leaning'].stop();
          actions['BBOYHIPHOP'].reset();
          actions['BBOYHIPHOP'].timeScale = 0.5 * getAnimationSpeedFromBPM();
          actions['BBOYHIPHOP'].setLoop(THREE.LoopRepeat);
          actions['BBOYHIPHOP'].play();
        }
        
        // Handle Armature1's GUITAR animation
        if (actions['GUITAR'] && actions['DRINKING']) {
          const animSpeed = 0.5 * getAnimationSpeedFromBPM();
          console.log(`🎸 Starting GUITAR animation for Armature1 with timeScale=${animSpeed} (BPM=${currentTrackBPM})`);
          actions['DRINKING'].stop();
          actions['GUITAR'].reset();
          actions['GUITAR'].timeScale = animSpeed;
          actions['GUITAR'].setLoop(THREE.LoopRepeat);
          actions['GUITAR'].play();
        }
        
        // Handle Armature2's sequence: Stand2Clap -> Stand2Sit -> SITIDLE (x5) -> repeat
        if (actions['Stand2Clap'] && actions['Stand2Sit'] && actions['SITIDLE']) {
          console.log('🎭 Starting Armature2 sequence: Stand2Clap → Stand2Sit → SITIDLE(x5)');
          // Stop the idle SITIDLE animation
          if (actions['SITIDLE'].isRunning()) {
            actions['SITIDLE'].stop();
          }
          
          // Reset sequence state - sequence is Stand2Clap -> Stand2Sit -> SittingClap(x5)
          armature2SequenceRef.current = { 
            currentAnim: 'Stand2Clap', 
            loopCount: 0,
            targetLoops: 1,
            sequencePosition: 0  // 0=Stand2Clap, 1=Stand2Sit, 2=SITIDLE
          };
          
          // Function to play next animation in sequence
          const playArmature2Animation = () => {
            const sequence = armature2SequenceRef.current;
            const animSpeed = 0.5 * getAnimationSpeedFromBPM();
            
            console.log(`🎭 Playing ${sequence.currentAnim} (${sequence.loopCount + 1}/${sequence.targetLoops})`);
            
            if (actions[sequence.currentAnim]) {
              // Use crossfade for smoother transitions
              if (sequence.currentAnim === 'SITIDLE' && actions['Stand2Sit'] && actions['Stand2Sit'].isRunning()) {
                // Crossfade from Stand2Sit to SITIDLE over 0.3 seconds
                actions['SITIDLE'].reset();
                actions['SITIDLE'].timeScale = animSpeed;
                actions['SITIDLE'].setLoop(THREE.LoopOnce, 1);
                actions['SITIDLE'].fadeIn(0.3);
                actions['SITIDLE'].play();
                actions['Stand2Sit'].fadeOut(0.3);
                console.log('  ↔️ Crossfading from Stand2Sit to SITIDLE');
              } else if (sequence.currentAnim === 'Stand2Clap' && sequence.sequencePosition === 0 && 
                         actions['SITIDLE'] && actions['SITIDLE'].isRunning()) {
                // Crossfade from SITIDLE back to Stand2Clap when sequence repeats
                actions['Stand2Clap'].reset();
                actions['Stand2Clap'].timeScale = animSpeed;
                actions['Stand2Clap'].setLoop(THREE.LoopOnce, 1);
                actions['Stand2Clap'].fadeIn(0.3);
                actions['Stand2Clap'].play();
                actions['SITIDLE'].fadeOut(0.3);
                console.log('  ↔️ Crossfading from SITIDLE to Stand2Clap');
              } else {
                // Normal play for other animations
                actions[sequence.currentAnim].reset();
                actions[sequence.currentAnim].timeScale = animSpeed;
                actions[sequence.currentAnim].setLoop(THREE.LoopOnce, 1);
                actions[sequence.currentAnim].play();
              }
            }
          };
          
          // Set up listener for animation completion
          const onArmature2AnimFinished = (e) => {
            if ((e.action === actions['Stand2Clap'] || e.action === actions['Stand2Sit'] || e.action === actions['SITIDLE']) && isPlaying) {
              const sequence = armature2SequenceRef.current;
              sequence.loopCount++;
              
              // Check if we've completed the target loops for current animation
              if (sequence.loopCount >= sequence.targetLoops) {
                // Move to next animation in sequence
                sequence.loopCount = 0;
                
                if (sequence.sequencePosition === 0) {
                  // After Stand2Clap, go to Stand2Sit
                  sequence.currentAnim = 'Stand2Sit';
                  sequence.targetLoops = 1;
                  sequence.sequencePosition = 1;
                } else if (sequence.sequencePosition === 1) {
                  // After Stand2Sit, go to SittingClap
                  sequence.currentAnim = 'SITIDLE';
                  sequence.targetLoops = 5;
                  sequence.sequencePosition = 2;
                } else {
                  // After SittingClap x5, restart sequence with Stand2Clap
                  sequence.currentAnim = 'Stand2Clap';
                  sequence.targetLoops = 1;
                  sequence.sequencePosition = 0;
                }
              }
              
              // Play next animation
              playArmature2Animation();
            }
          };
          
          // Store listener ref and add to mixer
          armature2ListenerRef.current = onArmature2AnimFinished;
          mixer.addEventListener('finished', onArmature2AnimFinished);
          
          // Start the sequence
          playArmature2Animation();
        }
        
        // Handle Armature's SitToStand -> LISTEN sequence
        if (actions['SitToStand'] && actions['LISTEN'] && actions['SitIdle']) {
          console.log('🪑 Starting Armature sequence: SitToStand → LISTEN');
          actions['SitIdle'].stop();
          
          const animSpeed = 0.5 * getAnimationSpeedFromBPM();
          
          // Play SitToStand transition once
          actions['SitToStand'].reset();
          actions['SitToStand'].timeScale = animSpeed;
          actions['SitToStand'].setLoop(THREE.LoopOnce, 1);
          actions['SitToStand'].clampWhenFinished = true;
          actions['SitToStand'].play();
          
          // Set up listener for when SitToStand finishes
          const onSitToStandFinished = (e) => {
            if (e.action === actions['SitToStand']) {
              mixer.removeEventListener('finished', onSitToStandFinished);
              armatureListenerRef.current = null;
              actions['SitToStand'].stop();
              
              // Start LISTEN loops
              if (isPlaying && actions['LISTEN']) {
                console.log('👂 Starting LISTEN loops for Armature');
                actions['LISTEN'].reset();
                actions['LISTEN'].timeScale = animSpeed;
                actions['LISTEN'].setLoop(THREE.LoopRepeat);
                actions['LISTEN'].play();
              }
            }
          };
          
          armatureListenerRef.current = onSitToStandFinished;
          mixer.addEventListener('finished', onSitToStandFinished);
        }
        
        // Handle Armature3's Pray2Stand -> Samba sequence
        if (actions['Pray2Stand'] && actions['Samba'] && actions['Pray']) {
          console.log('🙏 Starting Armature3 sequence: Pray2Stand → Samba');
          actions['Pray'].stop();
          
          const animSpeed = 0.5 * getAnimationSpeedFromBPM();
          
          // Play Pray2Stand transition once
          actions['Pray2Stand'].reset();
          actions['Pray2Stand'].timeScale = animSpeed;
          actions['Pray2Stand'].setLoop(THREE.LoopOnce, 1);
          actions['Pray2Stand'].clampWhenFinished = true;
          actions['Pray2Stand'].play();
          
          // Set up listener for when Pray2Stand finishes
          const onPray2StandFinished = (e) => {
            if (e.action === actions['Pray2Stand']) {
              mixer.removeEventListener('finished', onPray2StandFinished);
              armature3ListenerRef.current = null;
              actions['Pray2Stand'].stop();
              
              // Start Samba loops
              if (isPlaying && actions['Samba']) {
                console.log('💃 Starting Samba loops for Armature3');
                actions['Samba'].reset();
                actions['Samba'].timeScale = animSpeed;
                actions['Samba'].setLoop(THREE.LoopRepeat);
                actions['Samba'].play();
              }
            }
          };
          
          armature3ListenerRef.current = onPray2StandFinished;
          mixer.addEventListener('finished', onPray2StandFinished);
        }
        
        // Handle Cyborg3's StandClap -> SitClap sequence
        if (actions['StandClap'] && actions['SitClap']) {
          // Stop any idle animations for Cyborg3
          ['SitIdle', 'SitIdle2'].forEach(animName => {
            if (actions[animName]) {
              actions[animName].stop();
            }
          });
          
          actions['StandClap'].reset();
          actions['StandClap'].setLoop(THREE.LoopOnce, 1);
          actions['StandClap'].play();
          
          const onStandClapFinished = (e) => {
            if (e.action === actions['StandClap']) {
              mixer.removeEventListener('finished', onStandClapFinished);
              cyborg3ListenerRef.current = null;
              
              if (isPlaying && actions['SitClap']) {
                actions['SitClap'].reset();
                actions['SitClap'].setLoop(THREE.LoopRepeat);
                actions['SitClap'].play();
              }
            }
          };
          cyborg3ListenerRef.current = onStandClapFinished;
          mixer.addEventListener('finished', onStandClapFinished);
        }
        
        // Play other SAMBA animations
        if (actions['SAMBA2']) {
          actions['SAMBA2'].reset();
          actions['SAMBA2'].timeScale = 0.5 * getAnimationSpeedFromBPM();
          actions['SAMBA2'].setLoop(THREE.LoopRepeat);
          actions['SAMBA2'].play();
        }
        
      }, 2000); // 2 second delay before starting dance animations
      
    } else {
      // Music stopped - return to idle animations
      console.log('🎵 Music stopped - returning to idle animations');
      
      // Clear timeout
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
        danceTimeoutRef.current = null;
      }
      
      // Remove event listeners
      if (cyborg0ListenerRef.current && mixer) {
        mixer.removeEventListener('finished', cyborg0ListenerRef.current);
        cyborg0ListenerRef.current = null;
      }
      if (cyborg2ListenerRef.current && mixer) {
        mixer.removeEventListener('finished', cyborg2ListenerRef.current);
        cyborg2ListenerRef.current = null;
      }
      if (cyborg3ListenerRef.current && mixer) {
        mixer.removeEventListener('finished', cyborg3ListenerRef.current);
        cyborg3ListenerRef.current = null;
      }
      if (armature2ListenerRef.current && mixer) {
        mixer.removeEventListener('finished', armature2ListenerRef.current);
        armature2ListenerRef.current = null;
      }
      if (armature3ListenerRef.current && mixer) {
        mixer.removeEventListener('finished', armature3ListenerRef.current);
        armature3ListenerRef.current = null;
      }
      if (armatureListenerRef.current && mixer) {
        mixer.removeEventListener('finished', armatureListenerRef.current);
        armatureListenerRef.current = null;
      }
      
      // Stop all dance animations
      ['SAMBA0', 'SAMBA2', 'Cheer', 'BBOYHIPHOP', 'GUITAR', 'StandClap', 'SitClap', 'PrayToStand', 'SitToStand', 'Stand2Clap', 'Stand2Sit', 'SITIDLE', 'Pray2Stand', 'Samba', 'SitToStand', 'LISTEN'].forEach(animName => {
        if (actions[animName]) {
          actions[animName].stop();
        }
      });
      
      // Restart idle animations
      setTimeout(() => {
        if (actions['Pray']) {
          actions['Pray'].reset().play();
          actions['Pray'].setLoop(THREE.LoopRepeat);
        }
        if (actions['Sit']) {
          actions['Sit'].reset().play();
          actions['Sit'].setLoop(THREE.LoopRepeat);
        }
        if (actions['SitIdle'] || actions['SitIdle2']) {
          const sitIdle = actions['SitIdle'] || actions['SitIdle2'];
          sitIdle.reset().play();
          sitIdle.setLoop(THREE.LoopRepeat);
        }
        if (actions['DRINKING']) {
          actions['DRINKING'].reset();
          actions['DRINKING'].timeScale = 0.5; // Half speed
          actions['DRINKING'].setLoop(THREE.LoopRepeat);
          actions['DRINKING'].play();
        }
        if (actions['SITIDLE']) {
          console.log('🎭 Returning to SITIDLE idle animation for Armature2');
          actions['SITIDLE'].reset().play();
          actions['SITIDLE'].setLoop(THREE.LoopRepeat);
        }
        if (actions['Leaning']) {
          actions['Leaning'].reset().play();
          actions['Leaning'].setLoop(THREE.LoopRepeat);
        }
      }, 100);
    }
    
    // Cleanup
    return () => {
      if (danceTimeoutRef.current) {
        clearTimeout(danceTimeoutRef.current);
      }
    };
  }, [isPlaying, actions, mixer, getAnimationSpeedFromBPM]);

  // Update animation speeds when BPM changes for already playing animations
  useEffect(() => {
    if (!actions || !isPlaying) return;
    
    const animSpeed = 0.3 * getAnimationSpeedFromBPM();
    console.log(`🎵 Updating animation speeds for BPM change: ${currentTrackBPM}, speed=${animSpeed}`);
    
    // Update speed for any currently playing dance animations
    const danceAnimations = ['GUITAR', 'SAMBA0', 'SAMBA2', 'Cheer', 'BBOYHIPHOP', 'SitClap', 'Stand2Clap', 'Stand2Sit', 'SITIDLE', 'Samba', 'LISTEN'];
    danceAnimations.forEach(animName => {
      if (actions[animName] && actions[animName].isRunning()) {
        actions[animName].timeScale = animSpeed;
        console.log(`  Updated ${animName} speed to ${animSpeed}`);
      }
    });
  }, [currentTrackBPM, isPlaying, actions, getAnimationSpeedFromBPM]);
  
  // Update animation mixer
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
  });
  
  return <primitive object={scene} />;
}



function CathedralModel({ onModelLoad, children, isPlaying = false, onCandleClick, showFloatingViewer, device, currentTrackBPM = 100, currentTrackIndex = 0, currentTrackShader = null, controlsRef }) {
  const gltf = useGLTF(`/CATHEDRAL_ONLY2.glb?v=${MODEL_VERSION}`);
  const modelRef = useRef();
  const groupRef = useRef();
  const pivotRef = useRef();
  const [modelCenter, setModelCenter] = useState([0, 0, 0]);
  const [enableRotation, setEnableRotation] = useState(false);
  const { actions, mixer } = useAnimations(gltf.animations, modelRef);
  
  // Generate random character setup once on mount
  const [characterSetup] = useState(() => generateRandomCharacterSetup());
  const activeCharactersRef = useRef({});
  
  // Apply random character setup to the scene
  useEffect(() => {
    if (gltf.scene && characterSetup && characterSetup.length > 0) {
      console.log('🎭 Applying randomized character setup:', characterSetup);
      
      // Debug: Log all objects in the scene
      const allObjects = [];
      gltf.scene.traverse((child) => {
        if (child.name) {
          allObjects.push({ name: child.name, type: child.type, visible: child.visible });
        }
      });
      console.log('All named objects in scene:', allObjects);
      
     
      
      // Also check for statues
      const statueObjects = [];
      gltf.scene.traverse((child) => {
        if (child.name) {
          if (child.name.match(/^Statue[1-4]$/) || (child.name.toLowerCase().includes('statue') && !child.name.toLowerCase().includes('cyborg'))) {
            statueObjects.push(child.name);
          }
        }
      });
      if (statueObjects.length > 0) {
        console.log('🗿 Found statue objects:', statueObjects);
      }
    }
  }, [gltf.scene, characterSetup]);
  const danceTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);
  const cyborg3SequenceRef = useRef(['SitIdle2', 'SitIdle2', 'SitIdle2', 'SitClap2']); // Cyborg3: 3x SitIdle2, then 1x SitClap2
  const cyborg3IndexRef = useRef(0); // Current index in the sequence
  const cyborg3ListenerRef = useRef(null); // Store the event listener for cleanup
  const cyborg0ListenerRef = useRef(null); // Store Cyborg0's transition listener
  const cyborg2ListenerRef = useRef(null); // Store Cyborg2's transition listener
  const { camera, scene } = useThree();
  const results = useFirestoreResults();
  const textureLoader = useRef(new THREE.TextureLoader());
  const orbitControlsRef = useRef();
  const [isOutdoor, setIsOutdoor] = useState(false);
  
  // Stage lighting refs
  const stageLightRef = useRef(null);
  const stageLightOriginalY = useRef(null);
  const stageLightLoweringProgress = useRef(0);
  const stageLightRaisingProgress = useRef(0);
  const isRaisingStageLight = useRef(false);
  
  // Nightclub lighting refs
  const spotlightsRef = useRef([]);
  const lightGroupRef = useRef();
  
  
  // Video wall refs (replacing shader system)
  const shaderWallsRef = useRef([]); // Store multiple walls
  const originalMaterialsRef = useRef(new Map()); // Store original materials for each wall
  const shaderMaterialRef = useRef(null);
  const currentShaderTypeRef = useRef(null);
  const lastTrackIndexRef = useRef(-1);

  // Calculate animation speed multiplier based on BPM
  // Base BPM of 100 = 1.0 speed multiplier
  // Slower songs (85 BPM) = 0.85 speed
  // Faster songs (120 BPM) = 1.2 speed
 // Batch animation changes for better performance
 const batchAnimationChanges = useCallback((changes) => {
  if (!actions || !mixer) return;
  
  // Group operations to minimize state changes
  const toStop = [];
  const toStart = [];
  
  changes.forEach(({ action, operation, ...params }) => {
    if (operation === 'stop') {
      toStop.push(action);
    } else if (operation === 'start') {
      toStart.push({ action, ...params });
    }
  });
  
  // Stop all at once
  toStop.forEach(actionName => {
    if (actions[actionName]) {
      actions[actionName].stop();
      actions[actionName].reset(); // Ensure clean state
    }
  });
  
  // Small delay before starting new animations
  setTimeout(() => {
    toStart.forEach(({ action, timeScale = 1, loop = THREE.LoopRepeat }) => {
      if (actions[action]) {
        actions[action].reset();
        actions[action].timeScale = timeScale;
        actions[action].setLoop(loop);
        actions[action].play();
      }
    });
  }, 50);
}, [actions, mixer]);

  // Function to optimize texture loading
  const loadOptimizedTexture = useCallback((url, onLoad) => {
    // Use the texture loader directly
    textureLoader.current.load(
      url,
      texture => {
        // Apply optimizations
        texture.generateMipmaps = true;
        texture.anisotropy = 4;

        // Return the optimized texture
        onLoad(texture);
      },
      undefined,
      error => {
        console.error("Error loading texture:", error);
      }
    );
  }, []);

  // Calculate animation speed multiplier based on BPM
  // Base BPM of 100 = 1.0 speed multiplier
  // Slower songs (85 BPM) = 0.85 speed
  // Faster songs (120 BPM) = 1.2 speed
  const getAnimationSpeedFromBPM = useCallback((baseBPM = 100) => {
    return currentTrackBPM / baseBPM;
  }, [currentTrackBPM]);

  // Batch animation changes for better performance
  
  // Function to apply user image to candle labels
  const applyUserImageToLabel = useCallback((candle, user) => {
    if (!user?.image) return;

    // Find label objects
    const label1Objects = candle.children.filter(child => child.name.includes("Label1"));
    const label2Objects = candle.children.filter(
      child => child.name.includes("Label2") && !child.name.includes("Label1")
    );

    if (label1Objects.length === 0 && label2Objects.length === 0) return;

    // Use optimized texture loader
    loadOptimizedTexture(user.image, texture => {
      // Apply to both Label1 and Label2 objects with vertical flip
      [...label1Objects, ...label2Objects].forEach(label => {
        if (label.material) {
          // Dispose of existing materials/textures
          if (label.material.map) {
            label.material.map.dispose();
          }
          label.material.dispose();

          // Clone texture and flip vertically only
          const flippedTexture = texture.clone();
          flippedTexture.wrapS = THREE.RepeatWrapping;
          flippedTexture.wrapT = THREE.RepeatWrapping;
          flippedTexture.repeat.y = -1; // Flip vertically only
          flippedTexture.needsUpdate = true;

          // Create new material with flipped texture and emissive glow
          label.material = new THREE.MeshStandardMaterial({
            map: flippedTexture,
            transparent: true,
            side: THREE.DoubleSide,
            emissive: new THREE.Color(0xffffff), // White emissive color
            emissiveIntensity: 0.15, // Subtle glow to enhance visibility
            emissiveMap: flippedTexture, // Use the same texture for emissive
          });
          label.material.needsUpdate = true;
        }
      });
    });
  }, [loadOptimizedTexture]);

  // Handle candle and door clicks
  const handleCandleClick = useCallback((event) => {
    event.stopPropagation();
    
    // Check if the clicked object is a door or BackDoor
    const clickedObject = event.object;
    
    // Check the object and its parents for door names
    let objectToCheck = clickedObject;
    let isDoor = false;
    let isBackDoor = false;
    
    // Debug: Log clicked object name
    console.log('Clicked object:', clickedObject.name);
    
    // Check up to 3 levels of parent hierarchy
    for (let i = 0; i < 3 && objectToCheck; i++) {
      if (objectToCheck.name === 'BackDoor') {
        isBackDoor = true;
        console.log('BackDoor clicked!');
        break;
      }
      if (objectToCheck.name === 'SM_Bld_Castle_Door_Single_01' || 
          objectToCheck.name === 'SM_Bld_Castle_Door_Single_01001') {
        isDoor = true;
        console.log('Front door clicked:', objectToCheck.name);
        break;
      }
      objectToCheck = objectToCheck.parent;
    }
    
    // Handle BackDoor click - return to main view
    if (isBackDoor) {
      // Animate camera back to main indoor position
      const mainPosition = new THREE.Vector3(0, 15, 30);
      const mainTarget = new THREE.Vector3(0, 12, -10);
      
      // Set indoor state
      setIsOutdoor(false);
      
      // Animate camera position
      const startPos = camera.position.clone();
      const duration = 2000; // 2 seconds
      const startTime = Date.now();
      
      const animateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        camera.position.lerpVectors(startPos, mainPosition, eased);
        
        // Update OrbitControls target
        if (controlsRef && controlsRef.current) {
          const currentTarget = controlsRef.current.target.clone();
          currentTarget.lerp(mainTarget, eased);
          controlsRef.current.target.copy(currentTarget);
          controlsRef.current.update();
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        }
      };
      
      animateCamera();
      return;
    }
    
    // Handle front door clicks - go to outdoor view
    if (isDoor) {
      // Animate camera to outdoor position
      const outdoorPosition = new THREE.Vector3(-5.6, 5.79, -45.905);
      const outdoorTarget = new THREE.Vector3(-3.6, 5.79, -35); // Look further back
      
      // Set outdoor state
      setIsOutdoor(true);
      
      // Animate camera position
      const startPos = camera.position.clone();
      const duration = 2000; // 2 seconds
      const startTime = Date.now();
      
      const animateCamera = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        camera.position.lerpVectors(startPos, outdoorPosition, eased);
        
        // Update OrbitControls target
        if (controlsRef && controlsRef.current) {
          const currentTarget = new THREE.Vector3(0, 18, -6);
          currentTarget.lerp(outdoorTarget, eased);
          controlsRef.current.target.copy(currentTarget);
          controlsRef.current.update();
        }
        
        if (progress < 1) {
          requestAnimationFrame(animateCamera);
        }
      };
      
      animateCamera();
      return;
    }

    // Only handle clicks on VCANDLEs
    const getEventCoordinates = () => {
      // Check if it's a touch event
      if (event.nativeEvent.touches && event.nativeEvent.touches.length > 0) {
        const touch = event.nativeEvent.touches[0];
        const bounds = event.nativeEvent.target.getBoundingClientRect();
        return {
          x: ((touch.clientX - bounds.left) / bounds.width) * 2 - 1,
          y: -((touch.clientY - bounds.top) / bounds.height) * 2 + 1,
        };
      }
      // Regular mouse event
      return {
        x: event.clientX !== undefined ? (event.clientX / window.innerWidth) * 2 - 1 : 0,
        y: event.clientY !== undefined ? -(event.clientY / window.innerHeight) * 2 + 1 : 0,
      };
    };

    const coords = getEventCoordinates();
    const mouse = new THREE.Vector2(coords.x, coords.y);

    const candleRaycaster = new THREE.Raycaster();
    candleRaycaster.setFromCamera(mouse, camera);

    // Find all VCANDLE objects and their children
    const intersectableObjects = [];
    if (modelRef.current) {
      modelRef.current.traverse(object => {
        // Check for VCANDLE objects
        if (object.name && (object.name.match(/^VCANDLE001\d{3}$/) || object.name === 'VCANDLE001' || object.name.startsWith("VCANDLE"))) {
          intersectableObjects.push(object);
          // Also include children for better click detection
          object.children.forEach(child => {
            if (
              child.name.includes("Label1") ||
              child.name.includes("wax") ||
              child.name.includes("glass") ||
              child.name.includes("Label2")
            ) {
              intersectableObjects.push(child);
            }
          });
        }
      });
    }

    const intersects = candleRaycaster.intersectObjects(intersectableObjects, true);
    if (intersects.length > 0) {
      let candleParent = intersects[0].object;
      // Find the parent VCANDLE object
      while (candleParent && !candleParent.name.match(/^VCANDLE/)) {
        candleParent = candleParent.parent;
      }

      if (candleParent && candleParent.userData.hasUser) {
        // Call the onCandleClick prop with the candle data
        onCandleClick({
          ...candleParent.userData,
          candleId: candleParent.name,
          candleTimestamp: Date.now(),
        });
      }
    }
  }, [camera, modelRef, onCandleClick]);

  useEffect(() => {
    if (gltf.scene && modelRef.current) {
      // Calculate the bounding box center for proper rotation
      const boundingBox = new THREE.Box3().setFromObject(gltf.scene);
      const boxCenter = boundingBox.getCenter(new THREE.Vector3());
      setModelCenter([boxCenter.x, boxCenter.y, boxCenter.z]);
      
      // Enable shadows selectively for better performance
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          
          // // Apply video texture to Circle object
          // if (child.name === 'Circle') {
          //   console.log('🎯 Found Circle object, applying video texture');
            
          //   // Check if loop.gif exists as a video file (mp4/webm)
          //   // If you have loop.gif, you'll need to convert it to mp4 or webm
          //   const video = document.createElement('video');
            
          //   // Try multiple formats
          //   const videoSources = ['/loop.mp4'];
            
          //   video.loop = true;
          //   video.muted = true;
          //   video.playsInline = true;
          //   video.autoplay = true;
          //   video.crossOrigin = 'anonymous';
            
          //   // Try to load the video
          //   let videoLoaded = false;
          //   for (const src of videoSources) {
          //     video.src = src;
          //     video.load();
              
          //     video.addEventListener('loadeddata', () => {
          //       if (!videoLoaded) {
          //         videoLoaded = true;
          //         console.log(`✅ Video loaded from ${src}`);
          //         video.play();
                  
          //         // Create video texture
          //         const videoTexture = new THREE.VideoTexture(video);
          //         videoTexture.minFilter = THREE.LinearFilter;
          //         videoTexture.magFilter = THREE.LinearFilter;
          //         videoTexture.format = THREE.RGBFormat;
          //         videoTexture.wrapS = THREE.RepeatWrapping;
          //         videoTexture.wrapT = THREE.RepeatWrapping;
                  
          //         // Apply material with video texture
          //         child.material = new THREE.MeshStandardMaterial({
          //           map: videoTexture,
          //           emissive: new THREE.Color(0xffffff),
          //           emissiveMap: videoTexture,
          //           emissiveIntensity: 0.5,
          //           side: THREE.DoubleSide
          //         });
                  
          //         // Store reference for potential cleanup
          //         child.userData.video = video;
          //         child.userData.videoTexture = videoTexture;
                  
          //         console.log('✅ Applied video texture to Circle object');
          //       }
          //     });
              
          //     video.addEventListener('error', () => {
          //       console.log(`❌ Could not load video from ${src}`);
          //     });
          //   }
            
          //   // Fallback to static image if no video found
          //   if (!videoLoaded) {
          //     setTimeout(() => {
          //       if (!videoLoaded) {
          //         console.log('⚠️ No video found, falling back to static image');
          //         const textureLoader = new THREE.TextureLoader();
          //         textureLoader.load('/loop.gif', (texture) => {
          //           child.material = new THREE.MeshStandardMaterial({
          //             map: texture,
          //             emissive: new THREE.Color(0xffffff),
          //             emissiveMap: texture,
          //             emissiveIntensity: 0.5,
          //             side: THREE.DoubleSide
          //           });
          //           console.log('✅ Applied static loop.gif to Circle object');
          //         });
          //       }
          //     }, 2000);
          //   }
          // }
          
          // Only target specific video walls (the ones that should have shaders)
          // Based on your logs, it looks like pPlane3_Walls_0_1 and pPlane3_Walls_0_2 are the main walls
          const videoWallNames = [
            'pPlane3_Walls_0_1',
            'pPlane3_Walls_0_2',
            'pPlane_Walls3_0.001'  // Your new joined wall from Blender
          ];
          
          // Check if this mesh is one of the video walls
          // Video walls are now handled by VideoWallEffects component
          // if (videoWallNames.includes(child.name)) {
          //   console.log('✅ Found shader wall:', child.name, child.material);
          //   originalMaterialsRef.current.set(child.name, child.material);
          //   child.userData.isShaderWall = true;
          //   shaderWallsRef.current.push(child);
          // }
          // Make GodsRay objects non-clickable
          if (child.name && (child.name.includes('GodsRay') || child.name.includes('Godsray') || 
              child.name.includes('godray') || child.name.includes('GodRay'))) {
            child.raycast = () => {}; // Empty function prevents raycasting
            child.material.depthWrite = false; // Ensure transparency works correctly
            // console.log(`Made ${child.name} non-clickable`);
          }
          
          // Hide StageLight initially - it will be shown when music plays
          if (child.name === 'StageLight') {
            child.visible = false;
            stageLightRef.current = child;
            stageLightOriginalY.current = child.position.y;
            console.log('Found StageLight object, storing original Y position:', child.position.y);
          }
          
          // Ensure floor tiles and other objects respond to dynamic lights
          if (child.name && (child.name.includes('Stone_Ground') || 
              child.name.includes('Floor') || 
              child.name.includes('Wall') ||
              child.name.includes('Column'))) {
            
            // Ensure the material responds to lights
            if (child.material) {
              // If it's a basic material, convert to a light-responsive one
              if (child.material.type === 'MeshBasicMaterial') {
                const oldMaterial = child.material;
                child.material = new THREE.MeshStandardMaterial({
                  color: oldMaterial.color,
                  map: oldMaterial.map,
                  roughness: 0.8,
                  metalness: 0.2
                });
                oldMaterial.dispose();
                console.log(`Converted ${child.name} from MeshBasicMaterial to MeshStandardMaterial`);
              }
              
              // Force all materials to be MeshStandardMaterial or MeshPhongMaterial
              if (child.material.type !== 'MeshStandardMaterial' && 
                  child.material.type !== 'MeshPhongMaterial' &&
                  child.material.type !== 'MeshPhysicalMaterial') {
                console.log(`Warning: ${child.name} has material type ${child.material.type} which may not respond to lights`);
              }
              
              // Ensure material properties allow light interaction
              child.material.needsUpdate = true;
            }
          }
          
          // Only large objects cast shadows
          if (child.name.includes('Wall') || child.name.includes('Column') || 
              child.name.includes('Roof') || child.name.includes('Floor')) {
            child.castShadow = true;
          }
          // Most objects receive shadows
          child.receiveShadow = true;
        }
      });
      
      // Calculate the model's bounding box after positioning
      const box = new THREE.Box3().setFromObject(modelRef.current);
      const center = box.getCenter(new THREE.Vector3());
      // console.log('Model world center:', center);
      
      // Debug: Log all skinned meshes and their skeletons
      const skinnedMeshes = [];
      gltf.scene.traverse((child) => {
        if (child.isSkinnedMesh) {
          skinnedMeshes.push({
            name: child.name,
            skeletonName: child.skeleton?.bones[0]?.name || 'unknown',
            parent: child.parent?.name || 'unknown'
          });
        }
      });
      // console.log('Skinned meshes in scene:', skinnedMeshes);
      
      // Debug: Check for VCANDLE objects and all objects in scene
      let candleCount = 0;
      const allObjects = [];
      gltf.scene.traverse((child) => {
        if (child.name) {
          allObjects.push(child.name);
          if (child.name.startsWith('VCANDLE') || child.name.includes('candle') || child.name.includes('Candle')) {
            candleCount++;
            // console.log('Found candle object:', child.name);
          }
        }
      });
      // console.log('Total VCANDLE objects found:', candleCount);
      // console.log('All objects in scene:', allObjects.filter(name => name.length > 0));
      
      // Pass the center to parent component
      if (onModelLoad) {
        onModelLoad(center);
      }
    }
  }, [gltf, onModelLoad]);

  // Apply user data to VCANDLE objects
  useEffect(() => {
    if (!gltf.scene) return;

    // First, find all VCANDLE objects to hide only their flames
    const vcandleFlames = [];
    gltf.scene.traverse((child) => {
      // Check if this is a VCANDLE object
      if (child.name && child.name.startsWith('VCANDLE')) {
        // Hide flames that are children of VCANDLE objects
        child.traverse((vcandleChild) => {
          if (vcandleChild.name && (vcandleChild.name.includes('FLAME') || vcandleChild.name.includes('Flame') || 
              vcandleChild.name.includes('flame') || vcandleChild.name.includes('Fire') || 
              vcandleChild.name.includes('XFlame'))) {
            vcandleChild.visible = false;
            vcandleFlames.push(vcandleChild);
          }
        });
      }
    });
    // console.log(`Hidden ${vcandleFlames.length} flames from VCANDLE objects`);

    // Find all candle objects with various naming patterns
    const vcandleObjects = [];
    const candlePatterns = [];
    
    gltf.scene.traverse((child) => {
      if (child.name && (
        child.name.match(/^VCANDLE001\d{3}$/) || // VCANDLE001XXX
        child.name === 'VCANDLE001' || // Single VCANDLE001
        child.name.match(/^Candle\d+$/) || // CandleXXX
        child.name.match(/^XCandle\d+$/) // XCandleXXXXX
      )) {
        // Skip certain candle types that might not be interactive
        if (!child.name.includes('Japanese_candles') && 
            !child.name.includes('SM_Prop_Candle_Rack')) {
          vcandleObjects.push(child);
          
          // Track pattern types for debugging
          if (!candlePatterns.includes(child.name.substring(0, 6))) {
            candlePatterns.push(child.name.substring(0, 6));
          }
        }
      }
    });
    
    // console.log('Candle patterns found:', candlePatterns);
    // console.log('Candle objects found:', vcandleObjects.map(c => c.name));
    
    // Sort with VCANDLE objects first, then others
    vcandleObjects.sort((a, b) => {
      // Prioritize VCANDLE objects
      const aIsVCandle = a.name.startsWith('VCANDLE');
      const bIsVCandle = b.name.startsWith('VCANDLE');
      
      if (aIsVCandle && !bIsVCandle) return -1;
      if (!aIsVCandle && bIsVCandle) return 1;
      
      // Within the same type, sort alphabetically
      return a.name.localeCompare(b.name);
    });
    
    // Filter to only VCANDLE objects that have Label children for user data
    const vcandlesWithLabels = vcandleObjects.filter(candle => {
      const hasLabels = candle.children.some(child => 
        child.name.includes("Label1") || child.name.includes("Label2")
      );
      return candle.name.startsWith('VCANDLE') && hasLabels;
    });
    
    // console.log(`Found ${vcandleObjects.length} total candles, ${vcandlesWithLabels.length} VCANDLE objects with labels`);

    // First ensure all VCANDLES are initially visible
    vcandlesWithLabels.forEach((candle) => {
      candle.visible = true;
    });

    if (!results || results.length === 0) {
      // No user data, hide all VCANDLEs with labels
      vcandlesWithLabels.forEach((candle) => {
        candle.visible = false;
        // console.log(`Hid ${candle.name} - no user data available`);
      });
      return;
    }

    // console.log('Applying user data to candles. Results:', results);

    // Sort results by burnedAmount (descending) and createdAt (descending)
    const sortedByBurnedAmount = [...results].sort((a, b) => (b.burnedAmount || 0) - (a.burnedAmount || 0));
    const sortedByCreatedAt = [...results].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    // Get top 4 burners
    const topBurnersArray = sortedByBurnedAmount.slice(0, 4);

    // Get next 4 most recent users, excluding those already in topBurners
    const recentUsersArray = sortedByCreatedAt
      .filter(user => !topBurnersArray.some(topUser => topUser.id === user.id))
      .slice(0, 4);

    // Apply the users to candles - distribute them every 12th candle
    // On mobile devices, increase spacing to reduce number of visible candles
    const spacing = device.isLowEnd ? 24 : 12; // Place a user candle every 12th/24th position
    
    // Combine all users into one array, alternating between top burners and recent users
    const allUsers = [];
    const maxLength = Math.max(topBurnersArray.length, recentUsersArray.length);
    
    for (let i = 0; i < maxLength; i++) {
      if (i < topBurnersArray.length) {
        allUsers.push({ ...topBurnersArray[i], isTopBurner: true });
      }
      if (i < recentUsersArray.length) {
        allUsers.push({ ...recentUsersArray[i], isTopBurner: false });
      }
    }
    
    // Apply users to VCANDLEs with labels only, with even spacing
    allUsers.forEach((user, index) => {
      const candleIndex = index * spacing; // 0, 12, 24, 36, 48, 60, 72, 84
      if (candleIndex < vcandlesWithLabels.length) {
        const candle = vcandlesWithLabels[candleIndex];
        // Make sure the candle is visible
        candle.visible = true;
        
        candle.userData = {
          ...candle.userData,
          hasUser: true,
          userName: user.userName,
          userId: user.id,
          burnedAmount: user.burnedAmount,
          image: user.image,
          message: user.message,
          createdAt: user.createdAt,
          isTopBurner: user.isTopBurner,
        };
        // console.log(`Applied user data to ${candle.name} (position ${candleIndex}):`, user.userName);
        
        // Apply the image to the candle's labels
        applyUserImageToLabel(candle, user);
        
        // Show flames for this candle
        candle.traverse((child) => {
          if (child.name && (child.name.includes('FLAME') || child.name.includes('Flame') || 
              child.name.includes('flame') || child.name.includes('Fire'))) {
            child.visible = true; // Show flame for candles with user data
          }
        });
      }
    });
    
    // Hide remaining candles (non-user candles) that have labels
    let hiddenCandleCount = 0;
    let skippedCandleCount = 0;
    
    vcandlesWithLabels.forEach((candle, index) => {
      // Skip if this candle already has user data
      if (candle.userData && candle.userData.hasUser) {
        skippedCandleCount++;
        // console.log(`Skipping ${candle.name} - already has user data`);
        return;
      }
      
      // Hide candles without user data
      candle.visible = false;
      candle.userData = {
        ...candle.userData,
        hasUser: false,
        isDefault: true,
      };
      
      hiddenCandleCount++;
      // console.log(`Hid ${candle.name} (${hiddenCandleCount}) - no user data`);
      
      // Ensure flames are hidden for these candles
      candle.traverse((child) => {
        if (child.name && (child.name.includes('FLAME') || child.name.includes('Flame') || 
            child.name.includes('flame') || child.name.includes('Fire'))) {
          child.visible = false;
        }
      });
    });
    
    // console.log(`Summary: ${vcandlesWithLabels.length} VCANDLEs with labels, ${skippedCandleCount} with user data, ${hiddenCandleCount} hidden`);
  }, [results, gltf.scene, applyUserImageToLabel]);

  // Function to play next animation in Cyborg3's sequence
  const playNextCyborg3Animation = () => {
    if (!actions || !mixer || !isInitializedRef.current) return;
    
    const sequence = cyborg3SequenceRef.current;
    const currentIndex = cyborg3IndexRef.current;
    const animName = sequence[currentIndex];
    
    // console.log(`Cyborg3: Attempting to play ${animName} (${currentIndex + 1}/${sequence.length})`);
    // console.log('Available Cyborg3 animations:', Object.keys(actions).filter(name => 
    //   sequence.includes(name) || name === 'StandClap'
    // ));
    
    if (actions[animName]) {
      // Stop ALL Cyborg3-related animations first
      ['SitClap', 'SitIdle2', 'SitClap2', 'StandClap'].forEach(name => {
        if (actions[name] && actions[name].isRunning()) {
          actions[name].stop();
          // console.log(`Stopped ${name}`);
        }
      });
      
      // Play the current animation once
      actions[animName].reset();
      actions[animName].setLoop(THREE.LoopOnce, 1);
      actions[animName].clampWhenFinished = false;
      actions[animName].play();
      // console.log(`✅ Started playing ${animName}`);
      
      // Set up listener for when this animation finishes
      const onFinished = (e) => {
        if (e.action === actions[animName]) {
          // console.log(`${animName} finished`);
          mixer.removeEventListener('finished', onFinished);
          // Move to next animation in sequence
          cyborg3IndexRef.current = (currentIndex + 1) % sequence.length;
          playNextCyborg3Animation();
        }
      };
      mixer.addEventListener('finished', onFinished);
    } else {
      // console.log(`❌ Animation ${animName} not found in actions`);
    }
  };

  // Initial animation setup
  useEffect(() => {
    if (actions && !isInitializedRef.current) {
      // console.log('Available animations:', Object.keys(actions));
      
      // Check specifically for SAMBA animations
      const sambaAnims = Object.keys(actions).filter(name => name.toUpperCase().includes('SAMBA'));
      // console.log('SAMBA animations found:', sambaAnims);
      
      // Make sure all SAMBA animations are stopped initially
      sambaAnims.forEach(sambaName => {
        if (actions[sambaName]) {
          actions[sambaName].stop();
          actions[sambaName].timeScale = 1.0; // Reset time scale
        }
      });
      
      // Play all initial animations that are NOT SAMBA and not in Cyborg3's sequence
      const cyborg3Animations = cyborg3SequenceRef.current;
      const transitionAnimations = ['PrayToStand', 'StandToPray', 'SitToStand']; // Animations that shouldn't loop
      
      Object.entries(actions).forEach(([name, action]) => {
        if (!name.toUpperCase().includes('SAMBA') && 
            !cyborg3Animations.includes(name) &&
            !transitionAnimations.includes(name)) {
          // Reset all animations to clean state
          action.stop();
          action.reset();
          
          // Special handling for flame animation
          if (name === 'Take 001') {
            action.timeScale = 0.5; // Half speed for flame animation
            // console.log('Setting Take 001 flame animation to half speed');
          } else {
            action.timeScale = 1.0; // Ensure normal speed for others
          }
          action.setLoop(THREE.LoopRepeat);
          action.play();
          // console.log(`Playing initial animation: ${name}`);
        }
      });
      
      // Ensure CyborgDJ is sitting
      if (actions['Sit_CyborgDJ'] || actions['Sit']) {
        const djSitAction = actions['Sit_CyborgDJ'] || actions['Sit'];
        if (!djSitAction.isRunning()) {
          djSitAction.reset();
          djSitAction.setLoop(THREE.LoopRepeat);
          djSitAction.play();
          // console.log('CyborgDJ initially sitting');
        }
      }
      
      // Start Cyborg3's sequence
      playNextCyborg3Animation();
      
      // Mark as initialized
      isInitializedRef.current = true;
    }
  }, [actions]);

  // Update animation speeds when BPM changes while playing
  useEffect(() => {
    if (isPlaying && actions) {
      const speedMultiplier = getAnimationSpeedFromBPM();
      
      // Update speeds for all dance animations
      Object.entries(actions).forEach(([name, action]) => {
        if (action.isRunning() && (
          name.toUpperCase().includes('SAMBA') || 
          name.toUpperCase().includes('SALSA') ||
          name === 'Cheer' ||
          name === 'BBOYHIPHOP' ||
          name === 'GUITAR' ||
          name === 'SitClap'
        )) {
          action.timeScale = 0.5 * speedMultiplier;
        }
      });
    }
  }, [currentTrackBPM, isPlaying, actions, getAnimationSpeedFromBPM]);
  

 
  // Handle nightclub lighting effects when music plays
  useEffect(() => {
    if (spotlightsRef.current.length === 0) return;
    
    // console.log('Nightclub lighting effect triggered. isPlaying:', isPlaying, 'Lights:', spotlightsRef.current.length);
    
    // Control StageLight visibility based on music playing
    if (stageLightRef.current && stageLightOriginalY.current !== null) {
      if (isPlaying) {
        // Start position: 10 units above original
        stageLightRef.current.visible = true;
        stageLightRef.current.position.y = stageLightOriginalY.current + 10;
        stageLightLoweringProgress.current = 0;
        isRaisingStageLight.current = false;
        stageLightRaisingProgress.current = 0;
        // console.log(`StageLight starting descent from Y: ${stageLightRef.current.position.y}`);
      } else if (!isRaisingStageLight.current && stageLightRef.current.visible) {
        // Start raising animation when music stops
        isRaisingStageLight.current = true;
        stageLightRaisingProgress.current = 0;
        // console.log('StageLight starting to raise');
      }
    }
    
    if (isPlaying) {
      // Turn on nightclub lights with fade-in effect
      spotlightsRef.current.forEach((light, i) => {
        light.visible = true;
        // Helper code commented out
        // if (light.userData.helper) {
        //   light.userData.helper.visible = true;
        // }
        if (light.userData.pointLight) {
          light.userData.pointLight.visible = true;
        }
        // Stagger the fade-in
        setTimeout(() => {
          light.intensity = 0;
          if (light.userData.pointLight) {
            light.userData.pointLight.intensity = 0;
          }
          const fadeIn = setInterval(() => {
            light.intensity += 2.0; // Even larger increment
            if (light.userData.pointLight) {
              light.userData.pointLight.intensity += 0.5;
            }
            if (light.intensity >= 30.0) { // Much higher max intensity for visibility
              light.intensity = 50.0;
              if (light.userData.pointLight) {
                light.userData.pointLight.intensity = 5.0;
              }
              clearInterval(fadeIn);
              // console.log(`Light ${i} fully faded in with intensity:`, light.intensity);
            }
          }, 50);
        }, i * 200);
      });
    } else {
      // Turn off nightclub lights with fade-out
      spotlightsRef.current.forEach((light) => {
        const fadeOut = setInterval(() => {
          light.intensity -= 1.0;
          if (light.userData.pointLight) {
            light.userData.pointLight.intensity -= 0.4;
          }
          if (light.intensity <= 0) {
            light.intensity = 0;
            light.visible = false;
            if (light.userData.pointLight) {
              light.userData.pointLight.intensity = 0;
              light.userData.pointLight.visible = false;
            }
            // Helper code commented out
            // if (light.userData.helper) {
            //   light.userData.helper.visible = false;
            // }
            clearInterval(fadeOut);
          }
        }, 50);
      });
    }
  }, [isPlaying]);



 
  
  // Helper function to transform old coordinates to new coordinate system
  // Old: scale=0.7, position=[0, -60, -15], rotation=[0, Math.PI/1.2, 0]
  // New: scale=1, position=[0, 0, 0], rotation=[0, 0, 0]
  const transformOldToNew = (oldPos) => {
    // First, account for the rotation (Math.PI/1.2 = 150 degrees around Y)
    const rotationAngle = -Math.PI / 1.2; // Negative to reverse the rotation
    const cosR = Math.cos(rotationAngle);
    const sinR = Math.sin(rotationAngle);
    
    // Rotate around Y axis
    const rotatedX = oldPos[0] * cosR - oldPos[2] * sinR;
    const rotatedZ = oldPos[0] * sinR + oldPos[2] * cosR;
    
    // Scale up (1/0.7 = 1.43)
    const scaled = [
      rotatedX / 0.7,
      (oldPos[1] + 60) / 0.7, // Add 60 to Y before scaling
      (rotatedZ + 15) / 0.7  // Add 15 to Z before scaling
    ];
    
    return scaled;
  };

  useEffect(() => {
    if (groupRef.current) {
      // Grid is now handled by DuskAtmosphere component for outdoor scene
      // Commenting out to avoid duplicate grids
      // const gridHelper = new THREE.GridHelper(200, 100, 0x00ff41, 0x00ff41);
      // gridHelper.material.opacity = 0.3;
      // gridHelper.material.transparent = true;
      // gridHelper.position.y = 0; // Floor level
      // groupRef.current.add(gridHelper);
      
      // Add a shadow-receiving ground plane
      const groundGeometry = new THREE.PlaneGeometry(500, 500); // Scaled up
      const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0; // Slightly below floor
      ground.receiveShadow = true;
      groupRef.current.add(ground);
      
      // Create nightclub lighting group
      const lightGroup = new THREE.Group();
      lightGroupRef.current = lightGroup;
      groupRef.current.add(lightGroup);
      
      // Create spotlights for nightclub effect - properly scaled for new coordinate system
      // Cathedral was at scale 0.7, now at scale 1 (1.43x larger)
      const spotlightColors = [0xff00ff, 0x00ffff, 0xff0080, 0x00ff80]; // Purple, Cyan, Pink, Teal
      const spotlightPositions = [
        [14, 28, 15],     // Front right (scaled and adjusted)
        [-14, 28, 15],    // Front left
        [21, 28, -13],    // Back right
        [-21, 28, -13]    // Back left
      ];
      
      console.log('Creating nightclub spotlights...');
      
      spotlightPositions.forEach((pos, i) => {
        const spotlight = new THREE.SpotLight(spotlightColors[i], 0); // Start with 0 intensity
        spotlight.position.set(...pos);
        spotlight.angle = Math.PI / 5; // Wider for more coverage
        spotlight.penumbra = 0.5; // Balanced edge softness
        spotlight.distance = 200; // Much longer reach
        spotlight.intensity = 0; // Start at 0
        spotlight.decay = 1; // Standard decay
        spotlight.castShadow = false; // Performance optimization
        spotlight.visible = false; // Start hidden
        
        // Create target for spotlight
        const target = new THREE.Object3D();
        target.position.set(0, 0, 0); // Point towards cathedral center
        lightGroup.add(target);
        spotlight.target = target;
        
        // Store original position and color for animations
        spotlight.userData = {
          originalPosition: pos,
          originalColor: new THREE.Color(spotlightColors[i]),
          colorIndex: i,
          target: target
        };
        
        // Add a helper to visualize spotlight cone (optional, for debugging)
        // Commenting out helpers to remove the colored lines
        // const helper = new THREE.SpotLightHelper(spotlight);
        // helper.visible = false; // Start hidden
        // spotlight.userData.helper = helper;
        // lightGroup.add(helper);
        
        lightGroup.add(spotlight);
        spotlightsRef.current.push(spotlight);
        
        // console.log(`Created spotlight ${i}:`, {
        //   position: spotlight.position,
        //   target: target.position,
        //   color: spotlight.color,
        //   angle: spotlight.angle,
        //   intensity: spotlight.intensity
        // });
        
        // Add a point light at the spotlight position for extra glow
        const pointLight = new THREE.PointLight(spotlightColors[i], 0, 50);
        pointLight.position.copy(spotlight.position);
        pointLight.visible = false;
        lightGroup.add(pointLight);
        
        // Store point light reference in spotlight userData
        spotlight.userData.pointLight = pointLight;
      });
      
      return () => {
        groupRef.current.remove(gridHelper);
        gridHelper.material.dispose();
        gridHelper.geometry.dispose();
        groupRef.current.remove(ground);
        groundGeometry.dispose();
        groundMaterial.dispose();
        
        // Clean up spotlights
        spotlightsRef.current.forEach(light => {
          if (light.parent) light.parent.remove(light);
          light.dispose();
        });
        spotlightsRef.current = [];
        
        if (lightGroupRef.current && lightGroupRef.current.parent) {
          lightGroupRef.current.parent.remove(lightGroupRef.current);
        }
      };
    }
  }, []);


  // Update animation mixer and animate spotlights with performance optimizations
  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta);
    }
    
    // Animate StageLight
    if (stageLightRef.current && stageLightRef.current.visible) {
      const lowerDistance = 10; // Units to lower/raise
      
      if (isPlaying) {
        // Handle lowering animation when music is playing
        if (stageLightLoweringProgress.current < 1) {
          // Increase progress (2 seconds to fully lower)
          stageLightLoweringProgress.current += delta * 0.5;
          stageLightLoweringProgress.current = Math.min(stageLightLoweringProgress.current, 1);
          
          // Smooth easing function (ease-out)
          const easedProgress = 1 - Math.pow(1 - stageLightLoweringProgress.current, 3);
          
          // Update position for StageLight
          stageLightRef.current.position.y = stageLightOriginalY.current + lowerDistance * (1 - easedProgress);
        } else {
          // After lowering is complete, rotate the StageLight
          const rotationSpeed = (currentTrackBPM / 100) * 0.5;
          stageLightRef.current.rotation.z += delta * rotationSpeed;
        }
      } else if (isRaisingStageLight.current) {
        // Handle raising animation when music stops
        stageLightRaisingProgress.current += delta * 0.5; // Same speed as lowering
        stageLightRaisingProgress.current = Math.min(stageLightRaisingProgress.current, 1);
        
        // Smooth easing function (ease-in)
        const easedProgress = Math.pow(stageLightRaisingProgress.current, 3);
        
        // Update position for StageLight
        stageLightRef.current.position.y = stageLightOriginalY.current + lowerDistance * easedProgress;
        
        // When raising is complete, hide the object
        if (stageLightRaisingProgress.current >= 1) {
          stageLightRef.current.visible = false;
          isRaisingStageLight.current = false;
          console.log('StageLight raising complete, now hidden');
        }
      }
    }
    
    // Throttle spotlight animations on low-end devices
    if (isPlaying && spotlightsRef.current.length > 0) {
      const time = state.clock.getElapsedTime();
      const bpmFactor = currentTrackBPM / 100;
      
      // Reduce update frequency on tablets/low-end devices
      const shouldUpdate = device.isLowEnd ? 
        Math.floor(time * 60) % 10 === 0 : true; // Update every 10th frame on low-end
      
      if (shouldUpdate) {
        spotlightsRef.current.forEach((light, i) => {
          if (!light.visible || light.intensity === 0) return;
          
          // Simplified animation for low-end devices
          if (device.isLowEnd) {
            // Simple pulsing, no movement
            const pulse = Math.sin(time * bpmFactor + i) * 10 + 40;
            light.intensity = pulse;
            
            // Update point light with same intensity
            if (light.userData.pointLight) {
              light.userData.pointLight.intensity = pulse / 8;
            }
            
            // Less frequent color changes (every 3 seconds)
            if (Math.floor(time) % 3 === 0) {
              const hue = (time * 0.05 + i * 0.25) % 1;
              light.color.setHSL(hue, 1, 0.5);
            }
          } else {
            // Full animation for powerful devices
            // Animate spotlight movement
            const speed = bpmFactor * 0.5;
            const offset = i * Math.PI / 3;
            
            // Create circular/figure-8 movement patterns
            const pattern = i % 3;
            let x, z;
            
            switch (pattern) {
              case 0: // Circle pattern
                x = Math.sin(time * speed + offset) * 10;
                z = Math.cos(time * speed + offset) * 10;
                break;
              case 1: // Figure-8 pattern
                x = Math.sin(time * speed + offset) * 15;
                z = Math.sin(time * speed * 2 + offset) * 8;
                break;
              case 2: // Sweep pattern
                x = Math.sin(time * speed * 0.7 + offset) * 20;
                z = Math.cos(time * speed * 0.5 + offset) * 5;
                break;
            }
            
            // Update target position
            light.userData.target.position.x = x;
            light.userData.target.position.z = -10 + z;
            
            // Color cycling based on music
            const hue = (time * speed * 0.1 + i * 0.16) % 1;
            light.color.setHSL(hue, 1, 0.5);
            
            // Intensity pulsing (between 35 and 65 for maximum visibility)
            const pulse = Math.sin(time * speed * 2 + offset) * 15.0 + 50.0;
            light.intensity = pulse;
            
            // Also pulse the point light
            if (light.userData.pointLight) {
              light.userData.pointLight.intensity = pulse / 6; // Scale down for point light
            }
          }
          
          // Update helper if it exists (only on desktop)
          // if (light.userData.helper && !device.isLowEnd) {
          //   light.userData.helper.update();
          // }
        });
      }
    }
  });

  // Add rotation animation
  useFrame((state, delta) => {
    if (enableRotation && pivotRef.current) {
      pivotRef.current.rotation.y += delta * 0.2; // Adjust speed as needed
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <group ref={pivotRef} position={[0, 0, 0]}>
          <primitive 
            ref={modelRef}
            object={gltf.scene} 
            scale={1} 
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            onClick={handleCandleClick}
            castShadow
            receiveShadow
            // onUpdate={(self) => {
            //   console.log('🏛️ CATHEDRAL TRANSFORM:');
            //   console.log('  Scale:', 0.7);
            //   console.log('  Position:', [-modelCenter[0], -60 - modelCenter[1], -15 - modelCenter[2]]);
            //   console.log('  Rotation Y:', (Math.PI / 1.2 * 180 / Math.PI) + ' degrees');
            //   console.log('  ModelCenter:', modelCenter);
            // }}
          />
          {/* Randomly selected character group */}
          <CharacterGroup isPlaying={isPlaying} currentTrackBPM={currentTrackBPM} />
        </group>
        <StatueSpotlights scene={gltf.scene} isPlaying={isPlaying} />
        
        {/* Debug component to show Cyborg3 position - commented out after coordinate fix */}
        {/* <DebugCyborg3Position /> */}
      </group>
      {/* Dusk atmosphere when outdoor */}
      <DuskAtmosphere isActive={isOutdoor} />
    </>
  );
}

// Preload the models
useGLTF.preload(`/CATHEDRAL_ONLY2.glb?v=${MODEL_VERSION}`);
useGLTF.preload('/Group1.glb');
useGLTF.preload('/Group2.glb');

// Inner component that uses music context
function CathedralWithMusic({ isPlaying = false, showAnnotations = true, is80sMode = false, onAnnotationClick }) {
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [cinematicComplete, setCinematicComplete] = useState(true);
  const [spotlightsReady, setSpotlightsReady] = useState(false);
  const device = useMemo(() => detectDevice(), []);
  const sceneSettings = useMemo(() => getSceneSettings(device), [device]);
  const { currentTrackBPM, currentTrackIndex, currentTrackShader } = useMusic();
  const controlsRef = useRef();

  // Enable spotlights after a delay to ensure scene is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setSpotlightsReady(true);
      console.log('Statue spotlights enabled');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleCandleClick = useCallback((candleData) => {
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  }, []);

  const closeFloatingViewer = useCallback(() => {
    setShowFloatingViewer(false);
    setSelectedCandleData(null);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setCinematicComplete(true);
    console.log('Cinematic camera animation complete');
  }, []);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      // Clear texture pool when component unmounts
      if (device.isLowEnd) {
        texturePool.clear();
      }
    };
  }, [device.isLowEnd]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      <Canvas 
        shadows={sceneSettings.shadowsEnabled}
        // camera={{ position: [-5.41, 12.31, -8.00], fov: 45, near: 0.01, far: 200 }}
        camera={{ position: [0, 5, -0], fov: 75, near: 0.01, far: 100 }}
        gl={{ 
          antialias: sceneSettings.antialias,
          pixelRatio: sceneSettings.pixelRatio,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true
        }}
        dpr={sceneSettings.pixelRatio}>
      {/* <StarField radius={200} count1={device.isLowEnd ? 200 : 500} count2={device.isLowEnd ? 100 : 300} /> */}
             {/* <StarrySky /> */}
          {/* <ConstellationModel  groupScale={[15, 15, 15]} groupPosition={[0, 30, -80]}    isVisible={true} /> */}
        <OrbitControls 
            ref={controlsRef}
            // target={[-5.63, 12.29, -7.57]}
            target={[0, 18, -6]}
            zoomToCursor={true}
            enablePan={false} 
            enableRotate={!showFloatingViewer} 
            enableZoom={!showFloatingViewer}
            enabled={!showFloatingViewer}
            zoomSpeed={0.7}
            // panSpeed={0.8}
            rotateSpeed={0.5}
            enableDamping={true}
            dampingFactor={0.1}
            minDistance={0.01}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={0}
            // minAzimuthAngle={-Math.PI/5}  // -60°
            // maxAzimuthAngle={Math.PI/5}    // +60°
            autoRotate={false}
            makeDefault
            />
<Environment preset="sunset" environmentIntensity={.1} />
        
        {/* Directional light - dimmer when music plays */}
        <directionalLight 
          position={[10, 10, 5]} 
          intensity={isPlaying ? 0.2 : 0.3} 
          castShadow={sceneSettings.shadowsEnabled}
          shadow-mapSize={[sceneSettings.shadowMapSize, sceneSettings.shadowMapSize]}
          shadow-camera-far={150}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-bias={-0.001}
        />
        

        {/* Spotlights handled by StatueSpotlights component */}
        
        {/* Fog effect for nightclub atmosphere - enhanced for volumetric effect */}
        {isPlaying && <fog attach="fog" args={['#050505', 5, 120]} />}
    <PostProcessingEffects is80sMode={is80sMode} />
        <Suspense fallback={null}>
          {/* Cinematic camera - set enableLogging to true for debugging    
            <CinematicCamera 
              onComplete={handleCinematicComplete}
              duration={12000}
              startDelay={0}
              enableLogging={true}
              autoStart={true}
            />
    */} 
          <CathedralModel 
            isPlaying={isPlaying} 
            onCandleClick={handleCandleClick}
            showFloatingViewer={showFloatingViewer}
            device={device}
            currentTrackBPM={currentTrackBPM}
            currentTrackIndex={currentTrackIndex}
            currentTrackShader={currentTrackShader}
            controlsRef={controlsRef}
          />
          <TickerCanvasTextureApplier is80sMode={is80sMode} />
          {/* <Object2Replacer /> */}
          <HolographicStatue2 />
          
          {/* Spotlights for cabinet areas on either side of HolographicStatue2 */}
          <SpotlightWithHelper
            position={[-12, 17, -15.3]}  // Left side spotlight
            targetPosition={[-14, 3, -19.3]}  // Pointing down
            intensity={80}
            color="#ff9d00"
            angle={Math.PI / 4}
            penumbra={0.4}
            distance={20}
            showHelper={false}
            helperColor="#ff9d00"
          />
          <SpotlightWithHelper
            position={[15, 17, -15.3]}  // Right side spotlight
            targetPosition={[16, 5, -19.3]}  // Pointing down
            intensity={80}
            color="#ff9d00"
            angle={Math.PI / 4}
            penumbra={0.4}
            distance={20}
            showHelper={false}
            helperColor="#ff9d00"
          />
               <StatueSpotlight
            position={[-8.6, 11.71, -27]}  //Back Door
            targetPosition={[-9, 0, -26.7]}  // Pointing down
            intensity={10}
            color="#ffffff"
            angle={Math.PI / 1.7}
            penumbra={0.2}
            distance={50}
            showHelper={false}
            helperColor="#ffffff"
            label="Right Cabinet Spotlight"
          />
          
          <RoundWindowEffects isPlaying={isPlaying} />
          {/* <VideoWallEffects 
            isPlaying={isPlaying} 
            currentTrackIndex={currentTrackIndex}
            is80sMode={is80sMode}
          /> */}
          {cinematicComplete && showAnnotations && (
            <AnnotationSystem 
              is80sMode={is80sMode}
              showFloatingViewer={showFloatingViewer}
              onAnnotationClick={onAnnotationClick}
              annotations={[
                {
                  position: [4, 16, -18] ,// Main altar area (adjusted for y=0 floor)
                  text: "The virtual virgin is now onchain and online",
                  customCamera: {
                    position: [0.78, 15.88, -10.34], // Camera position
                    lookAt: [0.78, 15.88, -10.36], // Look at the altar
                    distance: 1
                  }
                
                },
                {
                  position: [-9, 12, -18], // Left side
                  text: "The candles of the Illuminati - click to view close-up",
                  customCamera: {
                    position: [-10.90, 13.23, -10.32], // Camera at annotation position
                    lookAt: [-11.53, 12.75, -13.21], // Look in opposite direction
                    distance: 3
                  }
                },
                {
                  position: [18, 12, -15], // Left side
                  text: "The candles of the Illuminati - click to view close-up",
                  customCamera: {
                    position: [14.27, 12.50, -6.59], // Camera at annotation position
                    lookAt: [14.30, 12.22, -8.95], // Look in opposite direction
                    distance: 3
                  }
                },
                {
                  position: [3, 9, -1] ,// Main altar area (adjusted for y=0 floor)
                  text: "The believers and the dreamers gather to request her favor",
                  customCamera: {
                    position: [7.51, 11.93, -17.20], // Camera position
                    lookAt: [3.66, 9.51, -3.29], // Look at the altar
                    distance: 10
                  }
                
                },
                {
                  position: [-12, 29, 15] ,// Main altar area (adjusted for y=0 floor)
                  text: "The faithful and the hopeful gather to request her favor",
                  customCamera: {
                    position: [-17.76, 32.77, 21.63], // Camera position
                    lookAt: [-10.96, 27.07, -2.21], // Look at the altar
                    distance: 5
                  }
                
                },
              ]}
              scale={5}
              textScale={2}
            />
          )}
        </Suspense>
        {/* Environment light - disabled to prevent washing out statue spotlights */}
        {!isPlaying && <Environment preset="sunset" environmentIntensity={.4} />}
      </Canvas>
      {isPlaying && <PrismaticOverlay />}
      {/* FloatingCandleViewer outside the Canvas */}
      {showFloatingViewer && selectedCandleData && (
        <FloatingCandleViewer
          key={`candle-viewer-${selectedCandleData.candleId}-${selectedCandleData.candleTimestamp}`}
          isVisible={showFloatingViewer}
          userData={selectedCandleData}
          onClose={closeFloatingViewer}
        />
      )}
    </div>
  );
}

// Wrapper component that checks for MusicProvider
function Cathedral(props) {
  // Try to access the context
  const musicContext = useContext(MusicContext);
  
  // If we have music context, use the music-aware version
  if (musicContext !== undefined) {
    return <CathedralWithMusic {...props} />;
  }
  
  // Otherwise, use a version without music context
  return <CathedralWithoutMusic {...props} />;
}

// Version without music context for standalone usage
function CathedralWithoutMusic({ isPlaying = false, showAnnotations = true, is80sMode = false, onAnnotationClick }) {
  const [showFloatingViewer, setShowFloatingViewer] = useState(false);
  const [selectedCandleData, setSelectedCandleData] = useState(null);
  const [cinematicComplete, setCinematicComplete] = useState(true);
  const device = useMemo(() => detectDevice(), []);
  const sceneSettings = useMemo(() => getSceneSettings(device), [device]);
  const currentTrackBPM = 100; // Default BPM

  const handleCandleClick = useCallback((candleData) => {
    setSelectedCandleData(candleData);
    setShowFloatingViewer(true);
  }, []);

  const closeFloatingViewer = useCallback(() => {
    setShowFloatingViewer(false);
    setSelectedCandleData(null);
  }, []);

  const handleCinematicComplete = useCallback(() => {
    setCinematicComplete(true);
    console.log('Cinematic camera animation complete');
  }, []);

  // Cleanup textures on unmount
  useEffect(() => {
    return () => {
      // Clear texture pool when component unmounts
      if (device.isLowEnd) {
        texturePool.clear();
      }
    };
  }, [device.isLowEnd]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas 
        shadows={sceneSettings.shadowsEnabled}
        camera={{ position: [0, 5, -0], fov: 75, near: 0.01, far: 100 }}
        gl={{ 
          antialias: sceneSettings.antialias,
          pixelRatio: sceneSettings.pixelRatio,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
          depth: true
        }}
        dpr={sceneSettings.pixelRatio}>
      {/* <StarField radius={150} count1={device.isLowEnd ? 200 : 500} count2={device.isLowEnd ? 100 : 300} /> */}
             {/* <StarrySky /> */}
          {/* <ConstellationModel  groupScale={[10, 10, 10]} groupPosition={[0, 15, -80]}    isVisible={true} /> */}
        <OrbitControls 
            target={[0, 18, -6]}
            zoomToCursor={true}
            enablePan={false} 
            enableRotate={!showFloatingViewer} 
            enableZoom={!showFloatingViewer}
            enabled={!showFloatingViewer}
            zoomSpeed={0.7}
            // panSpeed={0.8}
            rotateSpeed={0.5}
            enableDamping={true}
            dampingFactor={0.9}
            minDistance={0.01}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2}
            minAzimuthAngle={-Math.PI/5}  // -60°
            // maxAzimuthAngle={Math.PI/5}    // +60°
            minPolarAngle={0}
            autoRotate={false}
            makeDefault
            />
          
        
        {/* Ambient light - darker when music plays */}
        <ambientLight intensity={isPlaying ? 0.5 : 0.2} />
        {/* <directionalLight 
          position={[10, 10, 5]} 
          intensity={1} 
          castShadow={sceneSettings.shadowsEnabled}
          shadow-mapSize={[sceneSettings.shadowMapSize, sceneSettings.shadowMapSize]}
          shadow-camera-far={150}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-bias={-0.001}
        /> */}
        {/* Fog effect for nightclub atmosphere - enhanced for volumetric effect */}
        {isPlaying && <fog attach="fog" args={['#050505', 5, 120]} />}
    <PostProcessingEffects is80sMode={is80sMode} />
        <Suspense fallback={null}>
          {/* Cinematic camera - set enableLogging to true for debugging       */}
          <CinematicCamera 
            onComplete={handleCinematicComplete}
            duration={12000}
            startDelay={0}
            enableLogging={true}
            autoStart={true}
          />
    
          <CathedralModel 
            isPlaying={isPlaying} 
            onCandleClick={handleCandleClick}
            showFloatingViewer={showFloatingViewer}
            device={device}
            currentTrackBPM={currentTrackBPM}
            currentTrackIndex={currentTrackIndex}
            currentTrackShader={currentTrackShader}
          />
          <TickerCanvasTextureApplier is80sMode={is80sMode} />
          <Object2Replacer />
          <RoundWindowEffects isPlaying={isPlaying} />
          {cinematicComplete && showAnnotations && (
            <AnnotationSystem 
              is80sMode={is80sMode}
              showFloatingViewer={showFloatingViewer}
              onAnnotationClick={onAnnotationClick}
              annotations={[
                {
                  position: [4, 16, -18] ,// Main altar area (adjusted for y=0 floor)
                  text: "The virtual virgin is now onchain and online",
                  customCamera: {
                    position: [0.78, 15.88, -10.34], // Camera position
                    lookAt: [0.78, 15.88, -10.36], // Look at the altar
                    distance: 1
                  }
                
                },
                {
                  position: [-9, 12, -18], // Left side
                  text: "The candles of the Illuminati - click to view close-up",
                  customCamera: {
                    position: [-10.90, 13.23, -10.32], // Camera at annotation position
                    lookAt: [-11.53, 12.75, -13.21], // Look in opposite direction
                    distance: 3
                  }
                },
                {
                  position: [18, 12, -15], // Left side
                  text: "The candles of the Illuminati - click to view close-up",
                  customCamera: {
                    position: [14.27, 12.50, -6.59], // Camera at annotation position
                    lookAt: [14.30, 12.22, -8.95], // Look in opposite direction
                    distance: 3
                  }
                },
                {
                  position: [3, 9, -1] ,// Main altar area (adjusted for y=0 floor)
                  text: "The faithful and the hopeful gather to request her favor",
                  customCamera: {
                    position: [7.51, 11.93, -17.20], // Camera position
                    lookAt: [3.66, 9.51, -3.29], // Look at the altar
                    distance: 10
                  }
                
                },
                {
                  position: [-12, 29, 15] ,// Main altar area (adjusted for y=0 floor)
                  text: "The faithful and the hopeful gather to request her favor",
                  customCamera: {
                    position: [-17.76, 32.77, 21.63], // Camera position
                    lookAt: [-10.96, 27.07, -2.21], // Look at the altar
                    distance: 5
                  }
                
                },
              ]}
              scale={7}
              textScale={2}
            />
          )}
        </Suspense>
        {/* <Environment preset="sunset" /> */}
      </Canvas>
   
      {/* FloatingCandleViewer outside the Canvas */}
      {showFloatingViewer && selectedCandleData && (
        <FloatingCandleViewer
          key={`candle-viewer-${selectedCandleData.candleId}-${selectedCandleData.candleTimestamp}`}
          isVisible={showFloatingViewer}
          userData={selectedCandleData}
          onClose={closeFloatingViewer}
        />
      )}
    </div>
  );
}

export default Cathedral;