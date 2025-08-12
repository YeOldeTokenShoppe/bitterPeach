import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Location analyzer - determines valid spawn points and their context
class LocationAnalyzer {
  constructor(scene) {
    this.scene = scene;
    this.locations = [];
    this.analyzeScene();
  }
  
  analyzeScene() {
    const locations = [];
    
    // Raycast downward to find floor positions
    const raycaster = new THREE.Raycaster();
    raycaster.set(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, -1, 0));
    
    // Grid search for valid positions
    for (let x = -15; x <= 15; x += 3) {
      for (let z = -10; z <= 10; z += 3) {
        const origin = new THREE.Vector3(x, 10, z);
        raycaster.set(origin, new THREE.Vector3(0, -1, 0));
        
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        if (intersects.length > 0) {
          const hit = intersects[0];
          const point = hit.point;
          const normal = hit.face.normal;
          
          // Classify location based on surroundings
          const context = this.classifyLocation(point, normal);
          
          if (context.valid) {
            locations.push({
              position: [point.x, point.y, point.z],
              normal: normal,
              type: context.type,
              nearbyObjects: context.nearbyObjects,
              appropriateAnimations: context.animations,
              rotation: this.calculateRotation(point, context)
            });
          }
        }
      }
    }
    
    this.locations = locations;
    return locations;
  }
  
  classifyLocation(point, normal) {
    const nearby = this.getNearbyObjects(point, 5);
    let type = 'open';
    let animations = [];
    
    // Check for walls
    const hasWall = nearby.some(obj => 
      obj.name?.toLowerCase().includes('wall') || 
      obj.name?.toLowerCase().includes('column')
    );
    
    // Check for seats
    const hasSeat = nearby.some(obj => 
      obj.name?.toLowerCase().includes('chair') || 
      obj.name?.toLowerCase().includes('bench') ||
      obj.name?.toLowerCase().includes('pew')
    );
    
    // Check for altar/sacred spaces
    const hasAltar = nearby.some(obj => 
      obj.name?.toLowerCase().includes('altar') || 
      obj.name?.toLowerCase().includes('shrine')
    );
    
    // Check for DJ booth/stage
    const hasStage = nearby.some(obj => 
      obj.name?.toLowerCase().includes('stage') || 
      obj.name?.toLowerCase().includes('dj') ||
      obj.name?.toLowerCase().includes('booth')
    );
    
    // Determine type and appropriate animations
    if (hasWall && !hasSeat) {
      type = 'wall';
      animations = ['Leaning', 'StandDrink', 'WallLean', 'Smoking'];
    } else if (hasSeat) {
      type = 'seat';
      animations = ['Sit', 'SitIdle', 'SitTalk', 'SitRelaxed'];
    } else if (hasAltar) {
      type = 'altar';
      animations = ['Pray', 'Kneel', 'Meditate', 'StandRespectful'];
    } else if (hasStage) {
      type = 'stage';
      animations = ['DJ_Idle', 'Performance', 'MixingMusic'];
    } else if (point.y > 1) {
      type = 'elevated';
      animations = ['Stand', 'LookOut', 'Survey'];
    } else {
      type = 'open';
      animations = ['Stand', 'Idle', 'Walk', 'Talk', 'LookAround'];
    }
    
    return {
      valid: true,
      type,
      animations,
      nearbyObjects: nearby.map(o => o.name)
    };
  }
  
  getNearbyObjects(point, radius) {
    const nearby = [];
    this.scene.traverse((child) => {
      if (child.isMesh && child.position.distanceTo(point) < radius) {
        nearby.push(child);
      }
    });
    return nearby;
  }
  
  calculateRotation(point, context) {
    // Face away from walls
    if (context.type === 'wall') {
      const wallDirection = this.findWallDirection(point);
      return [0, Math.atan2(wallDirection.x, wallDirection.z) + Math.PI, 0];
    }
    
    // Face altar
    if (context.type === 'altar') {
      const altarPos = this.findObjectPosition('altar');
      if (altarPos) {
        const dir = altarPos.clone().sub(point).normalize();
        return [0, Math.atan2(dir.x, dir.z), 0];
      }
    }
    
    // Random rotation for open spaces
    return [0, Math.random() * Math.PI * 2, 0];
  }
  
  findWallDirection(point) {
    // Cast rays to find nearest wall
    const raycaster = new THREE.Raycaster();
    let nearestWall = null;
    let minDistance = Infinity;
    
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      raycaster.set(point, direction);
      const intersects = raycaster.intersectObjects(this.scene.children, true);
      
      for (const hit of intersects) {
        if (hit.object.name?.includes('wall') && hit.distance < minDistance) {
          minDistance = hit.distance;
          nearestWall = direction.clone();
        }
      }
    }
    
    return nearestWall || new THREE.Vector3(1, 0, 0);
  }
  
  findObjectPosition(namePattern) {
    let target = null;
    this.scene.traverse((child) => {
      if (child.name?.toLowerCase().includes(namePattern)) {
        target = child.position;
      }
    });
    return target;
  }
}

