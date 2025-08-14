import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Clouds, Cloud, CameraShake } from '@react-three/drei';
import { Physics, RigidBody, BallCollider, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { random } from 'maath';
import { useGLTF } from '@react-three/drei';
import BurningDollarBills from './BurningDollarBills';
import SpiralDollarBills from './SpiralDollarBills';
import RainEffect from './RainEffect';
import EnhancedVolumetricLight from './EnhancedVolumetricLight';
import DarkClouds from '../3DVotiveStand/Clouds';

// Context for camera shake
const ShakeContext = createContext();

// Madonna Model Component
const MadonnaModel = ({ position = [0, -1, 1], scale = 1, goldCoinRef }) => {
  const { scene } = useGLTF('/madonnina-static-pose-no-animations.glb');
  const groupRef = useRef();
  
  React.useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name === 'collision') {
          child.visible = false;
          return;
        }
        
        if (child.parent?.name === 'lady' && child.parent?.parent?.name === 'lady') {
          child.visible = false;
          return;
        }
        
        child.visible = true;
      }
    });
    
    let goldCoinMesh = scene.getObjectByName('GoldCoinBlank_GoldCoinBlank_0');
    if (!goldCoinMesh) {
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
    }
    
    scene.traverse((child) => {
      if (child.isMesh && child.visible) {
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
        }
        
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            mat.transparent = false;
            mat.opacity = 1;
            mat.side = THREE.DoubleSide;
            if (mat.metalness !== undefined) mat.metalness = 0.3;
            if (mat.roughness !== undefined) mat.roughness = 0.6;
          });
        }
      }
    });
  }, [scene, goldCoinRef]);
  
  return (
    <group ref={groupRef} position={position}>
      <primitive 
        object={scene} 
        scale={scale}
        rotation={[0, -0.5, 0]}
      />
    </group>
  );
};

useGLTF.preload('/madonnina-static-pose-no-animations.glb');

// Mouse Pointer for Cloud Interaction
function Pointer({ vec = new THREE.Vector3(), dir = new THREE.Vector3() }) {
  const ref = useRef();
  
  useFrame(({ pointer, viewport, camera }) => {
    // Project mouse position to 3D space
    vec.set(pointer.x * viewport.width / 2, pointer.y * viewport.height / 2, 0.5).unproject(camera);
    dir.copy(vec).sub(camera.position).normalize();
    vec.add(dir.multiplyScalar(camera.position.length()));
    
    // Apply the kinematic position
    if (ref.current) {
      ref.current.setNextKinematicTranslation(vec);
    }
  });
  
  return (
    <RigidBody userData={{ cloud: true, pointer: true }} type="kinematicPosition" colliders={false} ref={ref}>
      <BallCollider args={[6]} />
    </RigidBody>
  );
}

