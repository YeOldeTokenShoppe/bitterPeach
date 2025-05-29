import React, { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import { useFrame, useThree, extend } from "@react-three/fiber";
import { Effects, useAspect, Html } from "@react-three/drei";
import { UnrealBloomPass, FilmPass, ShaderPass } from "three-stdlib";
import LaunchSkyEffect from "./LaunchSkyEffect";


// Extend Three.js components for JSX usage
extend({ UnrealBloomPass, FilmPass, ShaderPass });

// Create a completely new sky effect component with more safeguards

// Main RocketModel component - much simpler without context
function RocketModel({ updateAmbientLightDimming, userData, is80sMode, onLaunch, onTransitionStart, onSceneSwitch }) {
  console.log(`RocketModel: Initializing with is80sMode=${is80sMode}`);

  // Add a global test function to manually test scene switching
  useEffect(() => {
    window.testMoonSceneSwitch = () => {
      console.log("🧪 Testing manual scene switch to moon");
      if (typeof onSceneSwitch === 'function') {
        onSceneSwitch('moon');
      } else {
        console.error("🧪 onSceneSwitch not available");
      }
    };
    
    return () => {
      delete window.testMoonSceneSwitch;
    };
  }, [onSceneSwitch]);
  const rocketRef = useRef();
  const groupRef = useRef();
  const mixerRef = useRef(null);
  const { scene } = useThree();
  const initialY = useRef(0);
  const avatarTextureRef = useRef(null);

  // Add launch animation state
  const [isLaunching, setIsLaunching] = useState(false);
  const launchStartTime = useRef(null);
  const initialPosition = useRef(null);
  
  // Add countdown state
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(5); // Start at 5 seconds
  const countdownIntervalRef = useRef(null);

  // Refs for the spotlights and targets
  const redLightRef = useRef();
  const blueLightRef = useRef();
  const redTargetRef = useRef();
  const blueTargetRef = useRef();

  // State for light properties
  const [redLightProps, setRedLightProps] = useState({
    intensity: 2,
    distance: 20,
    angle: Math.PI / 3,
    penumbra: 0.4,
    positionY: 5,
    circleRadius: 3.0,
    rotationSpeed: 0.7,
    pulseSpeed: 3,
    pulseIntensity: 1,
  });

  const [blueLightProps, setBlueLightProps] = useState({
    intensity: 2,
    distance: 20,
    angle: Math.PI / 3,
    penumbra: 0.4,
    positionY: 2,
    circleRadius: 3.0,
    rotationSpeed: 0.7,
    pulseSpeed: 3,
    pulseIntensity: 1,
  });

  // State for thruster effect
  const [thrusterProps, setThrusterProps] = useState({
    enabled: true,
    amplitude: 0.1, // How high the rocket moves
    frequency: 1.5, // Speed of the movement
    randomness: 0.1, // Add some randomness to the movement
  });

  // State for rider properties
  const [riderProps, setRiderProps] = useState({
    color: "#00ffff", // Cyan color for better visibility
    opacity: 0.8,
    scale: 0.25,
    visible: true,
    rotationX: -Math.PI / 2,
    rotationY: 0,
    rotationZ: 0,
    emissive: "#333333", // Changed from black to dark gray
    emissiveIntensity: 0.1, // Slight emission
  });

  // State to store the avatar plane reference
  const avatarPlaneRef = useRef(null);

  // State to store the rider mesh reference
  const riderMeshRef = useRef(null);

  // Fixed avatar plane settings (previously controlled by GUI)
  const avatarPlaneSettings = {
    visible: true,
    rotationX: 4.7,
    rotationY: 72.3,
    rotationZ: 47,
    offsetX: -0.02,
    offsetY: 0.0,
    offsetZ: -0.0, // Increased z-offset to prevent z-fighting
    scale: 0.35,
    showOriginalMesh: false,
    followRider: true,
  };

  // Fixed settings for all controls that were previously in GUI
  const rocketSettings = {
    rocketScale: 1.0,
    showLightHelpers: false,
    // ambientLightDimming: 0.1,
  };

  // Launch configuration
  const [launchConfig, setLaunchConfig] = useState({
    duration: 5, // seconds for the launch sequence (changed from 6 to 10)
    maxHeight: 100, // how high the rocket will go
    maxSpeed: 15, // maximum speed during launch
    rotationFactor: 0.2, // slight rotation during launch
    thrusterIntensity: 2, // increased thruster effect during launch
  });

  // State for post-processing effects
  const [postProcessingEffects, setPostProcessingEffects] = useState({
    bloomEnabled: true,  // Don't enable bloom yet
    // bloomStrength: 0.3,
    bloomRadius: 0.2,
    bloomThreshold: 1,
    filmEnabled: false,   // Don't enable film yet
    filmNoisiness: 0.20,
    filmScanlines: 0,
    filmGrainSize: 2,
    fadeDuration: 6,
    fadeStartTime: null,
    thrustersIgnited: false
  });

  // References for post-processing effects
  const bloomRef = useRef();
  const filmRef = useRef();
  
  // Sky effect state - controls when the sky gradient is shown
  const [skyEffect, setSkyEffect] = useState({
    active: false,      // Start as inactive
    fadeProgress: 1.0,  // Fully faded out (completely invisible)
    initialized: false  // Track if we've properly initialized
  });


  // Update ambient light when the component mounts
  useEffect(() => {
    if (updateAmbientLightDimming) {
      // Don't dim the ambient light on initial load
      updateAmbientLightDimming(0);
    }
    
    // Return a cleanup function
    return () => {
      if (updateAmbientLightDimming) {
        // Restore normal lighting when unmounting
        updateAmbientLightDimming(0);
      }
    };
  }, [updateAmbientLightDimming]);

  // Use useMemo to prevent recreating the loader on every render
  const loader = useMemo(() => {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);
    return gltfLoader;
  }, []);

  // Function to safely create and apply a material to a mesh
  const safelyApplyMaterial = (mesh, materialProps) => {
    try {
      // Create a new material based on the provided properties
      const newMaterial = new THREE.MeshStandardMaterial({
        color: materialProps.color ? new THREE.Color(materialProps.color) : 0x00ffff,
        side: THREE.DoubleSide,
        transparent: materialProps.opacity < 0.5,
        opacity: materialProps.opacity || 0.2,
        emissive: materialProps.emissive
          ? new THREE.Color(materialProps.emissive)
          : new THREE.Color(0x333333),
        emissiveIntensity: materialProps.emissiveIntensity || 0.3,
        metalness: 0.2,
        roughness: 0.6,
        aoMapIntensity: 1.0, // Add ambient occlusion intensity
        envMapIntensity: 0.5, // Reduce environment map intensity
        lightMapIntensity: 0.5, // Reduce light map intensity
        receiveShadow: true, // Enable shadow receiving
      });

      // Create a simple ambient occlusion map
      const aoMap = new THREE.TextureLoader().load(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        texture => {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(1, 1);
          newMaterial.aoMap = texture;
          newMaterial.needsUpdate = true;
        }
      );

      // Store the original material if not already stored
      if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
      }

      // Apply the new material
      mesh.material = newMaterial;

      return true;
    } catch (error) {
      console.error("Error applying material to mesh:", error);
      return false;
    }
  };

  // Debug function to log user data
  useEffect(() => {
    console.log("RocketModel received userData:", userData);
    if (userData && userData.imageUrl) {
      console.log("User has an avatar image URL:", userData.imageUrl);
    } else {
      console.log("User does not have an avatar image URL");
    }
  }, [userData]);

  // Function to apply user avatar to the RIDER mesh
  const applyUserAvatar = model => {
    console.log("Applying user avatar to RIDER mesh");

    // Find all meshes in the model
    let riderMesh = null;
    let meshCount = 0;

    // List of possible names for the RIDER mesh
    const possibleRiderNames = [
      "RIDER",
      "rider",
      "Rider",
      "character",
      "Character",
      "pilot",
      "Pilot",
    ];

    // Find the RIDER mesh
    model.traverse(child => {
      if (child.isMesh) {
        meshCount++;

        // Check if this mesh has a name that matches one of our possible RIDER names
        if (possibleRiderNames.some(name => child.name.includes(name))) {
          riderMesh = child;
        }
      }
    });

    // If we didn't find a RIDER mesh by name, try to find the most complex mesh
    if (!riderMesh) {
      let maxVertices = 0;

      model.traverse(child => {
        if (child.isMesh) {
          // Get the number of vertices in this mesh
          const vertexCount = child.geometry.attributes.position.count;

          // If this mesh has more vertices than our current max, use it as the RIDER mesh
          if (vertexCount > maxVertices) {
            maxVertices = vertexCount;
            riderMesh = child;
          }
        }
      });
    }

    // If we found a RIDER mesh, apply the user avatar
    if (riderMesh) {
      console.log("Found RIDER mesh:", riderMesh.name);

      // Create a new material with specific properties
      const riderMaterial = new THREE.MeshStandardMaterial({
        color: riderProps.color,
        opacity: riderProps.opacity,
        emissive: new THREE.Color(0x000000), // Black emissive
        emissiveIntensity: 0.0, // No emission
        metalness: 0.0, // No metalness
        roughness: 1.0, // Maximum roughness
        envMapIntensity: 0.0, // No environment map influence
        lightMapIntensity: 0.0, // No light map influence
        aoMapIntensity: 1.0, // Full ambient occlusion
        receiveShadow: true, // Enable shadow receiving
        transparent: true,
        depthWrite: false,
      });

      // Store the original material
      if (!riderMesh.userData.originalMaterial) {
        riderMesh.userData.originalMaterial = riderMesh.material;
      }

      // Apply the new material
      riderMesh.material = riderMaterial;

      // Check if user data exists and has an image URL
      if (userData && userData.imageUrl) {
        console.log("Loading user avatar from:", userData.imageUrl);

        // Create a texture loader
        const textureLoader = new THREE.TextureLoader();

        // Load the user's avatar image with explicit crossOrigin setting
        textureLoader.setCrossOrigin("anonymous");
        textureLoader.load(
          userData.imageUrl,
          texture => {
            console.log("User avatar texture loaded successfully");
            applyTextureToMesh(texture, riderMesh);
          },
          undefined,
          error => {
            console.error("Error loading user avatar texture:", error);
            // Load fallback avatar on error
            loadFallbackAvatar(riderMesh);
          }
        );
      } else {
        console.log("No user avatar found, using Brett.jpg as fallback");
        // Use fallback avatar if no user data
        loadFallbackAvatar(riderMesh);
      }
    } else {
      console.log("No RIDER mesh found in the model");
    }
  };

  // Function to load fallback avatar
  function loadFallbackAvatar(riderMesh) {
    console.log("Loading fallback avatar: /Brett.jpg");

    // Create a texture loader
    const textureLoader = new THREE.TextureLoader();

    // Load Brett.jpg as the default avatar
    textureLoader.load(
      "/Brett.jpg",
      texture => {
        console.log("Fallback avatar loaded successfully");
        applyTextureToMesh(texture, riderMesh);
      },
      undefined,
      error => {
        console.error("Error loading fallback avatar:", error);

        // If Brett.jpg fails, fall back to a generated circle
        console.log("Falling back to generated circle");
        const dataURL = createCircleDataURL();

        textureLoader.load(
          dataURL,
          texture => {
            applyTextureToMesh(texture, riderMesh);
          },
          undefined,
          secondError => {
            console.error("Error loading generated fallback:", secondError);

            // Apply a solid color as last resort
            const colorMaterial = new THREE.MeshBasicMaterial({
              color: 0xff00ff, // Bright magenta
              side: THREE.DoubleSide,
            });

            // Apply to the RIDER mesh
            riderMesh.material = colorMaterial;
          }
        );
      }
    );
  }

  // Function to create a data URL for a simple colored circle
  function createCircleDataURL() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Fill background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circle
    ctx.beginPath();
    ctx.arc(128, 128, 100, 0, Math.PI * 2);
    ctx.fillStyle = "#ff00ff";
    ctx.fill();

    // Add border
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 10;
    ctx.stroke();

    // Add text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AVATAR", 128, 128);

    return canvas.toDataURL("image/png");
  }

  // Function to apply texture to the mesh
  const applyTextureToMesh = (texture, riderMesh) => {
    // Store the texture for cleanup
    avatarTextureRef.current = texture;

    // Store the rider mesh reference
    riderMeshRef.current = riderMesh;

    console.log("Creating avatar plane with texture");

    try {
      // Create a circular plane geometry (disc) instead of a square plane
      const circleGeometry = new THREE.CircleGeometry(3.0, 32);

      // Create a material with the texture
      const planeMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        depthTest: true, // Enable depth testing
        depthWrite: true, // Enable depth writing
        toneMapped: true, // Enable tone mapping
        color: new THREE.Color(0xffffff).multiplyScalar(0.5), // Reduce overall brightness by 30%
      });

      // Make sure texture settings are correct
      texture.flipY = false; // Prevent texture from being flipped
      texture.colorSpace = THREE.SRGBColorSpace; // Use sRGB encoding for proper colors
      texture.needsUpdate = true; // Ensure texture is updated

      // Update material settings
      planeMaterial.needsUpdate = true;

      // Create a plane mesh with the texture
      const plane = new THREE.Mesh(circleGeometry, planeMaterial);

      // Set a name for the plane for easy identification
      plane.name = "AvatarPlane";

      // Mark it as a rider for our tracking
      plane.userData.isRider = true;
      plane.userData.isAvatarPlane = true;

      // Set a higher renderOrder to ensure it renders on top
      plane.renderOrder = 1;

      // Get the world position of the RIDER mesh
      const riderWorldPosition = new THREE.Vector3();
      riderMesh.getWorldPosition(riderWorldPosition);

      // Position the plane at the RIDER mesh's world position
      plane.position.copy(riderWorldPosition);

      // Add initial offset to position it better
      plane.position.y += avatarPlaneSettings.offsetY;
      plane.position.z += avatarPlaneSettings.offsetZ;

      // Get the RIDER mesh's world quaternion
      const worldQuaternion = new THREE.Quaternion();
      riderMesh.getWorldQuaternion(worldQuaternion);

      // Store the world quaternion for later use in the useFrame hook
      plane.userData.worldQuaternion = worldQuaternion.clone();

      // Apply the world quaternion to the plane
      plane.quaternion.copy(worldQuaternion);

      // Apply rotations from settings
      plane.rotateX(avatarPlaneSettings.rotationX);
      plane.rotateY(avatarPlaneSettings.rotationY);
      plane.rotateZ(avatarPlaneSettings.rotationZ);

      // Get the bounding box of the RIDER mesh
      const box = new THREE.Box3().setFromObject(riderMesh);
      const size = box.getSize(new THREE.Vector3());

      // Store the original size for later use in the useFrame hook
      plane.userData.originalSize = {
        x: size.x * 0.8,
        y: size.y * 0.8,
      };

      // Set scale based on fixed settings
      plane.scale.set(avatarPlaneSettings.scale, avatarPlaneSettings.scale, 1);

      // Add the plane directly to the scene
      scene.add(plane);
      console.log("Added avatar plane to scene");

      // Make the original RIDER mesh fully transparent
      riderMesh.visible = true; // Keep visible for positioning
      if (riderMesh.material) {
        if (Array.isArray(riderMesh.material)) {
          riderMesh.material.forEach(m => {
            m.transparent = true;
            m.opacity = 0.0; // Completely transparent
            m.depthWrite = false; // Disable depth writing for the RIDER mesh
            m.needsUpdate = true;
          });
        } else {
          riderMesh.material.transparent = true;
          riderMesh.material.opacity = 0.0; // Completely transparent
          riderMesh.material.depthWrite = false; // Disable depth writing for the RIDER mesh
          riderMesh.material.needsUpdate = true;
        }
      }

      // Set a lower renderOrder for the RIDER mesh
      riderMesh.renderOrder = 0;

      // Store the plane reference for the useFrame hook
      avatarPlaneRef.current = plane;
    } catch (error) {
      console.error("Error creating textured plane:", error);

      // Fallback to a bright color
      console.log("Falling back to bright color for RIDER mesh");

      // Create a bright material
      const brightMaterial = new THREE.MeshBasicMaterial({
        color: 0xff00ff, // Bright magenta
        side: THREE.DoubleSide,
      });

      // Apply to the RIDER mesh
      riderMesh.material = brightMaterial;
      riderMesh.visible = true; // Ensure the mesh is visible
    }
  };

  // Function to clean up any duplicate rider meshes
  const cleanupDuplicateRiders = model => {
    // Find all meshes marked as riders
    const riderMeshes = [];
    model.traverse(child => {
      if (child.userData && child.userData.isRider) {
        riderMeshes.push(child);
      }
    });

    // If we have more than one rider mesh, keep only the first one
    if (riderMeshes.length > 1) {
      console.log(`Found ${riderMeshes.length} rider meshes, removing duplicates...`);

      // Keep the first one, remove the rest
      for (let i = 1; i < riderMeshes.length; i++) {
        const mesh = riderMeshes[i];
        console.log(`Removing duplicate rider mesh: ${mesh.name}`);

        // If the mesh has a parent, remove it from the parent
        if (mesh.parent) {
          mesh.parent.remove(mesh);
        }

        // Dispose of the mesh's geometry and material
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }

      console.log("Duplicate rider meshes removed");
    }
  };

  // Function to clean up textured meshes
  const cleanupTexturedMeshes = () => {
    if (!rocketRef.current) return;

    // Find all textured meshes
    const texturedMeshes = [];
    rocketRef.current.traverse(child => {
      if (child.name && child.name.includes("_textured")) {
        texturedMeshes.push(child);
      }
    });

    console.log(`Found ${texturedMeshes.length} textured meshes to clean up`);

    // Remove all textured meshes
    texturedMeshes.forEach(mesh => {
      // If this mesh has an original mesh reference, make it visible again
      if (mesh.userData.originalMesh) {
        mesh.userData.originalMesh.visible = true;
      }

      // Remove from parent
      if (mesh.parent) {
        mesh.parent.remove(mesh);
      }

      // Dispose of resources
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    console.log("Textured meshes cleaned up");
  };

  // Function to clean up avatar planes
  const cleanupAvatarPlanes = () => {
    if (!rocketRef.current) return;

    // Find all avatar planes
    const avatarPlanes = [];
    rocketRef.current.traverse(child => {
      if (child.name === "AvatarPlane" || child.userData.isAvatarPlane) {
        avatarPlanes.push(child);
      }
    });

    console.log(`Found ${avatarPlanes.length} avatar planes to clean up`);

    // Remove all avatar planes
    avatarPlanes.forEach(plane => {
      // Remove from parent
      if (plane.parent) {
        plane.parent.remove(plane);
      }

      // Dispose of resources
      if (plane.geometry) plane.geometry.dispose();
      if (plane.material) {
        if (Array.isArray(plane.material)) {
          plane.material.forEach(m => m.dispose());
        } else {
          plane.material.dispose();
        }
      }
    });

    console.log("Avatar planes cleaned up");
  };

  // Function to start the actual launch (moved from triggerLaunch)
  const startActualLaunch = useCallback(() => {
    console.log("🚀 Rocket launch initiated!");
    
    // Store initial position before launch
    if (groupRef.current) {
      initialPosition.current = { 
        x: groupRef.current.anchor.position.x,
        y: groupRef.current.anchor.position.y,
        z: groupRef.current.anchor.position.z
      };
    }
    
    // Set launch start time
    launchStartTime.current = performance.now() / 1000;
    
    // Set launching state
    setIsLaunching(true);
    
    // Enable post-processing effects for launch BUT keep sky colors disabled initially
    // Sky colors will be enabled when thrusters ignite (in updateThrusterEffects)
    setPostProcessingEffects({
      bloomEnabled: true,
      bloomStrength: 0.15,    // Reduced from 0.3
      bloomRadius: 0.15,      // Reduced from 0.2
      bloomThreshold: 0.95,   // Increased threshold for less bloom
      filmEnabled: true,
      filmNoisiness: 0.10,    // Reduced from 0.20
      filmScanlines: 0,
      filmGrainSize: 1,       // Reduced from 2
      fadeDuration: 6,
      fadeStartTime: null,
      thrustersIgnited: false
    });
    
    // Initialize sky effect as inactive until thrusters ignite - ENSURE IT STARTS OFF
    setSkyEffect({
      active: false,
      fadeProgress: 0,  // Fully faded out
      initialized: true   // Ensure it's marked as initialized
    });
    
    console.log("🚀 Initial launch setup complete - sky effect disabled until thrusters ignite");
    
    // Notify parent component if callback provided
    if (typeof onLaunch === 'function') {
      onLaunch();
    }
  }, [onLaunch]);

  // Function to start the countdown
  const startCountdown = useCallback(() => {
    console.log("🚀 Starting countdown sequence...");
    setIsCountingDown(true);
    setCountdownValue(5);
    
    // Clear any existing interval
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    // Start the countdown interval
    countdownIntervalRef.current = setInterval(() => {
      setCountdownValue(prev => {
        if (prev <= 1) {
          // Countdown complete, start actual launch
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
          setIsCountingDown(false);
          startActualLaunch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startActualLaunch]);

  // Function to trigger launch - can be called from a parent component
  const triggerLaunch = useCallback((forceReset = false) => {
    console.log("triggerLaunch called, groupRef:", groupRef.current, "isLaunching:", isLaunching, "forceReset:", forceReset);
    
    // If the rocket has already been launched and removed, inform the user
    if (!groupRef.current) {
      console.log("🚀 Cannot launch - rocket has already been launched and removed from scene");
      // Optional: Notify the user with a message that the rocket has already launched
      if (typeof onLaunch === 'function') {
        onLaunch(false, "Rocket has already been launched");
      }
      return false;
    }
    
    // If we're already launching but forceReset is true, we'll reset and launch again
    if (isLaunching && forceReset) {
      console.log("🚀 Force resetting previous launch sequence");
      setIsLaunching(false);
      setPostProcessingEffects(prev => ({
        ...prev,
        thrustersIgnited: false,  // Explicitly set to false
        fadeStartTime: null
      }));
      
      // Reset sky effect - make sure it's inactive at start
      setSkyEffect({
        active: false,
        fadeProgress: 1.0,  // Fully faded out
        initialized: true   // Ensure it's marked as initialized
      });
      
      // Clean up any smoke particles from previous launch
      cleanupAllSmokeParticles(scene);

      // Small delay to ensure state updates before proceeding
      setTimeout(() => {
        triggerLaunch(false);
      }, 50);
      return true;
    }
    
    if (groupRef.current && !isLaunching && !isCountingDown) {
      console.log("🚀 Starting countdown sequence!");
      
      // Start the countdown instead of immediate launch
      startCountdown();
      
      return true;
    } else {
      console.warn("Cannot launch: groupRef not available, already launching, or counting down", 
        { groupRef: groupRef.current, isLaunching, isCountingDown });
      return false;
    }
  }, [isLaunching, isCountingDown, onLaunch, scene, startCountdown]);

  // Expose the triggerLaunch function globally so it can be called from anywhere
  useEffect(() => {
    console.log("🚀 Setting up window.rocketLaunch function");
    
    // Create a global function to launch the rocket
    window.rocketLaunch = (forceReset = false) => {
      console.log("Global rocketLaunch called with forceReset:", forceReset);
      const result = triggerLaunch(forceReset);
      if (!result) {
        console.log("🚀 Rocket launch failed - rocket may have already been launched");
        return { success: false, message: "Rocket has already been launched" };
      }
      return { success: true };
    };
    
    // Expose a function to check if the rocket is available
    window.isRocketAvailable = () => {
      return !!groupRef.current;
    };
    
    // Cleanup function to remove the global function when unmounted
    return () => {
      console.log("Cleaning up window.rocketLaunch function");
      delete window.rocketLaunch;
      delete window.isRocketAvailable;
    };
  }, [triggerLaunch]);

  // Expose global functions to control thruster effects
  useEffect(() => {
    console.log("🔥 Setting up thruster control functions");
    
    // Create global functions to control thruster effects
    window.enableThrusters = (intensity = 0.1) => {
      console.log(`Thruster effects enabled with intensity ${intensity}`);
      setThrusterProps(prev => ({
        ...prev,
        enabled: true,
        amplitude: intensity, // Control thruster movement intensity
      }));
      return true;
    };

    window.disableThrusters = () => {
      console.log("Thruster effects disabled");
      setThrusterProps(prev => ({
        ...prev,
        enabled: false,
      }));
      return true;
    };
    
    // Cleanup function
    return () => {
      delete window.enableThrusters;
      delete window.disableThrusters;
    };
  }, []);

  // Handle incoming window messages directly in the RocketModel
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === "ROCKET_LAUNCH") {
        console.log("🚀 RocketModel received ROCKET_LAUNCH message directly");
        
        // Check if rocket is still available
        if (!groupRef.current) {
          console.log("🚀 Cannot launch - rocket has already been launched and removed from scene");
          
          // If we have a source to reply to
          if (event.source && event.source.postMessage) {
            event.source.postMessage({
              type: "ROCKET_LAUNCH_RESPONSE",
              success: false,
              message: "Rocket has already been launched"
            }, "*");
          }
          return;
        }
        
        // Get forceReset option from message if available
        const forceReset = event.data.forceReset === true;
        const result = triggerLaunch(forceReset);
        
        // Send response if possible
        if (event.source && event.source.postMessage) {
          event.source.postMessage({
            type: "ROCKET_LAUNCH_RESPONSE",
            success: !!result
          }, "*");
        }
      }
    };
    
    window.addEventListener("message", handleMessage);
    
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [triggerLaunch]);

  // Load the rocket model
  useEffect(() => {
    console.log("Loading rocket model...");
    loader.load(
      "/COMPLETEROCKET.glb",
      gltf => {
        console.log("Rocket model loaded successfully");
        const model = gltf.scene;

        // Always set the model to be visible, regardless of is80sMode
        model.visible = true;
        console.log("Setting rocket visibility to true");

        // Store the model in the ref
        rocketRef.current = model;

        // Special handling for Object_6
        model.traverse(child => {
          if (child.name === "Object_6") {
            // Ensure Object_6 renders after other objects
            child.renderOrder = 999; // Very high render order
            if (child.material) {
              const applyFixes = material => {
                material.depthWrite = true;
                material.depthTest = true;
                material.transparent = false;
                material.needsUpdate = true;
                // Ensure proper z-index
                material.polygonOffset = true;
                material.polygonOffsetFactor = 1;
                material.polygonOffsetUnits = 1;
              };

              if (Array.isArray(child.material)) {
                child.material.forEach(applyFixes);
              } else {
                applyFixes(child.material);
              }
            }
          }
          // Add handling for rider mesh
          if (child.name === "rider") {
            // Adjust position of rider mesh
            child.position.set(0.5, -0.3, -0.2); // You can adjust these values
            child.rotation.set(0, 0, 0); // You can adjust these values
            child.scale.set(1, 1, 1); // You can adjust these values
          }
        });

        // Create an anchor group with initial position
        const anchorGroup = new THREE.Group();
        const basePosition = [0.3, 6.8, -1.2]; // Same position as statue for now
        anchorGroup.position.set(...basePosition);
        initialY.current = basePosition[1]; // Set initialY to match the base y-position

        // Create a rotation group
        const rotationGroup = new THREE.Group();

        // Set up the hierarchy
        anchorGroup.add(rotationGroup);
        rotationGroup.add(model);

        // Store refs
        groupRef.current = { anchor: anchorGroup, rotation: rotationGroup };

        // Apply transformations
        model.scale.set(
          rocketSettings.rocketScale,
          rocketSettings.rocketScale,
          rocketSettings.rocketScale
        );
        model.rotation.y = Math.PI / 180;

        // Center the rocket in the rotation group
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        // Clean up any existing textured meshes
        cleanupTexturedMeshes();

        // Clean up any existing avatar planes
        cleanupAvatarPlanes();

        // Add thruster flame effect
        createThrusterFlame(rotationGroup, box);

        // Apply user avatar to RIDER mesh if user is signed in
        applyUserAvatar(model);

        // Clean up any duplicate rider meshes
        cleanupDuplicateRiders(model);

        // Set up animation
        // if (gltf.animations && gltf.animations.length > 0) {
        //   // Create a mixer for the rocket
        //   mixerRef.current = new THREE.AnimationMixer(model);

        //   // Find the animation named "Animation"
        //   const animation = gltf.animations.find(
        //     anim => anim.name === "Animation" || anim.name.includes("Animation")
        //   );

        //   if (animation) {
        //     // Create an action for the animation and play it
        //     const action = mixerRef.current.clipAction(animation);

        //     // Increase animation speed by setting timeScale (2.0 = twice as fast)
        //     action.timeScale = 2.5;

        //     // Make the animation loop
        //     action.loop = THREE.LoopRepeat;

        //     // Start the animation
        //     action.play();

        //     console.log("Playing rocket animation at increased speed:", animation.name);
        //   } else {
        //     // If "Animation" is not found, log available animations
        //     console.log(
        //       "Available animations:",
        //       gltf.animations.map(a => a.name)
        //     );

        //     // Play the first animation if "Animation" is not found
        //     if (gltf.animations.length > 0) {
        //       const action = mixerRef.current.clipAction(gltf.animations[0]);
        //       action.timeScale = 2.5; // Increase speed
        //       action.loop = THREE.LoopRepeat;
        //       action.play();
        //       console.log(
        //         "Playing first available animation at increased speed:",
        //         gltf.animations[0].name
        //       );
        //     }
        //   }
        // }

        // Add the anchor group to the scene
        scene.add(anchorGroup);

        console.log("Rocket model and lights added to scene");
      },
      // Handle loading errors
      undefined,
      error => {
        console.error("Error loading rocket model:", error);
      }
    );

    return () => {
      console.log("Cleaning up rocket model and resources");
      
      // Clean up countdown interval if running
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }

      // Clean up textured meshes
      cleanupTexturedMeshes();

      // Clean up avatar planes
      cleanupAvatarPlanes();

      // Clean up animations and remove from scene
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        // Make sure rocketRef.current exists before uncaching
        if (rocketRef.current) {
          mixerRef.current.uncacheRoot(rocketRef.current);
        }
        // Clear the mixer
        mixerRef.current = null;
      }

      // Clean up avatar texture
      if (avatarTextureRef.current) {
        avatarTextureRef.current.dispose();
        avatarTextureRef.current = null;
      }

      // Clean up avatar plane explicitly
      const plane = avatarPlaneRef.current;
      if (plane) {
        scene.remove(plane);
        if (plane.geometry) plane.geometry.dispose();
        if (plane.material) {
          if (plane.material.map) plane.material.map.dispose();
          plane.material.dispose();
        }
        avatarPlaneRef.current = null;
      }

      // Clean up RIDER mesh material
      if (rocketRef.current) {
        rocketRef.current.traverse(child => {
          if (child.isMesh && child.name === "RIDER" && child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
          }
        });
      }

      // Remove spotlights and targets
      if (redLightRef.current) {
        scene.remove(redLightRef.current);
        redLightRef.current.dispose();
        redLightRef.current = null;
      }
      if (blueLightRef.current) {
        scene.remove(blueLightRef.current);
        blueLightRef.current.dispose();
        blueLightRef.current = null;
      }
      if (redTargetRef.current) {
        scene.remove(redTargetRef.current);
        redTargetRef.current = null;
      }
      if (blueTargetRef.current) {
        scene.remove(blueTargetRef.current);
        blueTargetRef.current = null;
      }

      // Remove rocket
      if (groupRef.current?.anchor) {
        scene.remove(groupRef.current.anchor);
        groupRef.current = null;
      }

      // Clean up all meshes and their resources
      if (rocketRef.current) {
        rocketRef.current.traverse(child => {
          if (child.isMesh) {
            // Clean up geometry
            if (child.geometry) {
              child.geometry.dispose();
            }

            // Clean up materials
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => {
                  if (material.map) material.map.dispose();
                  material.dispose();
                });
              } else {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
              }
            }

            // Clean up any textures
            if (child.texture) {
              child.texture.dispose();
            }
          }
        });
        
        // Clear rocket reference
        rocketRef.current = null;
      }

      // Reset refs (already done individually above)
      // We double-check they're all null for safety
      rocketRef.current = null;
      groupRef.current = null;
      mixerRef.current = null;

      console.log("Rocket model and resources cleaned up");
    };
  }, [scene, loader, rocketSettings.rocketScale, userData]);

  // Animation loop
  useFrame((state, delta) => {
    // Skip updates if the rocket is not visible or if groupRef is not available
    if (!groupRef.current) return;

    // Update the animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (rocketRef.current && groupRef.current) {
      // Handle launch animation if launching
      if (isLaunching && launchStartTime.current) {
        const currentTime = performance.now() / 1000;
        const elapsedTime = currentTime - launchStartTime.current;
        
        // Calculate progress (0 to 1) based on launch duration
        const progress = Math.min(elapsedTime / launchConfig.duration, 1);
        
        // Easing function for slow start, faster acceleration
        const easeInCubic = t => t * t * t;
        const easedProgress = easeInCubic(progress);
        
        // Calculate vertical movement with acceleration
        const heightOffset = easedProgress * launchConfig.maxHeight;
        
        // Apply position change
        if (initialPosition.current) {
          groupRef.current.anchor.position.set(
            initialPosition.current.x,
            initialPosition.current.y + heightOffset,
            initialPosition.current.z
          );
        }
        
        // Apply slight rotation during launch
        if (groupRef.current && groupRef.current.rotation) {
          groupRef.current.rotation.rotation.y += delta * (0.1 + progress * launchConfig.rotationFactor);
        }
        
        // Update all thruster effects with our new function
        updateThrusterEffects(groupRef.current && groupRef.current.rotation ? groupRef.current.rotation : null, state, true, progress);
        
        // Update post-processing effects during launch
        updatePostProcessingEffects(progress);
        
        
        // End the animation when complete
        if (progress >= 1) {
          console.log("🚀 Rocket launch complete! Removing rocket from scene...");
          
          // Set isLaunching to false to indicate the animation is complete
          setIsLaunching(false);
          
          // Set fade start time for gradual post-processing effect fadeout
          setPostProcessingEffects(prev => ({
            ...prev,
            fadeStartTime: performance.now() / 1000
          }));
          
          // Clean up all smoke particles
          cleanupAllSmokeParticles(scene);
          
          // Remove rocket from scene
          if (groupRef.current?.anchor) {
            scene.remove(groupRef.current.anchor);
            
            // Clean up resources
            if (rocketRef.current) {
              rocketRef.current.traverse(child => {
                if (child.isMesh) {
                  if (child.geometry) child.geometry.dispose();
                  if (child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach(m => m.dispose());
                    } else {
                      child.material.dispose();
                    }
                  }
                }
              });
            }
            
            // Clear references
            groupRef.current = null;
            rocketRef.current = null;
          }
          
          // Clean up avatar plane
          if (avatarPlaneRef.current) {
            scene.remove(avatarPlaneRef.current);
            if (avatarPlaneRef.current.geometry) avatarPlaneRef.current.geometry.dispose();
            if (avatarPlaneRef.current.material) {
              if (avatarPlaneRef.current.material.map) avatarPlaneRef.current.material.map.dispose();
              avatarPlaneRef.current.material.dispose();
            }
            avatarPlaneRef.current = null;
          }
          
          console.log("🚀 Rocket successfully removed from scene!");
          
          // Trigger cinematic transition before navigation
          console.log("🚀 Starting cinematic transition...");
          console.log("🚀 onTransitionStart type:", typeof onTransitionStart);
          console.log("🚀 onSceneSwitch type:", typeof onSceneSwitch);
          
          if (typeof onTransitionStart === 'function') {
            console.log("🚀 Calling onTransitionStart function...");
            onTransitionStart(() => {
              // This callback will be called when transition reaches its peak
              console.log("🚀 Transition peak reached, switching to moon scene...");
              
              // Store transition state in sessionStorage for moon scene
              sessionStorage.setItem('rocketLaunchTransition', JSON.stringify({
                timestamp: Date.now(),
                userData: userData,
                is80sMode: is80sMode
              }));
              
              // Switch to moon scene
              console.log("🚀 Preparing to switch to moon scene...");
              
              // Add a small delay to ensure React Three Fiber cleanup
              setTimeout(() => {
                // Try to force exit from Canvas context first
                console.log("🚀 Attempting to exit Canvas context before navigation...");
                
                // Dispatch a custom event to notify parent components
                window.dispatchEvent(new CustomEvent('rocket-navigation-start', { 
                  detail: { destination: '/moon-scene' } 
                }));
                try {
                  console.log("🚀 Attempting scene switch after delay...");
                  
                  // Call the scene switch function if provided
                  if (typeof onSceneSwitch === 'function') {
                    console.log("🚀 Calling onSceneSwitch to switch to moon scene");
                    onSceneSwitch('moon');
                  } else {
                    console.error("🚀 onSceneSwitch function not provided!");
                    // Fallback to window.location if no scene switch function
                    console.log("🚀 Falling back to window.location navigation");
                    window.location.href = '/moon-scene';
                  }
                } catch (syncError) {
                  console.error("🚀 Synchronous error during scene switch:", syncError);
                  console.error("🚀 Sync error name:", syncError?.name);
                  console.error("🚀 Sync error message:", syncError?.message);
                  console.log("🚀 Using window.location as ultimate fallback...");
                  window.location.href = '/moon-scene';
                }
              }, 100); // 100ms delay
            });
          } else {
            // Fallback to original navigation if no transition handler
            console.log("🚀 onTransitionStart not a function, using fallback navigation in 1 second...");
            setTimeout(() => {
              console.log("🚀 Fallback timer fired, navigating...");
              // Add another small delay for fallback path
              setTimeout(() => {
                try {
                  console.log("🚀 Attempting fallback scene switch after delay...");
                  if (typeof onSceneSwitch === 'function') {
                    console.log("🚀 Using onSceneSwitch for fallback");
                    onSceneSwitch('moon');
                  } else {
                    console.log("🚀 Using direct window.location for fallback");
                    window.location.href = '/moon-scene';
                  }
                } catch (syncError) {
                  console.error("🚀 Fallback sync error:", syncError);
                  window.location.href = '/moon-scene';
                }
              }, 100);
            }, 1000);
          }
        }
      } 
      // Apply thruster effect to the rocket if enabled and not launching
      else if (thrusterProps.enabled && !isLaunching) {
        // Calculate base thruster movement (sinusoidal)
        const thrusterMovement =
          Math.sin(state.clock.elapsedTime * thrusterProps.frequency) * thrusterProps.amplitude;

        // Add randomness/jitter to the movement
        const jitter = (Math.random() - 0.5) * thrusterProps.randomness * thrusterProps.amplitude;

        // Apply the combined movement to the rocket's Y position
        if (groupRef.current && groupRef.current.anchor) {
          groupRef.current.anchor.position.y = initialY.current + thrusterMovement + jitter;
        }

        // Update all thruster effects with our new function
        updateThrusterEffects(groupRef.current && groupRef.current.rotation ? groupRef.current.rotation : null, state, false);
      } else {
        // If thruster is disabled, just apply the hover animation
        if (groupRef.current && groupRef.current.anchor) {
          groupRef.current.anchor.position.y =
            initialY.current + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
        }

        // Update all thruster effects with our new function - disabled but still visible
        updateThrusterEffects(groupRef.current && groupRef.current.rotation ? groupRef.current.rotation : null, state, false);
      }

      // Apply rotation to the rotation group
      if (groupRef.current && groupRef.current.rotation) {
        groupRef.current.rotation.rotation.y += delta * 0.1;
      }

      // Update the spotlights - static positions but animated intensity
      if (redLightRef.current) {
        // Pulsate the red spotlight intensity using GUI values
        redLightRef.current.intensity =
          redLightProps.intensity +
          Math.sin(state.clock.elapsedTime * redLightProps.pulseSpeed) *
            redLightProps.pulseIntensity;

        // Set static position based on GUI values
        redLightRef.current.position.set(
          0.3, // Fixed X position
          redLightProps.positionY, // Y position from GUI
          -1.2 // Fixed Z position
        );
      }

      if (blueLightRef.current) {
        // Pulsate the blue spotlight intensity using GUI values
        blueLightRef.current.intensity =
          blueLightProps.intensity +
          Math.cos(state.clock.elapsedTime * blueLightProps.pulseSpeed) *
            blueLightProps.pulseIntensity;

        // Set static position based on GUI values
        blueLightRef.current.position.set(
          0.3, // Fixed X position
          blueLightProps.positionY, // Y position from GUI
          -1.2 // Fixed Z position
        );
      }
    }

    // Update avatar plane based on fixed settings
    const plane = avatarPlaneRef.current;
    const riderMesh = riderMeshRef.current;
    if (plane && riderMesh) {
      // Update visibility
      plane.visible = avatarPlaneSettings.visible;

      if (avatarPlaneSettings.followRider) {
        // Get the world position and rotation of the rider mesh
        const riderWorldPosition = new THREE.Vector3();
        riderMesh.getWorldPosition(riderWorldPosition);

        // Get the world quaternion of the rider mesh
        const riderWorldQuaternion = new THREE.Quaternion();
        riderMesh.getWorldQuaternion(riderWorldQuaternion);

        // Update the plane's position to match the rider's world position
        plane.position.copy(riderWorldPosition);

        // Apply offsets in world space
        plane.position.x += avatarPlaneSettings.offsetX;
        plane.position.y += avatarPlaneSettings.offsetY;
        plane.position.z += avatarPlaneSettings.offsetZ;

        // Reset the plane's rotation to match the rider's world rotation
        plane.quaternion.copy(riderWorldQuaternion);

        // Apply additional rotations from settings
        plane.rotateX(avatarPlaneSettings.rotationX);
        plane.rotateY(avatarPlaneSettings.rotationY);
        plane.rotateZ(avatarPlaneSettings.rotationZ);
      }

      // Update scale - use a fixed scale based on the settings
      plane.scale.set(avatarPlaneSettings.scale, avatarPlaneSettings.scale, 1);

      // Keep the RIDER mesh fully transparent
      riderMesh.visible = true; // Keep visible for positioning
      if (riderMesh.material) {
        if (Array.isArray(riderMesh.material)) {
          riderMesh.material.forEach(m => {
            m.transparent = true;
            m.opacity = 0.0; // Always completely transparent
            m.depthWrite = false; // Disable depth writing for the RIDER mesh

            // Update emissive properties if available
            if (m.emissive) {
              m.emissive.set(riderProps.emissive);
              m.emissiveIntensity = riderProps.emissiveIntensity;
            }
          });
        } else {
          riderMesh.material.transparent = true;
          riderMesh.material.opacity = 0.0; // Always completely transparent
          riderMesh.material.depthWrite = false; // Disable depth writing for the RIDER mesh

          // Update emissive properties if available
          if (riderMesh.material.emissive) {
            riderMesh.material.emissive.set(riderProps.emissive);
            riderMesh.material.emissiveIntensity = riderProps.emissiveIntensity;
          }
        }
      }
    }

    // Update post-processing effects fade out
    if (!isLaunching && postProcessingEffects.fadeStartTime) {
      const currentTime = performance.now() / 100;
      const fadeElapsed = currentTime - postProcessingEffects.fadeStartTime;
      const mainFadeDuration = postProcessingEffects.fadeDuration || 2; // Shortened to match page transition
      const skyFadeDuration = postProcessingEffects.skyFadeDuration || 2;
      
      const mainFadeProgress = Math.min(fadeElapsed / mainFadeDuration, 1);
      const skyFadeProgress = Math.min(fadeElapsed / skyFadeDuration, 1);
      
      // Update main post-processing fade (bloom/film) - GRADUAL FADE
      if (mainFadeProgress < 1) {
        // Apply smooth fadeout instead of immediate disable
        if (bloomRef.current) {
          bloomRef.current.strength = postProcessingEffects.bloomStrength * (1 - mainFadeProgress);
          bloomRef.current.radius = postProcessingEffects.bloomRadius * (1 - mainFadeProgress);
          bloomRef.current.threshold = postProcessingEffects.bloomThreshold + mainFadeProgress;
          bloomRef.current.enabled = true;
        }
        
        if (filmRef.current) {
          filmRef.current.sIntensity = postProcessingEffects.filmScanlines * (1 - mainFadeProgress);
          filmRef.current.nIntensity = postProcessingEffects.filmNoisiness * (1 - mainFadeProgress);
          filmRef.current.enabled = true;
        }
      } else {
        // Only disable after fade completes
        setPostProcessingEffects(prev => ({
          ...prev,
          bloomEnabled: false,
          filmEnabled: false,
          fadeStartTime: null,
          thrustersIgnited: false
        }));
      }
      
      // Update sky effect fade out (only if active)
      if (skyEffect.active) {
        if (skyFadeProgress < 1.0) {
          setSkyEffect(prev => ({
            ...prev,
            fadeProgress: skyFadeProgress
          }));
        } else {
          setSkyEffect({
            active: false,
            fadeProgress: 1.0,
            initialized: true
          });
        }
      }
    }
  });

  // Function to create thruster flame effect
  const createThrusterFlame = (parent, rocketBox) => {
    // Create a group for all thrusters
    const thrustersGroup = new THREE.Group();
    
    // Position the thrusters at the bottom of the rocket
    thrustersGroup.position.set(0, rocketBox.min.y - 0.5, 0);
    
    // Create the main thruster
    const mainThruster = createSingleThruster(0.2, 0.6, new THREE.Color(0xff9500), new THREE.Color(0xff0000));
    thrustersGroup.add(mainThruster);
    
    // Create 4 peripheral thrusters
    const peripheralScale = 0.4;
    const peripheralLength = 0.6;
    const peripheralRadius = 0.4;
    
    // Create 4 peripheral thrusters in a circle
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const x = Math.cos(angle) * peripheralRadius;
      const z = Math.sin(angle) * peripheralRadius;
      
      const thruster = createSingleThruster(
        peripheralScale, 
        peripheralLength,
        new THREE.Color(0x00aaff), // Bluer color for peripheral thrusters
        new THREE.Color(0x0066ff)
      );
      
      thruster.position.set(x, 0, z);
      thruster.rotation.set(Math.random() * 0.2 - 0.1, 0, Math.random() * 0.2 - 0.1); // Slight random angle
      thrustersGroup.add(thruster);
    }
    
    // Add the thruster group to the parent
    parent.add(thrustersGroup);
    
    // Create a post-launch smoke trail emitter
    createSmokeTrailEmitter(thrustersGroup);
  };

  // Function to create a single thruster with enhanced effects
  const createSingleThruster = (radius, length, colorA, colorB) => {
    const thrusterGroup = new THREE.Group();
    
    // Create more detailed flame geometry
    const flameGeometry = new THREE.ConeGeometry(radius, length, 24, 8);
    flameGeometry.translate(0, -length/2, 0); // Move the cone down so its top is at the origin
    flameGeometry.rotateX(Math.PI); // Flip the cone to point downward

    // Create a more complex shader material for the flame
    const flameMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: colorA },
        colorB: { value: colorB },
        colorC: { value: new THREE.Color(0xffff80) }, // Bright yellow/white for the core
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 colorA;
        uniform vec3 colorB;
        uniform vec3 colorC;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        // Improved noise function
        float noise(vec2 p) {
          return sin(p.x * 10.0 + time * 3.0) * sin(p.y * 10.0 + time * 2.0) * 0.25 + 0.5;
        }
        
        void main() {
          // Distance from center creates a core effect
          float distFromCenter = length(vec2(vUv.x - 0.5, (vUv.y - 0.5) * 0.2)) * 0.2;
          
          // Complex noise patterns
          float noise1 = noise(vUv * 1.0 + time * 0.5);
          float noise2 = noise(vUv * 2.0 - time * 0.3);
          float noise3 = noise(vUv * 4.0 + time * 0.2);
          
          // Combined noise with decreasing intensity away from center
          float noiseCombined = mix(noise1, mix(noise2, noise3, 0.5), 0.5) * (1.0 - distFromCenter * 0.5);
          
          // Flame flicker effect
          float flicker = sin(time * 20.0) * 0.04 + 0.96;
          
          // Base alpha that fades toward the edges
          float alpha = (1.0 - vUv.y) * (0.9 + noiseCombined * 0.1) * flicker;
          alpha = smoothstep(0.0, 1.0, alpha) * (1.0 - distFromCenter * 0.5);
          
          // Core to edge color gradient with noise
          vec3 baseColor;
          if (distFromCenter < 0.3) {
            // Hot core
            baseColor = mix(colorC, colorA, smoothstep(0.0, 0.3, distFromCenter));
          } else {
            // Outer flame
            baseColor = mix(colorA, colorB, smoothstep(0.3, 1.0, distFromCenter));
          }
          
          // Add subtle color variations based on noise
          vec3 color = mix(baseColor, baseColor * (0.9 + noiseCombined * 0.2), 0.5);
          
          // Higher intensity in the core
          color *= mix(1.5, 1.0, distFromCenter);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      // blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Create the flame mesh
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    flame.userData.isThrusterFlame = true;
    flame.userData.material = flameMaterial;
    flame.userData.isMainThruster = radius > 0.8; // Flag if this is the main thruster
    
    // Add an inner glow (brightest part)
    const coreGeometry = new THREE.ConeGeometry(radius * 0.5, length * 0.7, 16, 1);
    coreGeometry.translate(0, -length * 0.35, 0);
    coreGeometry.rotateX(Math.PI);
    
    const coreMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;
        
        void main() {
          float pulse = sin(time * 15.0) * 0.05 + 0.95;
          float alpha = (1.0 - vUv.y) * pulse;
          gl_FragColor = vec4(color, alpha * 0.9);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.userData.isThrusterCore = true;
    core.userData.material = coreMaterial;
    
    // Add glowing particles around the thruster
    const particlesCount = radius > 0.8 ? 20 : 10; // More particles for main thruster
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = [];
    const particleSizes = [];
    
    for (let i = 0; i < particlesCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusOffset = (Math.random() * 0.5 + 0.5) * radius;
      
      // Position particles in a circle around the thruster
      const x = Math.cos(angle) * radiusOffset;
      const z = Math.sin(angle) * radiusOffset;
      const y = -Math.random() * length * 0.08 - length * 0.02;
      
      particlePositions.push(x, y, z);
      particleSizes.push(Math.random() * 0.02 + 0.01); // Random sizes
    }
    
    particlesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('size', new THREE.Float32BufferAttribute(particleSizes, .01));
    
    const particlesMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(0xffaa44) },
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = vec3(1.0, 0.6, 0.2); // Ember color
          
          // Animate position down and outward slightly
          vec3 pos = position;
          float particleTime = time * 5.0 + position.y * 2.0;
          pos.y -= mod(particleTime, 5.0) * 0.2;
          pos.x += sin(particleTime) * 0.05;
          pos.z += cos(particleTime) * 0.05;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (30.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          // Create circular particles
          float r = length(gl_PointCoord - vec2(0.5, 0.5));
          if (r > 0.5) discard;
          
          // Soft edge glow
          float alpha = smoothstep(0.5, 0.2, r);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    particles.userData.isThrusterParticles = true;
    particles.userData.material = particlesMaterial;
    
    // Add all elements to the thruster group
    thrusterGroup.add(flame);
    thrusterGroup.add(core);
    // thrusterGroup.add(particles);
    
    return thrusterGroup;
  };

  // Create a smoke trail effect for after launch
  const createSmokeTrailEmitter = (parent) => {
    const trailGroup = new THREE.Group();
    trailGroup.position.set(0, -1, 0);
    
    // We'll use this group as a marker for where to emit smoke in the useFrame
    trailGroup.userData.isSmokeEmitter = true;
    trailGroup.userData.lastEmitTime = 0;
    trailGroup.userData.smokeParticles = [];
    
    // parent.add(trailGroup);
  };

  // Function to update thruster effects during the animation frame
  const updateThrusterEffects = (model, state, isLaunching, progress = 0) => {
    if (!model) return;
    
    // Define the progress threshold for when thrusters fully ignite
    const ignitionThreshold = 0.05;
    const ignitionPhaseEnd = 0.25; // The end of the ignition boost phase
    
    // Determine if we're in the ignition phase (from threshold to 25% of launch)
    const isIgnitionPhase = isLaunching && progress >= ignitionThreshold && progress <= ignitionPhaseEnd;
    
    // Log progress more frequently during early stages to help with debugging
    if (isLaunching && progress < 0.3 && Math.floor(progress * 100) % 5 === 0) {
      console.log(`🚀 Launch progress: ${(progress * 100).toFixed(1)}%, ` +
                  `Ignition threshold: ${(ignitionThreshold * 100).toFixed(1)}%, ` + 
                  `Thrusters ignited: ${postProcessingEffects.thrustersIgnited}, ` +
                  `Sky active: ${skyEffect.active}`);
    }
    
    // Ignition code for launch - THIS NEEDS TO BE FULLY INCLUDED
    if (isLaunching && progress >= ignitionThreshold && !postProcessingEffects.thrustersIgnited) {
      console.log(`🔥🔥🔥 THRUSTERS IGNITED at progress ${(progress * 100).toFixed(1)}%! Activating effects 🔥🔥🔥`);
      
      // First, just set thrustersIgnited to true
      setPostProcessingEffects(prev => {
        console.log("🔄 Updating thrustersIgnited state");
        return {
          ...prev,
          thrustersIgnited: true,
          bloomEnabled: true,  // Now enable bloom
          filmEnabled: true    // Now enable film (but scanlines will fade in separately)
        };
      });
      
      // Create a sequence of steps to fade in the scanlines effect
      const totalSteps = 10;  // Number of fade-in steps
      const finalValue = 128;  // Reduced from 512 - much more subtle scanlines
      const fadeInDuration = 1000;  // Total fade-in duration in ms
      const stepDelay = fadeInDuration / totalSteps;  // Delay between steps

      // Execute the fade-in sequence
      for (let i = 1; i <= totalSteps; i++) {
        setTimeout(() => {
          const stepValue = Math.floor((i / totalSteps) * finalValue);
          console.log(`🔄 Scanlines fade step ${i}/${totalSteps} - value: ${stepValue}`);
          setPostProcessingEffects(prev => ({
            ...prev,
            filmScanlines: stepValue
          }));
        }, 200 + (i * stepDelay));  // Start after 200ms, then increment by step delay
      }

      // Sky effect activation remains after scanlines start appearing
      setTimeout(() => {
        console.log("🕒 Delayed activation of sky effect");
        setSkyEffect({
          active: true,
          fadeProgress: 0
        });
        
        console.log("🌈🌈🌈 SKY GRADIENT EFFECT ACTIVATED 🌈🌈🌈");
      }, 200 + fadeInDuration + 50);  // Start sky effect shortly after scanlines complete
    }
    
    // Rest of your new code for RocketFlame objects
    // ...
  }

  // Function to emit smoke particles during launch
  const emitSmokeParticle = (emitter, scene, launchProgress, state) => {
    // Create smoke particle - using a circular geometry instead of a plane
    const smokeGeometry = new THREE.CircleGeometry(0.5, 12);
    
    // Create a smoke texture procedurally with better circular gradient
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.3, 'rgba(240, 240, 240, 0.7)');
    gradient.addColorStop(0.6, 'rgba(180, 180, 180, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const smokeTexture = new THREE.CanvasTexture(canvas);
    
    const smokeMaterial = new THREE.MeshBasicMaterial({
      map: smokeTexture,
      transparent: true,
      alphaTest: 0.01, // Discard pixels with very low alpha
      blending: THREE.CustomBlending,
      blendSrc: THREE.SrcAlphaFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      depthWrite: false,
    });
    
    const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial);
    
    // Get world position of emitter
    const worldPos = new THREE.Vector3();
    emitter.getWorldPosition(worldPos);
    
    // Add random spread to the position
    const spread = 0.03 + launchProgress * 0.03; // Reduced spread
    worldPos.x += (Math.random() - 0.5) * spread;
    worldPos.z += (Math.random() - 0.5) * spread;
    
    // Position the smoke at the emitter
    smoke.position.copy(worldPos);
    
    // Random rotation
    smoke.rotation.z = Math.random() * Math.PI * 2;
    
    // Make particles smaller
    const scale = 0.02 + Math.random() * 0.3 + launchProgress * 0.1; // Reduced scale
    smoke.scale.set(scale, scale, 0.01);
    
    // Store data for animation - adjusted for better behavior
    smoke.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.05, // Reduced horizontal velocity
        Math.random() * -0.15 - 0.05,  // Reduced fall speed
        (Math.random() - 0.5) * 0.05   // Reduced horizontal velocity
      ),
      rotation: Math.random() * 0.01 - 0.005, // Reduced rotation
      growth: 0.1 + Math.random() * 0.05,    // Reduced growth rate
      life: 1.0,    // Full opacity
      decay: 0.2 + Math.random() * 0.4,  // Faster decay for shorter lifetime
      creationTime: state.clock.elapsedTime, // Now state is properly defined
      maxLifetime: 3 + Math.random() * 2    // Force cleanup after this many seconds
    };
    
    // Add to scene and track
    scene.add(smoke);
    emitter.userData.smokeParticles.push(smoke);
  };

  //Update smoke particles
  const updateSmokeParticles = (emitter, deltaTime) => {
    const particles = emitter.userData.smokeParticles;
    const deadParticles = [];
    const currentTime = performance.now() / 1000;
    
    // Update all particles
    particles.forEach(particle => {
      // Move based on velocity
      particle.position.add(particle.userData.velocity.clone().multiplyScalar(deltaTime));
      
      // Rotate
      particle.rotation.z += particle.userData.rotation;
      
      // Grow
      particle.scale.x += particle.userData.growth * deltaTime;
      particle.scale.y += particle.userData.growth * deltaTime;
      
      // Fade out
      particle.userData.life -= particle.userData.decay * deltaTime;
      if (particle.material) {
        particle.material.opacity = Math.max(0, particle.userData.life);
      }
      
      // Check if particle should be removed:
      // 1. If it's faded out (life <= 0)
      // 2. If it's been alive longer than maxLifetime
      // 3. If launch is complete and particles should be cleaned up
      const particleAge = currentTime - particle.userData.creationTime;
      if (particle.userData.life <= 0 || 
          particleAge > particle.userData.maxLifetime || 
          !isLaunching) {
        deadParticles.push(particle);
      }
    });
    
    // Remove dead particles
    deadParticles.forEach(particle => {
      const index = particles.indexOf(particle);
      if (index !== -1) {
        particles.splice(index, 1);
      }
      
      // Remove from scene
      if (particle.parent) {
        particle.parent.remove(particle);
      }
      
      // Dispose resources
      if (particle.material) {
        if (particle.material.map) {
          particle.material.map.dispose();
        }
        particle.material.dispose();
      }
      if (particle.geometry) {
        particle.geometry.dispose();
      }
    });
  };

  // Function to update post-processing effects based on launch progress
  const updatePostProcessingEffects = (progress) => {
    if (bloomRef.current) {
      // Increase bloom intensity as launch progresses - but cap it before the end
      // Use a curve that peaks at 80% progress then reduces
      let bloomMultiplier;
      if (progress < 0.8) {
        bloomMultiplier = 0.5 + (progress / 0.8) * 0.3; // Ramp up to 80%
      } else {
        // Fade down bloom in the last 20% to prevent white-out
        bloomMultiplier = 0.8 - ((progress - 0.8) / 0.2) * 0.6; // Fade from 80% to 20%
      }
      
      bloomRef.current.strength = postProcessingEffects.bloomStrength * bloomMultiplier;
      bloomRef.current.radius = postProcessingEffects.bloomRadius * (0.8 + bloomMultiplier * 0.2);
      bloomRef.current.threshold = 0.95; // Keep high threshold
    }
    
    if (filmRef.current) {
      // Increase film grain effect as launch progresses
      filmRef.current.nIntensity = postProcessingEffects.filmNoisiness * Math.min(1, progress * 0.1); // Very subtle noise
      filmRef.current.sIntensity = postProcessingEffects.filmScanlines > 0 ? 0.05 : 0; // Reduced from 0.1
    }
  };

  // Function to clean up all smoke particles in the scene
  const cleanupAllSmokeParticles = (scene) => {
    // Find and remove all smoke particles
    const smokeParticles = [];
    
    scene.traverse(child => {
      // Find smoke emitters
      if (child.userData && child.userData.isSmokeEmitter) {
        if (child.userData.smokeParticles) {
          // Get all smoke particles from each emitter
          smokeParticles.push(...child.userData.smokeParticles);
          // Clear the emitter's particle array
          child.userData.smokeParticles = [];
        }
      }
    });
    
    // Remove all found particles
    smokeParticles.forEach(particle => {
      if (particle.parent) {
        particle.parent.remove(particle);
      }
      
      // Dispose resources
      if (particle.material) {
        if (particle.material.map) {
          particle.material.map.dispose();
        }
        particle.material.dispose();
      }
      if (particle.geometry) {
        particle.geometry.dispose();
      }
    });
    
    console.log(`Cleaned up ${smokeParticles.length} smoke particles`);
  };

  // Handle cleanup when rocket leaves scene
  useEffect(() => {
    // Ensure sky effect is disabled (uniforms) when component unmounts
    resetSkyShaderUniforms();
    
    return () => {
      console.log("Cleaning up sky effect on component unmount");
      resetSkyShaderUniforms();
    };
  }, []);

  // Function to reset the sky shader uniforms
  const resetSkyShaderUniforms = () => {
    // Instead of directly manipulating references, use the state management
    console.log("Resetting sky shader effect state");
    setSkyEffect({
      active: false,
      fadeProgress: 1.0,
      initialized: true  // Mark as initialized to prevent auto-reactivation
    });
    return true;
  };

  // Add method to completely disable sky effect
  const disableSkyEffect = () => {
    resetSkyShaderUniforms();
    return true;
  };

  // Add this right after the existing useEffect(cleanup function) 
  // Ensure the sky effect is disabled on initial component mount
  useEffect(() => {
    console.log("🚀 RocketModel component mounted - ensuring sky effect is disabled");
    resetSkyShaderUniforms(); // Ensure uniforms are reset on mount
    
    // Also expose a global disable function for debugging
    window.disableSkyEffect = () => {
      console.log("Manual sky effect disable called");
      resetSkyShaderUniforms();
      console.log("Sky effect manually disabled");
      return true;
    };
    
    return () => {
      delete window.disableSkyEffect;
    };
  }, []);

  // Add explicit initialization for skyEffect on mount
  useEffect(() => {
    console.log("⚠️ Explicitly ensuring sky effect is disabled on mount");
    
    // Force skyEffect to be completely disabled on mount
    setSkyEffect(prev => {
      // Only update if not already initialized properly
      if (!prev.initialized) {
        console.log("🌑 Initializing sky effect as inactive");
        return {
          active: false,
          fadeProgress: 1.0,
          initialized: true
        };
      }
      return prev;
    });
  }, []);
  
  // Add this to your useEffect blocks
  useEffect(() => {
    // Create a global function to forcefully disable all effects
    window.disableRocketEffects = () => {
      console.log("🛑 Force disabling all rocket post-processing effects");
      
      // Immediately reset refs
      if (bloomRef.current) {
        bloomRef.current.strength = 0;
        bloomRef.current.enabled = false;
      }
      
      if (filmRef.current) {
        filmRef.current.sIntensity = 0;
        filmRef.current.nIntensity = 0;
        filmRef.current.enabled = false;
      }
      
      // Update state
      setPostProcessingEffects({
        bloomEnabled: false,
        bloomStrength: 0,
        bloomRadius: 0,
        bloomThreshold: 1,
        filmEnabled: false,
        filmNoisiness: 0,
        filmScanlines: 0,
        filmGrainSize: 0,
        fadeDuration: 6,
        fadeStartTime: null,
        thrustersIgnited: false
      });
      
      // Completely disable sky effect
      setSkyEffect({
        active: false,
        fadeProgress: 1.0,
        initialized: true
      });
      
      return true;
    };
    
    return () => {
      delete window.disableRocketEffects;
    };
  }, []);
  
  // Add immediately after your existing useEffect for disableRocketEffects
  useEffect(() => {
    // Force disable all effects after a timeout
    const emergencyCleanupTimer = setTimeout(() => {
      console.log("🚨 EMERGENCY CLEANUP: Forcibly disabling all effects");
      window.disableRocketEffects && window.disableRocketEffects();
    }, 10000); // 10 seconds after component mounts
    
    return () => {
      clearTimeout(emergencyCleanupTimer);
    };
  }, []);
  
  

  // Return component with post-processing effects
  return (
    <>
      {/* Countdown Display */}
      {isCountingDown && groupRef.current && (
        <group position={[0, 10, 0]}>
          <Html
            center
            style={{
              width: '200px',
              height: '200px',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                fontSize: '120px',
                fontWeight: 'bold',
                color: '#00ff00',
                textAlign: 'center',
                textShadow: '0 0 20px #00ff00, 0 0 40px #00ff00',
                fontFamily: 'monospace',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                borderRadius: '20px',
                padding: '20px',
                border: '2px solid #00ff00',
                boxShadow: '0 0 30px rgba(0, 255, 0, 0.5)',
              }}
            >
              {countdownValue}
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#00ff00',
                textAlign: 'center',
                marginTop: '10px',
                textShadow: '0 0 10px #00ff00',
                fontFamily: 'monospace',
              }}
            >
              LAUNCH IN
            </div>
          </Html>
        </group>
      )}
      
      
      {/* Sky Effect - only render when thrusters are ignited AND sky effect is active */}
      {/* {postProcessingEffects.thrustersIgnited && skyEffect.active && (
        <LaunchSkyEffect active={skyEffect.active} fadeProgress={skyEffect.fadeProgress} />
      )} */}
      
      {/* Allow Effects to remain in the scene during fadeout */}
      {postProcessingEffects.bloomEnabled && postProcessingEffects.thrustersIgnited && (
        <Effects disableGamma>
          {postProcessingEffects.bloomEnabled && (
            <unrealBloomPass 
              ref={bloomRef}
              args={[
                undefined, 
                postProcessingEffects.bloomStrength, 
                postProcessingEffects.bloomRadius, 
                postProcessingEffects.bloomThreshold
              ]} 
            />
          )}
          {postProcessingEffects.filmEnabled && (
            <filmPass
              ref={filmRef}
              args={[
                postProcessingEffects.filmNoisiness,
                postProcessingEffects.filmScanlines,
                postProcessingEffects.filmGrainSize,
                false
              ]}
            />
          )}
        </Effects>
      )}
    </>
  );
}

// Export the component directly
export default RocketModel;