// Animation retargeting system
class AnimationRetargeter {
  constructor() {
    this.animationLibrary = new Map();
    this.skeletonCache = new Map();
  }
  
  // Extract skeleton from a model
  extractSkeleton(model) {
    let skeleton = null;
    model.traverse((child) => {
      if (child.isSkinnedMesh && child.skeleton) {
        skeleton = child.skeleton;
      }
    });
    return skeleton;
  }
  
  // Retarget animation from source to target skeleton
  retargetAnimation(sourceClip, targetSkeleton, sourceSkeleton) {
    // Create bone mapping between skeletons
    const boneMap = this.createBoneMap(sourceSkeleton, targetSkeleton);
    
    // Clone the animation clip
    const targetClip = sourceClip.clone();
    
    // Retarget each track
    targetClip.tracks = targetClip.tracks.map(track => {
      const boneName = track.name.split('.')[0];
      const property = track.name.split('.')[1];
      
      if (boneMap[boneName]) {
        // Update track to target bone
        const newTrack = track.clone();
        newTrack.name = `${boneMap[boneName]}.${property}`;
        
        // Scale positions if needed (different model proportions)
        if (property === 'position') {
          const scale = this.calculateProportionScale(sourceSkeleton, targetSkeleton);
          newTrack.values = newTrack.values.map((v, i) => 
            i % 3 === 1 ? v : v * scale // Don't scale Y for ground contact
          );
        }
        
        return newTrack;
      }
      return track;
    });
    
    return targetClip;
  }
  
  // Create mapping between similar bones in different skeletons
  createBoneMap(sourceSkeleton, targetSkeleton) {
    const map = {};
    const sourceBones = sourceSkeleton.bones;
    const targetBones = targetSkeleton.bones;
    
    // Common bone naming patterns
    const bonePatterns = [
      ['hip', 'pelvis', 'root'],
      ['spine', 'torso', 'chest'],
      ['head', 'neck'],
      ['arm', 'shoulder', 'elbow', 'wrist', 'hand'],
      ['leg', 'thigh', 'knee', 'ankle', 'foot'],
      ['finger', 'thumb', 'index', 'middle', 'ring', 'pinky']
    ];
    
    sourceBones.forEach(sourceBone => {
      const sourceName = sourceBone.name.toLowerCase();
      
      // Find best match in target skeleton
      let bestMatch = null;
      let bestScore = 0;
      
      targetBones.forEach(targetBone => {
        const targetName = targetBone.name.toLowerCase();
        const score = this.calculateBoneMatchScore(sourceName, targetName, bonePatterns);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = targetBone.name;
        }
      });
      
      if (bestMatch && bestScore > 0.5) {
        map[sourceBone.name] = bestMatch;
      }
    });
    
    return map;
  }
  
  calculateBoneMatchScore(source, target, patterns) {
    // Direct match
    if (source === target) return 1.0;
    
    // Partial match
    if (source.includes(target) || target.includes(source)) return 0.8;
    
    // Pattern-based matching
    for (const pattern of patterns) {
      const sourceInPattern = pattern.some(p => source.includes(p));
      const targetInPattern = pattern.some(p => target.includes(p));
      
      if (sourceInPattern && targetInPattern) {
        // Both bones are in the same category
        return 0.6;
      }
    }
    
    return 0;
  }
  
  calculateProportionScale(sourceSkeleton, targetSkeleton) {
    // Compare bone lengths to determine scale
    const sourceHeight = this.calculateSkeletonHeight(sourceSkeleton);
    const targetHeight = this.calculateSkeletonHeight(targetSkeleton);
    
    return targetHeight / sourceHeight;
  }
  
  calculateSkeletonHeight(skeleton) {
    let height = 0;
    skeleton.bones.forEach(bone => {
      height = Math.max(height, bone.position.y);
    });
    return height || 1;
  }
}

