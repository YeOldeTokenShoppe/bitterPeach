import { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

function AnnotationMarker({ 
  position = [0, 0, 0], 
  number = 1, 
  text = '', 
  onFocus,
  isActive = false,
  color = '#00ff41',
  hoverColor = '#67e8f9',
  annotationOffset = null,
  scale = 1
}) {
  const meshRef = useRef();
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  
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
          <meshBasicMaterial transparent opacity={0} />
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
        
        {/* Number text */}
        <Text
          position={[0, 0, 0.002]}
          fontSize={0.15 * scale}
          color={markerColor}
          anchorX="center"
          anchorY="middle"
          material-toneMapped={false}
          material-depthTest={true}
          material-depthWrite={true}
        >
          {number.toString()}
        </Text>
      </Billboard>
      
      {/* Annotation text panel */}
      {isActive && (
        <Html
          position={[0, 0.8 * scale, 0]}
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
              border: `${Math.max(1, scale)}px solid ${color}`,
              borderRadius: `${4 * scale}px`,
              padding: `${12 * scale}px ${16 * scale}px`,
              color: '#ffffff',
              fontSize: `${14 * scale}px`,
              fontFamily: 'Arial, sans-serif',
              maxWidth: `${200 * scale}px`,
              boxShadow: `0 0 ${10 * scale}px ${color}40`,
              whiteSpace: 'pre-wrap',
            }}
          >
            {text}
            <div
              style={{
                fontSize: `${12 * scale}px`,
                marginTop: `${10 * scale}px`,
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