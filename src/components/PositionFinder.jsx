import React, { useState, useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export default function PositionFinder({ enabled = true }) {
  const { camera, raycaster, scene } = useThree();
  const [clickedPosition, setClickedPosition] = useState(null);
  const [hoveredPosition, setHoveredPosition] = useState(null);
  const markerRef = useRef();
  const mouseRef = useRef(new THREE.Vector2());
  
  useEffect(() => {
    if (!enabled) return;
    
    const handleMouseMove = (event) => {
      // Convert mouse to normalized device coordinates
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Raycast from camera through mouse position
      raycaster.setFromCamera(mouseRef.current, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        setHoveredPosition([point.x, point.y, point.z]);
      }
    };
    
    const handleClick = (event) => {
      if (event.shiftKey) { // Only capture on Shift+Click
        // Convert mouse to normalized device coordinates
        mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // Raycast from camera through mouse position
        raycaster.setFromCamera(mouseRef.current, camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
          const point = intersects[0].point;
          const position = [point.x, point.y, point.z];
          setClickedPosition(position);
          
          // Log to console for easy copying
          console.log('📍 Clicked Position:');
          console.log(`[${position[0].toFixed(2)}, ${position[1].toFixed(2)}, ${position[2].toFixed(2)}]`);
          
          // Also log what was clicked
          const object = intersects[0].object;
          console.log('Clicked object:', object.name || 'unnamed');
          if (object.parent) {
            console.log('Parent:', object.parent.name || 'unnamed');
          }
        }
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [camera, raycaster, scene, enabled]);
  
  if (!enabled) return null;
  
  return (
    <>
      {/* Hover indicator */}
      {hoveredPosition && (
        <mesh position={hoveredPosition}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="yellow" opacity={0.5} transparent />
        </mesh>
      )}
      
      {/* Clicked position marker */}
      {clickedPosition && (
        <>
          <mesh position={clickedPosition} ref={markerRef}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="red" opacity={0.7} transparent />
          </mesh>
          
          <Html position={clickedPosition}>
            <div style={{
              background: 'rgba(0, 0, 0, 0.9)',
              color: 'white',
              padding: '10px',
              borderRadius: '5px',
              fontFamily: 'monospace',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              userSelect: 'text',
              cursor: 'text'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                Position (Shift+Click to set)
              </div>
              <div>X: {clickedPosition[0].toFixed(2)}</div>
              <div>Y: {clickedPosition[1].toFixed(2)}</div>
              <div>Z: {clickedPosition[2].toFixed(2)}</div>
              <div style={{ marginTop: '5px', color: '#00ff00' }}>
                [{clickedPosition[0].toFixed(2)}, {clickedPosition[1].toFixed(2)}, {clickedPosition[2].toFixed(2)}]
              </div>
            </div>
          </Html>
        </>
      )}
      
      {/* Instructions */}
      <Html position={[0, 30, 0]}>
        <div style={{
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '15px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#00ff00' }}>
            🎯 Position Finder Tool
          </div>
          <div>• Hover to preview position (yellow sphere)</div>
          <div>• <strong>Shift+Click</strong> to mark position (red sphere)</div>
          <div>• Position will be logged to console</div>
          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            Use these positions to update annotations and other elements
          </div>
        </div>
      </Html>
    </>
  );
}