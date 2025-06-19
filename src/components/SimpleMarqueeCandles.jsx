import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// Simple candle mesh component
function SimpleCandle({ position, userData, index, onClick, scrollSpeed }) {
  const groupRef = useRef();
  const meshRef = useRef();
  const flameRef = useRef();
  
  // Create candle geometry
  const candleGeometry = useMemo(() => new THREE.CylinderGeometry(0.1, 0.12, 0.8, 12), []);
  const wickGeometry = useMemo(() => new THREE.CylinderGeometry(0.01, 0.01, 0.1, 6), []);
  const flameGeometry = useMemo(() => new THREE.SphereGeometry(0.05, 8, 6), []);
  
  // Create materials
  const candleMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: userData?.burnedAmount > 500 ? '#FFD700' : '#F5DEB3',
    metalness: 0.1,
    roughness: 0.7
  }), [userData]);
  
  const wickMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#2F4F4F',
    roughness: 1
  }), []);
  
  const flameMaterial = useMemo(() => new THREE.MeshBasicMaterial({ 
    color: '#FFA500',
    emissive: '#FF4500',
    emissiveIntensity: 2,
    transparent: true,
    opacity: 0.8
  }), []);
  
  // Load user texture if available
  React.useEffect(() => {
    if (userData?.image && meshRef.current) {
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(userData.image, (texture) => {
        // Create a label material with the texture
        const labelMaterial = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true
        });
        meshRef.current.material = [candleMaterial, labelMaterial];
      });
    }
  }, [userData, candleMaterial]);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle rotation
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3 + index;
      
      // Flame flicker
      if (flameRef.current) {
        const flicker = Math.sin(state.clock.elapsedTime * 10 + index) * 0.1;
        flameRef.current.scale.set(1 + flicker * 0.2, 1 + flicker * 0.3, 1 + flicker * 0.2);
        flameRef.current.position.y = 0.5 + flicker * 0.02;
      }
    }
  });
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        ...userData,
        candleId: `simple-candle-${index}`,
        candleTimestamp: Date.now(),
      });
    }
  };
  
  return (
    <group ref={groupRef} position={position} onClick={handleClick}>
      {/* Candle body */}
      <mesh ref={meshRef} geometry={candleGeometry} material={candleMaterial} />
      
      {/* Wick */}
      <mesh geometry={wickGeometry} material={wickMaterial} position={[0, 0.45, 0]} />
      
      {/* Flame */}
      <mesh ref={flameRef} geometry={flameGeometry} material={flameMaterial} position={[0, 0.5, 0]}>
        <pointLight color="#FFA500" intensity={0.5} distance={1} decay={2} />
      </mesh>
      
      {/* User name label */}
      {userData?.userName && (
        <Text
          position={[0, -0.6, 0.2]}
          fontSize={0.15}
          color="#E9D5FF"
          anchorX="center"
          anchorY="middle"
          font="/fonts/EnglishTowne.ttf"
        >
          {userData.userName}
        </Text>
      )}
      
      {/* Burn amount */}
      {userData?.burnedAmount !== undefined && (
        <Text
          position={[0, -0.8, 0.2]}
          fontSize={0.1}
          color="#A78BFA"
          anchorX="center"
          anchorY="middle"
        >
          {userData.burnedAmount} burned
        </Text>
      )}
    </group>
  );
}

// Main marquee component
export default function SimpleMarqueeCandles({ 
  candleData = [], 
  onCandleClick, 
  currentPage = 0,
  itemsPerPage = 10,
  scrollSpeed = 0.5
}) {
  const groupRef = useRef();
  const scrollPositionRef = useRef(0);
  
  // Get current page data
  const currentPageData = useMemo(() => {
    const startIdx = currentPage * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    
    if (candleData.length > 0) {
      return candleData.slice(startIdx, endIdx);
    }
    
    // Mock data for testing
    return Array(itemsPerPage).fill(null).map((_, i) => ({
      id: `mock-${startIdx + i}`,
      userName: `Player${startIdx + i + 1}`,
      burnedAmount: Math.floor(Math.random() * 1000),
      image: i % 2 === 0 ? '/vvv.jpg' : '/vsClown.jpg'
    }));
  }, [candleData, currentPage, itemsPerPage]);
  
  // Create duplicated data for seamless scrolling
  const duplicatedData = useMemo(() => {
    // Create three sets for smooth looping
    return [...currentPageData, ...currentPageData, ...currentPageData];
  }, [currentPageData]);
  
  // Animate the marquee
  useFrame(() => {
    if (groupRef.current && duplicatedData.length > 0) {
      scrollPositionRef.current += scrollSpeed * 0.01;
      
      // Calculate total width of one set of candles
      const spacing = 1.5;
      const totalWidth = currentPageData.length * spacing;
      
      // Reset position when scrolled one full set
      if (scrollPositionRef.current > totalWidth) {
        scrollPositionRef.current -= totalWidth;
      }
      
      groupRef.current.position.x = -scrollPositionRef.current;
    }
  });
  
  return (
    <group position={[0, -2.5, -4]}>
      {/* Background strip */}
      <mesh position={[0, -0.9, -0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 2]} />
        <meshStandardMaterial 
          color="#1e1b4b" 
          transparent 
          opacity={0.8}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>
      
      {/* The scrolling candles */}
      <group ref={groupRef}>
        {duplicatedData.map((userData, index) => {
          const spacing = 1.5;
          const xPos = index * spacing;
          
          return (
            <SimpleCandle
              key={`candle-${currentPage}-${index}`}
              position={[xPos, 0, 0]}
              userData={userData}
              index={index}
              onClick={onCandleClick}
              scrollSpeed={scrollSpeed}
            />
          );
        })}
      </group>
      
      {/* Gradient fade edges */}
      <mesh position={[-8, -0.5, 0.1]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2, 3]} />
        <shaderMaterial
          transparent
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            void main() {
              float alpha = smoothstep(0.0, 1.0, vUv.x);
              gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
            }
          `}
        />
      </mesh>
      
      <mesh position={[8, -0.5, 0.1]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2, 3]} />
        <shaderMaterial
          transparent
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            void main() {
              float alpha = smoothstep(0.0, 1.0, vUv.x);
              gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
            }
          `}
        />
      </mesh>
    </group>
  );
}