// Dynamic Thunder Cloud Component with Enhanced Physics
function ThunderCloud({ 
  seed, 
  position, 
  weatherIntensity = 0.5, 
  vec = new THREE.Vector3(),
  cloudColor,
  cloudVolume,
  cloudOpacity,
  lightningColor = '#4a8eff',
  turbulence = new THREE.Vector3()
}) {
  const initialPosition = useRef(position);
  const api = useRef();
  const light = useRef();
  const rig = useContext(ShakeContext);
  const [flash] = useState(() => new random.FlashGen({ 
    count: Math.floor(10 + weatherIntensity * 10), 
    minDuration: 40, 
    maxDuration: 200 
  }));
  
  // Track collision with pointer for lightning
  const handleContact = (payload) => {
    // Trigger lightning on collision with pointer or other clouds
    if (payload.other.rigidBodyObject?.userData?.cloud && 
        payload.totalForceMagnitude / 1000 > 50) {
      flash.burst();
    }
  };
  
  // Trigger lightning only in storm conditions
  useEffect(() => {
    // Only trigger lightning if weather intensity is high (fear states)
    if (weatherIntensity > 0.1) {
      const interval = setInterval(() => {
        if (Math.random() < weatherIntensity * 0.3) {
          flash.burst();
        }
      }, 2000 + Math.random() * 4000);
      
      return () => clearInterval(interval);
    }
  }, [flash, weatherIntensity]);
  
  useFrame((state, delta) => {
    const impulse = flash.update(state.clock.elapsedTime, delta);
    if (light.current) {
      light.current.intensity = impulse * 20000 * weatherIntensity;
    }
    if (impulse === 1 && rig?.current) {
      rig.current.setIntensity(weatherIntensity * 1.5);
    }
    
    if (api.current) {
      // Centering force to keep clouds near their initial position, not the origin
      const currentPos = api.current.translation();
      const targetPos = new THREE.Vector3(...initialPosition.current);
      const centeringForce = vec.copy(currentPos)
        .sub(targetPos)
        .negate()
        .multiplyScalar(3); // Reduced strength so clouds can move more freely
      
      // Add turbulence for storm effect
      const time = state.clock.elapsedTime;
      turbulence.set(
        Math.sin(time * 0.5 + seed) * weatherIntensity * 5,
        Math.cos(time * 0.3 + seed) * weatherIntensity * 3,
        Math.sin(time * 0.4 + seed) * weatherIntensity * 5
      );
      
      // Apply combined forces
      api.current.applyImpulse(centeringForce.add(turbulence));
      
      // Add rotational momentum for swirling effect
      if (weatherIntensity > 0.3) {
        api.current.applyTorqueImpulse({
          x: Math.sin(time) * weatherIntensity * 0.5,
          y: Math.cos(time) * weatherIntensity * 0.8,
          z: Math.sin(time * 0.7) * weatherIntensity * 0.3
        });
      }
    }
  });
  
  return (
    <RigidBody 
      ref={api} 
      userData={{ cloud: true }} 
      onContactForce={handleContact}
      linearDamping={4 - weatherIntensity * 2} // Less damping in storms
      angularDamping={1 - weatherIntensity * 0.5} 
      friction={0.1} 
      position={position}
      colliders={false}
      mass={1 + weatherIntensity * 2} // Heavier clouds in storms
    >
      <BallCollider args={[6 + weatherIntensity * 4]} />
      <Cloud 
        seed={seed} 
        fade={30 + weatherIntensity * 20} 
        speed={0.1 + weatherIntensity * 0.4} 
        growth={4 + weatherIntensity * 6} 
        segments={40 + Math.floor(weatherIntensity * 20)} 
        volume={cloudVolume + weatherIntensity * 10} 
        opacity={cloudOpacity} 
        bounds={[6 + weatherIntensity * 6, 4 + weatherIntensity * 4, 2 + weatherIntensity * 2]}
        color={cloudColor}
      />
      <Cloud 
        seed={seed + 1} 
        fade={30 + weatherIntensity * 20} 
        position={[0, 1 + weatherIntensity * 2, 0]} 
        speed={0.5 + weatherIntensity * 0.3} 
        growth={4 + weatherIntensity * 6} 
        volume={cloudVolume * 1.5 + weatherIntensity * 15} 
        opacity={Math.min(1, cloudOpacity * 1.2)} 
        bounds={[8 + weatherIntensity * 8, 3 + weatherIntensity * 3, 2 + weatherIntensity * 2]}
        color={cloudColor}
      />
      {/* Additional cloud layer for more volume in storms */}
      {weatherIntensity > 0.5 && (
        <Cloud 
          seed={seed + 2} 
          fade={40} 
          position={[0, -1, 0]} 
          speed={0.3 * weatherIntensity} 
          growth={6 + weatherIntensity * 4} 
          volume={cloudVolume * 0.8} 
          opacity={cloudOpacity * 0.8} 
          bounds={[10, 5, 3]}
          color={cloudColor}
        />
      )}
      <pointLight 
        position={[0, 0, 0.5]} 
        ref={light} 
        color={lightningColor} 
        intensity={0}
      />
    </RigidBody>
  );
}

