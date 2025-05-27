import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TextureLoader } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import ScrollDetailViewer from './ScrollDetailViewer';

const MoonScene = forwardRef(
  ({ modelRef, modelAnimations, modelCenter, onControlsCreated, onSpawnReady, rocketModelVisible, onOpenScrollDetail, scrollMessage, isMobileView }, ref) => {
    const { scene, camera, gl } = useThree();
    const controlsRef = useRef();
    const moonsRef = useRef([]);
    const bodiesRef = useRef([]);
    const physicsRef = useRef({ world: null });
    const ammoRef = useRef(null);
    const moonTextureRef = useRef(null);
    const isPhysicsInitialized = useRef(false);
    const [textureLoaded, setTextureLoaded] = useState(false);
    const [textureError, setTextureError] = useState(false);

    // Add this state near the top of MoonScene component
    const [isMobile, setIsMobile] = useState(false);

    // State for alligator hit detection
    const [isAlligatorHit, setIsAlligatorHit] = useState(false);
    const alligatorHitTimeoutRef = useRef(null);
    const alligatorSkinMeshRef = useRef(null); // Ref to store the alligator's SKIN mesh
    const originalMaterialStatesRef = useRef([]); // Store array of { material, originalColor, originalEmissive, originalIntensity }

    // Refs and state for Alligator Scroll interaction
    const alligatorScrollObjectRef = useRef(null); // Parent object of the scroll
    const scrollAnimationMixerRef = useRef(null);
    const openScrollActionRef = useRef(null);
    const closeScrollActionRef = useRef(null);
    const animationsReadyRef = useRef(false); // To ensure animation setup runs once when ready
    const [scrollObjectFound, setScrollObjectFound] = useState(false); // New state
    const originalScrollMaterialStatesRef = useRef([]); // For scroll glow

    // New ref for tracking scroll materials that need pulsing
    const glowingScrollMaterialsRef = useRef([]);
    
    const maxProjectiles = 50; // Increased from 20 to 50 for more projectiles
    const projectileLifespan = 60000; // Increased to 60 seconds (1 minute) for much longer visibility
    const projectilePoolRef = useRef([]);
    const clockRef = useRef(new THREE.Clock());

    // Constants for physics tuning - match original values
    const MOON_FRICTION = 0.1;
    const MOON_RESTITUTION = 0.7;
    const GROUND_FRICTION = 0.1; // Reduced from 1.0 to allow objects to slide more
    const GROUND_RESTITUTION = 1; // Adjusted from 1.0 for more controlled bouncing
    const MODEL_FRICTION = 0.1;
    const MODEL_RESTITUTION = 0.7;
    const roomRadius = 30;
    const roomHeight = 200;
    const floorRadius = 30;
    const mixer = new THREE.AnimationMixer();
    const mixersRef = useRef([]);

    // Optimize physics body creation with shape caching
    const shapeCache = useRef(new Map());

    // Add these constants at the top of your component
    const COLLISION_GROUP_DEFAULT = 1;
    const COLLISION_GROUP_WALL = 2;
    const COLLISION_GROUP_MOON = 4;
    const COLLISION_GROUP_PROJECTILE = 8;
    const COLLISION_GROUP_OUTER_WALL = 16; // New collision group for outer wall
    const COLLISION_GROUP_ALLIGATOR = 32; // New collision group for alligator

    // Wrap setupScene in useCallback
    const setupScene = useCallback(() => {
      if (controlsRef.current) return;

      const controls = new OrbitControls(camera, gl.domElement);
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.2;
      controls.enableDamping = true;
      controls.enablePan = true;
      controls.enableZoom = true;
      controls.minDistance = 1;
      controls.maxDistance = 100;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2;
      controls.zoomToCursor = true;
      controls.zoomSpeed = 2.0; // Increase zoom speed
      
      // Add a console log to verify controls settings
      console.log("MoonScene: OrbitControls initialized with settings:", {
        enableZoom: controls.enableZoom,
        zoomSpeed: controls.zoomSpeed,
        minDistance: controls.minDistance,
        maxDistance: controls.maxDistance
      });

      // Add vertical panning limits
      controls.maxPanUp = 10; // Limit upward panning to 10 units
      controls.maxPanDown = 10; // Limit downward panning to 10 units
      controls.panSpeed = 0.5; // Optional: adjust pan speed for smoother control

      // Use modelCenter if provided, or a default target
      const targetPosition = modelCenter || new THREE.Vector3(0, 15, 0);
      controls.target.copy(targetPosition);

      // Don't override camera position, just update controls
      controls.update();
      controlsRef.current = controls;

      // If we have an onControlsCreated callback, call it
      if (onControlsCreated) {
        console.log('MoonScene: Calling onControlsCreated with controls');
        onControlsCreated(controls);
      }
    }, [camera, gl.domElement, modelCenter, onControlsCreated]);

    // Add this useEffect for resize detection
    useEffect(() => {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < 431); // Adjust breakpoint if needed
      };
      checkMobile(); // Initial check
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    // Add a new useEffect specifically to force camera positioning
    useEffect(() => {
      // Apply camera positioning immediately for rocket scenarios, with delay for others
      const applySettings = () => {
        if (camera && controlsRef.current) {
          const targetPosition = modelCenter || new THREE.Vector3(0, 5, 0);

          // --- Apply different settings based on isMobile and rocketModelVisible ---
          if (isMobile) {
            camera.fov = 50; // Smaller FOV for mobile
            if (rocketModelVisible) {
              camera.position.set(0, 0, 60); // Much further back position for mobile when rocket is visible
              console.log("Applying MOBILE camera settings with ROCKET:", {
                fov: camera.fov,
                pos: camera.position,
              });
            } else {
              camera.position.set(0, 0, 20); // Original mobile position
              console.log("Applying MOBILE camera settings:", {
                fov: camera.fov,
                pos: camera.position,
              });
            }
          } 
          else {
            camera.fov = 35; // Original desktop FOV
            if (rocketModelVisible) {
              camera.position.set(0, 0, 100); // Further back position for desktop when rocket is visible
              console.log("Applying DESKTOP camera settings with ROCKET:", {
                fov: camera.fov,
                pos: camera.position,
              });
            } else {
              camera.position.set(0, 0, 80); // Original desktop position
              console.log("Applying DESKTOP camera settings:", {
                fov: camera.fov,
                pos: camera.position,
              });
            }
          }
          // --- End changes ---

          controlsRef.current.target.copy(targetPosition);
          camera.lookAt(targetPosition);
          camera.updateProjectionMatrix(); // Important after changing fov or position
          controlsRef.current.update();
        }
      };

      // For rocket scenarios, apply immediately to prevent visual jump
      if (rocketModelVisible) {
        applySettings();
      } else {
        // For non-rocket scenarios, keep the original delay
        const timer = setTimeout(applySettings, 500);
        return () => clearTimeout(timer);
      }
    }, [camera, modelCenter, isMobile, rocketModelVisible]); // Add rocketModelVisible to dependency array

    useEffect(() => {
      const loader = new THREE.CubeTextureLoader();
      loader.load(
        [
          "https://threejs.org/examples/textures/cube/pisa/px.png",
          "https://threejs.org/examples/textures/cube/pisa/nx.png",
          "https://threejs.org/examples/textures/cube/pisa/py.png",
          "https://threejs.org/examples/textures/cube/pisa/ny.png",
          "https://threejs.org/examples/textures/cube/pisa/pz.png",
          "https://threejs.org/examples/textures/cube/pisa/nz.png",
        ],
        cubeTexture => {
          // Create a PMREMGenerator to process the cube texture
          const pmremGenerator = new THREE.PMREMGenerator(gl);
          pmremGenerator.compileEquirectangularShader();

          // Process the cube texture
          const envMap = pmremGenerator.fromCubemap(cubeTexture);

          // Set the environment map with reduced intensity
          scene.environment = envMap.texture;

          // Set environment intensity (works with r3f/drei)
          // For older Three.js versions, we can adjust material properties instead
          if (scene.environmentIntensity !== undefined) {
            scene.environmentIntensity = 0.5; // Adjust this value between 0.0-1.0
          }

          // Clean up
          pmremGenerator.dispose();

          scene.background = new THREE.Color(0x111111); // neutral background
        }
      );
    }, [scene, gl]);
    useEffect(() => {
      setupScene(); // ✅ Initialize controls only once
      return () => controlsRef.current?.dispose(); // Cleanup on unmount
    }, []);

    useEffect(() => {
      // ✅ Update controls dynamically when modelCenter changes
      if (controlsRef.current && modelCenter) {
        controlsRef.current.target.copy(modelCenter);
        controlsRef.current.update();
      }
    }, [modelCenter]);

    // Add texture loading state effect
    useEffect(() => {
      const textureLoader = new TextureLoader();

      // Create a promise-based texture loader
      const loadTexture = () => {
        return new Promise((resolve, reject) => {
          textureLoader.load(
            "/lunar_color.jpg",
            texture => {
              texture.anisotropy = 16;
              texture.encoding = THREE.sRGBEncoding;
              texture.needsUpdate = true;
              resolve(texture);
            },
            undefined,
            error => {
              console.error("Failed to load lunar texture:", error);
              reject(error);
            }
          );
        });
      };

      // Try to load texture with retries
      const attemptTextureLoad = async (retries = 3) => {
        for (let i = 0; i < retries; i++) {
          try {
            const texture = await loadTexture();
            moonTextureRef.current = texture;
            setTextureLoaded(true);
            setTextureError(false);
            console.log("Moon texture loaded successfully");
            return;
          } catch (error) {
            console.warn(
              `Texture load attempt ${i + 1} failed, ${retries - i - 1} retries remaining`
            );
            if (i === retries - 1) {
              setTextureError(true);
              // Create a fallback texture
              const fallbackTexture = new THREE.Texture();
              fallbackTexture.needsUpdate = true;
              moonTextureRef.current = fallbackTexture;
            } else {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      };

      attemptTextureLoad();

      return () => {
        // Cleanup texture on unmount
        if (moonTextureRef.current) {
          moonTextureRef.current.dispose();
        }
      };
    }, []);

    const initPhysics = async () => {
      if (ammoRef.current) return ammoRef.current; // Prevent multiple Ammo instances

      try {
        if (typeof Ammo !== "undefined" && ammoRef.current) {
          return ammoRef.current;
        }

        if (!window.Ammo) {
          window.Ammo = await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "/ammo/ammo.wasm.js";
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);

            script.onload = () => {
              Ammo({
                INITIAL_MEMORY: 128 * 1024 * 1024, // 128MB WebAssembly Heap
              })
                .then(resolve)
                .catch(reject);
            };

            script.onerror = () => reject(new Error("Failed to load Ammo.js"));
          });
        }

        const AmmoLib = window.Ammo; // Store globally to avoid redundant reloads
        ammoRef.current = AmmoLib;

        // Physics World Setup
        const collisionConfig = new AmmoLib.btDefaultCollisionConfiguration();
        const dispatcher = new AmmoLib.btCollisionDispatcher(collisionConfig);
        const broadphase = new AmmoLib.btDbvtBroadphase();
        const solver = new AmmoLib.btSequentialImpulseConstraintSolver();
        const world = new AmmoLib.btDiscreteDynamicsWorld(
          dispatcher,
          broadphase,
          solver,
          collisionConfig
        );

        world.setGravity(new AmmoLib.btVector3(0, -10, 0));
        physicsRef.current.world = world;
        isPhysicsInitialized.current = true;

        return AmmoLib;
      } catch (error) {
        console.error("Failed to initialize physics:", error);
        return null;
      }
    };

    useEffect(() => {
      if (!scene) return;

      // Create wall
      const wallGeometry = new THREE.CylinderGeometry(
        roomRadius,
        roomRadius,
        roomHeight,
        32,
        1,
        true
      );

      const wallMaterial = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        color: 0x555555,
        transparent: true,
        opacity: 0, // Slightly visible for debugging
        depthWrite: false,
        colorWrite: true, // Allow color writing for debugging
      });
      const wall = new THREE.Mesh(wallGeometry, wallMaterial);
      wall.name = "wall";
      scene.add(wall);

      // Add wall to physics when physics is initialized
      const addRoomToPhysics = () => {
        if (!physicsRef.current.world || !ammoRef.current) return;

        // Add wall to physics
        const wallShape = createTriangleMeshShape(wallGeometry);
        if (wallShape) {
          const wallTransform = new ammoRef.current.btTransform();
          wallTransform.setIdentity();
          const wallMotionState = new ammoRef.current.btDefaultMotionState(wallTransform);
          const wallBody = new ammoRef.current.btRigidBody(
            new ammoRef.current.btRigidBodyConstructionInfo(
              0, // Static mass
              wallMotionState,
              wallShape,
              new ammoRef.current.btVector3(0, 0, 0)
            )
          );
          wallBody.setFriction(0.5);
          wallBody.setRestitution(0.3);

          // Set collision filtering for wall
          // Wall belongs to WALL group and collides with MOON group only initially
          physicsRef.current.world.addRigidBody(
            wallBody,
            COLLISION_GROUP_WALL, // collision group
            COLLISION_GROUP_MOON // collision mask (what it collides with) - only moons for now
          );

          wall.userData.physicsBody = wallBody;
        }
      };

      // Check periodically if physics is ready
      const physicsCheckInterval = setInterval(() => {
        if (isPhysicsInitialized.current) {
          addRoomToPhysics();
          clearInterval(physicsCheckInterval);
        }
      }, 500);

      return () => {
        // Cleanup
        clearInterval(physicsCheckInterval);

        if (scene) {
          scene.remove(wall);
          // Remove outer wall cleanup
        }

        wallGeometry.dispose();
        wallMaterial.dispose();
        // Remove outer wall disposal
      };
    }, [scene]);

    // Create convex hull for more accurate collision detection
    const createConvexHullShape = (geometry, margin = 0.05) => {
      const AmmoLib = ammoRef.current;
      if (!AmmoLib) return null;

      // Cache key must be unique for geometry AND margin
      const cacheKey = `${geometry.uuid}_margin_${margin}`;
      if (shapeCache.current.has(cacheKey)) {
        return shapeCache.current.get(cacheKey);
      }

      const shape = new AmmoLib.btConvexHullShape();
      const vertices = geometry.attributes.position.array;
      const tempBtVec = new AmmoLib.btVector3(0, 0, 0);

      const maxVertices = 100; // Limit number of vertices
      const stride = Math.max(1, Math.floor(vertices.length / 3 / maxVertices));

      for (let i = 0; i < vertices.length; i += 3 * stride) {
        if (i >= vertices.length) break;
        tempBtVec.setValue(vertices[i], vertices[i + 1], vertices[i + 2]);
        const lastOne = i >= vertices.length - 3 * stride;
        shape.addPoint(tempBtVec, lastOne);
      }

      shape.setMargin(margin);  // Use the passed margin argument

      shapeCache.current.set(cacheKey, shape); // Store in cache with the margin-specific key

      return shape;
    };

    // Create triangle mesh shape for terrain/floor
    const createTriangleMeshShape = geometry => {
      const AmmoLib = ammoRef.current;
      if (!AmmoLib) return null;

      const vertices = geometry.attributes.position.array;
      const indices = geometry.index.array;
      const triangleMesh = new AmmoLib.btTriangleMesh();

      const v0 = new AmmoLib.btVector3();
      const v1 = new AmmoLib.btVector3();
      const v2 = new AmmoLib.btVector3();

      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i] * 3;
        const i1 = indices[i + 1] * 3;
        const i2 = indices[i + 2] * 3;

        v0.setValue(vertices[i0], vertices[i0 + 1], vertices[i0 + 2]);
        v1.setValue(vertices[i1], vertices[i1 + 1], vertices[i1 + 2]);
        v2.setValue(vertices[i2], vertices[i2 + 1], vertices[i2 + 2]);

        triangleMesh.addTriangle(v0, v1, v2);
      }

      const shape = new AmmoLib.btBvhTriangleMeshShape(triangleMesh, true, true);
      shape.setMargin(0.01);
      return shape;
    };
    // In your useEffect that finds Floor2
    useEffect(() => {
      if (!modelRef?.current || !physicsRef.current.world) return;

      modelRef.current.traverse(child => {
        // Use the exact name from Blender - child is defined inside this traverse function
        if (child.isMesh && child.name === "Floor2.002") {
          console.log("Found Floor2.002, setting up physics");
          setupPhysicsForFloor2(child);
        }
      });
    }, [modelRef.current, physicsRef.current.world]);

    const setupPhysicsForFloor2 = floor2Mesh => {
      console.log("setupPhysicsForFloor2 was called with:", floor2Mesh.name);
      const AmmoLib = ammoRef.current;
      if (!AmmoLib || !physicsRef.current.world) {
        console.error("AmmoLib or physics world not initialized");
        return;
      }

      // Get precise world position and rotation
      floor2Mesh.updateWorldMatrix(true, false);
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      floor2Mesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

      console.log("Floor2 world position:", worldPosition);

      // Clone geometry and apply world transforms
      const clonedGeometry = floor2Mesh.geometry.clone();

      // Create convex hull
      const shape = new AmmoLib.btConvexHullShape();
      const vertices = clonedGeometry.attributes.position.array;
      const tempBtVec = new AmmoLib.btVector3(0, 0, 0);

      // Add vertices to create hull
      for (let i = 0; i < vertices.length; i += 3) {
        // Transform vertices to world space
        const vx = vertices[i] * worldScale.x + worldPosition.x;
        const vy = vertices[i + 1] * worldScale.y + worldPosition.y;
        const vz = vertices[i + 2] * worldScale.z + worldPosition.z;

        tempBtVec.setValue(vx, vy, vz);
        const isLastVertex = i >= vertices.length - 3;
        shape.addPoint(tempBtVec, isLastVertex);
      }

      // Smaller margin
      shape.setMargin(0.01);

      // Create transform at origin since vertices are already in world space
      const transform = new AmmoLib.btTransform();
      transform.setIdentity();
      transform.setOrigin(new AmmoLib.btVector3(0, 0, 0));
      transform.setRotation(new AmmoLib.btQuaternion(0, 0, 0, 1));

      const motionState = new AmmoLib.btDefaultMotionState(transform);
      const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
        0, // static
        motionState,
        shape,
        new AmmoLib.btVector3(0, 0, 0)
      );
      const rigidBody = new AmmoLib.btRigidBody(rbInfo);

      // Lower restitution for less bounce
      rigidBody.setFriction(GROUND_FRICTION);
      rigidBody.setRestitution(GROUND_RESTITUTION);
      rigidBody.setDamping(0, 0);

      // Create a debug visualization at exact same position
      const debugGeometry = new THREE.SphereGeometry(0.5, 8, 8);
      const debugMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
      });
      const debugMesh = new THREE.Mesh(debugGeometry, debugMaterial);
      debugMesh.position.copy(worldPosition);
      scene.add(debugMesh);

      console.log("Adding Floor2 collision body");
      physicsRef.current.world.addRigidBody(rigidBody);
    };
    // Improved moon spawning with more accurate physics
    const spawnMoon = () => {
      if (!ammoRef.current || !physicsRef.current.world || !moonTextureRef.current) return;
      const AmmoLib = ammoRef.current;

      // Constrain spawn positions to within the room
      const safeRadius = roomRadius * 0.8; // 80% of radius to keep away from walls
      const spawnX = THREE.MathUtils.randFloat(-safeRadius, safeRadius);
      const spawnY = THREE.MathUtils.randFloat(10, 30); // Adjust height range as needed
      const spawnZ = THREE.MathUtils.randFloat(-safeRadius, safeRadius);
      const startPosition = new THREE.Vector3(spawnX, spawnY, spawnZ);

      // Random rotation as in original
      const randRotX = THREE.MathUtils.randFloat(-2 * Math.PI, 2 * Math.PI);
      const randRotY = THREE.MathUtils.randFloat(-2 * Math.PI, 2 * Math.PI);
      const randRotZ = THREE.MathUtils.randFloat(-2 * Math.PI, 2 * Math.PI);

      // Create base moon geometry
      const moonSize = 2.5;
      const moonGeometry = new THREE.SphereGeometry(moonSize, 30, 30);

      // Create base material with texture and fallback
      const moonMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color("#00ffff"),
        map: moonTextureRef.current,
        lightMap: moonTextureRef.current,
        lightMapIntensity: textureError ? 1 : 3, // Reduce intensity if using fallback
        envMapIntensity: 0.3,
        reflectivity: 0.3,
        // Add normal mapping for better detail even without texture
        bumpScale: textureError ? 0.02 : 0,
      });

      // If texture failed, add some vertex displacement for visual interest
      if (textureError) {
        const vertices = moonGeometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
          const offset = (Math.random() - 0.5) * 0.1;
          vertices[i] += offset;
          vertices[i + 1] += offset;
          vertices[i + 2] += offset;
        }
        moonGeometry.attributes.position.needsUpdate = true;
        moonGeometry.computeVertexNormals();
      }

      // Create moon mesh
      const moon = new THREE.Mesh(moonGeometry, moonMaterial);
      moon.position.copy(startPosition);
      moon.rotation.set(randRotX, randRotY, randRotZ);
      // moon.castShadow = true;
      moon.name = "pointLight"; // Match original name for physics

      // Create point light for the moon
      const pointLight = new THREE.PointLight(
        new THREE.Color("#00ffff"),
        25, // intensity reduced from 50 to 25
        10 // distance
      );
      // pointLight.castShadow = true;
      // pointLight.shadow.bias = -0.01;
      moon.add(pointLight);

      // Add glowing effect layers as in original
      // Layer 1 - semi-transparent glow
      const glowMaterial1 = new THREE.MeshLambertMaterial({
        color: "#00ffff",
        transparent: true,
        opacity: 0.3,
      });
      const glowMesh1 = new THREE.Mesh(moonGeometry, glowMaterial1);
      glowMesh1.scale.set(1.02, 1.02, 1.02);
      moon.add(glowMesh1);

      // Layer 2 - outer glow
      const glowMaterial2 = new THREE.MeshBasicMaterial({
        color: "white",
        transparent: true,
        opacity: 0.05,
      });
      const glowMesh2 = new THREE.Mesh(moonGeometry, glowMaterial2);
      glowMesh2.scale.set(1.05, 1.05, 1.05);
      moon.add(glowMesh2);

      // Add to scene and moons array
      scene.add(moon);
      moonsRef.current.push(moon);

      // Physics setup
      // const moonShape = createConvexHullShape(moonGeometry);
      const moonShape = new AmmoLib.btSphereShape(moonSize);
      moonShape.setMargin(0.005); // Prevents moons from overlapping
      const moonTransform = new AmmoLib.btTransform();
      moonTransform.setIdentity();
      moonTransform.setOrigin(new AmmoLib.btVector3(spawnX, spawnY, spawnZ));

      // Apply rotation to physics body
      const q = new AmmoLib.btQuaternion();
      q.setEulerZYX(randRotZ, randRotY, randRotX);
      moonTransform.setRotation(q);

      // Reduce mass for lighter, bouncier feel
      const mass = 0.5; // Lighter mass (was 0.3)
      const localInertia = new AmmoLib.btVector3(0, 0, 0);
      moonShape.calculateLocalInertia(mass, localInertia);

      const motionState = new AmmoLib.btDefaultMotionState(moonTransform);
      const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
        mass,
        motionState,
        moonShape,
        localInertia
      );
      const moonBody = new AmmoLib.btRigidBody(rbInfo);

      // Increase restitution for more bounce and reduce friction
      moonBody.setFriction(0.1); // Lower friction (was 0.1)
      moonBody.setRestitution(0.6); // Slightly lower restitution for less aggressive bouncing (was 0.8)

      // Add damping to make movement more fluid
      moonBody.setDamping(0, 0.05); // Small linear damping (0), light angular damping (0.05) to limit spinning

      // Add some random motion as in original
      moonBody.setLinearVelocity(
        new AmmoLib.btVector3(
          THREE.MathUtils.randFloat(-0.5, 0.5),
          -1, // Gentler initial downward velocity (was -2)
          THREE.MathUtils.randFloat(-0.5, 0.5)
        )
      );

      // Add angular velocity for rotation
      moonBody.setAngularVelocity(
        new AmmoLib.btVector3(
          THREE.MathUtils.randFloat(-0.5, 0.5),
          THREE.MathUtils.randFloat(-0.5, 0.5),
          THREE.MathUtils.randFloat(-0.5, 0.5)
        )
      );

      physicsRef.current.world.addRigidBody(
        moonBody,
        COLLISION_GROUP_MOON, // Moons belong to this group
        COLLISION_GROUP_DEFAULT |
          COLLISION_GROUP_WALL |
          COLLISION_GROUP_PROJECTILE |
          COLLISION_GROUP_MOON |
          COLLISION_GROUP_ALLIGATOR
      );
      bodiesRef.current.push({ mesh: moon, body: moonBody });
    };

    // Add model to physics with proper collision detection
    const addModelToPhysics = () => {
      if (!modelRef?.current || !physicsRef.current.world || !ammoRef.current) {
        return;
      }
      const showDebugShape = false;
      const AmmoLib = ammoRef.current;

      // First, find Object_3 and Statue and mark them for exclusion
      modelRef.current.traverse(child => {
        if (child.isMesh && (child.name === "Object_3" || child.name === "Object_2.001")) {
          // Set a user data flag to identify it later
          child.userData.excludeFromPhysics = true;
          child.userData.collisionGroup = 2; // COLLISION_GROUP_OBJECT3
        }
      });

      // Then process all other objects for physics
      modelRef.current.traverse(child => {
        if (!child.isMesh) return;

        if (
          child.userData.excludeFromPhysics ||
          child.name === "Object_3" ||
          child.name === "Statue"
        ) {
          return;
        }

        let shape;
        const isWallMesh = child.name === "wall"; // Renamed to avoid conflict with outer wall group
        const isFloor2 = child.name === "Floor2.002";
        const isFloor3 =
          child.name === "Floor3" || child.name === "Floor3.001" || child.name === "Floor3.002";
        const isMainFloor = child.name.toLowerCase().includes("floor") && !isFloor2 && !isFloor3;
        const isAlligator = child.name === "american alligator" || 
                           child.name.toLowerCase().includes("alligator") || 
                           child.name.toLowerCase().includes("gator");

        if (isAlligator) {
          console.log("Found alligator object for physics:", child.name);
          const alligatorMargin = 0.7; // Alligator needs a large margin
          shape = createConvexHullShape(child.geometry, alligatorMargin);
          if (!shape) {
            console.log("Creating simple shape for alligator as fallback");
            // If createSimpleShape also needs a margin, it should be parameterized too.
            // For now, assuming createSimpleShape handles its own margin or uses a fixed small one.
            shape = createSimpleShape(child);
          }
          child.userData.isAlligator = true; // Mark the mesh

          // ---- START: Visualizations for alligator ----
          if (showDebugShape) {
            // 2. Convex Hull from THREE.js Geometry (Blue)
            console.log(`Attempting to create ConvexHull from THREE.js geometry for: ${child.name}`);
            if (child.geometry && child.geometry.attributes.position) {
              const positions = child.geometry.attributes.position.array;
              const threeJsVertices = [];
              for (let i = 0; i < positions.length; i += 3) {
                threeJsVertices.push(new THREE.Vector3(positions[i], positions[i+1], positions[i+2]));
              }

              if (threeJsVertices.length > 3) {
                try {
                  const threeJsConvexGeom = new ConvexGeometry(threeJsVertices);
                  const threeJsConvexMaterial = new THREE.MeshBasicMaterial({
                    color: 0x0000ff, // Blue
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5,
                    depthTest: false,
                  });
                  const threeJsConvexMesh = new THREE.Mesh(threeJsConvexGeom, threeJsConvexMaterial);
                  // This mesh is based on local geometry, so its position should be (0,0,0) relative to the parent (child)
                  child.add(threeJsConvexMesh);
                  console.log(`SUCCESS: Added ConvexGeometry from THREE.js (blue) for ${child.name} with ${threeJsVertices.length} input vertices.`);
                } catch (e) {
                  console.error(`Error creating ConvexGeometry from THREE.js for ${child.name}:`, e);
                }
              } else {
                console.warn(`Not enough vertices in THREE.js geometry to create ConvexGeometry for ${child.name}.`);
              }
            } else {
              console.warn(`Cannot create ConvexHull from THREE.js geometry for ${child.name}: no geometry or position attribute.`);
            }
          }

          // The rest of the physics setup for the alligator remains, using the original Ammo.js 'shape' (RE {kB: ...})
        } else if (isFloor2 || isFloor3) {
          // For floors, prioritize TriangleMeshShape for better accuracy with static terrain
          shape = createTriangleMeshShape(child.geometry); // Uses its own margin of 0.01
          if (!shape) { 
            console.error(`createTriangleMeshShape failed for ${child.name}, falling back to ConvexHullShape.`);
            const floorMargin = 0.02; // Small margin if using convex hull for floor
            shape = createConvexHullShape(child.geometry, floorMargin);
          }
          if (!shape) { 
            console.error(`All shape creation failed for floor ${child.name}, falling back to simple box.`);
            shape = createSimpleShape(child); // Fallback to simple box if others fail
          }
          if (!shape) { console.error(`CRITICAL: All shape creation failed for ${child.name}`); return; }
          child.userData.isFloor2 = isFloor2;
          child.userData.isFloor3 = isFloor3;
        } else if (isWallMesh) {
          // Walls might also benefit from TriangleMeshShape if they are complex static geometry
          shape = createTriangleMeshShape(child.geometry); // Uses its own margin of 0.01
          if (!shape) {
            console.warn(`createTriangleMeshShape failed for wall ${child.name}, falling back to ConvexHullShape.`);
            shape = createConvexHullShape(child.geometry); // Uses default margin (0.05)
          }
          if (!shape) { 
             console.warn(`ConvexHullShape failed for wall ${child.name}, falling back to simple box.`);
            shape = createSimpleShape(child); // Fallback to simple box
          }
        } else {
          // For other generic static parts of the model
          shape = createConvexHullShape(child.geometry); // Uses default margin (0.05)
          if (!shape) { 
            console.warn(`ConvexHullShape failed for generic mesh ${child.name}, falling back to simple box.`);
            shape = createSimpleShape(child); // Fallback to simple box
          }
        }

        if (!shape) {
            console.warn(`Could not create physics shape for ${child.name}. Skipping.`);
            return;
        }

        child.updateMatrixWorld();
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const scale = new THREE.Vector3();
        child.matrixWorld.decompose(position, quaternion, scale);

        const transform = new AmmoLib.btTransform();
        transform.setIdentity();
        transform.setOrigin(new AmmoLib.btVector3(position.x, position.y, position.z));
        transform.setRotation(
          new AmmoLib.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w)
        );

        const ammoScale = new AmmoLib.btVector3(scale.x, scale.y, scale.z);
        shape.setLocalScaling(ammoScale);

        const mass = 0; 
        const localInertia = new AmmoLib.btVector3(0, 0, 0);
        const motionState = new AmmoLib.btDefaultMotionState(transform);
        const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
          mass,
          motionState,
          shape,
          localInertia
        );
        const body = new AmmoLib.btRigidBody(rbInfo);

        let bodyCollisionGroup = COLLISION_GROUP_DEFAULT;
        let bodyCollisionMask = COLLISION_GROUP_DEFAULT | COLLISION_GROUP_MOON | COLLISION_GROUP_PROJECTILE | COLLISION_GROUP_ALLIGATOR | COLLISION_GROUP_WALL;

        if (child.userData.isFloor2 || child.userData.isFloor3) {
          body.setFriction(GROUND_FRICTION);
          body.setRestitution(GROUND_RESTITUTION);
          body.setDamping(0, 0);
          console.log(`${child.name} floor physics applied`);
        } else if (child.userData.isAlligator) {
          body.setFriction(0.5);
          body.setRestitution(0.2);
          body.setDamping(0, 0);
          body.setCollisionFlags(body.getCollisionFlags() | 2); // CF_KINEMATIC_OBJECT
          body.activate(true); 

          bodyCollisionGroup = COLLISION_GROUP_ALLIGATOR;
          bodyCollisionMask = COLLISION_GROUP_DEFAULT | COLLISION_GROUP_WALL | COLLISION_GROUP_MOON | COLLISION_GROUP_PROJECTILE;
          
          // Mark alligator physics body and store mesh ref
          if (child.isMesh && (child.name === "american alligator" || child.name.toLowerCase().includes("alligator") || child.name.toLowerCase().includes("gator"))) {
            body.is_alligator_body = true; // Flag for physics

            // Specifically find and store the 'skin' mesh for visual effects
            if (child.material && child.material.name === 'skin') {
              alligatorSkinMeshRef.current = child;
              console.log("IMPORTANT: Alligator SKIN MESH ('" + child.name + "' with material '" + child.material.name + "') assigned to alligatorSkinMeshRef:", alligatorSkinMeshRef.current);
            }
          }
          
          // Separate traversal specifically for AlligatorScroll setup, as it might have a different structure
          // and needs to be initialized once.
          if (modelRef.current && !alligatorScrollObjectRef.current) { // Ensure this runs only once
            console.log("Starting traversal to find AlligatorScroll parent object...");
            modelRef.current.traverse((object) => {
              // console.log(`Traversing for scroll parent: Name: '${object.name}', Parent: '${object.parent ? object.parent.name : "NO_PARENT"}'`);

              if (object.name === 'AlligatorScroll') {
                if (!alligatorScrollObjectRef.current) { // Check again to ensure single assignment
                    alligatorScrollObjectRef.current = object;
                    console.log("SUCCESS: Found AlligatorScroll main object (parent/group):", object);
                    setScrollObjectFound(true); // Set state when found

                    // Initially hide all visible mesh parts of the scroll group
                    object.traverse((child) => {
                        // if (child.name === 'AlligatorScroll.003') {
                        //     // This was for animation target, will be handled in useEffect
                        // }
                        if (child.isMesh && child.name.startsWith('AlligatorScroll')) {
                            console.log("Initially hiding scroll part:", child.name);
                            child.visible = false;
                        }
                    });
                    // DO NOT set up animations here yet, defer to useEffect
                } 
              } 
            });
            if (!alligatorScrollObjectRef.current) {
                console.warn("AlligatorScroll main object NOT found after traversal.");
            }
          }
          
          console.log(`${child.name} (part of alligator model) physics applied as KINEMATIC in ALLIGATOR group`);
        } else if (isWallMesh) {
            body.setFriction(MODEL_FRICTION); 
            body.setRestitution(MODEL_RESTITUTION);
            bodyCollisionGroup = COLLISION_GROUP_WALL; 
            bodyCollisionMask = COLLISION_GROUP_MOON | COLLISION_GROUP_PROJECTILE; 
        } else {
          body.setFriction(MODEL_FRICTION);
          body.setRestitution(MODEL_RESTITUTION);
          body.setDamping(0, 0);
        }

        body.name = child.name;
        physicsRef.current.world.addRigidBody(
          body,
          bodyCollisionGroup,
          bodyCollisionMask
        );
        child.userData.physicsBody = body; // Store physics body on the mesh

        if (showDebugShape && shape && !isMainFloor && !child.userData.skipBoxHelper) {
          const helper = new THREE.BoxHelper(child, 0xff0000);
          scene.add(helper);
        }
      });
    };
    const createSimpleShape = mesh => {
      const AmmoLib = ammoRef.current;
      if (!AmmoLib) return null;

      // Get bounding box
      mesh.geometry.computeBoundingBox();
      const bbox = mesh.geometry.boundingBox;
      const size = new THREE.Vector3();
      bbox.getSize(size);

      // Create box shape
      const shape = new AmmoLib.btBoxShape(new AmmoLib.btVector3(size.x / 2, size.y / 2, size.z / 2));
      shape.setMargin(0.01); // Explicitly set a small margin for box shapes
      return shape;
    };

    // Add a function to check if a point is inside the room
    const isInsideRoom = position => {
      // Calculate distance from center (x-z plane)
      const horizontalDistSq = position.x * position.x + position.z * position.z;
      // If distance is less than room radius, point is inside
      return horizontalDistSq < roomRadius * roomRadius;
    };

    // Modify the shootProjectile function to simplify tracking
    const shootProjectile = (origin, direction) => {
      if (!ammoRef.current || !physicsRef.current.world) return;
      const AmmoLib = ammoRef.current;

      if (
        bodiesRef.current.filter(obj => obj.mesh && obj.mesh.name === "shootingBall").length >=
        maxProjectiles
      ) {
        removeOldestProjectile();
      }

      let projectile;
      const projectileSize = 0.8; // Keep original size

      if (projectilePoolRef.current.length > 0) {
        projectile = projectilePoolRef.current.pop();
        projectile.visible = true;
        projectile.material.color.set(getRandomColor());
      } else {
        projectile = new THREE.Mesh(
          new THREE.IcosahedronGeometry(projectileSize, 1),
          new THREE.MeshStandardMaterial({
            color: getRandomColor(),
            metalness: 1,
            roughness: 0.2,
            flatShading: true,
          })
        );
        projectile.name = "shootingBall";
      }

      // IMPORTANT: Spawn closer to the camera position
      // This matches the original demo's behavior
      const spawnDistance = 2; // Much closer to camera (was 5)
      const spawnPosition = camera.position
        .clone()
        .add(direction.clone().multiplyScalar(spawnDistance));

      projectile.position.copy(spawnPosition);
      scene.add(projectile);

      // Create physics shape
      const projectileShape = new AmmoLib.btSphereShape(projectileSize * 0.5);
      projectileShape.setMargin(0.01); // Match original margin

      const projectileTransform = new AmmoLib.btTransform();
      projectileTransform.setIdentity();
      projectileTransform.setOrigin(
        new AmmoLib.btVector3(spawnPosition.x, spawnPosition.y, spawnPosition.z)
      );

      const mass = 10; // Original mass
      const localInertia = new AmmoLib.btVector3(0, 0, 0);
      projectileShape.calculateLocalInertia(mass, localInertia);

      const motionState = new AmmoLib.btDefaultMotionState(projectileTransform);
      const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
        mass,
        motionState,
        projectileShape,
        localInertia
      );
      const projectileBody = new AmmoLib.btRigidBody(rbInfo);

      // Match original physics properties
      projectileBody.setFriction(0.8);
      projectileBody.setRestitution(0.2);

      // Add custom flag for projectile collision detection
      projectileBody.is_projectile_body = true;

      // Add to physics world - don't collide with walls at all
      physicsRef.current.world.addRigidBody(
        projectileBody,
        COLLISION_GROUP_PROJECTILE, // collision group
        COLLISION_GROUP_DEFAULT | COLLISION_GROUP_MOON | COLLISION_GROUP_ALLIGATOR
      );

      // Apply velocity with original force
      const force = 80;
      const velocity = new AmmoLib.btVector3(
        direction.x * force,
        direction.y * force,
        direction.z * force
      );
      projectileBody.setLinearVelocity(velocity);
      projectileBody.activate();

      bodiesRef.current.push({
        mesh: projectile,
        body: projectileBody,
        createdAt: Date.now(),
        isProjectile: true,
      });
    };

    // Modify the checkObject3Collisions function to be more selective
    const checkObject3Collisions = () => {
      // We're intentionally NOT checking for Object_3 collisions anymore
      // This function is now essentially a no-op
      return;
    };

    // Random color helper
    const getRandomColor = () => {
      const color = new THREE.Color();
      color.setHSL(Math.random(), 1, THREE.MathUtils.randFloat(0.5, 0.7));
      return color;
    };
    // Add this new function to remove the oldest projectile
    const removeOldestProjectile = () => {
      if (!physicsRef.current.world) return;

      // Find projectiles and sort by creation time
      const projectiles = bodiesRef.current
        .filter(obj => obj.mesh && obj.mesh.name === "shootingBall")
        .sort((a, b) => a.createdAt - b.createdAt);

      if (projectiles.length > 0) {
        const oldest = projectiles[0];
        recycleProjectile(oldest, bodiesRef.current.indexOf(oldest));
      }
    };

    const recycleProjectile = (projectileObj, index) => {
      if (!projectileObj || index === -1) return;

      // Remove from physics world
      if (projectileObj.body) {
        physicsRef.current.world.removeRigidBody(projectileObj.body);
      }

      // Remove from scene but keep the mesh for reuse
      if (projectileObj.mesh) {
        scene.remove(projectileObj.mesh);
        projectileObj.mesh.visible = false;
        projectilePoolRef.current.push(projectileObj.mesh);
      }

      // Remove from active bodies list
      if (index >= 0) {
        bodiesRef.current.splice(index, 1);
      }
    };

    const handleClick = event => {
      const currentTime = performance.now();
      const timeSinceLastClick = currentTime - lastClickTime.current;

      lastClickTime.current = currentTime;

      if (timeSinceLastClick <= doubleClickDelay) {
        if (!physicsRef.current.world) return;

        const mouse = new THREE.Vector2(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const direction = raycaster.ray.direction.clone().normalize();

        // Compute a horizontal offset towards the screen center
        // const horizontalCenterBias = mouse.x * -2; // bias inward horizontally
        // const inwardOffset = new THREE.Vector3(horizontalCenterBias, 0, 0);

        // Create adjusted origin slightly forward and upward, and inward horizontally
        const adjustedOrigin = camera.position
          .clone()
          .add(direction.clone().multiplyScalar(35))
          .add(new THREE.Vector3(0, -1, -5));

        shootProjectile(adjustedOrigin, direction);
      }
    };

    const lastClickTime = useRef(0);
    const doubleClickDelay = 300; // milliseconds, adjust as needed (~300ms is typical)

    useEffect(() => {
      const handlePointerDown = (event) => {
        const mouse = new THREE.Vector2(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // Check for intersection with the visible scroll
        // We no longer check if the scroll is open, just if it's visible
        if (alligatorScrollObjectRef.current && 
            alligatorScrollObjectRef.current.children.some(c => c.name.startsWith('AlligatorScroll') && c.visible)) {
            const scrollPartsToTest = [];
            alligatorScrollObjectRef.current.traverse(child => {
                if (child.isMesh && child.name.startsWith('AlligatorScroll') && child.visible) {
                    scrollPartsToTest.push(child);
                }
            });

            if (scrollPartsToTest.length > 0) {
                const intersects = raycaster.intersectObjects(scrollPartsToTest, false); 
                if (intersects.length > 0) {
                    console.log("Clicked on visible scroll part:", intersects[0].object.name);
                    event.stopPropagation(); 
                    // Pass data needed for ScrollDetailViewer.
                    if (onOpenScrollDetail) { // Call prop passed from parent
                        onOpenScrollDetail({ 
                            name: 'AlligatorScroll', 
                            modelPath: '/alligatorStroll1.glb', // Or more specifically /Scroll.glb if detail viewer loads its own
                            animationTargetName: 'Armature', 
                            openAnimationName: 'Armature|3_Opened Action _Armature',
                        });
                    }
                    return; 
                }
            }
        }

        // If scroll not clicked, proceed with double-click to shoot logic (skip on mobile)
        if (!isMobileView) {
          const currentTime = performance.now();
          const timeSinceLastClick = currentTime - lastClickTime.current;

          if (timeSinceLastClick <= doubleClickDelay) {
            const direction = raycaster.ray.direction.clone().normalize();
            shootProjectile(
              camera.position.clone().add(direction.clone().multiplyScalar(2)),
              direction
            );
          }
          lastClickTime.current = currentTime;
        }
      };

      window.addEventListener("pointerdown", handlePointerDown);
      return () => window.removeEventListener("pointerdown", handlePointerDown);
      // Dependencies: camera, doubleClickDelay, shootProjectile, and refs used for scroll clicking condition
      // Also add onOpenScrollDetail and isMobileView to dependencies
    }, [camera, doubleClickDelay, shootProjectile, alligatorScrollObjectRef, onOpenScrollDetail, isMobileView]); 

    // Initialize scene and physics (but don't spawn moons yet)
    useEffect(() => {
      const startSimulation = async () => {
        await initPhysics();
        setupScene();

        // NOTE: Removed moon spawning from here
      };

      startSimulation();

      return () => {
        // Cleanup physics resources
        if (physicsRef.current.world && ammoRef.current) {
          // Proper Ammo.js cleanup would go here
        }

        // Clean up animation mixers
      };
    }, []); // Keep dependencies minimal

    // Expose the spawn function via useImperativeHandle
    useImperativeHandle(ref, () => ({
      triggerInitialSpawn: () => {
        if (isMobileView) {
          console.log("MoonScene: Skipping moon spawning on mobile for performance");
          if (onSpawnReady) {
            onSpawnReady();
          }
          return;
        }
        if (isPhysicsInitialized.current && ammoRef.current) {
          console.log("MoonScene: triggerInitialSpawn called, spawning moons...");
          for (let i = 0; i < 8; i++) {
            spawnMoon();
          }
          if (onSpawnReady) {
            onSpawnReady();
          }
        } else {
          console.warn("MoonScene: triggerInitialSpawn called, but physics not ready.");
        }
      },
      closeInSceneScroll: () => {
        if (alligatorScrollObjectRef.current) {
          console.log("MoonScene: closeInSceneScroll called by parent.");
          
          // Reset glow effect
          originalScrollMaterialStatesRef.current.forEach(state => {
            if (state.material.emissive) { 
              state.material.emissive.setHex(state.originalEmissive);
              state.material.emissiveIntensity = state.originalIntensity;
            }
          });
          originalScrollMaterialStatesRef.current = []; 

          // Immediately hide the scroll
          alligatorScrollObjectRef.current.traverse((child) => {
            if (child.isMesh && child.name.startsWith('AlligatorScroll')) {
              child.visible = false;
            }
          });
          console.log("MoonScene: In-scene scroll hidden immediately.");
        } else {
          console.warn("MoonScene: Could not hide scroll: scroll object not available.");
        }
      }
    }));

    // Add model to physics when it's available and physics is initialized
    useEffect(() => {
      if (
        modelRef?.current &&
        physicsRef.current.world &&
        ammoRef.current &&
        isPhysicsInitialized.current
      ) {
        // Use setTimeout to ensure the model is fully loaded and positioned
        setTimeout(() => {
          addModelToPhysics();
        }, 200);
      }
    }, [modelRef?.current, isPhysicsInitialized.current]);

    // 1. Fixed timestep physics implementation
    const fixedTimeStep = 1 / 60;
    let accumulator = 0;

    // Replace your existing useFrame physics update with this
    useFrame((state, delta) => {
      const currentAmmo = ammoRef.current;
      const currentPhysicsWorld = physicsRef.current?.world;

      // Guard: If Ammo or physics world isn't ready, only update essential non-physics parts and skip the rest.
      if (!currentAmmo || !currentPhysicsWorld) {
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        // Animation mixers might be independent of physics state, so update them.
        if (mixersRef.current.length > 0) {
          mixersRef.current.forEach(mixer => {
            mixer.update(delta);
          });
        }
        // Update scroll animation mixer
        if (scrollAnimationMixerRef.current) {
          scrollAnimationMixerRef.current.update(delta);
        }
        return; // Skip physics simulation and related updates for this frame
      }

      // Fixed timestep physics
      // Accumulate time and step physics with fixed timestep
      accumulator += delta;

      // Step physics with fixed timestep for stability
      while (accumulator >= fixedTimeStep) {
        currentPhysicsWorld.stepSimulation(fixedTimeStep, 1, fixedTimeStep);
        accumulator -= fixedTimeStep;
      }

      // Update controls - ALWAYS update controls regardless of physics state
      if (controlsRef.current) {
        // Force update controls every frame
        controlsRef.current.update();
      }

      // Update animation mixers
      if (mixersRef.current.length > 0) {
        mixersRef.current.forEach(mixer => {
          mixer.update(delta);
        });
      }

      // Update scroll animation mixer
      if (scrollAnimationMixerRef.current) {
        scrollAnimationMixerRef.current.update(delta);
      }

      // Update meshes from physics bodies
      bodiesRef.current.forEach((obj, index) => {
        if (!obj.mesh || !obj.body) return;

        const motionState = obj.body.getMotionState();
        if (motionState) {
          const transform = new currentAmmo.btTransform(); // Use currentAmmo
          motionState.getWorldTransform(transform);
          const origin = transform.getOrigin();
          const rotation = transform.getRotation();

          obj.mesh.position.set(origin.x(), origin.y(), origin.z());
          obj.mesh.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
        }
      });

      // Collision detection for alligator and projectiles (skip on mobile)
      if (!isMobileView && currentPhysicsWorld.getDispatcher) {
        const dispatcher = currentPhysicsWorld.getDispatcher();
        const numManifolds = dispatcher.getNumManifolds();

        for (let i = 0; i < numManifolds; i++) {
          const manifold = dispatcher.getManifoldByIndexInternal(i);
          const numContacts = manifold.getNumContacts();
          if (numContacts === 0) continue;

          const body0 = manifold.getBody0();
          const body1 = manifold.getBody1();

          const rb0 = currentAmmo.castObject(body0, currentAmmo.btRigidBody);
          const rb1 = currentAmmo.castObject(body1, currentAmmo.btRigidBody);
          
          const b0IsAlligator = rb0 && rb0.is_alligator_body;
          const b1IsAlligator = rb1 && rb1.is_alligator_body;
          const b0IsProjectile = rb0 && rb0.is_projectile_body;
          const b1IsProjectile = rb1 && rb1.is_projectile_body;

          if ((b0IsAlligator && b1IsProjectile) || (b1IsAlligator && b0IsProjectile)) {
            if (!isAlligatorHit) {
              console.log("Alligator hit! Don't bother Saint Gr80, he's meditating");
              setIsAlligatorHit(true);

              // Reset text state when alligator is hit
              handleAlligatorHit();

              // Visual cue: Flash alligator color (on skin mesh)
              if (alligatorSkinMeshRef.current && alligatorSkinMeshRef.current.material) {
                console.log("Attempting to flash alligator. Target SKIN Object:", alligatorSkinMeshRef.current, "Material(s):", alligatorSkinMeshRef.current.material);
                originalMaterialStatesRef.current = []; // Clear previous states
                // The skin mesh should have a single material based on logs
                const material = alligatorSkinMeshRef.current.material; 

                // Ensure material has expected properties before trying to change them
                const stateToStore = { material: material }; // material here is mat from forEach before, now it's the single skin material
                if (material.color) {
                  stateToStore.originalColor = material.color.getHex();
                  material.color.setHex(0xff0000); // Bright red base color
                }
                if (material.emissive) {
                  stateToStore.originalEmissive = material.emissive.getHex();
                  material.emissive.setHex(0xff0000); // Bright red emissive
                }
                if (material.hasOwnProperty('emissiveIntensity')) { // Check for property existence
                  stateToStore.originalIntensity = material.emissiveIntensity;
                  material.emissiveIntensity = 2.0; // Strong emissive intensity
                }
                originalMaterialStatesRef.current.push(stateToStore);
              }

              // Scroll visibility and GLOW without animation
              if (alligatorScrollObjectRef.current) {
                console.log("Alligator hit, making scroll visible and applying glow.");
                originalScrollMaterialStatesRef.current = []; // Clear previous states for scroll glow
                glowingScrollMaterialsRef.current = []; // Clear previous tracked materials

                // First make the scroll visible
                alligatorScrollObjectRef.current.traverse((child) => {
                  if (child.isMesh && child.name.startsWith('AlligatorScroll')) {
                    child.visible = true;
                  }
                });
                
                // Add rotation to the scroll parent object for a slight angle
                alligatorScrollObjectRef.current.rotation.set(
                  THREE.MathUtils.degToRad(65), // Tilt forward slightly (X-axis)
                  THREE.MathUtils.degToRad(0), // Rotate around Y-axis 
                  THREE.MathUtils.degToRad(90)  // Slight Z-axis tilt
                );
                
                // Make sure the scroll is in closed state
                if (scrollAnimationMixerRef.current && closeScrollActionRef.current) {
                  // Stop all actions, reset the mixer
                  scrollAnimationMixerRef.current.stopAllAction();
                  
                  // Play the static closed action
                  closeScrollActionRef.current.reset();
                  closeScrollActionRef.current.time = closeScrollActionRef.current.getClip().duration;
                  closeScrollActionRef.current.paused = false;
                  closeScrollActionRef.current.play();
                  
                  console.log("Applied static closed state to scroll");
                } else {
                  console.warn("Could not apply closed state animation - mixer or action not ready");
                }
                
                // Now apply glow
                alligatorScrollObjectRef.current.traverse((child) => {
                  if (child.isMesh && child.name.startsWith('AlligatorScroll') && child.visible) {
                    // Apply glow
                    if (child.material) {
                      const materials = Array.isArray(child.material) ? child.material : [child.material];
                      materials.forEach(mat => {
                        if (mat.emissive) { // Check if material has emissive property
                          originalScrollMaterialStatesRef.current.push({
                            material: mat,
                            originalEmissive: mat.emissive.getHex(),
                            originalIntensity: mat.emissiveIntensity !== undefined ? mat.emissiveIntensity : 0,
                          });
                          mat.emissive.setHex(0xffff99); // Soft yellow glow
                          mat.emissiveIntensity = 0.3; 
                          
                          // Add to the list of materials to animate
                          glowingScrollMaterialsRef.current.push(mat);
                        }
                      });
                    }
                  }
                });
                
                console.log("Scroll made visible in static closed position until clicked");
              }

              if (alligatorHitTimeoutRef.current) {
                clearTimeout(alligatorHitTimeoutRef.current);
              }
              alligatorHitTimeoutRef.current = setTimeout(() => {
                setIsAlligatorHit(false);
                // Revert alligator color
                console.log("Reverting alligator SKIN material. Stored states:", originalMaterialStatesRef.current);
                originalMaterialStatesRef.current.forEach(state => {
                  if (state.material.color && state.originalColor !== undefined) {
                    state.material.color.setHex(state.originalColor);
                  }
                  if (state.material.emissive && state.originalEmissive !== undefined) {
                    state.material.emissive.setHex(state.originalEmissive);
                  }
                  if (state.material.hasOwnProperty('emissiveIntensity') && state.originalIntensity !== undefined) {
                    state.material.emissiveIntensity = state.originalIntensity;
                  }
                });
                originalMaterialStatesRef.current = []; // Clear stored states
              }, 1000); // Flash for 1 second, then revert
            }
          }
        }
      }

      // Check for projectiles that have exceeded their lifespan
      const now = Date.now();
      const toRemove = [];

      bodiesRef.current.forEach((obj, index) => {
        // Only remove projectiles if they've fallen extremely far (much lower threshold)
        // or if they've exceeded their extended lifespan
        if (
          obj.mesh.position.y < -200 || // Much lower threshold to keep them visible longer
          (obj.isProjectile && now - obj.createdAt > projectileLifespan)
        ) {
          toRemove.push(index);
          scene.remove(obj.mesh);
          physicsRef.current.world.removeRigidBody(obj.body);
        }
      });

      // Remove from array in reverse order to avoid index issues
      if (toRemove.length > 0) {
        for (let i = toRemove.length - 1; i >= 0; i--) {
          bodiesRef.current.splice(toRemove[i], 1);
        }
      }

      // Check for Object_3 collisions
      checkObject3Collisions();

      // Add alligator collision detection
      const checkAlligatorCollisions = () => {
        if (!modelRef.current || !ammoRef.current || !physicsRef.current.world) return;
        const AmmoLib = ammoRef.current;

        // Create reusable objects outside the traverse loop
        const position = new THREE.Vector3();
        const quaternion = new THREE.Quaternion();
        const transform = new AmmoLib.btTransform();
        const btPosition = new AmmoLib.btVector3(0, 0, 0);
        const btQuaternion = new AmmoLib.btQuaternion(0, 0, 0, 1);

        modelRef.current.traverse(object => {
            if (object.isMesh && object.userData && object.userData.isAlligator && object.userData.physicsBody) {
                const alligatorMesh = object;
                const alligatorBody = object.userData.physicsBody;

                // Update world matrix
                alligatorMesh.updateWorldMatrix(true, false);
                
                // Reuse position and quaternion objects
                alligatorMesh.matrixWorld.decompose(position, quaternion, new THREE.Vector3());

                // Reuse transform and vector objects
                transform.setIdentity();
                btPosition.setValue(position.x, position.y, position.z);
                transform.setOrigin(btPosition);
                
                btQuaternion.setValue(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
                transform.setRotation(btQuaternion);

                alligatorBody.getMotionState().setWorldTransform(transform);
                alligatorBody.setCenterOfMassTransform(transform);
                alligatorBody.activate(true);
            }
        });

        // Clean up Ammo.js objects
        AmmoLib.destroy(btPosition);
        AmmoLib.destroy(btQuaternion);
        AmmoLib.destroy(transform);
      };
      
      // Call the collision detection function every frame
      checkAlligatorCollisions();
    });

    // Animate scroll glow with pulsing effect
    useFrame((state) => {
      // Apply pulsing effect to the alligator scroll if it's visible
      if (glowingScrollMaterialsRef.current.length > 0) {
        // Create a smooth pulse between 0 and 0.4 using sine wave
        const pulseIntensity = (Math.sin(state.clock.elapsedTime * 2) * 0.5 + 0.5) * 0.4;
        
        // Apply to all tracked materials
        glowingScrollMaterialsRef.current.forEach(material => {
          material.emissiveIntensity = pulseIntensity;
        });
      }
    });

    // Modify collision handler
    const handleAlligatorHit = () => {
      // Just a placeholder function now that we've removed the text
      console.log("Alligator hit - scroll will appear with glow effect");
    };

    // Add this new useEffect for logging scroll message
    useEffect(() => {
      // Log scroll message when component mounts
      console.log("MoonScene mounted with scrollMessage:", scrollMessage);
    }, [scrollMessage]);

    useEffect(() => {
      const handleWheel = (event) => {
        // Prevent the default behavior to ensure our controls handle it
        if (controlsRef.current && controlsRef.current.enableZoom) {
          event.preventDefault();
          console.log("Wheel event captured by MoonLamps");
        }
      };

      // Add wheel event listener with passive: false to allow preventDefault
      gl.domElement.addEventListener('wheel', handleWheel, { passive: false });

      return () => {
        // Clean up the event listener
        gl.domElement.removeEventListener('wheel', handleWheel);
      };
    }, [gl.domElement]);

    // Add useEffect to debug text positioning
    useEffect(() => {
      if (scrollMessage) {
        console.log("Scroll has message:", scrollMessage);
        
        // We can add a debug box to show where the scroll appears if needed
        /*
        const debugBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 0.2, 0.2),
          new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
        );
        debugBox.position.set(0, 17, 0.3);
        scene.add(debugBox);
        
        // Remove after 5 seconds
        setTimeout(() => {
          scene.remove(debugBox);
        }, 5000);
        */
      }
    }, [scrollMessage, scene]);

    // Remove the HTML text implementation since we're using 3D text
    useEffect(() => {
      // Remove any existing scroll-text-overlay elements
      const existingOverlay = document.getElementById('scroll-text-overlay');
      if (existingOverlay) {
        document.body.removeChild(existingOverlay);
      }
    }, []);

    // Remove the debug box implementation too
    useEffect(() => {
      // Clean up any debug elements
      const debugBox = scene.getObjectByName('scrollTextDebugBox');
      if (debugBox) {
        scene.remove(debugBox);
      }
    }, [scene]);

    // Add useEffect for setting up scroll animations with focus on static closed state
    useEffect(() => {
      if (scrollObjectFound && alligatorScrollObjectRef.current && modelAnimations?.length > 0 && !animationsReadyRef.current) {
        console.log("SCROLL_ANIM_SETUP: Setting up scroll closed state animation.");
        animationsReadyRef.current = true; // Mark as attempted/done to prevent re-running needlessly

        let animationTarget = null;
        // Traverse under the AlligatorScroll Object3D to find the 'Armature'
        alligatorScrollObjectRef.current.traverse((child) => {
          if (child.name === 'Armature' || child.name === 'AlligatorScroll.003') { 
            if (!animationTarget) { // Take the first one found
              animationTarget = child;
              console.log(`SCROLL_ANIM_SETUP: Found animation target ('${child.name}') for scroll:`, animationTarget);
            }
          }
        });

        if (!animationTarget) {
          console.warn("SCROLL_ANIM_SETUP: Could not find 'Armature' or 'AlligatorScroll.003'. Using AlligatorScroll itself.");
          animationTarget = alligatorScrollObjectRef.current;
        }

        scrollAnimationMixerRef.current = new THREE.AnimationMixer(animationTarget);
        console.log("SCROLL_ANIM_SETUP: Available animations:", modelAnimations.map(a => a.name));

        // Look specifically for the static closed state animation
        const STATIC_CLOSED_CLIP_NAME = 'Armature|2_Close Static_Armature';
        const CLOSE_CLIP_NAME = 'Armature|1_Close Action_Armature'; // Fallback

        const staticClosedClip = THREE.AnimationClip.findByName(modelAnimations, STATIC_CLOSED_CLIP_NAME);
        const closeClip = THREE.AnimationClip.findByName(modelAnimations, CLOSE_CLIP_NAME);

        if (staticClosedClip) {
            console.log(`SCROLL_ANIM_SETUP: Found STATIC CLOSED clip: '${STATIC_CLOSED_CLIP_NAME}'`, staticClosedClip);
            closeScrollActionRef.current = scrollAnimationMixerRef.current.clipAction(staticClosedClip);
            closeScrollActionRef.current.setLoop(THREE.LoopOnce);
            closeScrollActionRef.current.clampWhenFinished = true;
            closeScrollActionRef.current.timeScale = 1.0;
            closeScrollActionRef.current.enabled = true;
            closeScrollActionRef.current.paused = false;
            
            // Initially set to the end of the animation to show closed state without animation
            closeScrollActionRef.current.time = staticClosedClip.duration;
            closeScrollActionRef.current.play();
            console.log("SCROLL_ANIM_SETUP: Static closed state set");
        } else if (closeClip) {
            console.warn(`SCROLL_ANIM_SETUP: Static closed animation not found, using close animation instead.`);
            closeScrollActionRef.current = scrollAnimationMixerRef.current.clipAction(closeClip);
            closeScrollActionRef.current.setLoop(THREE.LoopOnce);
            closeScrollActionRef.current.clampWhenFinished = true;
            closeScrollActionRef.current.timeScale = 1.0;
            closeScrollActionRef.current.enabled = true;
            closeScrollActionRef.current.paused = false;
            
            // Set to end of animation for closed state
            closeScrollActionRef.current.time = closeClip.duration;
            closeScrollActionRef.current.play();
        } else {
            console.error(`SCROLL_ANIM_SETUP: Neither static closed nor close animation found!`);
        }
      }
    }, [scrollObjectFound, modelAnimations]); // Dependencies: scrollObjectFound and modelAnimations

    return (
      <>
        {/* Remove the Text component */}
      </>
    );
  }
);

// Add display name for ESLint
MoonScene.displayName = "MoonScene";

export default MoonScene;

