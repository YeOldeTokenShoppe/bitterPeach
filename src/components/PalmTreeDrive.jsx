import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import GUI from 'lil-gui';

const PalmsScene = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const materialShadersRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  
  // Add refs for lights
  const carSpotlightRef = useRef(null);
  const rimLightRef = useRef(null);
  const underglowLightRef = useRef(null);
  const headlightLeftRef = useRef(null);
  const headlightRightRef = useRef(null);
  
  // Add ref for new light
  const carAccentLightRef = useRef(null);
  
  // Add state for GUI
  const [showGUI, setShowGUI] = useState(false);
  const guiRef = useRef(null);
  
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
    const speed = 10;
    
    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(60, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 1.1, 7);
    camera.lookAt(scene.position);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    scene.background = new THREE.Color(0xffaa44);
    scene.fog = new THREE.Fog(scene.background, 42.5, 50);
    
    // Add a light to help see the scene better during debugging
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // OrbitControls setup (manual implementation since we can't import from examples)
    const controls = {
      enabled: true,
      target: new THREE.Vector3(0, 1.8, 0),
      minDistance: 5,
      maxDistance: 7,
      maxPolarAngle: Math.PI * 0.55,
      minPolarAngle: Math.PI * 0.25,
      spherical: new THREE.Spherical(),
      sphericalDelta: new THREE.Spherical(),
      scale: 1,
      panOffset: new THREE.Vector3(),
      rotateSpeed: 1.0,
      zoomSpeed: 1.2,
      mouseButtons: { LEFT: 0, MIDDLE: 1, RIGHT: 2 },
      touches: { ONE: 0, TWO: 1 }
    };

    // Simple orbit controls implementation
    let rotateStart = new THREE.Vector2();
    let rotateEnd = new THREE.Vector2();
    let rotateDelta = new THREE.Vector2();
    let isMouseDown = false;

    const handleMouseDown = (event) => {
      isMouseDown = true;
      rotateStart.set(event.clientX, event.clientY);
    };

    const handleMouseMove = (event) => {
      if (!isMouseDown) return;
      
      rotateEnd.set(event.clientX, event.clientY);
      rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(controls.rotateSpeed);
      
      const element = renderer.domElement;
      controls.sphericalDelta.theta -= 2 * Math.PI * rotateDelta.x / element.clientHeight;
      controls.sphericalDelta.phi -= 2 * Math.PI * rotateDelta.y / element.clientHeight;
      
      rotateStart.copy(rotateEnd);
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    const handleWheel = (event) => {
      if (event.deltaY < 0) {
        controls.scale /= Math.pow(0.95, controls.zoomSpeed);
      } else if (event.deltaY > 0) {
        controls.scale *= Math.pow(0.95, controls.zoomSpeed);
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel);

    // Update controls
    const updateControls = () => {
      const offset = new THREE.Vector3();
      const quat = new THREE.Quaternion().setFromUnitVectors(camera.up, new THREE.Vector3(0, 1, 0));
      const quatInverse = quat.clone().invert();
      
      offset.copy(camera.position).sub(controls.target);
      offset.applyQuaternion(quat);
      
      controls.spherical.setFromVector3(offset);
      controls.spherical.theta += controls.sphericalDelta.theta;
      controls.spherical.phi += controls.sphericalDelta.phi;
      controls.spherical.phi = Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, controls.spherical.phi));
      controls.spherical.makeSafe();
      controls.spherical.radius *= controls.scale;
      controls.spherical.radius = Math.max(controls.minDistance, Math.min(controls.maxDistance, controls.spherical.radius));
      
      controls.target.add(controls.panOffset);
      offset.setFromSpherical(controls.spherical);
      offset.applyQuaternion(quatInverse);
      camera.position.copy(controls.target).add(offset);
      camera.lookAt(controls.target);
      
      controls.sphericalDelta.set(0, 0, 0);
      controls.panOffset.set(0, 0, 0);
      controls.scale = 1;
    };

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
        
        void main() {
          float l = line(vPos, 1.0, vec3(2.0));
          vec3 base = mix(vec3(0.0, 0.75, 1.0), vec3(0.0), smoothstep(5., 7.5, abs(vPos.x)));
          vec3 baseColor = vec3(1.0, 0.0, 0.933); // #ff00ee
          vec3 c = mix(baseColor, base, l);
          
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

    // Palms
    const palmGeoms = [];
    // Log
    const logGeom = new THREE.CylinderGeometry(0.25, 0.125, 10, 5, 4, true);
    logGeom.translate(0, 5, 0);
    palmGeoms.push(logGeom);
    
    // Leaves
    for (let i = 0; i < 20; i++) {
      const leafGeom = new THREE.CircleGeometry(1.25, 4);
      leafGeom.translate(0, 1.25, 0);
      leafGeom.rotateX(-Math.PI * 0.5);
      leafGeom.scale(0.25, 1, Math.random() * 0.5 + 1);
      leafGeom.attributes.position.setY(0, 0.25);
      leafGeom.rotateX((Math.random() - 0.5) * Math.PI * 0.5);
      leafGeom.rotateY(Math.random() * Math.PI * 2);
      leafGeom.translate(0, 10, 0);
      palmGeoms.push(leafGeom);
    }
    
    // Merge geometries manually
    let positions = [];
    let uvs = [];
    let indices = [];
    let indexOffset = 0;
    
    palmGeoms.forEach(geom => {
      const pos = geom.attributes.position.array;
      const uv = geom.attributes.uv ? geom.attributes.uv.array : new Float32Array(pos.length / 3 * 2);
      const ind = geom.index ? geom.index.array : null;
      
      positions.push(...pos);
      uvs.push(...uv);
      
      if (ind) {
        for (let i = 0; i < ind.length; i++) {
          indices.push(ind[i] + indexOffset);
        }
      }
      indexOffset += pos.length / 3;
    });
    
    const palmGeom = new THREE.BufferGeometry();
    palmGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    palmGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    if (indices.length > 0) {
      palmGeom.setIndex(indices);
    }
    palmGeom.rotateZ(-1.5 * Math.PI / 180);
    
    // Instancing
    const instPalm = new THREE.InstancedBufferGeometry();
    instPalm.attributes.position = palmGeom.attributes.position;
    instPalm.attributes.uv = palmGeom.attributes.uv;
    instPalm.index = palmGeom.index;
    
    const palmPos = [];
    for (let i = 0; i < 5; i++) {
      palmPos.push(-5, 0, i * 20 - 10 - 50);
      palmPos.push(5, 0, i * 20 - 50);
    }
    instPalm.setAttribute(
      "instPosition",
      new THREE.InstancedBufferAttribute(new Float32Array(palmPos), 3)
    );

    const palmMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, side: THREE.DoubleSide });
    palmMat.onBeforeCompile = shader => {
      shader.uniforms.time = { value: 0 };
      shader.vertexShader = `
        uniform float time;
        attribute vec3 instPosition;
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
          
          transformed.x *= sign(instPosition.x);
          vec3 ip = instPosition;
          ip.z = mod(50. + ip.z + time * ${speed}., 100.) - 50.;
          transformed *= 0.4 + smoothstep(50., 45., abs(ip.z)) * 0.6;
          transformed += ip;
        `
      );
      materialShaders.push(shader);
    };
    
    const palms = new THREE.Mesh(instPalm, palmMat);
    scene.add(palms);

    // Sun
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
    
    // Set up DRACO loader for compressed models
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/'); // Path to draco decoder files
    
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    
    loader.load('/lamboOnly.glb', (gltf) => {
      const car = gltf.scene;
      
      // Position the car
      car.position.set(0, 0.4, 6.6);
      car.rotation.y = Math.PI;
      car.scale.set(1.5, 1.5, 1.5);
      
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
      car.traverse((child) => {
        if (child.isMesh) {
          console.log('Found mesh:', child.name); // Debug log
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Add gold emissive to halo objects
          if (child.name.toLowerCase().includes('halo')) {
            child.material = child.material.clone();
            child.material.emissive = new THREE.Color(0xffd700); // Gold color
            child.material.emissiveIntensity = 5;
            child.material.needsUpdate = true;
          }
          
          // Add video texture to Display mesh
          if (child.name === 'Display') { // Exact match
            console.log('Found Display mesh, applying video texture'); // Debug log
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
        console.warn('Video autoplay failed:', error);
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
      carSpotlight.target = car;
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
      carAccentLight.target = car;
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
      car.add(underglowLight);
      
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
      car.add(headlightLeft);
      car.add(headlightLeft.target);
      
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
      car.add(headlightRight);
      car.add(headlightRight.target);
      
      scene.add(car);
      
      // Initialize GUI
      if (!guiRef.current) {
        guiRef.current = new GUI();
        
        // Car Spotlight Controls
        const carSpotlightFolder = guiRef.current.addFolder('Car Spotlight');
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
        
        // Add keyboard shortcut to toggle GUI
        window.addEventListener('keydown', (e) => {
          if (e.key.toLowerCase() === 'g') {
            setShowGUI(prev => !prev);
            if (guiRef.current) {
              guiRef.current.domElement.style.display = showGUI ? 'none' : 'block';
            }
          }
        });

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

          console.log('Current Light Settings:', JSON.stringify(settings, null, 2));
          
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
      console.log('Loading car:', (progress.loaded / progress.total * 100) + '%');
    },
    // Error callback
    (error) => {
      console.error('Error loading car model:', error);
    });
    

    materialShadersRef.current = materialShaders;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
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
        }
      });
      
      updateControls();
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
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'black' }}>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css?family=Pacifico&display=swap');
        
        .info-icon {
          opacity: 0.5;
        }
        
        .retro-text {
          font-family: "UnifrakturMaguntia", cursive;
          font-size: 13vh;
          display: block;
          transform: rotate(-20deg) skew(-25deg);
          color: magenta;
          text-shadow: -0.5vh 0 rgb(64, 255, 128), 0 0.5vh rgb(64, 255, 128), 0.5vh 0 rgb(64, 255, 128), 0 -0.5vh rgb(64, 255, 128);
          position: absolute;
          bottom: 4vh;
          left: 50%;
          margin: 0;
          padding: 0;
        }
        
        #circle {
          position: absolute;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(255, 165, 0, .5);
          border: 1px solid darkorange;
          cursor: pointer;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 165, 0, 1);
          font-size: 3em;
          font-family: serif;
          transition: background 0.3s, color 0.3s;
        }
        
        .noselect {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          -khtml-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
      
      <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} />
      
      {/* Info panel */}
      <div 
        className={`absolute top-[5px] left-[5px] transition-all duration-300 ${
          isInfoExpanded ? 'w-[640px] h-[214px]' : 'w-[62px] h-[62px]'
        } overflow-hidden`}
      >
        <div 
          id="circle"
          onClick={() => setIsInfoExpanded(!isInfoExpanded)}
          className="noselect"
        >
          <img 
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAI5SURBVFhH7ZjNSxVRGIcnwyQDsUzByjQqM1MiKlKMhCCrRUXriDT7XNfCpRuhNlGLWtS29pmr6g9o0SIIWki06w/p+Z13zuV0G+fY3JG5qA88zHuGO5d3zsd7zr3JJhuRg/gZP+GgblTNEk7jDC7qRpU8xK/YivvxO1bGVfyGz3EbVprQGVzGfXgSt2AsoXs4ZGG5HMKfOOpaSXIDVzNk+swRvO5aJdGNP/C8axl5CbXjAQsdbbgXT7tWg+jLv6ASCMkbsn68hHrW04EXLSzOVtSSnnOtv5nH2KR+ml49SvSRhXHUrW9Qk/ZX6m98hVnojUWYkIa0x8Ia91FD7jmGSizKHXyLu3Fn6i5swSyeYX0PjeAEjruWoe/TXPMMo56JomFRwQu5iacs/IesHhJdqIT2uJaxgGFSL9JrLlkJqavDiRmSN4dOoJa6ZzsOWOjQy6zU8zWyErqM6uIsYoXxZXoVfXjFQsctVF3LJSuh4xh2fUisMJ7DHRa61TploUMvGfZYJmud0AULHUooutLKHrKwXGjIrlno0JHlsIUrU+akVrJHLXRoUoc90omFJnXRZT+Gva5lPEEl79HRJYoK4ztspDBqzp3FsDAqQQ2tR8VzVZVaW8drbGTrmMT6reMBhvc0lHqmEI1urhqqEC31xxYWp+jxQyu0/vihI0kp/O8BTfUnnCelHtA8TXWE9RQ55N/FNTnke5rqZ5BHBbRpfih6PuBtnMX3ulE1+rPhY2p0o9xknZEkfwANi2KKMn3pRwAAAABJRU5ErkJggg=="
            className="info-icon"
            alt="info"
          />
        </div>
        
        {isInfoExpanded && (
          <>
            <div className="absolute left-[64px] font-bold italic text-orange-600" style={{ fontFamily: 'Arial', fontSize: '52px' }}>
              Palms <a className="text-[10px] text-orange-600 hover:text-orange-600" href="http://west77.ru" target="_blank" rel="noopener noreferrer">from the warlock&apos;s cave</a>
            </div>
            
            <iframe 
              width="100%" 
              height="150" 
              style={{ scrolling: 'no', border: 'none' }}
              src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/296520859&amp;color=%23FFA500&amp;auto_play=false&amp;hide_related=true&amp;show_comments=false&amp;show_user=true&amp;show_reposts=false&amp;show_teaser=false&amp;visual=true"
              className="absolute top-[64px]"
            />
          </>
        )}
      </div>
      
      {/* Retro text */}
      <div style={{ position: 'absolute', bottom: '4vh', left: '65%' }}>
        <span className="retro-text">RL80</span>
      </div>
    </div>
  );
};

export default PalmsScene;