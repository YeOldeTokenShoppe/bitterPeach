import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Orbital candle component that receives a cloned VCANDLE
function OrbitalCandle({ angle, radius, candleObject, userData, index, onClick, isLeader, transitionState, isViewerOpen }) {
  const groupRef = useRef();
  const candleRef = useRef();
  const frozenTimeRef = useRef(null);
  const frozenRotationRef = useRef(null);
  
  // Setup candle on mount
  useEffect(() => {
    if (!candleObject || !groupRef.current) return;
    
    // Scale the candle appropriately for mobile
    // VCANDLEs might be very small in the original scene
    candleObject.scale.set(3, 3, 3); // Much larger scale for visibility
    
    // Ensure the candle is centered in its group
    const box = new THREE.Box3().setFromObject(candleObject);
    const center = box.getCenter(new THREE.Vector3());
    candleObject.position.sub(center);
    candleObject.position.y = 0; // Reset Y to baseline
    
    // Apply user data to the cloned candle
    if (userData) {
      // Update userData on the candle object
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
            // Apply to Label1 objects (flipped)
            if (child.name?.includes('Label1')) {
              if (child.material) {
                child.material = child.material.clone();
                
                // Clone and flip texture for Label1
                const flippedTexture = texture.clone();
                flippedTexture.center.set(0.5, 0.5);
                flippedTexture.repeat.set(1, -1);
                flippedTexture.needsUpdate = true;
                
                child.material.map = flippedTexture;
                child.material.needsUpdate = true;
              }
            }
            // Apply to Label2 objects (normal)
            else if (child.name?.startsWith('Label1')) {
              if (child.material) {
                child.material = child.material.clone();
                child.material.map = texture;
                // Add subtle emissive glow to Label2
                child.material.emissive = new THREE.Color(0xffffff);
                child.material.emissiveMap = texture;
                child.material.emissiveIntensity = 0.2; // Subtle glow
                child.material.needsUpdate = true;
              }
            }
          });
        });
      }
    }
    
    // Enhance flame effects for the leader
    if (isLeader) {
      candleObject.traverse((child) => {
        if (child.name?.toLowerCase().includes('flame')) {
          if (child.material) {
            child.material = child.material.clone();
            child.material.emissiveIntensity = 1.5; // Brighter for leader
          }
        }
      });
    }
    
    // Add candle to group
    candleRef.current = candleObject;
    groupRef.current.add(candleObject);
    
    // Cleanup on unmount
    return () => {
      if (candleRef.current && groupRef.current) {
        groupRef.current.remove(candleRef.current);
      }
    };
  }, [candleObject, userData, isLeader]);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Check if viewer is open
      const viewerOpen = isViewerOpen;
      
      // Manage frozen time
      if (viewerOpen && frozenTimeRef.current === null) {
        // Just opened - freeze the time
        frozenTimeRef.current = state.clock.elapsedTime;
        if (candleRef.current) {
          frozenRotationRef.current = candleRef.current.rotation.y;
        }
      } else if (!viewerOpen && frozenTimeRef.current !== null) {
        // Just closed - unfreeze
        frozenTimeRef.current = null;
        frozenRotationRef.current = null;
      }
      
      // Use frozen time if viewer is open
      const currentTime = frozenTimeRef.current !== null ? frozenTimeRef.current : state.clock.elapsedTime;
      
      // Check if we're in a transition
      if (transitionState && transitionState.isTransitioning && transitionState.progress !== undefined) {
        const { progress, isFadingOut } = transitionState;
        
        // Debug log transition in candle
        if (index === 0 && Math.random() < 0.05) {
         
        }
        
        if (isFadingOut) {
          // Fade out phase - spiral outward
          const spiralOffset = progress * Math.PI * 2;
          const spiralRadius = radius + (progress * 8);
          const fadeOut = Math.max(0, 1 - progress * 2);
          const scaleEffect = Math.max(0.1, 1 - progress);
          
          groupRef.current.position.x = Math.cos(angle + spiralOffset) * spiralRadius;
          groupRef.current.position.z = Math.sin(angle + spiralOffset) * spiralRadius;
          groupRef.current.position.y = progress * 3;
          groupRef.current.scale.setScalar(scaleEffect);
          
          // Fade materials
          if (candleRef.current) {
            candleRef.current.traverse((child) => {
              if (child.material) {
                if (!child.material.transparent) {
                  child.material.transparent = true;
                }
                child.material.opacity = fadeOut;
              }
            });
          }
        } else {
          // Fade in phase - spiral inward
          const time = currentTime * 0.25;
          const targetOrbitAngle = angle + time;
          
          // Calculate where the candle should be in its normal orbit
          const targetRadiusVariation = Math.sin(targetOrbitAngle * 3) * 0.3;
          const targetEffectiveRadius = radius + targetRadiusVariation;
          const targetX = Math.cos(targetOrbitAngle) * targetEffectiveRadius * 1.3;
          const targetZ = Math.sin(targetOrbitAngle) * targetEffectiveRadius * 0.7;
          const targetY = Math.sin(targetOrbitAngle * 2) * 0.3 + Math.sin(currentTime * 2 + index) * 0.1;
          
          // Start from far out and spiral in to the target position
          const spiralOffset = (1 - progress) * Math.PI * 2;
          const spiralRadius = radius + ((1 - progress) * 8);
          const fadeIn = progress;
          const scaleEffect = 0.1 + (progress * 0.9);
          
          // Interpolate from spiral position to target orbit position
          const spiralX = Math.cos(angle + spiralOffset) * spiralRadius;
          const spiralZ = Math.sin(angle + spiralOffset) * spiralRadius;
          const spiralY = (1 - progress) * 3;
          
          // Smooth interpolation to target position
          groupRef.current.position.x = spiralX * (1 - progress) + targetX * progress;
          groupRef.current.position.z = spiralZ * (1 - progress) + targetZ * progress;
          groupRef.current.position.y = spiralY * (1 - progress) + targetY * progress;
          
          // Scale interpolation
          const targetFrontness = (targetZ + radius * 0.7) / (radius * 1.4);
          const targetScale = 0.4 + targetFrontness * 0.3;
          groupRef.current.scale.setScalar(scaleEffect * (1 - progress) + targetScale * progress);
          
          // Fade materials
          if (candleRef.current) {
            candleRef.current.traverse((child) => {
              if (child.material) {
                if (!child.material.transparent) {
                  child.material.transparent = true;
                }
                child.material.opacity = fadeIn;
              }
            });
          }
        }
      } else {
        // Normal orbital animation
        const time = currentTime * 0.25;
        const orbitAngle = angle + time;
        
        const radiusVariation = Math.sin(orbitAngle * 3) * 0.3;
        const effectiveRadius = radius + radiusVariation;
        
        const x = Math.cos(orbitAngle) * effectiveRadius * 1.3;
        const z = Math.sin(orbitAngle) * effectiveRadius * 0.7;
        const y = Math.sin(orbitAngle * 2) * 0.3 + Math.sin(currentTime * 2 + index) * 0.1;
        
        groupRef.current.position.set(x, y, z);
        
        if (candleRef.current) {
          candleRef.current.rotation.y = frozenRotationRef.current !== null ? frozenRotationRef.current : currentTime * 0.5;
        }
        
        const frontness = (z + radius * 0.7) / (radius * 1.4);
        const scale = 0.4 + frontness * 0.3;
        groupRef.current.scale.setScalar(scale);
        
        if (candleRef.current) {
          candleRef.current.traverse((child) => {
            if (child.material) {
              // Reset opacity to full for non-transition state
              if (child.material.transparent && child.material.opacity < 1) {
                child.material.opacity = 1;
              }
            }
          });
        }
      }
    }
  });
  
  const handleClick = (e) => {
    e.stopPropagation();
    onClick({
      ...userData,
      candleId: `mobile-candle-${index}`,
      candleTimestamp: Date.now(),
    });
  };
  
  return (
    <group ref={groupRef} onClick={handleClick}>
      {/* No badges or text - just the pure candle objects */}
    </group>
  );
}

