import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useGLTF, useAnimations, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const ASCIICharacters = ({ mesh, particleCount = 500, color = '#67e8f9', size = 0.3 }) => {
  const charactersRef = useRef([]);
  const groupRef = useRef();
  const chars = ' .:-+*=%@#';
  
  // Sample points from mesh surface
  const sampledPoints = useMemo(() => {
    if (!mesh || !mesh.geometry) return [];
    
    const points = [];
    const geometry = mesh.geometry;
    
    // Clone geometry to work with
    const clonedGeometry = geometry.clone();
    
    // Apply any transforms from the mesh
    if (mesh.matrixWorld) {
      clonedGeometry.applyMatrix4(mesh.matrixWorld);
    }
    
    // Sample points using raycasting or vertex sampling
    const sampler = new THREE.MeshSurfaceSampler(mesh).build();
    const position = new THREE.Vector3();
    const normal = new THREE.Vector3();
    
    for (let i = 0; i < particleCount; i++) {
      sampler.sample(position, normal);
      points.push({
        position: position.clone(),
        normal: normal.clone(),
        char: chars[Math.floor(Math.random() * chars.length)]
      });
    }
    
    return points;
  }, [mesh, particleCount, chars]);
  
  return (
    <group ref={groupRef}>
      {sampledPoints.map((point, i) => (
        <Text
          key={i}
          ref={(el) => (charactersRef.current[i] = el)}
          position={point.position}
          fontSize={size}
          color={color}
          anchorX="center"
          anchorY="middle"
          characters={chars}
        >
          {point.char}
        </Text>
      ))}
    </group>
  );
};

// Fallback for MeshSurfaceSampler if not available
class MeshSurfaceSampler {
  constructor(mesh) {
    this.mesh = mesh;
    this.geometry = mesh.geometry;
    this.positionAttribute = this.geometry.getAttribute('position');
    this.weightedAreas = null;
    this.totalArea = 0;
  }
  
  build() {
    const indices = this.geometry.index;
    const positions = this.positionAttribute;
    const areas = [];
    
    if (indices) {
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i);
        const b = indices.getX(i + 1);
        const c = indices.getX(i + 2);
        
        const va = new THREE.Vector3().fromBufferAttribute(positions, a);
        const vb = new THREE.Vector3().fromBufferAttribute(positions, b);
        const vc = new THREE.Vector3().fromBufferAttribute(positions, c);
        
        const area = this.getTriangleArea(va, vb, vc);
        areas.push(area);
        this.totalArea += area;
      }
    }
    
    this.weightedAreas = areas;
    return this;
  }
  
  getTriangleArea(va, vb, vc) {
    const ab = vb.clone().sub(va);
    const ac = vc.clone().sub(va);
    return ab.cross(ac).length() * 0.5;
  }
  
  sample(position, normal) {
    const indices = this.geometry.index;
    const positions = this.positionAttribute;
    const normals = this.geometry.getAttribute('normal');
    
    // Random triangle selection weighted by area
    let r = Math.random() * this.totalArea;
    let triIndex = 0;
    
    for (let i = 0; i < this.weightedAreas.length; i++) {
      r -= this.weightedAreas[i];
      if (r <= 0) {
        triIndex = i;
        break;
      }
    }
    
    // Get triangle vertices
    const i = triIndex * 3;
    const a = indices.getX(i);
    const b = indices.getX(i + 1);
    const c = indices.getX(i + 2);
    
    const va = new THREE.Vector3().fromBufferAttribute(positions, a);
    const vb = new THREE.Vector3().fromBufferAttribute(positions, b);
    const vc = new THREE.Vector3().fromBufferAttribute(positions, c);
    
    // Random point in triangle using barycentric coordinates
    let r1 = Math.random();
    let r2 = Math.random();
    
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    
    const r3 = 1 - r1 - r2;
    
    position.copy(va).multiplyScalar(r1);
    position.add(vb.clone().multiplyScalar(r2));
    position.add(vc.clone().multiplyScalar(r3));
    
    // Apply mesh transformation
    if (this.mesh.matrixWorld) {
      position.applyMatrix4(this.mesh.matrixWorld);
    }
    
    // Get normal
    if (normals) {
      const na = new THREE.Vector3().fromBufferAttribute(normals, a);
      const nb = new THREE.Vector3().fromBufferAttribute(normals, b);
      const nc = new THREE.Vector3().fromBufferAttribute(normals, c);
      
      normal.copy(na).multiplyScalar(r1);
      normal.add(nb.clone().multiplyScalar(r2));
      normal.add(nc.clone().multiplyScalar(r3));
      normal.normalize();
    }
  }
}

