import React, { useEffect, useRef, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TextureLoader } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MoonScene = ({
  modelRef,
  modelCenter,
  onControlsCreated,
  initialTarget = [0, 0, 0],
  onSpawnReady,
}) => {
  const { scene, camera, gl } = useThree();
  const controlsRef = useRef();
  const moonsRef = useRef([]);
  const bodiesRef = useRef([]);
  const physicsRef = useRef({ world: null });
  const ammoRef = useRef(null);
  const moonTextureRef = useRef(null);
  const isPhysicsInitialized = useRef(false);

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

  const setupScene = () => {
    if (controlsRef.current) return;

    const controls = new OrbitControls(camera, gl.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 3;
    controls.maxDistance = 300;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = (Math.PI / 2) * 0.9;

    // ✅ Hardcoded camera position and target
    const hardcodedTarget = new THREE.Vector3(0, 0, 0);
    controls.target.copy(hardcodedTarget);
    camera.position.set(0, 10, 70);
    camera.lookAt(hardcodedTarget);

    camera.fov = 45;
    camera.updateProjectionMatrix();
    controls.update();
    controlsRef.current = controls;
  };

  // Within your initialization useEffect or setup function
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
      (cubeTexture) => {
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

  useEffect(() => {
    const textureLoader = new TextureLoader();
    textureLoader.load("/lunar_color.jpg", (lunarTexture) => {
      lunarTexture.anisotropy = 16;
      moonTextureRef.current = lunarTexture;

      // Ambient Light Setup
      // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      // scene.add(ambientLight);
    });
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
      opacity: 0.1, // Slightly visible for debugging
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
        const wallMotionState = new ammoRef.current.btDefaultMotionState(
          wallTransform
        );
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
  const createConvexHullShape = (geometry) => {
    const AmmoLib = ammoRef.current;
    if (!AmmoLib) return null;

    // Check cache first
    const geometryId = geometry.id;
    if (shapeCache.current.has(geometryId)) {
      return shapeCache.current.get(geometryId);
    }

    const shape = new AmmoLib.btConvexHullShape();
    const vertices = geometry.attributes.position.array;
    const tempBtVec = new AmmoLib.btVector3(0, 0, 0);

    // Use decimation to reduce vertex count
    const maxVertices = 100; // Limit number of vertices
    const stride = Math.max(1, Math.floor(vertices.length / 3 / maxVertices));

    for (let i = 0; i < vertices.length; i += 3 * stride) {
      if (i >= vertices.length) break;
      tempBtVec.setValue(vertices[i], vertices[i + 1], vertices[i + 2]);
      // Only set lastOne true for the final point
      const lastOne = i >= vertices.length - 3 * stride;
      shape.addPoint(tempBtVec, lastOne);
    }

    shape.setMargin(0.01); // Small non-zero margin for stability

    // Store in cache
    shapeCache.current.set(geometryId, shape);

    return shape;
  };

  // Create triangle mesh shape for terrain/floor
  const createTriangleMeshShape = (geometry) => {
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

    modelRef.current.traverse((child) => {
      // Use the exact name from Blender - child is defined inside this traverse function
      if (child.isMesh && child.name === "Floor2.002") {
        console.log("Found Floor2.002, setting up physics");
        setupPhysicsForFloor2(child);
      }
    });
  }, [modelRef.current, physicsRef.current.world]);

  const setupPhysicsForFloor2 = (floor2Mesh) => {
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
    floor2Mesh.matrixWorld.decompose(
      worldPosition,
      worldQuaternion,
      worldScale
    );

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
    if (!ammoRef.current || !physicsRef.current.world) return;
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

    // Create base material with texture
    const texture = moonTextureRef.current;
    const moonMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#faf0e6"),
      map: texture,
      lightMap: texture,
      lightMapIntensity: 3, // Reduced from 6 to 3
      envMapIntensity: 0.3, // Add low environment map intensity
      reflectivity: 0.3, // Reduce reflectivity
    });

    // Create moon mesh
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.copy(startPosition);
    moon.rotation.set(randRotX, randRotY, randRotZ);
    // moon.castShadow = true;
    moon.name = "pointLight"; // Match original name for physics

    // Create point light for the moon
    const pointLight = new THREE.PointLight(
      new THREE.Color("#faf0e6"),
      25, // intensity reduced from 50 to 25
      10 // distance
    );
    // pointLight.castShadow = true;
    // pointLight.shadow.bias = -0.01;
    moon.add(pointLight);

    // Add glowing effect layers as in original
    // Layer 1 - semi-transparent glow
    const glowMaterial1 = new THREE.MeshLambertMaterial({
      color: "white",
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
    moonShape.setMargin(0.05); // Prevents moons from overlapping
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
        COLLISION_GROUP_MOON // Ensure they collide with other moons
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
    modelRef.current.traverse((child) => {
      if (
        child.isMesh &&
        (child.name === "Object_3" || child.name === "Object_2.001")
      ) {
        // Set a user data flag to identify it later
        child.userData.excludeFromPhysics = true;

        // Keep it visible but don't let it interact with physics
        // Don't disable raycast completely - we still want it to be visible

        // Set a special collision group for this object
        child.userData.collisionGroup = 2; // COLLISION_GROUP_OBJECT3
      }
    });

    // Then process all other objects for physics
    modelRef.current.traverse((child) => {
      if (!child.isMesh) return;

      // Skip Object_3 and Statue from physics/collision detection
      if (
        child.userData.excludeFromPhysics ||
        child.name === "Object_3" ||
        child.name === "Statue"
      ) {
        return;
      }

      let shape;
      const isWall = child.name === "wall";
      // Define isFloor2 inside the traverse where child is defined
      const isFloor2 = child.name === "Floor2.002";
      const isFloor3 =
        child.name === "Floor3" ||
        child.name === "Floor3.001" ||
        child.name === "Floor3.002";
      const isMainFloor =
        child.name.toLowerCase().includes("floor") && !isFloor2 && !isFloor3;

      // Rest of your code using isFloor2...
      if (isFloor2 || isFloor3) {
        // Try to create a convex hull first
        shape = createConvexHullShape(child.geometry);

        // If that fails, try triangle mesh
        if (!shape) {
          console.log("Convex hull creation failed, trying triangle mesh");
          shape = createTriangleMeshShape(child.geometry);
        }

        // If both fail, try simple shape
        if (!shape) {
          console.log(
            "Triangle mesh creation failed, falling back to simple shape"
          );
          shape = createSimpleShape(child);
        }

        // Final fallback if all else fails
        if (!shape) {
          console.error(`All shape creation methods failed for ${child.name}`);
          return; // Skip this object
        }

        // Create custom debug visualization that follows the actual shape
        // instead of using a box helper
        const wireframe = new THREE.WireframeGeometry(child.geometry);
        const line = new THREE.LineSegments(
          wireframe,
          new THREE.LineBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
          })
        );
        child.add(line);
        line.position.copy(child.position);
        line.quaternion.copy(child.quaternion);
        line.scale.copy(child.scale);

        scene.add(line);
        line.position.set(0, 0.01, 0);
        // Skip the box helper for this object
        child.userData.skipBoxHelper = true;
        // Mark this as Floor2/Floor3 for physics properties later
        child.userData.isFloor2 = isFloor2;
        child.userData.isFloor3 = isFloor3;
      }

      // Handle wall
      else if (isWall) {
        shape = createTriangleMeshShape(child.geometry);
        if (!shape) shape = createSimpleShape(child);
      }
      // Handle other meshes
      else {
        shape = createConvexHullShape(child.geometry);
        if (!shape) shape = createSimpleShape(child);
      }

      // Rest of your existing code continues here...
      // Set up physics transform
      child.updateMatrixWorld();
      const position = new THREE.Vector3();
      const quaternion = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      child.matrixWorld.decompose(position, quaternion, scale);

      const transform = new AmmoLib.btTransform();
      transform.setIdentity();
      transform.setOrigin(
        new AmmoLib.btVector3(position.x, position.y, position.z)
      );
      transform.setRotation(
        new AmmoLib.btQuaternion(
          quaternion.x,
          quaternion.y,
          quaternion.z,
          quaternion.w
        )
      );

      // Apply scaling to shape
      const ammoScale = new AmmoLib.btVector3(scale.x, scale.y, scale.z);
      shape.setLocalScaling(ammoScale);

      const mass = 0; // Static object
      const localInertia = new AmmoLib.btVector3(0, 0, 0);
      const motionState = new AmmoLib.btDefaultMotionState(transform);
      const rbInfo = new AmmoLib.btRigidBodyConstructionInfo(
        mass,
        motionState,
        shape,
        localInertia
      );
      const body = new AmmoLib.btRigidBody(rbInfo);

      // Set physics properties based on object type
      if (child.userData.isFloor2 || child.userData.isFloor3) {
        // Apply specific properties for Floor2/Floor3
        body.setFriction(GROUND_FRICTION);
        body.setRestitution(GROUND_RESTITUTION); // Higher restitution for more bounce
        body.setDamping(0, 0); // No damping

        console.log(`${child.name} physics applied with convex hull`);
      } else {
        // Regular physics for other objects
        body.setFriction(MODEL_FRICTION);
        body.setRestitution(MODEL_RESTITUTION);
        body.setDamping(0, 0);

        // Set as kinematic static object
        body.setCollisionFlags(body.getCollisionFlags() | 2); // 2 = kinematic
      }

      body.name = child.name;

      physicsRef.current.world.addRigidBody(
        body,
        COLLISION_GROUP_DEFAULT, // collision group
        COLLISION_GROUP_DEFAULT |
          COLLISION_GROUP_MOON |
          COLLISION_GROUP_PROJECTILE // collision mask
      );
      child.userData.physicsBody = body;

      //   console.log(`Added physics for mesh: ${child.name}`);

      const showDebugShape = false; // Set to true for debugging

      if (
        showDebugShape &&
        shape &&
        !isMainFloor &&
        !child.userData.skipBoxHelper
      ) {
        const helper = new THREE.BoxHelper(child, 0xff0000);
        scene.add(helper);
      }
    });
  };
  const createSimpleShape = (mesh) => {
    const AmmoLib = ammoRef.current;
    if (!AmmoLib) return null;

    // Get bounding box
    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox;
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Create box shape
    return new AmmoLib.btBoxShape(
      new AmmoLib.btVector3(size.x / 2, size.y / 2, size.z / 2)
    );
  };

  // Add a function to check if a point is inside the room
  const isInsideRoom = (position) => {
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
      bodiesRef.current.filter(
        (obj) => obj.mesh && obj.mesh.name === "shootingBall"
      ).length >= maxProjectiles
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

    // Add to physics world - don't collide with walls at all
    physicsRef.current.world.addRigidBody(
      projectileBody,
      COLLISION_GROUP_PROJECTILE, // collision group
      COLLISION_GROUP_DEFAULT | COLLISION_GROUP_MOON // collision mask (doesn't include wall)
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
      .filter((obj) => obj.mesh && obj.mesh.name === "shootingBall")
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

  const handleClick = (event) => {
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
      const currentTime = performance.now();
      const timeSinceLastClick = currentTime - lastClickTime.current;

      if (timeSinceLastClick <= doubleClickDelay) {
        // This is a double-click
        const mouse = new THREE.Vector2(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const direction = raycaster.ray.direction.clone().normalize();

        // Spawn closer to camera to match original effect
        shootProjectile(
          camera.position.clone().add(direction.clone().multiplyScalar(2)),
          direction
        );
      }

      // Update the last click timestamp
      lastClickTime.current = currentTime;
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [camera]);

  // Initialize scene
  useEffect(() => {
    const startSimulation = async () => {
      await initPhysics();
      setupScene();

      // Delayed moon spawning to ensure physics is ready
      setTimeout(() => {
        for (let i = 0; i < 4; i++) {
          spawnMoon();
        }
      }, 100);
    };

    startSimulation();

    return () => {
      // Cleanup physics resources
      if (physicsRef.current.world && ammoRef.current) {
        // Proper Ammo.js cleanup would go here
      }

      // Clean up animation mixers
    };
  }, []);

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
    // Fixed timestep physics
    if (physicsRef.current?.world) {
      // Accumulate time and step physics with fixed timestep
      accumulator += delta;

      // Step physics with fixed timestep for stability
      while (accumulator >= fixedTimeStep) {
        physicsRef.current.world.stepSimulation(
          fixedTimeStep,
          1,
          fixedTimeStep
        );
        accumulator -= fixedTimeStep;
      }
    }

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    // Update animation mixers
    if (mixersRef.current.length > 0) {
      mixersRef.current.forEach((mixer) => {
        mixer.update(delta);
      });
    }

    // Update meshes from physics bodies
    if (physicsRef.current?.world && ammoRef.current) {
      bodiesRef.current.forEach((obj, index) => {
        if (!obj.mesh || !obj.body) return;

        const motionState = obj.body.getMotionState();
        if (motionState) {
          const transform = new ammoRef.current.btTransform();
          motionState.getWorldTransform(transform);
          const origin = transform.getOrigin();
          const rotation = transform.getRotation();

          obj.mesh.position.set(origin.x(), origin.y(), origin.z());
          obj.mesh.quaternion.set(
            rotation.x(),
            rotation.y(),
            rotation.z(),
            rotation.w()
          );
        }
      });

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
    }

    // Check for Object_3 collisions
    checkObject3Collisions();
  });
};

export default MoonScene;
