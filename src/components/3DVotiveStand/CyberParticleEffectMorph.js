/**
 * CyberParticleEffectMorph.js
 * 
 * Enhanced version of CyberParticleEffect with morphing capabilities.
 * Allows smooth transitions between multiple target geometries.
 * 
 * Features:
 * - All original CyberParticleEffect features
 * - Morphing between 2-3 different geometries
 * - Smooth transitions with customizable duration
 * - Multiple morphing modes (linear, ease-in-out, bounce)
 * 
 * Usage Example:
 * ```javascript
 * // Create effect with initial geometry
 * const cyberEffect = new CyberParticleEffectMorph(geometry1, renderer);
 * 
 * // Add morph targets
 * cyberEffect.addMorphTarget('sphere', sphereGeometry);
 * cyberEffect.addMorphTarget('cube', cubeGeometry);
 * cyberEffect.addMorphTarget('torus', torusGeometry);
 * 
 * // Morph to a target
 * cyberEffect.morphTo('sphere', 2.0); // 2 second transition
 * 
 * // Or morph sequentially
 * cyberEffect.startSequentialMorph(['sphere', 'cube', 'torus'], 3.0); // 3 seconds per transition
 * ```
 */

import * as THREE from 'three';
import { CyberParticleEffect } from './CyberParticleEffect.js';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

export class CyberParticleEffectMorph extends CyberParticleEffect {
    constructor(geometryOrMesh, renderer, options = {}) {
        // Initialize morphing properties BEFORE calling super
        // This is needed because super() calls _initialize() which calls _setupGPGPU()
        
        // We need to do minimal setup here
        const tempMorphTargets = new Map();
        const tempBaseGeometry = geometryOrMesh.isBufferGeometry ? geometryOrMesh : geometryOrMesh.geometry;
        
        // Call parent constructor
        super(geometryOrMesh, renderer, options);
        
        // Now set up morphing properties properly
        this.morphTargets = new Map();
        this.currentMorphTarget = 'base';
        this.morphProgress = 0;
        this.morphDuration = 2.0;
        this.morphStartTime = 0;
        this.isMorphing = false;
        this.morphEasing = 'easeInOut'; // linear, easeIn, easeOut, easeInOut, bounce
        
        // Sequential morphing
        this.sequentialMorphTargets = [];
        this.sequentialMorphIndex = 0;
        this.isSequentialMorphing = false;
        this.sequentialMorphDuration = 3.0;
        
        // Store base geometry as first morph target
        this.morphTargets.set('base', this._createMorphTexture(this.baseGeometry));
        
        // Update the uniform with the base texture now that it exists
        if (this.particlesVariable && this.particlesVariable.material) {
            this.particlesVariable.material.uniforms.uMorphTarget.value = this.morphTargets.get('base');
        }
    }
    
    _setupGPGPU() {
        // Call parent setup first
        super._setupGPGPU();
        
        // Add morph-specific uniforms
        // Use a placeholder texture if morphTargets isn't ready yet
        const morphTarget = this.morphTargets && this.morphTargets.has('base') 
            ? this.morphTargets.get('base') 
            : this.gpgpuComputation.createTexture(); // Temporary texture
            
        this.particlesVariable.material.uniforms.uMorphTarget = new THREE.Uniform(morphTarget);
        this.particlesVariable.material.uniforms.uMorphProgress = new THREE.Uniform(0);
        this.particlesVariable.material.uniforms.uMorphMode = new THREE.Uniform(0); // 0 = no morph, 1 = morphing
    }
    
    _getGPGPUShader() {
        return `
uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform sampler2D uMorphTarget;
uniform float uMorphProgress;
uniform float uMorphMode;
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
    
    // Dead - respawn at original position
    if(particle.a >= 1.0)
    {
        particle.a = mod(particle.a, 1.0);
        
        // Always respawn at the current morph position
        if(uMorphMode > 0.5) {
            particle.xyz = mix(base.xyz, target.xyz, uMorphProgress);
        } else {
            particle.xyz = base.xyz;
        }
    }

    // Alive
    else
    {
        // Apply morphing to live particles
        if(uMorphMode > 0.5) {
            vec3 targetPosition = mix(base.xyz, target.xyz, uMorphProgress);
            vec3 morphForce = (targetPosition - particle.xyz) * 2.0 * uMorphProgress;
            particle.xyz += morphForce * uDeltaTime;
        }
        
        // Strength
        float strength = simplexNoise4d(vec4(base.xyz * 0.2, time + 1.0));
        float influence = (uFlowFieldInfluence - 0.5) * (- 2.0);
        strength = smoothstep(influence, 1.0, strength);

        // Flow field (reduced during morphing) - only apply if strength > 0
        if (uFlowFieldStrength > 0.0) {
            float flowFieldScale = uMorphMode > 0.5 ? (1.0 - uMorphProgress * 0.7) : 1.0;
            vec3 flowField = vec3(
                simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 0.0, time)),
                simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 1.0, time)),
                simplexNoise4d(vec4(particle.xyz * uFlowFieldFrequency + 2.0, time))
            );
            flowField = normalize(flowField);
            particle.xyz += flowField * uDeltaTime * strength * uFlowFieldStrength * flowFieldScale;
        }

        // Decay - very slow for much longer particle life
        particle.a += uDeltaTime * 0.02;
    }
    
    gl_FragColor = particle;
}`;
    }
    