// Add to THREE namespace if not available
if (!THREE.MeshSurfaceSampler) {
  THREE.MeshSurfaceSampler = MeshSurfaceSampler;
}

const MadonnaASCIIMesh = ({ 
  position = [0, -1, 1], 
  scale = 1, 
  goldCoinRef,
  asciiMode = false,
  asciiColor = '#67e8f9',
  particlesPerMesh = 200
}) => {
  const { scene, animations } = useGLTF('/madonna-pose1.glb');
  const ourLadyRef = useRef();
  const { actions } = useAnimations(animations, ourLadyRef);
  const [targetMeshes, setTargetMeshes] = useState([]);
  
  // Setup animations
  useEffect(() => {
    // Find the OurLady object for animation reference
    const ourLadyObject = scene.getObjectByName('OurLady');
    if (ourLadyObject) {
      ourLadyRef.current = ourLadyObject;
    }
    
    // Find the GoldCoin object
    let goldCoinMesh = scene.getObjectByName('GoldCoinBlank_GoldCoinBlank_0');
    if (!goldCoinMesh) {
      const goldCoinContainer = scene.getObjectByName('GoldCoin');
      if (goldCoinContainer) {
        goldCoinContainer.traverse((child) => {
          if (child.isMesh && !goldCoinMesh) {
            goldCoinMesh = child;
          }
        });
      }
    }
    
    if (goldCoinMesh && goldCoinRef) {
      goldCoinRef.current = goldCoinMesh;
    }
    
    // Collect important meshes for ASCII effect
    const meshes = [];
    scene.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        // Skip collision and gold coin
        if (child.name === 'collision' || child.name.includes('GoldCoin')) {
          child.visible = !asciiMode || !child.name.includes('GoldCoin');
          return;
        }
        
        // Target specific meshes
        if (child.name === 'Madonnina' || 
            child.name === 'OurLady' ||
            child.name.includes('Plane') ||
            child.name.includes('clothing') ||
            child.name.includes('8001') ||
            child.name.includes('9001')) {
          meshes.push(child);
          // Hide original mesh when in ASCII mode
          child.visible = !asciiMode;
        } else {
          // Keep other meshes visible
          child.visible = true;
        }
        
        // Configure materials
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(mat => {
            if (child.name === 'Madonnina' && !asciiMode) {
              mat.transparent = true;
              mat.opacity = 0.3;
            } else {
              mat.transparent = false;
              mat.opacity = 1;
            }
            mat.side = THREE.DoubleSide;
            if (mat.metalness !== undefined) mat.metalness = 0.1;
            if (mat.roughness !== undefined) mat.roughness = 0.8;
          });
        }
        
        if (child.isSkinnedMesh) {
          child.frustumCulled = false;
        }
      }
    });
    
    setTargetMeshes(meshes);
    console.log('Target meshes for ASCII:', meshes.map(m => m.name));
    
    // Setup animation
    if (actions && actions['Action.001']) {
      const action = actions['Action.001'];
      action.reset();
      action.play();
      action.setLoop(THREE.LoopRepeat);
      action.timeScale = 2.0;
      action.setEffectiveWeight(1.0);
      action.setEffectiveTimeScale(1.0);
    }
  }, [scene, actions, goldCoinRef, asciiMode]);
  
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Original model */}
      <primitive 
        object={scene} 
        rotation={[0, 0, 0]}
      />
      
      {/* ASCII characters for each target mesh */}
      {asciiMode && targetMeshes.map((mesh, index) => (
        <ASCIICharacters
          key={`${mesh.name}-${index}`}
          mesh={mesh}
          particleCount={particlesPerMesh}
          color={asciiColor}
          size={0.5}
        />
      ))}
    </group>
  );
};

// Preload the model
useGLTF.preload('/madonna-pose1.glb');

export default MadonnaASCIIMesh;