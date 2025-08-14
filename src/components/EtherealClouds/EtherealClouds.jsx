import React from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import DarkClouds from '../3DVotiveStand/Clouds';
import PostProcessingEffects from '../3DVotiveStand/PostProcessingEffects';
import EnhancedVolumetricLight from './EnhancedVolumetricLight';
import SkySphere from './SkySphere';
import SpiralDollarBills from './SpiralDollarBills';
import CoinSparkles from './CoinSparkles';

// Madonna Model Component
const MadonnaModel = ({ position = [0, -1, 1], scale = 1, goldCoinRef, coinsRef }) => {
  const { scene } = useGLTF('/madonnina-static-pose-no-animations.glb');
  
  React.useEffect(() => {
    // Log all meshes to identify the duplicate feet
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
        
        console.log(`Mesh: ${child.name}`, {
          parent: child.parent?.name,
          position: `(${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})`,
          size: `(${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`,
        });
      }
    });
    
    // Look for meshes that might be feet based on position or name
    const possibleFeet = meshList.filter(mesh => {
      // Check if mesh is low (feet would be at negative Y)
      // or if name contains foot-related terms
      return mesh.worldPosition.y < -10 || 
             mesh.name.toLowerCase().includes('foot') ||
             mesh.name.toLowerCase().includes('feet') ||
             mesh.name.toLowerCase().includes('shoe') ||
             mesh.name.toLowerCase().includes('leg');
    });
    
    console.log('=== Possible feet meshes ===', possibleFeet);
    
    // Standard visibility setup
    scene.traverse((child) => {
      if (child.isMesh) {
        // Hide collision mesh
        if (child.name === 'collision') {
          child.visible = false;
          return;
        }
        
        // Hide the T-pose version
        if (child.parent?.name === 'lady' && child.parent?.parent?.name === 'lady') {
          child.visible = false;
          console.log('Hiding T-pose mesh:', child.name);
          return;
        }
        
        // Show everything else
        child.visible = true;
      }
    });
    
    // Find all coin objects - they are Groups in the model
    const coinNames = ['Object_5', 'Object_5001', 'Object_5002', 'Object_5003', 'Object_5004', 'Object_5005'];
    const foundCoins = [];
    
    // First try to find objects by exact name
    coinNames.forEach((coinName) => {
      const coin = scene.getObjectByName(coinName);
      if (coin) {
        foundCoins.push(coin);
        console.log(`Found coin: ${coinName}`, coin);
      }
    });
    
    // If we didn't find all coins, search more broadly
    if (foundCoins.length < 6) {
      scene.traverse((child) => {
        if (coinNames.includes(child.name) && !foundCoins.includes(child)) {
          foundCoins.push(child);
          console.log(`Found coin via traverse: ${child.name}`, child);
        }
        // Also check if the coin names might be in the mesh children
        if (child.isMesh && child.parent && coinNames.includes(child.parent.name) && !foundCoins.find(c => c === child.parent)) {
          foundCoins.push(child.parent);
          console.log(`Found coin parent: ${child.parent.name}`, child.parent);
        }
      });
    }
    
    if (coinsRef) {
      coinsRef.current = foundCoins;
      console.log(`Found ${foundCoins.length} coins for rotation`, foundCoins);
      
      // Log the structure of found coins
      foundCoins.forEach((coin, index) => {
        console.log(`Coin ${index}: ${coin.name}, type: ${coin.type}, isMesh: ${coin.isMesh}, children: ${coin.children?.length || 0}`);
      });
    }
    
    // Also keep the original GoldCoin logic
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
      console.log('Found GoldCoin mesh for rotation');
    }
    
    // Configure materials only for visible meshes
    scene.traverse((child) => {
      if (child.isMesh && child.visible) {
        // Enable skinning if needed
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
        }
        
        // Handle materials
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            mat.transparent = false;
            mat.opacity = 1;
            mat.side = THREE.DoubleSide;
            if (mat.metalness !== undefined) mat.metalness = 0.1;
            if (mat.roughness !== undefined) mat.roughness = 0.8;
          });
        }
      }
    });
    
    // Log scene structure for debugging
    console.log('Scene structure:');
    scene.traverse((obj) => {
      if (obj.name) {
        console.log(`${obj.type}: ${obj.name}`);
      }
    });
    
  }, [scene, goldCoinRef, coinsRef]);
  
  return (
    <primitive 
      object={scene} 
      position={position} 
      scale={scale}
      rotation={[0, -Math.PI / 12, 0]}
    />
  );
};

// Preload the model
useGLTF.preload('/madonnina-static-pose-no-animations.glb');

const EtherealClouds = () => {
  const goldCoinRef = React.useRef();
  const coinsRef = React.useRef([]);
  const [coinPositions, setCoinPositions] = React.useState([]);
  
  // Rotate all coins in place in different directions
  useFrame((state, delta) => {
    if (goldCoinRef.current) {
      goldCoinRef.current.rotateZ(0.01);
    }
    
    // Rotate each coin with different speeds and axes
    if (coinsRef.current && coinsRef.current.length > 0) {
      const newPositions = [];
      
      coinsRef.current.forEach((coin) => {
        if (coin) {
          // Each coin gets unique rotation speeds
          const speed = 0.004;
          
          // Try both direct rotation and using rotateX/Y/Z methods
          if (coin.rotation) {
            coin.rotation.x += speed;
            coin.rotation.y += speed;
            coin.rotation.z += speed;
          } else if (coin.rotateX) {
            coin.rotateX(speed);
            coin.rotateY(speed);
            coin.rotateZ(speed);
          }
          
          // Also try to rotate children if the coin is a container
          if (coin.children && coin.children.length > 0) {
            coin.children.forEach(child => {
              if (child.isMesh && child.rotation) {
                child.rotation.x += speed;
                child.rotation.y += speed;
                child.rotation.z += speed;
              }
            });
          }
          
          // Get world position for sparkles
          const worldPos = new THREE.Vector3();
          coin.getWorldPosition(worldPos);
          newPositions.push([worldPos.x, worldPos.y, worldPos.z]);
        }
      });
      
      // Update coin positions for sparkles
      if (newPositions.length > 0 && newPositions.length !== coinPositions.length) {
        setCoinPositions(newPositions);
      }
    }
  });
  
  return (
    <>
      {/* Sky sphere background */}
      <SkySphere />
      
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
      
      {/* Dark clouds for atmosphere */}
      <DarkClouds />
      
      {/* Post-processing effects */}
      <PostProcessingEffects />
      
      {/* Enhanced volumetric light rays */}
      <EnhancedVolumetricLight 
        position={[0, 120, 10]} 
        target={[3, -30, 0]}
        color="#ffffee"
        intensity={2.0}
      />
      
      {/* Madonna Model in center */}
      <MadonnaModel position={[1, 15, -9]} scale={15} goldCoinRef={goldCoinRef} coinsRef={coinsRef} />
      
      {/* Coin sparkle effects */}
      {/* {coinPositions.map((pos, index) => (
        <CoinSparkles 
          key={index}
          coinPosition={pos}
          particleCount={10 + index * .01}
        />
      ))}
       */}
      {/* Spiraling Dollar Bills */}
      <SpiralDollarBills 
        count={40} 
        radius={30} 
        height={170} 
        speed={3}
        startY={120}
        endY={-50}
      />
    </>
  );
};

export default EtherealClouds;