/**
 * CyberParticleEffectSimple.js
 * 
 * Enhanced version with GPGPU flow field simulation and advanced visual effects
 * Based on CyberParticleEffect.js with morphing capability from the simple version
 */

import * as THREE from 'three';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';

export class CyberParticleEffectSimple {
    static COLOR_MODES = {
        RAINBOW_BANDS: 0,
        CYAN_PURPLE: 1,
        ELECTRIC_BLUE: 2,
        HOT_PLASMA: 3,
        MATRIX_GREEN: 4
    };

    constructor(initialGeometry, renderer, options = {}) {
        this.renderer = renderer;
        this.clock = new THREE.Clock();
        this.previousTime = 0;
        
        // Extract geometry
        this.baseGeometry = initialGeometry.isBufferGeometry ? initialGeometry : initialGeometry.geometry;
        if (!this.baseGeometry) {
            throw new Error('Input must be a BufferGeometry or a Mesh with geometry');
        }

        // Options - use spread first, then override with defaults if not provided
        this.options = {
            ...options,
            autoScale: options.autoScale !== undefined ? options.autoScale : true,
            targetSize: options.targetSize || 10,
            particleReduction: options.particleReduction || 0.9 // Default to 70% of particles (30% reduction)
        };

        // Parameters
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
            colorMode: CyberParticleEffectSimple.COLOR_MODES.CYAN_PURPLE,
            digitMode: false
        };

        // Flow field parameters
        this.flowField = {
            influence: 2,
            strength: 4,
            frequency: 0.5
        };

        // Morphing
        this.positions = [];
        this.currentIndex = 0;
        this.morphProgress = 0;
        this.morphDuration = 3.0; // Match particlesExample duration
        this.morphStartTime = 0;
        this.isMorphing = false;
        this.targetIndex = 0;

