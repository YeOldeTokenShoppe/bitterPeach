import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Individual candle component
function MarqueeCandle({ position, candleObject, userData, index, onClick }) {
  const groupRef = useRef();
  const candleRef = useRef();
  
  // Setup candle on mount
  useEffect(() => {
    if (!candleObject || !groupRef.current) return;
    
    // Scale the candle appropriately
    candleObject.scale.set(7.5, 7.5, 7.5);
    
    // Center the candle
    const box = new THREE.Box3().setFromObject(candleObject);
    const center = box.getCenter(new THREE.Vector3());
    candleObject.position.sub(center);
    candleObject.position.y = 0;
    
    // Apply user data
    if (userData) {
      candleObject.userData = {
        ...candleObject.userData,
        ...userData,
        hasUser: true
      };
      
      // Apply user image to labels if available
      if (userData.image) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(userData.image, (texture) => {
          candleObject.traverse((child) => {
            if (child.name?.includes('Label1')) {
              if (child.material) {
                child.material = child.material.clone();
                const flippedTexture = texture.clone();
                flippedTexture.center.set(0.5, 0.5);
                flippedTexture.repeat.set(1, -1);
                flippedTexture.needsUpdate = true;
                child.material.map = flippedTexture;
                child.material.needsUpdate = true;
              }
            } else if (child.name?.includes('Label2')) {
              if (child.material) {
                child.material = child.material.clone();
                child.material.map = texture;
                child.material.needsUpdate = true;
              }
            }
          });
        });
      }
    }
    
    candleRef.current = candleObject;
    groupRef.current.add(candleObject);
    
    return () => {
      if (candleRef.current && groupRef.current) {
        groupRef.current.remove(candleRef.current);
      }
    };
  }, [candleObject, userData]);
  
  useFrame((state) => {
    if (candleRef.current) {
      // Gentle rotation
      candleRef.current.rotation.y = state.clock.elapsedTime * 0.5 + index;
    }
  });
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick({
        ...userData,
        candleId: `horizontal-marquee-candle-${index}`,
        candleTimestamp: Date.now(),
      });
    }
  };
  
  return (
    <group ref={groupRef} position={position} onClick={handleClick}>
      {/* Candle object is added in useEffect */}
    </group>
  );
}

// Main horizontal marquee component
export default function HorizontalMarqueeCandles({ 
  candleData = [], 
  onCandleClick,
  currentPage = 0,
  itemsPerPage = 10,
  scrollSpeed = 1
}) {
  const groupRef = useRef();
  const [vcandleObjects, setVcandleObjects] = useState([]);
  const scrollPositionRef = useRef(0);
  
  // Load the candle model
  const { scene: candleModel } = useGLTF('/singleCandleAnimatedFlame.glb');
  
  // Extract candle object from loaded model
  useEffect(() => {
    if (!candleModel) return;
    
    // Create multiple clones of the candle for the marquee
    const extractedCandles = [];
    const numCandles = Math.max(itemsPerPage * 2, 20); // Double for seamless scrolling
    
    for (let i = 0; i < numCandles; i++) {
      const clonedCandle = candleModel.clone(true);
      clonedCandle.userData = { ...candleModel.userData };
      clonedCandle.visible = true;
      clonedCandle.traverse((descendant) => {
        descendant.visible = true;
        if (descendant.material) {
          if (Array.isArray(descendant.material)) {
            descendant.material = descendant.material.map(mat => mat.clone());
          } else {
            descendant.material = descendant.material.clone();
          }
        }
      });
      
      extractedCandles.push({
        object: clonedCandle,
        name: `CANDLE_${i}`,
        userData: candleModel.userData
      });
    }
    
    setVcandleObjects(extractedCandles);
  }, [candleModel, itemsPerPage]);
  
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
    if (vcandleObjects.length === 0) return [];
    
    // Duplicate data for seamless loop
    const dataToUse = [...currentPageData, ...currentPageData];
    
    return dataToUse.map((userData, index) => {
      const vcandleIndex = index % vcandleObjects.length;
      const clonedCandle = vcandleObjects[vcandleIndex].object.clone(true);
      
      clonedCandle.traverse((child) => {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(mat => mat.clone());
          } else {
            child.material = child.material.clone();
          }
        }
      });
      
      return {
        userData: {
          ...userData,
          userName: userData.userName || userData.username || `Player ${index + 1}`,
          image: userData.image || userData.profileImage || null,
          burnedAmount: userData.burnedAmount || 0,
        },
        candleObject: clonedCandle,
        originalName: `${vcandleObjects[vcandleIndex].name}-horizontal-marquee-${index}`,
      };
    });
  }, [currentPageData, vcandleObjects]);
  
  // Store animated positions
  const [animatedPositions, setAnimatedPositions] = useState([]);
  
  // Reset scroll position when page changes
  useEffect(() => {
    scrollPositionRef.current = 0;
  }, [currentPage]);
  
  // Animate the horizontal marquee
  useFrame(() => {
    if (duplicatedData.length > 0) {
      scrollPositionRef.current += scrollSpeed * 0.01;
      
      const spacing = 20; // Space between candles
      const totalWidth = duplicatedData.length * spacing / 2; // Total width of all candles
      
      // Update positions for all candles
      const newPositions = duplicatedData.map((_, index) => {
        // Calculate base position
        let xPos = (index * spacing) - scrollPositionRef.current;
        
        // Wrap around for seamless scrolling
        if (xPos < -totalWidth) {
          xPos += totalWidth * 2;
        }
        
        // Only show candles within visible range
        const isVisible = xPos > -30 && xPos < 30;
        
        return { xPos, isVisible };
      });
      
      setAnimatedPositions(newPositions);
      
      // Reset scroll when it completes one full cycle
      if (scrollPositionRef.current > totalWidth) {
        scrollPositionRef.current -= totalWidth;
      }
    }
  });
  
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {duplicatedData.map((item, index) => {
        const pos = animatedPositions[index] || { xPos: 0, isVisible: true };
        
        if (!pos.isVisible) return null;
        
        return (
          <MarqueeCandle
            key={`${currentPage}-${item.originalName || index}`}
            position={[pos.xPos, 0, 0]}
            candleObject={item.candleObject}
            userData={item.userData}
            index={index}
            onClick={onCandleClick}
          />
        );
      })}
    </group>
  );
}

// Preload the candle model
useGLTF.preload('/singleCandleAnimatedFlame.glb');