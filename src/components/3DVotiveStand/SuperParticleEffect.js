/**
 * CyberParticleEffect.js
 * 
 * A self-contained Three.js class for creating cyberpunk-style particle effects
 * with GPGPU flow field simulation, holographic colors, glitch effects, and more.
 * 
 * Features:
 * - GPGPU-based particle movement with flow field influence
 * - Multiple holographic color modes (rainbow, cyan-purple, electric blue, plasma, matrix)
 * - Glitch effects with RGB channel separation
 * - Chromatic aberration
 * - Binary digit rendering mode (displays particles as 1s and 0s)
 * - Depth-based fading for matrix-like trails
 * - Pulsing and edge glow effects
 * - Compatible with Three.js post-processing (bloom recommended)
 * 
 * Usage Example:
 * ```javascript
 * import * as THREE from 'three';
 * import { CyberParticleEffect } from './CyberParticleEffect.js';
 * import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';
 * 
 * // Setup your Three.js scene, camera, renderer...
 * 
 * // Create the effect from a geometry or mesh
 * const geometry = new THREE.BoxGeometry(5, 5, 5, 20, 20, 20);
 * const cyberEffect = new CyberParticleEffect(geometry, renderer);
 * 
 * // Add to scene
 * scene.add(cyberEffect.points);
 * 
 * // Optional: Setup bloom post-processing for best results
 * import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
 * import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
 * import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
 * 
 * const composer = new EffectComposer(renderer);
 * const renderPass = new RenderPass(scene, camera);
 * composer.addPass(renderPass);
 * const bloomPass = new UnrealBloomPass(
 *     new THREE.Vector2(window.innerWidth, window.innerHeight),
 *     1.0,  // strength
 *     0.4,  // radius
 *     0.85  // threshold
 * );
 * composer.addPass(bloomPass);
 * 
 * // In your render loop
 * function animate() {
 *     requestAnimationFrame(animate);
 *     
 *     cyberEffect.update();
 *     
 *     // Render with post-processing
 *     composer.render();
 *     // Or without: renderer.render(scene, camera);
 * }
 * ```
 * 
 * Configuration:
 * ```javascript
 * // Access and modify parameters
 * cyberEffect.parameters.particleSize = 0.2;
 * cyberEffect.parameters.glitchIntensity = 0.5;
 * cyberEffect.parameters.colorMode = CyberParticleEffect.COLOR_MODES.MATRIX_GREEN;
 * cyberEffect.parameters.digitMode = true; // Enable binary digit rendering
 * 
 * // Flow field parameters
 * cyberEffect.flowField.influence = 0.7;
 * cyberEffect.flowField.strength = 3.0;
 * cyberEffect.flowField.frequency = 0.3;
 * ```
 * 
 * Morphing Between Geometries:
 * ```javascript
 * // Create effect with morphing support
 * const geometry1 = new THREE.BoxGeometry(5, 5, 5, 20, 20, 20);
 * const geometry2 = new THREE.SphereGeometry(3, 32, 32);
 * 
 * const cyberEffect = new CyberParticleEffect(geometry1, renderer, {
 *     targetGeometry: geometry2  // Optional second geometry for morphing
 * });
 * 
 * // Animate morphing (0 = first geometry, 1 = second geometry)
 * function animate() {
 *     cyberEffect.parameters.morphFactor = Math.sin(time) * 0.5 + 0.5;
 *     cyberEffect.update();
 * }
 * 
 * // Or use tweening library for smooth transitions
 * gsap.to(cyberEffect.parameters, {
 *     morphFactor: 1,
 *     duration: 2,
 *     ease: "power2.inOut",
 *     yoyo: true,
 *     repeat: -1
 * });
 * ```
 * 
 * Notes on Morphing:
 * - Both geometries are automatically scaled to similar sizes for smooth morphing
 * - Works seamlessly with all existing effects (glitch, holographic, etc.)
 * - Best results when both geometries have similar particle counts
 * - morphFactor can be animated from 0 to 1 for smooth transitions
 * - Particles respawn at interpolated positions when they die
 */

import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

export class CyberParticleEffect {
    // Color mode constants
    static COLOR_MODES = {
        RAINBOW_BANDS: 0,
        CYAN_PURPLE: 1,
        ELECTRIC_BLUE: 2,
        HOT_PLASMA: 3,
        MATRIX_GREEN: 4
    };

