import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const CircularIslandWithRoad = () => {
    const mountRef = useRef(null);
    
    useEffect(() => {
        // Simplex noise function
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
            vec4 taylorInvSqrt(vec4 r) {
                return 1.79284291400159 - 0.85373472095314 * r;
            }
            float snoise(vec3 v) {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0);
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
                vec3 i = floor(v + dot(v, C.yyy));
                vec3 x0 = v - i + dot(i, C.xxx);
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min(g.xyz, l.zxy);
                vec3 i2 = max(g.xyz, l.zxy);
                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy;
                vec3 x3 = x0 - D.yyy;
                i = mod289(i);
                vec4 p = permute(permute(permute(
                    i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                float n_ = 0.142857142857;
                vec3 ns = n_ * D.wyz - D.xzx;
                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_);
                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);
                vec4 b0 = vec4(x.xy, y.xy);
                vec4 b1 = vec4(x.zw, y.zw);
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));
                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
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
                return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
            }
        `;

        // Scene setup
        const scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x000000, 10, 100);
        
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 20, 40);
        camera.lookAt(0, 0, 0);
        
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);
        
        // // Manual camera controls
        // let mouseX = 0;
        // let mouseY = 0;
        // let targetX = 0;
        // let targetY = 0;
        // let isDragging = false;
        // let previousMouseX = 0;
        // let previousMouseY = 0;
        // let cameraDistance = 40;
        // let cameraAngleX = 0;

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 10;
        controls.maxDistance = 100;
        controls.maxPolarAngle = Math.PI * 0.45; // Limit camera angle to prevent going below road
        controls.minPolarAngle = 0; // Prevent camera from flipping
        controls.target.set(0, 0, 0); // Keep focus at center
        controls.update();
        

        

        
        // const handleWheel = (e) => {
        //     cameraDistance = Math.max(10, Math.min(100, cameraDistance + e.deltaY * 0.1));
        // };
        

        
        // Speed parameter
        const speed = 1.0;
        const animationEnabled = true; // Set to false to stop all animation
        
        // Create the island terrain plane
        const planeGeom = new THREE.PlaneGeometry(100, 100, 200, 200);
        planeGeom.rotateX(-Math.PI * 0.5);
        
        // Create shader material for terrain
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
                varying float vIslandMask;
                ` + noise + `
                
                void main() {
                    vUv = uv;
                    vec3 transformed = position;
                    
                    // Calculate distance from center for circular island
                    float distFromCenter = length(transformed.xz);
                    float islandRadius = 30.0;
                    
                    // Create sharp island edge
                    vIslandMask = step(distFromCenter, islandRadius);
                    
                    // Apply wave effect to island areas
                    if (vIslandMask > 0.0) {
                        // Use world position for noise sampling, not UV
                        vec3 worldPos = transformed;
                        
                        // Animate along Z axis (forward/backward in our scene)
                        float t = time * 0.01 * ` + speed.toFixed(1) + `;
                        worldPos.z += t * 10.0; // Scale up movement for noise sampling
                        
                        // Create terrain height using world position
                        // Much lower frequency (0.03 instead of 0.1) for fewer, larger hills
                        float waveHeight = snoise(vec3(worldPos.xz * 0.03, 0.0)) * 5.0;
                        
                        // Flatten terrain where road will be
                        float roadCenterZ = sin(transformed.x * 0.05) * 8.0;
                        float distFromRoad = abs(transformed.z - roadCenterZ);
                        
                        // Match source's road stripe effect
                        waveHeight *= smoothstep(5.0, 15.0, distFromRoad);
                        
                        // Apply island mask fade
                        waveHeight *= vIslandMask;
                        
                        transformed.y = waveHeight;
                    }
                    
                    // Create vertical drop at island edge
                    if (vIslandMask < 0.5) {
                        transformed.y -= 8.0;
                    }
                    
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
                varying float vIslandMask;
                
                float line(vec3 position, float width, vec3 step) {
                    vec3 tempCoord = position / step;
                    vec2 coord = tempCoord.xz;
                    
                    // Animate the grid moving along X axis (road direction)
                    coord.x += time * ` + speed.toFixed(1) + ` * 0.5;
                    
                    vec2 grid = abs(fract(coord - 0.5) - 0.5) / (fwidth(coord) * width);
                    float line = min(grid.x, grid.y);
                    return min(line, 1.0);
                }
                
                void main() {
                    vec3 finalColor;
                    
                    if (vIslandMask < 0.01) {
                        // Water/void outside island
                        finalColor = vec3(0.0, 0.1, 0.2);
                    } else {
                        // Island terrain with grid - black
                        float l = line(vPos, 1.0, vec3(2.0));
                        vec3 baseColor = vec3(1.0, 0.0, 0.933); // Pink grid
                        vec3 terrainDark = vec3(0.0, 0.0, 0.0); // Black terrain
                        finalColor = mix(baseColor, terrainDark, l);
                    }
                    
                    // Apply fog
                    float depth = gl_FragCoord.z / gl_FragCoord.w;
                    float fogFactor = smoothstep(fogNear, fogFar, depth);
                    finalColor = mix(finalColor, fogColor, fogFactor);
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            fog: true
        });
        
        const plane = new THREE.Mesh(planeGeom, planeMat);
        scene.add(plane);
        
        // Create curved road as separate geometry
        const roadCurve = new THREE.CatmullRomCurve3([]);
        const roadPoints = [];
        const segments = 50;
        
        // Generate curved path
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = (t - 0.5) * 60; // From -30 to 30
            const z = Math.sin(x * 0.05) * 8; // Curved path
            const y = 0.1; // Back to slightly above terrain since it's now flat
            roadPoints.push(new THREE.Vector3(x, y, z));
        }
        
        roadCurve.points = roadPoints;
        
        // Create road geometry using BufferGeometry
        const roadGeometry = new THREE.BufferGeometry();
        const roadVertices = [];
        const roadIndices = [];
        const roadWidth = 6.0;
        
        // Generate road vertices along the curve
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const x = (t - 0.5) * 60; // From -30 to 30
            const z = Math.sin(x * 0.05) * 8; // Curved path
            const y = 0.1; // Back to slightly above terrain since it's now flat
            
            // Calculate perpendicular direction for road width
            const dx = 1;
            const dz = Math.cos(x * 0.05) * 8 * 0.05;
            const len = Math.sqrt(dx * dx + dz * dz);
            const perpX = -dz / len;
            const perpZ = dx / len;
            
            // Left edge
            roadVertices.push(x + perpX * roadWidth, y, z + perpZ * roadWidth);
            // Right edge
            roadVertices.push(x - perpX * roadWidth, y, z - perpZ * roadWidth);
            
            // Create triangles
            if (i < segments) {
                const base = i * 2;
                roadIndices.push(base, base + 1, base + 2);
                roadIndices.push(base + 1, base + 3, base + 2);
            }
        }
        
        roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
        roadGeometry.setIndex(roadIndices);
        roadGeometry.computeVertexNormals();
        
        // Road shader material
        const roadMat = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                fogColor: { value: scene.fog.color },
                fogNear: { value: scene.fog.near },
                fogFar: { value: scene.fog.far }
            },
            vertexShader: `
                varying vec3 vPos;
                void main() {
                    vPos = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 fogColor;
                uniform float fogNear;
                uniform float fogFar;
                varying vec3 vPos;
                
                float line(vec3 position, float width, vec3 step) {
                    // For road grid, match the exact curve formula from the road geometry
                    // Using the same sin curve: z = sin(x * 0.05) * 8.0
                    float roadCenterZ = sin(position.x * 0.05) * 8.0;
                    
                    // Simple approach: just offset the grid based on the curve
                    vec3 tempCoord = position / step;
                    vec2 coord = tempCoord.xz;
                    
                    // Adjust Z coordinate to follow the road curve
                    coord.y -= roadCenterZ / step.z;
                    
                    // Animate along X
                    coord.x += time * ` + speed.toFixed(1) + ` * 0.5;
                    
                    vec2 grid = abs(fract(coord - 0.5) - 0.5) / (fwidth(coord) * width);
                    float line = min(grid.x, grid.y);
                    return min(line, 1.0);
                }
                
                float dashLine(vec3 position) {
                    // Create dashed center line
                    float centerDist = abs(position.z - sin(position.x * 0.05) * 8.0); // Distance from road center
                    float lineWidth = 0.2;
                    float dashLength = 3.0;
                    float dashGap = 2.0;
                    
                    // Animate dashes moving along road
                    float animatedX = position.x + time * ` + speed.toFixed(1) + ` * 2.0;
                    float dashPattern = step(0.5, fract(animatedX / (dashLength + dashGap)));
                    
                    // Line mask
                    float lineMask = 1.0 - smoothstep(0.0, lineWidth, centerDist);
                    
                    return lineMask * dashPattern;
                }
                
                void main() {
                    // Check if within island radius
                    float distFromCenter = length(vPos.xz);
                    if (distFromCenter > 30.0) {
                        discard;
                    }
                    
                    // Road surface - blue with pink grid
                    float l = line(vPos, 1.0, vec3(2.0));
                    vec3 roadBase = vec3(0.0, 0.75, 1.0); // Cyan blue
                    vec3 gridColor = vec3(1.0, 0.0, 0.933); // Pink grid
                    vec3 roadColor = mix(gridColor, roadBase, l);
                    
                    // Add animated dashed center line
                    float centerLine = dashLine(vPos);
                    vec3 lineColor = vec3(1.0, 1.0, 1.0); // White
                    vec3 finalColor = mix(roadColor, lineColor, centerLine * 0.8);
                    
                    // Apply fog
                    float depth = gl_FragCoord.z / gl_FragCoord.w;
                    float fogFactor = smoothstep(fogNear, fogFar, depth);
                    finalColor = mix(finalColor, fogColor, fogFactor);
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `,
            fog: true,
            side: THREE.DoubleSide
        });
        
        const road = new THREE.Mesh(roadGeometry, roadMat);
        scene.add(road);
        
        // Add some ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
        
        // Create simple palm trees using a group
        const palmGroup = new THREE.Group();
        
        // Create palm positions along the curved road
        const palmCount = 20;
        
        for (let i = 0; i < palmCount; i++) {
            const palm = new THREE.Group();
            
            // Create trunk
            const trunkGeom = new THREE.CylinderGeometry(0.25, 0.125, 10, 5);
            const trunkMat = new THREE.MeshBasicMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeom, trunkMat);
            trunk.position.y = 5;
            palm.add(trunk);
            
            // Create leaves
            const leafMat = new THREE.MeshBasicMaterial({ 
                color: 0x00ff88, 
                side: THREE.DoubleSide 
            });
            
            for (let j = 0; j < 8; j++) {
                const leafGeom = new THREE.ConeGeometry(2, 4, 4);
                const leaf = new THREE.Mesh(leafGeom, leafMat);
                
                const angle = (j / 8) * Math.PI * 2;
                leaf.position.set(
                    Math.cos(angle) * 1.5,
                    10,
                    Math.sin(angle) * 1.5
                );
                leaf.rotation.z = Math.PI / 6;
                leaf.lookAt(new THREE.Vector3(0, 12, 0));
                palm.add(leaf);
            }
            
            // Position palm along the curved road
            const t = (i / palmCount - 0.5) * 60;
            const roadZ = Math.sin(t * 0.05) * 8;
            const side = (i % 2) * 2 - 1;
            
            palm.position.set(t, 0, roadZ + side * 12);
            palm.scale.set(0.5, 0.5, 0.5);
            
            palmGroup.add(palm);
        }
        
        // scene.add(palmGroup);
        
        // Store reference for animation
        const palms = palmGroup;
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            // Update time uniforms only if animation is enabled
            if (animationEnabled) {
                planeMat.uniforms.time.value += 0.00;
                roadMat.uniforms.time.value += 0.00;
                
                // Animate palms
                // palms.children.forEach((palm, i) => {
                //     // Move palms in opposite direction (negative) to match terrain/road movement
                //     palm.position.x -= 0.016 * speed * 0.5;
                    
                //     // Wrap around when they go off screen
                //     if (palm.position.x > 30) {
                //         palm.position.x -= 60;
                //     } else if (palm.position.x < -30) {
                //         palm.position.x += 60;
                //     }
                    
                //     // Update Z position to follow road curve at new X position
                //     const roadZ = Math.sin(palm.position.x * 0.05) * 8;
                //     const side = (i % 2) * 2 - 1;
                //     palm.position.z = roadZ + side * 12;
                // });
            }
            

            
            renderer.render(scene, camera);
        }
        
        // Handle window resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        
        window.addEventListener('resize', handleResize);
        
        animate();
        
        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            renderer.dispose();
            mountRef.current?.removeChild(renderer.domElement);
            controls.dispose();
        };
    }, []);
    
    return (
        <div ref={mountRef} style={{ 
            width: '100vw', 
            height: '100vh', 
            margin: 0, 
            padding: 0, 
            overflow: 'hidden',
            background: '#000'
        }} />
    );
};

export default CircularIslandWithRoad;