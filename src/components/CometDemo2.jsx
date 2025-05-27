import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Meteor component inspired by the canvas effect
function Meteor({ 
  startPosition = [-10, 8, -5], 
  endPosition = [10, -3, -8],
  baseHue = 200,
  speed = 0.4,
  size = 0.15,
  onExplode = null,
  onComplete = null 
}) {
  const meteorGroupRef = useRef();
  const meteorCoreRef = useRef();
  const ashParticlesRef = useRef();
  const progressRef = useRef(0);
  const ashPositions = useRef([]);
  const ashLifetimes = useRef([]);
  const maxAshCount = 40;
  const hueShift = useRef(0);

  // Create meteor core geometry and material
  const meteorGeometry = useMemo(() => new THREE.SphereGeometry(size, 12, 12), [size]);
  
  const meteorMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.9
  }), []);

  // Create ash particle system
  const { ashGeometry, ashMaterial } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxAshCount * 3);
    const colors = new Float32Array(maxAshCount * 3);
    const sizes = new Float32Array(maxAshCount);
    const alphas = new Float32Array(maxAshCount);

    // Initialize ash particles
    for (let i = 0; i < maxAshCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.5;
      colors[i * 3 + 2] = 0;
      
      sizes[i] = Math.random() * 0.05 + 0.02;
      alphas[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // Enhanced ash shader material
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vColor;
        
        void main() {
          vAlpha = alpha;
          vColor = color;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying float vAlpha;
        varying vec3 vColor;
        
        void main() {
          float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
          float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
          
          // Add flickering effect
          float flicker = sin(time * 8.0 + gl_FragCoord.x * 0.1) * 0.2 + 0.8;
          
          gl_FragColor = vec4(vColor, alpha * vAlpha * flicker);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    return { ashGeometry: geometry, ashMaterial: material };
  }, [maxAshCount]);

  // Update HSL color based on position and time
  const updateMeteorColor = (progress, time) => {
    // Color shifts based on position like the original
    const positionHue = (baseHue + progress * 60 + time * 20) % 360;
    const lightness = 25 + Math.sin(time * 10) * 15; // Flickering lightness
    const saturation = 80;
    
    const color = new THREE.Color().setHSL(positionHue / 360, saturation / 100, lightness / 100);
    meteorMaterial.color = color;
    meteorMaterial.emissive = color.clone().multiplyScalar(0.8);
    meteorMaterial.emissiveIntensity = 2.0 + Math.sin(time * 8) * 0.5;
  };

  // Animation loop
  useFrame((state, delta) => {
    if (!meteorGroupRef.current || !meteorCoreRef.current || !ashParticlesRef.current) return;

    const time = state.clock.elapsedTime;
    hueShift.current = time * 20;

    // Update progress
    progressRef.current += delta * speed;
    
    if (progressRef.current > 1.0) {
      // Meteor completed its journey
      if (onExplode && progressRef.current < 1.1 && progressRef.current > 1.0) {
        onExplode(meteorCoreRef.current.position.clone());
      }
      if (onComplete && progressRef.current > 1.2) {
        onComplete();
      }
      return;
    }

    // Calculate current position with gravity arc
    const t = Math.min(progressRef.current, 1);
    const currentPos = new THREE.Vector3();
    
    currentPos.lerpVectors(
      new THREE.Vector3(...startPosition), 
      new THREE.Vector3(...endPosition), 
      t
    );
    
    // Add gravitational arc
    const arcHeight = 3;
    const gravityOffset = -4 * arcHeight * t * (t - 1);
    currentPos.y += gravityOffset;

    // Update meteor position
    meteorCoreRef.current.position.copy(currentPos);

    // Update color based on position and time
    updateMeteorColor(t, time);

    // Update ash trail (spawn less frequently to prevent overflow)
    if (Math.random() < 0.1 && t < 0.95) { // Reduced spawn rate and earlier cutoff
      // Find an available ash particle
      for (let i = 0; i < maxAshCount; i++) {
        if (!ashLifetimes.current[i] || ashLifetimes.current[i] <= 0) {
          // Spawn new ash particle near meteor
          ashPositions.current[i] = {
            x: currentPos.x + (Math.random() - 0.5) * size,
            y: currentPos.y + (Math.random() - 0.5) * size,
            z: currentPos.z + (Math.random() - 0.5) * size
          };
          ashLifetimes.current[i] = 20 + Math.random() * 10; // Shorter lifetime
          break;
        }
      }
    }

    // Update existing ash particles safely
    try {
      const positions = ashParticlesRef.current.geometry.attributes.position.array;
      const colors = ashParticlesRef.current.geometry.attributes.color.array;
      const alphas = ashParticlesRef.current.geometry.attributes.alpha.array;

      for (let i = 0; i < maxAshCount; i++) {
        if (ashLifetimes.current[i] && ashLifetimes.current[i] > 0) {
          ashLifetimes.current[i]--;
          
          if (ashPositions.current[i]) {
            positions[i * 3] = ashPositions.current[i].x || 0;
            positions[i * 3 + 1] = ashPositions.current[i].y || 0;
            positions[i * 3 + 2] = ashPositions.current[i].z || 0;
            
            // Color based on current meteor color with fade
            const fade = Math.max(0, ashLifetimes.current[i] / 30);
            const meteorColor = meteorMaterial.color;
            colors[i * 3] = meteorColor.r || 1;
            colors[i * 3 + 1] = (meteorColor.g || 0.5) * 0.7;
            colors[i * 3 + 2] = (meteorColor.b || 0) * 0.5;
            
            alphas[i] = fade * 0.6;
          }
        } else {
          alphas[i] = 0;
        }
      }

      ashParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      ashParticlesRef.current.geometry.attributes.color.needsUpdate = true;
      ashParticlesRef.current.geometry.attributes.alpha.needsUpdate = true;
    } catch (error) {
      console.warn("Ash particle update error:", error);
    }

    // Update shader time
    ashMaterial.uniforms.time.value = time;
  });

  // Initialize
  useEffect(() => {
    progressRef.current = 0;
    ashPositions.current = new Array(maxAshCount).fill(null);
    ashLifetimes.current = new Array(maxAshCount).fill(0);
  }, []);

  return (
    <group ref={meteorGroupRef}>
      {/* Meteor Core */}
      <mesh 
        ref={meteorCoreRef}
        geometry={meteorGeometry}
        material={meteorMaterial}
      />
      
      {/* Ash Trail */}
      <points ref={ashParticlesRef} geometry={ashGeometry} material={ashMaterial} />
    </group>
  );
}

// Explosion effect when meteors hit
function Explosion({ position, hue = 200, onComplete }) {
  const explosionRef = useRef();
  const lifeRef = useRef(0);
  const maxLife = 60;

  const explosionMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.1,
    color: new THREE.Color().setHSL(hue / 360, 0.8, 0.55)
  }), [hue]);

  useFrame(() => {
    if (!explosionRef.current) return;

    lifeRef.current++;
    const progress = lifeRef.current / maxLife;
    
    if (progress > 0.6) {
      onComplete();
      return;
    }

    // Grow the explosion
    const scale = progress * 2;
    explosionRef.current.scale.setScalar(scale);
    
    // Fade out
    explosionMaterial.opacity = (1 - progress) * 0.15;
  });

  return (
    <mesh ref={explosionRef} position={position} material={explosionMaterial}>
      <sphereGeometry args={[0.5, 16, 16]} />
    </mesh>
  );
}