    constructor(geometryOrMesh, renderer, options = {}) {
        // Extract geometry from input
        this.baseGeometry = geometryOrMesh.isBufferGeometry ? geometryOrMesh : geometryOrMesh.geometry;
        if (!this.baseGeometry) {
            throw new Error('Input must be a BufferGeometry or a Mesh with geometry');
        }

        // Optional second geometry for morphing
        this.targetGeometry = null;
        if (options.targetGeometry) {
            this.targetGeometry = options.targetGeometry.isBufferGeometry ? options.targetGeometry : options.targetGeometry.geometry;
        }

        this.renderer = renderer;
        this.clock = new THREE.Clock();
        this.previousTime = 0;

        // Default options
        this.options = {
            autoScale: options.autoScale !== undefined ? options.autoScale : true,
            targetSize: options.targetSize || 10,
            ...options
        };

        // Parameters that can be modified
        this.parameters = {
            particleSize: 0.15,
            glitchIntensity: 0.3,
            glitchFrequency: 10,
            chromaticAberration: 0.5,
            scanLineSpeed: 1.0,
            holographicIntensity: 0.3,
            pulseSpeed: 2.0,
            pulseIntensity: 0.1,
            depthFadeIntensity: 0.5,
            colorMode: CyberParticleEffect.COLOR_MODES.CYAN_PURPLE,
            digitMode: false,
            morphFactor: 0.0  // 0 = base geometry, 1 = target geometry
        };

        // Flow field parameters
        this.flowField = {
            influence: 0.5,
            strength: 2,
            frequency: 0.5
        };

        this._initialize();
    }

    _initialize() {
        // Process geometry
        this._processGeometry();
        
        // Setup GPGPU
        this._setupGPGPU();
        
        // Create particles
        this._createParticles();
    }

    _processGeometry() {
        const geometry = this.baseGeometry;
        
        // Auto-scale if enabled
        if (this.options.autoScale) {
            
            eometry.computeBoundingBox();
            const boundingBox = geometry.boundingBox;
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scaleFactor = this.options.targetSize / maxDimension;
            geometry.scale(scaleFactor, scaleFactor, scaleFactor);
            
            // Scale target geometry to match if present
            if (this.targetGeometry) {
                this.targetGeometry.computeBoundingBox();
                const targetBoundingBox = this.targetGeometry.boundingBox;
                const targetSize = new THREE.Vector3();
                targetBoundingBox.getSize(targetSize);
                const targetMaxDimension = Math.max(targetSize.x, targetSize.y, targetSize.z);
                const targetScaleFactor = this.options.targetSize / targetMaxDimension;
                this.targetGeometry.scale(targetScaleFactor, targetScaleFactor, targetScaleFactor);
            }
        }

        this.particleCount = geometry.attributes.position.count;
        
        // Ensure target geometry has same particle count if morphing is enabled
        if (this.targetGeometry && this.targetGeometry.attributes.position.count !== this.particleCount) {
            console.warn('Target geometry has different particle count. Morphing may produce unexpected results.');
        }
    }

    _setupGPGPU() {
        // Calculate texture size
        const gpgpuSize = Math.ceil(Math.sqrt(this.particleCount));
        
        // Create GPU computation renderer
        this.gpgpuComputation = new GPUComputationRenderer(gpgpuSize, gpgpuSize, this.renderer);

        // Create initial particle positions texture for base geometry
        const baseParticlesTexture = this.gpgpuComputation.createTexture();
        const positions = this.baseGeometry.attributes.position.array;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            const i4 = i * 4;

            baseParticlesTexture.image.data[i4 + 0] = positions[i3 + 0];
            baseParticlesTexture.image.data[i4 + 1] = positions[i3 + 1];
            baseParticlesTexture.image.data[i4 + 2] = positions[i3 + 2];
            baseParticlesTexture.image.data[i4 + 3] = Math.random();
        }

