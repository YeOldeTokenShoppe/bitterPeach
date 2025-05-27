import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Html } from '@react-three/drei';
import * as THREE from 'three';

// Individual candle component (using cube for now)
function MarqueeCandle({ position, userData, index, onClick, isLeader }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle bobbing animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
      
      // Slight rotation
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });
  
  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(userData);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.8, 1.2, 0.8]} />
        <meshStandardMaterial 
          color={isLeader ? "#FFD700" : hovered ? "#ff6b6b" : "#8b7dd8"}
          emissive={isLeader ? "#FFD700" : hovered ? "#ff6b6b" : "#8b7dd8"}
          emissiveIntensity={hovered ? 0.5 : 0.2}
        />
      </mesh>
      
      {/* Rank badge */}
      <Html
        position={[0, 0.8, 0]}
        center
        style={{
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'white',
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}
      >
        #{index + 1}
      </Html>
      
      {/* Username on hover */}
      {hovered && (
        <Html
          position={[0, -0.8, 0]}
          center
          style={{
            fontSize: '10px',
            color: 'white',
            background: 'rgba(0,0,0,0.8)',
            padding: '2px 6px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none'
          }}
        >
          {userData?.username || `User ${index + 1}`}
        </Html>
      )}
    </group>
  );
}

// Marquee container that manages the movement
function CandleMarquee({ candleData, onCandleClick }) {
  const groupRef = useRef();
  const scrollSpeed = 0.5; // Adjust for speed
  const spacing = 2.5; // Space between candles
  const curveRadius = 8; // Radius of the arc
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Move the entire group
      groupRef.current.rotation.y -= delta * scrollSpeed;
    }
  });
  
  // Calculate positions along a curve
  const positions = candleData.map((_, index) => {
    const angle = (index / candleData.length) * Math.PI * 2;
    const x = Math.sin(angle) * curveRadius;
    const z = Math.cos(angle) * curveRadius - curveRadius; // Offset to front
    return [x, 0, z];
  });
  
  return (
    <group ref={groupRef}>
      {candleData.map((userData, index) => (
        <MarqueeCandle
          key={userData.id || index}
          position={positions[index]}
          userData={userData}
          index={index}
          onClick={onCandleClick}
          isLeader={index === 0}
        />
      ))}
    </group>
  );
}

// Main component
export default function MobileCandleMarquee({ 
  candleData = [], 
  onCandleClick,
  height = 150 // Height of the marquee strip
}) {
  // Mock data for testing
  const mockData = candleData.length > 0 ? candleData : Array(8).fill(null).map((_, i) => ({
    id: i,
    username: `Player${i + 1}`,
    score: Math.floor(Math.random() * 1000)
  }));
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '60px', // Adjust based on your nav bar height
        left: 0,
        right: 0,
        height: `${height}px`,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        pointerEvents: 'auto',
        zIndex: 10
      }}
    >
      <Canvas
        camera={{ 
          position: [0, 2, 8], 
          fov: 45,
          near: 0.1,
          far: 100
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <CandleMarquee 
          candleData={mockData}
          onCandleClick={onCandleClick}
        />
        
        {/* Optional: Add fog for depth */}
        <fog attach="fog" args={['#000000', 5, 15]} />
      </Canvas>
      
      {/* Gradient overlays for fade effect */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '15%',
          height: '100%',
          background: 'linear-gradient(to right, rgba(0,0,0,1), transparent)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '15%',
          height: '100%',
          background: 'linear-gradient(to left, rgba(0,0,0,1), transparent)',
          pointerEvents: 'none'
        }}
      />
    </div>
  );
}