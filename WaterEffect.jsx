import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

// --- Constants ---
const WIDTH = 128;
const BOUNDS = 1.5;
const simplex = new SimplexNoise();

// --- Component ---
const WaterEffect = ({
  position = [0, 0, 0],
  rotation = [-Math.PI / 2, 0, 0],
  scale = [1, 1, 1],
  waterColor = 0x9bd2ec,
  waterDepth = 0.01,
  waterHeight = 0,
  viscosity = 0.93,
  splashSize = 0.2,
  speed = 5
}) => {
  // --- Hooks and Refs ---
  const { gl, scene, camera } = useThree();
  const waterMeshRef = useRef();
  const raycasterMeshRef = useRef();
  const gpuCompute = useRef();
  const heightmapVariable = useRef();
  const mouseCoords = useRef(new THREE.Vector2(10000, 10000));
  const raycaster = useRef(new THREE.Raycaster());
  const mousedown = useRef(false);
  const tmpHeightmap = useRef(null);
  const frame = useRef(0);
  const splashResetTimeoutRef = useRef(null); // Ref for delayed reset timeout

  // --- Effect Settings ---
  const waterSettings = useRef({
    splashSize: splashSize, splashDeep: waterDepth,
    viscosity: viscosity, speed: speed
  });

  useEffect(() => {
    waterSettings.current = { splashSize, splashDeep: waterDepth, viscosity, speed };
    if (heightmapVariable.current) {
      heightmapVariable.current.material.uniforms['mouseSize'].value = waterSettings.current.splashSize;
      heightmapVariable.current.material.uniforms['deep'].value = waterSettings.current.splashDeep;
      heightmapVariable.current.material.uniforms['viscosity'].value = waterSettings.current.viscosity;
    }
  }, [splashSize, waterDepth, viscosity, speed]);

  // --- Texture Initialization --- (Same as before)
  const fillTexture = (texture) => {
    const waterMaxHeight = 0.05; const pixels = texture.image.data;
    function noise(x, y) {
      let multR = waterMaxHeight; let mult = 0.025; let r = 0;
      for (let i = 0; i < 15; i++) { r += multR * simplex.noise(x * mult, y * mult); multR *= 0.53 + 0.025 * i; mult *= 1.25; } return r;
    }
    let p = 0;
    for (let j = 0; j < WIDTH; j++) {
      for (let i = 0; i < WIDTH; i++) {
        const x = i / WIDTH; const y = j / WIDTH; const noiseVal = noise(x * 128, y * 128);
        pixels[p + 0] = noiseVal; pixels[p + 1] = noiseVal; pixels[p + 2] = 0; pixels[p + 3] = 1; p += 4;
      }
    }
  };

  // --- GPU Computation Setup --- (Same as before)
  const initGPUComputation = () => {
    const gpuComputeInstance = new GPUComputationRenderer(WIDTH, WIDTH, gl);
    const heightmap0 = gpuComputeInstance.createTexture(); fillTexture(heightmap0);
    const hmVariable = gpuComputeInstance.addVariable('heightmap', getHeightmapFragmentShader(), heightmap0);
    heightmapVariable.current = hmVariable; gpuComputeInstance.setVariableDependencies(hmVariable, [hmVariable]);
    hmVariable.material.uniforms['mousePos'] = { value: mouseCoords.current }; hmVariable.material.uniforms['mouseSize'] = { value: waterSettings.current.splashSize };
    hmVariable.material.uniforms['viscosity'] = { value: waterSettings.current.viscosity }; hmVariable.material.uniforms['deep'] = { value: waterSettings.current.splashDeep };
    hmVariable.material.defines.BOUNDS = BOUNDS.toFixed(1);
    const error = gpuComputeInstance.init(); if (error !== null) console.error("GPU Compute Error:", error);
    return { instance: gpuComputeInstance };
  };

  // --- Shaders ---
  const getHeightmapFragmentShader = () => {
    // Shader code remains the same (logic matches original, coordinate difference handled in JS)
    return `
      #include <common>
      uniform vec2 mousePos; uniform float mouseSize; uniform float viscosity; uniform float deep;
      void main()	{
        vec2 cellSize = 1.0 / resolution.xy; vec2 uv = gl_FragCoord.xy * cellSize;
        vec4 heightmapValue = texture2D(heightmap, uv);
        vec4 north = texture2D(heightmap, uv + vec2(0.0, cellSize.y)); vec4 south = texture2D(heightmap, uv + vec2(0.0, -cellSize.y));
        vec4 east = texture2D(heightmap, uv + vec2(cellSize.x, 0.0)); vec4 west = texture2D(heightmap, uv + vec2(-cellSize.x, 0.0));
        float newHeight = ((north.x + south.x + east.x + west.x) * 0.5 - heightmapValue.y) * viscosity;
        vec2 localPos = (uv - vec2(0.5)) * BOUNDS;
        // Compare localPos with mousePos - the flip happens when setting the uniform now
        float mousePhase = clamp(length(localPos - mousePos) * PI / mouseSize, 0.0, PI);
        newHeight -= (cos(mousePhase) + 1.0) * deep;
        heightmapValue.y = heightmapValue.x; heightmapValue.x = newHeight;
        gl_FragColor = heightmapValue;
      }
    `;
  };

  const createWaterMaterial = () => {
    const material = new THREE.MeshStandardMaterial({
      color: waterColor, metalness: 0.9, roughness: 0.1, transparent: true,
      opacity: 0.85, side: THREE.DoubleSide, envMapIntensity: 1.5
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.heightmap = { value: null };
      shader.defines = shader.defines || {}; shader.defines.WIDTH = WIDTH.toFixed(1);
      shader.defines.BOUNDS = BOUNDS.toFixed(1); shader.defines.USE_UV = '';
      shader.vertexShader = shader.vertexShader.replace('#include <common>', `
        #include <common>
        uniform sampler2D heightmap; varying vec2 vUv;`);
      if (!shader.vertexShader.includes('vUv = uv;')) {
        shader.vertexShader = shader.vertexShader.replace('void main() {', `
         varying vec2 vUv; void main() { vUv = uv;`);
      }

      // --- ADJUSTMENT: Align beginnormal_vertex with original example ---
      shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
        // Calculate normals based on heightmap differences (like original example)
        vec2 cellSize = vec2(1.0 / WIDTH, 1.0 / WIDTH);
        vec3 objectNormal = vec3(
          (texture2D(heightmap, vUv + vec2(-cellSize.x, 0.0)).x - texture2D(heightmap, vUv + vec2(cellSize.x, 0.0)).x) * WIDTH / BOUNDS, // Corrected texture lookup and calculation order
          (texture2D(heightmap, vUv + vec2(0.0, -cellSize.y)).x - texture2D(heightmap, vUv + vec2(0.0, cellSize.y)).x) * WIDTH / BOUNDS, // Corrected texture lookup and calculation order
          1.0);
        objectNormal = normalize(objectNormal); // Normalize the result

        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif
        `);

      // --- begin_vertex remains the same ---
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
        float heightValue = texture2D(heightmap, vUv).x;
        vec3 transformed = vec3(position.x, position.y, heightValue); // Use local x, y, apply height to z
        #ifdef USE_ALPHAHASH
          vPosition = vec3(position);
        #endif`);

      material.userData.shader = shader;
    };
    material.updateHeight = (texture) => {
      if (material.userData.shader) material.userData.shader.uniforms.heightmap.value = texture;
    };
    return material;
  };

  // --- Component Initialization ---
  useEffect(() => {
    // Setup Meshes (Same as before)
    const geometry = new THREE.PlaneGeometry(BOUNDS, BOUNDS, WIDTH - 1, WIDTH - 1);
    const material = createWaterMaterial();
    const waterMesh = new THREE.Mesh(geometry, material);
    waterMesh.position.set(position[0], position[1] + waterHeight, position[2]); waterMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    waterMesh.scale.set(scale[0], scale[1], scale[2]); waterMesh.matrixAutoUpdate = false; waterMesh.updateMatrix();

    const raycasterGeometry = new THREE.PlaneGeometry(BOUNDS, BOUNDS, 1, 1);
    const raycasterMaterial = new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide });
    const raycastMesh = new THREE.Mesh(raycasterGeometry, raycasterMaterial);
    raycastMesh.position.copy(waterMesh.position); raycastMesh.rotation.copy(waterMesh.rotation);
    raycastMesh.scale.copy(waterMesh.scale); raycastMesh.matrixAutoUpdate = false; raycastMesh.updateMatrix();

    scene.add(waterMesh); scene.add(raycastMesh);
    waterMeshRef.current = waterMesh; raycasterMeshRef.current = raycastMesh;

    // Setup GPU Compute (Same as before)
    const gpuComputeSetup = initGPUComputation();
    gpuCompute.current = { instance: gpuComputeSetup.instance };

    // --- EVENT LISTENERS ---
    const domElement = gl.domElement;

    const handlePointerMove = (event) => {
      // Only process if mouse is down and heightmap variable exists
      if (!mousedown.current || !heightmapVariable.current) return;

      // Clear any pending reset timeout if we're still moving the mouse down
      if (splashResetTimeoutRef.current) {
          clearTimeout(splashResetTimeoutRef.current);
          splashResetTimeoutRef.current = null;
      }

      const rect = domElement.getBoundingClientRect();
      mouseCoords.current.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.current.setFromCamera(mouseCoords.current, camera);
      const intersects = raycaster.current.intersectObject(raycasterMeshRef.current);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        const localPoint = waterMeshRef.current.worldToLocal(point.clone());

        // --- ADJUSTMENT: Flip Y coordinate to match original shader expectation ---
        heightmapVariable.current.material.uniforms['mousePos'].value.set(localPoint.x, -localPoint.y);
         // console.log(`Water interaction at local: (${localPoint.x.toFixed(2)}, ${-localPoint.y.toFixed(2)})`); // Log flipped coord
      } else {
         heightmapVariable.current.material.uniforms['mousePos'].value.set(10000, 10000);
      }
    };

    const handlePointerDown = (event) => {
       if (event.button !== 0 && event.pointerType === 'mouse') return;
       mousedown.current = true;
       // Clear any pending reset timeout on new press
        if (splashResetTimeoutRef.current) {
            clearTimeout(splashResetTimeoutRef.current);
            splashResetTimeoutRef.current = null;
        }
       handlePointerMove(event); // Process location immediately
    };

    const handlePointerUp = () => {
      if (!mousedown.current) return; // Prevent extra triggers if already up
      mousedown.current = false;

      // --- ADJUSTMENT: Delay resetting the interaction point ---
      if (splashResetTimeoutRef.current) {
          clearTimeout(splashResetTimeoutRef.current); // Clear existing timeout if pointerup happens quickly
      }
      splashResetTimeoutRef.current = setTimeout(() => {
          if (heightmapVariable.current) { // Check if component still mounted / var exists
              heightmapVariable.current.material.uniforms['mousePos'].value.set(10000, 10000);
              // console.log("Water interaction reset after delay");
          }
          splashResetTimeoutRef.current = null;
      }, 100); // Reset after 100ms delay (adjust as needed)
    };

     // Touch equivalents
     const handleTouchMove = (event) => {
       if (!mousedown.current || !event.touches[0]) return;
       event.preventDefault();
       handlePointerMove({ clientX: event.touches[0].clientX, clientY: event.touches[0].clientY });
     };
     const handleTouchStart = (event) => {
       if (!event.touches[0]) return;
       mousedown.current = true;
       if (splashResetTimeoutRef.current) { clearTimeout(splashResetTimeoutRef.current); splashResetTimeoutRef.current = null; } // Clear reset on new touch
       handlePointerMove({ clientX: event.touches[0].clientX, clientY: event.touches[0].clientY });
     };
     const handleTouchEnd = () => { handlePointerUp(); }; // Use same delayed reset logic

    // Add Listeners (Same as before)
    domElement.addEventListener('pointerdown', handlePointerDown); domElement.addEventListener('pointermove', handlePointerMove);
    domElement.addEventListener('pointerup', handlePointerUp); domElement.addEventListener('pointerleave', handlePointerUp);
    domElement.addEventListener('touchstart', handleTouchStart, { passive: false }); domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    domElement.addEventListener('touchend', handleTouchEnd); domElement.addEventListener('touchcancel', handleTouchEnd);

    // Cleanup
    return () => {
      scene.remove(waterMeshRef.current); scene.remove(raycasterMeshRef.current);
      geometry.dispose(); material.dispose(); raycasterGeometry.dispose(); raycasterMaterial.dispose();
      if (splashResetTimeoutRef.current) clearTimeout(splashResetTimeoutRef.current); // Clear timeout on unmount
      // Remove Listeners
      domElement.removeEventListener('pointerdown', handlePointerDown); domElement.removeEventListener('pointermove', handlePointerMove);
      domElement.removeEventListener('pointerup', handlePointerUp); domElement.removeEventListener('pointerleave', handlePointerUp);
      domElement.removeEventListener('touchstart', handleTouchStart); domElement.removeEventListener('touchmove', handleTouchMove);
      domElement.removeEventListener('touchend', handleTouchEnd); domElement.removeEventListener('touchcancel', handleTouchEnd);
       console.log("WaterEffect cleanup complete");
    };
  }, [gl, scene, camera, position, rotation, scale, waterHeight, waterColor]); // Keep dependencies

  // --- Frame Update --- (Same as before)
  useFrame(() => {
    if (!gpuCompute.current || !waterMeshRef.current || !heightmapVariable.current) return;
    frame.current++;
    if (frame.current >= (7 - waterSettings.current.speed)) {
      gpuCompute.current.instance.compute();
      tmpHeightmap.current = gpuCompute.current.instance.getCurrentRenderTarget(heightmapVariable.current).texture;
      if (waterMeshRef.current.material.updateHeight) {
        waterMeshRef.current.material.updateHeight(tmpHeightmap.current);
      }
      frame.current = 0;
    }
  });

  return null;
};

export default WaterEffect;