        // Create morph target texture if target geometry exists
        let morphTargetTexture = null;
        if (this.targetGeometry) {
            morphTargetTexture = this.gpgpuComputation.createTexture();
            const targetPositions = this.targetGeometry.attributes.position.array;
            const targetCount = Math.min(this.particleCount, this.targetGeometry.attributes.position.count);

            for (let i = 0; i < targetCount; i++) {
                const i3 = i * 3;
                const i4 = i * 4;

                morphTargetTexture.image.data[i4 + 0] = targetPositions[i3 + 0];
                morphTargetTexture.image.data[i4 + 1] = targetPositions[i3 + 1];
                morphTargetTexture.image.data[i4 + 2] = targetPositions[i3 + 2];
                morphTargetTexture.image.data[i4 + 3] = Math.random();
            }

            // Fill remaining particles with base geometry positions if target has fewer particles
            for (let i = targetCount; i < this.particleCount; i++) {
                const i3 = i * 3;
                const i4 = i * 4;

                morphTargetTexture.image.data[i4 + 0] = positions[i3 + 0];
                morphTargetTexture.image.data[i4 + 1] = positions[i3 + 1];
                morphTargetTexture.image.data[i4 + 2] = positions[i3 + 2];
                morphTargetTexture.image.data[i4 + 3] = Math.random();
            }
        }

        // Add particles variable with shader
        this.particlesVariable = this.gpgpuComputation.addVariable(
            'uParticles',
            this._getGPGPUShader(),
            baseParticlesTexture
        );
        
        this.gpgpuComputation.setVariableDependencies(this.particlesVariable, [this.particlesVariable]);

        // Set uniforms
        this.particlesVariable.material.uniforms.uTime = new THREE.Uniform(0);
        this.particlesVariable.material.uniforms.uDeltaTime = new THREE.Uniform(0);
        this.particlesVariable.material.uniforms.uBase = new THREE.Uniform(baseParticlesTexture);
        this.particlesVariable.material.uniforms.uMorphTarget = new THREE.Uniform(morphTargetTexture || baseParticlesTexture);
        this.particlesVariable.material.uniforms.uMorphFactor = new THREE.Uniform(this.parameters.morphFactor);
        this.particlesVariable.material.uniforms.uFlowFieldInfluence = new THREE.Uniform(this.flowField.influence);
        this.particlesVariable.material.uniforms.uFlowFieldStrength = new THREE.Uniform(this.flowField.strength);
        this.particlesVariable.material.uniforms.uFlowFieldFrequency = new THREE.Uniform(this.flowField.frequency);

        // Initialize
        const error = this.gpgpuComputation.init();
        if (error !== null) {
            console.error('GPGPU Computation Error:', error);
        }

