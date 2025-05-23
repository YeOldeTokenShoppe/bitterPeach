import React, { useRef, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  useGLTF, 
  Stars, 
  Environment, 
  Html, 
  useProgress,
  ContactShadows,
  Box,
  FlyControls
} from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import AstronautCustomizerModal from './AstronautCustomizerModal';
import AstronautDetailModal from './AstronautDetailModal';

// Constants for collision detection
const MOON_RADIUS = 2.5; // Matches the moon scale
const ASTRONAUT_RADIUS = 0.15; // Approximate radius of an astronaut
const MIN_DISTANCE = MOON_RADIUS + ASTRONAUT_RADIUS; // Minimum distance from moon center

// Loading indicator
function Loader() {
  const { progress } = useProgress();
  return <Html center>
    <div className="bg-black/70 text-white px-6 py-3 rounded-lg backdrop-blur-md">
      <div className="text-xl">Loading Models</div>
      <div className="w-full bg-gray-800 h-2 mt-2 rounded-full overflow-hidden">
        <div 
          className="bg-blue-400 h-full transition-all duration-300 ease-out" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-center mt-1">{progress.toFixed(0)}%</div>
    </div>
  </Html>;
}

// Moon model component
function Moon(props) {
  const { onMoonClick } = props;
  const moonRef = useRef();
  const { scene } = useGLTF('/low_poly_moon.glb');
  
  useEffect(() => {
    // Add emissive properties to the moon materials
    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material = child.material.clone(); // Clone to avoid affecting other instances
        child.material.emissive = new THREE.Color(0x404080); // Subtle blue-white glow
        child.material.emissiveIntensity = 0.3; // Moderate intensity
        child.material.needsUpdate = true;
      }
    });
  }, [scene]);
  
  // Add gentle rotation to the moon
  useFrame((state, delta) => {
    if (moonRef.current) {
      // Very slow rotation on Y axis (0.03 radians per second)
      moonRef.current.rotation.y += delta * 0.03;
    }
  });
  
  return (
    <group ref={moonRef} {...props} onClick={onMoonClick} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

// Floating astronaut component with user textures
function Astronauts(props) {
  const { userHelmetTextures, onAstronautClick, focusedAstronaut } = props;
  console.log("Astronauts component: Received userHelmetTextures:", userHelmetTextures?.length || 0);
  
  // Use astronaut1.glb which contains the FaceTarget mesh
  const { scene } = useGLTF('/astronaut1.glb');
  const instancesRef = useRef();
  const [initialInstanceData, setInitialInstanceData] = useState([]);
  
  useEffect(() => {
    if (!scene || !userHelmetTextures || !userHelmetTextures.length) return;
    
    const numInstances = userHelmetTextures.length;
    console.log(`Creating ${numInstances} astronaut instances with unique textures`);
    
    if (instancesRef.current) {
      while (instancesRef.current.children.length > 0) {
        instancesRef.current.remove(instancesRef.current.children[0]);
      }
    }
    
    const moonRadius = 3.5;
    const newInstanceData = [];
    
    for (let i = 0; i < numInstances; i++) {
      const userData = userHelmetTextures[i];
      const userAstronautScene = scene.clone();
      
      // Create a face target mesh as a small sphere if it doesn't exist
      let faceTargetFound = false;
      let existingFaceTarget = null;
      console.log("Checking astronaut model for existing FaceTarget object (including empty nodes)");
      userAstronautScene.traverse((child) => {
        // Check for any object with FaceTarget name, not just meshes
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('facetarget')) {
          faceTargetFound = true;
          existingFaceTarget = child;
          console.log(`Found existing FaceTarget in astronaut model: ${child.name} (type: ${child.type || child.constructor.name})`, 
                      "at position:", child.position);
          
          // If it's an empty node, let's make it visible for debugging
          if (!child.isMesh) {
            console.log("FaceTarget is not a mesh - it's an empty transform node. Adding a visible marker.");
            // Create a small sphere as our face target marker
            const targetGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            const targetMaterial = new THREE.MeshBasicMaterial({ 
              color: 0x00ff00, // Green to distinguish from our fallback red one
              transparent: true,
              opacity: 1.0,
              wireframe: true,
              wireframeLinewidth: 2
            });
            const targetMarker = new THREE.Mesh(targetGeometry, targetMaterial);
            targetMarker.name = "FaceTargetMarker";
            
            // Add the marker as a child of the empty node to maintain its transformations
            child.add(targetMarker);
            console.log("Added visible marker to empty FaceTarget node");
          }
        }
      });
      
      userAstronautScene.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          const nameLower = child.name.toLowerCase();
          if (nameLower.includes('helmet')) {
            child.material.map = userData.texture;
            child.material.emissive = new THREE.Color(0xa1fcea);
            child.material.emissiveIntensity = 0.3;
            child.material.emissiveMap = userData.texture;
            child.material.needsUpdate = true;
          }
          if (nameLower.includes('glass')) {
            child.material.transparent = true;
            child.material.opacity = 0.1;
            child.material.side = THREE.DoubleSide;
            child.material.emissive = new THREE.Color(0xa1fcea);
            child.material.emissiveIntensity = 0.3;
            // child.material.emissive = new THREE.Color(0x1a1a3a);
            // child.material.emissiveIntensity = 0.2;
            child.material.needsUpdate = true;
          }
          child.castShadow = true;
          child.receiveShadow = true;
          child.userData = { astronautIndex: i, userData: userData };
        }
      });
      
      // Create a group for the astronaut and its label
      const astronautGroup = new THREE.Group();
      astronautGroup.userData = { astronautIndex: i, userData: userData };
      
      // Add the astronaut model to the group
      userAstronautScene.scale.set(0.15, 0.15, 0.15);
      astronautGroup.add(userAstronautScene);
      
      const phi = Math.acos(-1 + (2 * i) / numInstances);
      const theta = Math.sqrt(numInstances * Math.PI) * phi;
      let x = moonRadius * Math.sin(phi) * Math.cos(theta);
      let y = moonRadius * Math.sin(phi) * Math.sin(theta);
      let z = moonRadius * Math.cos(phi);
      
      // Reduced random displacement
      const randomDisplacementFactor = (Math.random() - 0.5) * 0.5; // Was 2.5
      const displacement = new THREE.Vector3(x, y, z).normalize().multiplyScalar(randomDisplacementFactor);
      
      const initialPosition = new THREE.Vector3(x + displacement.x, y + displacement.y, z + displacement.z);
      const initialRotation = new THREE.Euler(
        Math.random() * 2 * Math.PI,
        Math.random() * 2 * Math.PI,
        Math.random() * 2 * Math.PI
      );
      
      newInstanceData.push({
        initialPosition,
        initialRotation,
        userData: userData,
        astronautIndex: i,
        // Reduced speeds and amplitudes
        bobSpeed: Math.random() * 0.05 + 0.02, // Was 0.2 + 0.1
        bobAmplitude: Math.random() * 0.015 + 0.005, // Was 0.05 + 0.02
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2, // Was 0.5
          (Math.random() - 0.5) * 0.2, // Was 0.5
          (Math.random() - 0.5) * 0.2  // Was 0.5
        )
      });
      
      // Set the group position and rotation
      astronautGroup.position.copy(initialPosition);
      astronautGroup.rotation.copy(initialRotation);
      
      // Add the group to the scene
      instancesRef.current.add(astronautGroup);
      
      // If no FaceTarget exists, create one
      if (!faceTargetFound) {
        console.log("No FaceTarget found in model, creating one");
        // Find the helmet to position our target relative to it
        let helmet = null;
        userAstronautScene.traverse((child) => {
          if (child.isMesh && child.name.toLowerCase().includes('helmet')) {
            helmet = child;
            console.log("Found helmet for positioning FaceTarget:", child.name);
          }
        });
        
        // Create a small sphere as our face target
        const targetGeometry = new THREE.SphereGeometry(0.15, 16, 16); 
        const targetMaterial = new THREE.MeshBasicMaterial({ 
          color: 0xff0000,
          transparent: true,
          opacity: 1.0,
          wireframe: true,
          wireframeLinewidth: 2
        });
        const faceTarget = new THREE.Mesh(targetGeometry, targetMaterial);
        faceTarget.name = "FaceTarget";
        
        // Make the face target non-interactive
        faceTarget.userData = { nonInteractive: true };
        
        // Position the face target in front of the helmet
        if (helmet) {
          console.log("Found helmet, positioning FaceTarget relative to it");
          
          // Get the astronaut's world direction (from moon center to astronaut)
          const moonCenter = new THREE.Vector3(0, 0, 0);
          const astronautWorldPos = new THREE.Vector3();
          userAstronautScene.getWorldPosition(astronautWorldPos);
          
          // Calculate direction from moon center to astronaut
          const directionFromMoon = new THREE.Vector3()
            .subVectors(astronautWorldPos, moonCenter)
            .normalize();
            
          // Position the FaceTarget along this direction, in front of the helmet
          // First position at helmet
          faceTarget.position.copy(helmet.position);
          
          // Then move it forward along the direction from the moon
          // Convert the world direction to object space
          const localOffset = directionFromMoon.clone()
            .applyQuaternion(userAstronautScene.quaternion.clone().invert())
            .multiplyScalar(0.5); // Move it half a unit forward
            
          faceTarget.position.add(localOffset);
          
          console.log("FaceTarget positioned at:", faceTarget.position);
          console.log("Using direction from moon:", directionFromMoon);
        } else {
          console.log("No helmet found, using fallback position for FaceTarget");
          faceTarget.position.set(0, 0.1, 0.4);
          console.log("FaceTarget fallback position:", faceTarget.position);
        }
        
        // Add the FaceTarget to the scene
        userAstronautScene.add(faceTarget);
        console.log("Added FaceTarget to astronaut scene:", faceTarget);
      }
    }
    
    setInitialInstanceData(newInstanceData);
  }, [scene, userHelmetTextures, onAstronautClick]);
  
  // Handle clicks on astronauts using R3F's event system on the group
  const handleClick = (event) => {
    console.log("Group click detected, object:", event.object);
    
    // Skip if the clicked object is the FaceTarget
    if (event.object.name === "FaceTarget" || 
        event.object.userData?.nonInteractive) {
      console.log("Skipping click on FaceTarget mesh");
      return;
    }
    
    event.stopPropagation(); // Important: stop propagation here
    
    // event.object is the mesh that was clicked.
    // We need to find the actual astronaut scene instance (its parent group)
    let clickedAstronautInstance = null;
    let currentObject = event.object;
    
    // Traverse up to find the main astronaut group, which is a direct child of instancesRef.current
    // and has the correct userData.
    while (currentObject) {
      if (currentObject.parent === instancesRef.current && currentObject.userData && currentObject.userData.astronautIndex !== undefined) {
        clickedAstronautInstance = currentObject;
        break;
      }
      if (currentObject === instancesRef.current) { // Stop if we reach the main group itself
          break;
      }
      currentObject = currentObject.parent;
    }

    if (clickedAstronautInstance) {
      const { astronautIndex, userData } = clickedAstronautInstance.userData;
      console.log(`Found astronaut instance for click: ${userData.username} (index ${astronautIndex})`);
      console.log("Astronauts.handleClick: Passing this object to onAstronautClick (UUID, name, type):", 
                    clickedAstronautInstance.uuid,
                    clickedAstronautInstance.name,
                    clickedAstronautInstance.type);
      if (onAstronautClick) {
        onAstronautClick(astronautIndex, clickedAstronautInstance, userData);
      }
    } else {
      // This case can happen if the invisible click helpers are clicked.
      // The helper's onClick should directly call onAstronautClick.
      // If we reach here from the group's main onClick, it means a part of the model was clicked
      // that didn't directly bubble up to a helper.
      // We might need to rely on the event.object having the astronaut's userData if helpers are removed.
      // For now, let's see if the helpers are sufficient.
      console.log("Astronauts group click: Could not definitively identify astronaut instance from event.object traversal. Event object:", event.object);
      // Fallback: if event.object itself has the astronaut's direct userData (from child.userData = ...)
      if (event.object.userData && event.object.userData.astronautIndex !== undefined) {
          const { astronautIndex, userData } = event.object.userData;
           console.log(`Fallback: Clicked on mesh of astronaut ${astronautIndex}: ${userData.username}`);
           // We need the main astronaut scene object (parent group) for positioning
           let mainAstronautGroup = event.object;
           while(mainAstronautGroup.parent !== instancesRef.current && mainAstronautGroup.parent) {
               mainAstronautGroup = mainAstronautGroup.parent;
           }
           if (mainAstronautGroup.parent === instancesRef.current) {
               if (onAstronautClick) {
                    onAstronautClick(astronautIndex, mainAstronautGroup, userData);
               }
           } else {
               console.log("Fallback failed to find main astronaut group.");
           }
      }
    }
  };
  
  // Animate the astronauts
  useFrame((state, delta) => {
    if (!initialInstanceData.length || !instancesRef.current) return;
    const time = state.clock.getElapsedTime();
    initialInstanceData.forEach((data, index) => {
      const instance = instancesRef.current.children[index];
      if (!instance || instance.userData.astronautIndex === undefined) return;

      /* // Keep animation enabled for focused astronaut
      if (focusedAstronaut && focusedAstronaut.index === index) {
        return; 
      }
      */

      instance.position.copy(data.initialPosition);
      instance.position.y += Math.sin(time * data.bobSpeed + index) * data.bobAmplitude;
      instance.position.x += Math.cos(time * data.bobSpeed * 0.7 + index * 1.5) * data.bobAmplitude * 0.7;
       
      const distanceToMoonCenter = instance.position.length();
      if (distanceToMoonCenter < MIN_DISTANCE) {
        const direction = instance.position.clone().normalize();
        instance.position.copy(direction.multiplyScalar(MIN_DISTANCE));
      }
        
      // Modified Rotation Logic
      const slowRotationFactor = 0.2;
      const currentRotationX = data.initialRotation.x + time * data.rotationSpeed.x * slowRotationFactor;
      const currentRotationZ = data.initialRotation.z + time * data.rotationSpeed.z * slowRotationFactor;

      // Calculate base outward angle for Y rotation
      const directionFromMoon = instance.position.clone().normalize();
      // atan2(x, z) gives angle on XZ plane. Add PI to face away if model's +Z is forward.
      // If model's -Z is forward, this might be okay. Or adjust based on model's default forward.
      // Assuming astronaut model's default front (-Z) should point away from moon.
      // The vector from moon to astronaut is directionFromMoon. 
      // To make -Z point along directionFromMoon, Y rotation is atan2(directionFromMoon.x, directionFromMoon.z)
      // If the model's +Z is its front (face), we need to add PI to make it face away from the moon.
      let currentRotationY = Math.atan2(directionFromMoon.x, directionFromMoon.z) + Math.PI;

      // Add a limited swivel oscillation
      const swivelSpeed = data.rotationSpeed.y * 0.1; 
      const swivelRange = Math.PI / 6; // Reduced: Max swivel +/- 30 degrees from directly outward
      const swivel = Math.sin(time * swivelSpeed + data.initialRotation.y) * swivelRange;
      currentRotationY += swivel;
      
      instance.rotation.set(currentRotationX, currentRotationY, currentRotationZ);
    });
  }, -1); // Higher priority (runs earlier)
  
  return (
    <group ref={instancesRef} onClick={handleClick} {...props}>
      {initialInstanceData.map((data, i) => 
        // Only show label if this astronaut is the focused one
        focusedAstronaut && focusedAstronaut.index === i ? (
          <Html
            key={i}
            transform
            sprite
            geometry={<planeGeometry args={[.2, .2]} />}
            distanceFactor={8}
            position={[0.0, 0.01, 0]} // Position slightly above astronaut
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            {...{ parent: instancesRef.current ? instancesRef.current.children[i] : null }}
            attachCamera={true}
          >
            <div style={{
              background: 'rgba(255,0,0,0.0)',
              color: 'white',
              borderRadius: '5%',
              marginTop: '0.03em',
              paddingTop: '0.03em',
              width: '120%',
              height: '100%',
              fontFamily: 'UnifrakturMaguntia',
              fontSize: '0.1em',
              display: 'block',
              textAlign: 'center',
              textShadow: '0 0 0.1em #fff, 0 0 0.2em #0ff, 0 0 0.3em #f0f',
              animation: 'pulse 1.5s infinite alternate',
            }}>
              <style>
                {`
                  @keyframes pulse {
                    0% { text-shadow: 0 0 0.1em #fff, 0 0 0.2em #0ff, 0 0 0.3em #f0f; }
                    100% { text-shadow: 0 0 0.15em #fff, 0 0 0.25em #0ff, 0 0 0.4em #f0f; }
                  }
                `}
              </style>
              {data.userData.username}
            </div>
          </Html>
        ) : null
      )}
    </group>
  );
}

