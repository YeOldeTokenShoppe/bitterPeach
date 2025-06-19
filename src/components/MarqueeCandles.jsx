import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Individual candle component
function MarqueeCandle({ position, candleObject, userData, index, onClick, scrollSpeed }) {
  const groupRef = useRef();
  const candleRef = useRef();
  
  // Setup candle on mount
  useEffect(() => {
    if (!candleObject || !groupRef.current) return;
    
    // Scale the candle appropriately
    candleObject.scale.set(0.3, 0.3, 0.3);
    
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
        candleId: `marquee-candle-${index}`,
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

// Main marquee component
export default function MarqueeCandles({ 
  candleData = [], 
  onCandleClick, 
  modelRef,
  currentPage = 0,
  itemsPerPage = 10,
  scrollSpeed = 0.5
}) {
  const groupRef = useRef();
  const [vcandleObjects, setVcandleObjects] = useState([]);
  const scrollPositionRef = useRef(0);
  
  // Extract VCANDLE objects from model
  useEffect(() => {
    if (!modelRef?.current) return;
    
    const extractedCandles = [];
    
    modelRef.current.traverse((child) => {
      if (child.name && child.name.startsWith('VCANDLE')) {
        const clonedCandle = child.clone(true);
        clonedCandle.userData = { ...child.userData };
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
          name: child.name,
          userData: child.userData
        });
      }
    });
    
    extractedCandles.sort((a, b) => {
      const numA = parseInt(a.name.replace('VCANDLE', ''));
      const numB = parseInt(b.name.replace('VCANDLE', ''));
      return numA - numB;
    });
    
    setVcandleObjects(extractedCandles);
  }, [modelRef]);
  
  // Get current page data
  const currentPageData = useMemo(() => {
    const startIdx = currentPage * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    
    console.log('MarqueeCandles pagination:', {
      currentPage,
      itemsPerPage,
      startIdx,
      endIdx,
      candleDataLength: candleData.length,
      slicedData: candleData.slice(startIdx, endIdx)
    });
    
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
    
    // Only use currentPageData once to avoid doubling
    const dataToUse = [...currentPageData];
    
    console.log('Creating duplicated data:', {
      vcandleObjectsLength: vcandleObjects.length,
      currentPageDataLength: currentPageData.length,
      dataToUseLength: dataToUse.length
    });
    
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
        originalName: `${vcandleObjects[vcandleIndex].name}-marquee-${index}`,
      };
    });
  }, [currentPageData, vcandleObjects]);
  
  // Store animated positions
  const [animatedPositions, setAnimatedPositions] = useState([]);
  
  // Reset scroll position when page changes
  useEffect(() => {
    scrollPositionRef.current = 0;
  }, [currentPage]);
  
  // Animate the marquee
  useFrame(() => {
    if (duplicatedData.length > 0) {
      scrollPositionRef.current += scrollSpeed * 0.002;
      
      // Reset when completed full rotation
      if (scrollPositionRef.current > Math.PI * 2) {
        scrollPositionRef.current -= Math.PI * 2;
      }
      
      // Update positions for all candles
      const newPositions = duplicatedData.map((_, index) => {
        // Distribute candles evenly around the semi-circle
        const angleOffset = (index / duplicatedData.length) * Math.PI;
        const angle = scrollPositionRef.current + angleOffset;
        
        // Semi-circle from right (-90°) to left (90°)
        const adjustedAngle = (angle % Math.PI) - (Math.PI / 2);
        
        const radius = 4;
        const xPos = Math.sin(adjustedAngle) * radius;
        const zPos = Math.cos(adjustedAngle) * radius + radius * 0.5;
        const rotationY = -adjustedAngle + Math.PI / 2;
        
        return { xPos, zPos, rotationY };
      });
      
      setAnimatedPositions(newPositions);
    }
  });
  
  return (
    <group ref={groupRef} position={[0, -1.2, -3.7]}>
      {duplicatedData.map((item, index) => {
        const pos = animatedPositions[index] || { xPos: 0, zPos: 0, rotationY: 0 };
        
        return (
          <group 
            key={`${currentPage}-${item.originalName || index}`} 
            position={[pos.xPos, 0, pos.zPos]} 
            rotation={[0, pos.rotationY, 0]}
          >
            <MarqueeCandle
              position={[0, 0, 0]}
              candleObject={item.candleObject}
              userData={item.userData}
              index={index}
              onClick={onCandleClick}
              scrollSpeed={scrollSpeed}
            />
          </group>
        );
      })}
    </group>
  );
}