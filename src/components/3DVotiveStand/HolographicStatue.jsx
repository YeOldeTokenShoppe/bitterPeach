import React, { useEffect, useRef } from "react";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

function HolographicStatue() {
  const statueRef = useRef();
  const groupRef = useRef();
  const { scene } = useThree();
  const loader = new GLTFLoader();
  const initialY = useRef(0);

  const holographicMaterial = new THREE.ShaderMaterial({
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
        float glitchStrength = sin(glitchTime) + sin(glitchTime * 3.45) + sin(glitchTime * 8.76);
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
    depthWrite: false,
    depthTest: false, // Disable depth testing
    side: THREE.FrontSide,
  });

  const applyHolographicEffect = (model) => {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = holographicMaterial;
      }
    });
  };

  const object3 = scene.getObjectByName("Object_3");

  if (object3) {
    const worldPosition = new THREE.Vector3();
    object3.getWorldPosition(worldPosition);
    console.log("World Position:", worldPosition);
  }

  useEffect(() => {
    loader.load("/statue3.glb", (gltf) => {
      const statue = gltf.scene;

      // Create an anchor group with initial position
      const anchorGroup = new THREE.Group();
      const basePosition = [-6.35, 13.6, 12.8]; // Store base position
      anchorGroup.position.set(...basePosition);
      initialY.current = basePosition[1]; // Set initialY to match the base y-position
      // Create a rotation group
      const rotationGroup = new THREE.Group();

      // Set up the hierarchy
      anchorGroup.add(rotationGroup);
      rotationGroup.add(statue);

      // Store refs
      statueRef.current = statue;
      groupRef.current = { anchor: anchorGroup, rotation: rotationGroup };

      // Apply your existing transformations
      statue.scale.set(0.3, 0.3, 0.3);
      statue.rotation.y = Math.PI / 180;

      // Center the statue in the rotation group
      const box = new THREE.Box3().setFromObject(statue);
      const center = box.getCenter(new THREE.Vector3());
      statue.position.sub(center);

      // Your existing material application code
      const goldHolographicMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(0xffd700) },
        },
        vertexShader: holographicMaterial.vertexShader,
        fragmentShader: holographicMaterial.fragmentShader,
        transparent: true,
        blending: THREE.NormalBlending, // 🟢 Try Normal Blending instead of Additive
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
      });

      statue.traverse((child) => {
        if (child.isMesh) {
          if (
            child.material &&
            child.material.name.toLowerCase().includes("Halo")
          ) {
            console.log("Applying gold holographic to:", child.material.name);
            child.material = goldHolographicMaterial; // Apply gold shader to halo
            child.material.uniforms.uColor.value.set(0xffd700); // Manually force the gold color
          } else {
            child.material = holographicMaterial; // Apply blue holographic to everything else
          }
        }
      });

      // Add the anchor group to the scene instead of the statue directly
      scene.add(anchorGroup);
    });

    return () => {
      if (groupRef.current?.anchor) {
        scene.remove(groupRef.current.anchor);
      }
    };
  }, [scene]);

  useFrame((state, delta) => {
    if (statueRef.current && groupRef.current) {
      // Apply hover animation to the anchor group
      groupRef.current.anchor.position.y =
        initialY.current + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;

      // Apply rotation to the rotation group
      groupRef.current.rotation.rotation.y += delta * 0.1;

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
