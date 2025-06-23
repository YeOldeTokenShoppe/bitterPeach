import { useEffect, useRef, useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

function CyborgTempleSceneSimple({ 
  onLoad, 
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  hover = false,
  rotate = false
}) {
  const sceneRef = useRef();
  const groupRef = useRef();
  const { scene } = useThree();
  const initialY = useRef(position[1]);
  const mixerRef = useRef();
  const hasLoadedRef = useRef(false);
  const tickerRef = useRef();
  const textureRef = useRef();
  const canvasRef = useRef();

  // Use useMemo to prevent recreating the loader on every render
  const loader = useMemo(() => {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);
    return gltfLoader;
  }, []);

  // Simple ticker data
  const tickerText = "NASDAQ: $16,423.50 ▲2.3% • DOW: $38,521.40 ▲1.8% • S&P: $5,231.30 ▲2.1% • ";

  useEffect(() => {
    if (hasLoadedRef.current) return;

    let isCurrentInstance = true;

    loader.load("/cyborgTempleScene.glb", (gltf) => {
      if (!isCurrentInstance) return;

      const templeScene = gltf.scene;

      // Create and store the animation mixer
      const mixer = new THREE.AnimationMixer(templeScene);
      mixerRef.current = mixer;

      // Play specific animations based on character
      if (gltf.animations.length > 0) {
        console.log('Available animations:', gltf.animations.map(a => a.name));
        
        gltf.animations.forEach((animation) => {
          const animName = animation.name;
          
          // Check which character this animation belongs to based on suffix
          if (animName === 'TYPE') {
            // Play TYPE animation for the first character (no suffix)
            const action = mixer.clipAction(animation);
            action.play();
            console.log(`Playing TYPE animation: ${animation.name}`);
          } else if (animName === 'Idle.001' || animName === 'Idle.002') {
            // Play idle animations for the other two characters
            const action = mixer.clipAction(animation);
            action.play();
            console.log(`Playing idle animation: ${animation.name}`);
          }
        });
      }

      // Create an anchor group with initial position
      const anchorGroup = new THREE.Group();
      anchorGroup.position.set(position[0], position[1], position[2]);
      initialY.current = position[1];

      // Create a rotation group
      const rotationGroup = new THREE.Group();

      // Set up the hierarchy
      anchorGroup.add(rotationGroup);
      rotationGroup.add(templeScene);

      // Store refs
      sceneRef.current = templeScene;
      groupRef.current = { anchor: anchorGroup, rotation: rotationGroup };

      // Apply scale and rotation from props
      templeScene.scale.set(scale[0], scale[1], scale[2]);
      templeScene.rotation.set(rotation[0], rotation[1], rotation[2]);

      // Center the scene in the rotation group
      const box = new THREE.Box3().setFromObject(templeScene);
      const center = box.getCenter(new THREE.Vector3());
      templeScene.position.sub(center);

      // Find and replace the ticker
      templeScene.traverse((child) => {
        if (child.name === 'ticker' && child.isMesh) {
          console.log('Found ticker:', child);
          
          // Store reference to original ticker
          tickerRef.current = child;
          
          // Create canvas for ticker texture
          const canvas = document.createElement('canvas');
          canvas.width = 2048;
          canvas.height = 64;
          canvasRef.current = canvas;
          
          // Create texture
          const texture = new THREE.CanvasTexture(canvas);
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          textureRef.current = texture;
          
          // Apply texture to existing ticker
          child.material = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
          });
          
          console.log('Applied ticker texture to existing mesh');
        }
      });

      // Add the anchor group to the scene
      scene.add(anchorGroup);
      hasLoadedRef.current = true;

      // Notify parent that scene is loaded and ready
      if (onLoad) {
        onLoad();
      }
    });

    // Cleanup function
    return () => {
      isCurrentInstance = false;

      // Stop all animations
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }

      // Remove the scene and dispose of resources
      if (groupRef.current?.anchor) {
        groupRef.current.anchor.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) {
              child.geometry.dispose();
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });

        scene.remove(groupRef.current.anchor);
        groupRef.current = null;
      }

      if (sceneRef.current) {
        sceneRef.current = null;
      }

      hasLoadedRef.current = false;
    };
  }, [scene, loader, onLoad, position, rotation, scale, hover, rotate]);

  // Update ticker canvas
  const updateTickerCanvas = () => {
    if (!canvasRef.current || !textureRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ticker text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textBaseline = 'middle';
    
    // Calculate text width
    const textWidth = ctx.measureText(tickerText).width;
    
    // Draw text multiple times for seamless scrolling
    let x = 0;
    while (x < canvas.width + textWidth) {
      ctx.fillText(tickerText, x, canvas.height / 2);
      x += textWidth;
    }
    
    textureRef.current.needsUpdate = true;
  };

  useFrame((_, delta) => {
    // Update the animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (sceneRef.current && groupRef.current) {
      // Update ticker
      if (textureRef.current && tickerRef.current) {
        updateTickerCanvas();
        // Animate texture offset for scrolling
        textureRef.current.offset.x -= delta * 0.1;
        if (textureRef.current.offset.x < -1) {
          textureRef.current.offset.x += 1;
        }
      }
    }
  });

  return null;
}

export default CyborgTempleSceneSimple;