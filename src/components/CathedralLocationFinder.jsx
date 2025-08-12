import React, { useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

// Simple tool to find and log spawn positions in your cathedral
export function CathedralLocationFinder() {
  const { camera, raycaster, mouse, scene } = useThree();
  const [locations, setLocations] = useState([]);
  
  useEffect(() => {
    const handleClick = (event) => {
      // Convert mouse to normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Raycast from camera through mouse position
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        const normal = intersects[0].face.normal;
        
        // Log the world position
        console.log('📍 Clicked Position (World Coordinates):');
        console.log(`  position: [${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}]`);
        console.log('  Copy this to your location array!');
        
        // Determine type based on what was clicked
        const object = intersects[0].object;
        let type = 'open';
        
        if (object.name?.includes('wall')) type = 'wall';
        else if (object.name?.includes('floor')) type = 'open';
        else if (object.name?.includes('seat') || object.name?.includes('pew')) type = 'seat';
        else if (object.name?.includes('altar')) type = 'altar';
        
        const newLocation = {
          position: [point.x, point.y, point.z],
          type: type,
          objectName: object.name || 'unnamed'
        };
        
        setLocations(prev => [...prev, newLocation]);
        
        // Add visual marker
        addMarker(point);
      }
    };
    
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [camera, raycaster, mouse, scene]);
  
  const addMarker = (position) => {
    // Add a temporary sphere to mark the position
    const geometry = new THREE.SphereGeometry(0.3, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6 
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    scene.add(sphere);
    
    // Remove after 5 seconds
    setTimeout(() => {
      scene.remove(sphere);
      geometry.dispose();
      material.dispose();
    }, 5000);
  };
  
  // Export all collected locations
  const exportLocations = () => {
    const config = locations.map((loc, i) => ({
      id: `spawn_${i}`,
      type: loc.type,
      position: loc.position.map(v => parseFloat(v.toFixed(2))),
      rotation: [0, Math.random() * Math.PI * 2, 0], // Random Y rotation
      animations: {
        idle: getAnimationsForType(loc.type).idle,
        active: getAnimationsForType(loc.type).active
      }
    }));
    
    console.log('🎯 EXPORT - Copy this entire array to your config:');
    console.log(JSON.stringify(config, null, 2));
    
    // Also create a downloadable file
    const dataStr = "export const SPAWN_LOCATIONS = " + JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'cathedral-spawn-locations.js';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const getAnimationsForType = (type) => {
    const animationMap = {
      wall: {
        idle: ['Leaning', 'StandDrink', 'WallLean'],
        active: ['GUITAR', 'Smoking']
      },
      seat: {
        idle: ['Sit', 'SitIdle', 'SitRelaxed'],
        active: ['SitClap', 'SitCheer']
      },
      altar: {
        idle: ['Pray', 'Kneel', 'StandRespectful'],
        active: ['PrayStand', 'Worship']
      },
      open: {
        idle: ['Stand', 'Idle', 'LookAround'],
        active: ['Dance', 'SAMBA', 'SALSA']
      }
    };
    
    return animationMap[type] || animationMap.open;
  };
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      zIndex: 1000
    }}>
      <h3 style={{ margin: '0 0 10px 0' }}>📍 Location Finder</h3>
      <p style={{ margin: '5px 0', fontSize: '12px' }}>Click anywhere in the scene to mark spawn points</p>
      <div style={{ margin: '10px 0' }}>
        <strong>Collected: {locations.length} locations</strong>
      </div>
      {locations.length > 0 && (
        <>
          <button 
            onClick={exportLocations}
            style={{
              background: '#00ff00',
              color: 'black',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Export Locations
          </button>
          <button 
            onClick={() => setLocations([])}
            style={{
              background: '#ff0000',
              color: 'white',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
        </>
      )}
      <div style={{ marginTop: '10px', fontSize: '11px', maxHeight: '200px', overflow: 'auto' }}>
        {locations.map((loc, i) => (
          <div key={i} style={{ marginBottom: '5px' }}>
            {i}: [{loc.position.map(v => v.toFixed(1)).join(', ')}] - {loc.type}
          </div>
        ))}
      </div>
    </div>
  );
}

// Usage in your Cathedral component:
/*
function Cathedral() {
  const [showLocationFinder, setShowLocationFinder] = useState(true);
  
  return (
    <>
      <primitive object={cathedralModel} />
      
      {/* Development tool to find spawn points */}
      {process.env.NODE_ENV === 'development' && showLocationFinder && (
        <CathedralLocationFinder />
      )}
    </>
  );
}
*/