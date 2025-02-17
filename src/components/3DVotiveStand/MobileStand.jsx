import React, { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../utilities/firebaseClient";

function MobileStand({ scale, onBack, onTooltipUpdate }) {
  const gltf = useGLTF("/5ShelvesWithPlaceholders.glb");
  const modelRef = useRef();
  const controlsRef = useRef();
  const { camera, gl } = useThree();
  const mixerRef = useRef();
  const { actions, mixer } = useAnimations(gltf.animations, modelRef);
  const cameraRef = useRef(camera);
  const [tooltipData, setTooltipData] = useState([]);
  const [results, setResults] = useState([]);
  const [shuffledResults, setShuffledResults] = useState([]);
  const [shuffledCandleIndices, setShuffledCandleIndices] = useState([]);

  useEffect(() => {
    if (!modelRef.current) return;

    // Create bounding box
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);

    console.log("Model measurements:", {
      center: center.toArray(),
      size: size.toArray(),
      maxDimension,
      boundingBox: {
        min: box.min.toArray(),
        max: box.max.toArray(),
      },
    });

    // Position model
    modelRef.current.position.set(
      0, // Center horizontally
      -1, // Use original height
      0 // Center depth
    );

    // Set up camera - positioning relative to model's center
    camera.position.set(0, 3, 1); // Higher and further back
    camera.fov = 40;
    camera.near = 0.001;
    camera.far = 200;
    camera.lookAt(0, 1, 0); // Look at the model's actual center
    camera.updateProjectionMatrix();

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = 10;
      controlsRef.current.maxDistance = 30;
      controlsRef.current.update();
    }
  }, [camera, modelRef.current]);

  useEffect(() => {
    if (gltf.animations.length) {
      mixerRef.current = new THREE.AnimationMixer(gltf.scene);
      const animationClip = gltf.animations.find((clip) =>
        clip.name.startsWith("Take 001")
      );
      if (animationClip) {
        const action = mixerRef.current.clipAction(animationClip);
        action.play();
      }
    }
  }, [gltf]);

  useFrame((state, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
  });
  const handleScreenClick = () => {
    if (onBack) {
      onBack(); // Trigger the parent callback to return to the main model
    }
  };

  useEffect(() => {
    const q = query(collection(db, "results"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedResults = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        userName: doc.data().userName || "Anonymous",
        burnedAmount: doc.data().burnedAmount || 1,
      }));
      setResults(fetchedResults);
    });
    return () => unsubscribe();
  }, []);

  // Assign Candles and Flames

  useEffect(() => {
    if (results.length === 0 || !modelRef.current) return;

    const shuffled = [...results].sort(() => Math.random() - 0.5);

    // Create indices for assignment (52 candles)
    const candleIndexes = Array.from({ length: 19 }, (_, i) => i);
    const assignedIndices = candleIndexes
      .sort(() => Math.random() - 0.5)
      .slice(0, shuffled.length);

    modelRef.current.traverse((child) => {
      if (child.name.startsWith("XCandle")) {
        // Get the candle's flame by traversing its children
        let flame;
        child.traverse((descendant) => {
          if (descendant.name.startsWith("XFlame")) {
            flame = descendant;
          }
        });

        // Reset candle state
        child.userData = {
          isMelting: false,
          initialHeight: child.scale.y,
          userName: "Anonymous",
          burnedAmount: 1,
          meltingProgress: undefined,
          flame: flame, // Store reference to associated flame
        };

        // Reset flame visibility if found
        if (flame) {
          flame.visible = false;
        }
      }
    });

    // Then assign only the selected candles
    modelRef.current.traverse((child) => {
      if (child.name.startsWith("XCandle")) {
        const candleIndex = parseInt(child.name.replace("XCandle", ""), 10);
        const userIndex = assignedIndices.indexOf(candleIndex);

        if (userIndex !== -1) {
          const user = shuffled[userIndex];
          child.userData = {
            isMelting: true,
            initialHeight: child.scale.y,
            userName: user.userName,
            burnedAmount: user.burnedAmount || 1,
            meltingProgress: 0, // Initialize melting progress
          };
        }
      }
      // Handle flame visibility
      else if (child.name.startsWith("XFlame")) {
        const flameIndex = parseInt(child.name.replace("XFlame", ""), 10);
        child.visible = assignedIndices.includes(flameIndex);
      }
    });

    setShuffledResults(shuffled);
  }, [results, modelRef]);
  // Handle Melting Effect and Tooltips
  useFrame((state, delta) => {
    if (!modelRef.current) return;

    modelRef.current.traverse((child) => {
      if (
        child.name.startsWith("XCandle") &&
        child.userData?.isMelting === true
      ) {
        // Initialize original values if not already set
        if (!child.userData.originalScale) {
          child.userData = {
            ...child.userData,
            meltingProgress: 0,
            originalScale: {
              x: child.scale.x,
              y: child.scale.y,
              z: child.scale.z,
              positionY: child.position.y, // Store original Y position
            },
          };
        }

        // Update melting progress
        child.userData.meltingProgress += delta;

        const meltingSpeed = 0.01; // Adjust speed as needed
        const MIN_SCALE = 0.1 * child.userData.originalScale.y; // Minimum 10% of original height
        const percentageRemaining = Math.max(
          1 - meltingSpeed * child.userData.meltingProgress,
          MIN_SCALE / child.userData.originalScale.y
        );

        if (child.userData.originalScale?.y) {
          const originalY = child.userData.originalScale.y;
          const newScaleY = originalY * percentageRemaining;

          // Apply new scale to Y-axis only
          child.scale.y = newScaleY;

          // Adjust position to keep the base fixed
          const heightDifference = originalY - newScaleY;
          child.position.y =
            child.userData.originalScale.positionY + heightDifference / 2; // Add half the height difference
        }
      }
    });
  });
  const handlePointerMove = (event) => {
    if (!camera || !modelRef.current) return;

    const canvas = gl.domElement; // Use the canvas reference
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    // Add these before the intersectObjects call
    raycaster.near = 0.1;
    raycaster.far = 1000; // Adjust based on your scene scale
    // Collect all interactive objects at once
    const screenObjects = [];
    const interactiveObjects = [];
    // Check candle intersections last
    const candleIntersects = raycaster.intersectObjects(
      interactiveObjects,
      true
    );
    modelRef.current.traverse((object) => {
      // Collect candle-related objects
      if (
        object.name.startsWith("XCandle") ||
        object.name.startsWith("CandleWax") ||
        object.name.startsWith("XFlame")
      ) {
        interactiveObjects.push(object);
      }
    });

    // Handle all intersections instead of just the first one
    const newTooltipData = [];

    candleIntersects.forEach((intersection) => {
      const intersectedObject = intersection.object;
      const candleNumber = intersectedObject.name.match(/\d+/)?.[0];

      if (candleNumber) {
        let zCandle = null;
        modelRef.current.traverse((object) => {
          if (object.name === `XCandle${candleNumber}`) {
            zCandle = object;
          }
        });

        if (zCandle && zCandle.userData?.isMelting) {
          const worldPos = new THREE.Vector3();
          zCandle.getWorldPosition(worldPos);
          worldPos.y += 0.5;
          worldPos.project(camera);

          const x = (0.5 + worldPos.x / 2) * canvas.clientWidth;
          const y = (0.5 - worldPos.y / 2) * canvas.clientHeight;

          newTooltipData.push({
            userName: zCandle.userData?.userName || "Anonymous",
            position: { x, y },
            distance: intersection.distance, // Add distance for potential z-ordering
          });
        }
      }
    });

    // Sort tooltips by distance if needed (optional)
    newTooltipData.sort((a, b) => a.distance - b.distance);

    // Update tooltip data with all found intersections
    if (newTooltipData.length > 0) {
      setTooltipData(newTooltipData);
    } else {
      // Clear tooltips if no intersections
      setTooltipData([]);
    }
  };
  return (
    <group onClick={onBack}>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={7}
        onPointerMove={handlePointerMove}
        // onClick={handleScreenClick}
      />

      <ambientLight intensity={4.5} />
      <directionalLight position={[1, 4, 1]} intensity={0.8} castShadow />
      <directionalLight position={[1, 4, 0]} intensity={0.4} />
      <directionalLight position={[0, 1, 0]} intensity={0.3} />

      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={0.00001}
        maxDistance={100}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.25}
        rotateSpeed={0.6}
        zoomSpeed={1.2} // Increased for finer zoom control
        dampingFactor={0.05} // Add smooth damping to movements
        enableDamping={true} // Enable damping for smoother controls
        screenSpacePanning={true} // Better panning behavior
      />
    </group>
  );
}

useGLTF.preload("/5ShelvesWithPlaceholders.glb");

export default MobileStand;
