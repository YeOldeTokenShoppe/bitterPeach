/**
 * CyberParticleEffectSimple.js
 * 
 * Simplified version using direct position interpolation instead of GPGPU
 * Based on the MorphingParticles example - more stable and predictable
 */

import * as THREE from 'three';

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
        
        // Extract geometry
        this.baseGeometry = initialGeometry.isBufferGeometry ? initialGeometry : initialGeometry.geometry;
        if (!this.baseGeometry) {
            throw new Error('Input must be a BufferGeometry or a Mesh with geometry');
        }

        // Options - use spread first, then override with defaults if not provided
        this.options = {
            ...options,
            autoScale: options.autoScale !== undefined ? options.autoScale : true,
            targetSize: options.targetSize || 10
        };

        // Parameters
        this.parameters = {
            particleSize: 0.02,
            glitchIntensity: 0.3,
            colorMode: CyberParticleEffectSimple.COLOR_MODES.MATRIX_GREEN,
            digitMode: false
        };

        // Morphing
        this.positions = [];
        this.currentIndex = 0;
        this.morphProgress = 0;
        this.morphDuration = 2.0;
        this.morphStartTime = 0;
        this.isMorphing = false;
        this.targetIndex = 0;

        this._initialize();
    }

    _initialize() {
        // Process and store base geometry
        const processedGeometry = this._processGeometry(this.baseGeometry);
        this.positions.push(processedGeometry.attributes.position);
        this.particleCount = processedGeometry.attributes.position.count;
        
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

    _createParticles() {
        // Create sizes array
        const sizesArray = new Float32Array(this.particleCount);
        for (let i = 0; i < this.particleCount; i++) {
            sizesArray[i] = Math.random();
        }

        // Create geometry
        this.geometry = new THREE.BufferGeometry();
        
        // Set initial positions
        const initialPositions = this.positions[0].clone();
        this.geometry.setAttribute('position', initialPositions);
        this.geometry.setAttribute('aPositionTarget', initialPositions.clone());
        this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizesArray, 1));
        
        console.log(`[CreateParticles] Initial particle count: ${this.particleCount}`);
        console.log(`[CreateParticles] Initial position array length: ${initialPositions.array.length}`);

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
                uTime: new THREE.Uniform(0),
                uProgress: new THREE.Uniform(0),
                uGlitchIntensity: new THREE.Uniform(this.parameters.glitchIntensity),
                uColorMode: new THREE.Uniform(this.parameters.colorMode),
                uDigitMode: new THREE.Uniform(this.parameters.digitMode ? 1.0 : 0.0)
            },
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: THREE.AdditiveBlending
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
        
        // Apply the same processing options as the initial geometry
        const processedGeometry = this._processGeometry(clonedGeometry);
        
        // Ensure same vertex count by resampling if needed
        let positionAttribute = processedGeometry.attributes.position;
        
        if (positionAttribute.count !== this.particleCount) {
            console.warn(`Morph target "${name}" has different vertex count. Resampling...`);
            console.warn(`  Source: ${this.particleCount} vertices`);
            console.warn(`  Target: ${positionAttribute.count} vertices`);
            
            // Resample to match particle count
            positionAttribute = this._resamplePositions(positionAttribute, this.particleCount);
        }
        
        this.positions.push(positionAttribute);
        console.log(`Added morph target: ${name} (index ${this.positions.length - 1}) with ${positionAttribute.count} vertices`);
        
        // Log the bounds of the morph target for debugging
        const stats = this._calculateStats(positionAttribute.array);
        console.log(`[MorphTarget ${name}] Bounds: X(${stats.minX.toFixed(2)}, ${stats.maxX.toFixed(2)}) Y(${stats.minY.toFixed(2)}, ${stats.maxY.toFixed(2)}) Z(${stats.minZ.toFixed(2)}, ${stats.maxZ.toFixed(2)})`);
        console.log(`[MorphTarget ${name}] Size: ${(stats.maxX - stats.minX).toFixed(2)} x ${(stats.maxY - stats.minY).toFixed(2)} x ${(stats.maxZ - stats.minZ).toFixed(2)}`);
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

        // Update geometry attributes
        const sourcePositions = this.positions[this.currentIndex];
        const targetPositions = this.positions[targetIndex];
        
        // Debug: Log position stats
        const sourceStats = this._calculateStats(sourcePositions.array);
        const targetStats = this._calculateStats(targetPositions.array);
        console.log(`[Morph] Source bounds: ${(sourceStats.maxX - sourceStats.minX).toFixed(2)} x ${(sourceStats.maxY - sourceStats.minY).toFixed(2)} x ${(sourceStats.maxZ - sourceStats.minZ).toFixed(2)}`);
        console.log(`[Morph] Target bounds: ${(targetStats.maxX - targetStats.minX).toFixed(2)} x ${(targetStats.maxY - targetStats.minY).toFixed(2)} x ${(targetStats.maxZ - targetStats.minZ).toFixed(2)}`);
        
        // Copy positions to geometry attributes
        this.geometry.setAttribute('position', sourcePositions.clone());
        this.geometry.setAttribute('aPositionTarget', targetPositions.clone());
        
        // Mark attributes as needing update
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.attributes.aPositionTarget.needsUpdate = true;
        
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
        
        // Update time uniform
        this.material.uniforms.uTime.value = elapsedTime;
        
        // Handle morphing
        if (this.isMorphing) {
            const morphElapsed = elapsedTime - this.morphStartTime;
            this.morphProgress = Math.min(morphElapsed / this.morphDuration, 1.0);
            
            // Apply easing
            const easedProgress = this._easeInOutCubic(this.morphProgress);
            this.material.uniforms.uProgress.value = easedProgress;
            
            // Check if morphing is complete
            if (this.morphProgress >= 1.0) {
                this.isMorphing = false;
                this.currentIndex = this.targetIndex;
                console.log(`Morph complete. Now at index ${this.currentIndex}`);
            }
        }
        
        // Update other parameters
        this.material.uniforms.uSize.value = this.parameters.particleSize;
        this.material.uniforms.uGlitchIntensity.value = this.parameters.glitchIntensity;
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
    }

    _getVertexShader() {
        return `
uniform vec2 uResolution;
uniform float uSize;
uniform float uTime;
uniform float uProgress;
uniform float uGlitchIntensity;

attribute vec3 aPositionTarget;
attribute float aSize;

varying vec3 vColor;
varying float vParticleId;

${this._getSimplexNoise3D()}

void main()
{
    // Calculate noise for staggered morphing
    float noiseOrigin = simplexNoise3d(position * 0.2);
    float noiseTarget = simplexNoise3d(aPositionTarget * 0.2);
    float noise = mix(noiseOrigin, noiseTarget, uProgress);
    noise = smoothstep(-1.0, 1.0, noise);
    
    // Staggered morphing effect
    float duration = 0.6;
    float delay = (1.0 - duration) * noise;
    float end = delay + duration;
    float progress = smoothstep(delay, end, uProgress);
    
    // Mix positions
    vec3 mixedPosition = mix(position, aPositionTarget, progress);
    
    // Add subtle movement
    float movement = sin(uTime + noise * 10.0) * 0.02;
    mixedPosition += vec3(movement, movement * 0.5, movement * 0.3);
    
    // Glitch displacement
    float glitchTime = floor(uTime * 10.0) / 10.0;
    float glitchNoise = fract(sin(dot(vec2(glitchTime, noise), vec2(12.9898, 78.233))) * 43758.5453);
    float glitchThreshold = step(0.99 - uGlitchIntensity * 0.1, glitchNoise);
    
    vec3 glitchOffset = vec3(
        (fract(glitchNoise * 17.0) - 0.5) * 2.0 * uGlitchIntensity * glitchThreshold,
        (fract(glitchNoise * 31.0) - 0.5) * 2.0 * uGlitchIntensity * glitchThreshold,
        0.0
    );
    
    // Final position
    vec4 modelPosition = modelMatrix * vec4(mixedPosition + glitchOffset, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;
    
    // Point size
    float size = 1.0;
    float perspectiveFactor = 1.0 / -viewPosition.z;
    gl_PointSize = size * aSize * uSize * uResolution.y * perspectiveFactor;
    gl_PointSize = clamp(gl_PointSize, 2.0, 128.0);
    
    // Varyings
    vColor = vec3(1.0);
    vParticleId = float(gl_VertexID);
}`;
    }

    _getFragmentShader() {
        return `
uniform float uTime;
uniform float uGlitchIntensity;
uniform float uColorMode;
uniform float uDigitMode;

varying vec3 vColor;
varying float vParticleId;

vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float drawDigit(vec2 uv, float digit) {
    uv = uv * 3.0 - 1.5;
    float seg = 0.0;
    
    if(digit < 0.5) {
        // Draw "0"
        vec2 ovalUV = uv / vec2(0.6, 0.9);
        float dist = length(ovalUV);
        float outer = 1.0 - smoothstep(0.9, 1.0, dist);
        float inner = smoothstep(0.4, 0.5, dist);
        seg = outer * inner;
    } else {
        // Draw "1"
        float vline = 1.0 - smoothstep(0.1, 0.2, abs(uv.x));
        vline *= 1.0 - smoothstep(0.8, 0.9, abs(uv.y));
        float serif = 1.0 - smoothstep(0.1, 0.2, abs(uv.x + 0.3));
        serif *= 1.0 - smoothstep(0.0, 0.1, uv.y + 0.7);
        serif *= smoothstep(-0.4, -0.3, uv.x);
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
        // Digital mode
        float digit = mod(vParticleId, 2.0);
        alpha = drawDigit(gl_PointCoord, digit);
        if(alpha < 0.01) discard;
    } else {
        // Normal particle mode - make particles more visible
        alpha = 1.0 - smoothstep(0.2, 0.5, distanceToCenter);
        alpha = max(alpha, 0.3); // Ensure minimum visibility
    }
    
    vec3 color = vColor;
    
    // Color modes
    if(uColorMode < 0.5) {
        // Rainbow
        float hue = mod(vParticleId * 0.01 + uTime * 0.2, 1.0);
        color = hsv2rgb(vec3(hue, 0.8, 1.0));
    }
    else if(uColorMode < 1.5) {
        // Cyan-Purple
        float gradient = sin(vParticleId * 0.1 + uTime) * 0.5 + 0.5;
        color = mix(vec3(0.0, 1.0, 1.0), vec3(1.0, 0.0, 1.0), gradient);
    }
    else if(uColorMode < 2.5) {
        // Electric blue
        color = vec3(0.0, 0.7, 1.0);
    }
    else if(uColorMode < 3.5) {
        // Hot plasma
        color = vec3(1.0, 0.5, 0.0);
    }
    else {
        // Matrix green
        color = vec3(0.0, 1.0, 0.2);
    }
    
    // Edge glow
    float edgeGlow = 1.0 - distanceToCenter * 2.0;
    edgeGlow = pow(edgeGlow, 3.0);
    color += vec3(0.0, 0.7, 1.0) * edgeGlow * 0.5;
    
    gl_FragColor = vec4(color, alpha);
}`;
    }

    _getSimplexNoise3D() {
        return `
//    Simplex 3D Noise 
//    by Ian McEwan, Ashima Arts
//
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float simplexNoise3d(vec3 v)
{
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;
    i = mod(i, 289.0 ); 
    vec4 p = permute( permute( permute( i.z + vec4(0.0, i1.z, i2.z, 1.0 )) + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))  + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 1.0/7.0;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);
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
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}`;
    }
}