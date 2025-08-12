import React, { useRef, useState, useEffect } from 'react';
import { useHelper } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ============================================
// APPROACH 1: Manual Location Markers in Scene
// ============================================

// Visual helper component to see spawn points in development
function SpawnPointHelper({ position, type, visible = true }) {
  const meshRef = useRef();
  
  // Different colors for different location types
  const colors = {
    wall: '#ff0000',
    seat: '#00ff00',
    altar: '#ffff00',
    stage: '#ff00ff',
    open: '#00ffff',
    corner: '#ff8800'
  };
  
  if (!visible) return null;
  
  return (
    <group position={position}>
      {/* Sphere to mark position */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial 
          color={colors[type] || '#ffffff'} 
          transparent 
          opacity={0.5} 
        />
      </mesh>
      
      {/* Arrow to show facing direction */}
      <arrowHelper args={[
        new THREE.Vector3(0, 0, -1), // direction
        new THREE.Vector3(0, 0, 0),  // origin
        2,                            // length
        colors[type] || '#ffffff'     // color
      ]} />
      
      {/* Label */}
      <sprite position={[0, 1, 0]}>
        <spriteMaterial>
          <canvasTexture attach="map">
            {/* Canvas with text would go here */}
          </canvasTexture>
        </spriteMaterial>
      </sprite>
    </group>
  );
}

// ============================================
// APPROACH 2: Define Locations in Blender/3D Software
// ============================================

// In your 3D software, create Empty objects named like:
// - SPAWN_wall_01
// - SPAWN_seat_01  
// - SPAWN_altar_01
// - SPAWN_stage_01

function ExtractLocationsFromScene({ scene }) {
  const [locations, setLocations] = useState([]);
  
  useEffect(() => {
    if (!scene) return;
    
    const extractedLocations = [];
    
    scene.traverse((child) => {
      // Look for spawn point markers
      if (child.name && child.name.startsWith('SPAWN_')) {
        const parts = child.name.split('_');
        const type = parts[1]; // wall, seat, altar, etc.
        
        // Get WORLD position (global coordinates)
        const worldPosition = new THREE.Vector3();
        const worldRotation = new THREE.Euler();
        const worldScale = new THREE.Vector3();
        
        child.getWorldPosition(worldPosition);
        child.getWorldQuaternion(new THREE.Quaternion().setFromEuler(worldRotation));
        child.getWorldScale(worldScale);
        
        extractedLocations.push({
          name: child.name,
          type: type,
          position: worldPosition.toArray(), // [x, y, z] in world space
          rotation: [worldRotation.x, worldRotation.y, worldRotation.z],
          scale: worldScale.toArray(),
          original: child // Keep reference to original object
        });
      }
    });
    
    console.log('Extracted spawn locations from scene:', extractedLocations);
    setLocations(extractedLocations);
  }, [scene]);
  
  return locations;
}

// ============================================
// APPROACH 3: Hybrid - Code + Scene Analysis
// ============================================

// Define locations relative to known objects in your scene
function SmartLocationFinder({ scene }) {
  const [locations, setLocations] = useState([]);
  
  useEffect(() => {
    if (!scene) return;
    
    const foundLocations = [];
    
    // Find key objects in the scene
    const keyObjects = {
      altar: null,
      stage: null,
      djBooth: null,
      walls: [],
      seats: [],
      pillars: []
    };
    
    scene.traverse((child) => {
      const nameLower = child.name?.toLowerCase() || '';
      
      if (nameLower.includes('altar')) keyObjects.altar = child;
      if (nameLower.includes('stage')) keyObjects.stage = child;
      if (nameLower.includes('dj')) keyObjects.djBooth = child;
      if (nameLower.includes('wall')) keyObjects.walls.push(child);
      if (nameLower.includes('pew') || nameLower.includes('chair')) keyObjects.seats.push(child);
      if (nameLower.includes('pillar') || nameLower.includes('column')) keyObjects.pillars.push(child);
    });
    
    // Generate spawn points relative to key objects
    
    // 1. In front of altar (if exists)
    if (keyObjects.altar) {
      const altarPos = new THREE.Vector3();
      keyObjects.altar.getWorldPosition(altarPos);
      
      foundLocations.push({
        type: 'altar',
        position: [
          altarPos.x,
          0, // Floor level
          altarPos.z + 3 // 3 units in front
        ],
        rotation: [0, Math.PI, 0], // Face the altar
        animations: ['Pray', 'Kneel', 'Meditate']
      });
    }
    
    // 2. Near walls
    keyObjects.walls.forEach((wall, index) => {
      const wallPos = new THREE.Vector3();
      wall.getWorldPosition(wallPos);
      
      // Get wall bounding box to find its orientation
      const box = new THREE.Box3().setFromObject(wall);
      const size = box.getSize(new THREE.Vector3());
      
      // Determine if wall runs along X or Z axis
      const isXAligned = size.x > size.z;
      
      // Place character offset from wall
      const offset = 1.5; // Distance from wall
      
      foundLocations.push({
        type: 'wall',
        position: [
          wallPos.x + (isXAligned ? 0 : offset),
          0,
          wallPos.z + (isXAligned ? offset : 0)
        ],
        rotation: [0, isXAligned ? 0 : Math.PI/2, 0],
        animations: ['Leaning', 'StandDrink', 'WallLean']
      });
    });
    
    // 3. On/near seats
    keyObjects.seats.forEach((seat, index) => {
      const seatPos = new THREE.Vector3();
      seat.getWorldPosition(seatPos);
      
      foundLocations.push({
        type: 'seat',
        position: [seatPos.x, seatPos.y + 0.5, seatPos.z], // Slightly above seat
        rotation: [0, seat.rotation.y, 0], // Match seat rotation
        animations: ['Sit', 'SitIdle', 'SitTalk']
      });
    });
    
    setLocations(foundLocations);
  }, [scene]);
  
  return locations;
}

// ============================================
// MAIN LOCATION CONFIGURATION
// ============================================

// Use WORLD COORDINATES (Global) for positions
// These are relative to the scene origin (0,0,0) with the cathedral now at scale 1
export const CATHEDRAL_SPAWN_LOCATIONS = [
  // Front area near entrance
  {
    id: 'entrance_left',
    type: 'open',
    position: [-5, 0, 20],  // WORLD coordinates (adjusted for new scale)
    rotation: [0, Math.PI, 0], // Face into cathedral
    animations: {
      idle: ['Stand', 'Idle', 'LookAround'],
      active: ['Wave', 'Greet', 'Talk']
    }
  },
  
  // Near altar
  {
    id: 'altar_center',
    type: 'altar',
    position: [0, 0, -15],  // WORLD coordinates (adjusted for new scale)
    rotation: [0, 0, 0],   // Face altar
    animations: {
      idle: ['Pray', 'Kneel', 'Meditate'],
      active: ['StandPray', 'CrossSign']
    }
  },
  
  // Wall positions
  {
    id: 'wall_left',
    type: 'wall',
    position: [-20, 0, 0],  // WORLD coordinates (adjusted for new scale)
    rotation: [0, Math.PI/2, 0], // Face away from wall
    animations: {
      idle: ['Leaning', 'WallLean', 'StandDrink'],
      active: ['Smoking', 'PhoneCheck']
    }
  },
  
  // Seated positions (if pews/chairs exist)
  {
    id: 'pew_front_left',
    type: 'seat',
    position: [-6, 0.5, -5],  // WORLD coordinates (Y is seat height, adjusted for new scale)
    rotation: [0, 0, 0],
    animations: {
      idle: ['Sit', 'SitIdle', 'SitPray'],
      active: ['SitClap', 'SitCheer']
    }
  },
  
  // Corner positions
  {
    id: 'corner_back_right',
    type: 'corner',
    position: [18, 0, -18],  // WORLD coordinates (adjusted for new scale)
    rotation: [0, -Math.PI/4, 0], // Face diagonally
    animations: {
      idle: ['Stand', 'Lurk', 'Observe'],
      active: ['Phone', 'Drink']
    }
  }
];

// ============================================
// VISUAL LOCATION EDITOR (Development Tool)
// ============================================

export function LocationEditor({ onSave }) {
  const { scene, camera } = useThree();
  const [locations, setLocations] = useState(CATHEDRAL_SPAWN_LOCATIONS);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const controlsRef = useRef();
  
  // Add new location at camera position
  const addLocationAtCamera = () => {
    const newLocation = {
      id: `custom_${Date.now()}`,
      type: 'open',
      position: [
        camera.position.x,
        0, // Floor level
        camera.position.z
      ],
      rotation: [0, camera.rotation.y, 0],
      animations: {
        idle: ['Stand'],
        active: ['Wave']
      }
    };
    
    setLocations([...locations, newLocation]);
  };
  
  // Export locations to console (copy paste to your config)
  const exportLocations = () => {
    const exported = locations.map(loc => ({
      ...loc,
      position: loc.position.map(v => parseFloat(v.toFixed(2))),
      rotation: loc.rotation.map(v => parseFloat(v.toFixed(3)))
    }));
    
    console.log('EXPORT: Copy this to your configuration:');
    console.log(JSON.stringify(exported, null, 2));
    
    if (onSave) onSave(exported);
  };
  
  return (
    <>
      {/* Render spawn point helpers */}
      {locations.map((loc, index) => (
        <SpawnPointHelper
          key={loc.id}
          position={loc.position}
          type={loc.type}
          visible={true}
        />
      ))}
      
      {/* UI Controls (would be HTML overlay) */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        padding: '10px',
        color: 'white'
      }}>
        <button onClick={addLocationAtCamera}>Add Location Here</button>
        <button onClick={exportLocations}>Export Locations</button>
        <div>Total Locations: {locations.length}</div>
      </div>
    </>
  );
}

// ============================================
// USAGE IN YOUR CATHEDRAL COMPONENT
// ============================================

/*
function Cathedral() {
  const gltf = useGLTF('/cathedral3.glb');
  
  // Use predefined locations
  const spawnLocations = CATHEDRAL_SPAWN_LOCATIONS;
  
  // OR extract from scene markers
  const extractedLocations = ExtractLocationsFromScene({ scene: gltf.scene });
  
  // Place characters at these WORLD coordinate positions
  return (
    <>
      <primitive object={gltf.scene} />
      
      {spawnLocations.map(location => (
        <Character
          key={location.id}
          position={location.position}  // These are WORLD coordinates
          rotation={location.rotation}
          animations={location.animations}
        />
      ))}
      
      {/* Development only: Visual location editor */}
      {process.env.NODE_ENV === 'development' && (
        <LocationEditor onSave={(locs) => console.log('Save these:', locs)} />
      )}
    </>
  );
}
*/