import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
// GUI removed for production
import NoiseParticleEffect from './NoiseParticleEffect';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import dynamic from 'next/dynamic';
import { useMusic } from '../contexts/MusicContext';
import { IconButton, Box } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import Link from 'next/link';


// Dynamically import the Mobile Music Player component
const SimpleMusicPlayer = dynamic(() => import('./SimpleMusicPlayer'), {
  ssr: false,
});

// Register GSAP ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Define text blocks for transitions
const textBlocks = [
  [
    "cruising through neon dreams",
    "where palm trees meet",
    "electric skies",
    "and memories blur",
    "into synthetic sunsets",
    "forever driving",
    "through digital paradise"
  ],
  [
    "beneath the static",
    "voices from another time",
    "echo through circuits",
    "searching for meaning",
    "in silicon valleys",
    "where futures past",
    "never sleep"
  ],
  [
    "chrome reflections dance",
    "on midnight highways",
    "leading nowhere",
    "and everywhere at once",
    "chasing ghosts",
    "in rearview mirrors",
    "of tomorrow"
  ],
  [
    "she watches over",
    "this endless road",
    "guardian of lost souls",
    "in electric twilight",
    "where faith meets code",
    "and prayers become",
    "digital whispers"
  ],
  [
    "here at the end",
    "or the beginning",
    "time dissolves",
    "into pixels and light",
    "a sacred moment",
    "forever preserved",
    "in synthetic amber"
  ]
];

