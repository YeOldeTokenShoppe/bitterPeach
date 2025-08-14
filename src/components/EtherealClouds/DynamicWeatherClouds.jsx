import React, { useState, useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import DarkClouds from '../3DVotiveStand/Clouds';
import StormClouds from './StormClouds';
import PostProcessingEffects from '../3DVotiveStand/PostProcessingEffects';
import EnhancedVolumetricLight from './EnhancedVolumetricLight';
import SkySphere from './SkySphere';
import StormySky from './StormySky';
import SpiralDollarBills from './SpiralDollarBills';
import BurningDollarBills from './BurningDollarBills';
import RainEffect from './RainEffect';
import LightningSystem from './LightningSystem';

// Madonna Model Component (same as before)
const MadonnaModel = ({ position = [0, -1, 1], scale = 1, goldCoinRef }) => {
  const { scene } = useGLTF('/madonnina-static-pose-no-animations.glb');
  
  React.useEffect(() => {
    console.log('=== All meshes in scene ===');
    const meshList = [];
    scene.traverse((child) => {
      if (child.isMesh) {
        const bounds = new THREE.Box3().setFromObject(child);
        const size = new THREE.Vector3();
        bounds.getSize(size);
        
        meshList.push({
          name: child.name,
          parent: child.parent?.name,
          position: child.position,
          worldPosition: child.getWorldPosition(new THREE.Vector3()),
          size: size,
          visible: child.visible
        });
      }
    });
    
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
    <primitive 
      object={scene} 
      position={position} 
      scale={scale}
      rotation={[0, -0.5, 0]}
    />
  );
};

useGLTF.preload('/madonnina-static-pose-no-animations.glb');

// Weather states based on Fear & Greed Index
// 0-25: Extreme Fear (Apocalyptic Storm)
// 25-45: Fear (Heavy Storm)
// 45-55: Neutral (Overcast)
// 55-75: Greed (Partly Cloudy)
// 75-100: Extreme Greed (Heavenly/Ethereal)

const DynamicWeatherClouds = ({ onDataUpdate }) => {
  const goldCoinRef = useRef();
  const lightningFlashRef = useRef();
  const [lightningIntensity, setLightningIntensity] = useState(0);
  const [fearGreedIndex, setFearGreedIndex] = useState(50); // Default neutral
  const [loading, setLoading] = useState(true);
  const [weatherState, setWeatherState] = useState('neutral');
  
  // Fetch Fear & Greed Index using your existing API setup
  useEffect(() => {
    const fetchFearGreedIndex = async () => {
      try {
        // First try your Firebase function with CoinMarketCap API
        const response = await fetch(
          "https://us-central1-hailmary-3ff6c.cloudfunctions.net/getFearAndGreed"
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.data) {
            const value = parseInt(data.data.value);
            setFearGreedIndex(value);
            
            // Determine weather state
            if (value < 25) {
              setWeatherState('extremeFear');
            } else if (value < 45) {
              setWeatherState('fear');
            } else if (value < 55) {
              setWeatherState('neutral');
            } else if (value < 75) {
              setWeatherState('greed');
            } else {
              setWeatherState('extremeGreed');
            }
            setLoading(false);
            
            // Update parent component
            if (onDataUpdate) {
              onDataUpdate({
                value: value,
                classification: data.data.value_classification || getClassification(),
                weatherState: weatherState
              });
            }
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to fetch from CoinMarketCap API, trying alternative...");
      }
      
      // Fallback to alternative.me API
      try {
        const altResponse = await fetch("https://api.alternative.me/fng/");
        const altData = await altResponse.json();
        
        if (altData && altData.data && altData.data[0]) {
          const value = parseInt(altData.data[0].value);
          setFearGreedIndex(value);
          
          // Determine weather state
          if (value < 25) {
            setWeatherState('extremeFear');
          } else if (value < 45) {
            setWeatherState('fear');
          } else if (value < 55) {
            setWeatherState('neutral');
          } else if (value < 75) {
            setWeatherState('greed');
          } else {
            setWeatherState('extremeGreed');
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching Fear & Greed Index:', error);
        // Use a default neutral value if all APIs fail
        setFearGreedIndex(50);
        setWeatherState('neutral');
        setLoading(false);
      }
    };
    
    fetchFearGreedIndex();
    // Refresh every 5 minutes
    const interval = setInterval(fetchFearGreedIndex, 300000);
    
    return () => clearInterval(interval);
  }, []);
  
  useFrame((_, delta) => {
    if (goldCoinRef.current) {
      goldCoinRef.current.rotateZ(0.01);
    }
    
    if (lightningFlashRef.current && lightningIntensity > 0) {
      lightningFlashRef.current.intensity = lightningIntensity;
      setLightningIntensity(prev => Math.max(0, prev - delta * 5));
    }
  });
  
  const triggerLightning = () => {
    if (weatherState === 'extremeFear' || weatherState === 'fear') {
      setLightningIntensity(Math.random() * 3 + 2);
    }
  };
  
  // Calculate normalized value for interpolations
  const normalized = fearGreedIndex / 100; // 0 to 1, where 0 is extreme fear, 1 is extreme greed
  
  // Calculate weather parameters based on index
  const getWeatherParams = () => {
    return {
      skyColor: new THREE.Color().lerpColors(
        new THREE.Color('#1a2030'), // Dark storm
        new THREE.Color('#87CEEB'), // Clear sky
        normalized
      ),
      ambientIntensity: 0.1 + normalized * 0.3,
      ambientColor: new THREE.Color().lerpColors(
        new THREE.Color('#3a4a5a'), // Cold blue-grey
        new THREE.Color('#ffffff'), // Warm white
        normalized
      ),
      cloudDarkness: 1 - normalized, // Darker clouds for fear
      rainIntensity: weatherState === 'extremeFear' ? 3000 : 
                     weatherState === 'fear' ? 1500 : 
                     weatherState === 'neutral' ? 500 : 0,
      showLightning: weatherState === 'extremeFear' || weatherState === 'fear',
      billsBurning: fearGreedIndex < 45, // Bills burn in fear states
      windStrength: (1 - normalized) * 0.3,
      volumetricLightIntensity: normalized * 2, // More divine light in greed
      volumetricLightColor: new THREE.Color().lerpColors(
        new THREE.Color('#8a9aaa'), // Grey
        new THREE.Color('#ffffee'), // Golden
        normalized
      )
    };
  };
  
  const params = getWeatherParams();
  
  // Get weather description
  const getWeatherDescription = () => {
    switch(weatherState) {
      case 'extremeFear': return 'Apocalyptic Storm';
      case 'fear': return 'Heavy Storm';
      case 'neutral': return 'Overcast';
      case 'greed': return 'Partly Cloudy';
      case 'extremeGreed': return 'Heavenly';
      default: return 'Loading...';
    }
  };
  
  // Get classification text
  const getClassification = () => {
    if (fearGreedIndex < 25) return 'Extreme Fear';
    if (fearGreedIndex < 45) return 'Fear';
    if (fearGreedIndex < 55) return 'Neutral';
    if (fearGreedIndex < 75) return 'Greed';
    return 'Extreme Greed';
  };
  
  return (
    <>
      
      {/* Dynamic Sky */}
      {weatherState === 'extremeFear' || weatherState === 'fear' ? (
        <StormySky />
      ) : (
        <mesh scale={[500, 500, 500]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial 
            color={params.skyColor} 
            side={THREE.BackSide}
            fog={false}
          />
        </mesh>
      )}
      
      {/* Dynamic Ambient Lighting */}
      <ambientLight 
        intensity={params.ambientIntensity} 
        color={params.ambientColor} 
      />
      
      {/* Main Directional Lights */}
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={0.3 + normalized * 0.9} 
        color={weatherState === 'extremeGreed' ? '#ffeecc' : '#7a8a9a'}
        castShadow
      />
      <directionalLight 
        position={[-5, 5, 5]} 
        intensity={0.2 + normalized * 0.6} 
        color={weatherState === 'extremeGreed' ? '#ffffff' : '#6a7a8a'}
      />
      
      {/* Lightning Flash Light */}
      {params.showLightning && (
        <pointLight
          ref={lightningFlashRef}
          position={[0, 30, 0]}
          intensity={0}
          color="#e0f0ff"
          distance={200}
          decay={1.5}
        />
      )}
      
      {/* Dynamic Clouds */}
      {weatherState === 'extremeFear' || weatherState === 'fear' ? (
        <StormClouds />
      ) : (
        <DarkClouds />
      )}
      
      <PostProcessingEffects />
      
      {/* Dynamic Volumetric Light */}
      <EnhancedVolumetricLight 
        position={[0, 120, 20]} 
        target={[3, -30, 0]}
        color={params.volumetricLightColor}
        intensity={params.volumetricLightIntensity}
      />
      
      {/* Madonna Model */}
      <MadonnaModel position={[1, -15, -5]} scale={15} goldCoinRef={goldCoinRef} />
      
      {/* Madonna Lighting */}
      <spotLight
        position={[0, 20, 20]}
        target-position={[1, -15, -5]}
        angle={0.3}
        penumbra={0.5}
        intensity={1 + normalized}
        color="#ffffff"
        castShadow
      />
      <spotLight
        position={[-10, 0, -20]}
        target-position={[1, -15, -5]}
        angle={0.4}
        penumbra={0.3}
        intensity={1.5}
        color={weatherState === 'extremeGreed' ? '#ffeecc' : '#8ac8ff'}
      />
      <pointLight
        position={[1, -10, -3]}
        intensity={0.5 + normalized * 0.5}
        color={weatherState === 'extremeGreed' ? '#ffffcc' : '#ffffff'}
        distance={25}
        decay={1.5}
      />
      
      {/* Dynamic Dollar Bills */}
      {params.billsBurning ? (
        <BurningDollarBills 
          count={40} 
          radius={30} 
          height={170} 
          speed={3 + params.windStrength * 10}
          startY={120}
          endY={-50}
        />
      ) : (
        <SpiralDollarBills 
          count={40} 
          radius={30} 
          height={170} 
          speed={3 + params.windStrength * 10}
          startY={120}
          endY={-50}
        />
      )}
      
      {/* Rain Effect */}
      {params.rainIntensity > 0 && (
        <RainEffect 
          count={params.rainIntensity} 
          speed={0.5 + params.windStrength}
          windStrength={params.windStrength}
        />
      )}
      
      {/* Lightning System */}
      {params.showLightning && (
        <LightningSystem onLightning={triggerLightning} />
      )}
    </>
  );
};

export default DynamicWeatherClouds;