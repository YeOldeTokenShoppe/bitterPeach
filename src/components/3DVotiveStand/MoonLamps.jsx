import React, { useEffect, useRef } from "react";
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
  onSpawnFunctionReady,
}) => {
  const { scene, camera, gl } = useThree();
  const controlsRef = useRef();
  const moonsRef = useRef([]);
  const bodiesRef = useRef([]);
  const physicsRef = useRef({ world: null });
  const ammoRef = useRef(null);
  const moonTextureRef = useRef(null);
  const isPhysicsInitialized = useRef(false);
  const monstersRef = useRef([]);
  const monsterModelRef = useRef(null);
  const monsterAnimationsRef = useRef({});
  const monsterSpawnIntervalRef = useRef(null);
  const mixersRef = useRef([]);
  const maxProjectiles = 20; // Maximum number of projectiles allowed at once
  const projectileLifespan = 5000; // Milliseconds before auto-removing projectiles
  const projectilePoolRef = useRef([]);
  const clockRef = useRef(new THREE.Clock());

  // Constants for physics tuning - match original values
  const MOON_FRICTION = 0.1;
  const MOON_RESTITUTION = 0.7;
  const GROUND_FRICTION = 1.0;
  const GROUND_RESTITUTION = 1.0;
  const MODEL_FRICTION = 0.5;
  const MODEL_RESTITUTION = 0.3;
  const roomRadius = 28;
  const roomHeight = 80;
  const floorRadius = 30;

  const questStatusRef = useRef({
    totalMonsters: 4,
    monstersDefeated: 0,
    currentMonster: null,
    completed: false,
  });

  // Update the monsterTypes definition to include all 4 monsters
  const monsterTypes = useRef([
    {
      id: "nosferatu",
      modelPath: "/nosferatu.glb",
      scale: 1.3,
      yOffset: 8.3,
      animations: {
        idle: "idle",
        walk: "Walk",
        attack: "attack",
        hurt: "hurt",
      },
      completed: false,
    },
    {
      id: "murderClown",
      modelPath: "/murderClown.glb",
      scale: 1,
      yOffset: 1,
      animations: {
        idle: "Noesis Frames_Object_4",
        startFrame: 260,
        endFrame: 750,
        fallbackAnimation: "Noesis Frames",
      },
      completed: false,
    },
    {
      id: "zombie",
      modelPath: "/zombie.glb",
      scale: 1.2,
      yOffset: 1.5,
      animations: {
        idle: "idle",
        walk: "walk",
        attack: "attack",
        hurt: "hurt",
      },
      completed: false,
    },
    {
      id: "skeleton",
      modelPath: "/skeleton.glb",
      scale: 1.1,
      yOffset: 1.2,
      animations: {
        idle: "idle",
        walk: "walk",
        attack: "attack",
        hurt: "hurt",
      },
      completed: false,
    },
  ]);

  // Initialize refs for tracking
  const monsterStatus = useRef({
    nosferatu: { loaded: false, available: false, completed: false },
    murderClown: { loaded: false, available: false, completed: false },
    zombie: { loaded: false, available: false, completed: false },
    skeleton: { loaded: false, available: false, completed: false },
  });

  const loadedMonsterModels = useRef({});
  const setupScene = () => {
    if (controlsRef.current) return;

    const controls = new OrbitControls(camera, gl.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 3;
    controls.maxDistance = 80;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = (Math.PI / 2) * 0.9;

    // ✅ Hardcoded camera position and target
    const hardcodedTarget = new THREE.Vector3(0, 0, 0);
    controls.target.copy(hardcodedTarget);
    camera.position.set(0, 10, 45);
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
        scene.environment = cubeTexture;
        scene.background = new THREE.Color(0x111111); // neutral background
      }
    );
  }, [scene]);
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

  const prepareMonsterAnimations = (monster, animations) => {
    // Create a mixer for this specific monster

    const mixer = new THREE.AnimationMixer(monster);

    // Helper function to remove the first keyframe from each track
    const removeFirstKeyframe = (clip) => {
      // Clone the clip to avoid modifying the original
      const newClip = clip.clone();
      newClip.tracks.forEach((track) => {
        if (track.times.length > 1) {
          // Make sure there's more than one keyframe
          track.times = track.times.slice(1);
          track.values = track.values.slice(track.getValueSize());
        }
      });
      newClip.resetDuration();
      return newClip;
    };

    // Process each animation
    const processedAnims = {};

    // Find the animations by name
    const idleClip = animations.find(
      (anim) => anim.name.toLowerCase() === "idle"
    );
    const walkClip = animations.find(
      (anim) => anim.name.toLowerCase() === "walk"
    );
    const attackClip = animations.find(
      (anim) => anim.name.toLowerCase() === "attack"
    );
    const hurtClip = animations.find(
      (anim) => anim.name.toLowerCase() === "hurt"
    );

    // Process each clip if found
    if (idleClip) {
      processedAnims.idle = removeFirstKeyframe(idleClip);
    }
    if (walkClip) {
      processedAnims.walk = removeFirstKeyframe(walkClip);
    }
    if (attackClip) {
      processedAnims.attack = removeFirstKeyframe(attackClip);
    }
    if (hurtClip) {
      processedAnims.hurt = removeFirstKeyframe(hurtClip);
    }

    return { mixer, animations: processedAnims };
  };

  const loadMonsterModel = (monsterId = null) => {
    // If no specific monster requested, choose random
    if (!monsterId) {
      const monsterOptions = monsterTypes.current;
      const randomIndex = Math.floor(Math.random() * monsterOptions.length);
      monsterId = monsterOptions[randomIndex].id;
    }

    console.log(`Starting to load monster model: ${monsterId}`);

    // Find the monster definition
    const monsterDef = monsterTypes.current.find((m) => m.id === monsterId);
    if (!monsterDef) {
      console.error(`Monster definition not found for: ${monsterId}`);
      return;
    }

    const loader = new GLTFLoader();
    loader.load(
      monsterDef.modelPath,
      (gltf) => {
        console.log(`Monster model loaded successfully: ${monsterId}`, gltf);
        const monster = gltf.scene;
        const monsterAnimations = gltf.animations;

        // Store for later use
        loadedMonsterModels.current[monsterId] = {
          model: monster.clone(),
          animations: monsterAnimations,
          definition: monsterDef,
        };

        // Position a test monster
        monster.scale.set(monsterDef.scale, monsterDef.scale, monsterDef.scale);
        monster.position.set(2, monsterDef.yOffset, 3);
        monster.rotation.set(0, Math.PI, 0);

        // Create mixer
        const monsterMixer = new THREE.AnimationMixer(monster);
        mixersRef.current.push(monsterMixer);

        // Handle different animation setup based on monster type
        if (monsterId === "nosferatu") {
          setupNosferatuAnimations(monster, monsterMixer, monsterAnimations);
        } else if (monsterId === "murderClown") {
          setupMurderClownAnimations(
            monster,
            monsterMixer,
            monsterAnimations,
            monsterDef
          );
        }

        // Add monster to scene for testing
        scene.add(monster);

        // Store monster in our state
        monstersRef.current.push({
          id: monsterId,
          type: monsterId, // Use monsterId here instead of specificType
          model: monster,
          mixer: monsterMixer,
          hp: 100,
          lastHit: 0,
        });
      },
      null,
      (error) => {
        console.error(`Error loading monster model ${monsterId}:`, error);
      }
    );
  };
  const setupNosferatuAnimations = (monster, mixer, animations) => {
    console.log("Setting up animations for Nosferatu");

    if (!animations || animations.length === 0) {
      console.error("No animations found for Nosferatu!");
      return false;
    }

    // Helper function to remove first keyframe
    const removeFirstKeyframe = (clip) => {
      if (!clip || !clip.tracks) return;
      clip.tracks.forEach((track) => {
        if (track.times.length > 1) {
          track.times = track.times.slice(1);
          track.values = track.values.slice(track.getValueSize());
        }
      });
      clip.resetDuration();
    };

    // Find all relevant animations first
    const idleClip = animations.find(
      (anim) => anim.name.toLowerCase() === "idle"
    );
    const walkClip = animations.find(
      (anim) => anim.name.toLowerCase() === "walk"
    );
    const attackClip = animations.find(
      (anim) => anim.name.toLowerCase() === "attack"
    );

    if (!idleClip) {
      console.error("Error: Nosferatu idle animation not found!");
      console.log(
        "Available animations:",
        animations.map((a) => a.name)
      );
      return false;
    }

    // Remove first keyframe from all clips BEFORE creating any actions
    removeFirstKeyframe(idleClip);
    if (walkClip) removeFirstKeyframe(walkClip);
    if (attackClip) removeFirstKeyframe(attackClip);

    // Now create and play the idle action
    const idleAction = mixer.clipAction(idleClip);
    idleAction.setLoop(THREE.LoopRepeat);
    idleAction.play();

    // Store processed animations for later use
    if (walkClip) mixer.clipAction(walkClip);
    if (attackClip) mixer.clipAction(attackClip);

    console.log("Nosferatu animation setup complete");
    return true;
  };

  const setupMurderClownAnimations = (
    monster,
    mixer,
    animations,
    monsterDef
  ) => {
    console.log("Setting up Murder Clown animations");

    const animClip = animations.find((anim) => anim.name === "Noesis Frames");
    if (!animClip) {
      console.error("Murder Clown animation not found!");
      return false;
    }

    try {
      const startFrame = monsterDef.animations.startFrame;
      const endFrame = monsterDef.animations.endFrame;
      const totalFrames = animClip.tracks[1].times.length;

      const startTime = animClip.tracks[1].times[startFrame];
      const endTime =
        animClip.tracks[1].times[Math.min(endFrame, totalFrames - 1)];

      const timeClip = THREE.AnimationUtils.subclip(
        animClip,
        "clown_idle",
        startTime,
        endTime
      );

      const action = mixer.clipAction(timeClip);
      action.setLoop(THREE.LoopRepeat);
      action.play();

      console.log("Murder Clown animation setup complete");
      return true;
    } catch (e) {
      console.error("Error in Murder Clown animation setup:", e);
      return false;
    }
  };
  // Modify spawnMonster to use the loaded monster models

  const setupMonsterAnimations = (monster, mixer, animations, monsterType) => {
    console.log(`🎥 Setting up animations for ${monsterType}`);

    if (!animations || animations.length === 0) {
      console.error(`❌ No animations found for ${monsterType}`);
      return false;
    }

    let animationSuccess = false;

    // Route to the correct animation setup function
    if (monsterType === "nosferatu") {
      animationSuccess = setupNosferatuAnimations(monster, mixer, animations);
    } else if (monsterType === "murderClown") {
      animationSuccess = setupMurderClownAnimations(
        monster,
        mixer,
        animations,
        monsterTypes.current.find((m) => m.id === monsterType)
      );
    } else {
      animationSuccess = setupGenericMonsterAnimations(
        monster,
        mixer,
        animations
      );
    }

    if (!animationSuccess) {
      console.warn(`⚠️ Animations not properly set up for ${monsterType}`);
    } else {
      console.log(`✅ Animations successfully set up for ${monsterType}`);
    }

    return animationSuccess;
  };

  const spawnMonster = (specificType = null) => {
    console.log(`Attempting to spawn monster: ${specificType || "random"}`);

    let monsterType = specificType;
    if (!monsterType || !monsterStatus.current[monsterType]?.available) {
      const availableTypes = Object.keys(monsterStatus.current).filter(
        (type) => monsterStatus.current[type].available
      );

      if (availableTypes.length === 0) {
        console.error("No monster types available to spawn!");
        return;
      }

      monsterType =
        availableTypes[Math.floor(Math.random() * availableTypes.length)];
    }

    console.log(`Spawning monster of type: ${monsterType}`);

    // Get the stored monster data
    let monsterData = loadedMonsterModels.current[monsterType];
    if (!monsterData) {
      console.error(`Monster data not found for ${monsterType}`);
      return;
    }

    // Clone the model
    let monster = monsterData.model.clone();

    // Ensure proper cloning of materials and skeletons
    monster.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        if (child.skeleton) {
          child.skeleton = child.skeleton.clone();
        }
      }
    });

    console.log(`Monster cloned successfully: ${monsterType}`);

    // Clone animations
    const animations = monsterData.animations.map((anim) => {
      const clonedAnim = anim.clone();
      // Ensure all properties are properly cloned
      clonedAnim.tracks = anim.tracks.map((track) => track.clone());
      return clonedAnim;
    });

    // Create new mixer
    const monsterMixer = new THREE.AnimationMixer(monster);
    mixersRef.current.push(monsterMixer);

    let animationSuccess = false;

    // Type-specific setup
    if (monsterType === "nosferatu") {
      // Special Nosferatu setup
      monster.scale.set(1.3, 1.3, 1.3);
      monster.position.set(2, 8.3, 3);
      monster.rotation.set(0, Math.PI, 0);

      // Store for animation reference
      monsterModelRef.current = monster;
      monsterAnimationsRef.current = animations;

      // Set up animations with proper T-pose removal
      animationSuccess = setupNosferatuAnimations(
        monster,
        monsterMixer,
        animations
      );
    } else if (monsterType === "murderClown") {
      // Murder Clown setup
      monster.scale.set(
        monsterData.definition.scale,
        monsterData.definition.scale,
        monsterData.definition.scale
      );
      monster.position.set(2, monsterData.definition.yOffset, 3);
      monster.rotation.set(0, Math.PI, 0);

      animationSuccess = setupMurderClownAnimations(
        monster,
        monsterMixer,
        animations,
        monsterData.definition
      );
    } else {
      // Generic monster setup
      monster.scale.set(
        monsterData.definition.scale,
        monsterData.definition.scale,
        monsterData.definition.scale
      );
      monster.position.set(2, monsterData.definition.yOffset, 3);
      monster.rotation.set(0, Math.PI, 0);

      animationSuccess = setupGenericMonsterAnimations(
        monster,
        monsterMixer,
        animations
      );
    }

    if (!animationSuccess) {
      console.error(`Failed to set up animations for ${monsterType}`);
      return false;
    }

    // Add to scene after a short delay to prevent race conditions
    setTimeout(() => {
      console.log(`Adding ${monsterType} to scene...`);
      scene.add(monster);
    }, 100);

    // Store in tracking array
    monstersRef.current.push({
      id: `monster_${monsterType}_${Date.now()}`,
      type: monsterType,
      model: monster,
      mixer: monsterMixer,
      hp: 100,
      lastHit: 0,
    });

    console.log(`Monster spawned: ${monsterType}`);
    return true;
  };
  // Update startMonsterSpawning to load all models and start the quest
  const startMonsterSpawning = () => {
    console.log("Starting monster spawning sequence");

    // Reset quest status
    questStatusRef.current = {
      totalMonsters: monsterTypes.current.length,
      monstersDefeated: 0,
      currentMonster: null,
      completed: false,
    };

    console.log("Reset quest status:", questStatusRef.current);

    // Reset monster statuses
    monsterTypes.current.forEach((monster) => {
      monsterStatus.current[monster.id] = {
        loaded: false,
        available: false,
        completed: false,
      };
    });

    console.log("Initial monster statuses:");
    checkMonsterAvailability();

    // Load all monsters in sequence
    const loadSequentially = async () => {
      try {
        for (const monster of monsterTypes.current) {
          console.log(`Starting to load ${monster.id}...`);
          await loadSingleMonster(monster);
          console.log(`Finished loading ${monster.id}`);
        }

        console.log("All monsters loaded. Final status:");
        checkMonsterAvailability();
        spawnNextQuestMonster();
      } catch (error) {
        console.error("Error in monster loading sequence:", error);
      }
    };

    loadSequentially();
  };

  const checkMonsterAvailability = () => {
    console.log("=== Monster Availability Check ===");
    Object.entries(monsterStatus.current).forEach(([id, status]) => {
      // Convert the object to a string representation
      console.log(
        `${id}:`,
        JSON.stringify({
          loaded: status.loaded,
          available: status.available,
          completed: status.completed,
          modelLoaded: !!loadedMonsterModels.current[id],
        })
      );
    });
    console.log("================================");
  };
  // Modified initialization useEffect
  const loadSingleMonster = (monster) => {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      console.log(`Loading ${monster.id} model...`);

      loader.load(
        monster.modelPath,
        (gltf) => {
          console.log(`${monster.id} model load successful`);

          loadedMonsterModels.current[monster.id] = {
            model: gltf.scene.clone(),
            animations: gltf.animations,
            definition: monster,
          };

          monsterStatus.current[monster.id] = {
            loaded: true,
            available: true,
            completed: false,
          };

          console.log(
            `${monster.id} status updated:`,
            JSON.stringify(monsterStatus.current[monster.id])
          );
          resolve();
        },
        (progress) => {
          console.log(`${monster.id} loading progress:`, progress);
        },
        (error) => {
          console.error(`Error loading ${monster.id}:`, error);
          reject(error);
        }
      );
    });
  };
  const spawnNextQuestMonster = () => {
    console.log("\nAttempting to spawn next quest monster");
    console.log("Current monster statuses:");
    checkMonsterAvailability();

    // Find available monsters
    const availableMonsters = monsterTypes.current.filter((monster) => {
      const status = monsterStatus.current[monster.id];
      console.log(
        `Checking ${monster.id} availability:`,
        JSON.stringify({
          loaded: status?.loaded,
          available: status?.available,
          completed: status?.completed,
          hasModel: !!loadedMonsterModels.current[monster.id],
        })
      );
      return status?.loaded && status?.available && !status?.completed;
    });

    console.log(
      "Available monsters for spawn:",
      availableMonsters.map((m) => m.id).join(", ") || "none"
    );

    if (availableMonsters.length === 0) {
      console.log("No more monsters available - Quest completed!");
      console.log("Final monster statuses:");
      checkMonsterAvailability();
      questStatusRef.current.completed = true;
      return;
    }

    const nextMonster = availableMonsters[0];
    console.log(`Spawning next monster: ${nextMonster.id}`);

    // Clear existing monsters
    clearExistingMonsters();

    // Spawn the new monster
    spawnMonster(nextMonster.id);
  };

  const clearExistingMonsters = () => {
    // Remove all current monsters
    monstersRef.current.forEach((monster) => {
      if (monster.mixer) {
        monster.mixer.stopAllAction();
        mixersRef.current = mixersRef.current.filter(
          (m) => m !== monster.mixer
        );
      }

      if (monster.model && monster.model.parent) {
        scene.remove(monster.model);
      }
    });

    monstersRef.current = [];
  };

  // Add a function to handle setup for generic monsters (zombie and skeleton)
  const setupGenericMonsterAnimations = (monster, mixer, animations) => {
    console.log("Setting up generic monster animations");

    const idleClip = animations.find(
      (anim) =>
        anim.name.toLowerCase().includes("idle") ||
        anim.name.toLowerCase().includes("stand")
    );

    if (!idleClip) {
      console.warn(
        "No idle animation found for generic monster, using fallback."
      );
      if (animations.length > 0) {
        console.log("Using first available animation");
        const action = mixer.clipAction(animations[0]);
        action.play();
        return true;
      }
      return false;
    }

    const processedClip = idleClip.clone();
    processedClip.tracks.forEach((track) => {
      if (track.times.length > 1) {
        track.times = track.times.slice(1);
        track.values = track.values.slice(track.getValueSize());
      }
    });

    processedClip.resetDuration();
    const action = mixer.clipAction(processedClip);
    action.play();

    console.log("Generic monster animation setup complete");
    return true;
  };
  const killMonster = (monster) => {
    if (!monster || !monster.model) return;

    console.log(`Killing monster type: ${monster.type}`);
    console.log(
      `Previous status:`,
      JSON.stringify(monsterStatus.current[monster.type])
    );

    // Update status
    monsterStatus.current[monster.type] = {
      ...monsterStatus.current[monster.type],
      completed: true,
      loaded: true, // Keep it loaded
      available: true, // Keep it available
    };

    console.log(
      `Updated status:`,
      JSON.stringify(monsterStatus.current[monster.type])
    );

    questStatusRef.current.monstersDefeated++;
    console.log(
      `Monsters defeated: ${questStatusRef.current.monstersDefeated}/${questStatusRef.current.totalMonsters}`
    );

    // Normal cleanup...
    if (monster.mixer) {
      monster.mixer.stopAllAction();
      mixersRef.current = mixersRef.current.filter((m) => m !== monster.mixer);
    }

    createHitEffect(monster.model.position);
    scene.remove(monster.model);
    monstersRef.current = monstersRef.current.filter(
      (m) => m.id !== monster.id
    );

    // Log complete status before spawning next
    console.log("Monster status after defeat:");
    checkMonsterAvailability();

    // Schedule next spawn
    setTimeout(() => {
      console.log("Spawning next monster in sequence...");
      spawnNextQuestMonster();
    }, 3000);
  };
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
      //   color: 0x555555,
      transparent: true,
      opacity: 0.0,
      depthWrite: false, // Prevent writing to depth buffer
      colorWrite: false, // Prevent writing to color buffer
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    // wall.receiveShadow = true;
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
    console.log("Checking for Floor2...");
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
    rigidBody.setFriction(0.8);
    rigidBody.setRestitution(0.1);
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
      lightMapIntensity: 3,
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
      40, // intensity
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
    const showDebugShape = false;
    const AmmoLib = ammoRef.current;

    modelRef.current.traverse((child) => {
      if (!child.isMesh) return;

      let shape;
      const isWall = child.name === "wall";
      // Define isFloor2 inside the traverse where child is defined
      const isFloor2 = child.name === "Floor2.002";
      const isMainFloor =
        child.name.toLowerCase().includes("floor") && !isFloor2;

      // Rest of your code using isFloor2...
      if (isFloor2) {
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
          console.error("All shape creation methods failed for Floor2.002");
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
        // Mark this as Floor2 for physics properties later
        child.userData.isFloor2 = true;
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
      if (child.userData.isFloor2) {
        // Apply specific properties for Floor2
        body.setFriction(0.8);
        body.setRestitution(0.2); // Lower restitution to reduce bounce

        // Set a different collision flag for Floor2
        body.setCollisionFlags(1); // 1 = static

        console.log("Floor2 physics applied with convex hull");
      } else {
        // Regular physics for other objects
        body.setFriction(MODEL_FRICTION);
        body.setRestitution(MODEL_RESTITUTION);
        body.setDamping(0, 0);

        // Set as kinematic static object
        body.setCollisionFlags(body.getCollisionFlags() | 2); // 2 = kinematic
      }

      body.name = child.name;

      physicsRef.current.world.addRigidBody(body);
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
    const projectileSize = 0.8;

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

    projectile.position.copy(origin);
    scene.add(projectile);

    const projectileShape = new AmmoLib.btSphereShape(projectileSize / 2);
    projectileShape.setMargin(0.01);

    const projectileTransform = new AmmoLib.btTransform();
    projectileTransform.setIdentity();
    projectileTransform.setOrigin(
      new AmmoLib.btVector3(origin.x, origin.y, origin.z)
    );

    const mass = 1;
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

    projectileBody.setFriction(0.8);
    projectileBody.setRestitution(0.05);
    projectileBody.setDamping(0.4, 0.4);
    projectileBody.setRollingFriction(0.3);

    const force = 80;
    const velocity = new AmmoLib.btVector3(
      direction.x * force,
      direction.y * force,
      direction.z * force
    );
    projectileBody.setLinearVelocity(velocity);
    projectileBody.setActivationState(4);

    physicsRef.current.world.addRigidBody(projectileBody);
    bodiesRef.current.push({
      mesh: projectile,
      body: projectileBody,
      createdAt: Date.now(),
    });
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
  // Helper function to generate random color like the original
  // const getRandomColor = () => {
  //   const color = new THREE.Color();
  //   color.setHSL(
  //     Math.abs(THREE.MathUtils.randInt(-1000, 1000) / 1000),
  //     1,
  //     THREE.MathUtils.randInt(500, 700) / 1000
  //   );
  //   return color;
  // };

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
        .add(direction.clone().multiplyScalar(10)) // 3x the original
        .add(new THREE.Vector3(0, -1, 5));

      shootProjectile(adjustedOrigin, direction);
    }
  };

  // Setup click listener
  // useEffect(() => {
  //   const canvas = gl.domElement;
  //   canvas.addEventListener("pointerdown", handleClick);

  //   return () => {
  //     canvas.removeEventListener("pointerdown", handleClick);
  //   };
  // }, []);
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
        const adjustedOrigin = camera.position
          .clone()
          .add(direction.clone().multiplyScalar(8));

        shootProjectile(adjustedOrigin, direction);
      }

      // Update the last click timestamp
      lastClickTime.current = currentTime;
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [camera, shootProjectile]);
  const checkProjectileMonsterCollisions = () => {
    // Skip if no monsters or projectiles
    if (monstersRef.current.length === 0 || bodiesRef.current.length === 0)
      return;

    // Only check a subset of projectiles each frame for better performance
    // This creates a rolling window of collision checks
    const maxChecksPerFrame = 5;
    let checksRemaining = maxChecksPerFrame;

    // Find projectiles
    const projectiles = bodiesRef.current.filter(
      (obj) => obj.mesh && obj.mesh.name === "shootingBall"
    );

    if (projectiles.length === 0) return;

    // Static counter to track which projectiles we've checked
    if (
      typeof checkProjectileMonsterCollisions.lastCheckedIndex === "undefined"
    ) {
      checkProjectileMonsterCollisions.lastCheckedIndex = 0;
    }

    // Reset index if it's out of bounds
    if (
      checkProjectileMonsterCollisions.lastCheckedIndex >= projectiles.length
    ) {
      checkProjectileMonsterCollisions.lastCheckedIndex = 0;
    }

    let index = checkProjectileMonsterCollisions.lastCheckedIndex;
    const startIndex = index; // Remember where we started

    // Check projectiles in a round-robin fashion
    do {
      const projectileObj = projectiles[index];
      if (projectileObj && projectileObj.mesh) {
        const projectilePos = projectileObj.mesh.position;

        // Check each monster for this projectile
        monstersRef.current.forEach((monster) => {
          if (!monster.model) return;

          // Get monster bounding box
          const monsterBox = new THREE.Box3().setFromObject(monster.model);
          const monsterCenter = new THREE.Vector3();
          monsterBox.getCenter(monsterCenter);

          const monsterSize = new THREE.Vector3();
          monsterBox.getSize(monsterSize);
          const maxDimension = Math.max(
            monsterSize.x,
            monsterSize.y,
            monsterSize.z
          );

          // Use half the monster's size plus projectile size as hit radius
          const hitRadius = maxDimension / 2 + 0.5;
          const distance = projectilePos.distanceTo(monsterCenter);

          if (distance < hitRadius) {
            console.log(`HIT DETECTED! Monster ${monster.id}`);
            handleMonsterHit(monster, projectilePos);

            // Recycle projectile
            const objIndex = bodiesRef.current.indexOf(projectileObj);
            if (objIndex !== -1) {
              recycleProjectile(projectileObj, objIndex);
            }
          }
        });
      }

      // Move to next projectile
      index = (index + 1) % projectiles.length;
      checksRemaining--;
    } while (checksRemaining > 0 && index !== startIndex);

    // Save the next index to check
    checkProjectileMonsterCollisions.lastCheckedIndex = index;
  };

  const handleMonsterHit = (monster, hitPosition) => {
    const now = Date.now();
    if (now - monster.lastHit < 800) return; // Prevent rapid hits
    monster.lastHit = now;

    // Reduce HP
    monster.hp -= 50;
    console.log(`Monster ${monster.id} hit! HP: ${monster.hp}`);

    // Play hurt animation
    if (monster.hp > 0) {
      console.log(`Playing hurt animation for ${monster.id}`);
      playMonsterAnimation(monster, "hurt", () => {
        console.log(`Returning to idle animation for ${monster.id}`);
        playMonsterAnimation(monster, "idle");
      });

      // Move monster slightly away from the hit point
      const hitDir = new THREE.Vector3()
        .subVectors(monster.model.position, hitPosition)
        .normalize()
        .multiplyScalar(3);

      const targetPos = monster.model.position.clone().add(hitDir);
      const distanceFromCenter = Math.sqrt(
        targetPos.x * targetPos.x + targetPos.z * targetPos.z
      );

      if (distanceFromCenter > roomRadius * 0.8) {
        hitDir.multiplyScalar(0.3);
        targetPos.copy(monster.model.position).add(hitDir);
      }

      // Animate movement
      const startPos = monster.model.position.clone();
      const startTime = Date.now();
      const moveDuration = 500;

      const moveAnimation = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed >= moveDuration) return;

        const progress = elapsed / moveDuration;
        monster.model.position.lerpVectors(
          startPos,
          targetPos,
          Math.sin((progress * Math.PI) / 2)
        );

        requestAnimationFrame(moveAnimation);
      };

      requestAnimationFrame(moveAnimation);
    } else {
      console.log(`Monster ${monster.id} defeated! Calling killMonster.`);
      killMonster(monster);
    }
  };
  const playMonsterAnimation = (monster, animName, onComplete) => {
    if (!monster || !monster.mixer) {
      console.warn("Invalid monster or mixer in playMonsterAnimation");
      return false;
    }

    try {
      // Get monster type
      const monsterType = monster.type || "nosferatu";
      console.log(`Playing ${animName} animation for ${monsterType}`);

      // Special case for murder clown - always use the same animation setup
      if (monsterType === "murderClown") {
        if (loadedMonsterModels.current[monsterType]) {
          const monsterData = loadedMonsterModels.current[monsterType];
          const monsterDef = monsterData.definition;

          // Just reuse the setup function
          setupMurderClownAnimations(
            monster.model,
            monster.mixer,
            monsterData.animations,
            monsterDef
          );
          return true;
        } else {
          console.error("Murder clown model data not found");
          return false;
        }
      }

      // For other monster types, find animations
      let animationClip = null;

      // Check nosferatu animations
      if (
        monsterType === "nosferatu" &&
        Array.isArray(monsterAnimationsRef.current)
      ) {
        animationClip = monsterAnimationsRef.current.find(
          (anim) => anim.name.toLowerCase() === animName.toLowerCase()
        );
      }
      // For other types, check loadedMonsterModels
      else if (loadedMonsterModels.current[monsterType]) {
        const monsterData = loadedMonsterModels.current[monsterType];
        if (Array.isArray(monsterData.animations)) {
          animationClip = monsterData.animations.find(
            (anim) => anim.name.toLowerCase() === animName.toLowerCase()
          );
        }
      }

      // If no clip found, use fallback
      if (!animationClip) {
        console.warn(
          `Animation ${animName} not found for ${monsterType}, using fallback`
        );

        // Try to find any animation
        if (
          monsterType === "nosferatu" &&
          Array.isArray(monsterAnimationsRef.current) &&
          monsterAnimationsRef.current.length > 0
        ) {
          animationClip = monsterAnimationsRef.current[0];
        } else if (
          loadedMonsterModels.current[monsterType] &&
          Array.isArray(loadedMonsterModels.current[monsterType].animations) &&
          loadedMonsterModels.current[monsterType].animations.length > 0
        ) {
          animationClip =
            loadedMonsterModels.current[monsterType].animations[0];
        }

        if (!animationClip) {
          console.error("No fallback animation found");
          return false;
        }
      }

      // Clone and process clip
      const processedClip = animationClip.clone();
      if (
        processedClip.tracks.length > 0 &&
        processedClip.tracks[0].times.length > 1
      ) {
        processedClip.tracks.forEach((track) => {
          track.times = track.times.slice(1);
          track.values = track.values.slice(track.getValueSize());
        });
        processedClip.resetDuration();
      }

      // Stop all current animations
      monster.mixer.stopAllAction();

      // Create and play the new action
      const action = monster.mixer.clipAction(processedClip);

      if (animName === "hurt") {
        action.setLoop(THREE.LoopOnce);
        action.clampWhenFinished = true;

        if (onComplete) {
          const finishedCallback = (e) => {
            if (e.action === action) {
              monster.mixer.removeEventListener("finished", finishedCallback);
              onComplete();
            }
          };
          monster.mixer.addEventListener("finished", finishedCallback);
        }
      }

      action.play();
      return true;
    } catch (error) {
      console.error("Error in playMonsterAnimation:", error);
      return false;
    }
  };

  const createHitEffect = (position) => {
    // Simple particle effect
    const particles = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(
        Array(15)
          .fill()
          .map(
            () =>
              new THREE.Vector3(
                position.x + (Math.random() - 0.5),
                position.y + (Math.random() - 0.5),
                position.z + (Math.random() - 0.5)
              )
          )
      ),
      new THREE.PointsMaterial({
        color: 0xff3300,
        size: 0.2,
        blending: THREE.AdditiveBlending,
      })
    );

    scene.add(particles);

    // Remove after animation
    setTimeout(() => {
      scene.remove(particles);
    }, 500);
  };
  const INITIAL_CAMERA_TARGET = [0, 14.6, 0];
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

    // Pass startMonsterSpawning instead of loadMonsterModel
    if (onSpawnFunctionReady) {
      console.log(
        "MoonScene: Providing startMonsterSpawning function to parent"
      );
      onSpawnFunctionReady(startMonsterSpawning);
    }

    startSimulation();

    return () => {
      // Cleanup physics resources
      if (physicsRef.current.world && ammoRef.current) {
        // Proper Ammo.js cleanup would go here
      }
      if (monsterSpawnIntervalRef.current) {
        clearInterval(monsterSpawnIntervalRef.current);
      }

      // Clean up animation mixers
      mixersRef.current.forEach((mixer) => {
        mixer.stopAllAction();
      });
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

  let lastCheck = 0;
  const checkInterval = 1000 / 30;
  useFrame((state, delta) => {
    const now = performance.now();
    if (physicsRef.current?.world) {
      physicsRef.current.world.stepSimulation(1 / 60, 1, 1 / 60);
    }

    if (now - lastCheck > checkInterval) {
      checkProjectileMonsterCollisions();
      lastCheck = now;
    }
    if (controlsRef.current) {
      controlsRef.current.update();
    }
    if (mixersRef.current.length > 0) {
      mixersRef.current.forEach((mixer) => {
        mixer.update(delta);
      });
    }
    if (physicsRef.current?.world) {
      checkProjectileMonsterCollisions();
    }
    if (physicsRef.current?.world && ammoRef.current) {
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
