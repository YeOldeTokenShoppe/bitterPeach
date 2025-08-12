import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';

function AnnotationMarker({ 
  position = [0, 0, 0], 
  number = 1, 
  text = '', 
  onFocus,
  isActive = false,
  color = '#ffff00',
  hoverColor = '#c896ff',
  annotationOffset = null,
  scale = 1,
  textScale = null
}) {
  const meshRef = useRef();
  const { camera, invalidate } = useThree();
  const [hovered, setHovered] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Force initial render of HTML elements
  useEffect(() => {
    // Force a re-render after mount to ensure HTML elements appear
    const timer = setTimeout(() => {
      setForceUpdate(prev => prev + 1);
      invalidate(); // Force three.js to re-render
    }, 100);
    
    return () => clearTimeout(timer);
  }, [invalidate]);
  
  // Pulse animation for active state
  useFrame((state) => {
    if (meshRef.current && isActive) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  const handleClick = (e) => {
    e.stopPropagation();
    if (onFocus) {
      onFocus();
    }
  };

  const markerColor = hovered ? hoverColor : color;
  const effectiveTextScale = textScale !== null ? textScale : scale;

  return (
    <group 
      position={position}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* Invisible larger click area */}
        <mesh visible={false}>
          <circleGeometry args={[0.2 * scale, 32]} />
          <meshBasicMaterial 
            transparent 
            opacity={0} 
            depthTest={true}
            depthWrite={true}
          />
        </mesh>
        
        {/* Visible marker */}
        <mesh ref={meshRef}>
          {/* Outer ring */}
          <ringGeometry args={[0.09 * scale, 0.11 * scale, 32]} />
          <meshBasicMaterial 
            color={markerColor} 
            transparent 
            opacity={0.9}
            depthTest={true}
            depthWrite={true}
          />
        </mesh>
        
        {/* Inner circle */}
        <mesh position={[0, 0, 0.001]}>
          <circleGeometry args={[0.09 * scale, 32]} />
          <meshBasicMaterial 
            color="#000000" 
            transparent 
            opacity={0.8}
            depthTest={true}
            depthWrite={true}
          />
        </mesh>
        
        {/* Eye icon instead of number */}
        <Html
          key={`eye-${forceUpdate}`} // Force re-render with key change
          position={[0, 0, 0.002]}
          center
          distanceFactor={1}
          occlude
          style={{
            pointerEvents: 'none',
          }}
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={100 * scale} 
            height={100 * scale} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={markerColor} 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </Html>
      </Billboard>
      
      {/* Annotation text panel */}
      {isActive && (
        <Html
          position={[0, 0.4 * scale, 0]}
          center={!annotationOffset}
          distanceFactor={8}
          style={{
            pointerEvents: 'none',
            transition: 'opacity 0.3s ease-in-out',
            opacity: isActive ? 1 : 0,
            // Apply custom offset if provided
            ...(annotationOffset && {
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${annotationOffset[0]}px), calc(-50% + ${annotationOffset[1]}px))`,
            }),
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.9)',
              border: `${Math.max(1, effectiveTextScale)}px solid ${color}`,
              borderRadius: `${4 * effectiveTextScale}px`,
              padding: `${12 * effectiveTextScale}px ${16 * effectiveTextScale}px`,
              color: '#ffffff',
              width: "15rem",
              fontSize: `${14 * effectiveTextScale}px`,
              fontFamily: 'Arial, sans-serif',
              maxWidth: `${200 * effectiveTextScale}px`,
              boxShadow: `0 0 ${10 * effectiveTextScale}px ${color}40`,
              whiteSpace: 'pre-wrap',
            }}
          >
            {text}
            <div
              style={{
                fontSize: `${12 * effectiveTextScale}px`,
                marginTop: `${10 * effectiveTextScale}px`,
                opacity: 0.7,
                fontStyle: 'italic',
              }}
            >
              {/* Click anywhere to exit */}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export default AnnotationMarker;