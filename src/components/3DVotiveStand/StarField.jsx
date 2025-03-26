import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";

// Create stars distributed on a sphere far from the camera
const getRandomParticlePos = (particleCount, radius = 200) => {
  const arr = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount * 3; i += 3) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius;

    arr[i] = r * Math.sin(phi) * Math.cos(theta); // x
    arr[i + 1] = r * Math.sin(phi) * Math.sin(theta); // y
    arr[i + 2] = r * Math.cos(phi); // z
  }
  return arr;
};

const StarField = ({ count1 = 350, count2 = 1500, is80sMode = false }) => {
  const starsGroup = useRef();
  const smallStars = useRef();
  const largeStars = useRef();
  const { camera, scene, gl } = useThree();

  // Load the star textures
  const textures = useTexture({
    star1: "https://raw.githubusercontent.com/Kuntal-Das/textures/main/sp1.png",
    star2: "https://raw.githubusercontent.com/Kuntal-Das/textures/main/sp2.png",
  });

  // Create the geometry on component mount
  const [geometry1] = useState(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(getRandomParticlePos(count1), 3)
    );
    return geo;
  });

  const [geometry2] = useState(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(getRandomParticlePos(count2, 220), 3)
    );
    return geo;
  });

  // Define materials with star texture
  const starMaterial1 = useRef(
    new THREE.PointsMaterial({
      size: 0.4,
      map: textures.star1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      color: is80sMode ? new THREE.Color(0x88ccff) : new THREE.Color(0xffffff),
      depthWrite: false, // Don't write to depth buffer
      depthTest: true, // But do test against it
      blending: THREE.AdditiveBlending, // Makes stars glow
    })
  );

  const starMaterial2 = useRef(
    new THREE.PointsMaterial({
      size: 0.6,
      map: textures.star2,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      color: is80sMode ? new THREE.Color(0xff88ff) : new THREE.Color(0xffffff),
      depthWrite: false, // Don't write to depth buffer
      depthTest: true, // But do test against it
      blending: THREE.AdditiveBlending, // Makes stars glow
    })
  );

  // Update star colors when 80s mode changes
  useEffect(() => {
    starMaterial1.current.color.set(is80sMode ? 0x88ccff : 0xffffff);
    starMaterial2.current.color.set(is80sMode ? 0xff88ff : 0xffffff);
  }, [is80sMode]);

  // CRITICAL FIX: Set up a separate rendering pass for stars
  useEffect(() => {
    if (!gl || !scene || !camera) return;

    // Important: Move stars to a separate scene layer for depth handling
    const originalOnBeforeRender = gl.onBeforeRender;

    // Modify the scene's onBeforeRender
    gl.onBeforeRender = () => {
      if (originalOnBeforeRender) originalOnBeforeRender();

      // Make all other objects temporarily invisible
      const originalVisibility = new Map();
      scene.traverse((obj) => {
        if (
          obj.isMesh &&
          obj !== smallStars.current &&
          obj !== largeStars.current &&
          !obj.parent?.uuid === starsGroup.current?.uuid
        ) {
          originalVisibility.set(obj.uuid, obj.visible);

          // Force all objects to have proper depth settings
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((mat) => {
                if (mat.transparent && mat.opacity < 0.1) {
                  mat.depthWrite = false;
                } else {
                  mat.depthWrite = true;
                }
              });
            } else {
              if (obj.material.transparent && obj.material.opacity < 0.1) {
                obj.material.depthWrite = false;
              } else {
                obj.material.depthWrite = true;
              }
            }
          }
        }
      });
    };

    return () => {
      gl.onBeforeRender = originalOnBeforeRender;
    };
  }, [gl, scene, camera]);

  // Move stars with camera
  useFrame(() => {
    if (starsGroup.current) {
      // Position stars far behind camera
      starsGroup.current.position.copy(camera.position);

      // Add subtle rotation for twinkling effect
      smallStars.current.rotation.y += 0.0001;
      largeStars.current.rotation.y -= 0.00005;
    }
  });

  return (
    <group ref={starsGroup}>
      <points
        ref={smallStars}
        geometry={geometry1}
        material={starMaterial1.current}
        frustumCulled={false}
      />
      <points
        ref={largeStars}
        geometry={geometry2}
        material={starMaterial2.current}
        frustumCulled={false}
      />
    </group>
  );
};

export default StarField;