// Manager component for the meteor shower system
export default function MeteorShowerSystem({ intensity = 0.08, children }) {
  const [activeMeteors, setActiveMeteors] = React.useState([]);
  const [explosions, setExplosions] = React.useState([]);
  const tickRef = useRef(0);

  // Spawn meteors
  const spawnMeteor = React.useCallback(() => {
    const meteorId = Date.now() + Math.random();
    
    // Random spawn positions across the sky
    const startPos = [
      -25 + Math.random() * 50,
      12 + Math.random() * 6,
      -20 + Math.random() * 15
    ];
    const endPos = [
      startPos[0] + (-8 + Math.random() * 16),
      -5 + Math.random() * 3,
      startPos[2] + (Math.random() * 10)
    ];

    const newMeteor = {
      id: meteorId,
      startPosition: startPos,
      endPosition: endPos,
      baseHue: Math.random() * 360,
      speed: 0.3 + Math.random() * 0.4,
      size: 0.1 + Math.random() * 0.1
    };

    setActiveMeteors(prev => [...prev, newMeteor]);
  }, []);

  // Handle meteor explosion
  const handleMeteorExplode = React.useCallback((position) => {
    const explosionId = Date.now() + Math.random();
    setExplosions(prev => [...prev, {
      id: explosionId,
      position: position.toArray(),
      hue: Math.random() * 360
    }]);
  }, []);

  // Handle meteor completion
  const handleMeteorComplete = React.useCallback((meteorId) => {
    setActiveMeteors(prev => prev.filter(m => m.id !== meteorId));
  }, []);

  // Handle explosion completion
  const handleExplosionComplete = React.useCallback((explosionId) => {
    setExplosions(prev => prev.filter(e => e.id !== explosionId));
  }, []);

  // Spawn meteors periodically
  useFrame(() => {
    tickRef.current += 0.6;
    
    if (activeMeteors.length < 8 && Math.random() < intensity) {
      spawnMeteor();
    }
  });

  return (
    <>
      {/* Render active meteors */}
      {activeMeteors.map(meteor => (
        <Meteor
          key={meteor.id}
          startPosition={meteor.startPosition}
          endPosition={meteor.endPosition}
          baseHue={meteor.baseHue}
          speed={meteor.speed}
          size={meteor.size}
          onExplode={handleMeteorExplode}
          onComplete={() => handleMeteorComplete(meteor.id)}
        />
      ))}
      
      {/* Render explosions */}
      {explosions.map(explosion => (
        <Explosion
          key={explosion.id}
          position={explosion.position}
          hue={explosion.hue}
          onComplete={() => handleExplosionComplete(explosion.id)}
        />
      ))}
      
      {children}
    </>
  );
}