// WaterEffect.jsx - A component to add water to your inset pedestal
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
import { useGLTF } from '@react-three/drei';

// Water size - EXACTLY like the original code
const WIDTH = 128;
const BOUNDS = 6.0; // This is the exact value from the original code
const BOUNDS_HALF = BOUNDS * 0.5;

// Settings for water reactivity - EXACTLY like original
const DEFAULT_WATER_SETTINGS = {
  mouseSize: 0.1,
  mouseDeep: 0.01,
  viscosity: 0.95,
  speed: 5
};

// Custom WaterMaterial that is identical to the original
class WaterMaterial extends THREE.MeshStandardMaterial {
  constructor(parameters) {
    super();

    this.defines = {
      'STANDARD': '',
      'USE_UV': '',
      'WIDTH': parseFloat(WIDTH).toFixed(1),
      'BOUNDS': parseFloat(BOUNDS).toFixed(1),
    };

    this.extra = {};
    this.addParameter('heightmap', null);
    this.setValues(parameters);
  }

  addParameter(name, value) {
    this.extra[name] = value;
    Object.defineProperty(this, name, {
      get: () => (this.extra[name]),
      set: (v) => {
        this.extra[name] = v;
        if (this.userData.shader) this.userData.shader.uniforms[name].value = this.extra[name];
      }
    });
  }

  onBeforeCompile(shader) {
    for (const name in this.extra) {
      shader.uniforms[name] = { value: this.extra[name] };
    }

    // Common replacement - IDENTICAL to original
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      /* glsl */`
      #include <common>
      uniform sampler2D heightmap;
      `
    );

    // Beginning normal vertex replacement - IDENTICAL to original
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      /* glsl */`
      vec2 cellSize = vec2(1.0 / WIDTH, 1.0 / WIDTH);
      vec3 objectNormal = vec3(
      (texture2D(heightmap, uv + vec2(-cellSize.x, 0)).x - texture2D(heightmap, uv + vec2(cellSize.x, 0)).x) * WIDTH / BOUNDS,
      (texture2D(heightmap, uv + vec2(0, -cellSize.y)).x - texture2D(heightmap, uv + vec2(0, cellSize.y)).x) * WIDTH / BOUNDS,
      1.0);
      #ifdef USE_TANGENT
        vec3 objectTangent = vec3(tangent.xyz);
      #endif
      `
    );

    // Begin vertex replacement - IDENTICAL to original
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      /* glsl */`
      float heightValue = texture2D(heightmap, uv).x;
      vec3 transformed = vec3(position.x, position.y, heightValue);
      #ifdef USE_ALPHAHASH
        vPosition = vec3(position);
      #endif
      `
    );

    this.userData.shader = shader;
  }
}

// Coin class for the coins thrown into the water
class Coin {
  constructor(position, scene, waterLevel) {
    // Create a larger coin geometry
    const geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.04, 24, 1, false); // Increased size
    // Gold material for the coin
    const material = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      metalness: 0.9,
      roughness: 0.3,
      emissive: 0xFFD700,
      emissiveIntensity: 0.2
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    
    // Position correction - make sure the coin appears above the water
    this.mesh.position.set(
      position.x,
      Math.max(waterLevel + 0.7, position.y), // Ensure it's more visible above water
      position.z
    );
    
    console.log('Coin created at position:', this.mesh.position);
    
    // Random rotation for the coin
    this.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    // Simple physics properties
    this.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      -0.02 - Math.random() * 0.03,
      (Math.random() - 0.5) * 0.02
    );
    this.rotationSpeed = new THREE.Vector3(
      Math.random() * 0.05 - 0.025,
      Math.random() * 0.05 - 0.025,
      Math.random() * 0.05 - 0.025
    );
    this.gravity = 0.001;
    this.waterLevel = waterLevel;
    this.inWater = false;
    this.waterDrag = 0.95;
    this.airDrag = 0.98;
    this.sinkingSpeed = 0.0003;
    this.scene = scene;
    
    // Flag to track splash creation
    this.splashCreated = false;
    
    scene.add(this.mesh);
  }

  update() {
    const prevInWater = this.inWater;
    
    // Check if the coin just entered the water
    if (this.mesh.position.y <= this.waterLevel && !this.inWater) {
      // Create a splash effect when entering water
      this.inWater = true;
      this.velocity.y *= 0.3; // Slow down when hitting water
      console.log('Coin splashed into water at position:', this.mesh.position);
      
      // Flag splash as created
      this.splashCreated = true;
      return true; // Signal that we hit the water
    }
    
    // Apply gravity in air, sinking in water
    if (!this.inWater) {
      this.velocity.y -= this.gravity;
      this.velocity.multiplyScalar(this.airDrag);
    } else {
      this.velocity.y -= this.sinkingSpeed;
      this.velocity.multiplyScalar(this.waterDrag);
    }
    
    // Update position
    this.mesh.position.add(this.velocity);
    
    // Update rotation (spinning)
    this.mesh.rotation.x += this.rotationSpeed.x;
    this.mesh.rotation.y += this.rotationSpeed.y;
    this.mesh.rotation.z += this.rotationSpeed.z;
    
    // Check if coin has sunk to the bottom
    if (this.mesh.position.y < this.waterLevel - 0.2) {
      this.rotationSpeed.multiplyScalar(0.98); // Slow down rotation as it settles
      if (this.velocity.length() < 0.0005) {
        this.velocity.set(0, 0, 0); // Stop moving once settled
      }
    }
    
    // Return whether we created a splash this frame
    return this.splashCreated && this.inWater;
  }

  remove() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) this.mesh.material.dispose();
    }
  }
}

