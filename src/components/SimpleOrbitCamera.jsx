import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Easing functions that were missing
function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}
function easeInOutQuintic(x) {
  return x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2;
}

function SimpleOrbitCamera({ focusedTarget }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();
  const followModeRef = useRef(false);
  const neutralPositionRef = useRef(new THREE.Vector3(0, 0, 8));
  const neutralTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const animationFrameIdRef = useRef(null);

  const targetPositionVecRef = useRef(new THREE.Vector3());
  const idealCameraPosVecRef = useRef(new THREE.Vector3());
  const tempVecRef = useRef(new THREE.Vector3());
  const worldQuaternionRef = useRef(new THREE.Quaternion());
  const localXPositiveRef = useRef(new THREE.Vector3(1, 0, 0));
  const originalFovRef = useRef(null);

  useEffect(() => {
    if (camera && originalFovRef.current === null) {
      originalFovRef.current = camera.fov;
    }

    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
    }

    if (focusedTarget && focusedTarget.object3D) {
      const targetObject = focusedTarget.object3D;
      let idealCamPosFinal;
      let lookAtTargetPos = new THREE.Vector3();
      const duration = 0.8;

      if (controlsRef.current) {
        console.log(`Focusing on ${focusedTarget.type}: Disabling OrbitControls.`);
        controlsRef.current.enabled = false;
      }
      
      camera.updateMatrixWorld();
      targetObject.matrixAutoUpdate = true; // Ensure for instance and its children if it's a group
      targetObject.traverse(obj => obj.matrixAutoUpdate = true);
      targetObject.updateMatrixWorld(true);
      targetObject.getWorldPosition(lookAtTargetPos);

      if (focusedTarget.type === 'astronaut') {
        const astronautInstance = targetObject;
        const markerWorldQuaternion = new THREE.Quaternion();
        // Assuming astronautInstance itself is what we get orientation from for +X face
        astronautInstance.getWorldQuaternion(markerWorldQuaternion);
        const faceForwardDirection = new THREE.Vector3(1,0,0).applyQuaternion(markerWorldQuaternion);
        const dist = 0.7;
        idealCamPosFinal = new THREE.Vector3().subVectors(lookAtTargetPos, faceForwardDirection.clone().multiplyScalar(dist));

        const worldYUp = new THREE.Vector3(0,1,0);
        const tempLookAtMatrix = new THREE.Matrix4();
        // Astronaut looks from its position towards where the camera will be (idealCamPosFinal)
        tempLookAtMatrix.lookAt(astronautInstance.position, idealCamPosFinal, worldYUp);
        astronautInstance.quaternion.setFromRotationMatrix(tempLookAtMatrix);
        const correctionQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        astronautInstance.quaternion.multiply(correctionQuaternion);
        astronautInstance.updateMatrixWorld(true); 
        console.log(`Astronaut ${focusedTarget.userData?.username} pre-oriented.`);
      
      } else if (focusedTarget.type === 'rocket') {
        const dist = 1.5; // Moderate fixed distance for this test
        console.log(`Rocket focus: Attempting fixed offset positioning with dist = ${dist}`);
        
        // idealCamPosFinal: Offset from rocket's origin (lookAtTargetPos)
        // For example, position camera somewhat behind and above the rocket along world axes relative to rocket.
        idealCamPosFinal = new THREE.Vector3(
          lookAtTargetPos.x + 0.0,      // Centered on X of rocket
          lookAtTargetPos.y + 0.5,      // Slightly above rocket's origin
          lookAtTargetPos.z + dist        // `dist` units behind rocket on Z-axis
        );
        // This is a world-space offset. If rocket is rotated, this might not be "behind" its tail.

        // Alternative using previous viewDirection logic if fixed offset is bad:
        // const viewDirection = new THREE.Vector3().subVectors(lookAtTargetPos, camera.position).normalize();
        // if (viewDirection.lengthSq() === 0) { 
        //     viewDirection.set(0,0.5,1).normalize(); 
        // }
        // idealCamPosFinal = new THREE.Vector3().subVectors(lookAtTargetPos, viewDirection.multiplyScalar(dist));

        console.log("Rocket focus: Targetting rocket origin, with calculated idealCamPosFinal.");
      } else {
        console.warn("Unknown focusedTarget type:", focusedTarget.type);
        return; // Don't animate if type is unknown
      }

      console.log(`Initial Anim (${focusedTarget.type} - ${targetObject.name}): Target:`, lookAtTargetPos.toArray(), `IdealCamPos:`, idealCamPosFinal.toArray());
      const startPosition = camera.position.clone();
      const endPosition = idealCamPosFinal; 
      const startTime = Date.now();

      const animateCamera = () => {
        const elapsedTime = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsedTime / duration, 1);
        const easeProgress = easeInOutQuintic(progress);
        
        camera.position.lerpVectors(startPosition, endPosition, easeProgress);
        camera.up.set(0,1,0); 
        camera.lookAt(lookAtTargetPos); 

        if (progress < 1) {
          animationFrameIdRef.current = requestAnimationFrame(animateCamera);
        } else {
          animationFrameIdRef.current = null;
          camera.position.copy(endPosition); 
          camera.up.set(0,1,0);
          camera.lookAt(lookAtTargetPos); 
          
          if (controlsRef.current) {
            controlsRef.current.target.copy(lookAtTargetPos);
            controlsRef.current.enabled = true;
            controlsRef.current.update();
            console.log(`Focus on ${focusedTarget.type}: OrbitControls re-enabled.`);
          }
          followModeRef.current = true; 
        }
      };
      animationFrameIdRef.current = requestAnimationFrame(animateCamera);

    } else { // When deselecting (focusedTarget is null)
      followModeRef.current = false; 
      if (controlsRef.current) {
        if (!controlsRef.current.enabled) {
            controlsRef.current.target.copy(new THREE.Vector3(0,0,0));
            controlsRef.current.enabled = true;
            console.log("OrbitControls re-enabled for neutral return, target set to origin.");
        }
        
        const controls = controlsRef.current;
        if (!controls.enabled) controls.enabled = true; 
        console.log("Returning to explicit neutral view (0,0,8 looking at 0,0,0).");
        
        const normalFov = originalFovRef.current || 50;
        if (Math.abs(camera.fov - normalFov) > 0.1) {
            const fovResetStartTime = Date.now();
            const currentFov = camera.fov;
            const fovResetDuration = 0.3; 
            const animateFovBack = () => {
                const elapsed = (Date.now() - fovResetStartTime) / 1000;
                const progress = Math.min(elapsed / fovResetDuration, 1);
                camera.fov = THREE.MathUtils.lerp(currentFov, normalFov, progress);
                camera.updateProjectionMatrix();
                if (progress < 1) animationFrameIdRef.current = requestAnimationFrame(animateFovBack);
                else { 
                    camera.fov = normalFov; 
                    camera.updateProjectionMatrix();
                    animationFrameIdRef.current = null;
                }
            };
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = requestAnimationFrame(animateFovBack);
        }

        const startPositionCam = camera.position.clone();
        const startTargetCam = controls.target.clone(); 
        
        const endPositionCam = new THREE.Vector3(0,0,8);
        const endTargetCam = new THREE.Vector3(0,0,0);
        
        const durationReturn = 0.8;
        const startTimeReturn = Date.now();
        if (animationFrameIdRef.current && !(camera.fov === normalFov)) {
            cancelAnimationFrame(animationFrameIdRef.current);
        }
        
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
            controls.target.copy(endTargetCam);
            camera.position.copy(endPositionCam);
            controls.update();
          }
        };
        animationFrameIdRef.current = requestAnimationFrame(animateBackToNeutral);
      }
    }

    if (controlsRef.current) {
      controlsRef.current.enablePan = true;
      controlsRef.current.minDistance = 0.05;
      controlsRef.current.maxDistance = 15; 
      controlsRef.current.enableDamping = true;
      controlsRef.current.dampingFactor = 0.1;
      neutralPositionRef.current.copy(camera.position); 
      neutralTargetRef.current.copy(controlsRef.current.target); 
      console.log("Neutral camera position set to:", neutralPositionRef.current.toArray());
      console.log("Neutral camera target set to:", neutralTargetRef.current.toArray());
      console.log("OrbitControls minDistance set to:", controlsRef.current.minDistance);
    }
  }, [focusedTarget, camera, gl]);

  useFrame(() => {
    if (controlsRef.current && controlsRef.current.enabled) {
      if (followModeRef.current && focusedTarget && focusedTarget.object3D) {
        const targetObject = focusedTarget.object3D;
        targetObject.updateMatrixWorld(true); // Ensure matrix is updated if target is moving
        const currentTargetPos = targetPositionVecRef.current; 
        targetObject.getWorldPosition(currentTargetPos);
        controlsRef.current.target.copy(currentTargetPos); 
      }
      controlsRef.current.update();
    }
  }, 0); 

  return <OrbitControls ref={controlsRef} args={[camera, gl.domElement]} />;
}

export default SimpleOrbitCamera; 