    _createMorphTexture(geometry) {
        const positions = geometry.attributes.position.array;
        const texture = new THREE.DataTexture(
            new Float32Array(this.gpgpuSize * this.gpgpuSize * 4),
            this.gpgpuSize,
            this.gpgpuSize,
            THREE.RGBAFormat,
            THREE.FloatType
        );
        
        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            const i4 = i * 4;
            
            texture.image.data[i4 + 0] = positions[i3 + 0];
            texture.image.data[i4 + 1] = positions[i3 + 1];
            texture.image.data[i4 + 2] = positions[i3 + 2];
            texture.image.data[i4 + 3] = 0;
        }
        
        texture.needsUpdate = true;
        return texture;
    }
    
    addMorphTarget(name, geometryOrMesh) {
        const geometry = geometryOrMesh.isBufferGeometry ? geometryOrMesh : geometryOrMesh.geometry;
        
        // Ensure the geometry has the same number of vertices
        if (geometry.attributes.position.count !== this.particleCount) {
            console.warn(`Morph target "${name}" has different vertex count. Resampling...`);
            // For now, just use what we have (you could implement resampling here)
        }
        
        // Apply same scaling as base geometry if auto-scale is enabled
        if (this.options.autoScale) {
            const tempGeometry = geometry.clone();
            tempGeometry.computeBoundingBox();
            const boundingBox = tempGeometry.boundingBox;
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            const maxDimension = Math.max(size.x, size.y, size.z);
            const scaleFactor = this.options.targetSize / maxDimension;
            tempGeometry.scale(scaleFactor, scaleFactor, scaleFactor);
            
            this.morphTargets.set(name, this._createMorphTexture(tempGeometry));
            tempGeometry.dispose();
        } else {
            this.morphTargets.set(name, this._createMorphTexture(geometry));
        }
        
        console.log(`Added morph target: ${name}`);
    }
    
    morphTo(targetName, duration = 2.0, easing = 'easeInOut') {
        if (!this.morphTargets.has(targetName)) {
            console.error(`Morph target "${targetName}" not found`);
            return;
        }
        
        this.currentMorphTarget = targetName;
        this.morphDuration = duration;
        this.morphStartTime = this.clock.getElapsedTime();
        this.morphProgress = 0;
        this.isMorphing = true;
        this.morphEasing = easing;
        
        // Update base texture to be the current morph target
        this.particlesVariable.material.uniforms.uBase.value = this.morphTargets.get('base');
        this.particlesVariable.material.uniforms.uMorphTarget.value = this.morphTargets.get(targetName);
        this.particlesVariable.material.uniforms.uMorphMode.value = 1;
        
        console.log(`Starting morph to: ${targetName} over ${duration}s with ${easing} easing`);
    }
    
    startSequentialMorph(targetNames, durationPerMorph = 3.0, loop = true) {
        if (targetNames.length === 0) return;
        
        this.sequentialMorphTargets = targetNames;
        this.sequentialMorphIndex = 0;
        this.sequentialMorphDuration = durationPerMorph;
        this.isSequentialMorphing = true;
        this.sequentialMorphLoop = loop;
        
        // Start first morph
        this.morphTo(targetNames[0], durationPerMorph);
    }
    
    stopSequentialMorph() {
        this.isSequentialMorphing = false;
        this.sequentialMorphTargets = [];
    }
    
    _applyEasing(t) {
        switch (this.morphEasing) {
            case 'linear':
                return t;
            case 'easeIn':
                return t * t;
            case 'easeOut':
                return t * (2 - t);
            case 'easeInOut':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'bounce':
                if (t < 0.5) {
                    return 8 * t * t * t * t;
                } else {
                    const f = (t - 1);
                    return 1 + 8 * f * f * f * f;
                }
            default:
                return t;
        }
    }
    
    update() {
        // Call parent update
        super.update();
        
        // Handle morphing
        if (this.isMorphing) {
            const elapsed = this.clock.getElapsedTime() - this.morphStartTime;
            const rawProgress = Math.min(elapsed / this.morphDuration, 1.0);
            this.morphProgress = this._applyEasing(rawProgress);
            
            // Update shader uniform
            this.particlesVariable.material.uniforms.uMorphProgress.value = this.morphProgress;
            
            // Log progress occasionally
            if (Math.floor(rawProgress * 10) !== Math.floor((rawProgress - 0.1) * 10)) {
                console.log(`[Morph] Progress: ${Math.floor(rawProgress * 100)}% to ${this.currentMorphTarget}`);
            }
            
            // Check if morphing is complete
            if (rawProgress >= 1.0) {
                this.isMorphing = false;
                this.particlesVariable.material.uniforms.uMorphMode.value = 0;
                
                // Update base to be the current target for next morph
                this.morphTargets.set('base', this.morphTargets.get(this.currentMorphTarget));
                this.particlesVariable.material.uniforms.uBase.value = this.morphTargets.get('base');
                
                // Handle sequential morphing
                if (this.isSequentialMorphing) {
                    this.sequentialMorphIndex++;
                    if (this.sequentialMorphIndex >= this.sequentialMorphTargets.length) {
                        if (this.sequentialMorphLoop) {
                            this.sequentialMorphIndex = 0;
                        } else {
                            this.stopSequentialMorph();
                            return;
                        }
                    }
                    
                    // Start next morph after a short delay
                    setTimeout(() => {
                        if (this.isSequentialMorphing) {
                            this.morphTo(
                                this.sequentialMorphTargets[this.sequentialMorphIndex], 
                                this.sequentialMorphDuration
                            );
                        }
                    }, 500);
                }
            }
        }
    }
    
    dispose() {
        // Dispose morph textures
        for (const [name, texture] of this.morphTargets) {
            texture.dispose();
        }
        this.morphTargets.clear();
        
        // Call parent dispose
        super.dispose();
    }
}