        this._initialize();
    }

    _initialize() {
        // Process and store base geometry
        const processedGeometry = this._processGeometry(this.baseGeometry);
        
        // Apply particle reduction
        const originalCount = processedGeometry.attributes.position.count;
        this.particleCount = Math.floor(originalCount * this.options.particleReduction);
        
        console.log(`[Initialize] Reducing particles from ${originalCount} to ${this.particleCount} (${Math.round(this.options.particleReduction * 100)}%)`);
        
        // Create reduced position attribute
        const reducedPositions = this._reduceParticles(processedGeometry.attributes.position, this.particleCount);
        this.positions.push(reducedPositions);
        
        // Setup GPGPU
        this._setupGPGPU();
        
        // Create particles
        this._createParticles();
    }

    _processGeometry(geometry) {
        const clonedGeometry = geometry.clone();
        
        // Check for geometry issues
        if (clonedGeometry.attributes.position) {
            const posArray = clonedGeometry.attributes.position.array;
            const vertexCount = clonedGeometry.attributes.position.count;
            console.log(`[ProcessGeometry] Vertex count: ${vertexCount}`);
            
            // Check for degenerate or extreme vertices
            let degenerateCount = 0;
            let farCount = 0;
            const threshold = 100; // Distance threshold for "far" vertices
            
            for (let i = 0; i < vertexCount; i++) {
                const x = posArray[i * 3];
                const y = posArray[i * 3 + 1];
                const z = posArray[i * 3 + 2];
                const dist = Math.sqrt(x * x + y * y + z * z);
                
                if (isNaN(x) || isNaN(y) || isNaN(z) || !isFinite(x) || !isFinite(y) || !isFinite(z)) {
                    degenerateCount++;
                }
                if (dist > threshold) {
                    farCount++;
                }
            }
            
            if (degenerateCount > 0) {
                console.warn(`[ProcessGeometry] Found ${degenerateCount} degenerate vertices!`);
            }
            if (farCount > 0) {
                console.warn(`[ProcessGeometry] Found ${farCount} vertices far from origin (>${threshold} units)`);
                
                // Clean up far vertices by clamping them to bounding box
                console.log(`[ProcessGeometry] Cleaning up outlier vertices...`);
                clonedGeometry.computeBoundingBox();
                const tempBox = clonedGeometry.boundingBox;
                const center = new THREE.Vector3();
                tempBox.getCenter(center);
                const maxRadius = Math.max(
                    tempBox.max.x - center.x,
                    tempBox.max.y - center.y,
                    tempBox.max.z - center.z
                ) * 1.5; // Allow 50% margin
                
                for (let i = 0; i < vertexCount; i++) {
                    const i3 = i * 3;
                    const x = posArray[i3] - center.x;
                    const y = posArray[i3 + 1] - center.y;
                    const z = posArray[i3 + 2] - center.z;
                    const dist = Math.sqrt(x * x + y * y + z * z);
                    
                    if (dist > maxRadius) {
                        // Clamp the vertex to the maximum radius
                        const scale = maxRadius / dist;
                        posArray[i3] = center.x + x * scale;
                        posArray[i3 + 1] = center.y + y * scale;
                        posArray[i3 + 2] = center.z + z * scale;
                    }
                }
                
                clonedGeometry.attributes.position.needsUpdate = true;
            }
        }
        
        // Always compute and log size for debugging
        clonedGeometry.computeBoundingBox();
        const boundingBox = clonedGeometry.boundingBox;
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        console.log(`[ProcessGeometry] Processing with autoScale=${this.options.autoScale}`);
        console.log(`[ProcessGeometry] Original size: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);
        console.log(`[ProcessGeometry] Max dimension: ${maxDimension.toFixed(2)}`);
        
        // Auto-scale if enabled
        if (this.options.autoScale) {
            const scaleFactor = this.options.targetSize / maxDimension;
            console.log(`[ProcessGeometry] Target size: ${this.options.targetSize}, Scale factor: ${scaleFactor.toFixed(2)}`);
            clonedGeometry.scale(scaleFactor, scaleFactor, scaleFactor);
            
            // Verify scaled size
            clonedGeometry.computeBoundingBox();
            const newSize = new THREE.Vector3();
            clonedGeometry.boundingBox.getSize(newSize);
            console.log(`[ProcessGeometry] Scaled size: ${newSize.x.toFixed(2)} x ${newSize.y.toFixed(2)} x ${newSize.z.toFixed(2)}`);
        } else {
            console.log(`[ProcessGeometry] No scaling applied (autoScale=false)`);
        }
        
        return clonedGeometry;
    }

    _reduceParticles(sourceAttribute, targetCount) {
        const sourceArray = sourceAttribute.array;
        const sourceCount = sourceAttribute.count;
        const targetArray = new Float32Array(targetCount * 3);
        
        // Use stratified sampling to maintain good distribution
        const step = sourceCount / targetCount;
        
        for (let i = 0; i < targetCount; i++) {
            // Add some randomness to avoid perfectly regular sampling
            const sourceIndex = Math.floor(i * step + Math.random() * step * 0.5);
            const clampedIndex = Math.min(sourceIndex, sourceCount - 1);
            const sourceI3 = clampedIndex * 3;
            const targetI3 = i * 3;
            
            targetArray[targetI3] = sourceArray[sourceI3];
            targetArray[targetI3 + 1] = sourceArray[sourceI3 + 1];
            targetArray[targetI3 + 2] = sourceArray[sourceI3 + 2];
        }
        
        return new THREE.BufferAttribute(targetArray, 3);
    }

    _setupGPGPU() {
        // Calculate texture size
        const gpgpuSize = Math.ceil(Math.sqrt(this.particleCount));
        
        // Create GPU computation renderer
        this.gpgpuComputation = new GPUComputationRenderer(gpgpuSize, gpgpuSize, this.renderer);

        // Create initial particle positions texture
        const baseParticlesTexture = this.gpgpuComputation.createTexture();
        const positions = this.positions[0].array;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            const i4 = i * 4;

            baseParticlesTexture.image.data[i4 + 0] = positions[i3 + 0];
            baseParticlesTexture.image.data[i4 + 1] = positions[i3 + 1];
            baseParticlesTexture.image.data[i4 + 2] = positions[i3 + 2];
            baseParticlesTexture.image.data[i4 + 3] = Math.random();
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
        this.particlesVariable.material.uniforms.uFlowFieldInfluence = new THREE.Uniform(this.flowField.influence);
        this.particlesVariable.material.uniforms.uFlowFieldStrength = new THREE.Uniform(this.flowField.strength);
        this.particlesVariable.material.uniforms.uFlowFieldFrequency = new THREE.Uniform(this.flowField.frequency);
        this.particlesVariable.material.uniforms.uMorphProgress = new THREE.Uniform(0);
        this.particlesVariable.material.uniforms.uTargetTexture = new THREE.Uniform(null);

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
        this.geometry = new THREE.BufferGeometry();
        this.geometry.setDrawRange(0, this.particleCount);
        this.geometry.setAttribute('aParticlesUv', new THREE.BufferAttribute(particlesUvArray, 2));
        this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1));
        
        // Handle colors
        if (this.baseGeometry.attributes.color) {
            this.geometry.setAttribute('aColor', this.baseGeometry.attributes.color);
        } else {
            // Create default white color
            const colorsArray = new Float32Array(this.particleCount * 3);
            for (let i = 0; i < this.particleCount * 3; i++) {
                colorsArray[i] = 1.0;
            }
            this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colorsArray, 3));
        }

        // Create material
        this.material = new THREE.ShaderMaterial({
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
            depthTest: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide
        });

        // Create points
        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
    }

    addMorphTarget(name, geometryOrMesh) {
        // Extract geometry from mesh if needed
        const geometry = geometryOrMesh.isBufferGeometry ? geometryOrMesh : geometryOrMesh.geometry;
        if (!geometry) {
            console.error(`Cannot extract geometry from morph target "${name}"`);
            return;
        }
        
        // Clone the geometry to avoid modifying the original
        const clonedGeometry = geometry.clone();
        
        // Get the scale of the initial geometry for reference
        const initialBounds = new THREE.Box3();
        const initialPositions = this.positions[0];
        const tempGeometry = new THREE.BufferGeometry();
        tempGeometry.setAttribute('position', initialPositions);
        tempGeometry.computeBoundingBox();
        initialBounds.copy(tempGeometry.boundingBox);
        const initialSize = new THREE.Vector3();
        initialBounds.getSize(initialSize);
        const initialMaxDimension = Math.max(initialSize.x, initialSize.y, initialSize.z);
        
        // Process the geometry with special handling to match initial scale
        const processedGeometry = this._processGeometry(clonedGeometry);
        
        // After processing, check if we need additional scaling to match initial mesh
        processedGeometry.computeBoundingBox();
        const morphBounds = processedGeometry.boundingBox;
        const morphSize = new THREE.Vector3();
        morphBounds.getSize(morphSize);
        const morphMaxDimension = Math.max(morphSize.x, morphSize.y, morphSize.z);
        
        // If sizes are significantly different, apply additional scaling
        if (Math.abs(morphMaxDimension - initialMaxDimension) > 0.1) {
            const additionalScale = initialMaxDimension / morphMaxDimension;
            console.log(`[AddMorphTarget ${name}] Applying additional scale: ${additionalScale.toFixed(2)} to match initial mesh size`);
            processedGeometry.scale(additionalScale, additionalScale, additionalScale);
        }
        
        // Always reduce/resample to match particle count
        const originalCount = processedGeometry.attributes.position.count;
        let positionAttribute;
        
        if (originalCount !== this.particleCount) {
            console.log(`Morph target "${name}" has ${originalCount} vertices, reducing to ${this.particleCount}`);
            // Use the same reduction method as initial geometry
            positionAttribute = this._reduceParticles(processedGeometry.attributes.position, this.particleCount);
        } else {
            positionAttribute = processedGeometry.attributes.position;
        }
        
        this.positions.push(positionAttribute);
        console.log(`Added morph target: ${name} (index ${this.positions.length - 1}) with ${positionAttribute.count} vertices`);
        
        // Log the bounds of the morph target for debugging
        const stats = this._calculateStats(positionAttribute.array);
        console.log(`[MorphTarget ${name}] Final Bounds: X(${stats.minX.toFixed(2)}, ${stats.maxX.toFixed(2)}) Y(${stats.minY.toFixed(2)}, ${stats.maxY.toFixed(2)}) Z(${stats.minZ.toFixed(2)}, ${stats.maxZ.toFixed(2)})`);
        console.log(`[MorphTarget ${name}] Final Size: ${(stats.maxX - stats.minX).toFixed(2)} x ${(stats.maxY - stats.minY).toFixed(2)} x ${(stats.maxZ - stats.minZ).toFixed(2)}`);
        
        // Compare with initial size
        const initialStats = this._calculateStats(this.positions[0].array);
        const initialSizeX = initialStats.maxX - initialStats.minX;
        const morphSizeX = stats.maxX - stats.minX;
        console.log(`[MorphTarget ${name}] Size ratio to initial: ${(morphSizeX / initialSizeX).toFixed(2)}`);
    }
    
    _resamplePositions(sourceAttribute, targetCount) {
        const sourceArray = sourceAttribute.array;
        const sourceCount = sourceAttribute.count;
        const targetArray = new Float32Array(targetCount * 3);
        
        // If we need fewer vertices, sample evenly
        if (targetCount <= sourceCount) {
            const step = sourceCount / targetCount;
            for (let i = 0; i < targetCount; i++) {
                const sourceIndex = Math.floor(i * step);
                const sourceI3 = sourceIndex * 3;
                const targetI3 = i * 3;
                
                targetArray[targetI3] = sourceArray[sourceI3];
                targetArray[targetI3 + 1] = sourceArray[sourceI3 + 1];
                targetArray[targetI3 + 2] = sourceArray[sourceI3 + 2];
            }
        } else {
            // If we need more vertices, distribute them more evenly
            // First, copy all source vertices
            for (let i = 0; i < sourceCount; i++) {
                const sourceI3 = i * 3;
                const targetI3 = i * 3;
                targetArray[targetI3] = sourceArray[sourceI3];
                targetArray[targetI3 + 1] = sourceArray[sourceI3 + 1];
                targetArray[targetI3 + 2] = sourceArray[sourceI3 + 2];
            }
            
            // Then fill remaining vertices by interpolating between existing ones
            const remaining = targetCount - sourceCount;
            for (let i = 0; i < remaining; i++) {
                // Select two random source vertices to interpolate between
                const idx1 = Math.floor(Math.random() * sourceCount);
                const idx2 = Math.floor(Math.random() * sourceCount);
                const t = Math.random(); // interpolation factor
                
                const sourceI3_1 = idx1 * 3;
                const sourceI3_2 = idx2 * 3;
                const targetI3 = (sourceCount + i) * 3;
                
                // Interpolate between the two positions
                targetArray[targetI3] = sourceArray[sourceI3_1] * (1 - t) + sourceArray[sourceI3_2] * t;
                targetArray[targetI3 + 1] = sourceArray[sourceI3_1 + 1] * (1 - t) + sourceArray[sourceI3_2 + 1] * t;
                targetArray[targetI3 + 2] = sourceArray[sourceI3_1 + 2] * (1 - t) + sourceArray[sourceI3_2 + 2] * t;
            }
        }
        
        // Log statistics
        const stats = this._calculateStats(targetArray);
        console.log(`[Resample] Resampled ${sourceCount} → ${targetCount} vertices`);
        console.log(`[Resample] Bounds: X(${stats.minX.toFixed(2)}, ${stats.maxX.toFixed(2)}) Y(${stats.minY.toFixed(2)}, ${stats.maxY.toFixed(2)}) Z(${stats.minZ.toFixed(2)}, ${stats.maxZ.toFixed(2)})`);
        console.log(`[Resample] Center: (${stats.centerX.toFixed(2)}, ${stats.centerY.toFixed(2)}, ${stats.centerZ.toFixed(2)})`);
        
        return new THREE.BufferAttribute(targetArray, 3);
    }
    
    _calculateStats(array) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        let sumX = 0, sumY = 0, sumZ = 0;
        const count = array.length / 3;
        let invalidCount = 0;
        let extremeCount = 0;
        
        for (let i = 0; i < array.length; i += 3) {
            const x = array[i];
            const y = array[i + 1];
            const z = array[i + 2];
            
            // Check for invalid values
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                invalidCount++;
                continue;
            }
            
            // Check for extreme values (likely outliers)
            if (Math.abs(x) > 1000 || Math.abs(y) > 1000 || Math.abs(z) > 1000) {
                extremeCount++;
            }
            
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
            minZ = Math.min(minZ, z);
            maxZ = Math.max(maxZ, z);
            
            sumX += x;
            sumY += y;
            sumZ += z;
        }
        
        if (invalidCount > 0) {
            console.warn(`[Stats] Found ${invalidCount} invalid vertices!`);
        }
        if (extremeCount > 0) {
            console.warn(`[Stats] Found ${extremeCount} extreme vertices (>1000 units from origin)`);
        }
        
        return {
            minX, maxX, minY, maxY, minZ, maxZ,
            centerX: sumX / count,
            centerY: sumY / count,
            centerZ: sumZ / count,
            invalidCount,
            extremeCount
        };
    }

    morphTo(targetIndex, duration = 2.0) {
        if (targetIndex >= this.positions.length) {
            console.error(`Target index ${targetIndex} out of bounds (max: ${this.positions.length - 1})`);
            return;
        }

        console.log(`[Morph] Preparing morph from index ${this.currentIndex} to ${targetIndex}`);
        console.log(`[Morph] Source vertices: ${this.positions[this.currentIndex].count}`);
        console.log(`[Morph] Target vertices: ${this.positions[targetIndex].count}`);

        // Create target texture for GPGPU morphing
        const targetTexture = this.gpgpuComputation.createTexture();
        const targetPositions = this.positions[targetIndex].array;

        for (let i = 0; i < this.particleCount; i++) {
            const i3 = i * 3;
            const i4 = i * 4;

            targetTexture.image.data[i4 + 0] = targetPositions[i3 + 0];
            targetTexture.image.data[i4 + 1] = targetPositions[i3 + 1];
            targetTexture.image.data[i4 + 2] = targetPositions[i3 + 2];
            targetTexture.image.data[i4 + 3] = Math.random();
        }

        // Update GPGPU uniforms for morphing
        this.particlesVariable.material.uniforms.uTargetTexture.value = targetTexture;
        this.particlesVariable.material.uniforms.uMorphProgress.value = 0;
        
        // Reset morph progress
        this.morphProgress = 0;
        this.morphDuration = duration;
        this.morphStartTime = this.clock.getElapsedTime();
        this.isMorphing = true;
        this.targetIndex = targetIndex;
        
        console.log(`[Morph] Started morphing`);
    }

    morphToNext() {
        const nextIndex = (this.currentIndex + 1) % this.positions.length;
        this.morphTo(nextIndex);
    }

    update() {
        const elapsedTime = this.clock.getElapsedTime();
        const deltaTime = elapsedTime - this.previousTime;
        this.previousTime = elapsedTime;

        // Update GPGPU uniforms
        this.particlesVariable.material.uniforms.uTime.value = elapsedTime;
        this.particlesVariable.material.uniforms.uDeltaTime.value = deltaTime;
        this.particlesVariable.material.uniforms.uFlowFieldInfluence.value = this.flowField.influence;
        this.particlesVariable.material.uniforms.uFlowFieldStrength.value = this.flowField.strength;
        this.particlesVariable.material.uniforms.uFlowFieldFrequency.value = this.flowField.frequency;
        
        // Handle morphing
        if (this.isMorphing) {
            const morphElapsed = elapsedTime - this.morphStartTime;
            this.morphProgress = Math.min(morphElapsed / this.morphDuration, 1.0);
            
            // Apply easing
            const easedProgress = this._easeInOutCubic(this.morphProgress);
            this.particlesVariable.material.uniforms.uMorphProgress.value = easedProgress;
            
            // Check if morphing is complete
            if (this.morphProgress >= 1.0) {
                this.isMorphing = false;
                this.currentIndex = this.targetIndex;
                
                // Update the base texture to the new position
                const positions = this.positions[this.currentIndex].array;
                const baseTexture = this.particlesVariable.material.uniforms.uBase.value;
                
                for (let i = 0; i < this.particleCount; i++) {
                    const i3 = i * 3;
                    const i4 = i * 4;
                    baseTexture.image.data[i4 + 0] = positions[i3 + 0];
                    baseTexture.image.data[i4 + 1] = positions[i3 + 1];
                    baseTexture.image.data[i4 + 2] = positions[i3 + 2];
                }
                baseTexture.needsUpdate = true;
                
                console.log(`Morph complete. Now at index ${this.currentIndex}`);
            }
        }

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

    _easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 + 4 * (t - 1) * (t - 1) * (t - 1);
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

    _getGPGPUShader() {
        return `
uniform float uTime;
uniform float uDeltaTime;
uniform sampler2D uBase;
uniform float uFlowFieldInfluence;
uniform float uFlowFieldStrength;
uniform float uFlowFieldFrequency;
uniform float uMorphProgress;
uniform sampler2D uTargetTexture;

${this._getSimplexNoise4D()}

void main()
{
    float time = uTime * 0.2;
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 particle = texture(uParticles, uv);
    vec4 base = texture(uBase, uv);
    
    // Morphing support
    vec4 target = texture(uTargetTexture, uv);
    if (uMorphProgress > 0.0 && target.x != 0.0) {
        base.xyz = mix(base.xyz, target.xyz, uMorphProgress);
    }
    
    // Dead
    if(particle.a >= 1.0)
    {
        particle.a = mod(particle.a, 1.0);
        particle.xyz = base.xyz;
    }

    // Alive
    else
    {
        // Strength
        float strength = simplexNoise4d(vec4(base.xyz * 0.2, time + 1.0));
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
    
    // Create segments for digits
    float seg = 0.0;
    
    if(digit < 0.5) {
        // Draw "0" - make it oval/elliptical
        // Scale x and y differently to create oval shape
        vec2 ovalUV = uv / vec2(0.6, 0.9); // narrower in x, taller in y
        float dist = length(ovalUV);
        
        // Outer oval
        float outer = 1.0 - smoothstep(0.9, 1.0, dist);
        // Inner hole
        float inner = smoothstep(0.4, 0.5, dist);
        
        seg = outer * inner;
    } else {
        // Draw "1" - fix orientation
        // Vertical line
        float vline = 1.0 - smoothstep(0.1, 0.2, abs(uv.x));
        vline *= 1.0 - smoothstep(0.8, 0.9, abs(uv.y));
        
        // Top serif - now pointing right at the bottom (traditional "1" style)
        float serif = 1.0 - smoothstep(0.1, 0.2, abs(uv.x + 0.3)); // shift left
        serif *= 1.0 - smoothstep(0.0, 0.1, uv.y + 0.7); // at bottom
        serif *= smoothstep(-0.4, -0.3, uv.x); // cut off left side
        
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
        // Mode 4: Matrix green - enhanced neon cyber effect
        float digital = fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453);
        
        // Two-toned lime green effect based on #2AFF5C
        vec3 brightGreen = vec3(0.165, 1.0, 0.361); // #2AFF5C in RGB (42/255, 255/255, 92/255)
        vec3 darkGreen = vec3(0.082, 0.5, 0.180); // Darker version of the lime green
        
        // Alternate between colors based on particle ID for digital effect
        float colorMix = mod(vParticleId + digital * 10.0, 2.0);
        holographic = mix(darkGreen, brightGreen, smoothstep(0.3, 0.7, colorMix));
        
        // Add pulsing glow effect
        float pulse = sin(uTime * 3.0 + vParticleId * 0.1) * 0.5 + 0.5;
        holographic *= (0.8 + 0.4 * pulse);
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
    
    // Digital scanline effect for enhanced cyber look
    float scanline = sin(gl_FragCoord.y * 0.5 + uTime * uScanLineSpeed * 2.0);
    scanline = smoothstep(0.0, 0.1, scanline) * 0.1 + 0.9;
    color *= scanline;
    
    // Vertical data streams for Matrix effect
    float dataStream = sin(gl_FragCoord.x * 0.2 - uTime * 3.0);
    dataStream = pow(abs(dataStream), 3.0) * 0.1 + 0.9;
    color *= dataStream;
    
    // Add digital noise for texture
    float digitalNoise = fract(sin(dot(gl_FragCoord.xy * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
    color += vec3(0.0, digitalNoise * 0.05, digitalNoise * 0.02); // Subtle lime green noise
    
    // RGB channel separation glitch
    if(vGlitchOffset > 0.0) {
        float shift = uGlitchIntensity * 0.1;
        color.r *= (1.0 + shift);
        color.b *= (1.0 - shift);
        
        // Random color corruption
        float colorNoise = fract(sin(dot(vec2(uTime, gl_FragCoord.y), vec2(12.9898, 78.233))) * 43758.5453);
        color = mix(color, vec3(colorNoise), uGlitchIntensity * 0.5 * vGlitchOffset);
    }
    
    // Enhanced edge glow effect for neon look
    float edgeGlow = 1.0 - distanceToCenter * 2.0;
    edgeGlow = pow(edgeGlow, 2.0); // Less falloff for brighter glow
    
    // Lime green edge glow matching #2AFF5C
    vec3 glowColor = vec3(0.165, 1.0, 0.361); // #2AFF5C
    color += glowColor * edgeGlow * 0.8;
    
    // Add extra brightness to the core of the digit
    float coreBrightness = 1.0 - smoothstep(0.0, 0.3, distanceToCenter);
    color += vec3(0.165, 0.5, 0.181) * coreBrightness; // Lime green core
    
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