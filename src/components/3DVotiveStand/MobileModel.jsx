import React, { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import PostProcessingEffects from "./PostProcessingEffects";
import FlyInEffect2 from "./FlyInEffect2";
import CameraGUI from "./CameraGUI";

const MOBILE_CAMERA_SETTINGS = {
  position: [-6.86, 13.3, 12.19],
  fov: 103,
  near: 0.1,
  far: 200,
};

const MOBILE_CONTROL_SETTINGS = {
  enableZoom: false,
  enablePan: false,
  enableRotate: true,
  maxPolarAngle: Math.PI * 0.65,
  minPolarAngle: Math.PI * 0.25,
  maxDistance: 20,
  minDistance: 4,
  rotateSpeed: 0.6,
  zoomSpeed: 0.8,
  target: [-3, 22, -8.4],
};

function MobileModel({ scale, setTooltipData, onScreenClick }) {
  const gltf = useGLTF("/mobileVersion.glb");
  const modelRef = useRef();
  const controlsRef = useRef();
  const { camera, viewport, size, gl } = useThree();
  const mixerRef = useRef();
  const { actions, mixer } = useAnimations(gltf.animations, modelRef);
  const cameraRef = useRef(camera);

  // Initialize camera position
  useEffect(() => {
    if (camera) {
      // Don't set initial position here anymore, let FlyInEffect2 handle it
      camera.fov = MOBILE_CAMERA_SETTINGS.fov;
      camera.near = MOBILE_CAMERA_SETTINGS.near;
      camera.far = MOBILE_CAMERA_SETTINGS.far;
      camera.updateProjectionMatrix();
      cameraRef.current = camera; // Update camera reference
    }
  }, [camera]);

  // Center the model and set up camera
  useEffect(() => {
    if (!modelRef.current) return;

    // Calculate model bounds
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center the model
    modelRef.current.position.set(-center.x, -center.y + size.y / 2, -center.z);

    if (controlsRef?.current) {
      controlsRef.current.target.set(0, size.y / 2, 0);
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
  const screenActions = {
    Screen1: () => {
      console.log("Screen1 clicked!");
      if (onScreenClick) onScreenClick("stand1"); // Trigger parent callback
    },
    Screen2: () => console.log("Screen2 clicked!"),
    Screen3: () => console.log("Screen3 clicked!"),
    Screen4: () => console.log("Screen4 clicked!"),
    Screen5: () => console.log("Screen5 clicked!"),
    Screen6: () => console.log("Screen6 clicked!"),
  };

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

    const screenObjects = [];
    modelRef.current.traverse((object) => {
      if (object.isMesh && object.name.startsWith("Screen")) {
        screenObjects.push(object);
      }
    });

    const intersects = raycaster.intersectObjects(screenObjects, true);
    document.body.style.cursor = intersects.length > 0 ? "pointer" : "default";
  };

  const handleClick = (event) => {
    if (!camera || !modelRef.current) return;

    const canvas = gl.domElement; // Use the canvas reference
    const rect = canvas.getBoundingClientRect();

    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const screenObjects = [];
    modelRef.current.traverse((object) => {
      if (object.isMesh && object.name.startsWith("Screen")) {
        screenObjects.push(object);
      }
    });

    const intersects = raycaster.intersectObjects(screenObjects, true);
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      const action = screenActions[clickedObject.name];
      if (action) {
        action();
      }
    }
  };

  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={7}
        position={[0, 8.3, -0.5]}
        onPointerMove={handlePointerMove}
        onClick={handleClick}
      />
      <PostProcessingEffects />
      <FlyInEffect2 cameraRef={cameraRef} duration={8} />
      <OrbitControls
        ref={controlsRef}
        {...MOBILE_CONTROL_SETTINGS}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
      {/* <CameraGUI
        cameraRef={cameraRef}
        controlsRef={controlsRef}
        onGuiStart={() => {}}
        onGuiEnd={() => {}}
      /> */}
      <ambientLight intensity={1} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.5}
        castShadow={false}
      />
    </>
  );
}

useGLTF.preload("/mobileVersion.glb");

export default MobileModel;
