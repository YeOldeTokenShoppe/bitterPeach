import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Comet component for demo
function CometDemo({ 
  startPosition = [-10, 5, -5], 
  endPosition = [10, -2, -8],
  color = '#ff6600', // Fiery orange for dramatic effect
  speed = 0.3, // Much slower for dramatic effect
  onComplete = null 
}) {
  const cometGroupRef = useRef();
  const particlesRef = useRef();
  const cometHeadRef = useRef();
  const progressRef = useRef(0);
  const tailPositions = useRef([]);
  const maxTailLength = 120; // Longer tail for more dramatic effect

  // Create comet head geometry and material (spherical with heavy bloom)
  const cometHeadGeometry = useMemo(() => new THREE.SphereGeometry(0.15, 16, 16), []);
  
  const cometHeadMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffffff', // Pure white for maximum bloom
    emissive: '#ffff88', // Bright yellow-white emissive
    emissiveIntensity: 3.0, // Very high intensity for heavy bloom
    transparent: true,
    opacity: 0.9
  }), []);

  // Additional outer glow sphere for enhanced bloom effect
  const outerGlowGeometry = useMemo(() => new THREE.SphereGeometry(0.25, 16, 16), []);
  const outerGlowMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffaa44',
    emissive: '#ff6600',
    emissiveIntensity: 2.0,
    transparent: true,
    opacity: 0.3
  }), []);

  // Create particle system for tail
  const { particleGeometry, particleMaterial } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(maxTailLength * 3);
    const colors = new Float32Array(maxTailLength * 3);
    const sizes = new Float32Array(maxTailLength);
    const alphas = new Float32Array(maxTailLength);

    // Initialize arrays
    for (let i = 0; i < maxTailLength; i++) {
      // Positions (will be updated in animation)
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Fiery gradient colors along the tail
      const tailProgress = i / maxTailLength;
      if (tailProgress < 0.3) {
        // Hot core - bright orange/yellow
        colors[i * 3] = 1.0; // R
        colors[i * 3 + 1] = 0.8 - tailProgress; // G
        colors[i * 3 + 2] = 0.2; // B
      } else if (tailProgress < 0.7) {
        // Middle - orange to red
        colors[i * 3] = 1.0; // R
        colors[i * 3 + 1] = 0.4 - tailProgress * 0.5; // G
        colors[i * 3 + 2] = 0.1; // B
      } else {
        // Tail end - deep red fading to dark
        colors[i * 3] = 0.8 - tailProgress * 0.6; // R
        colors[i * 3 + 1] = 0.1 - tailProgress * 0.1; // G
        colors[i * 3 + 2] = 0.05; // B
      }

      // Size diminishes along tail (bigger particles for more dramatic effect)
      sizes[i] = (1 - tailProgress) * 0.25 + 0.05;
      
      // Alpha diminishes along tail
      alphas[i] = (1 - tailProgress) * 0.9;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    // Enhanced shader material for fiery particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          vAlpha = alpha;
          vColor = color;
          vSize = size;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (400.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float time;
        varying float vAlpha;
        varying vec3 vColor;
        varying float vSize;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float distanceToCenter = length(center);
          
          // Create fiery, flickering effect
          float flicker = sin(time * 10.0 + vSize * 20.0) * 0.1 + 0.9;
          float coreGlow = 1.0 - smoothstep(0.0, 0.3, distanceToCenter);
          float outerGlow = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
          
          // Combine core and outer glow
          float finalAlpha = (coreGlow * 0.8 + outerGlow * 0.4) * vAlpha * flicker;
          
          // Add heat shimmer effect
          vec3 fireColor = vColor * (1.0 + coreGlow * 0.5);
          
          gl_FragColor = vec4(fireColor, finalAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    return { particleGeometry: geometry, particleMaterial: material };
  }, [color, maxTailLength]);

  // Animation loop
  useFrame((state, delta) => {
    if (!cometGroupRef.current || !particlesRef.current) return;

    // Update progress
    progressRef.current += delta * speed;
    
    if (progressRef.current > 1) {
      // Comet completed its journey
      if (onComplete) onComplete();
      progressRef.current = 1;
      return;
    }

    // Calculate current position along path (with slight arc)
    const t = progressRef.current;
    const currentPos = new THREE.Vector3();
    
    // Linear interpolation with gravitational arc
    currentPos.lerpVectors(
      new THREE.Vector3(...startPosition), 
      new THREE.Vector3(...endPosition), 
      t
    );
    
    // Add gravitational curve (parabolic arc)
    const arcHeight = 2;
    const gravityOffset = -4 * arcHeight * t * (t - 1);
    currentPos.y += gravityOffset;

    // Update comet head position
    cometHeadRef.current.position.copy(currentPos);

    // Update tail positions
    tailPositions.current.unshift(currentPos.clone());
    if (tailPositions.current.length > maxTailLength) {
      tailPositions.current.pop();
    }

    // Update particle positions
    const positions = particlesRef.current.geometry.attributes.position.array;
    for (let i = 0; i < tailPositions.current.length; i++) {
      const pos = tailPositions.current[i];
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true;

    // Update shader time uniform
    particleMaterial.uniforms.time.value = state.clock.elapsedTime;

    // Add slight rotation to comet head for visual interest
    cometHeadRef.current.rotation.x += delta * 2;
    cometHeadRef.current.rotation.y += delta * 1.5;
  });

  // Initialize tail positions
  useEffect(() => {
    tailPositions.current = [];
    progressRef.current = 0;
  }, []);

  return (
    <group ref={cometGroupRef}>
      {/* Comet Head with layered glow effect */}
      <group ref={cometHeadRef}>
        {/* Outer glow layer */}
        <mesh geometry={outerGlowGeometry} material={outerGlowMaterial} />
        
        {/* Bright core */}
        <mesh geometry={cometHeadGeometry} material={cometHeadMaterial} />
      </group>
      
      {/* Comet Tail */}
      <points ref={particlesRef} geometry={particleGeometry} material={particleMaterial} />
    </group>
  );
}

// Manager component to spawn comets
export default function CometSystem({ children }) {
  const [activeComets, setActiveComets] = React.useState([]);

  // Function to spawn a new comet
  const spawnComet = React.useCallback((type = 'buy') => {
    const cometId = Date.now() + Math.random();
    
    // All comets are fiery now, but we can vary intensity for different types
    const cometColor = type === 'buy' ? '#ff8800' : '#ff4400'; // Orange vs red-orange
    
    // Random start/end positions for dramatic arcs across the sky
    const startPos = [
      -20 + Math.random() * 40,
      8 + Math.random() * 4,
      -15 + Math.random() * 10
    ];
    const endPos = [
      -20 + Math.random() * 40,
      -3 + Math.random() * 2,
      -15 + Math.random() * 10
    ];

    const newComet = {
      id: cometId,
      type,
      color: cometColor,
      startPosition: startPos,
      endPosition: endPos,
      speed: 0.2 + Math.random() * 0.3 // Slower, more majestic
    };

    setActiveComets(prev => [...prev, newComet]);

    // Auto-remove after completion (longer duration due to slower speed)
    setTimeout(() => {
      setActiveComets(prev => prev.filter(c => c.id !== cometId));
    }, 15000);
  }, []);

  // Demo: Spawn comets periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const cometType = Math.random() > 0.5 ? 'buy' : 'sell';
      spawnComet(cometType);
    }, 8000); // Every 8 seconds for more dramatic timing

    return () => clearInterval(interval);
  }, [spawnComet]);

  return (
    <>
      {/* Render active comets */}
      {activeComets.map(comet => (
        <CometDemo
          key={comet.id}
          startPosition={comet.startPosition}
          endPosition={comet.endPosition}
          color={comet.color}
          speed={comet.speed}
          onComplete={() => {
            setActiveComets(prev => prev.filter(c => c.id !== comet.id));
          }}
        />
      ))}
      
      {children}
    </>
  );
}