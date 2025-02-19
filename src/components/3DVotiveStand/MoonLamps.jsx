import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { TextureLoader } from "three";

const MoonScene = ({
  modelRef,
  onControlsCreated,
  initialTarget = [0, 0, 0], // Default that can be overridden
}) => {
  const { scene, camera, gl } = useThree();
  const controlsRef = useRef();
  const moonsRef = useRef([]);
  const bodiesRef = useRef([]);
  const physicsRef = useRef({ world: null });
  const ammoRef = useRef(null);
  const moonTextureRef = useRef(null);
  const isPhysicsInitialized = useRef(false);

  // Constants for physics tuning - match original values
  const MOON_FRICTION = 0.1; // Updated to match original
  const MOON_RESTITUTION = 0.7;
  const GROUND_FRICTION = 1.0;
  const GROUND_RESTITUTION = 1.0;
  const MODEL_FRICTION = 0.5;
  const MODEL_RESTITUTION = 0.3;
  const roomRadius = 28;
  const roomHeight = 60;
  const floorRadius = 30;

  useEffect(() => {
    const textureLoader = new TextureLoader();
    textureLoader.load(
      "https://happy358.github.io/Images/textures/lunar_color.jpg",
      (lunarTexture) => {
        lunarTexture.anisotropy = 16;
        moonTextureRef.current = lunarTexture;

        // Ambient Light Setup
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
      }
    );
  }, []);

  // Improved Ammo.js loading with proper error handling
  const initPhysics = async () => {
    if (ammoRef.current) return ammoRef.current;

    try {
      const AmmoLib = await new Promise((resolve, reject) => {
        // Check if Ammo is already loaded
        if (typeof Ammo !== "undefined") {
          // Check if Ammo is a function or already initialized
          if (typeof Ammo === "function") {
            Ammo().then(resolve).catch(reject);
          } else {
            // Ammo is already initialized
            resolve(Ammo);
          }
          return;
        }

        const script = document.createElement("script");
        script.src = "/ammo/ammo.wasm.js";
        script.onload = () => {
          Ammo().then(resolve).catch(reject);
        };
        script.onerror = () => reject(new Error("Failed to load Ammo.js"));
        document.body.appendChild(script);
      });

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
      //   color: 0x555555,
      transparent: true,
      opacity: 0.0,
      depthWrite: false, // Prevent writing to depth buffer
      colorWrite: false, // Prevent writing to color buffer
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.receiveShadow = true;
    wall.name = "wall";
    scene.add(wall);

    // Add wall and floor to physics when physics is initialized
    const addRoomToPhysics = () => {
      if (!physicsRef.current.world || !ammoRef.current) return;

      console.log("Adding room elements to physics...");

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
        physicsRef.current.world.addRigidBody(wallBody);
        wall.userData.physicsBody = wallBody;
        console.log("Wall added to physics");
      }

      // Add floor to physics
      //   const floorShape = createTriangleMeshShape(floorGeometry);
      //   if (floorShape) {
      //     const floorTransform = new ammoRef.current.btTransform();
      //     floorTransform.setIdentity();
      //     const floorMotionState = new ammoRef.current.btDefaultMotionState(
      //       floorTransform
      //     );
      //     const floorBody = new ammoRef.current.btRigidBody(
      //       new ammoRef.current.btRigidBodyConstructionInfo(
      //         0, // Static mass
      //         floorMotionState,
      //         floorShape,
      //         new ammoRef.current.btVector3(0, 0, 0)
      //       )
      //     );
      //     floorBody.setFriction(GROUND_FRICTION);
      //     floorBody.setRestitution(GROUND_RESTITUTION);
      //     physicsRef.current.world.addRigidBody(floorBody);
      //     floor.userData.physicsBody = floorBody;
      //     console.log("Floor added to physics");
      //   }
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
        // scene.remove(floor);
      }

      wallGeometry.dispose();
      wallMaterial.dispose();
      //   floorGeometry.dispose();
      //   floorMaterial.dispose();
    };
  }, [scene]);

  // Create convex hull for more accurate collision detection
  const createConvexHullShape = (geometry) => {
    const AmmoLib = ammoRef.current;
    if (!AmmoLib) return null;

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
    return shape;
  };

  // Create triangle mesh shape for terrain/floor
  const createTriangleMeshShape = (geometry) => {
    const AmmoLib = ammoRef.current;
    if (!AmmoLib) return null;

    // Need index array to create triangle mesh
    if (!geometry.index) {
      console.error("Geometry must be indexed to create triangle mesh");
      return null;
    }

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
    shape.setMargin(0);
    return shape;
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
      lightMapIntensity: 3,
    });

    // Create moon mesh
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    moon.position.copy(startPosition);
    moon.rotation.set(randRotX, randRotY, randRotZ);
    moon.castShadow = true;
    moon.name = "pointLight"; // Match original name for physics

    // Create point light for the moon
    const pointLight = new THREE.PointLight(
      new THREE.Color("#faf0e6"),
      40, // intensity
      10 // distance
    );
    pointLight.castShadow = true;
    pointLight.shadow.bias = -0.01;
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
    const moonShape = new AmmoLib.btSphereShape(moonSize);
    const moonTransform = new AmmoLib.btTransform();
    moonTransform.setIdentity();
    moonTransform.setOrigin(new AmmoLib.btVector3(spawnX, spawnY, spawnZ));

    // Apply rotation to physics body
    const q = new AmmoLib.btQuaternion();
    q.setEulerZYX(randRotZ, randRotY, randRotX);
    moonTransform.setRotation(q);

    const mass = 0.5; // Lighter mass for better physics
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

    // Match original physics properties
    moonBody.setFriction(MOON_FRICTION);
    moonBody.setRestitution(MOON_RESTITUTION);

    // Add some random motion as in original
    moonBody.setLinearVelocity(
      new AmmoLib.btVector3(
        THREE.MathUtils.randFloat(-1, 1),
        -3,
        THREE.MathUtils.randFloat(-1, 1)
      )
    );

    // Add angular velocity for rotation
    moonBody.setAngularVelocity(
      new AmmoLib.btVector3(
        THREE.MathUtils.randFloat(-1, 1),
        THREE.MathUtils.randFloat(-1, 1),
        THREE.MathUtils.randFloat(-1, 1)
      )
    );

    physicsRef.current.world.addRigidBody(moonBody);
    bodiesRef.current.push({ mesh: moon, body: moonBody });
  };

  // Add model to physics with proper collision detection
  const addModelToPhysics = () => {
    if (!modelRef?.current || !physicsRef.current.world || !ammoRef.current) {
      return;
    }

    const AmmoLib = ammoRef.current;

    modelRef.current.traverse((child) => {
      if (!child.isMesh) return;

      let shape;
      const isWall = child.name === "wall";

      if (child.name.startsWith("Floor2")) {
        // After creating the triangle mesh
        if (child.name.startsWith("Floor2") && shape) {
          // Create a wireframe visualization of the actual geometry
          const wireframe = new THREE.WireframeGeometry(child.geometry);
          const line = new THREE.LineSegments(
            wireframe,
            new THREE.LineBasicMaterial({
              color: 0x00ff00,
              transparent: true,
              opacity: 0.5,
            })
          );

          // Copy transform from the original mesh
          line.position.copy(child.position);
          line.quaternion.copy(child.quaternion);
          line.scale.copy(child.scale);

          scene.add(line);
        }

        shape = createTriangleMeshShape(child.geometry);

        if (!shape) {
          console.error(
            "Failed to create triangle mesh for Floor2, falling back to box"
          );
          shape = createSimpleShape(child);
        } else {
          console.log("Successfully created triangle mesh for Floor2");
        }
      } else if (isWall) {
        shape = createTriangleMeshShape(child.geometry);
        if (!shape) shape = createSimpleShape(child);
      } else {
        shape = createConvexHullShape(child.geometry);
        if (!shape) shape = createSimpleShape(child);
      }

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

      body.setFriction(MODEL_FRICTION);
      body.setRestitution(MODEL_RESTITUTION);
      body.setDamping(0, 0);

      // Set as kinematic static object
      body.setCollisionFlags(body.getCollisionFlags() | 2); // 2 = kinematic
      body.name = child.name;

      physicsRef.current.world.addRigidBody(body);
      child.userData.physicsBody = body;

      console.log(`Added physics for mesh: ${child.name}`);

      // Add this to your addModelToPhysics function
      const showDebugShape = false; // Set to true for debugging
      if (showDebugShape && shape) {
        // Create wireframe visualization of physics shape
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
  // Improved projectile shooting with consistent physics
  const shootProjectile = (origin, direction) => {
    if (!ammoRef.current || !physicsRef.current.world) return;
    const AmmoLib = ammoRef.current;

    // Create Three.js sphere for the projectile
    const projectileSize = 0.5;
    const projectileGeometry = new THREE.IcosahedronGeometry(projectileSize, 1);
    const projectileMaterial = new THREE.MeshPhongMaterial({
      color: getRandomColor(),
      flatShading: true,
      emissive: new THREE.Color(0x222222),
      shininess: 20,
    });

    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(origin);
    projectile.castShadow = true;
    projectile.name = "shootingBall"; // Match original name for consistent physics

    scene.add(projectile);
    // Create Ammo.js physics body
    // Create physics for projectile
    const projectileShape = new AmmoLib.btSphereShape(projectileSize); // Use same size variable
    const projectileTransform = new AmmoLib.btTransform();
    projectileTransform.setIdentity();
    projectileTransform.setOrigin(
      new AmmoLib.btVector3(origin.x, origin.y, origin.z)
    );

    const mass = 10; // Match original value
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

    // Set physics properties matching original
    projectileBody.setFriction(0.5);
    projectileBody.setRestitution(0.3);
    projectileBody.setDamping(0, 0);

    // Apply shooting force
    const force = 70; // Match original force
    const impulse = new AmmoLib.btVector3(
      direction.x * force,
      direction.y * force,
      direction.z * force
    );
    projectileBody.setLinearVelocity(impulse);

    // Add to physics world
    physicsRef.current.world.addRigidBody(projectileBody);
    bodiesRef.current.push({ mesh: projectile, body: projectileBody });
  };

  // Helper function to generate random color like the original
  const getRandomColor = () => {
    const color = new THREE.Color();
    color.setHSL(
      Math.abs(THREE.MathUtils.randInt(-1000, 1000) / 1000),
      1,
      THREE.MathUtils.randInt(500, 700) / 1000
    );
    return color;
  };

  // Add these at the top of your component with other refs
  const lastClickTime = useRef(0);
  const doubleClickDelay = 300; // milliseconds

  // Modified click handler for double-click
  const handleClick = (event) => {
    const currentTime = performance.now();
    const timeSinceLastClick = currentTime - lastClickTime.current;

    // Update last click time
    lastClickTime.current = currentTime;

    // Only shoot if this is a double-click
    if (timeSinceLastClick <= doubleClickDelay) {
      if (!physicsRef.current.world) return;

      // Convert screen click to world position
      const mouse = new THREE.Vector2();
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Raycast from camera into scene
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Set shooting start position from near the camera
      const direction = raycaster.ray.direction.clone();
      const startPosition = raycaster.ray.origin
        .clone()
        .add(direction.clone().multiplyScalar(1));

      // Shoot projectile in the direction of the click
      shootProjectile(startPosition, direction);
    }
  };

  // Setup click listener
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", handleClick);

    return () => {
      canvas.removeEventListener("pointerdown", handleClick);
    };
  }, []);
  //   const INITIAL_CAMERA_TARGET = [0, 14.6, 0];
  // Initialize scene
  useEffect(() => {
    const setupScene = () => {
      const controls = new OrbitControls(camera, gl.domElement);
      controls.autoRotate = true;
      //   controls.autoRotateSpeed = 0.1;
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.minDistance = 3;
      controls.maxDistance = 80;
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = (Math.PI / 2) * 0.9;
      //   const target = controlsConfig.target || [0, 11, 0];
      //   controls.target.set(...target);
      camera.fov = 40;
      camera.updateProjectionMatrix();
      controls.target.set(initialTarget[0], initialTarget[1], initialTarget[2]);
      controls.update();
      controlsRef.current = controls;

      // Expose controls to parent
      if (onControlsCreated) {
        onControlsCreated(controls, camera);
      }
    };

    const startSimulation = async () => {
      await initPhysics();

      setupScene();

      // Delayed moon spawning to ensure physics is ready
      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          spawnMoon();
        }
      }, 100);
    };

    startSimulation();

    return () => {
      // Cleanup physics resources
      if (physicsRef.current.world && ammoRef.current) {
        // Proper Ammo.js cleanup would go here
        // Currently Ammo.js doesn't expose a clean way to dispose resources
      }
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
        console.log("Adding model to physics");
        addModelToPhysics();
      }, 200);
    }
  }, [modelRef?.current, isPhysicsInitialized.current]);

  // Animation loop
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    if (physicsRef.current?.world && ammoRef.current) {
      // Step simulation with fixed timestep for stability
      physicsRef.current.world.stepSimulation(1 / 60, 10);

      // Update meshes from physics bodies
      bodiesRef.current.forEach(({ mesh, body }) => {
        if (!mesh || !body) return;

        const motionState = body.getMotionState();
        if (motionState) {
          const transform = new ammoRef.current.btTransform();
          motionState.getWorldTransform(transform);
          const origin = transform.getOrigin();
          const rotation = transform.getRotation();

          // Update mesh position and rotation - FIXED: Uncommented position update
          mesh.position.set(origin.x(), origin.y(), origin.z());
          mesh.quaternion.set(
            rotation.x(),
            rotation.y(),
            rotation.z(),
            rotation.w()
          );
        }
      });

      // Remove bodies that have fallen too far
      const toRemove = [];
      bodiesRef.current.forEach((obj, index) => {
        if (obj.mesh.position.y < -50) {
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
  });

  return null;
};

export default MoonScene;
