import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Add this helper function at the top level
function clampHue(hue) {
  // Ensure hue stays in blue-purple range (220-320)
  while (hue < 220) hue += 360;
  while (hue > 320) hue -= 360;
  return hue;
}

// Gradient background shaders
const bgVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const bgFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    // Animate hue by time, and shift gradient vertically
    float baseHue = mod(uTime * 0.03, 1.0);
    float hue = mod(baseHue + vUv.y * 0.35, 1.0);
    vec3 color = vec3(0.0);
    float s = 0.4 + vUv.y * 0.4;
    float l = 0.15 + vUv.y * 0.1;
    // HSL to RGB
    float c = (1.0 - abs(2.0 * l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(hue * 6.0, 2.0) - 1.0));
    float m = l - c / 2.0;
    if (hue < 1.0/6.0) color = vec3(c, x, 0.0);
    else if (hue < 2.0/6.0) color = vec3(x, c, 0.0);
    else if (hue < 3.0/6.0) color = vec3(0.0, c, x);
    else if (hue < 4.0/6.0) color = vec3(0.0, x, c);
    else if (hue < 5.0/6.0) color = vec3(x, 0.0, c);
    else color = vec3(c, 0.0, x);
    color += vec3(m);
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Custom shader for particles with trails and color shifting
const particleVertexShader = `
  attribute float size;
  attribute vec3 aColor;
  attribute float alpha;
  attribute vec3 trail;
  
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vColor = aColor;
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    
    float strength = 1.0 - dist * 2.0;
    vec3 fragColor = vColor * strength;
    gl_FragColor = vec4(fragColor, vAlpha * strength);
  }
`;

