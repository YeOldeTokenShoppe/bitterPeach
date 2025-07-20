import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import useCryptoData from '../../hooks/useCryptoData';

const PriceIndicator = ({ data, index, is80sMode }) => {
  const meshRef = useRef();
  const startPosition = useMemo(() => {
    // Spread out horizontally
    const x = (index - 0.5) * 8; // -4 for BTC, 4 for ETH
    const y = 0;
    const z = -5;
    return new THREE.Vector3(x, y, z);
  }, [index]);
  
  const velocity = useRef(0);
  const position = useRef(new THREE.Vector3(...startPosition));
  
  // Colors based on mode and price change
  const textColor = useMemo(() => {
    if (is80sMode) {
      return data.changePercent >= 0 ? '#00ff41' : '#ff0066';
    }
    return data.changePercent >= 0 ? '#4CD964' : '#FF3B30';
  }, [data.changePercent, is80sMode]);
  
  const nameColor = is80sMode ? '#67e8f9' : '#FFFFFF';
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Calculate velocity based on price change
    const targetVelocity = data.changePercent * 0.01; // Scale down the movement
    velocity.current += (targetVelocity - velocity.current) * 0.02; // Smooth transition
    
    // Update position
    position.current.y += velocity.current * delta * 50;
    
    // Reset position if it goes too far
    if (position.current.y > 15 || position.current.y < -15) {
      position.current.y = 0;
      // Add some random horizontal drift when resetting
      position.current.x = startPosition.x + (Math.random() - 0.5) * 2;
    }
    
    // Gentle horizontal floating motion
    position.current.x += Math.sin(state.clock.elapsedTime * 0.5 + index * Math.PI) * 0.01;
    
    // Apply position
    meshRef.current.position.copy(position.current);
    
    // Gentle rotation
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3 + index * Math.PI) * 0.1;
  });
  
  const formatPrice = (price) => {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const formatChange = (change) => {
    const arrow = change >= 0 ? '▲' : '▼';
    return `${arrow} ${Math.abs(change).toFixed(2)}%`;
  };
  
  return (
    <group ref={meshRef}>
      {/* Background plane for better visibility */}
      <mesh position={[0, 0, -0.1]}>
        <planeGeometry args={[6, 3]} />
        <meshBasicMaterial 
          color={is80sMode ? '#000000' : '#000000'} 
          transparent 
          opacity={0.3} 
        />
      </mesh>
      
      {/* Crypto name */}
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.8}
        color={nameColor}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {data.name}
      </Text>
      
      {/* Price */}
      <Text
        position={[0, 0, 0]}
        fontSize={1.2}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {formatPrice(data.price)}
      </Text>
      
      {/* Change percentage */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.6}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {formatChange(data.changePercent)}
      </Text>
    </group>
  );
};

const FloatingPriceIndicators = ({ is80sMode }) => {
  const { cryptoData, loading } = useCryptoData();
  
  if (loading || cryptoData.length === 0) {
    return null;
  }
  
  return (
    <group>
      {cryptoData.map((crypto, index) => (
        <PriceIndicator 
          key={crypto.symbol} 
          data={crypto} 
          index={index}
          is80sMode={is80sMode}
        />
      ))}
    </group>
  );
};

export default FloatingPriceIndicators;