// Scene lighting and camera setup
function SceneSetup() {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 0, 8);
  }, [camera]);

  return (
    <>
      {/* Adding ambient light for overall illumination */}
      <ambientLight intensity={0.3} />
      
      {/* Main directional light to simulate sun */}
      <directionalLight 
        position={[5, 5, 5]} 
        intensity={1.5} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
      />
      
      {/* Rim light to highlight the edges */}
      <directionalLight 
        position={[-5, 5, -5]} 
        intensity={0.4} 
        color="#a0a0ff" 
      />
      
      {/* Bottom fill light */}
      <pointLight 
        position={[0, -5, 0]} 
        intensity={0.2} 
        color="#404060" 
      />
    </>
  );
}

// Simple orbit controls for rotating around the moon
function SimpleOrbitCamera({ focusedAstronaut }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const followModeRef = useRef(false);
  const neutralPositionRef = useRef(new THREE.Vector3(0, 0, 8));
  const neutralTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const animationFrameIdRef = useRef(null);
  
  // Refs for vectors to use in useFrame, avoiding allocations per frame
  const targetPositionVecRef = useRef(new THREE.Vector3());
  const faceDirectionVecRef = useRef(new THREE.Vector3());
  const idealCameraPosVecRef = useRef(new THREE.Vector3());
  const astronautUpVecRef = useRef(new THREE.Vector3());
  const worldUpVecRef = useRef(new THREE.Vector3(0, 1, 0));
  const worldRightVecRef = useRef(new THREE.Vector3(1, 0, 0));
  const tempVecRef = useRef(new THREE.Vector3()); // For intermediate calculations
  const worldQuaternionRef = useRef(new THREE.Quaternion()); // For X/Y axis calculation
  const localXPositiveRef = useRef(new THREE.Vector3(1, 0, 0)); // Local +X direction
  const localYPositiveRef = useRef(new THREE.Vector3(0, 1, 0)); // Local +Y direction (for later if needed)
  const originalFovRef = useRef(null); // To store original FOV
  
  useEffect(() => {
    // This effect now tests targeting a STATIC point when any astronaut is focused.
    // The originalFovRef storing logic can remain if you plan to use FOV changes later.
    if (camera && originalFovRef.current === null) {
      originalFovRef.current = camera.fov;
    }

    if (focusedAstronaut && focusedAstronaut.object) {
      const astronautInstance = focusedAstronaut.object;
      // TARGET IS NOW THE ASTRONAUT INSTANCE (GROUP) ITSELF
      const targetMeshOrGroup = astronautInstance; 

      if (controlsRef.current) {
        console.log("Focus on Astronaut Origin: Disabling OrbitControls.");
        controlsRef.current.enabled = false;
      }
      
      camera.updateMatrixWorld(); 
      astronautInstance.matrixAutoUpdate = true;
      astronautInstance.traverse(obj => obj.matrixAutoUpdate = true);
      astronautInstance.updateMatrixWorld(true); // Update instance and its children
      // No need to update targetMeshOrGroup separately if it IS astronautInstance

      const targetCentroidWorldPos = new THREE.Vector3();
      targetMeshOrGroup.getWorldPosition(targetCentroidWorldPos); // Get world pos of the astronaut group origin

      const instanceWorldQuaternion = new THREE.Quaternion();
      targetMeshOrGroup.getWorldQuaternion(instanceWorldQuaternion); // Get instance's current world orientation
      
      // --- Calculate Ideal Final Camera Position --- 
      // Use instance's presumed +X as its "face forward" direction relative to its current orientation
      const faceForwardDirection = new THREE.Vector3(1,0,0).applyQuaternion(instanceWorldQuaternion);
      const dist = 1.5; // Adjusted distance, can be fine-tuned (e.g., 1.0, 1.2)
      // Position camera IN FRONT of the instance: instanceOrigin - (faceForward * dist)
      const idealFinalCameraPos = new THREE.Vector3().subVectors(targetCentroidWorldPos, faceForwardDirection.clone().multiplyScalar(dist));

      // --- Orient Astronaut to face this idealFinalCameraPos --- 
      const astronautPos = new THREE.Vector3(); // To store astronaut's current world position for lookAt
      astronautInstance.getWorldPosition(astronautPos);

      const desiredFacingDirection = new THREE.Vector3().subVectors(idealFinalCameraPos, astronautPos).normalize();
      const worldYUp = new THREE.Vector3(0,1,0);

      // We want astronaut's local +X to align with desiredFacingDirection.
      // The lookAt method orients an object's local -Z axis towards the target point.
      // So, we need to calculate a target point for lookAt such that if -Z points there,
      // then +X (which is -90deg from -Z around local Y) points along desiredFacingDirection.
      // This means the direction for -Z should be rotated +90deg around world Y from desiredFacingDirection.
      const lookAtDirectionForNegativeZ = desiredFacingDirection.clone().applyAxisAngle(worldYUp, Math.PI / 2); 
      const lookAtPoint = new THREE.Vector3().addVectors(astronautPos, lookAtDirectionForNegativeZ); // No need to normalize lookAtDirectionForNegativeZ if adding to pos

      const tempLookAtMatrix = new THREE.Matrix4();
      // Astronaut at astronautPos looks at lookAtPoint, with worldYUp as its 'up' reference during the lookAt operation.
      tempLookAtMatrix.lookAt(astronautPos, lookAtPoint, worldYUp);
      astronautInstance.quaternion.setFromRotationMatrix(tempLookAtMatrix);
      
      // No corrective quaternion is applied here because the lookAt target was adjusted instead.
      astronautInstance.updateMatrixWorld(true); 
      console.log(`Astronaut ${focusedAstronaut.userData?.username} (origin focus) pre-oriented with tricky lookAt.`);

      // console.log(`Focus on Origin (${targetMeshOrGroup.name}): TargetPos:`, targetCentroidWorldPos.toArray(), `IdealCamPos:`, idealFinalCameraPos.toArray());
      // Ensure the console log uses the correct variables if re-enabled
      const startPosition = camera.position.clone();
      const endPosition = idealFinalCameraPos; 
      const duration = 0.6; 
      const startTime = Date.now();

      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);

      const animateCamera = () => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsedTime / duration, 1);
        const easeProgress = easeInOutQuintic(progress);
        
        camera.position.lerpVectors(startPosition, endPosition, easeProgress);
        camera.up.set(0,1,0); 
        camera.lookAt(targetCentroidWorldPos); // Look at the astronaut's origin

        if (progress < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animateCamera);
        } else {
          animationFrameIdRef.current = null;
          camera.position.copy(endPosition); 
          camera.up.set(0,1,0);
          camera.lookAt(targetCentroidWorldPos); 
          
          if (controlsRef.current) {
            controlsRef.current.target.copy(targetCentroidWorldPos); // Target is astronaut's origin
            controlsRef.current.enabled = true;
            controlsRef.current.update();
            console.log("Focus on Origin: OrbitControls re-enabled, target set to astronaut origin.");
          }
          followModeRef.current = true; 
        }
      };
      animationFrameIdRef.current = requestAnimationFrame(animateCamera);

    } else { // When deselecting 
       // ... (Same deselection logic as before, ensuring controls are re-enabled and camera returns to neutral)
      if (controlsRef.current && !controlsRef.current.enabled) {
          controlsRef.current.target.copy(neutralTargetRef.current); 
          controlsRef.current.enabled = true;
          console.log("Focus on Origin: OrbitControls re-enabled for neutral return.");
      }
      if (controlsRef.current) {
        const controls = controlsRef.current;
        if (!controls.enabled) controls.enabled = true; 
        const startPositionCam = camera.position.clone();
        const startTargetCam = controls.target.clone(); 
        const endPositionCam = neutralPositionRef.current.clone();
        const endTargetCam = neutralTargetRef.current.clone(); 
        const durationReturn = 0.8;
        const startTimeReturn = Date.now();
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        const animateBackToNeutral = () => {
          const elapsedTime = (Date.now() - startTimeReturn) / 1000;
          const progress = Math.min(elapsedTime / durationReturn, 1);
          const easeProgress = easeOutCubic(progress);
          controls.target.lerpVectors(startTargetCam, endTargetCam, easeProgress);
          camera.position.lerpVectors(startPositionCam, endPositionCam, easeProgress);
          controls.update(); 
          if (progress < 1) {
            animationFrameIdRef.current = requestAnimationFrame(animateBackToNeutral);
          } else {
            animationFrameIdRef.current = null;
          }
        };
        animationFrameIdRef.current = requestAnimationFrame(animateBackToNeutral);
      }
      followModeRef.current = false;
    }
  }, [focusedAstronaut, camera, gl]);

  useFrame(() => {
    if (controlsRef.current && controlsRef.current.enabled) {
      // If an astronaut is focused, AND the astronaut is MOVING, we might need to update target here.
      // But since astronaut STOPS on focus with current Astronauts.jsx logic, this might not be needed for the target itself.
      // However, OrbitControls always needs update() for damping if enabled.
      if (followModeRef.current && focusedAstronaut && focusedAstronaut.object) {
        const astronautInstance = focusedAstronaut.object;
        // Ensure matrix is updated if we were to read from it, though here we mostly need it for target
        astronautInstance.updateMatrixWorld(true);
        const currentTargetPos = targetPositionVecRef.current; // Reuse vector
        astronautInstance.getWorldPosition(currentTargetPos);
        controlsRef.current.target.copy(currentTargetPos); // Continuously update target to astronaut origin
      }
      controlsRef.current.update();
    }
  }, 0); 
  
  // Initial OrbitControls setup (basic)
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enablePan = true;
      controlsRef.current.minDistance = 0.3;
      controlsRef.current.maxDistance = 10; 
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.1;
      
      // Ensure neutralPositionRef explicitly captures the desired neutral/page load position.
      // It could also be set directly: neutralPositionRef.current.set(0, 0, 8);
      // But copying from camera.position after SceneSetup sets it should be fine.
      neutralPositionRef.current.copy(camera.position); 
      neutralTargetRef.current.copy(controlsRef.current.target); // Often (0,0,0) initially
      console.log("Neutral camera position set to:", neutralPositionRef.current.toArray());
      console.log("Neutral camera target set to:", neutralTargetRef.current.toArray());
    }
  }, [camera, gl]); // Added gl as it's an arg for OrbitControls, to ensure this runs after canvas/gl context is ready.
  
  function easeOutCubic(x) {
    return 1 - Math.pow(1 - x, 3);
  }
  
  // Add a more sophisticated easing function for smoother camera movement
  function easeInOutQuintic(x) {
    return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
  }
  
  return <OrbitControls ref={controlsRef} args={[camera, gl.domElement]} />;
}