// Shader for connecting lines with color blending
const lineVertexShader = `
  attribute vec3 aColor;
  attribute float alpha;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = alpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const lineFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  
  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

function getParticleCount(width, height) {
  if (width < 450 || height < 200) return 15;
  if (width < 600 || height < 300) return 20;
  if (width < 900 || height < 400) return 25;
  if (width < 1200 || height < 500) return 30;
  return 35;
}



const ParticleBackground = () => {
  const pointsRef = useRef();
  // Ref for connecting lines between particles
  const linesRef = useRef();
  const { size, viewport, camera } = useThree();
  const mouseRef = useRef({ xNDC: 0, yNDC: 0, active: false });
  const [fireworks, setFireworks] = useState([]);
  const [ripples, setRipples] = useState([]);
  const [dustParticles, setDustParticles] = useState([]);
  const hues = useRef([]);
  const colorArray = useRef();
  // Keep track of last pixel mouse position for ripples
const lastMousePos = useRef({ xPx: null, yPx: null });


  const [particleState, setParticleState] = useState({
    particles: [],
    velocities: [],
    trails: []
  });

  // Ref for gradient background material
  const bgMaterialRef = useRef();
  const bgMeshRef = useRef();

  // Uniforms for gradient background shader
  const bgUniforms = useRef({
    uTime: { value: 0 }
  });

  function initializeParticles(width, height) {
    const count = getParticleCount(width, height);
    const particles = [];
    const velocities = [];
    const trails = [];

    
    for (let i = 0; i < count; i++) {
// Calculate the actual visible bounds in world units at z = -2

const fov = THREE.MathUtils.degToRad(camera.fov);
const z = -5; // Push back behind moon

const distance = Math.abs(z - camera.position.z);
const visibleHeight = 2 * Math.tan(fov / 2) * distance;
const visibleWidth = visibleHeight * camera.aspect;

const x = (Math.random() - 0.5) * visibleWidth;
const y = (Math.random() - 0.5) * visibleHeight;



      particles.push([x, y, z]);
      velocities.push([
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        0
      ]);
      trails.push([]);
    }
    setParticleState({ particles, velocities, trails });
    // After setting particle state, initialize geometry and material for pointsRef
    setTimeout(() => {
      if (!pointsRef.current) return;
      const particleCount = particles.length;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const alphas = new Float32Array(particleCount);
      const trailsArr = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        const [x, y, z] = particles[i];
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Set colors with hue shifting
        const hue = clampHue(220 + Math.random() * 100); // Strictly blue-purple range
        const color = new THREE.Color().setHSL(hue / 360, 0.25, 0.12); // Even darker and less saturated
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = Math.random() * 0.15 + 0.08; // Even smaller particles
        alphas[i] = 0.15; // More transparent

        trailsArr[i * 3] = x;
        trailsArr[i * 3 + 1] = y;
        trailsArr[i * 3 + 2] = z;
      }

      hues.current = Array.from({length: count}, () => Math.random() * 360);
      colorArray.current = new Float32Array(count * 3);

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
      geometry.setAttribute('trail', new THREE.BufferAttribute(trailsArr, 3));

      const material = new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      pointsRef.current.geometry = geometry;
      pointsRef.current.material = material;
    }, 0);
  }

  useEffect(() => {
    // Initial setup
    initializeParticles(window.innerWidth, window.innerHeight);
  
    // Reset on resize
    const handleResize = () => {
      initializeParticles(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create dust particles
  useEffect(() => {
    const dustCount = 200;
    const dustPositions = new Float32Array(dustCount * 3);
    const dustColors = new Float32Array(dustCount * 3);
    const dustSizes = new Float32Array(dustCount);

    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 100;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 100;

      const hue = clampHue(220 + Math.random() * 100);
      const color = new THREE.Color().setHSL(hue / 360, 0.25, 0.12);
      dustColors[i * 3] = color.r;
      dustColors[i * 3 + 1] = color.g;
      dustColors[i * 3 + 2] = color.b;

      dustSizes[i] = Math.random() * 0.15 + 0.05;
    }

    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute('aColor', new THREE.BufferAttribute(dustColors, 3));
    dustGeometry.setAttribute('size', new THREE.BufferAttribute(dustSizes, 1));

    const dustMaterial = new THREE.PointsMaterial({
      size: 0.02,
      vertexColors: true,
      transparent: true,
      opacity: 0.05,
      sizeAttenuation: true,
      depthWrite: false,
    });

    setDustParticles({ geometry: dustGeometry, material: dustMaterial });
  }, []);

  // // Handle mouse movement and create animated ripples
  // useEffect(() => {
  //   // Mouse move handler: update mouseRef and add a ripple at mouse location in world units
  //   const handleMouseMove = (event) => {
  //     // Normalized device coordinates
  //     const ndcX = (event.clientX / size.width) * 2 - 1;
  //     const ndcY = -(event.clientY / size.height) * 2 + 1;
  //     mouseRef.current = {
  //       x: ndcX,
  //       y: ndcY,
  //       active: true
  //     };
  //     // Convert mouse to world units at z = 0
  //     const z = 0;
  //     const distance = Math.abs(z - camera.position.z);
  //     const fov = THREE.MathUtils.degToRad(camera.fov);
  //     const visibleHeight = 2 * Math.tan(fov / 2) * distance;
  //     const visibleWidth = visibleHeight * camera.aspect;
  //     const worldX = ndcX * visibleWidth * 0.5;
  //     const worldY = ndcY * visibleHeight * 0.5;
  //     // Add a new ripple with ethereal parameters
  //     setRipples(prev => [
  //       ...prev,
  //       {
  //         x: worldX,
  //         y: worldY,
  //         z: z + 0.01, // tiny offset so it's above particles
  //         radius: 0.1 + Math.random() * 0.08,
  //         alpha: 0.23 + Math.random() * 0.06,
  //         hue: 200 + Math.random() * 120 // blue/cyan/violet
  //       }
  //     ]);
  //   };

  //   const handleMouseLeave = () => {
  //     mouseRef.current.active = false;
  //   };

  //   const handleClick = (event) => {
  //     const x = (event.clientX / size.width) * 2 - 1;
  //     const y = -(event.clientY / size.height) * 2 + 1;
      
  //     // Create firework particles
  //     const newFireworks = [];
  //     for (let i = 0; i < 15; i++) {
  //       const angle = Math.random() * Math.PI * 2;
  //       const speed = Math.random() * 2 + 1;
  //       newFireworks.push({
  //         position: [x * 50, y * 50, 0],
  //         velocity: [
  //           Math.cos(angle) * speed,
  //           Math.sin(angle) * speed,
  //           (Math.random() - 0.5) * speed
  //         ],
  //         color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
  //         size: Math.random() * 0.5 + 0.5,
  //         alpha: 1.0
  //       });
  //     }
  //     setFireworks(prev => [...prev, ...newFireworks]);
  //   };

  //   window.addEventListener('mousemove', handleMouseMove);
  //   window.addEventListener('mouseleave', handleMouseLeave);
  //   window.addEventListener('click', handleClick);

  //   return () => {
  //     window.removeEventListener('mousemove', handleMouseMove);
  //     window.removeEventListener('mouseleave', handleMouseLeave);
  //     window.removeEventListener('click', handleClick);
  //   };
  // }, [size, camera]);

  // Animate particles, background, and ripples
  useFrame(() => {
    if (
      !pointsRef.current ||
      !pointsRef.current.geometry ||
      !pointsRef.current.geometry.attributes.position
    ) {
      return;
    }
  
    // Calculate visible width/height at the Z depth of the particles
    const z = 0; // or whatever z your particles are at
    const distance = Math.abs(z - camera.position.z);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight = 2 * Math.tan(fov / 2) * distance;
    const visibleWidth = visibleHeight * camera.aspect;
  
    const geometry = pointsRef.current.geometry;
    const positions = geometry.attributes.position.array;
    const mouse = mouseRef.current;
    const width = size.width;
    const height = size.height;

    // Mutate particle arrays directly for performance
    const { particles, velocities, trails } = particleState;
    for (let i = 0; i < particles.length; i++) {
      let [x, y, z] = particles[i];
      let [vx, vy, vz] = velocities[i];

      // Mouse magnetism (like in source script)
      if (mouse.active) {
        const mx = mouse.x * width * 0.5;
        const my = mouse.y * height * 0.5;
        const dx = mx - x;
        const dy = my - y;
        const distSq = dx * dx + dy * dy;
        if (distSq < 22500) {
          const force = (22500 - distSq) / 22500;
          const dist = Math.sqrt(distSq) || 1;
          vx += (dx / dist) * force * 0.025;
          vy += (dy / dist) * force * 0.025;
        }
      }

// --- MOUSE TRAIL LOGIC ---
// Use window.__mouseTrail, set by overlay in parent component
if (window.__mouseTrail) {
  mouseRef.current = window.__mouseTrail;

  // Only spawn ripple if mouse position changes
  if (
    mouseRef.current.active &&
    (
      mouseRef.current.xPx !== lastMousePos.current.xPx ||
      mouseRef.current.yPx !== lastMousePos.current.yPx
    )
  ) {
    // Convert NDC to world coordinates at z=0
    const z = 0;
    const distance = Math.abs(z - camera.position.z);
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight = 2 * Math.tan(fov / 2) * distance;
    const visibleWidth = visibleHeight * camera.aspect;
    const worldX = mouseRef.current.xNDC * visibleWidth * 0.5;
    const worldY = mouseRef.current.yNDC * visibleHeight * 0.5;

    setRipples(prev => [
      ...prev,
      {
        x: worldX,
        y: worldY,
        z: z + 0.01, // tiny offset above particles
        radius: 0.08 + Math.random() * 0.06,
        alpha: 0.18 + Math.random() * 0.08,
        hue: 200 + Math.random() * 120 // blue/cyan/violet
      }
    ]);
    lastMousePos.current.xPx = mouseRef.current.xPx;
    lastMousePos.current.yPx = mouseRef.current.yPx;
  }
}

      // Damping and gentle drift
      vx *= mouse.active ? 0.997 : 0.9995;
      vy *= mouse.active ? 0.997 : 0.9995;
      // Gentle random drift (keeps system lively)
      if (!mouse.active) {
        vx += (Math.random() - 0.5) * 0.012; // smaller than 0.025!
        vy += (Math.random() - 0.5) * 0.012;
      }

      // Bounce
      if (x < -visibleWidth / 2 || x > visibleWidth / 2) vx *= -0.9;
      if (y < -visibleHeight / 2 || y > visibleHeight / 2) vy *= -0.9;

      // Update positions
      x += vx;
      y += vy;
      z += vz;

      // Update particleState arrays in place
      particles[i][0] = x;
      particles[i][1] = y;
      particles[i][2] = z;
      velocities[i][0] = vx;
      velocities[i][1] = vy;
      velocities[i][2] = vz;

      // Update geometry positions
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
    }

    // Update geometry positions attribute
    geometry.attributes.position.needsUpdate = true;

    // --- Begin hue cycling and color buffer update ---
    if (
      pointsRef.current &&
      pointsRef.current.geometry &&
      pointsRef.current.geometry.attributes.position &&
      colorArray.current &&
      hues.current
    ) {
      for (let i = 0; i < hues.current.length; i++) {
        // Strictly maintain blue-purple range
        hues.current[i] = clampHue(hues.current[i] + 0.2);
        const color = new THREE.Color().setHSL(hues.current[i] / 360, 0.25, 0.12);
        colorArray.current[i * 3] = color.r;
        colorArray.current[i * 3 + 1] = color.g;
        colorArray.current[i * 3 + 2] = color.b;
      }
      pointsRef.current.geometry.setAttribute(
        'aColor',
        new THREE.BufferAttribute(colorArray.current, 3)
      );
      pointsRef.current.geometry.attributes.aColor.needsUpdate = true;
    }
    // --- End hue cycling and color buffer update ---

    // --- Begin connecting lines logic ---
    if (
      linesRef.current &&
      particleState.particles.length > 1
    ) {
      // Find all pairs of particles closer than a threshold and build geometry
      const maxDist = visibleWidth / 14;
      const maxDistSq = maxDist * maxDist;
      const positions = [];
      const colors = [];
      const alphas = [];
      for (let i = 0; i < particleState.particles.length; i++) {
        for (let j = i + 1; j < particleState.particles.length; j++) {
          const [x1, y1, z1] = particleState.particles[i];
          const [x2, y2, z2] = particleState.particles[j];
          const dx = x1 - x2;
          const dy = y1 - y2;
          const dz = z1 - z2;
          const distSq = dx * dx + dy * dy + dz * dz;
          if (distSq < maxDistSq) {
            // Positions
            positions.push(x1, y1, z1, x2, y2, z2);
            // Colors: blend hues
            const h1 = hues.current[i], h2 = hues.current[j];
            const blendHue = (h1 + h2) / 2;
            const color = new THREE.Color().setHSL(blendHue / 360, 0.8, 0.6);
            colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
            // Alpha: fade with distance
            const maxDist = Math.sqrt(maxDistSq);
            const alpha = 1 - Math.sqrt(distSq) / maxDist;
            alphas.push(alpha, alpha);
          }
        }
      }
      // Update geometry
      let lineGeom = linesRef.current.geometry;
      if (!lineGeom) {
        lineGeom = new THREE.BufferGeometry();
        linesRef.current.geometry = lineGeom;
      }
      // If no close pairs, still need valid geometry (zero vertices)
      lineGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      lineGeom.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(colors), 3));
      lineGeom.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(alphas), 1));
      lineGeom.setDrawRange(0, positions.length / 3);
      lineGeom.attributes.position.needsUpdate = true;
      lineGeom.attributes.aColor.needsUpdate = true;
      lineGeom.attributes.alpha.needsUpdate = true;
    }
    // --- End connecting lines logic ---

    // Animate background time uniform
    bgUniforms.current.uTime.value += 1/60;

    // Animate ripples: expand, fade, cycle hue, remove dead
    setRipples(prevRipples => {
      // Tune these for ethereal effect
      const expansion = 0.12;
      const fade = 0.006;
      const hueShift = 0.3;
      return prevRipples
        .map(ripple => ({
          ...ripple,
          radius: ripple.radius + expansion * (0.98 + Math.random() * 0.04),
          alpha: ripple.alpha - fade * (0.98 + Math.random() * 0.04),
          hue: clampHue(ripple.hue + hueShift) // Ensure ripple colors stay in range
        }))
        .filter(ripple => ripple.alpha > 0.01);
    });

    // Update background plane mesh to always be behind the camera and fill the viewport
    if (bgMeshRef.current) {
      const zOffset = -40;
      const camDir = new THREE.Vector3();
      camera.getWorldDirection(camDir);
      const position = new THREE.Vector3().copy(camera.position).add(camDir.multiplyScalar(zOffset));
      bgMeshRef.current.position.copy(position);
      bgMeshRef.current.quaternion.copy(camera.quaternion);

      // Calculate frustum height and width at zOffset distance
      const distance = -zOffset;
      
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const heightAtDistance = 2 * Math.tan(fov / 2) * distance;
      const widthAtDistance = heightAtDistance * camera.aspect;

      bgMeshRef.current.scale.set(widthAtDistance, heightAtDistance, 1);
    }

    // If desired, setParticleState could be called here to update state,
    // but for performance, we keep particleState mutated in place.
  });

  return (
    <>
      {/* Animated gradient background plane behind all objects */}
      <mesh ref={bgMeshRef}>
        <planeGeometry args={[1, 1, 1, 1]} />
        <shaderMaterial
          ref={bgMaterialRef}
          args={[{ uniforms: bgUniforms.current, vertexShader: bgVertexShader, fragmentShader: bgFragmentShader, transparent: true, depthWrite: false }]}
        />
      </mesh>

      <group>
        {/* Draw lines between nearby particles */}
        <lineSegments ref={linesRef}>
          <shaderMaterial
            vertexColors
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            vertexShader={lineVertexShader}
            fragmentShader={lineFragmentShader}
          />
        </lineSegments>
        {/* ShaderMaterial for animated hue-cycling particles */}
        <points ref={pointsRef}>
          <shaderMaterial
            vertexColors
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            vertexShader={particleVertexShader}
            fragmentShader={particleFragmentShader}
          />
        </points>
        {/* Animated mouse ripple effect */}
        {/* Render each ripple as a transparent, ethereal circle */}
        {ripples.map((ripple, i) =>
          ripple.alpha > 0 && (
            <mesh
              key={i}
              position={[ripple.x, ripple.y, ripple.z]}
              renderOrder={10}
            >
              {/* Circle geometry, ethereal */}
              <circleGeometry args={[ripple.radius, 48]} />
              <meshBasicMaterial
                color={new THREE.Color().setHSL((ripple.hue % 360) / 360, 0.7, 0.72)}
                transparent
                opacity={ripple.alpha}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          )
        )}
        {dustParticles && (
          <points geometry={dustParticles.geometry} material={dustParticles.material} />
        )}
        {fireworks.map((fw, i) => (
          <mesh key={i} position={fw.position}>
            <sphereGeometry args={[fw.size, 8, 8]} />
            <meshBasicMaterial
              color={fw.color}
              transparent
              opacity={fw.alpha}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
    </>
  );
};

export default ParticleBackground; 