        this.gpgpuSize = gpgpuSize;
    }

    _createParticles() {
        // Create particle UV coordinates and sizes
        const particlesUvArray = new Float32Array(this.particleCount * 2);
        const sizesArray = new Float32Array(this.particleCount);

        for (let y = 0; y < this.gpgpuSize; y++) {
            for (let x = 0; x < this.gpgpuSize; x++) {
                const i = y * this.gpgpuSize + x;
                if (i >= this.particleCount) break;

                const i2 = i * 2;

                // UV coordinates for sampling GPGPU texture
                particlesUvArray[i2 + 0] = (x + 0.5) / this.gpgpuSize;
                particlesUvArray[i2 + 1] = (y + 0.5) / this.gpgpuSize;

                // Random size variation
                sizesArray[i] = Math.random();
            }
        }

        // Create geometry
        const geometry = new THREE.BufferGeometry();
        geometry.setDrawRange(0, this.particleCount);
        geometry.setAttribute('aParticlesUv', new THREE.BufferAttribute(particlesUvArray, 2));
        geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1));

        // Handle colors
        if (this.baseGeometry.attributes.color) {
            geometry.setAttribute('aColor', this.baseGeometry.attributes.color);
        } else {
            // Create default white color
            const colorsArray = new Float32Array(this.particleCount * 3);
            for (let i = 0; i < this.particleCount * 3; i++) {
                colorsArray[i] = 1.0;
            }
            geometry.setAttribute('aColor', new THREE.BufferAttribute(colorsArray, 3));
        }

        // Create material
        const material = new THREE.ShaderMaterial({
            vertexShader: this._getVertexShader(),
            fragmentShader: this._getFragmentShader(),
            uniforms: {
                uSize: new THREE.Uniform(this.parameters.particleSize),
                uResolution: new THREE.Uniform(new THREE.Vector2(
                    window.innerWidth * window.devicePixelRatio,
                    window.innerHeight * window.devicePixelRatio
                )),
                uParticlesTexture: new THREE.Uniform(),
                uTime: new THREE.Uniform(0),
                uGlitchIntensity: new THREE.Uniform(this.parameters.glitchIntensity),
                uGlitchFrequency: new THREE.Uniform(this.parameters.glitchFrequency),
                uChromaticAberration: new THREE.Uniform(this.parameters.chromaticAberration),
                uScanLineSpeed: new THREE.Uniform(this.parameters.scanLineSpeed),
                uHolographicIntensity: new THREE.Uniform(this.parameters.holographicIntensity),
                uPulseSpeed: new THREE.Uniform(this.parameters.pulseSpeed),
                uPulseIntensity: new THREE.Uniform(this.parameters.pulseIntensity),
                uDepthFadeIntensity: new THREE.Uniform(this.parameters.depthFadeIntensity),
                uColorMode: new THREE.Uniform(this.parameters.colorMode),
                uDigitMode: new THREE.Uniform(this.parameters.digitMode ? 1.0 : 0.0)
            },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        // Create points
        this.points = new THREE.Points(geometry, material);
        this.material = material;
        this.geometry = geometry;
    }

    update() {
        const elapsedTime = this.clock.getElapsedTime();
        const deltaTime = elapsedTime - this.previousTime;
        this.previousTime = elapsedTime;

        // Update GPGPU uniforms
        this.particlesVariable.material.uniforms.uTime.value = elapsedTime;
        this.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime;
        this.particlesVariable.material.uniforms.uMorphFactor.value = this.parameters.morphFactor;
        this.particlesVariable.material.uniforms.uFlowFieldInfluence.value = this.flowField.influence;
        this.particlesVariable.material.uniforms.uFlowFieldStrength.value = this.flowField.strength;
        this.particlesVariable.material.uniforms.uFlowFieldFrequency.value = this.flowField.frequency;

        // Compute GPGPU
        this.gpgpuComputation.compute();
        
        // Update particle material
        this.material.uniforms.uParticlesTexture.value = 
            this.gpgpuComputation.getCurrentRenderTarget(this.particlesVariable).texture;
        this.material.uniforms.uTime.value = elapsedTime;

        // Update parameters
        this.material.uniforms.uSize.value = this.parameters.particleSize;
        this.material.uniforms.uGlitchIntensity.value = this.parameters.glitchIntensity;
        this.material.uniforms.uGlitchFrequency.value = this.parameters.glitchFrequency;
        this.material.uniforms.uChromaticAberration.value = this.parameters.chromaticAberration;
        this.material.uniforms.uScanLineSpeed.value = this.parameters.scanLineSpeed;
        this.material.uniforms.uHolographicIntensity.value = this.parameters.holographicIntensity;
        this.material.uniforms.uPulseSpeed.value = this.parameters.pulseSpeed;
        this.material.uniforms.uPulseIntensity.value = this.parameters.pulseIntensity;
        this.material.uniforms.uDepthFadeIntensity.value = this.parameters.depthFadeIntensity;
        this.material.uniforms.uColorMode.value = this.parameters.colorMode;
        this.material.uniforms.uDigitMode.value = this.parameters.digitMode ? 1.0 : 0.0;
    }

    onWindowResize(width, height, pixelRatio) {
        this.material.uniforms.uResolution.value.set(
            width * pixelRatio,
            height * pixelRatio
        );
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.gpgpuComputation.dispose();
    }

    // Shader code
    _getGPGPUShader() {
        return `
uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform sampler2D uMorphTarget;
uniform float uMorphFactor;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;

${this._getSimplexNoise4D()}

void main()
{
    float time = uTime * 0.2;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 particle = texture(uParticles, uv);
    vec4 base = texture(uBase, uv);
    vec4 target = texture(uMorphTarget, uv);
    
    // Interpolate between base and target geometry based on morph factor
    vec3 morphedPosition = mix(base.xyz, target.xyz, uMorphFactor);
    
    // Dead
    if(particle.a >= 1.0)
    {
        particle.a = mod(particle.a, 1.0);
        particle.xyz = morphedPosition;
    }

    // Alive
    else
    {
        // Strength - use morphed position for noise sampling
        float strength = simplexNoise4d(vec4(morphedPosition * 0.2, time + 1.0));
        float influence = (uFlowFieldInfluence - 0.5) * (- 2.0);
        strength = smoothstep(influence, 1.0, strength);

        // Flow field
        vec3 flowField = vec3(
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 0.0, time)),
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 1.0, time)),
            simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 2.0, time))
        );
        flowField = normalize(flowField);
        particle.xyz += flowField * uDeltaTime * strength * uFlowFieldStrength;

        // Decay
        particle.a += uDeltaTime * 0.3;
    }
    
    gl_FragColor = particle;
}`;
    }

    _getVertexShader() {
        return `
uniform vec2 uResolution;
uniform float uSize;
uniform sampler2D uParticlesTexture;
uniform float uTime;
uniform float uGlitchIntensity;
uniform float uGlitchFrequency;
uniform float uChromaticAberration;
uniform float uScanLineSpeed;
uniform float uHolographicIntensity;
uniform float uPulseSpeed;
uniform float uPulseIntensity;

attribute vec2 aParticlesUv;
attribute vec3 aColor;
attribute float aSize;

varying vec3 vColor;
varying float vGlitchOffset;
varying vec3 vPosition;
varying float vDepth;
varying float vParticleId;

void main()
{
    vec4 particle = texture(uParticlesTexture, aParticlesUv);

    // Glitch displacement
    float glitchTime = floor(uTime * uGlitchFrequency) / uGlitchFrequency;
    float glitchNoise = fract(sin(dot(vec2(glitchTime, aParticlesUv.y), vec2(12.9898, 78.233))) * 43758.5453);
    float glitchThreshold = step(0.99 - uGlitchIntensity * 0.1, glitchNoise);
    
    vec3 glitchOffset = vec3(
        (fract(glitchNoise * 17.0) - 0.5) * 2.0 * uGlitchIntensity * glitchThreshold,
        (fract(glitchNoise * 31.0) - 0.5) * 2.0 * uGlitchIntensity * glitchThreshold,
        0.0
    );

    // Final position with glitch
    vec4 modelPosition = modelMatrix * vec4(particle.xyz + glitchOffset, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    // Pulsing effect
    float pulse = 1.0 + sin(uTime * uPulseSpeed + particle.x * 10.0) * uPulseIntensity;
    
    // Point size with pulse
    float sizeIn = smoothstep(0.0, 0.1, particle.a);
    float sizeOut = 1.0 - smoothstep(0.7, 1.0, particle.a);
    float size = min(sizeIn, sizeOut) * pulse;

    // Improved distance-based sizing
    float perspectiveFactor = 1.0 / - viewPosition.z;
    gl_PointSize = size * aSize * uSize * uResolution.y * perspectiveFactor;
    
    // Clamp size to prevent particles from becoming too small or too large
    gl_PointSize = clamp(gl_PointSize, 2.0, 128.0);

    // Varyings
    vColor = aColor;
    vGlitchOffset = glitchThreshold;
    vPosition = modelPosition.xyz;
    vDepth = viewPosition.z;
    vParticleId = float(gl_VertexID);
}`;
    }

    _getFragmentShader() {
        return `
uniform float uTime;
uniform float uGlitchIntensity;
uniform float uChromaticAberration;
uniform float uScanLineSpeed;
uniform float uHolographicIntensity;
uniform float uDepthFadeIntensity;
uniform float uColorMode;
uniform float uDigitMode;

varying vec3 vColor;
varying float vGlitchOffset;
varying vec3 vPosition;
varying float vDepth;
varying float vParticleId;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float drawDigit(vec2 uv, float digit) {
    // Scale and center UV coordinates
    uv = uv * 3.0 - 1.5;
    
    // Create segments for digits (simplified 7-segment display)
    float seg = 0.0;
    
    if(digit < 0.5) {
        // Draw "0"
        // Outer ring
        float ring = 1.0 - smoothstep(0.7, 0.8, length(uv));
        ring *= smoothstep(0.3, 0.4, length(uv));
        seg = ring;
    } else {
        // Draw "1"
        // Vertical line
        float vline = 1.0 - smoothstep(0.1, 0.2, abs(uv.x));
        vline *= 1.0 - smoothstep(0.8, 0.9, abs(uv.y));
        // Top serif
        float serif = 1.0 - smoothstep(0.1, 0.2, abs(uv.x - 0.2));
        serif *= 1.0 - smoothstep(0.0, 0.1, abs(uv.y - 0.7));
        seg = max(vline, serif);
    }
    
    return seg;
}

void main()
{
    vec2 coord = gl_PointCoord - 0.5;
    float distanceToCenter = length(coord);
    
    float alpha = 1.0;
    
    if(uDigitMode > 0.5) {
        // Digital mode - render 1s and 0s
        float digit = mod(vParticleId, 2.0);
        alpha = drawDigit(gl_PointCoord, digit);
        if(alpha < 0.01) discard;
    } else {
        // Normal particle mode
        alpha = 1.0 - smoothstep(0.35, 0.5, distanceToCenter);
        if(alpha < 0.01) discard;
    }
    
    vec3 color = vColor;
    
    // Different color modes for holographic effect
    vec3 holographic;
    
    if(uColorMode < 0.5) {
        // Mode 0: Original rainbow bands
        float hue = mod(vPosition.x * 0.1 + vPosition.y * 0.1 + uTime * 0.5, 1.0);
        holographic = hsv2rgb(vec3(hue, 0.8, 1.0));
    }
    else if(uColorMode < 1.5) {
        // Mode 1: Cyan-Purple gradient (cyberpunk)
        float gradient = sin(vPosition.x * 0.2 + vPosition.y * 0.2 + uTime) * 0.5 + 0.5;
        holographic = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), gradient);
    }
    else if(uColorMode < 2.5) {
        // Mode 2: Electric blue-green energy
        float energy = sin(length(vPosition.xy) * 0.5 - uTime * 2.0) * 0.5 + 0.5;
        holographic = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.5), energy);
    }
    else if(uColorMode < 3.5) {
        // Mode 3: Hot plasma (orange-white)
        float plasma = pow(sin(vPosition.x * 0.3 + vPosition.y * 0.3 + uTime * 1.5) * 0.5 + 0.5, 2.0);
        holographic = mix(vec3(1.0, 0.5, 0.0), vec3(1.0, 1.0, 0.8), plasma);
    }
    else {
        // Mode 4: Matrix green
        float digital = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
        holographic = vec3(0.0, 1.0, 0.2) * (0.7 + 0.3 * digital);
    }
    
    color = mix(color, holographic, uHolographicIntensity);
    
    // Chromatic aberration
    vec2 direction = normalize(coord);
    float aberrationStrength = distanceToCenter * uChromaticAberration;
    vec3 aberratedColor;
    aberratedColor.r = mix(color.r, holographic.r, aberrationStrength);
    aberratedColor.g = color.g;
    aberratedColor.b = mix(color.b, holographic.b, aberrationStrength * 0.8);
    color = mix(color, aberratedColor, 0.7);
    
    // Data stream effect (vertical lines) - subtle
    float dataStream = sin(gl_FragCoord.x * 0.1 + uTime * 2.0) * 0.02 + 0.98;
    color *= dataStream;
    
    // RGB channel separation glitch
    if(vGlitchOffset > 0.0) {
        float shift = uGlitchIntensity * 0.1;
        color.r *= (1.0 + shift);
        color.b *= (1.0 - shift);
        
        // Random color corruption
        float colorNoise = fract(sin(dot(vec2(uTime, gl_FragCoord.y), vec2(12.9898, 78.233))) * 43758.5453);
        color = mix(color, vec3(colorNoise), uGlitchIntensity * 0.5 * vGlitchOffset);
    }
    
    // Edge glow effect
    float edgeGlow = 1.0 - distanceToCenter * 2.0;
    edgeGlow = pow(edgeGlow, 3.0);
    color += vec3(0.0, 0.7, 1.0) * edgeGlow * 0.5;
    
    // Depth-based fading (matrix-like trail) - adjusted for better visibility
    float depthFade = 1.0 - smoothstep(-5.0, -50.0, vDepth);
    alpha *= mix(1.0 - uDepthFadeIntensity, 1.0, depthFade); // Controllable depth fade
    
    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
}`;
    }

    _getSimplexNoise4D() {
        return `
//	Simplex 4D Noise 
//	by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
float permute(float x){return floor(mod(((x*34.0)+1.0)*x, 289.0));}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}

vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www; 

  return p;
}

float simplexNoise4d(vec4 v){
  const vec2  C = vec2( 0.138196601125010504,  // (5 - sqrt(5))/20  G4
                        0.309016994374947451); // (sqrt(5) - 1)/4   F4
// First corner
  vec4 i  = floor(v + dot(v, C.yyyy) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

// Other corners

// Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;

  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
//  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;

//  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;

  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C 
  vec4 x1 = x0 - i1 + 1.0 * C.xxxx;
  vec4 x2 = x0 - i2 + 2.0 * C.xxxx;
  vec4 x3 = x0 - i3 + 3.0 * C.xxxx;
  vec4 x4 = x0 - 1.0 + 4.0 * C.xxxx;

// Permutations
  i = mod(i, 289.0); 
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));
// Gradients
// ( 7*7*6 points uniformly over a cube, mapped onto a 4-octahedron.)
// 7*7*6 = 294, which is close to the ring size 17*17 = 289.

  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

// Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

// Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
               + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;

}`;
    }
}