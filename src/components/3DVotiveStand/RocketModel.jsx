import React, { useEffect, useRef, useMemo, useState } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

function RocketModel({ updateAmbientLightDimming, userData, is80sMode }) {
  console.log(`RocketModel: Initializing with is80sMode=${is80sMode}`);

  const rocketRef = useRef();
  const groupRef = useRef();
  const mixerRef = useRef(null);
  const { scene } = useThree();
  const initialY = useRef(0);
  const avatarTextureRef = useRef(null);

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
    amplitude: 0.2, // How high the rocket moves
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
    ambientLightDimming: 0.1,
  };

  // Update ambient light when the component mounts
  useEffect(() => {
    if (updateAmbientLightDimming) {
      updateAmbientLightDimming(rocketSettings.ambientLightDimming);
    }
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
        color: materialProps.color
          ? new THREE.Color(materialProps.color)
          : 0x00ffff,
        side: THREE.DoubleSide,
        transparent: materialProps.opacity < 1.0,
        opacity: materialProps.opacity || 0.8,
        emissive: materialProps.emissive
          ? new THREE.Color(materialProps.emissive)
          : new THREE.Color(0x333333),
        emissiveIntensity: materialProps.emissiveIntensity || 0.1,
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
        (texture) => {
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
  const applyUserAvatar = (model) => {
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
    model.traverse((child) => {
      if (child.isMesh) {
        meshCount++;

        // Check if this mesh has a name that matches one of our possible RIDER names
        if (possibleRiderNames.some((name) => child.name.includes(name))) {
          riderMesh = child;
        }
      }
    });

    // If we didn't find a RIDER mesh by name, try to find the most complex mesh
    if (!riderMesh) {
      let maxVertices = 0;

      model.traverse((child) => {
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
          (texture) => {
            console.log("User avatar texture loaded successfully");
            applyTextureToMesh(texture, riderMesh);
          },
          undefined,
          (error) => {
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
      (texture) => {
        console.log("Fallback avatar loaded successfully");
        applyTextureToMesh(texture, riderMesh);
      },
      undefined,
      (error) => {
        console.error("Error loading fallback avatar:", error);

        // If Brett.jpg fails, fall back to a generated circle
        console.log("Falling back to generated circle");
        const dataURL = createCircleDataURL();

        textureLoader.load(
          dataURL,
          (texture) => {
            applyTextureToMesh(texture, riderMesh);
          },
          undefined,
          (secondError) => {
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
      texture.encoding = THREE.sRGBEncoding; // Use sRGB encoding for proper colors
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
          riderMesh.material.forEach((m) => {
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
  const cleanupDuplicateRiders = (model) => {
    // Find all meshes marked as riders
    const riderMeshes = [];
    model.traverse((child) => {
      if (child.userData && child.userData.isRider) {
        riderMeshes.push(child);
      }
    });

    // If we have more than one rider mesh, keep only the first one
    if (riderMeshes.length > 1) {
      console.log(
        `Found ${riderMeshes.length} rider meshes, removing duplicates...`
      );

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
            mesh.material.forEach((m) => m.dispose());
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
    rocketRef.current.traverse((child) => {
      if (child.name && child.name.includes("_textured")) {
        texturedMeshes.push(child);
      }
    });

    console.log(`Found ${texturedMeshes.length} textured meshes to clean up`);

    // Remove all textured meshes
    texturedMeshes.forEach((mesh) => {
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
          mesh.material.forEach((m) => m.dispose());
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
    rocketRef.current.traverse((child) => {
      if (child.name === "AvatarPlane" || child.userData.isAvatarPlane) {
        avatarPlanes.push(child);
      }
    });

    console.log(`Found ${avatarPlanes.length} avatar planes to clean up`);

    // Remove all avatar planes
    avatarPlanes.forEach((plane) => {
      // Remove from parent
      if (plane.parent) {
        plane.parent.remove(plane);
      }

      // Dispose of resources
      if (plane.geometry) plane.geometry.dispose();
      if (plane.material) {
        if (Array.isArray(plane.material)) {
          plane.material.forEach((m) => m.dispose());
        } else {
          plane.material.dispose();
        }
      }
    });

    console.log("Avatar planes cleaned up");
  };

  // Update the useEffect that handles is80sMode changes
  useEffect(() => {
    if (groupRef.current) {
      console.log(`RocketModel: is80sMode changed to ${is80sMode}`);
      groupRef.current.visible = !is80sMode;

      // If switching to 80s mode, clean up the avatar plane
      if (is80sMode) {
        // Remove avatar plane from scene
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
      }
    }
  }, [is80sMode, scene]);

  // Load the rocket model
  useEffect(() => {
    console.log("Loading rocket model...");
    loader.load(
      "/COMPLETEROCKET.glb",
      (gltf) => {
        console.log("Rocket model loaded successfully");
        const model = gltf.scene;

        // Set initial visibility based on is80sMode
        model.visible = !is80sMode;
        console.log(`Setting initial rocket visibility to ${!is80sMode}`);

        // Store the model in the ref
        rocketRef.current = model;

        // Special handling for Object_6
        model.traverse((child) => {
          if (child.name === "Object_6") {
            // Ensure Object_6 renders after other objects
            child.renderOrder = 999; // Very high render order
            if (child.material) {
              const applyFixes = (material) => {
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
        if (gltf.animations && gltf.animations.length > 0) {
          // Create a mixer for the rocket
          mixerRef.current = new THREE.AnimationMixer(model);

          // Find the animation named "Animation"
          const animation = gltf.animations.find(
            (anim) =>
              anim.name === "Animation" || anim.name.includes("Animation")
          );

          if (animation) {
            // Create an action for the animation and play it
            const action = mixerRef.current.clipAction(animation);

            // Increase animation speed by setting timeScale (2.0 = twice as fast)
            action.timeScale = 2.5;

            // Make the animation loop
            action.loop = THREE.LoopRepeat;

            // Start the animation
            action.play();

            console.log(
              "Playing rocket animation at increased speed:",
              animation.name
            );
          } else {
            // If "Animation" is not found, log available animations
            console.log(
              "Available animations:",
              gltf.animations.map((a) => a.name)
            );

            // Play the first animation if "Animation" is not found
            if (gltf.animations.length > 0) {
              const action = mixerRef.current.clipAction(gltf.animations[0]);
              action.timeScale = 2.5; // Increase speed
              action.loop = THREE.LoopRepeat;
              action.play();
              console.log(
                "Playing first available animation at increased speed:",
                gltf.animations[0].name
              );
            }
          }
        }

        // Create and add spotlights to the scene
        // Red spotlight - Use properties from GUI
        // const redSpotlight = new THREE.SpotLight(
        //   0xff0000,
        //   redLightProps.intensity,
        //   redLightProps.distance,
        //   redLightProps.angle,
        //   redLightProps.penumbra,
        //   1
        // );
        // redSpotlight.position.set(0.3, redLightProps.positionY, -1.2); // Static position
        // redLightRef.current = redSpotlight;

        // // Enable shadows for red spotlight
        // redSpotlight.castShadow = true;
        // redSpotlight.shadow.mapSize.width = 1200;
        // redSpotlight.shadow.mapSize.height = 1200;
        // redSpotlight.shadow.camera.near = 0.5;
        // redSpotlight.shadow.camera.far = 30;
        // redSpotlight.shadow.bias = -0.001;

        // // Red spotlight target
        // const redTarget = new THREE.Object3D();
        // redTarget.position.set(0.3, 2, -1.2); // Adjusted from 4 to be lower
        // redTargetRef.current = redTarget;
        // scene.add(redTarget);
        // redSpotlight.target = redTarget;

        // // Add red spotlight to scene
        // scene.add(redSpotlight);

        // // Blue spotlight - Use properties from GUI
        // const blueSpotlight = new THREE.SpotLight(
        //   0x0000ff,
        //   blueLightProps.intensity,
        //   blueLightProps.distance,
        //   blueLightProps.angle,
        //   blueLightProps.penumbra,
        //   1
        // );
        // blueSpotlight.position.set(0.3, blueLightProps.positionY, -1.2); // Static position
        // blueLightRef.current = blueSpotlight;

        // // Enable shadows for blue spotlight
        // blueSpotlight.castShadow = true;
        // blueSpotlight.shadow.mapSize.width = 1024;
        // blueSpotlight.shadow.mapSize.height = 1024;
        // blueSpotlight.shadow.camera.near = 0.5;
        // blueSpotlight.shadow.camera.far = 30;
        // blueSpotlight.shadow.bias = -0.001;

        // // Blue spotlight target
        // const blueTarget = new THREE.Object3D();
        // blueTarget.position.set(0.3, 5, -1.2); // Adjusted from 7 to be lower
        // blueTargetRef.current = blueTarget;
        // scene.add(blueTarget);
        // blueSpotlight.target = blueTarget;

        // // Add blue spotlight to scene
        // scene.add(blueSpotlight);

        // Add the anchor group to the scene
        scene.add(anchorGroup);

        console.log("Rocket model and lights added to scene");
      },
      // Handle loading errors
      undefined,
      (error) => {
        console.error("Error loading rocket model:", error);
      }
    );

    return () => {
      console.log("Cleaning up rocket model and resources");

      // Clean up textured meshes
      cleanupTexturedMeshes();

      // Clean up avatar planes
      cleanupAvatarPlanes();

      // Clean up animations and remove from scene
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
      }

      // Clean up avatar texture
      if (avatarTextureRef.current) {
        avatarTextureRef.current.dispose();
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
        rocketRef.current.traverse((child) => {
          if (
            child.isMesh &&
            child.name === "RIDER" &&
            child.userData.originalMaterial
          ) {
            child.material = child.userData.originalMaterial;
          }
        });
      }

      // Remove spotlights and targets
      if (redLightRef.current) {
        scene.remove(redLightRef.current);
      }
      if (blueLightRef.current) {
        scene.remove(blueLightRef.current);
      }
      if (redTargetRef.current) {
        scene.remove(redTargetRef.current);
      }
      if (blueTargetRef.current) {
        scene.remove(blueTargetRef.current);
      }

      // Remove rocket
      if (groupRef.current?.anchor) {
        scene.remove(groupRef.current.anchor);
      }

      console.log("Rocket model and resources cleaned up");
    };
  }, [scene, loader, rocketSettings.rocketScale, userData, is80sMode]);

  // Animation loop
  useFrame((state, delta) => {
    // Skip updates if the rocket is not visible
    if (is80sMode || !groupRef.current) return;

    // Update the animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (rocketRef.current && groupRef.current) {
      // Apply thruster effect to the rocket if enabled
      if (thrusterProps.enabled) {
        // Calculate base thruster movement (sinusoidal)
        const thrusterMovement =
          Math.sin(state.clock.elapsedTime * thrusterProps.frequency) *
          thrusterProps.amplitude;

        // Add randomness/jitter to the movement
        const jitter =
          (Math.random() - 0.5) *
          thrusterProps.randomness *
          thrusterProps.amplitude;

        // Apply the combined movement to the rocket's Y position
        groupRef.current.anchor.position.y =
          initialY.current + thrusterMovement + jitter;

        // Update thruster flame animation
        groupRef.current.rotation.traverse((child) => {
          if (child.userData && child.userData.isThrusterFlame) {
            // Update the time uniform for the flame shader
            child.userData.material.uniforms.time.value =
              state.clock.elapsedTime;

            // Scale the flame based on the thruster movement (bigger flame when moving up)
            const flameScale = 1.0 + Math.max(0, thrusterMovement * 2);
            child.scale.set(
              flameScale,
              flameScale + Math.random() * 0.2,
              flameScale
            );
          }
        });
      } else {
        // If thruster is disabled, just apply the hover animation
        groupRef.current.anchor.position.y =
          initialY.current + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

        // Hide the thruster flame
        groupRef.current.rotation.traverse((child) => {
          if (child.userData && child.userData.isThrusterFlame) {
            child.visible = false;
          }
        });
      }

      // Apply rotation to the rotation group
      groupRef.current.rotation.rotation.y += delta * 0.1;

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
          riderMesh.material.forEach((m) => {
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
  });

  // Function to create thruster flame effect
  const createThrusterFlame = (parent, rocketBox) => {
    // Create a group for the thruster flame
    const thrusterGroup = new THREE.Group();

    // Position the thruster at the bottom of the rocket
    thrusterGroup.position.set(0, rocketBox.min.y - 0.5, 0);

    // Create the flame cone geometry
    const flameGeometry = new THREE.ConeGeometry(0.5, 1.5, 16);
    flameGeometry.translate(0, -0.75, 0); // Move the cone down so its top is at the origin
    flameGeometry.depthWrite = true;
    flameGeometry.depthTest = true;
    flameGeometry.rotateX(Math.PI); // Flip the cone to point downward

    // Create a shader material for the flame
    const flameMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        colorA: { value: new THREE.Color(0xff9500) }, // Orange
        colorB: { value: new THREE.Color(0xff0000) }, // Red
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
        uniform vec3 colorA;
        uniform vec3 colorB;
        varying vec2 vUv;
        
        void main() {
          float noise = sin(vUv.y * 10.0 + time * 5.0) * 0.1 + 
                       sin(vUv.y * 20.0 - time * 3.0) * 0.05;
          
          float alpha = (1.0 - vUv.y) * (0.8 + noise);
          vec3 color = mix(colorA, colorB, vUv.y + noise);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // Create the flame mesh
    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
    thrusterGroup.add(flame);

    // Add the thruster group to the parent
    parent.add(thrusterGroup);

    // Store reference to update in animation loop
    flame.userData.isThrusterFlame = true;
    flame.userData.material = flameMaterial;
  };

  // We don't need to return any JSX elements since we're creating the lights imperatively
  return null;
}

export default RocketModel;
