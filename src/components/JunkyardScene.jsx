import React, { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, useAnimations, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import HolographicStatue2 from "./3DVotiveStand/HolographicStatue2";
import dynamic from 'next/dynamic';
import { useMusic } from '../contexts/MusicContext';
import { IconButton, Box } from '@chakra-ui/react';
import StarField from './3DVotiveStand/StarField';
import FloatingCandleViewer from './3DVotiveStand/CandleInteraction';
import { db } from '../utilities/firebaseClient';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// Dynamically import the Mobile Music Player component
const MobileMusicPlayer = dynamic(() => import('./MobileMusicPlayer'), {
  ssr: false,
});

function JunkyardModel({ modelPath = '/junkyard3.glb', statuePosition = [2.85, 1.8, -1.1], onRobotFound }) {
  const group = useRef();
  const droneRef = useRef();
  const robotRef = useRef();
  const { scene, animations } = useGLTF(modelPath);
  const { actions, mixer } = useAnimations(animations, group);
  const [flickeringMaterials, setFlickeringMaterials] = useState(new Map());
  const [vcandleData, setVcandleData] = useState([]);
  const flickerIntensity = useRef(1.0);
  const flickerSpeed = useRef(3.0);
  
  // Fetch user data from Firestore
  useEffect(() => {
    const fetchVcandleData = async () => {
      try {
        console.log('Fetching VCANDLE data from Firestore...');
        const resultsRef = collection(db, 'results');
        
        // Get top 4 by burnedAmount
        const topBurnersQuery = query(resultsRef, orderBy('burnedAmount', 'desc'), limit(4));
        const topBurnersSnapshot = await getDocs(topBurnersQuery);
        const topBurners = topBurnersSnapshot.docs.map(doc => ({
          id: doc.id,
          userName: doc.data().username || doc.data().userName || "Anonymous",
          image: doc.data().image?.src || doc.data().image,
          message: doc.data().message || doc.data().userMessage,
          burnedAmount: doc.data().burnedAmount || 1,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        console.log('Top burners:', topBurners);
        
        // Get recent 4 users
        const recentUsersQuery = query(resultsRef, orderBy('createdAt', 'desc'), limit(8));
        const recentUsersSnapshot = await getDocs(recentUsersQuery);
        const allRecentUsers = recentUsersSnapshot.docs.map(doc => ({
          id: doc.id,
          userName: doc.data().username || doc.data().userName || "Anonymous",
          image: doc.data().image?.src || doc.data().image,
          message: doc.data().message || doc.data().userMessage,
          burnedAmount: doc.data().burnedAmount || 1,
          createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
        
        // Filter out duplicates and get next 4
        const recentUsers = allRecentUsers
          .filter(user => !topBurners.some(topUser => topUser.id === user.id))
          .slice(0, 4);
        console.log('Recent users:', recentUsers);
        
        const allData = [...topBurners, ...recentUsers];
        console.log('All VCANDLE data:', allData);
        setVcandleData(allData);
      } catch (error) {
        console.error('Error fetching vcandle data:', error);
      }
    };
    
    fetchVcandleData();
  }, []);
  
  useEffect(() => {
    console.log('Available animations:', Object.keys(actions));
    
    Object.keys(actions).forEach((key) => {
      actions[key].play();
      actions[key].setLoop(THREE.LoopRepeat);
    });
    
    // Cleanup animations on unmount
    return () => {
      Object.keys(actions).forEach((key) => {
        if (actions[key] && actions[key].stop) {
          actions[key].stop();
        }
      });
      if (mixer && mixer.stopAllAction) {
        mixer.stopAllAction();
      }
    };
  }, [actions, mixer]);

  useEffect(() => {
   // Log texture memory usage
   let textureCount = 0;
   let totalTextureSize = 0;
   const newFlickeringMaterials = new Map();
   
   // Only process if we have vcandleData or if this is the initial setup
   console.log('Processing scene. vcandleData length:', vcandleData.length);
   
   scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      
      // Set depth properties for all meshes
      if (child.material) {
        child.material.depthTest = true;
        child.material.depthWrite = true;
        child.material.needsUpdate = true;
      }
      
      // Optimize textures if they exist
      if (child.material) {
        const checkTexture = (texture, name) => {
          if (texture && texture.image) {
            textureCount++;
            const originalWidth = texture.image.width;
            const originalHeight = texture.image.height;
            const size = (originalWidth * originalHeight * 4) / 1024 / 1024;
            totalTextureSize += size;
            
            // RESIZE 4K TEXTURES DOWN!
            const maxSize = name === 'Diffuse' ? 1024 : 512; // Diffuse can be 1K, others 512
            
            if (originalWidth > maxSize || originalHeight > maxSize) {
              console.log(`RESIZING ${name}: ${originalWidth}x${originalHeight} -> ${maxSize}x${maxSize}`);
              
              // Create canvas to resize
              const canvas = document.createElement('canvas');
              canvas.width = maxSize;
              canvas.height = maxSize;
              const ctx = canvas.getContext('2d');
              
              // Draw resized image
              ctx.drawImage(texture.image, 0, 0, maxSize, maxSize);
              
              // Replace texture image with resized version
              texture.image = canvas;
              texture.needsUpdate = true;
            }
            
            // Aggressive optimization
            texture.anisotropy = 1;
            texture.generateMipmaps = true; // Re-enable for better quality at distance
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
          }
        };
        
        checkTexture(child.material.map, 'Diffuse');
        checkTexture(child.material.normalMap, 'Normal');
        checkTexture(child.material.roughnessMap, 'Roughness');
        checkTexture(child.material.metalnessMap, 'Metalness');
      }
    }
    // Find the drone object
    if (child.name === 'Object_7') {
      droneRef.current = child;
      console.log('Found drone:', child);
    }
    
    // Find the Robot_empty object
    if (child.name === 'Object_4.002' || child.name.includes('Robot_empty')) {
      robotRef.current = child;
      console.log('Found robot:', child.name, 'at position:', child.position);
      if (onRobotFound) {
        onRobotFound(child.position);
      }
    }
    
    // Process VCANDLE objects only if we have data
    if (child.name && child.name.includes('VCANDLE') && vcandleData.length > 0) {
      console.log('Found VCANDLE:', child.name);
      const candleNumber = parseInt(child.name.match(/\d+/)?.[0] || '0');
      const userData = vcandleData[candleNumber - 1];
      console.log(`VCANDLE${candleNumber} userData:`, userData);
      
      if (userData) {
        child.userData = {
          hasUser: true,
          userName: userData.userName,
          userId: userData.id,
          burnedAmount: userData.burnedAmount,
          message: userData.message,
          createdAt: userData.createdAt,
          image: userData.image,
        };
        
        // Make VCANDLE clickable
        child.traverse((mesh) => {
          if (mesh.isMesh) {
            mesh.userData.clickable = true;
            mesh.userData.candleData = child.userData;
          }
        });
        
        // Process candle labels if they exist
        console.log(`Searching for labels in ${child.name}...`);
        child.traverse((subChild) => {
          console.log(`  - Child: ${subChild.name}`);
          if (subChild.name === 'Label1' || subChild.name === 'Label2' || 
              subChild.name?.toLowerCase().includes('label')) {
            console.log(`Found label ${subChild.name} in ${child.name}`);
            if (userData.image && subChild.material) {
              console.log(`Loading image for ${subChild.name}:`, userData.image);
              const textureLoader = new THREE.TextureLoader();
              textureLoader.load(
                userData.image, 
                (texture) => {
                  console.log(`Texture loaded for ${subChild.name}`);
                  texture.generateMipmaps = true;
                  texture.minFilter = THREE.LinearMipmapLinearFilter;
                  texture.magFilter = THREE.LinearFilter;
                  texture.anisotropy = 16;
                  
                  const material = subChild.material.clone();
                  material.map = texture;
                  material.needsUpdate = true;
                  
                  // Flip texture for Label1
                  if (subChild.name === 'Label1') {
                    texture.rotation = Math.PI;
                    texture.center.set(0.5, 0.5);
                  }
                  
                  subChild.material = material;
                },
                undefined,
                (error) => {
                  console.error(`Error loading texture for ${subChild.name}:`, error);
                }
              );
            } else {
              console.log(`No image or material for ${subChild.name}. Image:`, userData.image, 'Material:', subChild.material);
            }
          }
        });
      } else {
        console.log(`No user data for VCANDLE${candleNumber}`);
      }
    }
    
    // Process flame objects for flickering effect
    const flameName = child.name?.toLowerCase() || '';
    if (flameName.includes('flame') || flameName.includes('fire')) {
      if (child.material) {
        const material = child.material.clone();
        
        // Set emissive properties for flame glow
        material.emissive = new THREE.Color(0xffaa44); // Warm flame color
        material.emissiveIntensity = 2.5;
        material.toneMapped = false;
        
        // Store original values for animation
        const baseData = {
          material,
          originalEmissiveIntensity: material.emissiveIntensity,
          originalScale: child.scale.clone(),
          randomOffset: Math.random() * Math.PI * 2,
          flickerRange: 0.3 + Math.random() * 0.4
        };
        
        newFlickeringMaterials.set(child, baseData);
        child.material = material;
      }
    }
   });
   
   // Update flickering materials state
   setFlickeringMaterials(newFlickeringMaterials);
   
   console.log(`Total textures: ${textureCount}, Total size: ${totalTextureSize.toFixed(2)}MB`);
   console.log('Scene processing complete. vcandleData length:', vcandleData.length);
  }, [scene, vcandleData, onRobotFound]);

  // Process VCANDLEs when data is loaded
  useEffect(() => {
    if (vcandleData.length > 0 && scene) {
      console.log('VCANDLE data loaded, processing VCANDLEs...');
      
      scene.traverse((child) => {
        if (child.name && child.name.includes('VCANDLE')) {
          const candleNumber = parseInt(child.name.match(/\d+/)?.[0] || '0');
          const userData = vcandleData[candleNumber - 1];
          
          if (userData) {
            // Update userData
            child.userData = {
              hasUser: true,
              userName: userData.userName,
              userId: userData.id,
              burnedAmount: userData.burnedAmount,
              message: userData.message,
              createdAt: userData.createdAt,
              image: userData.image,
            };
            
            // Make VCANDLE clickable
            child.traverse((mesh) => {
              if (mesh.isMesh) {
                mesh.userData.clickable = true;
                mesh.userData.candleData = child.userData;
              }
            });
            
            // Look for any mesh children that could be labels
            child.traverse((subChild) => {
              if (subChild.isMesh && subChild.material && userData.image) {
                // Check if this might be a label by name or by material properties
                const isLabel = subChild.name?.toLowerCase().includes('label') ||
                               subChild.name === 'Label1' || 
                               subChild.name === 'Label2' ||
                               (subChild.material.map === null && subChild.material.color);
                               
                if (isLabel) {
                  console.log(`Applying texture to potential label: ${subChild.name} in ${child.name}`);
                  const textureLoader = new THREE.TextureLoader();
                  textureLoader.load(
                    userData.image,
                    (texture) => {
                      console.log(`Texture loaded for ${subChild.name}`);
                      texture.generateMipmaps = true;
                      texture.minFilter = THREE.LinearMipmapLinearFilter;
                      texture.magFilter = THREE.LinearFilter;
                      
                      // Fix upside-down images by flipping Y
                      texture.flipY = false;
                      
                      const material = subChild.material.clone();
                      material.map = texture;
                      material.needsUpdate = true;
                      
                      // Rotate Label1 by 180 degrees
                      if (subChild.name === 'Label1') {
                        texture.rotation = Math.PI;
                        texture.center.set(0.5, 0.5);
                      }
                      
                      subChild.material = material;
                    },
                    undefined,
                    (error) => {
                      console.error(`Error loading texture:`, error);
                    }
                  );
                }
              }
            });
          }
        }
      });
    }
  }, [vcandleData, scene]);

  // Animate the drone around the statue and flame flickering
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    
    // Animate flame flickering
    flickeringMaterials.forEach((baseData, flameObject) => {
      if (baseData.material && flameObject) {
        // Calculate flicker intensity
        const flicker = Math.sin(time * flickerSpeed.current + baseData.randomOffset);
        const secondaryFlicker = Math.sin(time * flickerSpeed.current * 2.3 + baseData.randomOffset) * 0.5;
        const combinedFlicker = (flicker + secondaryFlicker) * 0.5;
        
        // Apply flicker to emissive intensity
        const intensity = baseData.originalEmissiveIntensity * 
          (1 + combinedFlicker * baseData.flickerRange * flickerIntensity.current);
        baseData.material.emissiveIntensity = Math.max(0.1, intensity);
        
        // Optional: Apply subtle scale animation to flame
        if (flameObject.scale) {
          const scaleMultiplier = 1 + combinedFlicker * 0.1;
          flameObject.scale.x = baseData.originalScale.x * scaleMultiplier;
          flameObject.scale.y = baseData.originalScale.y * (1 + Math.abs(combinedFlicker) * 0.15);
          flameObject.scale.z = baseData.originalScale.z * scaleMultiplier;
        }
      }
    });
    
    if (droneRef.current) {
      // Store initial position and rotation
      if (!droneRef.current.userData.initialPosition) {
        droneRef.current.userData.initialPosition = droneRef.current.position.clone();
        droneRef.current.userData.initialRotation = droneRef.current.rotation.clone();
      }
      
      // Create an enthusiastic examination pattern
      const radius = 1;
      const speed = 0.6;
      
      // Figure-8 pattern for more interesting movement
      const t = time * speed;
      const x = statuePosition[0] + Math.sin(t) * radius * 1.5;
      const y = statuePosition[1] + 3.5 + Math.sin(t * 2) * 0.5; // Higher base position
      const z = statuePosition[2] + Math.sin(t * 2) * radius;
      
      droneRef.current.position.set(x, y, z);
      
      // Look at statue center while maintaining upright orientation
      const lookAtPos = new THREE.Vector3(statuePosition[0], statuePosition[1] + 1.5, statuePosition[2]);
      droneRef.current.lookAt(lookAtPos);
      
      // Correct the rotation to keep drone upright (fix upside down issue)
      droneRef.current.rotation.x = droneRef.current.userData.initialRotation.x;
      droneRef.current.rotation.z = droneRef.current.userData.initialRotation.z;
      
      // Add enthusiastic wobble
      droneRef.current.position.y += Math.sin(time * 8) * 0.05; // Quick small bobbing
      droneRef.current.rotation.y += Math.sin(time * 4) * 0.1; // Slight yaw movement
    }
  });

  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        scale={[1, 1, 1]}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
      />
    </group>
  );
}

// Ground fog component
function GroundFog() {
  const fogRef = useRef();
  
  useFrame((state) => {
    if (fogRef.current) {
      fogRef.current.rotation.x = -Math.PI / 2;
      fogRef.current.material.uniforms.time.value = state.clock.elapsedTime;
    }
  });
  
  const fogShader = {
    uniforms: {
      time: { value: 0 },
      fogColor: { value: new THREE.Color('#1a1a2e') },
      fogOpacity: { value: 0.1 }
    },
    vertexShader: `
      uniform float time;
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      varying float vElevation;
      
      // Simple noise function for vertex displacement
      float noise(vec2 st) {
        return sin(st.x * 10.0) * sin(st.y * 10.0);
      }
      
      void main() {
        vUv = uv;
        
        // Create undulating waves
        float elevation = 0.0;
        
        // Large slow waves
        elevation += sin(position.x * 0.5 + time * 0.5) * 0.3;
        elevation += sin(position.z * 0.3 + time * 0.3) * 0.4;
        
        // Medium waves
        elevation += sin(position.x * 1.0 - time * 0.8) * 0.15;
        elevation += sin(position.z * 1.2 + time * 0.6) * 0.15;
        
        // Small rapid waves for detail
        elevation += noise(position.xz * 0.5 + time * 0.2) * 0.1;
        
        // Apply elevation with fade at edges
        float edgeFade = 1.0 - smoothstep(0.3, 0.5, length(uv - 0.5));
        elevation *= edgeFade;
        
        vec3 newPosition = position;
        newPosition.y += elevation;
        
        vElevation = elevation;
        vec4 worldPosition = modelMatrix * vec4(newPosition, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 fogColor;
      uniform float fogOpacity;
      varying vec3 vWorldPosition;
      varying vec2 vUv;
      varying float vElevation;
      
      // Simple noise function
      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }
      
      float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        
        vec2 u = f * f * (3.0 - 2.0 * f);
        
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }
      
      void main() {
        // Calculate distance from center for radial fade
        vec2 center = vec2(0.5, 0.5);
        float distFromCenter = distance(vUv, center) * 2.0;
        
        // Animated noise for swirling effect
        vec2 noiseCoord = vUv * 6.0 + time * 0.05;
        float n = noise(noiseCoord) * 0.5 + 0.5;
        
        // Height-based opacity (fog is denser at ground level and at wave peaks)
        float heightFade = 1.0 - smoothstep(0.0, 2.0, vWorldPosition.y);
        
        // Add density at wave peaks (where elevation is higher)
        float elevationDensity = smoothstep(-0.2, 0.5, vElevation) * 0.3;
        
        // Combine effects
        float fogDensity = (n * heightFade + elevationDensity) * (1.0 - smoothstep(0.5, 1.0, distFromCenter));
        
        gl_FragColor = vec4(fogColor, fogDensity * fogOpacity);
      }
    `
  };
  
  return (
    <mesh ref={fogRef} position={[0, 0.2, 0]}>
      <planeGeometry args={[40, 40, 32, 32]} />
      <shaderMaterial
        {...fogShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Click handler component
function ClickHandler({ onCandleClick }) {
  const { scene, raycaster, camera } = useThree();
  
  const handleClick = useCallback((event) => {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    for (const intersect of intersects) {
      if (intersect.object.userData.clickable && intersect.object.userData.candleData) {
        onCandleClick(intersect.object.userData.candleData);
        break;
      }
    }
  }, [scene, raycaster, camera, onCandleClick]);
  
  const handlePointerMove = useCallback((event) => {
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    let foundClickable = false;
    for (const intersect of intersects) {
      if (intersect.object.userData.clickable && intersect.object.userData.candleData) {
        document.body.style.cursor = 'pointer';
        foundClickable = true;
        break;
      }
    }
    
    if (!foundClickable) {
      document.body.style.cursor = 'default';
    }
  }, [scene, raycaster, camera]);
  
  useEffect(() => {
    window.addEventListener('click', handleClick);
    window.addEventListener('pointermove', handlePointerMove);
    
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('pointermove', handlePointerMove);
      document.body.style.cursor = 'default';
    };
  }, [handleClick, handlePointerMove]);
  
  return null;
}

// Spotlight with helper component
function SpotlightWithHelper({ position, targetPosition, ...props }) {
  const spotlightRef = useRef();
  // useHelper(spotlightRef, THREE.SpotLightHelper, 'cyan'); // Comment out to hide helper
  
  useEffect(() => {
    if (spotlightRef.current && targetPosition) {
      spotlightRef.current.target.position.set(...targetPosition);
    }
  }, [targetPosition]);
  
  return (
    <spotLight
      ref={spotlightRef}
      position={position}
      {...props}
    />
  );
}

function Scene({ onCandleClick }) {
  const statuePosition = [2.85, 1.25, -1.1];
  const [robotPosition, setRobotPosition] = useState([0, 0, 0]);
  
  const handleRobotFound = useCallback((position) => {
    const posArray = [position.x, position.y, position.z];
    console.log('Robot position for spotlight:', posArray);
    setRobotPosition(posArray);
  }, []);

  return (
    <>
      {/* Add fog to the scene */}
      <fog attach="fog" args={['#1a1a2e', 15, 30]} />
      
      <ambientLight intensity={0.4} />
      
      {/* Main directional light */}
      <directionalLight 
        position={[-7, 11, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-bias={-0.0005}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-opacity={0.1}
      />
      
      {/* Spotlight on the robot with helper */}
      <SpotlightWithHelper
        position={[7, 5, 3.1]}  // [X, Y, Z] - Change these values to move the spotlight
        targetPosition={robotPosition}  // Now targeting the robot
        intensity={100}
        angle={0.2}  // Narrower beam (was 0.6) - smaller = tighter beam
        penumbra={0.3}  // Less soft edge for sharper focus (was 0.9)
        distance={10}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}  // Increased for better shadow quality
        shadow-mapSize-height={2048}  // Increased for better shadow quality
        shadow-camera-near={0.5}
        shadow-camera-far={15}
        shadow-bias={-0.0005}
      />
      
      <JunkyardModel statuePosition={statuePosition} onRobotFound={handleRobotFound} />
      
      {/* Ground fog layer */}
      <GroundFog />
      
      {/* Contact shadows for grounding objects */}
      <ContactShadows 
        position={[0, 0.01, 0]}
        opacity={0.4}
        scale={15}
        blur={2.5}
        far={8}
        resolution={512}
        color="#000000"
      />
      
      <group renderOrder={-1}>
        <HolographicStatue2
          position={statuePosition}
          scale={[2, 2, 2]}
          hover={true}
          rotate={true}
        />
      </group>
      
      <ClickHandler onCandleClick={onCandleClick} />
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        zoomSpeed={0.7}
        enableDamping={true}
        dampingFactor={0.5}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0}
        minDistance={0.001}
        maxDistance={12}
        target={[0, 0, 0]} // Ground-level target for natural initial view
        zoomToCursor={true} // Zoom toward cursor position instead of target
      />
      
      <Environment 
        preset="night"
        background={true}
        blur={0.5}
        backgroundBlurriness={0.5}
        backgroundIntensity={0.5}
        // backgroundColor={0x000000}
        backgroundOpacity={0.1}
      />
    </>
  );
}

export default function JunkyardScene() {
  // Music player states
  const [showMobileMusicPlayer, setShowMobileMusicPlayer] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [userClosedMusic, setUserClosedMusic] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicPlayerControls, setMusicPlayerControls] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const audioRef = useRef(null);
  
  // Candle interaction states
  const [selectedCandle, setSelectedCandle] = useState(null);
  const [showCandleViewer, setShowCandleViewer] = useState(false);
  
  // Handle candle click
  const handleCandleClick = useCallback((candleData) => {
    console.log('Candle clicked:', candleData);
    setSelectedCandle(candleData);
    setShowCandleViewer(true);
  }, []);
  
  // Handle candle viewer close
  const handleCandleViewerClose = useCallback(() => {
    setShowCandleViewer(false);
    setSelectedCandle(null);
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear the model from cache when component unmounts
      clearThreeCache();
    };
  }, []);
  
  // Get music context
  const { 
    showSpotify: contextShowSpotify, 
    setShowSpotify: setContextShowSpotify,
    isPlaying: contextIsPlaying,
    setIsPlaying: setContextIsPlaying,
  } = useMusic();
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Callback to receive controls from MobileMusicPlayer
  const handleMusicControlsReady = useCallback((controls) => {
    setMusicPlayerControls(prevControls => {
      if (prevControls) return prevControls;
      return controls;
    });
    
    // Auto-play when controls are ready and music player is visible
    if (controls && controls.play && !contextIsPlaying && showMobileMusicPlayer) {
      console.log('🎵 Auto-playing music when controls ready');
      setTimeout(() => {
        controls.play();
      }, 500); // Increased delay to ensure track is loaded
    }
  }, [contextIsPlaying, showMobileMusicPlayer]);
  
  // Music player close handler
  const handleMusicPlayerClose = useCallback(() => {
    console.log('🎵 Closing music player');
    
    // Stop the music first
    if (musicPlayerControls && musicPlayerControls.pause) {
      console.log('🎵 Pausing music');
      musicPlayerControls.pause();
    }
    
    // Update context
    setContextIsPlaying(false);
    setContextShowSpotify(false);
    
    // Then hide the player
    setUserClosedMusic(true);
    setShowMobileMusicPlayer(false);
    setMusicPlayerVisible(false);
  }, [musicPlayerControls, setContextIsPlaying, setContextShowSpotify]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      <Canvas
        camera={{ 
          position: [-10, 4, 7], 
          fov: 45,
          near: 0.01,
          far: 1000
        }}
        shadows
        dpr={[1, 2]}
        gl={{ 
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.5
        }}
      >
        <Suspense fallback={null}>
          <StarField />
        </Suspense>
        <Suspense fallback={null}>
          <Scene onCandleClick={handleCandleClick} />
        </Suspense>
      </Canvas>
      
      {/* Music Player UI */}
      {!showMobileMusicPlayer ? (
        // Music Icon Button
        <IconButton
          position="fixed"
          bottom="2rem"
          right={isMobile ? "20px" : "2rem"}
          zIndex="1100"
          aria-label="Music Player"
          icon={
            <svg width={isMobile ? "24" : "2.5rem"} height={isMobile ? "24" : "2.5rem"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          }
          color="white"
          bg="transparent"
          size="md"
          onClick={() => {
            console.log('🎵 Music icon clicked');
            setUserClosedMusic(false);
            
            if (contextShowSpotify && contextIsPlaying) {
              // Music is already playing, just show the UI
              console.log('🎵 Music already playing, showing UI');
              setShowMobileMusicPlayer(true);
              setMusicPlayerVisible(true);
            } else {
              // Start fresh music playback
              setShowMobileMusicPlayer(true);
              setMusicPlayerVisible(true);
              setContextShowSpotify(true);
              
              // Trigger auto-play after a delay to ensure player and track are ready
              setTimeout(() => {
                if (musicPlayerControls && musicPlayerControls.play) {
                  console.log('🎵 Auto-playing music after icon click');
                  musicPlayerControls.play();
                } else {
                  console.log('🎵 Controls not ready yet, will auto-play when ready');
                }
              }, 500); // Increased delay to ensure track is loaded
            }
          }}
          _hover={{
            bg: "rgba(255, 255, 255, 0.1)",
          }}
        />
      ) : (
        // Minimal Music Player with overlay to block 3D interactions
        <>
          {/* Invisible overlay to prevent 3D scene interactions */}
          <Box
            position="fixed"
            bottom="2rem"
            right="0"
            width={isMobile ? "200px" : "250px"}
            height="100px"
            zIndex="9998"
            pointerEvents="auto"
            bg="transparent"
            cursor="default"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
          />
          
          {/* Music Player Controls */}
          <Box
            position="fixed"
            bottom="2rem"
            right={isMobile ? "20px" : "2rem"}
            zIndex="9999"
            display="flex"
            alignItems="center"
            gap="8px"
            pointerEvents="auto"
            isolation="isolate"
          >
            {/* Spinning Album Art */}
            <Box
              width="40px"
              height="40px"
              borderRadius="50%"
              backgroundImage="url('/virginRecords.jpg')"
              backgroundSize="cover"
              backgroundPosition="center"
              transition="all 0.3s ease"
              sx={{
                animation: musicPlayerVisible && isPlaying ? "spin 3s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" }
                }
              }}
            />
            
            {/* Skip Button */}
            <IconButton
              aria-label="Next Track"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4"/>
                  <line x1="19" y1="5" x2="19" y2="19"/>
                </svg>
              }
              color="white"
              bg="rgba(255, 255, 255, 0.1)"
              size="sm"
              minW="32px"
              height="32px"
              position="relative"
              zIndex="10000"
              pointerEvents="auto"
              onClick={() => {
                console.log('🎵 Skip button clicked');
                
                if (musicPlayerControls && musicPlayerControls.skipTrack) {
                  console.log('🎵 Using music player controls to skip');
                  musicPlayerControls.skipTrack();
                } else {
                  console.log('⚠️ No skip controls available');
                  window.postMessage({ type: 'SKIP_TRACK' }, '*');
                }
              }}
              _hover={{
                bg: "rgba(255, 255, 255, 0.2)",
              }}
            />
            
            {/* Close Button */}
            <Box
              as="button"
              aria-label="Close Music Player"
              width="28px"
              height="28px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="rgba(255, 255, 255, 0.1)"
              borderRadius="4px"
              color="white"
              position="relative"
              zIndex="10000"
              cursor="pointer"
              pointerEvents="auto"
              border="1px solid rgba(255, 255, 255, 0.3)"
              _hover={{
                bg: "rgba(255, 0, 0, 0.5)",
                transform: "scale(1.1)",
              }}
              onClick={(e) => {
                console.log('🎵 Close button clicked!');
                e.stopPropagation();
                e.preventDefault();
                handleMusicPlayerClose();
              }}
              onTouchEnd={(e) => {
                console.log('🎵 Close button touch end!');
                e.stopPropagation();
                e.preventDefault();
                handleMusicPlayerClose();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </Box>
          </Box>
        </>
      )}
      
      {/* Hidden Music Player Component */}
      {showMobileMusicPlayer && (
        <Box display="none">
          <MobileMusicPlayer
            isVisible={true}
            isMobile={true}
            autoPlay={true}
            onControlsReady={handleMusicControlsReady}
            onPlayingStateChange={(playing) => {
              console.log('🎵 Music state changed:', playing);
              setIsPlaying(playing);
              setContextIsPlaying(playing);
            }}
            audioRef={audioRef}
          />
        </Box>
      )}
      
      {/* Floating Candle Viewer */}
      {showCandleViewer && selectedCandle && (
        <FloatingCandleViewer
          isVisible={showCandleViewer}
          onClose={handleCandleViewerClose}
          userData={selectedCandle}
          onNavigate={() => {}}
          currentIndex={0}
          totalCandles={1}
        />
      )}
    </div>
  );
}

// Preload the model
useGLTF.preload('/junkyard3.glb');

// Clear Three.js cache on unmount
export function clearThreeCache() {
  useGLTF.clear('/junkyard3.glb');
}