// Main orbital system to be added to existing scene
export default function MobileCandleOrbital({ candleData = [], onCandleClick, modelRef, onPaginationChange, isViewerOpen = false }) {
  const groupRef = useRef();
  const [vcandleObjects, setVcandleObjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Debug log
  useEffect(() => {

  }, [isViewerOpen]);
  const [transitionStartTime, setTransitionStartTime] = useState(0);
  const [nextPage, setNextPage] = useState(0); // Store the page we're transitioning to
  
  // Configuration for the Illumin80
  const VISIBLE_CANDLES = 8;
  const ROTATION_INTERVAL = 15000; // 15 seconds between rotations
  const TRANSITION_DURATION = 2000; // 2 second fade transition
  
  // Extract and clone VCANDLE objects from the main model
  useEffect(() => {
    if (!modelRef?.current) return;
    
    const extractedCandles = [];
    
    // Find all VCANDLE objects in the model
    modelRef.current.traverse((child) => {
      if (child.name && child.name.startsWith('VCANDLE')) {
        // Clone the entire VCANDLE group with its children
        const clonedCandle = child.clone(true);
        
        // Preserve the userData from the original
        clonedCandle.userData = { ...child.userData };
        
        // Make sure the cloned candle and all its children are visible
        clonedCandle.visible = true;
        clonedCandle.traverse((descendant) => {
          descendant.visible = true;
          
          // Also ensure materials are properly cloned to avoid affecting originals
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
    
    // Sort by VCANDLE number to maintain order
    extractedCandles.sort((a, b) => {
      const numA = parseInt(a.name.replace('VCANDLE', ''));
      const numB = parseInt(b.name.replace('VCANDLE', ''));
      return numA - numB;
    });
    

    
    // Debug: Log details about extracted candles
    extractedCandles.forEach((candle, index) => {
     
    });
    
    setVcandleObjects(extractedCandles);
  }, [modelRef]);
  
  // Get all sorted user data (up to 80 for Illumin80)
  const allSortedData = React.useMemo(() => {
    if (candleData.length > 0) {
      const realData = [...candleData]
        .sort((a, b) => (b.burnedAmount || 0) - (a.burnedAmount || 0));
      
      // For testing: Add mock data to make pagination visible
      const mockData = Array(20).fill(null).map((_, i) => ({
        id: `mock-${i}`,
        userName: `TestUser${i + 1}`,
        username: `TestUser${i + 1}`,
        burnedAmount: Math.floor(Math.random() * 100),
        image: i % 2 === 0 ? '/vvv.jpg' : '/vsClown.jpg'
      }));
      
      return [...realData, ...mockData].slice(0, 80); // Combine real and mock data
    }
    // Fallback mock data
    return Array(80).fill(null).map((_, i) => ({
      id: `mock-${i}`,
      userName: `Player${i + 1}`,
      username: `Player${i + 1}`,
      burnedAmount: Math.floor(Math.random() * 1000),
      image: i % 2 === 0 ? '/vvv.jpg' : '/vsClown.jpg'
    }));
  }, [candleData]);

  // Calculate total pages
  const totalPages = Math.ceil(allSortedData.length / VISIBLE_CANDLES);

  // Get current page of users
  const currentPageData = React.useMemo(() => {
    const startIdx = currentPage * VISIBLE_CANDLES;
    const endIdx = startIdx + VISIBLE_CANDLES;
  
    return allSortedData.slice(startIdx, endIdx);
  }, [allSortedData, currentPage]);

  // Combine current page data with VCANDLE objects
  const combinedData = React.useMemo(() => {
    if (vcandleObjects.length === 0) return [];
    
    return currentPageData.map((userData, index) => {
      const vcandleIndex = index < vcandleObjects.length ? index : index % vcandleObjects.length;
      
      // Deep clone the candle object
      const clonedCandle = vcandleObjects[vcandleIndex].object.clone(true);
      
      // Make sure all materials are cloned to avoid affecting other instances
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
          // Ensure we have all the expected fields
          userName: userData.userName || userData.username || `Player ${index + 1}`,
          image: userData.image || userData.profileImage || null,
          burnedAmount: userData.burnedAmount || 0,
          message: userData.message || '',
          createdAt: userData.createdAt || new Date()
        },
        candleObject: clonedCandle,
        originalName: `${vcandleObjects[vcandleIndex].name}-page${currentPage}-idx${index}`,
        globalIndex: currentPage * VISIBLE_CANDLES + index // Track position in Illumin80
      };
    });
  }, [currentPageData, vcandleObjects, currentPage]);
  
  // Create a stable setCurrentPage function (moved here to avoid circular dependency)
  const handleSetCurrentPage = useCallback((page) => {
   
    
    // If viewer is open, just change page without transition animation
    if (isViewerOpen) {
  
      setCurrentPage(page);
      return;
    }
    
    // Start transition with current candles
    setIsTransitioning(true);
    const startTime = Date.now();
    setTransitionStartTime(startTime);
    setNextPage(page); // Store where we're going
    
    // Immediately set initial transition state
    setTransitionState({
      isTransitioning: true,
      progress: 0,
      isFadingOut: true
    });
    

    
    // Wait for candles to spiral out before changing
    setTimeout(() => {
      setCurrentPage(page);
    
      
      // Continue transition for fade-in
      setTimeout(() => {
        setIsTransitioning(false);
        setTransitionStartTime(0);
      }, TRANSITION_DURATION / 2);
    }, TRANSITION_DURATION / 2); // Change page halfway through transition
  }, [TRANSITION_DURATION, isViewerOpen]);
  
  // Create transition state to pass to children
  const [transitionState, setTransitionState] = useState(null);
  
  // Track if we've done the initial spin effect
  const [hasInitialSpinCompleted, setHasInitialSpinCompleted] = useState(false);
  
  // Auto spin effect after initial load (without pagination)
  useEffect(() => {
    if (!hasInitialSpinCompleted && vcandleObjects.length > 0) {
      // Wait for the initial load time before doing the spin effect
      const timer = setTimeout(() => {

        
        // Start the transition animation
        setIsTransitioning(true);
        const startTime = Date.now();
        setTransitionStartTime(startTime);
        
        // Set initial transition state for spin effect
        setTransitionState({
          isTransitioning: true,
          progress: 0,
          isFadingOut: true // Start with fade-out for the spin
        });
        
        // After half duration, switch to fade-in (but don't change page)
        setTimeout(() => {
          setTransitionState({
            isTransitioning: true,
            progress: 0,
            isFadingOut: false
          });
        }, TRANSITION_DURATION / 2);
        
        // End the transition after full duration
        setTimeout(() => {
          setIsTransitioning(false);
          setTransitionStartTime(0);
          setHasInitialSpinCompleted(true);
    
        }, TRANSITION_DURATION);
      }, ROTATION_INTERVAL); // Use same delay as before
      
      return () => clearTimeout(timer);
    }
  }, [hasInitialSpinCompleted, vcandleObjects.length, ROTATION_INTERVAL, TRANSITION_DURATION]);
  
  
  // Add a slow overall rotation to the entire group
  useFrame((state) => {
    if (groupRef.current) {
      if (isViewerOpen) {
        // Don't update rotation when viewer is open
      } else {
        // Only rotate when viewer is closed
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      }
    }
    
    // Update transition state
    if (groupRef.current && isTransitioning && transitionStartTime > 0) {
        const elapsed = Date.now() - transitionStartTime;
        const halfDuration = TRANSITION_DURATION / 2;
        
        // Determine which phase we're in
        const isFadingOut = elapsed < halfDuration;
        const phaseProgress = isFadingOut 
          ? elapsed / halfDuration // 0 to 1 during fade out
          : (elapsed - halfDuration) / halfDuration; // 0 to 1 during fade in
        
        // Update transition state for children
        setTransitionState({
          isTransitioning: true,
          progress: phaseProgress,
          isFadingOut
        });
        
        // Debug logging - only log every 10th frame or so
        if (Math.random() < 0.05) {
         
        }
    } else if (transitionState) {
      // Clear transition state when not transitioning
      setTransitionState(null);
    }
  });
  

  // Pass pagination state up to parent
  useEffect(() => {
    if (onPaginationChange) {
      onPaginationChange({
        currentPage,
        totalPages,
        setCurrentPage: handleSetCurrentPage,
        visibleRange: {
          start: currentPage * VISIBLE_CANDLES + 1,
          end: Math.min((currentPage + 1) * VISIBLE_CANDLES, allSortedData.length)
        },
        total: allSortedData.length
      });
    }
  }, [currentPage, totalPages, allSortedData.length, onPaginationChange, handleSetCurrentPage]);

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {/* The candles */}
      {combinedData.map((item, index) => {
        const angle = (index / Math.min(combinedData.length, 8)) * Math.PI * 2;
        return (
          <OrbitalCandle
            key={item.originalName || index}
            angle={angle}
            radius={6} // Distance from center - increased for better spacing
            candleObject={item.candleObject}
            userData={item.userData}
            index={index}
            onClick={onCandleClick}
            isLeader={index === 0}
            transitionState={transitionState}
            isViewerOpen={isViewerOpen}
          />
        );
      })}
      
      {/* Central glow effect */}
      <pointLight
        position={[0, 0, 0]}
        color="#8b7dd8"
        intensity={0.5}
        distance={6}
        decay={2}
      />
    </group>
  );
}