// Add this component after the Astronauts component
function ModelInspector() {
  const { scene } = useGLTF('/astronaut1.glb');
  
  useEffect(() => {
    // console.log("Model Inspector: Examining astronaut1.glb structure"); // Keep this if desired
    const inspectNode = (node, depth = 0) => {
      const indent = ' '.repeat(depth * 2);
      const type = node.type || (node.isMesh ? 'Mesh' : (node.isGroup ? 'Group' : 'Object3D'));
      console.log(`${indent}- ${node.name || 'unnamed'} (${type})`); // Ensure this backtick is closed
      
      if (node.isMesh) {
        // console.log(`${indent}  Material: ${node.material ? node.material.name || 'unnamed' : 'none'}`);
        // console.log(`${indent}  Geometry: ${node.geometry ? 'present' : 'none'} (vertices: ${node.geometry?.attributes?.position?.count || 'unknown'})`);
      }
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => inspectNode(child, depth + 1));
      }
    };
    // console.log("Model hierarchy:");
    // inspectNode(scene);
    // ... rest of ModelInspector ...
  }, [scene]);
  return null; 
}

function SceneManager({ userHelmetTextures, focusedAstronaut, onAstronautClick }) {
  const handleMoonClick = (event) => {
    event.stopPropagation();
    if (onAstronautClick) {
      onAstronautClick(null, null, null);
    }
  };
  
  return (
    <>
      <SceneSetup />
      <mesh position={[2, 0.5, 0]} name="StaticTestTarget"> {/* Static red box, slightly elevated */}
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="red" emissive="red" emissiveIntensity={0.5} />
      </mesh>
      <Moon position={[0, 0, 0]} scale={MOON_RADIUS} onMoonClick={handleMoonClick} />
      <Astronauts 
        userHelmetTextures={userHelmetTextures} 
        onAstronautClick={onAstronautClick}
        focusedAstronaut={focusedAstronaut}
      />
      {/* <ModelInspector /> */ /* Temporarily comment out if it's causing issues */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ContactShadows 
        position={[0, -2.6, 0]}   // Lowered to be below moon (radius 2.5)
        opacity={0.4} 
        scale={10}  // Increased scale to cover more area if plane is lower
        blur={2.5} 
        far={3}     // Adjusted far for potentially larger shadow casting area
      />
      <EffectComposer>
        <Bloom 
          intensity={0.5} 
          luminanceThreshold={0.1} 
          luminanceSmoothing={0.9} 
          kernelSize={3}
        />
        <Vignette 
          opacity={0.3} 
          darkness={0.8} 
        />
      </EffectComposer>
      <SimpleOrbitCamera focusedAstronaut={focusedAstronaut} />
    </>
  );
}

export default function MoonScene({userHelmetTextures, currentUser}) {
  console.log("MoonScene default export: Received userHelmetTextures:", userHelmetTextures?.length || 0);
  
  const [focusedAstronaut, setFocusedAstronaut] = useState(null);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  const handleAstronautClick = (index, astronautObject, userData) => {
    if (index === null) { 
      console.log("MoonScene: Deselecting astronaut (handleAstronautClick via null index)");
      setFocusedAstronaut(null);
      setIsDetailModalOpen(false); 
      return;
    }
    
    // If clicking the currently focused astronaut AND the detail modal is open, toggle it closed and deselect.
    if (focusedAstronaut && focusedAstronaut.index === index && isDetailModalOpen) {
      console.log("MoonScene: Clicked same focused astronaut. Closing modal and deselecting.");
      setIsDetailModalOpen(false);
      setFocusedAstronaut(null); 
      return;
    }

    // Otherwise, focusing on a new astronaut or opening modal for a currently focused one (if modal was closed)
    console.log(`MoonScene: Clicked on astronaut ${index}: ${userData?.username}, Object:`, astronautObject);
    console.log("MoonScene.handleAstronautClick: astronautObject received (UUID, name, type):", 
                  astronautObject?.uuid, 
                  astronautObject?.name, 
                  astronautObject?.type);

    setFocusedAstronaut({
      index,
      object: astronautObject,
      userData
    });
    setIsDetailModalOpen(true);
  };
  
  const handleCanvasClick = (event) => {
    if (event.target === event.currentTarget) {
      console.log("MoonScene: Canvas click, deselecting astronaut.");
      setFocusedAstronaut(null);
      setIsDetailModalOpen(false);
    }
  };
  
  const handleSaveCustomizations = useCallback((customizations) => {
    console.log("Saving customizations:", customizations);
  }, []);
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 1 }}>
      <Canvas shadows dpr={[1, 2]} camera={{ fov: 50, position: [0,0,8], near: 0.1, far: 1000 }} onClick={handleCanvasClick}>
        <color attach="background" args={['#000010']} />
        <fog attach="fog" args={['#000010', 10, 50]} />
        <Suspense fallback={<Loader />}>
          <SceneManager
            userHelmetTextures={userHelmetTextures}
            focusedAstronaut={focusedAstronaut}
            onAstronautClick={handleAstronautClick}
          />
        </Suspense>
      </Canvas>
      <div 
        className="fixed bottom-6 right-6 z-50"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: isCustomizerOpen ? 'scale(0.8) translateY(70px)' : 'scale(1)',
          opacity: isCustomizerOpen ? 0 : 1,
        }}
      >
        <button
          onClick={() => {
            console.log("Customize button clicked, setting isCustomizerOpen to true");
            setIsCustomizerOpen(true);
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-colors flex items-center space-x-2 text-lg font-medium"
          style={{ 
            padding: '12px 24px',
            backgroundColor: '#2563eb',
            color: 'white',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.125rem',
            fontWeight: '500',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.7)',
            cursor: 'pointer'
          }}
          aria-label="Open astronaut customizer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" style={{ width: '1.25rem', height: '1.25rem' }}>
            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
          </svg>
          <span>Customize Astronaut</span>
        </button>
      </div>
      <AstronautCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => {
          console.log("Modal onClose called, setting isCustomizerOpen to false");
          setIsCustomizerOpen(false);
        }}
        onSave={handleSaveCustomizations}
        defaultProfileImage={currentUser?.profileImage}
      />
      <AstronautDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
        }}
        astronautData={focusedAstronaut ? focusedAstronaut.userData : null} 
      />
    </div>
  );
}

useGLTF.preload('/low_poly_moon.glb');
useGLTF.preload('/astronaut1.glb');
// Ensure these paths are correct and files exist in your public folder if you re-enable them
// useGLTF.preload('/astronaut.glb');
// useGLTF.preload('/astronaut_voyager.glb'); 
