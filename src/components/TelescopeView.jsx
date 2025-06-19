import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGLTF, shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import PrettyPlanet from './PrettyPlanet';
import { NebulaCloud } from './CreateNebula';

// Portal Shader Material
const PortalMaterial = shaderMaterial(
  {
    time: 0,
    perlinnoise: null,
    sparknoise: null,
    waterturbulence: null,
    noiseTex: null,
    color0: new THREE.Vector3(1, 5, 1),
    color1: new THREE.Vector3(2, 20, 2),
    color2: new THREE.Vector3(97, 15, 25),
    color3: new THREE.Vector3(133, 85, 150),
    color4: new THREE.Vector3(40, 70, 173),
    color5: new THREE.Vector3(86, 48, 75),
    resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
  },
  // Vertex shader
  `
    varying vec3 vNormal;
    varying vec3 camPos;
    varying vec2 vUv;
    
    void main() {
      vNormal = normal;
      vUv = uv;
      camPos = cameraPosition;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `,
  // Fragment shader
  `
    #define NUM_OCTAVES 5
    #define M_PI 3.1415926535897932384626433832795
    uniform vec4 resolution;
    varying vec3 vNormal;
    uniform sampler2D perlinnoise;
    uniform sampler2D sparknoise;
    uniform sampler2D waterturbulence;
    uniform sampler2D noiseTex;
    uniform float time;
    uniform vec3 color0;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform vec3 color3;
    uniform vec3 color4;
    uniform vec3 color5;
    varying vec3 camPos;
    varying vec2 vUv;

    
    float rand(vec2 n) {
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }

    float noise(vec2 p){
      vec2 ip = floor(p);
      vec2 u = fract(p);
      u = u*u*(3.0-2.0*u);

      float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
      return res*res;
    }

    float fbm(vec2 x) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(100);
      // Rotate to reduce axial bias
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
      for (int i = 0; i < NUM_OCTAVES; ++i) {
        v += a * noise(x);
        x = rot * x * 2.0 + shift;
        a *= 0.5;
      }
      return v;
    }

    float setOpacity(float r, float g, float b, float tonethreshold) {
      float tone = (r + g + b) / 3.0;
      float alpha = 1.0;
      if(tone<tonethreshold) {
        alpha = 0.0;
      }
      return alpha;
    }

    vec3 rgbcol(vec3 col) {
      return vec3(col.r/255.0,col.g/255.0,col.b/255.0);
    }

    vec2 rotate(vec2 v, float a) {
      float s = sin(a);
      float c = cos(a);
      mat2 m = mat2(c, -s, s, c);
      return m * v;
    }

    vec2 UnityPolarCoordinates (vec2 UV, vec2 Center, float RadialScale, float LengthScale){
      vec2 delta = UV - Center;
      float radius = length(delta) * 2. * RadialScale;
      float angle = atan(delta.x, delta.y) * 1.0/6.28 * LengthScale;
      return vec2(radius, angle);
    }
   
    void main() {
      vec2 olduv = gl_FragCoord.xy/resolution.xy ;
      vec2 uv = vUv ; 
      vec2 imguv = uv;
      float scale = 1.;
      olduv *= 0.5 + time; 
      olduv.y = olduv.y ;
      vec2 p = olduv*scale;
      float noise = fbm( p  )*0.04;
      vec4 txt = texture2D(perlinnoise, olduv);
      float gradient = dot(normalize( -camPos ), normalize( vNormal ));
      float pct = distance(vUv,vec2(0.5));
 
      vec3 rgbcolor0 = rgbcol(color0);
      vec3 rgbcolor1 = rgbcol(color1);
      vec3 rgbcolor2 = rgbcol(color2);
      vec3 rgbcolor3 = rgbcol(color3);
      vec3 rgbcolor4 = rgbcol(color4);
      vec3 rgbcolor5 = rgbcol(color5);

      // set solid background
      float y = smoothstep(0.16,0.525,pct);
      vec3 backcolor = mix(rgbcolor0, rgbcolor5, y);

      gl_FragColor = vec4(backcolor,1.);

      // set polar coords
      vec2 center = vec2(0.5);
      vec2 cor = UnityPolarCoordinates(vUv, center, 1., 1.);
      vec2 newvUv = vUv - 0.5;
      vec3 noisetexvUv = texture2D(perlinnoise,mod(rotate(newvUv*0.15 + vec2(sin(time*0.005),cos(time*0.005)),time),1.)).rgb;    

      // set textures
      vec2 newUv = vec2(cor.x + time,cor.x+cor.y);
      vec3 noisetex = texture2D(perlinnoise,mod(newUv,1.)).rgb;    
      vec3 noisetex2 = texture2D(sparknoise,mod(newUv,1.)).rgb;    
      vec3 noisetex3 = texture2D(waterturbulence,mod(newUv,1.)).rgb;    


      // set textures tones
      float tone0 =  1. - smoothstep(0.3,0.6,noisetex.r);
      float tone1 =  smoothstep(0.3,0.6,noisetex2.r);
      float tone2 =  smoothstep(0.3,0.6,noisetex3.r);


      // set opacity for each tone
      float opacity0 = setOpacity(tone0,tone0,tone0,.29);
      float opacity1 = setOpacity(tone1,tone1,tone1,.49);
      float opacity2 = setOpacity(tone2,tone2,tone2,.69);

      // build circular noise
      float gradienttone = 1. - smoothstep(0.196,0.532,pct);
      vec4 circularnoise = vec4( vec3(gradienttone)*noisetexvUv*1.4, 1.0 );
      float gradopacity = setOpacity(circularnoise.r,circularnoise.g,circularnoise.b,0.19);

      // set edge static sparkle
      vec2 uv2 = uv;
      float iTime = time*0.004;
      uv.y += iTime / 10.0;
      uv.x -= (sin(iTime/10.0)/2.0);
      uv2.x += iTime / 14.0;
      uv2.x += (sin(iTime/10.0)/9.0);
      float result = 0.0;
      result += texture2D(noiseTex, mod(uv*0.5,1.) * 0.6 + vec2(iTime*-0.003)).r;
      result *= texture2D(noiseTex, mod(uv2*0.5,1.) * 0.9 + vec2(iTime*+0.002)).b;
      result = pow(result, 4.0);



      //set final render
      if(opacity2>0.0){
        gl_FragColor = vec4(rgbcolor4,0.)*vec4(opacity2);
      } else if(opacity1>0.0){
        gl_FragColor = vec4(rgbcolor2,0.)*vec4(opacity1);
      } else if(opacity0>0.0){
        gl_FragColor = vec4(rgbcolor1,0.)*vec4(opacity0);
      } 
      gl_FragColor += vec4(108.0)*result*(y*0.02);
      gl_FragColor *= vec4(gradopacity);
      
    }
  `
);