// Main Physics Weather Component
const PhysicsWeatherClouds = ({ onDataUpdate, manualData }) => {
  const shakeRef = useRef();
  const goldCoinRef = useRef();
  const [fearGreedIndex, setFearGreedIndex] = useState(50);
  const [weatherState, setWeatherState] = useState('neutral');
  const [, setLoading] = useState(true);
  
  // Use manual data if provided, otherwise fetch
  useEffect(() => {
    if (manualData) {
      setFearGreedIndex(manualData.value);
      setWeatherState(manualData.weatherState);
      setLoading(false);
      return;
    }
    
    const fetchFearGreedIndex = async () => {
      try {
        const response = await fetch(
          "https://us-central1-hailmary-3ff6c.cloudfunctions.net/getFearAndGreed"
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.data) {
            const value = parseInt(data.data.value);
            setFearGreedIndex(value);
            
            if (value < 25) setWeatherState('extremeFear');
            else if (value < 45) setWeatherState('fear');
            else if (value < 55) setWeatherState('neutral');
            else if (value < 75) setWeatherState('greed');
            else setWeatherState('extremeGreed');
            
            if (onDataUpdate) {
              onDataUpdate({
                value: value,
                classification: data.data.value_classification,
                weatherState: weatherState
              });
            }
            
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch Fear & Greed Index");
      }
      
      // Fallback
      try {
        const altResponse = await fetch("https://api.alternative.me/fng/");
        const altData = await altResponse.json();
        
        if (altData && altData.data && altData.data[0]) {
          const value = parseInt(altData.data[0].value);
          setFearGreedIndex(value);
          
          if (value < 25) setWeatherState('extremeFear');
          else if (value < 45) setWeatherState('fear');
          else if (value < 55) setWeatherState('neutral');
          else if (value < 75) setWeatherState('greed');
          else setWeatherState('extremeGreed');
          
          if (onDataUpdate) {
            onDataUpdate({
              value: value,
              classification: altData.data[0].value_classification,
              weatherState: weatherState
            });
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching Fear & Greed Index:', error);
        setFearGreedIndex(50);
        setWeatherState('neutral');
        setLoading(false);
      }
    };
    
    if (!manualData) {
      fetchFearGreedIndex();
      const interval = setInterval(fetchFearGreedIndex, 300000);
      return () => clearInterval(interval);
    }
  }, [onDataUpdate, weatherState, manualData]);
  
  // Calculate weather parameters
  const normalized = fearGreedIndex / 100;
  // Invert the intensity - 0 = extreme fear (stormy), 1 = extreme greed (calm)
  const stormIntensity = Math.max(0, (50 - fearGreedIndex) / 50); // Only stormy below 50
  const weatherIntensity = stormIntensity; // Storm intensity for physics and effects
  
  // Weather-based configurations - properly mapped to sentiment
  const getCloudConfig = () => {
    switch(weatherState) {
      case 'extremeFear': // 0-25: Apocalyptic storm
        return {
          count: 25,
          color: '#0a0a1a',
          volume: 45,
          opacity: 0.95,
          lightningColor: '#ff4444',
          skyColor: '#050510',
          fogDistance: 40,
          hasLightning: true,
          rainCount: 3000
        };
      case 'fear': // 25-45: Heavy storm
        return {
          count: 20,
          color: '#1a1a2a',
          volume: 35,
          opacity: 0.85,
          lightningColor: '#6688ff',
          skyColor: '#1a1a2a',
          fogDistance: 60,
          hasLightning: true,
          rainCount: 1500
        };
      case 'neutral': // 45-55: Overcast/Partly cloudy
        return {
          count: 12,
          color: '#7a7a8a',
          volume: 25,
          opacity: 0.5,
          lightningColor: '#ffffff',
          skyColor: '#5a6a7a',
          fogDistance: 100,
          hasLightning: false,
          rainCount: 0
        };
      case 'greed': // 55-75: Mostly sunny with light clouds
        return {
          count: 8,
          color: '#ffffff',
          volume: 20,
          opacity: 0.35,
          lightningColor: '#ffffff',
          skyColor: '#7ac5ff',
          fogDistance: 150,
          hasLightning: false,
          rainCount: 0
        };
      case 'extremeGreed': // 75-100: Clear sunny day
        return {
          count: 4,
          color: '#ffffff',
          volume: 15,
          opacity: 0.25,
          lightningColor: '#ffffff',
          skyColor: '#87CEEB',
          fogDistance: 200,
          hasLightning: false,
          rainCount: 0
        };
      default:
        return {
          count: 12,
          color: '#7a7a8a',
          volume: 25,
          opacity: 0.5,
          lightningColor: '#ffffff',
          skyColor: '#5a6a7a',
          fogDistance: 100,
          hasLightning: false,
          rainCount: 0
        };
    }
  };
  
  const config = getCloudConfig();
  
  // Generate cloud positions across a wider area, avoiding Madonna's head
  const cloudPositions = [];
  for (let i = 0; i < config.count; i++) {
    const angle = (i / config.count) * Math.PI * 2;
    const radius = 40 + Math.random() * 50; // Wider spread, further from center
    cloudPositions.push([
      Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
      10 + Math.random() * 40, // Raised from -10 to +10, keeping clouds higher
      Math.sin(angle) * radius + (Math.random() - 0.5) * 20
    ]);
  }
  
  useFrame(() => {
    if (goldCoinRef.current) {
      goldCoinRef.current.rotateZ(0.01);
    }
  });
  
  return (
    <>
      {/* Sky */}
      <mesh scale={[500, 500, 500]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
          color={config.skyColor} 
          side={THREE.BackSide}
          fog={false}
        />
      </mesh>
      
      {/* Fog */}
      <fog attach="fog" args={[config.skyColor, 10, config.fogDistance]} />
      
      {/* Lighting - brighter in greed, darker in fear but with minimum */}
      <ambientLight intensity={Math.max(0.4, 0.2 + normalized * 0.6)} />
      <directionalLight 
        position={[-1, 15, -5]} 
        intensity={Math.max(0.5, 0.3 + normalized * 1.2)} 
        color={normalized > 0.5 ? '#ffffcc' : '#ffffff'} // Keep neutral white in fear
      />
      
      {/* Sun light for greed states */}
      {normalized > 0.5 && (
        <directionalLight
          position={[50, 50, 50]}
          intensity={normalized * 1.5}
          color="#ffeeaa"
          castShadow
        />
      )}
      
      {/* Physics-based Thunder Clouds */}
      <ShakeContext.Provider value={shakeRef}>
        <CameraShake 
          ref={shakeRef} 
          decay 
          decayRate={0.95} 
          maxYaw={0.05 * weatherIntensity} 
          maxPitch={0.01 * weatherIntensity} 
          yawFrequency={4} 
          pitchFrequency={2} 
          rollFrequency={2} 
          intensity={0} 
        />
        
        <Clouds limit={800} material={THREE.MeshLambertMaterial}>
          <Physics gravity={[0, -0.5 * weatherIntensity, 0]}>
            {/* Mouse pointer for interaction */}
            <Pointer />
            
            {/* Multi-layer cloud system */}
            {cloudPositions.map((pos, i) => (
              <ThunderCloud
                key={i}
                seed={i * 10}
                position={pos}
                weatherIntensity={weatherIntensity}
                cloudColor={config.color}
                cloudVolume={config.volume}
                cloudOpacity={config.opacity}
                lightningColor={config.lightningColor}
              />
            ))}
            
            {/* Additional layer of smaller clouds for depth in storms */}
            {weatherIntensity > 0.3 && cloudPositions.slice(0, Math.floor(config.count / 2)).map((pos, i) => (
              <ThunderCloud
                key={`layer2-${i}`}
                seed={(i + 100) * 10}
                position={[
                  pos[0] + (Math.random() - 0.5) * 20,
                  pos[1] - 15 - Math.random() * 10,  // Lowered from +10 to -15
                  pos[2] + (Math.random() - 0.5) * 20
                ]}
                weatherIntensity={weatherIntensity * 0.7}
                cloudColor={config.color}
                cloudVolume={config.volume * 0.6}
                cloudOpacity={config.opacity * 0.7}
                lightningColor={config.lightningColor}
              />
            ))}
            
            {/* Ground collider */}
            <CuboidCollider position={[0, -30, 0]} args={[200, 10, 200]} />
          </Physics>
        </Clouds>
      </ShakeContext.Provider>
      
      {/* God Rays - Dynamic based on weather */}
      <EnhancedVolumetricLight 
        position={[0, 120, 20]} 
        target={[1, -15, -5]}  // Pointing at Madonna
        color={
          weatherState === 'extremeGreed' ? '#ffffcc' :
          weatherState === 'greed' ? '#ffffee' :
          weatherState === 'neutral' ? '#e0e0e0' :
          weatherState === 'fear' ? '#8899aa' :
          '#667788'  // extremeFear
        }
        intensity={
          weatherState === 'extremeGreed' ? 1.5 :  // Reduced from 3.0
          weatherState === 'greed' ? 1.0 :         // Reduced from 2.0
          weatherState === 'neutral' ? 0.5 :       // Reduced from 1.0
          weatherState === 'fear' ? 0.25 :         // Reduced from 0.5
          0.1  // extremeFear - very dim
        }
        rayCount={
          weatherState === 'extremeGreed' ? 40 :   // Reduced from 60
          weatherState === 'greed' ? 30 :          // Reduced from 45
          weatherState === 'neutral' ? 20 :        // Reduced from 30
          weatherState === 'fear' ? 10 :           // Reduced from 15
          5  // extremeFear - few rays
        }
        opacity={
          weatherState === 'extremeGreed' ? 0.012 : // Reduced from 0.025
          weatherState === 'greed' ? 0.010 :        // Reduced from 0.020
          weatherState === 'neutral' ? 0.008 :      // Reduced from 0.015
          weatherState === 'fear' ? 0.005 :         // Reduced from 0.010
          0.003  // extremeFear - barely visible
        }
        spread={
          weatherState === 'extremeGreed' ? 40 :
          weatherState === 'greed' ? 35 :
          weatherState === 'neutral' ? 30 :
          weatherState === 'fear' ? 20 :
          10  // extremeFear - narrow beam
        }
      />
          <DarkClouds />
      {/* Madonna - Outside physics system so she stays rooted */}
      <MadonnaModel 
        position={[-1, 10, -5]} 
        scale={15} 
        goldCoinRef={goldCoinRef}
      />
      
      {/* Madonna Lighting - Always properly lit regardless of weather */}
      <spotLight
        position={[0, 20, 20]}
        target-position={[1, -15, -5]}
        angle={0.3}
        penumbra={0.5}
        intensity={Math.max(1.5, 1.5 + normalized)} // Minimum 1.5 intensity
        color="#ffffff"
        castShadow
      />
      <spotLight
        position={[-10, 0, 15]}
        target-position={[1, -15, -5]}
        angle={0.4}
        penumbra={0.3}
        intensity={Math.max(1.0, 0.5 + normalized)} // Side fill light
        color="#ffffff"
      />
      <pointLight
        position={[1, -10, -3]}
        intensity={Math.max(1.0, 0.8 + normalized * 0.5)} // Always at least 1.0
        color="#ffffcc"
        distance={30}
      />
      {/* Additional front light for dark weather */}
      {normalized < 0.5 && (
        <directionalLight
          position={[0, 0, 20]}
          target-position={[1, -15, -5]}
          intensity={1.2 - normalized * 2} // Stronger in fear states
          color="#ffffff"
        />
      )}
      
      {/* Dollar Bills - burn only in extreme fear (< 25) */}
      {fearGreedIndex < 25 ? (
        <BurningDollarBills 
          count={40} 
          radius={30} 
          height={170} 
          speed={3 + weatherIntensity * 3}
          startY={120}
          endY={-50}
        />
      ) : (
        <SpiralDollarBills 
          count={40} 
          radius={30} 
          height={170} 
          speed={2 + (1 - weatherIntensity) * 2} // Faster in calm weather
          startY={120}
          endY={-50}
        />
      )}
      
      {/* Rain - only in fear states */}
      {config.rainCount > 0 && (
        <RainEffect 
          count={config.rainCount} 
          speed={0.5 + weatherIntensity * 0.5}
          windStrength={weatherIntensity * 0.3}
        />
      )}
    </>
  );
};

export default PhysicsWeatherClouds;