const PalmsScene = ({ onLoadingChange }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const materialShadersRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());
  // Cinematic states removed for production
  const [isSceneLoadingInternal, setIsSceneLoadingInternal] = useState(true); // Loading state
  
  // Wrapper to update both internal state and parent
  const setIsSceneLoading = useCallback((loading) => {
    setIsSceneLoadingInternal(loading);
    if (onLoadingChange) {
      onLoadingChange(loading);
    }
  }, [onLoadingChange]);
  
  const isSceneLoading = isSceneLoadingInternal; // Use internal state for reading
  // Cinematic reverse removed
  const scrollCameraActive = true; // Scroll camera always active
  const [currentCameraStage, setCurrentCameraStage] = useState(0); // Track which camera position we're at
  const [showEnterButton, setShowEnterButton] = useState(false); // Show "Take me there" button
  // Music player states
  const [showMobileMusicPlayer, setShowMobileMusicPlayer] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [userClosedMusic, setUserClosedMusic] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicPlayerControls, setMusicPlayerControls] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const audioRef = useRef(null);
  
  // Performance detection for loader optimization
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  
  // Get music context
  const { 
    showSpotify: contextShowSpotify, 
    setShowSpotify: setContextShowSpotify,
    isPlaying: contextIsPlaying,
    setIsPlaying: setContextIsPlaying,
  } = useMusic();
  
  // Add refs for lights
  const carSpotlightRef = useRef(null);
  const rimLightRef = useRef(null);
  const underglowLightRef = useRef(null);
  const headlightLeftRef = useRef(null);
  const headlightRightRef = useRef(null);

  // Add ref for new light
  const carAccentLightRef = useRef(null);
  
  // GUI removed for production
  
  // Add ref for controls
  const controlsRef = useRef(null);
  
  // Add ref for GSAP timeline
  const cinematicTimelineRef = useRef(null);
  
  // Add refs for 3D card effect
  const cameraRef = useRef(null);
  
  // Add refs for text animation
  const scrollTextRef = useRef(null);
  const textSectionRef = useRef(null);
  
  // Refs for scroll camera
  const scrollCameraEnabledRef = useRef(true); // Initialize as true to match state
  const scrollProgressRef = useRef(0); // Start at 0 for aerial view

  // Force initial scroll position on mount and page load
  useEffect(() => {
    // Scroll to top immediately
    window.scrollTo(0, 0);
    
    // Also handle page refresh/reload
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    
    // Force scroll to top after a small delay to ensure DOM is ready
    const resetScroll = () => {
      window.scrollTo(0, 0);
      setCurrentCameraStage(0);
      scrollProgressRef.current = 0;
    };
    
    // Reset on component mount
    resetScroll();
    
    // Also reset after a small delay to catch any browser restoration
    setTimeout(resetScroll, 10);
    setTimeout(resetScroll, 100);
    
    // Handle page visibility changes (tab switching back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resetScroll();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Re-enable scroll restoration on unmount
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
    };
  }, []);
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      // Check if it's a phone specifically (not just narrow screen)
      const userAgent = navigator.userAgent.toLowerCase();
      const isPhone = /iphone|android.*mobile/.test(userAgent);
      const isNarrowScreen = window.innerWidth <= 768;
      setIsMobile(isPhone && isNarrowScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Detect device performance capabilities
  useEffect(() => {
    const detectDevicePerformance = () => {
      let isLowEnd = false;
      
      // Check for mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // Check hardware concurrency (number of CPU cores)
      const cores = navigator.hardwareConcurrency || 1;
      if (cores <= 2) isLowEnd = true;
      
      // Check device memory if available
      if ('deviceMemory' in navigator) {
        // @ts-ignore - deviceMemory might not be in TypeScript definitions
        if (navigator.deviceMemory <= 4) isLowEnd = true;
      }
      
      // Check connection speed if available
      if ('connection' in navigator) {
        // @ts-ignore - connection might not be in TypeScript definitions
        const connection = navigator.connection;
        if (connection && connection.effectiveType) {
          if (connection.effectiveType === 'slow-2g' || 
              connection.effectiveType === '2g' || 
              connection.effectiveType === '3g') {
            isLowEnd = true;
          }
        }
      }
      
      // Check screen size for very small devices
      if (window.screen.width < 400 || window.screen.height < 400) {
        isLowEnd = true;
      }
      
      // For iOS devices, check older models
      if (/iPhone/.test(navigator.userAgent)) {
        // Check for older iPhone models (rough detection)
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            // Older PowerVR GPUs indicate older iPhones
            if (renderer.includes('PowerVR')) isLowEnd = true;
          }
        }
      }
      
      // Combine mobile + limited resources
      if (isMobileDevice && cores <= 4) isLowEnd = true;
      
      setIsLowEndDevice(isLowEnd);
      
      // Log detection results for debugging
      console.log('Device Performance Detection:', {
        isLowEnd,
        cores,
        isMobile: isMobileDevice,
        screenSize: { width: window.screen.width, height: window.screen.height }
      });
    };
    
    detectDevicePerformance();
  }, []);
  
  // Handle text transitions when camera stage changes
  useEffect(() => {
    if (previousCameraStage.current !== currentCameraStage && scrollCameraActive) {
      const lines = gsap.utils.toArray('.scroll-text-line');
      
      // Animate text transition
      if (lines.length > 0) {
        gsap.fromTo(lines, 
          {
            opacity: 0,
            y: 20,
            filter: 'blur(10px)'
          },
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.6,
            stagger: 0.05,
            ease: "power2.out"
          }
        );
      }
      
      previousCameraStage.current = currentCameraStage;
    }
  }, [currentCameraStage, scrollCameraActive]);
  
  // Callback to receive controls from MobileMusicPlayer
  const handleMusicControlsReady = useCallback((controls) => {
    setMusicPlayerControls(prevControls => {
      if (prevControls) return prevControls;
      return controls;
    });
    
    // Auto-play when controls are ready and music player is visible
    if (controls && controls.play && !contextIsPlaying && showMobileMusicPlayer) {
      // console.log('🎵 Auto-playing music when controls ready');
      setTimeout(() => {
        controls.play();
      }, 500); // Increased delay to ensure track is loaded
    }
  }, [contextIsPlaying, showMobileMusicPlayer]);
  
  // Music player close handler
  const handleMusicPlayerClose = useCallback(() => {
    // console.log('🎵 Closing music player');
    
    // Stop the music first
    if (musicPlayerControls && musicPlayerControls.pause) {
      // console.log('🎵 Pausing music');
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

  const carModelRef = useRef(null);
  const intersectionRef = useRef(null);
  const maryMeshRef = useRef(null);
  const maryLightRef = useRef(null);
  const [maryGlowing, setMaryGlowing] = useState(false);
  const maryGlowingRef = useRef(false);
  const router = useRouter();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const previousCameraStage = useRef(0);

  

  
  
  // Light settings
  const lightSettings = {
    carSpotlight: {
      color: '#ff00ff',
      intensity: 5,
      distance: 50,
      angle: Math.PI,
      penumbra: 0.225,
      position: { x: 0.02, y: 0.49, z: 5.93 }
    },
    rimLight: {
      color: '#00ffff',
      intensity: 1.32,
      position: { x: -0.12, y: 2.48, z: -5.64 }
    },
    carAccentLight: {
      color: '#f4f1f4',
      intensity: 2.39,
      distance: 50,
      angle: Math.PI,
      penumbra: 0.225,
      position: { x: 0.02, y: 0.79, z: 6.78 }
    },
    underglow: {
      color: '#ff00ff',
      intensity: 2,
      distance: 5,
      position: { x: 0, y: -0.5, z: 7 }
    },
    headlights: {
      color: '#ffffff',
      intensity: 1,
      distance: 30,
      angle: Math.PI / 6,
      penumbra: 0.3
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    // Noise shader function
    const noise = `
    vec3 mod289(vec3 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 mod289(vec4 x) {
      return x - floor(x * (1.0 / 289.0)) * 289.0;
    }

    vec4 permute(vec4 x) {
         return mod289(((x*34.0)+1.0)*x);
    }

    vec4 taylorInvSqrt(vec4 r)
    {
      return 1.79284291400159 - 0.85373472095314 * r;
    }

    float snoise(vec3 v)
      { 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 =   v - i + dot(i, C.xxx) ;

    // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

    // Permutations
      i = mod289(i); 
      vec4 p = permute( permute( permute( 
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      float n_ = 0.142857142857;
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }
    `;

    const materialShaders = [];
    const speed = 15; // Increased from 10 to make the car appear faster
    
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    // DISABLED CINEMATIC - Set a simple starting position instead
    // const initialKeyframes = recordedKeyframesRef.current.length > 0 ? recordedKeyframesRef.current : defaultCinematicKeyframes;
    // camera.position.copy(initialKeyframes[0].position);
    // camera.lookAt(initialKeyframes[0].target);
    
    // Detect if device is mobile for initial camera position
    const isMobileDevice = (() => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIPhone = /iphone/i.test(userAgent);
      const isAndroid = /android/i.test(userAgent) && /mobile/i.test(userAgent);
      const hasSmallScreen = window.innerWidth < 600 || window.innerHeight < 600;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return (isIPhone || isAndroid) && hasSmallScreen && hasTouch;
    })();
    
    // Start camera at aerial view position based on device type
    if (isMobileDevice) {
      camera.position.set(17.5605, 12.0910, 55.1540);  // Mobile aerial view
      camera.lookAt(3.0669, 6.0868, 20.1252);           // Mobile initial target
    } else {
      camera.position.set(16.2711, 5.8264, 40.5498);    // Desktop aerial view
      camera.lookAt(4.3726, 2.1681, 20.7525);           // Desktop initial target
    }
    camera.fov = 45;
    camera.updateProjectionMatrix();
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);


    // Create sunset gradient background
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 512;
    gradientCanvas.height = 512;
    const gradientCtx = gradientCanvas.getContext('2d');
    
    // Create sunset gradient - traditional orange sunset
    const gradient = gradientCtx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#001a33');      // Dark blue at top
    gradient.addColorStop(0.3, '#ff6b35');    // Orange
    gradient.addColorStop(0.6, '#ff8c42');    // Bright orange
    gradient.addColorStop(1, '#ffa500');      // Golden orange at bottom
    
    gradientCtx.fillStyle = gradient;
    gradientCtx.fillRect(0, 0, 512, 512);
    
    const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
    scene.background = gradientTexture;
    // Adjustable fog settings - increase distances to reduce white-out effect
    // Parameters: (color, near distance, far distance)
    // Near: where fog starts to appear
    // Far: where fog becomes fully opaque
    scene.fog = new THREE.Fog(0xff7f50, 50, 100); // Increased distances for less white-out
    
    // Sunset environment lighting
    // Warm ambient light with orange/pink tones
    const ambientLight = new THREE.AmbientLight(0xffa07a, 0.6); // Light salmon color - increased for more even lighting
    scene.add(ambientLight);
    
    // Main sun light - strong directional light from the horizon
    const sunLight = new THREE.DirectionalLight(0xff6b35, 1.2); // Warm orange
    sunLight.position.set(0, 5, -50); // Low on horizon, behind the scene
    sunLight.castShadow = true;
    scene.add(sunLight);
    
    // Secondary fill light - purple/pink from opposite side
    const fillLight = new THREE.DirectionalLight(0x9370db, 0.5); // Medium purple
    fillLight.position.set(20, 10, 20); // Moved to right side to balance lighting
    scene.add(fillLight);
    
    // Add a balancing light from the left
    const balanceLight = new THREE.DirectionalLight(0xffa500, 0.4); // Orange
    balanceLight.position.set(-20, 8, 10);
    scene.add(balanceLight);
    
    // Hemisphere light for sky/ground color variation
    const hemiLight = new THREE.HemisphereLight(
      0xff7f50, // Sky color - coral
      0x4b0082, // Ground color - indigo
      0.6
    );
    scene.add(hemiLight);
    
    // Rim lighting effect - cyan accent from behind
    const rimLight = new THREE.DirectionalLight(0x00ffff, 0.2);
    rimLight.position.set(0, 15, -30);
    scene.add(rimLight);

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true; // Allow panning in screen space
    controls.minDistance = 0.1;
    controls.maxDistance = 0;
    controls.maxPolarAngle = Math.PI * 0.5; // Initial limit - will be dynamic
    controls.minPolarAngle = 0; // Prevent camera from flipping
    // Set initial target to match the camera's lookAt position based on device
    if (isMobileDevice) {
      controls.target.set(3.0669, 6.0868, 20.1252); // Mobile initial target
    } else {
      controls.target.set(4.3726, 2.1681, 20.7525); // Desktop initial target
    }
    controls.zoomToCursor = true;
    controls.enabled = false; // Start with controls disabled since scroll camera is active
    // Don't call controls.update() here - it repositions the camera even when disabled
    controlsRef.current = controls; // Store ref for access in event handlers
    
    // Re-set camera position after OrbitControls creation to ensure it stays at aerial view
    if (isMobileDevice) {
      camera.position.set(17.5605, 12.0910, 55.1540);  // Mobile aerial view
      camera.lookAt(3.0669, 6.0868, 20.1252);           // Mobile initial target
    } else {
      camera.position.set(16.2711, 5.8264, 40.5498);    // Desktop aerial view
      camera.lookAt(4.3726, 2.1681, 20.7525);           // Desktop initial target
    }
    camera.updateProjectionMatrix();

    // Ground and road
    const planeGeom = new THREE.PlaneGeometry(100, 100, 200, 200);
    planeGeom.rotateX(-Math.PI * 0.5);
    
    // Create shader material
    const planeMat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        fogColor: { value: scene.fog.color },
        fogNear: { value: scene.fog.near },
        fogFar: { value: scene.fog.far }
      },
      vertexShader: `
        uniform float time;
        varying vec3 vPos;
        varying vec2 vUv;
        ${noise}
        
        void main() {
          vUv = uv;
          vec3 transformed = position;
          
          vec2 tuv = uv;
          float t = time * 0.01 * ${speed}.;
          tuv.y += t;
          transformed.y = snoise(vec3(tuv * 5., 0.)) * 5.;
          transformed.y *= smoothstep(5., 15., abs(transformed.x));
          vPos = transformed;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 fogColor;
        uniform float fogNear;
        uniform float fogFar;
        varying vec3 vPos;
        varying vec2 vUv;
        
        float line(vec3 position, float width, vec3 step) {
          vec3 tempCoord = position / step;
          vec2 coord = tempCoord.xz;
          coord.y -= time * ${speed}. / 2.;
          vec2 grid = abs(fract(coord - 0.5) - 0.5) / (fwidth(coord) * width);
          float line = min(grid.x, grid.y);
          return min(line, 1.0);
        }
        
        float dashLine(vec3 position) {
          // Create dashed center line
          float centerDist = abs(position.x); // Distance from road center (x=0)
          float lineWidth = 0.2;
          float dashLength = 3.0;
          float dashGap = 2.0;
          
          // Create dashes along Z (with animated motion)
          float animatedZ = position.z - time * ${speed}. / 2.;
          float dashPattern = step(0.5, fract(animatedZ / (dashLength + dashGap)));
          
          // Line mask
          float lineMask = 1.0 - smoothstep(0.0, lineWidth, centerDist);
          
          return lineMask * dashPattern;
        }
        
        void main() {
          float l = line(vPos, 1.0, vec3(2.0));
          vec3 base = mix(vec3(0.0, 0.75, 1.0), vec3(0.0), smoothstep(5., 7.5, abs(vPos.x)));
          vec3 baseColor = vec3(1.0, 0.0, 0.933); // #ff00ee
          vec3 roadColor = mix(baseColor, base, l);
          
          // Add dashed center line
          float centerLine = dashLine(vPos);
          vec3 lineColor = vec3(1.0, 1.0, 1.0); // White
          vec3 c = mix(roadColor, lineColor, centerLine * 0.8);
          
          // Apply fog
          float depth = gl_FragCoord.z / gl_FragCoord.w;
          float fogFactor = smoothstep(fogNear, fogFar, depth);
          c = mix(c, fogColor, fogFactor);
          
          gl_FragColor = vec4(c, 1.0);
        }
      `,
      fog: true
    });
    
    materialShaders.push(planeMat);
    
    const plane = new THREE.Mesh(planeGeom, planeMat);
    scene.add(plane);

    // Create loading manager to track all assets
    const loadingManager = new THREE.LoadingManager();
    let modelsToLoad = 0;
    let modelsLoaded = 0;
    
    loadingManager.onStart = () => {
      // console.log('Loading started');
      modelsToLoad++;
    };
    
    loadingManager.onLoad = () => {
      // console.log('All assets loaded');
      // Wait a bit to ensure everything is rendered
      setTimeout(() => {
        setIsSceneLoading(false);
      }, 500);
    };
    
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      // console.log(`Loading: ${url} - ${itemsLoaded}/${itemsTotal}`);
    };
    
    loadingManager.onError = (url) => {
      console.error(`Error loading: ${url}`);
    };
    
    // Set up DRACO loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/'); // Path to draco decoder files
    
    const loader = new GLTFLoader(loadingManager);
    loader.setDRACOLoader(dracoLoader);

    // Helper function for smooth step (used by both palm and sign animations)
    function smoothstep(edge0, edge1, x) {
      const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    }

    // Load Palm Tree GLB with error handling
    loader.load('/palm2.glb', (gltf) => {
      const palmModel = gltf.scene;
      
      // Debug: Log model structure
      // console.log('=== Palm Tree Model Debug ===');
      // console.log('Model loaded:', palmModel);
      // console.log('Model children:', palmModel.children);
      
      // Find all meshes for debugging
      const allMeshes = [];
      palmModel.traverse((child) => {
        // console.log('Child:', {
        //   name: child.name,
        //   type: child.type,
        //   isMesh: child.isMesh,
        //   visible: child.visible,
        //   position: child.position,
        //   scale: child.scale,
        //   material: child.material,
        //   geometry: child.geometry
        // });
        if (child.isMesh) {
          allMeshes.push(child);
        }
      });
      
      // console.log('Total meshes found:', allMeshes.length);
      
      // Use the first mesh or try to use the whole scene
      let palmMesh = allMeshes[0];
      
      // if (!palmMesh) {
      //   console.error('No mesh found in palm GLB model');
      //   // Try using the entire scene as fallback
      //   if (palmModel.children.length > 0) {
      //     console.log('Trying to use entire model scene');
      //     palmMesh = palmModel;
      //   } else {
      //     return;
      //   }
      // }
      
      // Get geometry and material from the loaded model
      let palmGeometry, palmMaterial;
      
      if (palmMesh.isMesh) {
        palmGeometry = palmMesh.geometry.clone();
        palmMaterial = palmMesh.material.clone();
        
        // Check material properties
        // console.log('Material properties:', {
        //   type: palmMaterial.type,
        //   transparent: palmMaterial.transparent,
        //   opacity: palmMaterial.opacity,
        //   side: palmMaterial.side,
        //   visible: palmMaterial.visible
        // });
        
        // Ensure material is visible
        palmMaterial.transparent = false;
        palmMaterial.opacity = 1;
        palmMaterial.side = THREE.DoubleSide;
      } else {
        console.error('Selected object is not a mesh, cannot extract geometry');
        return;
      }
      
      // Set up instance positions
      const palmPositions = [];
      for (let i = 0; i < 5; i++) {
        palmPositions.push(-6.5, 0, i * 20 - 10 - 50);
        palmPositions.push(6.5, 0, i * 20 - 50);
      }
      
      // Debug geometry bounds
      palmGeometry.computeBoundingBox();
      const bbox = palmGeometry.boundingBox;
      // console.log('Geometry bounds:', {
      //   min: bbox.min,
      //   max: bbox.max,
      //   size: new THREE.Vector3().subVectors(bbox.max, bbox.min),
      //   center: new THREE.Vector3().addVectors(bbox.max, bbox.min).multiplyScalar(0.5)
      // });
      
      // Create instanced mesh
      const instanceCount = palmPositions.length / 3;
      const palms = new THREE.InstancedMesh(palmGeometry, palmMaterial, instanceCount);
      
      // Set up transform matrices for each instance
      const dummy = new THREE.Object3D();
      const matrix = new THREE.Matrix4();
      
      // Calculate appropriate scale based on geometry size
      const size = new THREE.Vector3().subVectors(bbox.max, bbox.min);
      const maxDimension = Math.max(size.x, size.y, size.z);
      const targetHeight = 14; // Desired height for palm trees
      const scaleFactor = targetHeight / maxDimension;
      
      // console.log('Scale factor:', scaleFactor);
      
      for (let i = 0; i < instanceCount; i++) {
        const x = palmPositions[i * 3];
        const y = palmPositions[i * 3 + 1];
        const z = palmPositions[i * 3 + 2];
        
        dummy.position.set(x, y, z);
        dummy.scale.set(scaleFactor, scaleFactor, scaleFactor); // Auto-scale based on model size
        
        // Mirror palm trees on the left side
        if (x < 0) {
          dummy.scale.x = -scaleFactor;
        }
        
        // Add slight rotation variation
        dummy.rotation.y = Math.random() * Math.PI * 2;
        
        dummy.updateMatrix();
        
        palms.setMatrixAt(i, dummy.matrix);
      }
      
      // Store initial positions for animation
      const initialPositions = new Float32Array(palmPositions);
      
      // Animation function to update palm positions
      const animatePalms = (time) => {
        for (let i = 0; i < instanceCount; i++) {
          const baseX = initialPositions[i * 3];
          const baseY = initialPositions[i * 3 + 1];
          const baseZ = initialPositions[i * 3 + 2];
          
          // Animate position along Z axis
          const animatedZ = ((baseZ + time * speed + 50) % 100) - 50;
          
          // Scale based on distance with the base scale factor
          const distanceScale = 0.4 + smoothstep(50, 45, Math.abs(animatedZ)) * 0.6;
          const finalScale = scaleFactor * distanceScale;
          
          dummy.position.set(baseX, baseY, animatedZ);
          dummy.scale.set(finalScale, finalScale, finalScale);
          
          // Mirror palm trees on the left side
          if (baseX < 0) {
            dummy.scale.x = -finalScale;
          }
          
          // Keep rotation variation
          dummy.rotation.y = Math.PI * 2 * ((i * 0.618) % 1); // Golden ratio for varied rotation
          
          dummy.updateMatrix();
          palms.setMatrixAt(i, dummy.matrix);
        }
        palms.instanceMatrix.needsUpdate = true;
      };
      
      // Add animation update function to materialShaders
      materialShaders.push({ update: animatePalms });
      
      scene.add(palms);
    }, 
    (progress) => {
      // console.log('Loading palm tree:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('Error loading palm tree model:', error);
      
      // Fallback to procedural palms if GLB fails to load
      // Original procedural palm code would go here as fallback
    });
    
    // Load Road Sign model
    loader.load('/sign2.glb', (gltf) => {
      const signModel = gltf.scene;
      
      // Find the first mesh in the sign model
      let signMesh = null;
      signModel.traverse((child) => {
        if (child.isMesh && !signMesh) {
          signMesh = child;
        }
      });
      
      if (!signMesh) {
        console.error('No mesh found in road sign GLB model');
        return;
      }
      
      // Get geometry and material from the loaded model
      const signGeometry = signMesh.geometry.clone();
      const signMaterial = signMesh.material.clone();
      
      // Set up road sign positions (less frequent than palm trees)
      const signPositions = [];
      // Only place signs on the right side, spaced 80 units apart
      // Starting at -40 to be between palm trees
      signPositions.push(6, 4, -40);   // First sign
      signPositions.push(6, 4, 40);    // Second sign, 80 units later
      
      // Create instanced mesh for signs
      const signCount = signPositions.length / 3;
      const signs = new THREE.InstancedMesh(signGeometry, signMaterial, signCount);
      
      // Set up transform matrices for each sign
      const signDummy = new THREE.Object3D();
      
      for (let i = 0; i < signCount; i++) {
        const x = signPositions[i * 3];
        const y = signPositions[0];
        const z = signPositions[i * 3 + 2];
        
        signDummy.position.set(x, y, z);
        signDummy.scale.set(1, 1, 1); // Make signs larger
        
        // Set rotation order to prevent unwanted tilting
        signDummy.rotation.order = 'XYZ';
        
        // Try no rotation first to see default orientation
        signDummy.rotation.x = 0; // No rotation to see original orientation
        
        // Then rotate signs to face the road
        // if (x < 0) {
        //   signDummy.rotation.y = Math.PI * 0.25; // Face slightly toward road from left
        // } else {
        //   signDummy.rotation.y = -Math.PI * 0.25; // Face slightly toward road from right
        // }
        
        // Ensure no Z rotation
        signDummy.rotation.z = 0;
        
        signDummy.updateMatrix();
        signs.setMatrixAt(i, signDummy.matrix);
      }
      
      // Store initial positions for animation
      const initialSignPositions = new Float32Array(signPositions);
      
      // Animation function for road signs
      const animateSigns = (time) => {
        for (let i = 0; i < signCount; i++) {
          const baseX = initialSignPositions[i * 3];
          const baseY = initialSignPositions[i * 3 + 1];
          const baseZ = initialSignPositions[i * 3 + 2];
          
          // Animate position along Z axis (same speed as palm trees)
          // Signs are 80 units apart, so loop every 160 units (2 signs * 80 units)
          const animatedZ = ((baseZ + time * speed + 80) % 160) - 80;
          
          // Scale based on distance (signs visible from further away)
          const scaleFactor = 0.6 + smoothstep(60, 50, Math.abs(animatedZ)) * 0.8;
          
          signDummy.position.set(baseX, 0, animatedZ);
          signDummy.scale.set(scaleFactor * 1, scaleFactor * 1, scaleFactor * 1);
          
          // Set rotation order
          signDummy.rotation.order = 'XYZ';
          
          // Maintain upright rotation
          signDummy.rotation.x = 0; // No rotation to match initial setup
          
          // Maintain rotation based on side
          // if (baseX < 0) {
          //   signDummy.rotation.y = Math.PI;
          // } else {
          //   signDummy.rotation.y = Math.PI;
          // }
          
          // Set Z rotation to 0 (remove wobble for now to diagnose tilt)
          signDummy.rotation.z = 0;
          
          signDummy.updateMatrix();
          signs.setMatrixAt(i, signDummy.matrix);
        }
        signs.instanceMatrix.needsUpdate = true;
      };
      
      // Add sign animation to material shaders
      materialShaders.push({ update: animateSigns });
      
      scene.add(signs);
      
      // Debug info
      // console.log('Road signs loaded successfully:', {
      //   count: signCount,
      //   positions: signPositions,
      //   geometry: signGeometry,
      //   material: signMaterial
      // });
    },
    (progress) => {
      // console.log('Loading road sign:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('Error loading road sign model:', error);
    });

    // Load Synthwave Sun model
    loader.load('/synthSunset.glb', (gltf) => {
      const sun = gltf.scene;
      
      // Position and scale the sun
      sun.position.set(190, -110, 100);
      sun.scale.set(250, 250, 250);
      
      // Preserve original materials but make them emissive and unaffected by fog
      sun.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.fog = false;
          child.material.transparent = true;
          child.material.side = THREE.DoubleSide;
        }
      });
      
      scene.add(sun);
    }, 
    (progress) => {
      console.log('Loading sun:', (progress.loaded / progress.total * 100) + '%');
    },
    (error) => {
      console.error('Error loading sun model:', error);
      
      // Fallback to simple sun if model fails to load
      const sunGeom = new THREE.CircleGeometry(200, 64);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xff8800, fog: false, transparent: true });
      sunMat.onBeforeCompile = shader => {
        shader.uniforms.time = { value: 0 };
        shader.vertexShader = `
          varying vec2 vUv;
        ` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          `#include <begin_vertex>`,
          `#include <begin_vertex>
            vUv = uv;
          `
        );
        shader.fragmentShader = `
          varying vec2 vUv;
        ` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
          `gl_FragColor = vec4( outgoingLight, diffuseColor.a * smoothstep(0.5, 0.7, vUv.y));`
        );
        materialShaders.push(shader);
      };
      
      const sun = new THREE.Mesh(sunGeom, sunMat);
      sun.position.set(0, 0, -500);
      scene.add(sun);
    });
    
    // Load car model (now includes UFO)
    loader.load('/lambo5k.glb', (gltf) => {
      const carScene = gltf.scene;
      
      // Enhanced logging for model contents
      // console.log('=== Model Loading Debug ===');
      // console.log('Total objects in scene:', carScene.children.length);
      
      // Track UFO-related objects
      const ufoObjects = [];
      const carParts = [];
      const unknownObjects = [];
      
      // Log all objects in the scene hierarchy
      carScene.traverse((child) => {
        // console.log('Object:', {
        //   name: child.name,
        //   type: child.type,
        //   visible: child.visible,
        //   position: child.position,
        //   parent: child.parent?.name,
        //   isMesh: child.isMesh,
        //   material: child.material ? {
        //     type: child.material.type,
        //     color: child.material.color?.getHexString(),
        //     transparent: child.material.transparent,
        //     opacity: child.material.opacity
        //   } : 'No material'
        // });
        
        // More intelligent object detection
        const lowerName = child.name.toLowerCase();
        
        // Check if object name contains car-related keywords
        if (lowerName.includes('wheel') || 
            lowerName.includes('tire') || 
            lowerName.includes('rim') ||
            lowerName.includes('brake') ||
            lowerName.includes('suspension') ||
            lowerName.includes('axle')) {
          // console.log('Found car part:', child.name);
          carParts.push(child);
          // Ensure car parts are visible
          child.visible = true;
        }
        // Check for UFO-related objects by position or other characteristics
        // else if (child.name === 'Object_10' || 
        //          child.name === 'Object_11' || 
        //          child.name === 'Object_12' ||
        //          child.name === 'Object_13' ||
        //          child.name === 'Object_14' ||
        //          child.name === 'Object_15' ||
        //          child.name === 'Object_16' ||
        //          child.name === 'Object_17' ||
        //          child.name === 'Object_18') {
        //   // Only hide if the object is above the car (Y > 2) or far from center
        //   if (child.position.y > 2 || Math.abs(child.position.x) > 5 || Math.abs(child.position.z) > 5) {
        //     console.log('Found UFO object (by position), hiding:', child.name, 'at position:', child.position);
        //     child.visible = false;
        //     ufoObjects.push(child);
        //   } else {
        //     console.log('Object might be car part, keeping visible:', child.name, 'at position:', child.position);
        //     unknownObjects.push(child);
        //   }
        // }
        
        // Look for Mary specifically and ensure she's visible
        if (child.name.toLowerCase().includes('mary')) {
          // console.log('Found Mary object:', child);
          // Make sure Mary is visible
          child.visible = true;
          // If it's a mesh, ensure material is properly set
          if (child.isMesh) {
            // Store reference to Mary mesh
            maryMeshRef.current = child;
            
            // Clone the material to avoid affecting other meshes
            child.material = child.material.clone();
            child.material.transparent = true;
            child.material.opacity = 1;
            child.material.needsUpdate = true;
            
            // Store original emissive properties
            child.userData.originalEmissive = child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0x000000);
            child.userData.originalEmissiveIntensity = child.material.emissiveIntensity || 0;
          }
        }
      });
      
      // console.log('=== Model Loading Summary ===');
      // console.log(`Hidden ${ufoObjects.length} UFO-related objects`);
      // console.log(`Found ${carParts.length} car parts`);
      // console.log(`Found ${unknownObjects.length} unknown objects that might be car parts`);
      
      // Log details of unknown objects
      if (unknownObjects.length > 0) {
        // console.log('Unknown objects that were kept visible:');
        unknownObjects.forEach(obj => {
          // console.log(`- ${obj.name} at position (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
        });
      }
      
      // Position the car
      carScene.position.set(2.5, 0, 25.6);
      // Rotate 180 degrees so car faces away from camera (same direction we're looking)
      carScene.rotation.y = Math.PI;
      carScene.scale.set(2.7, 2.7, 2.7);
      
      // Set up animations
      const animationMixers = [];
      
      if (gltf.animations && gltf.animations.length > 0) {
        // console.log('Found animations:', gltf.animations.map(a => a.name));
        // console.log('Animation details:');
        gltf.animations.forEach(anim => {
          // console.log(`- ${anim.name}: duration=${anim.duration}s, tracks=${anim.tracks.length}`);
        });
        
        // Create mixer for the scene
        const mixer = new THREE.AnimationMixer(carScene);
        
        // Play ALL animations on a loop
        const actions = [];
        gltf.animations.forEach((clip, index) => {
          // console.log(`Setting up animation ${index}: ${clip.name}`);
          
          // Handle Armature/Mixamo character animations
          if (clip.name.toLowerCase().includes('armature') && 
              !clip.name.toLowerCase().includes('wheel') &&
              clip.name !== 'ArmatureAction.001') { // Don't skip UFO animation
            // console.log(`Setting character to rest pose: ${clip.name}`);
            const action = mixer.clipAction(clip);
            action.play();
            action.paused = true; // Play but immediately pause to hold the first frame
            action.time = 0; // Ensure we're at the first frame (rest pose)
            actions.push(action);
            return; // Skip further processing
          }
          
          const action = mixer.clipAction(clip);
          
          // Check if this is the halo animation
          if (clip.name.toLowerCase().includes('halorotation.001')) {
            // console.log(`Playing halo animation: ${clip.name}`);
            action.loop = THREE.LoopRepeat;
            action.play();
            actions.push(action);
            return;
          }
          
          // Check if this is the wheel animation (now 200 frames)
          if (clip.name.toLowerCase().includes('wheel') || 
              (clip.tracks.length > 0 && Math.abs(clip.duration - 6.67) < 0.1)) { // 200 frames at 30fps = 6.67 seconds
            action.loop = THREE.LoopRepeat;
            action.clampWhenFinished = false;
            // Play from the beginning
            action.time = 0;
            // Adjust speed as needed (1.0 = normal speed, negative = reverse)
            action.timeScale = -9.0; // Increased from -3.0 to match the tripled speed
            action.play();
            // console.log(`Playing wheel animation: ${clip.name}, duration: ${clip.duration}s, frames: ~${Math.round(clip.duration * 30)}, speed: -9x (reversed)`);
          } else if (clip.name === 'ArmatureAction.001') {
            // UFO animation - handle separately for scroll-based trigger
            action.clampWhenFinished = true;
            action.loop = THREE.LoopOnce;
            action.setEffectiveWeight(1);

            // console.log('UFO animation ready:', clip.name);
          } else {
            // Play any other animations on loop
            action.loop = THREE.LoopRepeat;
            action.play();
            // console.log(`Playing animation on loop: ${clip.name}`);
          }
          
          actions.push(action);
        });
        
        // Add mixer to the list for updating
        animationMixers.push(mixer);
        
        // Store reference to mixers for animation updates
        if (!materialShadersRef.current) {
          materialShadersRef.current = [];
        }
        materialShadersRef.current.push({
          update: (time, delta) => {
            mixer.update(delta);
          }
        });
      }
      
      // Create video element and texture
      const video = document.createElement('video');
      video.src = '/mario.mp4';
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = true;
      
      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
      videoTexture.format = THREE.RGBFormat;
      
      // Keep original car materials and add emissive to halo
      carScene.traverse((child) => {
        if (child.isMesh) {
          // console.log('Processing mesh:', child.name); // Debug log
          child.castShadow = true;
          child.receiveShadow = true;
          
          
          // Add emissive to halo objects
        
          
          // Add video texture to Display mesh
          if (child.name === 'Display') { // Exact match
            // console.log('Found Display mesh, applying video texture'); 
            child.material = new THREE.MeshBasicMaterial({
              map: videoTexture,
              emissiveMap: videoTexture,
              emissive: new THREE.Color(0xffffff),
              emissiveIntensity: 1,
              transparent: true,
              opacity: 1
            });
            child.material.needsUpdate = true;
          }
        }
      });
      
      // Start playing the video
      video.play().catch(error => {
        // console.warn('Video autoplay failed:', error);
        // Add click handler to start video on user interaction
        const startVideo = () => {
          video.play();
          document.removeEventListener('click', startVideo);
        };
        document.addEventListener('click', startVideo);
      });
      
      // Add a spotlight above the car
      const carSpotlight = new THREE.SpotLight(
        lightSettings.carSpotlight.color,
        lightSettings.carSpotlight.intensity,
        lightSettings.carSpotlight.distance,
        lightSettings.carSpotlight.angle,
        lightSettings.carSpotlight.penumbra
      );
      carSpotlight.position.set(
        lightSettings.carSpotlight.position.x,
        lightSettings.carSpotlight.position.y,
        lightSettings.carSpotlight.position.z
      );
      carSpotlight.target = carScene;
      carSpotlightRef.current = carSpotlight;
      scene.add(carSpotlight);

      // Add car accent light
      const carAccentLight = new THREE.SpotLight(
        lightSettings.carAccentLight.color,
        lightSettings.carAccentLight.intensity,
        lightSettings.carAccentLight.distance,
        lightSettings.carAccentLight.angle,
        lightSettings.carAccentLight.penumbra
      );
      carAccentLight.position.set(
        lightSettings.carAccentLight.position.x,
        lightSettings.carAccentLight.position.y,
        lightSettings.carAccentLight.position.z
      );
      carAccentLightRef.current = carAccentLight;
      scene.add(carAccentLight);
      
      // Add rim lighting from behind
      const rimLight = new THREE.DirectionalLight(
        lightSettings.rimLight.color,
        lightSettings.rimLight.intensity
      );
      rimLight.position.set(
        lightSettings.rimLight.position.x,
        lightSettings.rimLight.position.y,
        lightSettings.rimLight.position.z
      );
      rimLightRef.current = rimLight;
      scene.add(rimLight);
      
      // Add underglow effect
      const underglowLight = new THREE.PointLight(
        lightSettings.underglow.color,
        lightSettings.underglow.intensity,
        lightSettings.underglow.distance
      );
      underglowLight.position.set(
        lightSettings.underglow.position.x,
        lightSettings.underglow.position.y,
        lightSettings.underglow.position.z
      );
      underglowLightRef.current = underglowLight;
      carScene.add(underglowLight);
      
      // Add headlights
      const headlightLeft = new THREE.SpotLight(
        lightSettings.headlights.color,
        lightSettings.headlights.intensity,
        lightSettings.headlights.distance,
        lightSettings.headlights.angle,
        lightSettings.headlights.penumbra
      );
      headlightLeft.position.set(-0.5, 0.5, 1);
      headlightLeft.target.position.set(-0.5, 0, 10);
      headlightLeftRef.current = headlightLeft;
      carScene.add(headlightLeft);
      carScene.add(headlightLeft.target);
      
      const headlightRight = new THREE.SpotLight(
        lightSettings.headlights.color,
        lightSettings.headlights.intensity,
        lightSettings.headlights.distance,
        lightSettings.headlights.angle,
        lightSettings.headlights.penumbra
      );
      headlightRight.position.set(0.5, 0.5, 1);
      headlightRight.target.position.set(0.5, 0, 10);
      headlightRightRef.current = headlightRight;
      carScene.add(headlightRight);
      carScene.add(headlightRight.target);
      
      scene.add(carScene);
      carModelRef.current = carScene; // Save reference for potential scroll-based animations
      
      // GUI initialization removed for production
      if (false) {
        // GUI code disabled
        const carSpotlightFolder = null;
        carSpotlightFolder.addColor(lightSettings.carSpotlight, 'color').onChange((value) => {
          carSpotlightRef.current.color.set(value);
        });
        carSpotlightFolder.add(lightSettings.carSpotlight, 'intensity', 0, 5).onChange((value) => {
          carSpotlightRef.current.intensity = value;
        });
        carSpotlightFolder.add(lightSettings.carSpotlight, 'distance', 0, 50).onChange((value) => {
          carSpotlightRef.current.distance = value;
        });
        carSpotlightFolder.add(lightSettings.carSpotlight, 'angle', 0, Math.PI).onChange((value) => {
          carSpotlightRef.current.angle = value;
        });
        carSpotlightFolder.add(lightSettings.carSpotlight, 'penumbra', 0, 1).onChange((value) => {
          carSpotlightRef.current.penumbra = value;
        });
        carSpotlightFolder.add(lightSettings.carSpotlight.position, 'x', -10, 10).onChange((value) => {
          carSpotlightRef.current.position.x = value;
        });
        carSpotlightFolder.add(lightSettings.carSpotlight.position, 'y', 0, 10).onChange((value) => {
          carSpotlightRef.current.position.y = value;
        });
        carSpotlightFolder.add(lightSettings.carSpotlight.position, 'z', 0, 10).onChange((value) => {
          carSpotlightRef.current.position.z = value;
        });
        
        // Rim Light Controls
        const rimLightFolder = guiRef.current.addFolder('Rim Light');
        rimLightFolder.addColor(lightSettings.rimLight, 'color').onChange((value) => {
          rimLightRef.current.color.set(value);
        });
        rimLightFolder.add(lightSettings.rimLight, 'intensity', 0, 5).onChange((value) => {
          rimLightRef.current.intensity = value;
        });
        rimLightFolder.add(lightSettings.rimLight.position, 'x', -10, 10).onChange((value) => {
          rimLightRef.current.position.x = value;
        });
        rimLightFolder.add(lightSettings.rimLight.position, 'y', 0, 10).onChange((value) => {
          rimLightRef.current.position.y = value;
        });
        rimLightFolder.add(lightSettings.rimLight.position, 'z', -10, 10).onChange((value) => {
          rimLightRef.current.position.z = value;
        });
        
        // Underglow Controls
        const underglowFolder = guiRef.current.addFolder('Underglow');
        underglowFolder.addColor(lightSettings.underglow, 'color').onChange((value) => {
          underglowLightRef.current.color.set(value);
        });
        underglowFolder.add(lightSettings.underglow, 'intensity', 0, 5).onChange((value) => {
          underglowLightRef.current.intensity = value;
        });
        underglowFolder.add(lightSettings.underglow, 'distance', 0, 10).onChange((value) => {
          underglowLightRef.current.distance = value;
        });
        
        // Headlights Controls
        const headlightsFolder = guiRef.current.addFolder('Headlights');
        headlightsFolder.addColor(lightSettings.headlights, 'color').onChange((value) => {
          headlightLeftRef.current.color.set(value);
          headlightRightRef.current.color.set(value);
        });
        headlightsFolder.add(lightSettings.headlights, 'intensity', 0, 5).onChange((value) => {
          headlightLeftRef.current.intensity = value;
          headlightRightRef.current.intensity = value;
        });
        headlightsFolder.add(lightSettings.headlights, 'distance', 0, 50).onChange((value) => {
          headlightLeftRef.current.distance = value;
          headlightRightRef.current.distance = value;
        });
        headlightsFolder.add(lightSettings.headlights, 'angle', 0, Math.PI).onChange((value) => {
          headlightLeftRef.current.angle = value;
          headlightRightRef.current.angle = value;
        });
        headlightsFolder.add(lightSettings.headlights, 'penumbra', 0, 1).onChange((value) => {
          headlightLeftRef.current.penumbra = value;
          headlightRightRef.current.penumbra = value;
        });
        
        // Car Accent Light Controls
        const carAccentLightFolder = guiRef.current.addFolder('Car Accent Light');
        carAccentLightFolder.addColor(lightSettings.carAccentLight, 'color').onChange((value) => {
          carAccentLightRef.current.color.set(value);
        });
        carAccentLightFolder.add(lightSettings.carAccentLight, 'intensity', 0, 5).onChange((value) => {
          carAccentLightRef.current.intensity = value;
        });
        carAccentLightFolder.add(lightSettings.carAccentLight, 'distance', 0, 50).onChange((value) => {
          carAccentLightRef.current.distance = value;
        });
        carAccentLightFolder.add(lightSettings.carAccentLight, 'angle', 0, Math.PI).onChange((value) => {
          carAccentLightRef.current.angle = value;
        });
        carAccentLightFolder.add(lightSettings.carAccentLight, 'penumbra', 0, 1).onChange((value) => {
          carAccentLightRef.current.penumbra = value;
        });
        carAccentLightFolder.add(lightSettings.carAccentLight.position, 'x', -10, 10).onChange((value) => {
          carAccentLightRef.current.position.x = value;
        });
        carAccentLightFolder.add(lightSettings.carAccentLight.position, 'y', 0, 10).onChange((value) => {
          carAccentLightRef.current.position.y = value;
        });
        carAccentLightFolder.add(lightSettings.carAccentLight.position, 'z', 0, 10).onChange((value) => {
          carAccentLightRef.current.position.z = value;
        });
        
        // GUI keyboard shortcut removed

        // Add Save Settings button
        const saveSettings = () => {
          const settings = {
            carSpotlight: {
              color: lightSettings.carSpotlight.color,
              intensity: lightSettings.carSpotlight.intensity,
              distance: lightSettings.carSpotlight.distance,
              angle: lightSettings.carSpotlight.angle,
              penumbra: lightSettings.carSpotlight.penumbra,
              position: { ...lightSettings.carSpotlight.position }
            },
            rimLight: {
              color: lightSettings.rimLight.color,
              intensity: lightSettings.rimLight.intensity,
              position: { ...lightSettings.rimLight.position }
            },
            carAccentLight: {
              color: lightSettings.carAccentLight.color,
              intensity: lightSettings.carAccentLight.intensity,
              distance: lightSettings.carAccentLight.distance,
              angle: lightSettings.carAccentLight.angle,
              penumbra: lightSettings.carAccentLight.penumbra,
              position: { ...lightSettings.carAccentLight.position }
            },
            underglow: {
              color: lightSettings.underglow.color,
              intensity: lightSettings.underglow.intensity,
              distance: lightSettings.underglow.distance,
              position: { ...lightSettings.underglow.position }
            },
            headlights: {
              color: lightSettings.headlights.color,
              intensity: lightSettings.headlights.intensity,
              distance: lightSettings.headlights.distance,
              angle: lightSettings.headlights.angle,
              penumbra: lightSettings.headlights.penumbra
            }
          };

          // console.log('Current Light Settings:', JSON.stringify(settings, null, 2));
          
          // Create a text area with the settings
          const textArea = document.createElement('textarea');
          textArea.value = JSON.stringify(settings, null, 2);
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          
          // Show a temporary message
          const message = document.createElement('div');
          message.textContent = 'Settings copied to clipboard!';
          message.style.position = 'fixed';
          message.style.top = '20px';
          message.style.left = '50%';
          message.style.transform = 'translateX(-50%)';
          message.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
          message.style.color = 'white';
          message.style.padding = '10px 20px';
          message.style.borderRadius = '5px';
          message.style.zIndex = '1000';
          document.body.appendChild(message);
          
          setTimeout(() => {
            document.body.removeChild(message);
          }, 2000);
        };

        // Add Save Settings button to GUI
        guiRef.current.add({ saveSettings }, 'saveSettings').name('💾 Save Settings');

        // Add video controls to GUI
        const videoFolder = guiRef.current.addFolder('Video Controls');
        videoFolder.add({ play: () => video.play() }, 'play').name('▶️ Play');
        videoFolder.add({ pause: () => video.pause() }, 'pause').name('⏸️ Pause');
        videoFolder.add({ restart: () => {
          video.currentTime = 0;
          video.play();
        }}, 'restart').name('🔄 Restart');
      }
    }, 
    // Progress callback (optional)
    (progress) => {
      // console.log('Loading car:', (progress.loaded / progress.total * 100) + '%');
    },
    // Error callback
    (error) => {
      console.error('Error loading car model:', error);
    });
    

    materialShadersRef.current = materialShaders;

    
    
    // Track if component is in view
    let isInView = false;
    
    // Use intersection observer just to detect if component is in view
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -20% 0px', // Only trigger when component is in the middle 60% of viewport
      threshold: 0.5
    };
    
    const handleIntersection = (entries) => {
      entries.forEach(entry => {
        const rect = entry.boundingClientRect;
        const viewportHeight = window.innerHeight;
        
        // Only activate when component is well-centered in viewport
        const componentCenter = rect.top + rect.height / 2;
        const viewportCenter = viewportHeight / 2;
        const distanceFromCenter = Math.abs(componentCenter - viewportCenter);
        
        // Activate only when component center is within 30% of viewport center
        isInView = entry.isIntersecting && (distanceFromCenter < viewportHeight * 0.3);
      });
    };
    
    const observer = new IntersectionObserver(handleIntersection, observerOptions);
    

    
    

    
    // Start observing after a small delay to ensure DOM is ready
    // setTimeout(startObserving, 100);
    

    
    // Keyboard controls for camera tuning
    const handleKeyPress = (e) => {
      if (e.key === 'i' || e.key === 'I') {
        // Log current camera position for debugging
        if (cameraRef.current && controlsRef.current) {
          const pos = cameraRef.current.position;
          const target = controlsRef.current.target;
          const fov = cameraRef.current.fov;
          
          console.log('=== Current Camera Info ===');
          console.log('Position:', `${pos.x.toFixed(4)}, ${pos.y.toFixed(4)}, ${pos.z.toFixed(4)}`);
          console.log('Target:', `${target.x.toFixed(4)}, ${target.y.toFixed(4)}, ${target.z.toFixed(4)}`);
          console.log('FOV:', fov);
          console.log('Scroll Progress:', scrollProgressRef.current);
          
          // Copy-paste ready format
          console.log('\n// Copy for keyframe:');
          console.log(`{ x: ${pos.x.toFixed(4)}, y: ${pos.y.toFixed(4)}, z: ${pos.z.toFixed(4)}, targetX: ${target.x.toFixed(4)}, targetY: ${target.y.toFixed(4)}, targetZ: ${target.z.toFixed(4)}, fov: ${fov} }`);
        }
      } else if (e.key === 'o' || e.key === 'O') {
        // Toggle OrbitControls for finding good positions
        if (controlsRef.current) {
          controlsRef.current.enabled = !controlsRef.current.enabled;
          scrollCameraEnabledRef.current = !controlsRef.current.enabled;
          console.log('OrbitControls:', controlsRef.current.enabled ? 'ENABLED' : 'DISABLED');
          console.log('ScrollCamera:', scrollCameraEnabledRef.current ? 'ENABLED' : 'DISABLED');
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);

    // Create GSAP timeline for cinematic intro
    const createCinematicTimeline = (reverse = false) => {
      let keyframes = recordedKeyframesRef.current.length > 0 ? recordedKeyframesRef.current : defaultCinematicKeyframes;
      
      // If reverse is true, reverse the keyframes array and adjust times
      if (reverse) {
        keyframes = [...keyframes].reverse().map((kf, index, arr) => ({
          ...kf,
          time: 1 - kf.time, // Invert the time values
          label: kf.label ? `REVERSE: ${kf.label}` : ''
        }));
      }
      
      // Kill any existing timeline
      if (cinematicTimelineRef.current) {
        cinematicTimelineRef.current.kill();
      }
      
      // Create new timeline
      const tl = gsap.timeline({
        onStart: () => {
          // Set initial label
          setCurrentKeyframeLabel(keyframes[0].label || '');
        },
        onComplete: () => {
          // Cinematic complete - removed
          // Don't enable controls - scroll camera is always active
          // controls.enabled = true;
          // controls.update();
          
          // Start Mary glowing effect
          setMaryGlowing(true);
          maryGlowingRef.current = true;
          
          // Create and animate a blue point light for Mary
          if (maryMeshRef.current) {
            // console.log('Creating Mary glow effect!');
            // Get Mary's world position
            const maryWorldPos = new THREE.Vector3();
            maryMeshRef.current.getWorldPosition(maryWorldPos);
            // console.log('Mary world position:', maryWorldPos);
            
            // Create a bright blue point light with larger radius
            const maryLight = new THREE.PointLight(0x00ffff, 0, 10); // Cyan blue, larger radius
            maryLight.position.copy(maryWorldPos);
            maryLight.position.y += 0.2; // Slightly above Mary
            scene.add(maryLight);
            maryLightRef.current = maryLight;
            
            // Create pulsing light animation with higher intensity
            gsap.to(maryLight, {
              intensity: 5,
              duration: 1,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1
            });
            
            // Also add a spot light pointing at Mary for more visibility
            const marySpotlight = new THREE.SpotLight(0x00ffff, 0, 10, Math.PI / 6, 0.5);
            marySpotlight.position.copy(maryWorldPos);
            marySpotlight.position.y += 2;
            marySpotlight.target.position.copy(maryWorldPos);
            scene.add(marySpotlight);
            scene.add(marySpotlight.target);
            
            // Animate the spotlight too
            gsap.to(marySpotlight, {
              intensity: 3,
              duration: 1,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1
            });
            
            // Create a "Click Me" sprite above Mary
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            // Draw rounded rectangle background
            ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.fillRect(10, 10, 236, 44);
            
            // Draw text
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Click to Enter', 128, 32);
            
            // Create sprite
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ 
              map: texture,
              transparent: true,
              opacity: 0
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(2, 0.5, 1);
            sprite.position.copy(maryWorldPos);
            sprite.position.y += 1.5;
            scene.add(sprite);
            
            // Fade in the sprite
            gsap.to(spriteMaterial, {
              opacity: 1,
              duration: 1,
              delay: 0.5
            });
            
            // Make sprite bob up and down
            gsap.to(sprite.position, {
              y: sprite.position.y + 0.2,
              duration: 2,
              ease: "sine.inOut",
              yoyo: true,
              repeat: -1
            });
            
            // Also add a subtle glow to Mary's material if it exists
            if (maryMeshRef.current.material) {
              const material = maryMeshRef.current.material;
              if (!material.emissive) material.emissive = new THREE.Color(0x000000);
              material.emissive.setHex(0x00ffff);
              
              gsap.to(material, {
                emissiveIntensity: 0.3,
                duration: 1,
                ease: "sine.inOut",
                yoyo: true,
                repeat: -1
              });
            }
          }
        }
      });
      
      // Create a proxy object for smooth interpolation
      const startKeyframe = keyframes[0];
      const cameraProxy = {
        x: startKeyframe.position.x,
        y: startKeyframe.position.y,
        z: startKeyframe.position.z,
        targetX: startKeyframe.target.x,
        targetY: startKeyframe.target.y,
        targetZ: startKeyframe.target.z,
        fov: startKeyframe.fov
      };
      
      // Set camera to starting position
      camera.position.set(cameraProxy.x, cameraProxy.y, cameraProxy.z);
      camera.lookAt(cameraProxy.targetX, cameraProxy.targetY, cameraProxy.targetZ);
      camera.fov = cameraProxy.fov;
      camera.updateProjectionMatrix();
      controls.target.set(cameraProxy.targetX, cameraProxy.targetY, cameraProxy.targetZ);
      
      // Add each keyframe to the timeline
      keyframes.forEach((keyframe, index) => {
        if (index === 0) return; // Skip first keyframe as it's the starting position
        
        const totalDuration = 15; // Total animation duration in seconds
        const duration = index === 1 
          ? keyframe.time * totalDuration // First segment duration
          : (keyframe.time - keyframes[index - 1].time) * totalDuration; // Subsequent segments
        
        tl.to(cameraProxy, {
          duration: duration,
          x: keyframe.position.x,
          y: keyframe.position.y,
          z: keyframe.position.z,
          targetX: keyframe.target.x,
          targetY: keyframe.target.y,
          targetZ: keyframe.target.z,
          fov: keyframe.fov,
          // Use linear easing for continuous motion, except for the last keyframe
          ease: index === keyframes.length - 1 ? "power2.inOut" : "none",
          onUpdate: () => {
            camera.position.set(cameraProxy.x, cameraProxy.y, cameraProxy.z);
            camera.lookAt(cameraProxy.targetX, cameraProxy.targetY, cameraProxy.targetZ);
            camera.fov = cameraProxy.fov;
            camera.updateProjectionMatrix();
            controls.target.set(cameraProxy.targetX, cameraProxy.targetY, cameraProxy.targetZ);
          }
        }, index === 1 ? 0 : `>`); // No overlap for continuous motion
      });
      
      // Update progress for UI
      tl.eventCallback("onUpdate", () => {
        const progress = tl.progress();
        // Cinematic progress removed
        
        // Find current keyframe label based on progress
        const currentTime = progress * keyframes[keyframes.length - 1].time;
        let currentLabel = keyframes[0].label || '';
        
        for (let i = 0; i < keyframes.length - 1; i++) {
          if (currentTime >= keyframes[i].time && currentTime < keyframes[i + 1].time) {
            currentLabel = keyframes[i].label || '';
            break;
          }
        }
        
        // Check if we're at or past the last keyframe
        if (currentTime >= keyframes[keyframes.length - 1].time) {
          currentLabel = keyframes[keyframes.length - 1].label || '';
        }
        
        setCurrentKeyframeLabel(currentLabel);
      });
      
      cinematicTimelineRef.current = tl;
      return tl;
    };
    
    // DISABLED CINEMATIC - Start cinematic intro if not in design mode
    // if (cinematicModeRef.current !== 'design') {
    //   const timeline = createCinematicTimeline(cinematicReverse);
    //   timeline.play();
    // }
    
    // Controls work immediately since cinematic is removed
    
    // Also trigger Mary glow effect
    setMaryGlowing(true);
    maryGlowingRef.current = true;
    
    // Simple scroll-based camera animation using GSAP ScrollTrigger
    // Create a virtual scroll container for smooth animation
    const setupScrollAnimation = () => {
      console.log('Setting up scroll animation...');
      console.log('Camera exists:', !!cameraRef.current);
      console.log('Controls exist:', !!controlsRef.current);
      console.log('Intersection ref exists:', !!intersectionRef.current);
      
      if (!cameraRef.current || !controlsRef.current) {
        console.log('Camera or controls not ready, retrying...');
        setTimeout(setupScrollAnimation, 500);
        return;
      }
      
      // Kill any existing ScrollTriggers first
      ScrollTrigger.getAll().forEach(t => t.kill());
      
      // Reset to initial state - ensure we're at the start
      window.scrollTo(0, 0);
      scrollProgressRef.current = 0;
      setCurrentCameraStage(0);
      
      // Detect if device is mobile (phone, not tablet)
      const isMobile = (() => {
        const userAgent = navigator.userAgent.toLowerCase();
        const isIPhone = /iphone/i.test(userAgent);
        const isAndroid = /android/i.test(userAgent) && /mobile/i.test(userAgent);
        const hasSmallScreen = window.innerWidth < 600 || window.innerHeight < 600;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        return (isIPhone || isAndroid) && hasSmallScreen && hasTouch;
      })();
      
      console.log('Mobile device detected:', isMobile);
      
      // Set initial camera position based on device type
      const initialPos = isMobile 
        ? { x: 17.5605, y: 12.0910, z: 55.1540 }  // Mobile aerial view
        : { x: 16.2711, y: 5.8264, z: 40.5498 };   // Desktop aerial view
      
      const initialTarget = isMobile
        ? { x: 3.0669, y: 6.0868, z: 20.1252 }     // Mobile initial target
        : { x: 4.3726, y: 2.1681, z: 20.7525 };    // Desktop initial target
      
      const initialFov = 45;
      
      cameraRef.current.position.set(initialPos.x, initialPos.y, initialPos.z);
      cameraRef.current.lookAt(initialTarget.x, initialTarget.y, initialTarget.z);
      cameraRef.current.fov = initialFov;
      cameraRef.current.updateProjectionMatrix();
      
      if (controlsRef.current) {
        controlsRef.current.target.set(initialTarget.x, initialTarget.y, initialTarget.z);
        controlsRef.current.update();
      }
      
      // Create a simple timeline for camera movement
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        paused: true // Ensure timeline doesn't auto-play
      });
      
      // Define camera path from aerial to Mary's face
      const cameraPath = {
        // Starting values (aerial view) - must match initialPos/Target above
        x: initialPos.x,
        y: initialPos.y,
        z: initialPos.z,
        targetX: initialTarget.x,
        targetY: initialTarget.y,
        targetZ: initialTarget.z,
        fov: initialFov
      };
      
      // Use different camera paths for mobile vs desktop
      if (isMobile) {
        // Mobile camera sequence - smooth flow without reversals
        // Mobile waypoint 1: Approach from above
        tl.to(cameraPath, {
          x: 1.0987,
          y: 4.8203,
          z: 36.7389,
          targetX: 1.1492,
          targetY: 2.2977,
          targetZ: 23.3133,
          fov: 44.995111,
          duration: 0.2,
          ease: "power2.inOut"
        })
        // Mobile waypoint 2: Dramatic side angle
        .to(cameraPath, {
          x: -7.7565,
          y: 3.4606,
          z: 9.1109,
          targetX: 0.3402,
          targetY: 0.9371,
          targetZ: 22.4996,
          fov: 44.833105,
          duration: 0.2,
          ease: "power2.inOut"
        })
        // Mobile waypoint 3: Move closer to interior
        .to(cameraPath, {
          x: 2.8016,
          y: 1.3315,
          z: 19.6750,
          targetX: 2.3361,
          targetY: 1.5058,
          targetZ: 22.1126,
          fov: 44.832617,
          duration: 0.15,
          ease: "power2.inOut"
        })
        // Mobile waypoint 4: Pull back for wider view
        .to(cameraPath, {
          x: 2.8681, y: 2.2216, z: 27.6469, targetX: 2.0688, targetY: 1.2227, targetZ: 24.1144,
          fov: 44.832617,
          duration: 0.15,
          ease: "power2.inOut"
        })
        // Mobile final: Close-up Mary - smoother transition
        .to(cameraPath, {
          x: 2.5423, y: 1.3140, z: 25.2827, targetX: 2.4213, targetY: 1.2304, targetZ: 24.0603,
          fov: 44.832617,
          duration: 0.15,
          ease: "power2.inOut"  // Smoother easing for the final approach
        })
        .to(cameraPath, {
          x: 2.4853, y: 1.1738, z: 24.3400, targetX: 2.4593, targetY: 1.1558, targetZ: 24.0773,
          fov: 44.832617,
          duration: 0.25,
          ease: "power2.inOut"  // Smoother easing for the final approach
        });
        
        
        ;
      } else {
        // Desktop camera sequence - original path
        // Waypoint 1: Behind and above (first movement from aerial)
        tl.to(cameraPath, {
          x: 0.8114,
          y: 3.8097,
          z: 36.9146,
          targetX: 0.6379,
          targetY: 1.7031,
          targetZ: 23.6150,
          fov: 42.106054,
          duration: 0.2,
          ease: "power2.inOut"
        })
        // Waypoint 2: Side view at car level
        .to(cameraPath, {
          x: -12.6434,
          y: 3.9412,
          z: 20.5192,
          targetX: 0.6205,
          targetY: 1.7849,
          targetZ: 23.5889,
          fov: 42.106054,
          duration: 0.2,
          ease: "power2.inOut"
        })
        // Waypoint 3: Low front angle
        .to(cameraPath, {
          x: -0.7692,
          y: 3.9049,
          z: 10.1399,
          targetX: 0.6226,
          targetY: 1.7644,
          targetZ: 23.5831,
          fov: 42.106054,
          duration: 0.15,
          ease: "power2.inOut"
        })
        // Waypoint 4: Approaching car from behind
        .to(cameraPath, {
          x: 3.2883,
          y: 1.7877,
          z: 26.5226,
          targetX: 1.4980,
          targetY: 1.3718,
          targetZ: 22.9299,
          fov: 38,
          duration: 0.15,
          ease: "power2.inOut"
        })
        // Waypoint 5: Close to dashboard
        .to(cameraPath, {
          x: 2.3730,
          y: 1.1926,
          z: 26.0807,
          targetX: 1.6639,
          targetY: 1.3046,
          targetZ: 22.9043,
          fov: 30,
          duration: 0.15,
          ease: "power2.inOut"
        })
        // Final close-up: Face to face with Mary
        .to(cameraPath, {
          x: 2.5268,
          y: 1.1644,
          z: 24.4943,
          targetX: 2.4119,
          targetY: 1.1506,
          targetZ: 22.2732,
          fov: 31.2576,
          duration: 0.25,  // Longer duration for final position
          ease: "none"  // Linear easing to ensure exact final position
        });
      }
  
      // Single onUpdate for the entire timeline
      tl.eventCallback("onUpdate", () => {
        if (cameraRef.current) {
          // Always update camera during scroll animation, regardless of controls state
          cameraRef.current.position.set(cameraPath.x, cameraPath.y, cameraPath.z);
          cameraRef.current.lookAt(cameraPath.targetX, cameraPath.targetY, cameraPath.targetZ);
          cameraRef.current.fov = cameraPath.fov;
          cameraRef.current.updateProjectionMatrix();
          
          if (controlsRef.current) {
            // Keep controls disabled during scroll animation
            controlsRef.current.enabled = false;
            controlsRef.current.target.set(cameraPath.targetX, cameraPath.targetY, cameraPath.targetZ);
            // Don't call update() during animation to prevent interference
            // controlsRef.current.update();
          }
        }
      });
      
      // Add completion callback to ensure final position is set
      tl.eventCallback("onComplete", () => {
        console.log('Timeline complete! Setting final camera position...');
        if (cameraRef.current) {
          // Force final position - matching the last waypoint for each platform
          const finalPos = isMobile 
            ? { x: 2.4853, y: 1.1738, z: 24.3400 }
            : { x: 2.5268, y: 1.1644, z: 24.4943 };
          
          const finalTarget = isMobile
            ? { x: 2.4593, y: 1.1558, z: 24.0773 }
            : { x: 2.4119, y: 1.1506, z: 22.2732 };
          
          const finalFov = isMobile ? 44.832617 : 31.2576;
          
          cameraRef.current.position.set(finalPos.x, finalPos.y, finalPos.z);
          cameraRef.current.lookAt(finalTarget.x, finalTarget.y, finalTarget.z);
          cameraRef.current.fov = finalFov;
          cameraRef.current.updateProjectionMatrix();
          
          if (controlsRef.current) {
            controlsRef.current.target.set(finalTarget.x, finalTarget.y, finalTarget.z);
            // Don't call update() here as controls should stay disabled
          }
        }
        
        // Show the "Take me there" button after a short delay
        console.log('Timeline complete! Showing button in 1.5 seconds...');
        setTimeout(() => {
          console.log('Setting showEnterButton to true');
          setShowEnterButton(true);
        }, 1500); // 1.5 second delay after reaching Mary
      });
      
      // Create ScrollTrigger - use document scrolling
      const st = ScrollTrigger.create({
        trigger: document.body,
        start: "top top",
        end: isMobile ? "bottom bottom" : "bottom bottom", // Use full document height
        scrub: isMobile ? 2 : 0.5, // Increased scrub value for smoother touch scrolling
        animation: tl,
        markers: false, // Hide markers for cleaner view
        immediateRender: false, // Don't jump to end
        normalizeScroll: false, // Disable - can interfere with native touch scrolling
        anticipatePin: 0, // Reduce this to see if it helps
        preventOverlaps: true, // Prevent scroll conflicts
        fastScrollEnd: false, // Disable for better touch response
        onUpdate: (self) => {
          scrollProgressRef.current = self.progress;
          
          // Debug logging for mobile
          if (isMobile && (self.progress > 0.9 || self.progress === 1)) {
            console.log(`Mobile scroll progress: ${self.progress.toFixed(3)}, Stage: ${currentCameraStage}`);
          }
          
          // Update camera stage based on progress for text changes
          let stage = 0;
          if (isMobile) {
            // Mobile has 5 waypoints (plus initial = 6 positions)
            // Distribute 5 text blocks evenly across the journey
            if (self.progress < 0.2) stage = 0;        // Initial to first waypoint
            else if (self.progress < 0.4) stage = 1;   // First to second waypoint
            else if (self.progress < 0.6) stage = 2;   // Second to third waypoint
            else if (self.progress < 0.8) stage = 3;   // Third to fourth waypoint
            else stage = 4;                             // Fourth to final waypoint
          } else {
            // Desktop has 6 waypoints, 5 text blocks
            if (self.progress < 0.2) stage = 0;
            else if (self.progress < 0.4) stage = 1;
            else if (self.progress < 0.6) stage = 2;
            else if (self.progress < 0.8) stage = 3;
            else stage = 4; // Final text block for the ultimate close-up
          }
          
          setCurrentCameraStage(stage);
          
          // Show button when we reach final stage on mobile
          if (isMobile && stage === 4 && !window.mobileButtonTriggered) {
            console.log('Mobile reached final stage, showing button');
            window.mobileButtonTriggered = true;
            setTimeout(() => {
              console.log('Setting showEnterButton to true for mobile');
              setShowEnterButton(true);
            }, 1500);
          }
          
          // Show button when we're very close to the end (desktop)
          if (!isMobile && self.progress >= 0.95 && !window.buttonTriggered) {
            console.log('Desktop progress >= 95%, triggering button show');
            window.buttonTriggered = true;
            setTimeout(() => {
              console.log('Setting showEnterButton to true from progress check');
              setShowEnterButton(true);
            }, 1500);
          }
        }
      });
      
      console.log('ScrollTrigger created:', st);
      
      // Force timeline to start at beginning
      tl.progress(0);
      tl.pause();
      
      // Force camera back to initial position after ScrollTrigger creation
      cameraRef.current.position.set(initialPos.x, initialPos.y, initialPos.z);
      cameraRef.current.lookAt(initialTarget.x, initialTarget.y, initialTarget.z);
      cameraRef.current.fov = initialFov;
      cameraRef.current.updateProjectionMatrix();
      
      // Force refresh to ensure proper initialization
      st.refresh();
      ScrollTrigger.refresh();
    };
    
    // Set up scroll animation after a short delay to ensure scene is ready
    setTimeout(() => {
      // Enable ScrollTrigger for mobile with better touch handling
      ScrollTrigger.config({
        ignoreMobileResize: true,
        autoRefreshEvents: "visibilitychange,DOMContentLoaded,load,resize",
        // Force ScrollTrigger to recognize touch events
        touch: true, // Enable touch-scrolling (use boolean true)
        syncInterval: 20, // Sync more frequently for smoother updates
        force3D: true, // Force hardware acceleration
        limitCallbacks: true // Optimize performance
      });
      
      // Ensure the page is scrollable on mobile
      if (isMobile) {
        // Configure body and html for proper touch scrolling
        document.body.style.overscrollBehavior = 'auto';
        document.documentElement.style.overscrollBehavior = 'auto';
        document.body.style.touchAction = 'manipulation'; // Better than pan-y for general touch
        document.body.style.webkitOverflowScrolling = 'touch';
        document.body.style.overflow = 'auto';
        document.body.style.height = 'auto';
        document.body.style.position = 'relative';
        
        // Also configure HTML element
        document.documentElement.style.overflow = 'auto';
        document.documentElement.style.height = 'auto';
        document.documentElement.style.touchAction = 'manipulation';
        
        // Ensure the scroll container is touch-enabled
        const scrollContainer = document.getElementById('scroll-container');
        if (scrollContainer) {
          scrollContainer.style.webkitOverflowScrolling = 'touch';
          scrollContainer.style.touchAction = 'manipulation';
        }
      }
      
      setupScrollAnimation();
    }, 100);
    
    // Test if page is scrollable
    setTimeout(() => {
      console.log('Document body height:', document.body.scrollHeight);
      console.log('Window height:', window.innerHeight);
      console.log('Is scrollable?', document.body.scrollHeight > window.innerHeight);
      console.log('Scroll container exists?', !!document.getElementById('scroll-container'));
      console.log('Current scroll position:', window.scrollY);
    }, 1500);
    
    // Old scroll handler - keeping for fallback
    const handleScroll = (event) => {
      // Disabled - using ScrollTrigger instead
      return;
      
      // Determine current stage based on progress
      let currentStage = 0;
      const easedProg = 1 - Math.pow(1 - scrollProgressRef.current, 3);
      if (easedProg < 0.2) currentStage = 0;
      else if (easedProg < 0.4) currentStage = 1;
      else if (easedProg < 0.6) currentStage = 2;
      else if (easedProg < 0.8) currentStage = 3;
      else currentStage = 4;
      
      // Enhanced debug logging
      // console.log('Scroll event:', {
      //   deltaY: event.deltaY,
      //   rawProgress: rawProgress.toFixed(3),
      //   scrollProgress: scrollProgressRef.current.toFixed(3),
      //   isAtStickyPoint: isAtStickyPoint,
      //   currentStage: currentStage,
      //   enabled: scrollCameraEnabledRef.current,
      //   controlsEnabled: controlsRef.current ? controlsRef.current.enabled : 'N/A',
      //   cameraActualPos: cameraRef.current ? `(${cameraRef.current.position.x.toFixed(2)}, ${cameraRef.current.position.y.toFixed(2)}, ${cameraRef.current.position.z.toFixed(2)})` : 'N/A'
      // });
      
      // Define camera path keyframes - from aerial to Mary's face
      const startPos = new THREE.Vector3(10.4429, 12.8459, 48.9003); // High aerial view (starting position)
      const midPos1 = new THREE.Vector3(2.4008, 2.6902, 46.3190); // Behind car view
      const midPos2 = new THREE.Vector3(2.5441, 1.2363, 30.7488); // License plate view
      const midPos3 = new THREE.Vector3(2.2983, 1.2680, 26.2786); // Full interior view position
      const midPos4 = new THREE.Vector3(2.4564, 1.2084, 24.3895); // Close-up Mary position
      const endPos = new THREE.Vector3(2.4564, 1.2084, 24.3895); // Final position (Mary close-up)
      
      const startTarget = new THREE.Vector3(0.2783, 12.8459, 24.1190); // Looking down at scene
      const midTarget1 = new THREE.Vector3(4.7090, 0.1080, 25.6604); // Looking at car from behind
      const midTarget2 = new THREE.Vector3(2.6723, 0.6909, 25.8858); // Looking at license plate
      const midTarget3 = new THREE.Vector3(2.6041, 1.2667, 22.1906); // Looking at interior
      const midTarget4 = new THREE.Vector3(2.5729, 1.0383, 22.2069); // Looking at Mary
      const endTarget = new THREE.Vector3(2.5729, 1.0383, 22.2069); // Final target (Mary)
      
      const startFov = 45; // Aerial FOV
      const midFov1 = 44.99702846471359; // FOV for behind view
      const midFov2 = 44.99445463822931; // FOV for license plate
      const midFov3 = 44.81375073518518; // FOV for full interior
      const midFov4 = 20; // Close-up FOV
      const endFov = 20; // Final FOV (close-up)
      
      // Apply easing function for smoother movement
      const easedProgress = 1 - Math.pow(1 - scrollProgressRef.current, 3); // Cubic ease-out
      
      // Six-stage interpolation
      let currentPos, currentTarget, currentFov;
      let stage = 0;
      
      if (easedProgress < 0.2) {
        // Stage 1: Aerial view to behind car (0-20% of scroll)
        stage = 0;
        const stage1Progress = easedProgress * 5; // Map 0-0.2 to 0-1
        currentPos = new THREE.Vector3().lerpVectors(startPos, midPos1, stage1Progress);
        currentTarget = new THREE.Vector3().lerpVectors(startTarget, midTarget1, stage1Progress);
        currentFov = startFov + (midFov1 - startFov) * stage1Progress;
      } else if (easedProgress < 0.4) {
        // Stage 2: Behind car to license plate (20-40% of scroll)
        stage = 1;
        const stage2Progress = (easedProgress - 0.2) * 5; // Map 0.2-0.4 to 0-1
        currentPos = new THREE.Vector3().lerpVectors(midPos1, midPos2, stage2Progress);
        currentTarget = new THREE.Vector3().lerpVectors(midTarget1, midTarget2, stage2Progress);
        currentFov = midFov1 + (midFov2 - midFov1) * stage2Progress;
      } else if (easedProgress < 0.6) {
        // Stage 3: License plate to full interior (40-60% of scroll)
        stage = 2;
        const stage3Progress = (easedProgress - 0.4) * 5; // Map 0.4-0.6 to 0-1
        currentPos = new THREE.Vector3().lerpVectors(midPos2, midPos3, stage3Progress);
        currentTarget = new THREE.Vector3().lerpVectors(midTarget2, midTarget3, stage3Progress);
        currentFov = midFov2 + (midFov3 - midFov2) * stage3Progress;
      } else if (easedProgress < 0.8) {
        // Stage 4: Full interior to close-up Mary (60-80% of scroll)
        stage = 3;
        const stage4Progress = (easedProgress - 0.6) * 5; // Map 0.6-0.8 to 0-1
        currentPos = new THREE.Vector3().lerpVectors(midPos3, midPos4, stage4Progress);
        currentTarget = new THREE.Vector3().lerpVectors(midTarget3, midTarget4, stage4Progress);
        currentFov = midFov3 + (midFov4 - midFov3) * stage4Progress;
      } else {
        // Stage 5: Final approach to Mary's face (80-100% of scroll)
        stage = 4;
        const stage5Progress = (easedProgress - 0.8) * 5; // Map 0.8-1.0 to 0-1
        currentPos = new THREE.Vector3().lerpVectors(midPos4, endPos, stage5Progress);
        currentTarget = new THREE.Vector3().lerpVectors(midTarget4, endTarget, stage5Progress);
        currentFov = midFov4 + (endFov - midFov4) * stage5Progress;
      }
      
      // Update current stage
      setCurrentCameraStage(stage);
      
      // Apply the interpolated values
      cameraRef.current.position.copy(currentPos);
      cameraRef.current.lookAt(currentTarget);
      cameraRef.current.fov = currentFov;
      cameraRef.current.updateProjectionMatrix();
      
      // Update controls target but DON'T call update() when scroll camera is enabled
      if (controlsRef.current) {
        controlsRef.current.target.copy(currentTarget);
        // Don't call update() here as it would override our camera position
      }
    };
    
    // Toggle scroll camera removed - always active
    
    // Add scroll listener to multiple elements to ensure it's captured
    window.addEventListener('wheel', handleScroll, { passive: false });
    if (renderer.domElement) {
      renderer.domElement.addEventListener('wheel', handleScroll, { passive: false });
    }
    if (mountRef.current) {
      mountRef.current.addEventListener('wheel', handleScroll, { passive: false });
    }
    // Also add to document as a fallback
    document.addEventListener('wheel', handleScroll, { passive: false });
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Get delta time once per frame
      const delta = clockRef.current.getDelta();
      const time = clockRef.current.getElapsedTime();
      
      materialShadersRef.current.forEach(m => {
        if (m.uniforms && m.uniforms.time) {
          m.uniforms.time.value = time;
        } else if (m.material && m.material.uniforms && m.material.uniforms.time) {
          // Handle ShaderMaterial
          m.material.uniforms.time.value = time;
        } else if (m.isShaderMaterial && m.uniforms && m.uniforms.time) {
          // Direct ShaderMaterial
          m.uniforms.time.value = time;
        } else if (m.update) {
          // Handle custom update functions (like animations)
          m.update(time, delta);
        }
      });
      
      // Scroll camera animation
      
      // Handle scroll-based camera movement
      if (scrollCameraEnabledRef.current) {
        // Scroll camera is enabled - this handles the camera movement
        // The actual camera updates happen in the handleScroll function
      } else {
        // Only update controls if scroll camera is NOT enabled
        // Dynamic maxPolarAngle based on camera distance
        // Calculate current distance from camera to target
        const cameraDistance = camera.position.distanceTo(controls.target);
        
        // Adjust maxPolarAngle based on distance
        // When close (distance < 5), allow lower angles for dashboard view
        // When far (distance > 20), restrict to prevent seeing below road
        if (cameraDistance < 5) {
          // Very close - allow almost horizontal view for dashboard
          controls.maxPolarAngle = Math.PI * 0.55; // ~153 degrees
        } else if (cameraDistance < 10) {
          // Medium distance - moderate restriction
          controls.maxPolarAngle = Math.PI * 0.55; // ~117 degrees
        } else {
          // Far distance - restrict to prevent seeing below road
          controls.maxPolarAngle = Math.PI * 0.45; // ~81 degrees
        }
        
        // Only update orbit controls if they're enabled (not during scroll animation)
        if (controls.enabled) {
          controls.update();
        }
      }
      
      // Render the scene
      renderer.render(scene, camera);
    };

    // Handle resize
    const handleResize = () => {
      if (mountRef.current && rendererRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(width, height, false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Call resize initially to ensure proper sizing
    
    // Handle mouse move for hover effect
    const handleMouseMove = (event) => {
      // Debug logging
      if (!maryGlowingRef.current || !mountRef.current) {
        console.log('Mouse move blocked:', {
          maryGlowing: maryGlowingRef.current,
          mountExists: !!mountRef.current
        });
        return;
      }
      
      const rect = mountRef.current.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera);
      
      // Check for intersection with Mary
      if (maryMeshRef.current) {
        const intersects = raycaster.current.intersectObject(maryMeshRef.current, true);
        
        if (intersects.length > 0) {
          mountRef.current.style.cursor = 'pointer';
          // Increase glow intensity on hover
          if (maryLightRef.current) {
            gsap.to(maryLightRef.current, {
              intensity: 3,
              duration: 0.3
            });
          }
          if (maryMeshRef.current.material) {
            gsap.to(maryMeshRef.current.material, {
              emissiveIntensity: 0.5,
              duration: 0.3
            });
          }
        } else {
          mountRef.current.style.cursor = 'default';
          // Return to normal glow
          if (maryLightRef.current) {
            gsap.to(maryLightRef.current, {
              intensity: 2,
              duration: 0.3
            });
          }
          if (maryMeshRef.current.material) {
            gsap.to(maryMeshRef.current.material, {
              emissiveIntensity: 0.3,
              duration: 0.3
            });
          }
        }
      }
    };
    
    // Handle click on Mary
    const handleClick = (event) => {
      // console.log('Click event - maryGlowing:', maryGlowingRef.current);
      if (!maryGlowingRef.current || !mountRef.current) return;
      
      const rect = mountRef.current.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update raycaster
      raycaster.current.setFromCamera(mouse.current, camera);
      
      // Check for intersection with Mary or the entire car (as fallback)
      if (maryMeshRef.current) {
        // console.log('Checking Mary intersection, mesh exists:', !!maryMeshRef.current);
        const intersects = raycaster.current.intersectObject(maryMeshRef.current, true);
        // console.log('Mary intersects found:', intersects.length);
        
        if (intersects.length > 0) {
          console.log('Mary clicked! Navigating to gallery...');
          
          // Add fade out transition before navigating
          gsap.to(mountRef.current, {
            opacity: 0,
            duration: 1.5,
            ease: "power2.inOut",
            onComplete: () => {
              router.push('/gallery');
            }
          });
          return;
        }
      }
      
      // Fallback: check intersection with entire car model
      if (carModelRef.current) {
        const carIntersects = raycaster.current.intersectObject(carModelRef.current, true);
        // console.log('Car intersects found:', carIntersects.length);
        
        // Check if any of the intersected objects is near Mary's position
        if (carIntersects.length > 0) {
          const maryPos = new THREE.Vector3(1.1811263369229998, 0.9999999999999805, 12.355272021071679);
          for (const intersect of carIntersects) {
            const distance = intersect.point.distanceTo(maryPos);
            // console.log('Intersection distance from Mary position:', distance);
            if (distance < 2) { // Within 2 units of Mary's position
              console.log('Close to Mary! Navigating to gallery...');
              
              // Add fade out transition before navigating
              gsap.to(mountRef.current, {
                opacity: 0,
                duration: 1.5,
                ease: "power2.inOut",
                onComplete: () => {
                  router.push('/gallery');
                }
              });
              return;
            }
          }
        }
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    animate();

    // Cleanup
    return () => {
      // Kill all ScrollTriggers
      ScrollTrigger.getAll().forEach(t => t.kill());
      
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('wheel', handleScroll);
      
      // Also remove from renderer and mount if they exist
      if (renderer.domElement) {
        renderer.domElement.removeEventListener('wheel', handleScroll);
      }
      if (mountRef.current) {
        mountRef.current.removeEventListener('wheel', handleScroll);
      }
      
      // Kill GSAP timeline
      if (cinematicTimelineRef.current) {
        cinematicTimelineRef.current.kill();
      }
      
      // Clean up Mary's light
      if (maryLightRef.current && sceneRef.current) {
        sceneRef.current.remove(maryLightRef.current);
        maryLightRef.current.dispose();
      }
      
      if (intersectionRef.current) {
        observer.unobserve(intersectionRef.current);
      }
      observer.disconnect();
      if (mountRef.current) {
        if (renderer.domElement && renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(renderer.domElement);
        }
      }
      controls.dispose();
      renderer.dispose();
    };
  }, []);


  return (
    <div ref={intersectionRef} style={{ position: 'relative', width: '100%', backgroundColor: 'black' }}>
      {/* Fixed viewport for Three.js scene */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        backgroundColor: 'black'
      }}>
        
        {/* Three.js scene container */}
        <div style={{ 
          position: 'absolute', 
          width: '100%', 
          height: '100%', 
          overflow: 'hidden', 
          backgroundColor: 'black',
          opacity: isSceneLoading ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out'
        }}>
          
          <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.9);
            }
            to {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1);
            }
          }
        `}</style>
        
        <style jsx global>{`
          .scroll-text-line {
            display: inline-block;
            transition: all 0.3s ease;
          }
          .scroll-text-line:hover {
            color: #67e8f9;
            text-shadow: 0 0 30px #67e8f9;
          }
          
          @keyframes pulse {
            0%, 100% {
              opacity: 0.5;
            }
            50% {
              opacity: 0.8;
            }
          }
        `}</style>
        
        <div 
          ref={mountRef} 
          style={{ 
            width: '100%', 
            height: '100%', 
            position: 'absolute', 
            top: 0, 
            left: 0,
            pointerEvents: 'none',  // Disabled since clicking Mary is no longer needed
            zIndex: 1
          }}
        />
        
        {/* Camera mode indicator removed for production */}
        
        
        
        {/* Cinematic design mode removed for production */}
        {false && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            fontSize: '14px',
            fontFamily: 'monospace',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
            zIndex: 200,
            maxWidth: '400px'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#00ff41' }}>Cinematic Design Mode</h3>
            <div style={{ marginBottom: '10px' }}>
              <strong>Controls:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '12px' }}>
                <li>Use mouse to position camera</li>
                <li><kbd>K</kbd> - Add keyframe at current position</li>
                <li><kbd>P</kbd> - Play recorded cinematic</li>
                <li><kbd>R</kbd> - Reset all keyframes</li>
                <li><kbd>L</kbd> - Log keyframes to console</li>
                <li><kbd>V</kbd> - Toggle reverse mode</li>
                <li><kbd>Ctrl+C</kbd> - Exit design mode</li>
              </ul>
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#67e8f9' }}>
              Keyframes: {recordedKeyframes.length}
            </div>
            <button
              onClick={() => {
                if (controlsRef.current) {
                  controlsRef.current.enabled = !controlsRef.current.enabled;
                  // console.log('Toggled controls:', controlsRef.current.enabled);
                }
              }}
              style={{
                marginTop: '10px',
                padding: '5px 10px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Toggle Camera Controls
            </button>
          </div>
        )}
        
        {/* Cinematic intro UI removed */}
        {false && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 100
          }}>
            {/* Reverse mode indicator */}
            {cinematicReverse && (
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                padding: '8px 16px',
                backgroundColor: 'rgba(255, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textAlign: 'center',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 2px 8px rgba(255, 0, 0, 0.5)',
              }}>
                ⏪ REVERSE MODE
              </div>
            )}
            
            {/* Keyframe label display */}
            {currentKeyframeLabel && (
              <div style={{
                position: 'absolute',
                top: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '12px 24px',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '16px',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                textAlign: 'center',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                animation: 'fadeIn 0.5s ease-out'
              }}>
                {currentKeyframeLabel}
              </div>
            )}
            
            {/* Progress bar */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200px',
              height: '2px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '1px'
            }}>
              <div style={{
                width: `${cinematicProgress * 100}%`,
                height: '100%',
                backgroundColor: '#00ff41',
                borderRadius: '1px',
                transition: 'width 0.1s ease-out'
              }} />
            </div>
          </div>
        )}
      </div>
      
      {/* Music Player UI - shows icon then minimal player when clicked */}
      {!isSceneLoading && !showMobileMusicPlayer ? (
        // Music Icon Button wrapped in div for better event handling
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: isMobile ? '20px' : '2rem',
            zIndex: 99999,
            pointerEvents: 'auto',
            cursor: 'pointer'
          }}
          onClick={() => {
            console.log('🎵 Music icon clicked (div wrapper)');
            setUserClosedMusic(false);
            
            if (contextShowSpotify && contextIsPlaying) {
              // Music is already playing, just show the UI
              setShowMobileMusicPlayer(true);
              setMusicPlayerVisible(true);
            } else {
              // Start fresh music playback
              setShowMobileMusicPlayer(true);
              setMusicPlayerVisible(true);
              setContextShowSpotify(true);
              
              // Trigger auto-play after a delay
              setTimeout(() => {
                if (musicPlayerControls && musicPlayerControls.play) {
                  musicPlayerControls.play();
                }
              }, 500);
            }
          }}
        >
        <IconButton
          position="relative"
          zIndex={99999}
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
          _hover={{
            bg: "rgba(255, 255, 255, 0.1)",
          }}
        />
        </div>
      ) : !isSceneLoading ? (
        // Minimal Music Player with overlay to block 3D interactions
        <>
          {/* Invisible overlay to prevent 3D scene interactions */}
          <Box
            position="fixed"
            // top={isMobile ? "0" : "auto"}
            // bottom={isMobile ? "auto" : "2rem"}
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
            // top={isMobile ? "20px" : "auto"}
            // bottom={isMobile ? "auto" : "2rem"}
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
                // console.log('🎵 Skip button clicked');
                
                if (musicPlayerControls && musicPlayerControls.skipTrack) {
                  // console.log('🎵 Using music player controls to skip');
                  musicPlayerControls.skipTrack();
                } else {
                  // console.log('⚠️ No skip controls available');
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
                // console.log('🎵 Close button clicked!');
                e.stopPropagation();
                e.preventDefault();
                handleMusicPlayerClose();
              }}
              onTouchEnd={(e) => {
                // console.log('🎵 Close button touch end!');
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
      ) : null}
      
      {/* Hidden Music Player Component - No auto-start */}
      {showMobileMusicPlayer && (
        <Box display="none">
          <SimpleMusicPlayer
            isVisible={true}
            isMobile={true}
            autoPlay={true}
            onControlsReady={handleMusicControlsReady}
            onPlayingStateChange={(playing) => {
              // console.log('🎵 Music state changed:', playing);
              setIsPlaying(playing);
              setContextIsPlaying(playing);
            }}
            audioRef={audioRef}
          />
        </Box>
      )}
      
      {/* Scrolling Text Section - Right Side */}
      {!isSceneLoading && scrollCameraActive && (
        <div 
          ref={textSectionRef}
          style={{
            position: 'fixed',
            right: isMobile ? '20px' : '15%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: isMobile ? '70%' : '40%',
            maxWidth: '600px',
            pointerEvents: 'none',
            zIndex: 100,
            height: '60vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          <p 
            ref={scrollTextRef}
            style={{
              fontSize: isMobile ? '20px' : '28px',
              color: 'white',
              lineHeight: '1.6',
              fontFamily: 'monospace',
              margin: 0,
              textShadow: '0 0 20px rgba(255, 255, 255, 0.3)',
              fontWeight: '300',
            }}
          >
            {textBlocks[currentCameraStage].map((line, index) => (
              <React.Fragment key={index}>
                <span className="scroll-text-line">{line}</span>
                {index < textBlocks[currentCameraStage].length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
          
          {/* Progress indicators */}
          <div 
            className="progress-dots"
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '20px',
              justifyContent: 'center',
            }}>
            {[0, 1, 2, 3, 4].map((index) => (
              <div
                key={index}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  opacity: index === currentCameraStage ? 1 : 0.3,
                  transition: 'all 0.3s ease',
                  boxShadow: index === currentCameraStage ? '0 0 10px rgba(255, 255, 255, 0.8)' : 'none',
                }}
              />
            ))}
          </div>
          
          {/* Scroll hint - hide when button appears */}
          {!showEnterButton && (
            <div style={{
              marginTop: '30px',
              fontSize: '12px',
              color: 'white',
              opacity: 0.5,
              textAlign: 'center',
              fontFamily: 'monospace',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              scroll to continue
            </div>
          )}
          
        </div>
      )}
      
      {/* "Take me there" button - moved outside of text section */}
      {!isSceneLoading && scrollCameraActive && showEnterButton && (
        <div style={{
          position: 'fixed',
          right: isMobile ? '20px' : '15%',
          bottom: '100px',
          width: isMobile ? '70%' : '40%',
          maxWidth: '600px',
          opacity: showEnterButton ? 1 : 0,
          transition: 'opacity 2s ease-in',
          textAlign: 'center',
          zIndex: 100000,
          pointerEvents: 'auto',
          touchAction: 'auto',
        }}>
          <style jsx>{`
                @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');
                
                .cyberpunk, .cyberpunk::after {
                  padding: 10px 25px;
                  text-decoration: none;
                  font-size: 18px;
                  font-family: 'Bebas Neue', cursive;
                  background: linear-gradient(45deg, transparent 5%, #FF013C 5%);
                  border: 0;
                  color: #fff;
                  letter-spacing: 2px;
                  box-shadow: 4px 0px 0px #00E6F6;
                  outline: transparent;
                  position: relative;
                  cursor: pointer;
                  z-index: 10001;
                }

                .cyberpunk::after {
                  --slice-0: inset(50% 50% 50% 50%);
                  --slice-1: inset(80% -6px 0 0);
                  --slice-2: inset(50% -6px 30% 0);
                  --slice-3: inset(10% -6px 85% 0);
                  --slice-4: inset(40% -6px 43% 0);
                  --slice-5: inset(80% -6px 5% 0);
                  
                  content: 'Take Me There';
                  display: block;
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  background: linear-gradient(45deg, transparent 3%, #00E6F6 3%, #00E6F6 5%, #FF013C 5%);
                  text-shadow: -2px -2px 0px #F8F005, 2px 2px 0px #00E6F6;
                  clip-path: var(--slice-0);
                  pointer-events: none;
                }

                .cyberpunk:hover::after {
                  animation: 1s glitch;
                  animation-timing-function: steps(2, end);
                }

                @keyframes glitch {
                  0% {
                    clip-path: var(--slice-1);
                    transform: translate(-20px, -10px);
                  }
                  10% {
                    clip-path: var(--slice-3);
                    transform: translate(10px, 10px);
                  }
                  20% {
                    clip-path: var(--slice-1);
                    transform: translate(-10px, 10px);
                  }
                  30% {
                    clip-path: var(--slice-3);
                    transform: translate(0px, 5px);
                  }
                  40% {
                    clip-path: var(--slice-2);
                    transform: translate(-5px, 0px);
                  }
                  50% {
                    clip-path: var(--slice-3);
                    transform: translate(5px, 0px);
                  }
                  60% {
                    clip-path: var(--slice-4);
                    transform: translate(5px, 10px);
                  }
                  70% {
                    clip-path: var(--slice-2);
                    transform: translate(-10px, 10px);
                  }
                  80% {
                    clip-path: var(--slice-5);
                    transform: translate(20px, -10px);
                  }
                  90% {
                    clip-path: var(--slice-1);
                    transform: translate(-10px, 0px);
                  }
                  100% {
                    clip-path: var(--slice-1);
                    transform: translate(0);
                  }
                }
              `}</style>
          <Link href="/gallery" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
            <span className="cyberpunk">Take Me There</span>
          </Link>
        </div>
      )}
      
      {/* Scroll Camera Indicator removed for production */}
      </div>
      
      {/* Scroll spacer to enable scrolling - outside fixed viewport */}
      <div 
        id="scroll-container" 
        style={{ 
  
          height: isMobile ? '800vh' : '400vh', // Even more height on mobile to ensure reaching the end
          position: 'relative',
          pointerEvents: 'none', // Don't capture any pointer events
          zIndex: 0, // Lowest z-index

        }} 
      />
    </div>
  );
};

export default PalmsScene;