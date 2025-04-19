import React, { useEffect, useRef, useMemo } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

function HolographicStatue({ onLoad }) {
  const statueRef = useRef();
  const groupRef = useRef();
  const { scene } = useThree();
  const initialY = useRef(0);
  const mixerRef = useRef();
  const hasLoadedRef = useRef(false);

  // Use useMemo to prevent recreating the loader on every render
  const loader = useMemo(() => {
    const gltfLoader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("/draco/");
    gltfLoader.setDRACOLoader(dracoLoader);
    return gltfLoader;
  }, []);

  // Use useMemo to prevent recreating the shader material on every render
  const holographicMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        precision: "lowp",
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0x00ffff) },
        },
        vertexShader: `
      uniform float uTime;
      varying vec3 vPosition;
      varying vec3 vNormal;
  
      vec2 random2D(vec2 st) {
        st = vec2(dot(st, vec2(127.1, 311.7)),
                 dot(st, vec2(269.5, 183.3)));
        return -1.0 + 2.0 * fract(sin(st) * 43758.5453123);
      }

      void main() {
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);

        float glitchTime = uTime - modelPosition.y;
        float glitchStrength = sin(glitchTime) + sin(glitchTime * 3.45) + sin(glitchTime * 8.76) * 1.1;
        glitchStrength /= 3.0;
        glitchStrength = smoothstep(0.9, 1.0, glitchStrength);
        glitchStrength *= 0.1;
        modelPosition.x += (random2D(modelPosition.xz + uTime).x - 0.5) * glitchStrength;
        modelPosition.z += (random2D(modelPosition.zx + uTime).x - 0.5) * glitchStrength;

        gl_Position = projectionMatrix * viewMatrix * modelPosition;

        vec4 modelNormal = modelMatrix * vec4(normal, 0.0);
        vPosition = modelPosition.xyz;
        vNormal = modelNormal.xyz;
      }
    `,
        fragmentShader: `
      uniform vec3 uColor;
      uniform float uTime;
      varying vec3 vPosition;
      varying vec3 vNormal;

      void main() {
        vec3 normal = normalize(vNormal);
        if(!gl_FrontFacing)
            normal *= -1.0;

        float stripes = mod((vPosition.y - uTime * 0.02) * 20.0, 1.0);
        stripes = pow(stripes, 3.0);

        vec3 viewDirection = normalize(vPosition - cameraPosition);
        float fresnel = dot(viewDirection, normal) + 1.0;
        fresnel = pow(fresnel, 2.5);

        float falloff = smoothstep(0.8, 0.2, fresnel);

        float holographic = stripes * fresnel;
        holographic += fresnel * 2.25;
        holographic *= falloff;

        gl_FragColor = vec4(uColor, holographic);
      }
    `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: true,
        depthTest: true, // Disable depth testing
        side: THREE.FrontSide,
      }),
    []
  );

  const applyHolographicEffect = (model) => {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = holographicMaterial;
      }
    });
  };

  // const object3 = scene.getObjectByName("Object_3");

  // if (object3) {
  //   const worldPosition = new THREE.Vector3();
  //   object3.getWorldPosition(worldPosition);
  //   // console.log("World Position:", worldPosition);
  // }

  useEffect(() => {
    // Only load if we haven't already
    if (hasLoadedRef.current) return;

    let isCurrentInstance = true; // Flag to track if this effect instance is current

    loader.load("/CyberpunkMary.glb", (gltf) => {
      if (!isCurrentInstance) return; // Don't proceed if this effect is stale

      const statue = gltf.scene;

      // Create and store the animation mixer
      const mixer = new THREE.AnimationMixer(statue);
      mixerRef.current = mixer;

      // Find and play the HaloRotation animation
      const haloAnimation = gltf.animations.find(
        (anim) => anim.name === "HaloRotation"
      );
      if (haloAnimation) {
        const action = mixer.clipAction(haloAnimation);
        action.play();
      } else {
        console.warn("HaloRotation animation not found in the model");
      }

      // Create an anchor group with initial position
      const anchorGroup = new THREE.Group();
      const basePosition = [-0.3, 4.3, -.3];
      anchorGroup.position.set(...basePosition);
      initialY.current = basePosition[1];

      // Create a rotation group
      const rotationGroup = new THREE.Group();

      // Set up the hierarchy
      anchorGroup.add(rotationGroup);
      rotationGroup.add(statue);

      // Store refs
      statueRef.current = statue;
      groupRef.current = { anchor: anchorGroup, rotation: rotationGroup };

      // Apply your existing transformations
      statue.scale.set(18, 18, 18);
      statue.rotation.y = Math.PI / 180;

      // Center the statue in the rotation group
      const box = new THREE.Box3().setFromObject(statue);
      const center = box.getCenter(new THREE.Vector3());
      statue.position.sub(center);

      // Apply materials
      const goldHolographicMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0xffd700) },
        },
        vertexShader: holographicMaterial.vertexShader,
        fragmentShader: holographicMaterial.fragmentShader,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: true,
        depthTest: true,
        side: THREE.DoubleSide,
      });

      statue.traverse((child) => {
        if (child.isMesh) {
          const meshName = child.name.toLowerCase();

          if (
            meshName.includes("halotext1") ||
            meshName.includes("halotext2")
          ) {
            child.material = new THREE.MeshStandardMaterial({
              color: child.material.color,
              emissive: child.material.color,
              emissiveIntensity: 3.0,
              metalness: 0.8,
              roughness: 0.2,
              side: THREE.DoubleSide,
              transparent: true,
              depthWrite: true,
              depthTest: true,
            });
          } else {
            child.material = holographicMaterial;
          }
        }
      });

      // Add the anchor group to the scene
      scene.add(anchorGroup);
      hasLoadedRef.current = true;

      // Notify parent that statue is loaded and ready
      if (onLoad) {
        onLoad();
      }
    });

    // Cleanup function
    return () => {
      isCurrentInstance = false; // Mark this effect instance as stale

      // Stop all animations
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }

      // Remove the statue from scene and dispose of resources
      if (groupRef.current?.anchor) {
        // Traverse and dispose of all materials and geometries
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

        // Remove from scene
        scene.remove(groupRef.current.anchor);
        groupRef.current = null;
      }

      // Clear statue reference
      if (statueRef.current) {
        statueRef.current = null;
      }

      // Reset loaded flag
      hasLoadedRef.current = false;
    };
  }, [scene, holographicMaterial, loader, onLoad]);

  useFrame((state, delta) => {
    // Update the animation mixer
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }

    if (statueRef.current && groupRef.current) {
      // Apply hover animation to the anchor group
      groupRef.current.anchor.position.y =
        initialY.current + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

      // Apply rotation to the rotation group
      groupRef.current.rotation.rotation.y += delta * 0.2;

      // Keep your existing shader update logic
      statueRef.current.traverse((child) => {
        if (child.material?.uniforms?.uTime) {
          child.material.uniforms.uTime.value += delta;
        }
      });
    }
  });

  return null;
}

export default HolographicStatue;