// Extend to make it available in JSX
extend({ PortalMaterial });

// Portal component
function Portal({ position = [0, 0, -100], scale = 15 }) {
  const materialRef = useRef();
  const textureLoader = new THREE.TextureLoader();
  
  const textures = useMemo(() => {
    return {
      perlinnoise: textureLoader.load('https://raw.githubusercontent.com/pizza3/asset/master/noise9.png'),
      sparknoise: textureLoader.load('https://raw.githubusercontent.com/pizza3/asset/master/sparklenoise.png'),
      waterturbulence: textureLoader.load('https://raw.githubusercontent.com/pizza3/asset/master/waterturbulence.png'),
      noiseTex: textureLoader.load('https://raw.githubusercontent.com/pizza3/asset/master/rgbnoise2.png')
    };
  }, []);
  
  useFrame((state) => {
    if (materialRef.current) {
      // Multiply by a factor less than 1 to slow down the animation
      // 0.1 = 10x slower, 0.5 = 2x slower, etc.
      materialRef.current.time = state.clock.elapsedTime * 0.2;
    }
  });
  
  return (
    <mesh position={position} scale={scale}>
      <planeGeometry args={[5, 5, 1, 1]} />
      <portalMaterial
        ref={materialRef}
        perlinnoise={textures.perlinnoise}
        sparknoise={textures.sparknoise}
        waterturbulence={textures.waterturbulence}
        noiseTex={textures.noiseTex}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

// Comet component that periodically streaks across the sky
function Comet({ isTelescopeView }) {
  const cometRef = useRef();
  const particlesRef = useRef();
  const { scene } = useGLTF('/comet.glb');
  const [isActive, setIsActive] = useState(false);
  const progressRef = useRef(0);
  const trailParticles = useRef([]);
  const lastPositionRef = useRef({ x: 0, y: 0, z: 0 });
  const lastTailPositionRef = useRef({ x: 0, y: 0, z: 0 });
  
  // Clone the scene to avoid conflicts
  const cometScene = React.useMemo(() => {
    const cloned = scene.clone();
    // Enhance the GLB's existing materials for bloom
    cloned.traverse((child) => {
      if (child.isMesh && child.material) {
        // Keep original material but ensure bloom will work
        if (child.material.emissive) {
          child.material.toneMapped = false; // Important for bloom
          child.material.emissiveIntensity = (child.material.emissiveIntensity);
        }
      }
    });
    return cloned;
  }, [scene]);
  
  // Create particle system for trail
  const particleCount = 200;
  const { particleGeometry, particlePositions, particleSizes, particleOpacities, particleBaseSizes } = React.useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);
    const baseSizes = new Float32Array(particleCount);
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      baseSizes[i] = Math.random() * 0.3 + 0.1; // Store base size for each particle
      sizes[i] = baseSizes[i];
      opacities[i] = 0;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
    return { 
      particleGeometry: geometry, 
      particlePositions: positions, 
      particleSizes: sizes,
      particleOpacities: opacities,
      particleBaseSizes: baseSizes
    };
  }, []);
  
  useFrame((state) => {
    if (!isTelescopeView || !cometRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    // Start a new comet pass every 10 seconds
    if (time % 10 < 0.016 && !isActive) {
      setIsActive(true);
      progressRef.current = 0;
      trailParticles.current = [];
      
      // Randomize starting position - closer to camera for better visibility
      const angle = Math.random() * Math.PI * 2;
      const startRadius = 40; // Increased from 30
      const startPos = {
        x: Math.cos(angle) * startRadius,
        y: (Math.random() - 0.5) * 20,
        z: Math.sin(angle) * startRadius - 10
      };
      cometRef.current.userData.startPos = startPos;
      
      // Initialize last position to starting position
      lastPositionRef.current = { ...startPos };
      lastTailPositionRef.current = { ...startPos };
      
      // Set direction towards center with some variation
      const endAngle = angle + Math.PI + (Math.random() - 0.5) * 0.5;
      const endRadius = 45; // Also increased for longer flight path
      cometRef.current.userData.endPos = {
        x: Math.cos(endAngle) * endRadius,
        y: (Math.random() - 0.5) * 20,
        z: Math.sin(endAngle) * endRadius - 10
      };
    }
    
    if (isActive) {
      progressRef.current += 0.0025; // Slower speed for testing
      
      if (progressRef.current >= 1) {
        setIsActive(false);
        cometRef.current.visible = false;
        if (particlesRef.current) particlesRef.current.visible = false;
        return;
      }
      
      // Make visible
      cometRef.current.visible = true;
      if (particlesRef.current) particlesRef.current.visible = true;
      
      // Animate along path
      const start = cometRef.current.userData.startPos;
      const end = cometRef.current.userData.endPos;
      
      // Check if positions are defined
      if (!start || !end) return;
      
      const t = progressRef.current;
      
      // Use quadratic bezier for curved path
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2 + 15; // Increased arc height
      const midZ = (start.z + end.z) / 2 - 5; // Push deeper into scene
      
      // Quadratic bezier interpolation
      const x = (1-t)*(1-t)*start.x + 2*(1-t)*t*midX + t*t*end.x;
      const y = (1-t)*(1-t)*start.y + 2*(1-t)*t*midY + t*t*end.y;
      const z = (1-t)*(1-t)*start.z + 2*(1-t)*t*midZ + t*t*end.z;
      
      // Calculate actual velocity from last frame
      const actualVelocity = {
        x: x - lastPositionRef.current.x,
        y: y - lastPositionRef.current.y,
        z: z - lastPositionRef.current.z
      };
      
      // Update position
      cometRef.current.position.set(x, y, z);
      
      // Point comet in direction of movement
      const nextT = Math.min(t + 0.01, 1);
      const nextX = (1-nextT)*(1-nextT)*start.x + 2*(1-nextT)*nextT*midX + nextT*nextT*end.x;
      const nextY = (1-nextT)*(1-nextT)*start.y + 2*(1-nextT)*nextT*midY + nextT*nextT*end.y;
      const nextZ = (1-nextT)*(1-nextT)*start.z + 2*(1-nextT)*nextT*midZ + nextT*nextT*end.z;
      
      // Create direction vector
      const direction = new THREE.Vector3(nextX - x, nextY - y, nextZ - z).normalize();
      
      // Point comet at the next position
      cometRef.current.lookAt(nextX, nextY, nextZ);
      
      // ADJUSTABLE PARAMETERS - Change these to match your comet model's orientation
      // Try different combinations until the comet faces forward:
      const modelAdjustments = {
        rotateX: 0,           // Try: 0, Math.PI/2, -Math.PI/2, Math.PI
        rotateY: -Math.PI/2,           // Try: 0, Math.PI/2, -Math.PI/2, Math.PI  
        rotateZ: 0  // Try: 0, Math.PI/2, -Math.PI/2, Math.PI
      };
      
      // Apply model-specific rotations
      cometRef.current.rotateX(modelAdjustments.rotateX);
      cometRef.current.rotateY(modelAdjustments.rotateY);
      cometRef.current.rotateZ(modelAdjustments.rotateZ);
      
      // Calculate tail position based on which axis the tail is on
      // If head is on +X, tail is on -X, so we use negative X direction
      const tailOffsetVector = new THREE.Vector3(-0.1, -0.02, 0); // Tail offset in local space
      
      // Transform tail offset to world space
      tailOffsetVector.applyQuaternion(cometRef.current.quaternion);
      const tailX = x + tailOffsetVector.x;
      const tailY = y + tailOffsetVector.y;
      const tailZ = z + tailOffsetVector.z;
      
      // Calculate distance traveled since last frame
      const distanceTraveled = Math.sqrt(
        actualVelocity.x * actualVelocity.x + 
        actualVelocity.y * actualVelocity.y + 
        actualVelocity.z * actualVelocity.z
      );
      
      // Determine number of particles to spawn based on distance traveled
      // This ensures continuous trail even at high speeds
      const particlesPerUnit = 20; // Adjust for density
      const particlesToSpawn = Math.max(1, Math.floor(distanceTraveled * particlesPerUnit));
      
      // Spawn particles along the path from last position to current position
      for (let i = 0; i < particlesToSpawn; i++) {
        // Interpolate between last tail position and current tail position
        const interpolationFactor = i / particlesToSpawn;
        
        const spawnX = lastTailPositionRef.current.x + (tailX - lastTailPositionRef.current.x) * interpolationFactor;
        const spawnY = lastTailPositionRef.current.y + (tailY - lastTailPositionRef.current.y) * interpolationFactor;
        const spawnZ = lastTailPositionRef.current.z + (tailZ - lastTailPositionRef.current.z) * interpolationFactor;
        
        // Add some randomness for a more natural look
        const randomOffset = 0.05;
        
        trailParticles.current.push({
          position: { 
            x: spawnX + (Math.random() - 0.5) * randomOffset, 
            y: spawnY + (Math.random() - 0.5) * randomOffset, 
            z: spawnZ + (Math.random() - 0.5) * randomOffset 
          },
          life: 1.0,
          baseSize: Math.random() * 0.6 + 0.4, // Larger base size for new particles near the comet
          velocity: {
            // Particles inherit some of the comet's velocity but quickly slow down
            x: actualVelocity.x * 0.3 + (Math.random() - 0.5) * 0.01,
            y: actualVelocity.y * 0.3 + (Math.random() - 0.5) * 0.01,
            z: actualVelocity.z * 0.3 + (Math.random() - 0.5) * 0.01
          }
        });
      }
      
      // Update last positions for next frame
      lastPositionRef.current = { x, y, z };
      lastTailPositionRef.current = { x: tailX, y: tailY, z: tailZ };
      
      // Limit trail length
      while (trailParticles.current.length > particleCount) {
        trailParticles.current.shift();
      }
      
      // Update particle system
      if (particlesRef.current) {
        const positions = particlesRef.current.geometry.attributes.position.array;
        const opacities = particlesRef.current.geometry.attributes.opacity.array;
        const sizes = particlesRef.current.geometry.attributes.size.array;
        
        // Update each particle
        trailParticles.current.forEach((particle, i) => {
          if (i < particleCount) {
            // Update position with velocity
            particle.position.x += particle.velocity.x;
            particle.position.y += particle.velocity.y;
            particle.position.z += particle.velocity.z;
            
            // Gradually slow down particles (stronger drag as they age)
            const dragFactor = 0.98 - (1 - particle.life) * 0.1; // More drag as particle ages
            particle.velocity.x *= dragFactor;
            particle.velocity.y *= dragFactor;
            particle.velocity.z *= dragFactor;
            
            // Add slight downward drift for realism
            particle.velocity.y -= 0.0005;
            
            // Update life
            particle.life -= 0.02; // Faster decay for shorter trail
            
            // Set particle attributes
            positions[i * 3] = particle.position.x;
            positions[i * 3 + 1] = particle.position.y;
            positions[i * 3 + 2] = particle.position.z;
            
            // Taper effect: both size and opacity decrease with age
            const lifeFactor = particle.life;
            // Invert the taper - larger when life is high (new particles), smaller when life is low (old particles)
            const taperFactor = Math.pow(lifeFactor, 2); // Square for more dramatic taper from thick to thin
            
            sizes[i] = particle.baseSize * (0.2 + 0.8 * taperFactor); // Minimum 20% size at the tail end
            opacities[i] = Math.max(0, lifeFactor * lifeFactor * 0.8); // Quadratic falloff for opacity
          }
        });
        
        // Clear unused particles
        for (let i = trailParticles.current.length; i < particleCount; i++) {
          opacities[i] = 0;
          sizes[i] = 0;
        }
        
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
        particlesRef.current.geometry.attributes.opacity.needsUpdate = true;
        particlesRef.current.geometry.attributes.size.needsUpdate = true;
      }
    }
  });
  
  return (
    <group>
      {/* Comet GLB model */}
      <primitive 
        ref={cometRef}
        object={cometScene}
        scale={0.5}
        visible={false}
      />
      
      {/* Particle trail */}
      <points ref={particlesRef} visible={false} geometry={particleGeometry}>
        <shaderMaterial
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          vertexShader={`
            attribute float size;
            attribute float opacity;
            varying float vOpacity;
            void main() {
              vOpacity = opacity;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
          fragmentShader={`
            varying float vOpacity;
            void main() {
              vec2 cxy = 2.0 * gl_PointCoord - 1.0;
              float r = dot(cxy, cxy);
              if (r > 1.0) discard;
              
              float falloff = 1.0 - r;
              vec3 color = mix(vec3(1.0, 0.6, 0.2), vec3(1.0, 0.9, 0.5), falloff);
              float alpha = vOpacity * falloff;
              
              gl_FragColor = vec4(color, alpha);
            }
          `}
        />
      </points>
    </group>
  );
}

// Simple static stars that don't move with camera
function TelescopeStars() {
  const starsGeometry = React.useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(5000 * 3);
    
    for (let i = 0; i < 5000; i++) {
      const i3 = i * 3;
      // Distribute stars on a large sphere
      const radius = 300 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);
  
  return (
    <points geometry={starsGeometry}>
      <pointsMaterial
        color={0xffffff}
        size={1}
        sizeAttenuation={false}
        transparent
        opacity={0.8}
      />
    </points>
  );
}

// Telescope Camera Controller for panning and zoom
function TelescopeControls() {
  const { camera, gl } = useThree();
  const panRef = useRef({ x: 0, y: 0 }); // Track pan offset
  const zoomRef = useRef(50); // Default FOV
  const minZoom = 10; // Max zoom in
  const maxZoom = 90; // Max zoom out
  
  // Pan limits to prevent going too far
  const maxPan = 100;
  
  useEffect(() => {
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    
    // Mouse controls
    const handleMouseDown = (event) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    
    const handleMouseMove = (event) => {
      if (!isMouseDown) return;
      
      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;
      
      // Update pan position
      const panSpeed = 0.5; // Adjust for sensitivity
      panRef.current.x -= deltaX * panSpeed;
      panRef.current.y += deltaY * panSpeed; // Invert Y for natural feel
      
      // Apply pan limits
      panRef.current.x = Math.max(-maxPan, Math.min(maxPan, panRef.current.x));
      panRef.current.y = Math.max(-maxPan, Math.min(maxPan, panRef.current.y));
      
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    
    const handleMouseUp = () => {
      isMouseDown = false;
    };
    
    // Mouse wheel zoom
    const handleWheel = (event) => {
      event.preventDefault();
      
      const zoomSpeed = 2;
      zoomRef.current += event.deltaY * 0.01 * zoomSpeed;
      zoomRef.current = Math.max(minZoom, Math.min(maxZoom, zoomRef.current));
      
      camera.fov = zoomRef.current;
      camera.updateProjectionMatrix();
    };
    
    // Touch controls
    let touchStartX = 0;
    let touchStartY = 0;
    let initialPinchDistance = null;
    let initialFov = null;
    
    const handleTouchStart = (event) => {
      if (event.touches.length === 1) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      } else if (event.touches.length === 2) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        initialFov = camera.fov;
      }
    };
    
    const handleTouchMove = (event) => {
      event.preventDefault();
      
      if (event.touches.length === 1) {
        const deltaX = event.touches[0].clientX - touchStartX;
        const deltaY = event.touches[0].clientY - touchStartY;
        
        // Update pan position for touch
        const panSpeed = 0.5;
        panRef.current.x -= deltaX * panSpeed;
        panRef.current.y += deltaY * panSpeed;
        
        // Apply pan limits
        panRef.current.x = Math.max(-maxPan, Math.min(maxPan, panRef.current.x));
        panRef.current.y = Math.max(-maxPan, Math.min(maxPan, panRef.current.y));
        
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      } else if (event.touches.length === 2 && initialPinchDistance && initialFov) {
        const dx = event.touches[0].clientX - event.touches[1].clientX;
        const dy = event.touches[0].clientY - event.touches[1].clientY;
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        const scale = currentDistance / initialPinchDistance;
        const newFov = initialFov / scale;
        
        zoomRef.current = Math.max(minZoom, Math.min(maxZoom, newFov));
        camera.fov = zoomRef.current;
        camera.updateProjectionMatrix();
      }
    };
    
    const handleTouchEnd = () => {
      initialPinchDistance = null;
      initialFov = null;
    };
    
    // Add event listeners
    const canvas = gl.domElement;
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [camera, gl, maxPan]);
  
  // Update camera position and look-at based on pan
  useFrame(() => {
    // Fixed camera position
    camera.position.set(0, 0, 50);
    
    // Pan by changing where camera looks
    const lookAtX = panRef.current.x;
    const lookAtY = panRef.current.y;
    const lookAtZ = -100; // Look into the distance
    
    camera.lookAt(lookAtX, lookAtY, lookAtZ);
    camera.updateProjectionMatrix();
  });
  
  return null;
}

// Preload the comet model
useGLTF.preload('/comet.glb');

// // 2D Nebula Effect Component
// function Nebula2D() {
//   const textureRef = useRef();
//   const canvasRef = useRef();
  
//   useEffect(() => {
//     // Create canvas
//     const canvas = document.createElement('canvas');
//     canvas.width = 1024;
//     canvas.height = 1024;
//     canvasRef.current = canvas;
    
//     const ctx = canvas.getContext('2d');
//     const width = canvas.width;
//     const height = canvas.height;
    
//     // Nebula particles
//     class NebulaParticle {
//       constructor() {
//         this.reset();
//       }
      
//       reset() {
//         this.x = Math.random() * width;
//         this.y = Math.random() * height;
//         this.size = Math.random() * 80 + 40; // Much larger for cloud effect
//         this.speed = Math.random() * 0.02 + 0.005; // Slower for ethereal movement
//         this.brightness = Math.random() * 0.3 + 0.1; // Lower overall brightness
//         this.color = Math.random() > 0.5 ? '#D946EF' : '#67e8f9';
//         this.angle = Math.random() * Math.PI * 2;
//         this.rotationSpeed = (Math.random() - 0.5) * 0.001; // Very slow rotation
//         this.phase = Math.random() * Math.PI * 2; // For independent pulsing
//       }
      
//       update() {
//         // Very slow orbital movement
//         this.angle += this.rotationSpeed;
//         this.x += Math.cos(this.angle) * this.speed;
//         this.y += Math.sin(this.angle) * this.speed;
        
//         // Wrap around edges with margin for smooth transition
//         const margin = this.size;
//         if (this.x < -margin) this.x = width + margin;
//         if (this.x > width + margin) this.x = -margin;
//         if (this.y < -margin) this.y = height + margin;
//         if (this.y > height + margin) this.y = -margin;
        
//         // Gentle pulsing brightness
//         this.brightness = (Math.sin(Date.now() * 0.0005 + this.phase) * 0.1 + 0.2) * 0.5;
//       }
      
//       draw() {
//         ctx.save();
        
//         // Create multi-layered gradient for wispy cloud effect
//         const gradient = ctx.createRadialGradient(
//           this.x, this.y, 0,
//           this.x, this.y, this.size
//         );
        
//         const colorRGB = this.color === '#D946EF' ? 'rgba(217, 70, 239,' : 'rgba(103, 232, 249,';
        
//         // Very soft, diffuse gradient
//         gradient.addColorStop(0, colorRGB + (this.brightness * 0.3) + ')');
//         gradient.addColorStop(0.2, colorRGB + (this.brightness * 0.2) + ')');
//         gradient.addColorStop(0.5, colorRGB + (this.brightness * 0.1) + ')');
//         gradient.addColorStop(0.8, colorRGB + (this.brightness * 0.05) + ')');
//         gradient.addColorStop(1, colorRGB + '0)');
        
//         ctx.fillStyle = gradient;
        
//         // Draw as a soft circle instead of rectangle
//         ctx.beginPath();
//         ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
//         ctx.fill();
        
//         ctx.restore();
//       }
//     }
    
//     // Create particles
//     const particles = [];
//     const particleCount = 30; // Fewer particles for more subtle effect
    
//     for (let i = 0; i < particleCount; i++) {
//       particles.push(new NebulaParticle());
//     }
    
//     // Animation loop
//     let animationId;
//     const animate = () => {
//       // Clear canvas with very slight fade for trail effect
//       ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
//       ctx.fillRect(0, 0, width, height);
      
//       // Update and draw particles
//       particles.forEach(particle => {
//         particle.update();
//         particle.draw();
//       });
      
//       // Update texture
//       if (textureRef.current) {
//         textureRef.current.needsUpdate = true;
//       }
      
//       animationId = requestAnimationFrame(animate);
//     };
    
//     animate();
    
//     return () => {
//       cancelAnimationFrame(animationId);
//     };
//   }, []);
  
//   return (
//     <mesh position={[0, 0, -200]}>
//       <planeGeometry args={[100, 100]} />
//       <meshBasicMaterial transparent opacity={0.3} blending={THREE.AdditiveBlending} depthWrite={false}>
//         <canvasTexture 
//           ref={textureRef}
//           attach="map" 
//           image={canvasRef.current}
//         />
//       </meshBasicMaterial>
//     </mesh>
//   );
// }

// Earth model component
function Earth({ position = [0, 0, 0], scale = 0.5 }) {
  const { scene } = useGLTF('/earth.glb');
  const earthGroupRef = useRef();
  
  // Clone the scene to avoid conflicts
  const earthScene = React.useMemo(() => {
    return scene.clone();
  }, [scene]);
  
  // Rotate the Earth slowly on its axis
  useFrame(() => {
    if (earthGroupRef.current) {
      earthGroupRef.current.rotation.y += 0.002; // Rotate around Y-axis (standard Earth rotation)
    }
  });
  
  return (
    <group position={position}>
      <group ref={earthGroupRef} scale={scale}>
        <primitive 
          object={earthScene}
          position={[0, 0, 0]}
        />
        {/* Shadow overlay to create day/night effect */}
        <mesh rotation={[0, Math.PI * 0.5, 0]}>
          <sphereGeometry args={[1.01, 32, 32, Math.PI * 0.5, Math.PI]} />
          <meshBasicMaterial 
            color={0x000000}
            transparent
            opacity={0.6}
            side={THREE.BackSide}
          />
        </mesh>
      </group>
    </group>
  );
}

// Preload the earth model
useGLTF.preload('/earth.glb');

// Main TelescopeView Component with enhancements
export default function TelescopeView({ isTelescopeView = false }) {
  // Only render telescope content when isTelescopeView is true
  if (!isTelescopeView) {
    return null;
  }

  return (
    <group>
      {/* Add telescope controls for camera movement */}
      <TelescopeControls />
      
      {/* Add ambient light to help colors show */}
      <ambientLight intensity={0.3} />
      {/* Add directional light to simulate the sun */}
      <directionalLight 
        position={[100, 0, 0]} 
        intensity={1} 
        color={0xffffff}
      />
      
      {/* Add comet that streaks across the sky */}
      <Comet isTelescopeView={isTelescopeView} />
      
      {/* Add Portal Shader Effect */}
      <Portal position={[-50, -20, -10]} scale={3} />
      
      {/* Add 2D Nebula Effect */}
      {/* <Nebula2D /> */}
      
      {/* Scene content - no longer wrapped for rotation */}
      <group>
        {/* Custom static starfield background */}
        <mesh>
          <sphereGeometry args={[500, 64, 64]} />
          <meshBasicMaterial 
            color={0x000000}
            side={THREE.BackSide}
          />
        </mesh>
        
        {/* Add static stars as points */}
        {/* <TelescopeStars /> */}
        
        {/* Add Earth model */}
        <Earth 
          position={[-1, 30, -10]} 
          scale={1}
        />
        
        {/* Add PrettyPlanet at a much greater distance */}
        <group position={[50, 20, -150]}>
          {/* Background sphere for visibility */}
          {/* <mesh>
            <sphereGeometry args={[30, 32, 32]} />
            <meshBasicMaterial 
              color={0x1a0033}
              transparent
              opacity={0.3}
            />
          </mesh> */}
          
          {/* Add glowing core for more vibrancy */}
          {/* <mesh>
            <sphereGeometry args={[20, 32, 32]} />
            <meshBasicMaterial 
              color={0x00ffff}
              transparent
              opacity={0.2}
              blending={THREE.AdditiveBlending}
            />
          </mesh> */}
          
          {/* Add another glow layer */}
          {/* <mesh>
            <sphereGeometry args={[25, 32, 32]} />
            <meshBasicMaterial 
              color={0xff1493}
              transparent
              opacity={0.1}
              blending={THREE.AdditiveBlending}
            />
          </mesh> */}
          
          {/* PrettyPlanet */}
          {/* <NebulaCloud position={[0, 0, 10]} scale={30} /> */}
          <PrettyPlanet 
            position={[-20, -5, 165]}
            scale={0.2 }
          />
        </group>
      </group>
    </group>
  );
}