// Smart character component with retargeting
function SmartCharacter({ 
  modelPath, 
  location, 
  animationPaths,
  isPlaying,
  retargeter 
}) {
  const group = useRef();
  const gltf = useGLTF(modelPath);
  const { scene } = useThree();
  
  // Get skeleton from model
  const skeleton = useMemo(() => {
    return retargeter.extractSkeleton(gltf.scene);
  }, [gltf.scene, retargeter]);
  
  // Load and retarget animations
  const [retargetedAnimations, setRetargetedAnimations] = useState([]);
  
  useEffect(() => {
    if (!skeleton) return;
    
    const loadAnimations = async () => {
      const animations = [];
      
      for (const animPath of animationPaths) {
        const animGltf = await useGLTF.preload(animPath);
        
        if (animGltf.animations && animGltf.animations.length > 0) {
          // Get source skeleton from animation file
          const sourceSkeleton = retargeter.extractSkeleton(animGltf.scene);
          
          // Retarget each animation
          animGltf.animations.forEach(clip => {
            const retargeted = retargeter.retargetAnimation(
              clip,
              skeleton,
              sourceSkeleton
            );
            animations.push(retargeted);
          });
        }
      }
      
      setRetargetedAnimations(animations);
    };
    
    loadAnimations();
  }, [skeleton, animationPaths, retargeter]);
  
  // Use retargeted animations
  const { actions, mixer } = useAnimations(retargetedAnimations, group);
  const [currentAnimation, setCurrentAnimation] = useState(null);
  
  // Play appropriate animation based on location context
  useEffect(() => {
    if (!actions || Object.keys(actions).length === 0) return;
    
    const appropriateAnims = location.appropriateAnimations;
    let selectedAnim = null;
    
    // Find first available appropriate animation
    for (const animName of appropriateAnims) {
      if (actions[animName]) {
        selectedAnim = animName;
        break;
      }
    }
    
    // Fallback to any available animation
    if (!selectedAnim) {
      selectedAnim = Object.keys(actions)[0];
    }
    
    if (selectedAnim && actions[selectedAnim]) {
      // Stop current
      if (currentAnimation && actions[currentAnimation]) {
        actions[currentAnimation].fadeOut(0.5);
      }
      
      // Play new
      actions[selectedAnim].reset();
      actions[selectedAnim].fadeIn(0.5);
      actions[selectedAnim].setLoop(THREE.LoopRepeat);
      actions[selectedAnim].play();
      setCurrentAnimation(selectedAnim);
      
      console.log(`Playing ${selectedAnim} at ${location.type} location`);
    }
  }, [actions, location, isPlaying]);
  
  // Update mixer
  useFrame((state, delta) => {
    if (mixer) mixer.update(delta);
  });
  
  return (
    <group ref={group} position={location.position} rotation={location.rotation}>
      <primitive object={gltf.scene} />
    </group>
  );
}

// Main smart character system
export default function SmartCharacterSystem({ 
  cathedralScene,
  characterModels,
  animationLibrary,
  maxCharacters = 5,
  isPlaying 
}) {
  const [locations, setLocations] = useState([]);
  const [characterSetup, setCharacterSetup] = useState([]);
  const retargeter = useMemo(() => new AnimationRetargeter(), []);
  
  // Analyze cathedral for valid spawn points
  useEffect(() => {
    if (!cathedralScene) return;
    
    const analyzer = new LocationAnalyzer(cathedralScene);
    const validLocations = analyzer.locations;
    
    console.log(`Found ${validLocations.length} valid spawn points`);
    console.log('Location types:', validLocations.map(l => l.type));
    
    setLocations(validLocations);
  }, [cathedralScene]);
  
  // Generate character placement
  useEffect(() => {
    if (locations.length === 0) return;
    
    const setup = [];
    const usedLocations = new Set();
    
    // Prioritize special locations
    const priorityTypes = ['altar', 'stage', 'wall', 'seat', 'open'];
    
    for (const type of priorityTypes) {
      const typeLocations = locations.filter(l => 
        l.type === type && !usedLocations.has(l)
      );
      
      for (const location of typeLocations) {
        if (setup.length >= maxCharacters) break;
        
        // Pick random character model
        const model = characterModels[
          Math.floor(Math.random() * characterModels.length)
        ];
        
        // Get animations appropriate for this location
        const appropriateAnims = animationLibrary.filter(anim =>
          location.appropriateAnimations.some(name => 
            anim.path.toLowerCase().includes(name.toLowerCase())
          )
        );
        
        setup.push({
          model,
          location,
          animations: appropriateAnims.length > 0 ? appropriateAnims : animationLibrary,
          key: `char_${setup.length}`
        });
        
        usedLocations.add(location);
      }
      
      if (setup.length >= maxCharacters) break;
    }
    
    setCharacterSetup(setup);
    console.log('Character setup:', setup);
  }, [locations, characterModels, animationLibrary, maxCharacters]);
  
  return (
    <>
      {characterSetup.map(({ model, location, animations, key }) => (
        <SmartCharacter
          key={key}
          modelPath={model.path}
          location={location}
          animationPaths={animations.map(a => a.path)}
          isPlaying={isPlaying}
          retargeter={retargeter}
        />
      ))}
    </>
  );
}

// Usage example:
/*
const characterModels = [
  { path: '/models/character1.glb', name: 'Character1' },
  { path: '/models/character2.glb', name: 'Character2' },
  // ... more characters
];

const animationLibrary = [
  { path: '/animations/idle.glb', name: 'Idle', tags: ['idle', 'stand'] },
  { path: '/animations/sit.glb', name: 'Sit', tags: ['sit', 'seat'] },
  { path: '/animations/pray.glb', name: 'Pray', tags: ['pray', 'altar'] },
  { path: '/animations/lean.glb', name: 'Leaning', tags: ['lean', 'wall'] },
  { path: '/animations/dance1.glb', name: 'Dance1', tags: ['dance', 'party'] },
  // ... more animations
];

<SmartCharacterSystem
  cathedralScene={cathedralRef.current}
  characterModels={characterModels}
  animationLibrary={animationLibrary}
  maxCharacters={8}
  isPlaying={musicPlaying}
/>
*/