const WaterEffect = ({
  position = [0, 0, 0],
  rotation = [-Math.PI / 2, 0, 0],
  scale = [1, 1, 1],
  pedestalInsetRadius = 1.5, // Change this to match your pedestal's inset
  waterColor = 0x9bd2ec,
  waterDepth = 0.05,
  waterHeight = 0,
  onCoinThrow = null // Callback when a coin is thrown
}) => {
  const { gl, scene, camera } = useThree();
  const waterMeshRef = useRef();
  const meshRef = useRef();
  const gpuCompute = useRef();
  const mouseCoords = useRef(new THREE.Vector2());
  const raycaster = useRef(new THREE.Raycaster());
  const tmpHeightmap = useRef(null);
  const mousedown = useRef(false);
  const coins = useRef([]);
  const frame = useRef(0);
  const [coinMode, setCoinMode] = useState(false);
  const coinThrowPoint = useRef(new THREE.Vector3());
  const waterWidth = pedestalInsetRadius * 2;
  const resolution = WIDTH; // Define resolution variable
  
  // Settings for the water effect
  const waterSettings = useRef({
    mouseSize: 0.3,
    mouseDeep: 0.02,
    viscosity: 0.95,
    speed: 5
  });

  // Replace simpleNoise with a function similar to SimplexNoise
  function createSimplexNoise() {
    // Simple 2D noise based on sine functions - not as good as true SimplexNoise
    // but sufficient for our water height initialization
    return {
      noise: (x, y) => {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        
        // Use multiple sine waves at different frequencies for more natural look
        const n1 = Math.sin(x * 2.5 + y * 1.5) * 0.5;
        const n2 = Math.sin(x * 5.0 + y * 3.0) * 0.25;
        const n3 = Math.sin(x * 10.0 + y * 7.0) * 0.125;
        
        return (n1 + n2 + n3) * 0.5;
      }
    };
  }

  // Helper function to fill the texture with initial noise
  const fillTexture = (texture) => {
    const waterMaxHeight = 0.1;
    const simplex = createSimplexNoise();
    const pixels = texture.image.data;

    function noise(x, y) {
      let multR = waterMaxHeight;
      let mult = 0.025;
      let r = 0;
      for (let i = 0; i < 15; i++) {
        r += multR * simplex.noise(x * mult, y * mult);
        multR *= 0.53 + 0.025 * i;
        mult *= 1.25;
      }
      return r;
    }

    let p = 0;
    for (let j = 0; j < WIDTH; j++) {
      for (let i = 0; i < WIDTH; i++) {
        const x = i * 128 / WIDTH;
        const y = j * 128 / WIDTH;

        pixels[p + 0] = noise(x, y);
        pixels[p + 1] = pixels[p + 0];
        pixels[p + 2] = 0;
        pixels[p + 3] = 1;

        p += 4;
      }
    }
    
    console.log("Water texture initialized with height variation");
  };

  // Function to throw a coin into the water
  const throwCoin = (point) => {
    // Log the hit point for debugging
    console.log('Throw coin at point:', point);
    
    // Get the actual water level in world space
    const actualWaterLevel = position[1] + waterHeight;
    console.log('Water level:', actualWaterLevel);
    
    // Create a starting position significantly above where the user clicked
    const startPosition = new THREE.Vector3(
      point.x,
      // Make sure it starts well above the water level
      actualWaterLevel + 1.0, 
      point.z
    );
    
    console.log('Coin start position:', startPosition);
    
    // Create a new coin
    const coin = new Coin(startPosition, scene, actualWaterLevel);
    
    // Add to the list of coins
    coins.current.push(coin);
    
    // Create an initial small ripple just for visual feedback
    if (gpuCompute.current && gpuCompute.current.variable) {
      const uniforms = gpuCompute.current.variable.material.uniforms;
      let oldDeep = DEFAULT_WATER_SETTINGS.mouseDeep;
      if (uniforms && uniforms['deep'] && uniforms['deep'].value !== undefined) {
        oldDeep = uniforms['deep'].value;
      }
      
      // Set lighter ripple at the coin drop location
      if (uniforms && uniforms['mousePos'] && uniforms['mousePos'].value) {
        uniforms['mousePos'].value.set(point.x, point.z);
      }
      if (uniforms && uniforms['deep'] && uniforms['deep'].value !== undefined) {
        uniforms['deep'].value = DEFAULT_WATER_SETTINGS.mouseDeep * 20;
      }
      
      // Reset shortly after
      setTimeout(() => {
        if (uniforms) {
          uniforms['mousePos'].value.set(10000, 10000);
          uniforms['deep'].value = oldDeep;
        }
      }, 100);
    }
    
    // Limit the number of coins to prevent performance issues
    if (coins.current.length > 20) {
      const oldestCoin = coins.current.shift();
      oldestCoin.remove();
    }
    
    // Call the onCoinThrow callback if it exists
    if (onCoinThrow) {
      onCoinThrow();
    }
  };

  // Function to update mouse coordinates
  const updateMouseCoords = useCallback((e) => {
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouseCoords.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouseCoords.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);
  
  // Add mouse movement listener
  useEffect(() => {
    window.addEventListener('mousemove', updateMouseCoords);
    return () => {
      window.removeEventListener('mousemove', updateMouseCoords);
    };
  }, [updateMouseCoords]);

  // Add direct override for Coin.prototype.update to ensure proper splash handling
  useEffect(() => {
    // Override the Coin class's update method to ensure proper splash creation
    Coin.prototype.update = function() {
      // Check if the coin is in water
      if (this.mesh.position.y <= this.waterLevel && !this.inWater) {
        // Create a splash effect when entering water
        this.inWater = true;
        this.velocity.y *= 0.3; // Slow down when hitting water
        console.log('Coin splashed into water at position:', this.mesh.position);
        
        // This is the key part - directly manipulate the mousePos uniform just like the original
        if (gpuCompute.current && gpuCompute.current.variable) {
          const uniforms = gpuCompute.current.variable.material.uniforms;
          
          // Get the world position of the coin
          const worldPos = this.mesh.position.clone();
          
          // CRITICAL: In the original, mousePos is set directly to world.x and world.z
          // The shader handles the conversion to UV space with: (uv - vec2(0.5)) * BOUNDS - vec2(mousePos.x, -mousePos.y)
          const splashX = worldPos.x;
          const splashZ = worldPos.z;
          
          console.log('Water splash at world coords:', splashX, splashZ);
          
          // Read water level at this position (optional)
          const waterInfo = readWaterLevel(splashX, splashZ);
          if (waterInfo) {
            console.log("Read water level at splash point");
          }
          
          // Store current values to restore later
          this.originalDeep = uniforms['deep'].value;
          
          // Set values for intense splash - DIRECTLY using world coordinates
          // This is exactly how the original code does it in the raycast function
          uniforms['mousePos'].value.set(splashX, splashZ);
          
          // Increase depth effect for stronger ripple - much higher than before
          uniforms['deep'].value = DEFAULT_WATER_SETTINGS.mouseDeep * 120; // Extremely strong for visibility
          
          console.log('Setting shader mousePos to:', splashX, splashZ, 'with deep value:', uniforms['deep'].value);
          
          // Flag that we've initiated a splash
          this.splashCreated = true;
          
          // Reset after a delay (like the original does after mouse up)
          setTimeout(() => {
            if (uniforms && uniforms['mousePos']) {
              uniforms['mousePos'].value.set(10000, 10000); // Move far away to stop effect
              uniforms['deep'].value = DEFAULT_WATER_SETTINGS.mouseDeep;
            }
          }, 200); // Shorter time for more responsiveness
        }
        
        return true;
      }
      
      // Apply gravity in air, sinking in water
      if (!this.inWater) {
        this.velocity.y -= this.gravity;
        this.velocity.multiplyScalar(this.airDrag);
      } else {
        this.velocity.y -= this.sinkingSpeed;
        this.velocity.multiplyScalar(this.waterDrag);
        
        // Reset the splash created flag
        this.splashCreated = false;
      }
      
      // Update position
      this.mesh.position.add(this.velocity);
      
      // Update rotation (spinning)
      this.mesh.rotation.x += this.rotationSpeed.x;
      this.mesh.rotation.y += this.rotationSpeed.y;
      this.mesh.rotation.z += this.rotationSpeed.z;
      
      // Check if coin has sunk to the bottom
      if (this.mesh.position.y < this.waterLevel - 0.2) {
        this.rotationSpeed.multiplyScalar(0.98); // Slow down rotation as it settles
        if (this.velocity.length() < 0.0005) {
          this.velocity.set(0, 0, 0); // Stop moving once settled
        }
      }
      
      // Return whether we created a splash this frame
      return this.splashCreated && this.inWater;
    };
  }, []);
  
  // Completely rewrite the createSplash function to directly manipulate the mousePos uniform like the original
  const createSplash = useCallback((position = null, intensity = 0.5) => {
    if (!gpuCompute.current || !gpuCompute.current.variable || !meshRef.current) {
      console.warn("GPU compute not initialized yet");
      return;
    }

    console.log("Creating splash with intensity:", intensity);
    
    // Use the provided position or raycaster with mouse coords
    let worldPosition;
    
    if (position) {
      // Use the provided position
      worldPosition = position.clone(); // Clone to avoid modifying the original
      console.log("Using provided position for splash:", worldPosition);
    } else {
      console.log("No position provided for splash");
      return;
    }
    
    // Get reference to the uniforms
    const uniforms = gpuCompute.current.variable.material.uniforms;
    
    // EXACTLY like the original: Set the mousePos directly to world coordinates
    // The shader handles the conversion: (uv - vec2(0.5)) * BOUNDS - vec2(mousePos.x, -mousePos.y)
    uniforms['mousePos'].value.set(worldPosition.x, worldPosition.z);
    uniforms['deep'].value = DEFAULT_WATER_SETTINGS.mouseDeep * intensity * 50; // Very strong effect
    
    console.log("Direct splash at world coords:", worldPosition.x, worldPosition.z, "with deep:", uniforms['deep'].value);
    
    // Let the normal frame update handle computing - no need to force compute here
    // This is how the original example works - it just sets mousePos and waits for the next compute
    
    // Reset after a short time - exactly like the original does after mouse up
    setTimeout(() => {
      if (uniforms && uniforms['mousePos']) {
        uniforms['mousePos'].value.set(10000, 10000); // Original technique to reset
        uniforms['deep'].value = DEFAULT_WATER_SETTINGS.mouseDeep;
      }
    }, 100);
  }, []);

  // Define the heightmap fragment shader (EXACTLY like the original)
  const getHeightmapFragmentShader = () => {
    // Copy directly from the original html
    return /* glsl */`
      #include <common>

      uniform vec2 mousePos;
      uniform float mouseSize;
      uniform float viscosity;
      uniform float deep;

      void main() {
        vec2 cellSize = 1.0 / resolution.xy;
        vec2 uv = gl_FragCoord.xy * cellSize;
        
        // heightmapValue.x == height from previous frame
        // heightmapValue.y == height from penultimate frame
        // heightmapValue.z, heightmapValue.w not used
        vec4 heightmapValue = texture2D(heightmap, uv);

        // Get neighbours
        vec4 north = texture2D(heightmap, uv + vec2(0.0, cellSize.y));
        vec4 south = texture2D(heightmap, uv + vec2(0.0, -cellSize.y));
        vec4 east = texture2D(heightmap, uv + vec2(cellSize.x, 0.0));
        vec4 west = texture2D(heightmap, uv + vec2(-cellSize.x, 0.0));

        // Using the exact formula from the original
        float newHeight = ((north.x + south.x + east.x + west.x) * 0.5 - heightmapValue.y) * viscosity;

        // Mouse influence - PRECISELY like original
        float mousePhase = clamp(length((uv - vec2(0.5)) * BOUNDS - vec2(mousePos.x, -mousePos.y)) * PI / mouseSize, 0.0, PI);
        newHeight -= (cos(mousePhase) + 1.0) * deep;

        heightmapValue.y = heightmapValue.x;
        heightmapValue.x = newHeight;

        gl_FragColor = heightmapValue;
      }
    `;
  };

  // Initialize the GPU computation - EXACTLY like original
  const initGPUComputation = () => {
    try {
      console.log("Initializing GPU computation...");
      
      // Create GPU computation renderer
      const gpuComputeInstance = new GPUComputationRenderer(WIDTH, WIDTH, gl);
      
      if (!gpuComputeInstance.createTexture) {
        console.warn('WaterEffect: Float textures not supported. Water effect will be static.');
        return null;
      }
      
      // Create initial heightmap texture
      const heightmap0 = gpuComputeInstance.createTexture();
      fillTexture(heightmap0);

      // Add variable with the heightmap fragment shader
      const heightmapVariable = gpuComputeInstance.addVariable(
        'heightmap',
        getHeightmapFragmentShader(),
        heightmap0
      );

      // Set variable dependencies
      gpuComputeInstance.setVariableDependencies(heightmapVariable, [heightmapVariable]);
      
      // Set uniforms EXACTLY like the original
      heightmapVariable.material.uniforms['mousePos'] = { value: new THREE.Vector2(10000, 10000) };
      heightmapVariable.material.uniforms['mouseSize'] = { value: DEFAULT_WATER_SETTINGS.mouseSize };
      heightmapVariable.material.uniforms['viscosity'] = { value: DEFAULT_WATER_SETTINGS.viscosity };
      heightmapVariable.material.uniforms['deep'] = { value: DEFAULT_WATER_SETTINGS.mouseDeep };
      heightmapVariable.material.defines.BOUNDS = BOUNDS.toFixed(1);
      
      console.log("Setting up water simulation with params:", {
        mouseSize: DEFAULT_WATER_SETTINGS.mouseSize,
        viscosity: DEFAULT_WATER_SETTINGS.viscosity,
        deep: DEFAULT_WATER_SETTINGS.mouseDeep,
        bounds: BOUNDS
      });

      // Initialize the computation
      const error = gpuComputeInstance.init();
      if (error !== null) {
        console.error('WaterEffect: GPUComputationRenderer init error:', error);
        return null;
      }
      
      // Create the read water level shader - EXACTLY like original
      const readWaterLevelShader = gpuComputeInstance.createShaderMaterial(
        getReadWaterLevelShader(),
        {
          point1: { value: new THREE.Vector2() },
          levelTexture: { value: null }
        }
      );
      
      readWaterLevelShader.defines.WIDTH = parseFloat(WIDTH).toFixed(1);
      readWaterLevelShader.defines.BOUNDS = parseFloat(BOUNDS).toFixed(1);
      
      // Create a 4x1 pixel image and render target to read water level and orientation
      const readWaterLevelImage = new Uint8Array(4 * 1 * 4);
      const readWaterLevelRenderTarget = new THREE.WebGLRenderTarget(4, 1, {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: false
      });
      
      console.log("GPU computation initialized successfully with resolution:", WIDTH, "x", WIDTH);
      console.log("Water bounds:", BOUNDS);
      
      return {
        instance: gpuComputeInstance,
        variable: heightmapVariable,
        readWaterLevelShader: readWaterLevelShader,
        readWaterLevelImage: readWaterLevelImage,
        readWaterLevelRenderTarget: readWaterLevelRenderTarget
      };
    } catch (e) {
      console.error('WaterEffect: Error initializing GPU computation:', e);
      return null;
    }
  };
  
  // Function to read water level at a specific point - EXACTLY like in the original
  const readWaterLevel = (x, z) => {
    if (!gpuCompute.current || !gpuCompute.current.readWaterLevelShader || !gpuCompute.current.readWaterLevelRenderTarget) {
      return null;
    }
    
    try {
      // Convert world positions to uv coordinates (0 to 1)
      // This matches the formula in the shader: (uv - vec2(0.5)) * BOUNDS - vec2(mousePos.x, -mousePos.y)
      // Solving for uv: uv = vec2(0.5) + (vec2(x, -z) / BOUNDS)
      const point = new THREE.Vector2(
        0.5 + (x / BOUNDS),
        0.5 + (-z / BOUNDS)
      );
      
      // Set the point to sample
      gpuCompute.current.readWaterLevelShader.uniforms['point1'].value.copy(point);
      
      // Set the texture to sample from (current heightmap)
      gpuCompute.current.readWaterLevelShader.uniforms['levelTexture'].value = gpuCompute.current.instance.getCurrentRenderTarget(
        gpuCompute.current.variable
      ).texture;
      
      // Render to the small target
      gpuCompute.current.instance.doRenderTarget(
        gpuCompute.current.readWaterLevelShader,
        gpuCompute.current.readWaterLevelRenderTarget
      );
      
      // Read pixels
      gl.readRenderTargetPixels(
        gpuCompute.current.readWaterLevelRenderTarget,
        0, 0, 4, 1,
        gpuCompute.current.readWaterLevelImage
      );
      
      // Skip float decoding for simplicity, just return the raw value
      // In a full implementation you would decode the float value here
      return {
        position: new THREE.Vector3(x, 0, z),
        read: true
      };
    } catch (e) {
      console.error("Error reading water level:", e);
      return null;
    }
  };

  // Create a smooth water shader (same as original)
  const createSmoothShader = (gpuComputeInstance) => {
    return gpuComputeInstance.createShaderMaterial(`
      uniform sampler2D smoothTexture;

      void main() {
        vec2 cellSize = 1.0 / resolution.xy;
        vec2 uv = gl_FragCoord.xy * cellSize;

        // Computes the mean of texel and 4 neighbours
        vec4 textureValue = texture2D(smoothTexture, uv);
        textureValue += texture2D(smoothTexture, uv + vec2(0.0, cellSize.y));
        textureValue += texture2D(smoothTexture, uv + vec2(0.0, -cellSize.y));
        textureValue += texture2D(smoothTexture, uv + vec2(cellSize.x, 0.0));
        textureValue += texture2D(smoothTexture, uv + vec2(-cellSize.x, 0.0));

        textureValue /= 5.0;

        gl_FragColor = textureValue;
      }
    `, { smoothTexture: { value: null } });
  };

  // Create a button to toggle coin mode
  useEffect(() => {
    // Wait a moment to ensure the DOM is ready
    setTimeout(() => {
      // Check if button already exists and remove it to prevent duplicates
      const existingButton = document.getElementById('coin-throw-button');
      if (existingButton) {
        document.body.removeChild(existingButton);
      }

      // Create a new styled button
      const button = document.createElement('button');
      button.id = 'coin-throw-button'; // Add ID for easier reference
      button.textContent = '🪙 Throw Coins';
      button.style.position = 'fixed'; // Use fixed instead of absolute
      button.style.top = '20px'; // Position at top instead of bottom
      button.style.right = '20px';
      button.style.padding = '12px 24px';
      button.style.backgroundColor = coinMode ? '#ffcc00' : '#f8f8f8';
      button.style.color = '#000';
      button.style.border = '2px solid #ffcc00';
      button.style.borderRadius = '8px';
      button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      button.style.fontSize = '18px';
      button.style.fontWeight = 'bold';
      button.style.cursor = 'pointer';
      button.style.zIndex = '10000'; // Very high z-index to ensure visibility
      button.style.fontFamily = 'Arial, sans-serif';
      button.style.transition = 'all 0.3s ease';
      
      // Add hover effect
      button.onmouseover = () => {
        button.style.backgroundColor = coinMode ? '#ffdd33' : '#fff';
        button.style.transform = 'translateY(-2px)';
        button.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
      };
      
      button.onmouseout = () => {
        button.style.backgroundColor = coinMode ? '#ffcc00' : '#f8f8f8';
        button.style.transform = 'translateY(0)';
        button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      };
      
      button.addEventListener('click', () => {
        setCoinMode(!coinMode);
        button.style.backgroundColor = !coinMode ? '#ffcc00' : '#f8f8f8';
        console.log('Coin mode toggled:', !coinMode);
        
        // Show instructions tooltip when coin mode is activated
        if (!coinMode) { // Will be toggled to true
          const tooltip = document.createElement('div');
          tooltip.id = 'coin-tooltip';
          tooltip.style.position = 'fixed';
          tooltip.style.top = '70px';
          tooltip.style.right = '20px';
          tooltip.style.padding = '10px 15px';
          tooltip.style.backgroundColor = 'rgba(0,0,0,0.7)';
          tooltip.style.color = 'white';
          tooltip.style.borderRadius = '5px';
          tooltip.style.fontSize = '14px';
          tooltip.style.zIndex = '10000';
          tooltip.style.maxWidth = '300px';
          tooltip.textContent = 'Press "C" key while hovering over water to throw a coin';
          
          document.body.appendChild(tooltip);
          
          // Remove the tooltip after 5 seconds
          setTimeout(() => {
            if (document.body.contains(tooltip)) {
              document.body.removeChild(tooltip);
            }
          }, 5000);
        } else {
          // Remove tooltip if toggling off
          const tooltip = document.getElementById('coin-tooltip');
          if (tooltip && document.body.contains(tooltip)) {
            document.body.removeChild(tooltip);
          }
        }
      });
      
      // Add to document
      document.body.appendChild(button);
      console.log('Coin throw button created with ID:', button.id);
    }, 500);
    
    return () => {
      const button = document.getElementById('coin-throw-button');
      if (button && document.body.contains(button)) {
        document.body.removeChild(button);
      }
      
      const tooltip = document.getElementById('coin-tooltip');
      if (tooltip && document.body.contains(tooltip)) {
        document.body.removeChild(tooltip);
      }
    };
  }, [coinMode]);
  
  // Add global key event listener for coin throwing - limit to one coin per press
  useEffect(() => {
    // Only create the key handler when in coin mode
    if (!coinMode) return;
    
    // Track if we have an active coin in the air - use a regular variable, not a hook
    const coinInAir = { current: false };
    
    const handleKeyPress = (event) => {
      // Use 'c' key to throw coins
      if ((event.key === 'c' || event.key === 'C') && !coinInAir.current) {
        console.log('C key pressed in coin mode');
        coinInAir.current = true; // Set flag to prevent multiple coins
        
        // Use current mouse position
        raycaster.current.setFromCamera(mouseCoords.current, camera);
        
        // Debug info
        console.log('Mouse coords:', mouseCoords.current);
        console.log('Camera position:', camera.position);
        
        const intersects = raycaster.current.intersectObject(meshRef.current);
        console.log('Raycaster intersections:', intersects.length);
        
        if (intersects.length > 0) {
          const point = intersects[0].point.clone(); // Clone to avoid modifying the original
          console.log('Intersection point:', point);
          
          // Store the point for rendering
          coinThrowPoint.current.copy(point);
          
          // Use the actual intersection point for throwing
          throwCoin(point);
          console.log('Coin thrown at position:', point);
          
          // Allow coin throwing again once the current coin has hit the water
          setTimeout(() => {
            coinInAir.current = false;
          }, 1500); // Reasonable time for coin to fall and hit water
        } else {
          console.log('No water surface intersection found, trying alternative method');
          
          // If no direct intersection, use a different approach to get a point
          // on the water surface under the mouse cursor
          
          // Create a plane representing the water surface
          const waterPlane = new THREE.Plane(
            new THREE.Vector3(0, 1, 0).applyQuaternion(meshRef.current.quaternion),
            -meshRef.current.position.y
          );
          
          // Create a ray from the camera through the mouse position
          const mouse = new THREE.Vector2(mouseCoords.current.x, mouseCoords.current.y);
          const ray = new THREE.Ray();
          ray.origin.setFromMatrixPosition(camera.matrixWorld);
          ray.direction.set(mouse.x, mouse.y, 0.5).unproject(camera).sub(ray.origin).normalize();
          
          // Find the intersection point of the ray with the water plane
          const targetPoint = new THREE.Vector3();
          if (ray.intersectPlane(waterPlane, targetPoint)) {
            console.log('Used plane intersection method, point:', targetPoint);
            throwCoin(targetPoint);
            
            // Allow coin throwing again once the current coin has hit the water
            setTimeout(() => {
              coinInAir.current = false;
            }, 1500); // Reasonable time for coin to fall and hit water
          } else {
            console.log('Fallback: No intersection found, using center position');
            // Final fallback - use the center of the water
            const defaultPosition = new THREE.Vector3(position[0], position[1] + waterHeight, position[2]);
            throwCoin(defaultPosition);
            
            // Allow coin throwing again
            setTimeout(() => {
              coinInAir.current = false;
            }, 1500);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    // Create visual indicator for coin mode
    const indicator = document.createElement('div');
    indicator.id = 'coin-mode-indicator';
    indicator.style.position = 'fixed';
    indicator.style.top = '70px';
    indicator.style.right = '20px';
    indicator.style.padding = '5px 10px';
    indicator.style.backgroundColor = '#ffcc00';
    indicator.style.color = 'black';
    indicator.style.borderRadius = '3px';
    indicator.style.fontSize = '12px';
    indicator.style.fontWeight = 'bold';
    indicator.style.zIndex = '10000';
    indicator.textContent = 'COIN MODE ACTIVE';
    
    document.body.appendChild(indicator);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      
      const indicator = document.getElementById('coin-mode-indicator');
      if (indicator && document.body.contains(indicator)) {
        document.body.removeChild(indicator);
      }
    };
  }, [coinMode, position, waterHeight]);

  // Initialize on mount
  useEffect(() => {
    console.log('WaterEffect initializing with dimensions:', pedestalInsetRadius * 2);
    
    // Use correct geometry with fine subdivisions like in the original
    const geometry = new THREE.PlaneGeometry(
      pedestalInsetRadius * 2, 
      pedestalInsetRadius * 2, 
      WIDTH - 1, 
      WIDTH - 1
    );
    
    // Create a water material (identical to original)
    const material = new WaterMaterial({
      color: waterColor,
      metalness: 0.9,
      roughness: 0.05, // Slightly smoother for better reflections
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    const waterMesh = new THREE.Mesh(geometry, material);
    
    // Position the water mesh at the height of the inset
    waterMesh.position.set(position[0], position[1] + waterHeight, position[2]);
    waterMesh.rotation.set(rotation[0], rotation[1], rotation[2]);
    
    // IMPORTANT: Set to false like in the original
    waterMesh.matrixAutoUpdate = false;
    waterMesh.updateMatrix();
    
    // Create an invisible mesh for raycasting (exactly like original)
    const geometryRay = new THREE.PlaneGeometry(pedestalInsetRadius * 2, pedestalInsetRadius * 2, 1, 1);
    const meshRay = new THREE.Mesh(
      geometryRay, 
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, visible: false })
    );
    meshRay.position.copy(waterMesh.position);
    meshRay.rotation.copy(waterMesh.rotation);
    meshRay.matrixAutoUpdate = false;
    meshRay.updateMatrix();
    
    scene.add(waterMesh);
    scene.add(meshRay);
    waterMeshRef.current = waterMesh;
    meshRef.current = meshRay;
    
    console.log('Water mesh position:', waterMesh.position);
    console.log('Water mesh rotation:', waterMesh.rotation);
    
    // Initialize the GPU computation
    const gpuComputeSetup = initGPUComputation();
    if (gpuComputeSetup) {
      gpuCompute.current = gpuComputeSetup;
      
      // Create smooth shader (like original)
      const smoothShader = createSmoothShader(gpuComputeSetup.instance);
      gpuCompute.current.smoothShader = smoothShader;
      
      // Initial computations to stabilize water
      for (let i = 0; i < 8; i++) {
        gpuCompute.current.instance.compute();
      }
      
      // Initial smoothing of water surface
      smoothWater();
      
      // Get current heightmap after initialization
      tmpHeightmap.current = gpuCompute.current.instance.getCurrentRenderTarget(
        gpuCompute.current.variable
      ).texture;
      
      // Set initial heightmap to material
      waterMesh.material.heightmap = tmpHeightmap.current;
      
      // Run a test sequence of strong ripples to verify everything works
      const runTestSequence = () => {
        console.log("Running water test sequence...");
        
        // Create intense splash at water center
        const makeTestSplash = (intensity, delay, position) => {
          setTimeout(() => {
            // Get world position for splash
            const worldPos = position || new THREE.Vector3(
              waterMesh.position.x, 
              waterMesh.position.y, 
              waterMesh.position.z
            );
            
            // Set extreme values for splash (much stronger than normal)
            const uniforms = gpuCompute.current.variable.material.uniforms;
            
            // Use large depth value for strong visible effect
            const oldDeep = uniforms['deep'].value;
            const oldPos = uniforms['mousePos'].value.clone();
            
            // Set new values
            uniforms['mousePos'].value.set(worldPos.x, worldPos.z);
            uniforms['deep'].value = DEFAULT_WATER_SETTINGS.mouseDeep * intensity; 
            
            console.log(`Test splash at (${worldPos.x}, ${worldPos.z}) with intensity ${intensity}`);
            
            // Reset after a while
            setTimeout(() => {
              uniforms['mousePos'].value.set(10000, 10000);
              uniforms['deep'].value = oldDeep;
            }, 800);
          }, delay);
        };
        
        // Create five strong test splashes with increasing intensity
        makeTestSplash(80, 0);     // Center
        makeTestSplash(120, 1000);  // Center stronger
        
        // Create splashes at different locations
        setTimeout(() => {
          // Random points across the water surface
          const radius = pedestalInsetRadius * 0.8;
          for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const offsetX = Math.cos(angle) * distance;
            const offsetZ = Math.sin(angle) * distance;
            
            const pos = new THREE.Vector3(
              waterMesh.position.x + offsetX,
              waterMesh.position.y,
              waterMesh.position.z + offsetZ
            );
            
            // Create strong splash at this position with delay
            makeTestSplash(200, 2000 + i * 800, pos);
          }
        }, 2000);
      };
      
      // Run test sequence after a delay
      setTimeout(runTestSequence, 1000);
    } else {
      console.error("Failed to initialize GPU compute");
    }
    
    // Mouse interaction handlers - track position like original
    const handleMouseMove = (event) => {
      const rect = gl.domElement.getBoundingClientRect();
      mouseCoords.current.set(
        (event.clientX / rect.width) * 2 - 1,
        -(event.clientY / rect.height) * 2 + 1
      );
    };
    
    // Handle mouse down to trigger water interaction
    const handlePointerDown = () => {
      // In coin mode we don't want to disturb the water directly
      if (!coinMode) {
        mousedown.current = true;
      }
    };
    
    // Handle pointer up
    const handlePointerUp = () => {
      mousedown.current = false;
    };
    
    // Add these event listeners in a way that won't conflict
    gl.domElement.addEventListener('pointermove', handleMouseMove);
    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    gl.domElement.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      scene.remove(waterMesh);
      scene.remove(meshRay);
      
      gl.domElement.removeEventListener('pointermove', handleMouseMove);
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      gl.domElement.removeEventListener('pointerup', handlePointerUp);
      
      // Clean up all coins
      coins.current.forEach(coin => coin.remove());
      coins.current = [];
    };
  }, []);
  
  // Smooth water function EXACTLY like the original
  const smoothWater = () => {
    if (!gpuCompute.current || !gpuCompute.current.instance || !gpuCompute.current.variable || !gpuCompute.current.smoothShader) return;
    
    const currentRenderTarget = gpuCompute.current.instance.getCurrentRenderTarget(gpuCompute.current.variable);
    const alternateRenderTarget = gpuCompute.current.instance.getAlternateRenderTarget(gpuCompute.current.variable);
    
    // Apply 10 smoothing iterations, exactly as in the original
    for (let i = 0; i < 10; i++) {
      gpuCompute.current.smoothShader.uniforms['smoothTexture'].value = currentRenderTarget.texture;
      gpuCompute.current.instance.doRenderTarget(gpuCompute.current.smoothShader, alternateRenderTarget);
      
      gpuCompute.current.smoothShader.uniforms['smoothTexture'].value = alternateRenderTarget.texture;
      gpuCompute.current.instance.doRenderTarget(gpuCompute.current.smoothShader, currentRenderTarget);
    }
  };

  // Function to perform raycasting - EXACTLY like the original example
  const raycast = () => {
    if (!gpuCompute.current || !gpuCompute.current.variable || !meshRef.current) return;
    
    // Skip raycasting when in coin mode
    if (coinMode) {
      return;
    }
  
    // Set uniforms: mouse interaction - EXACTLY like original code
    const uniforms = gpuCompute.current.variable.material.uniforms;
    
    if (mousedown.current) {
      raycaster.current.setFromCamera(mouseCoords.current, camera);
      const intersects = raycaster.current.intersectObject(meshRef.current);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        
        // This is the key part from the original code - directly setting point.x and point.z
        console.log("Setting mousePos from raycast:", point.x, point.z);
        uniforms['mousePos'].value.set(point.x, point.z);
      } else {
        uniforms['mousePos'].value.set(10000, 10000);
      }
    } else {
      uniforms['mousePos'].value.set(10000, 10000);
    }
  };
  
  // Update on each frame - EXACTLY like the original render function
  useFrame(() => {
    if (!gpuCompute.current || !waterMeshRef.current) return;
    
    // Call raycast exactly as in the original
    raycast();
    
    // Frame counter for water physics - EXACTLY like the original
    frame.current++;
    
    // Run water computation at specific intervals based on speed
    if (frame.current >= (7 - waterSettings.current.speed)) {
      try {
        // Do the GPU computation
        gpuCompute.current.instance.compute();
        
        // Get the current texture
        tmpHeightmap.current = gpuCompute.current.instance.getCurrentRenderTarget(
          gpuCompute.current.variable
        ).texture;
        
        // Get compute output in custom uniform - EXACTLY like original
        if (waterMeshRef.current && tmpHeightmap.current) {
          waterMeshRef.current.material.heightmap = tmpHeightmap.current;
        }
        
        // Reset frame counter
        frame.current = 0;
        
        // Update coins separately from water physics
        if (coins.current.length > 0) {
          updateCoins();
        }
      } catch (error) {
        console.error("Error during water computation:", error);
      }
    }
  });
  
  // Diagnostic effect to periodically check and log water state
  useEffect(() => {
    const diagnosticTimer = setInterval(() => {
      if (waterMeshRef.current && waterMeshRef.current.material) {
        console.log("Water heightmap status:", !!waterMeshRef.current.material.heightmap);
        
        // Force water mesh update
        if (waterMeshRef.current.material.heightmap) {
          waterMeshRef.current.material.needsUpdate = true;
        }
      }
      
      if (gpuCompute.current && gpuCompute.current.variable) {
        const mousePos = gpuCompute.current.variable.material.uniforms['mousePos'].value;
        console.log("Current mousePos:", mousePos.x, mousePos.y);
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(diagnosticTimer);
  }, []);

  // Separate function to update coins with better splash effect
  const updateCoins = () => {
    for (let i = 0; i < coins.current.length; i++) {
      try {
        const coin = coins.current[i];
        const madeSplash = coin.update();
        
        // No need to call createSplash here anymore, as the coin.update method
        // directly manipulates the mousePos uniform for accurate ripples
      } catch (e) {
        console.error('Error updating coin:', e);
      }
    }
  };

  // Add readWaterLevelShader implementation from the original
  const getReadWaterLevelShader = () => {
    return /* glsl */`
      uniform vec2 point1;
      uniform sampler2D levelTexture;

      // Integer to float conversion from https://stackoverflow.com/questions/17981163/webgl-read-pixels-from-floating-point-render-target
      float shift_right(float v, float amt) {
        v = floor(v) + 0.5;
        return floor(v / exp2(amt));
      }

      float shift_left(float v, float amt) {
        return floor(v * exp2(amt) + 0.5);
      }

      float mask_last(float v, float bits) {
        return mod(v, shift_left(1.0, bits));
      }

      float extract_bits(float num, float from, float to) {
        from = floor(from + 0.5); to = floor(to + 0.5);
        return mask_last(shift_right(num, from), to - from);
      }

      vec4 encode_float(float val) {
        if (val == 0.0) return vec4(0, 0, 0, 0);
        float sign = val > 0.0 ? 0.0 : 1.0;
        val = abs(val);
        float exponent = floor(log2(val));
        float biased_exponent = exponent + 127.0;
        float fraction = ((val / exp2(exponent)) - 1.0) * 8388608.0;
        float t = biased_exponent / 2.0;
        float last_bit_of_biased_exponent = fract(t) * 2.0;
        float remaining_bits_of_biased_exponent = floor(t);
        float byte4 = extract_bits(fraction, 0.0, 8.0) / 255.0;
        float byte3 = extract_bits(fraction, 8.0, 16.0) / 255.0;
        float byte2 = (last_bit_of_biased_exponent * 128.0 + extract_bits(fraction, 16.0, 23.0)) / 255.0;
        float byte1 = (sign * 128.0 + remaining_bits_of_biased_exponent) / 255.0;
        return vec4(byte4, byte3, byte2, byte1);
      }

      void main() {
        vec2 cellSize = 1.0 / resolution.xy;
        float waterLevel = texture2D(levelTexture, point1).x;

        vec2 normal = vec2(
          (texture2D(levelTexture, point1 + vec2(-cellSize.x, 0)).x - texture2D(levelTexture, point1 + vec2(cellSize.x, 0)).x) * WIDTH / BOUNDS,
          (texture2D(levelTexture, point1 + vec2(0, -cellSize.y)).x - texture2D(levelTexture, point1 + vec2(0, cellSize.y)).x) * WIDTH / BOUNDS);

        if (gl_FragCoord.x < 1.5) {
          gl_FragColor = encode_float(waterLevel);
        } else if (gl_FragCoord.x < 2.5) {
          gl_FragColor = encode_float(normal.x);
        } else if (gl_FragCoord.x < 3.5) {
          gl_FragColor = encode_float(normal.y);
        } else {
          gl_FragColor = encode_float(0.0);
        }
      }
    `;
  };

  // This component doesn't render anything directly
  return null;
};

export default WaterEffect;