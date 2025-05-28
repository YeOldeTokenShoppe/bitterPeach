import React, { useEffect, useState, useRef } from 'react';

export const TransitionIn = ({ children, type = 'fade' }) => {
  const [animationState, setAnimationState] = useState('initial');
  const [transitionData, setTransitionData] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Check if we're coming from a rocket launch
    const storedTransition = sessionStorage.getItem('rocketLaunchTransition');
    if (storedTransition) {
      try {
        const data = JSON.parse(storedTransition);
        // Check if transition is recent (within 10 seconds)
        if (Date.now() - data.timestamp < 10000) {
          setTransitionData(data);
          // Clear the stored transition
          sessionStorage.removeItem('rocketLaunchTransition');
        }
      } catch (e) {
        console.error('Failed to parse transition data:', e);
      }
    }
    
    // Start the animation after a brief delay
    const timer = setTimeout(() => {
      setAnimationState('animating');
      
      // Complete the animation after duration
      setTimeout(() => {
        setAnimationState('complete');
      }, transitionData ? 2000 : 1500);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [transitionData]);

  // Determine transition type
  const isRocketTransition = !!transitionData;
  
  // Calculate animation styles
  const getAnimationStyles = () => {
    if (isRocketTransition) {
      // Hyperspace/warp-in effect for rocket launch
      switch (animationState) {
        case 'initial':
          return {
            opacity: 0,
            transform: 'scale(1.5)',
            filter: 'brightness(2) blur(30px)'
          };
        case 'animating':
          return {
            opacity: 1,
            transform: 'scale(1)',
            filter: 'brightness(1) blur(0px)',
            transition: 'all 2s cubic-bezier(0.16, 1, 0.3, 1)'
          };
        case 'complete':
          return {
            opacity: 1,
            transform: 'scale(1)',
            filter: 'brightness(1) blur(0px)'
          };
        default:
          return {};
      }
    } else {
      // Simple fade for normal navigation
      switch (animationState) {
        case 'initial':
          return { opacity: 0 };
        case 'animating':
          return { 
            opacity: 1,
            transition: 'opacity 1.5s ease-out'
          };
        case 'complete':
          return { opacity: 1 };
        default:
          return {};
      }
    }
  };

  return (
    <>
      {/* White flash overlay for rocket transition */}
      {isRocketTransition && animationState === 'initial' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
            opacity: animationState === 'initial' ? 1 : 0,
            transition: 'opacity 0.5s ease-out',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        />
      )}
      
      {/* Main content container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          ...getAnimationStyles()
        }}
      >
        {children}
      </div>
      
      {/* Space warp effect overlay for rocket transition */}
      {isRocketTransition && animationState !== 'complete' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 9998,
            opacity: animationState === 'animating' ? 0 : 1,
            transition: 'opacity 2s ease-out'
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `
                radial-gradient(circle at center, transparent 0%, rgba(0,0,50,0.3) 50%, rgba(0,0,0,0.8) 100%),
                radial-gradient(circle at 30% 40%, rgba(100,100,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 70% 60%, rgba(255,100,255,0.1) 0%, transparent 50%)
              `,
              animation: animationState === 'animating' ? 'warpPulse 2s ease-out' : 'none'
            }}
          />
        </div>
      )}
      
      <style jsx>{`
        @keyframes warpPulse {
          0% {
            transform: scale(2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
};