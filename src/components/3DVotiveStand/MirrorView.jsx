'use client';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default function SkullMirrorViewer() {
  const containerRef = useRef();

  useEffect(() => {
    const container = containerRef.current;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(1, 1, 3);

    const ambientLight = new THREE.AmbientLight(0xffffff, 4); // (color, intensity)
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 2, 1); // (color, intensity, distance)
pointLight.position.set(1, 1, 20); // adjust as needed
scene.add(pointLight);

// Optional: small helper to see the light position
const lightHelper = new THREE.PointLightHelper(pointLight, 0.1);
scene.add(lightHelper);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(renderer.domElement);

    // PMREM for environment lighting
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    // Load HDRI
    new RGBELoader()
      .load('/skulls.hdr', (hdrTexture) => {
        const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
        scene.environment = envMap;
        // scene.background = envMap;
        hdrTexture.dispose();
        pmremGenerator.dispose();
      });
      const gltfLoader = new GLTFLoader();

    // Load GLTF model
    gltfLoader.load('/speculum2.glb', (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
            if (child.isMesh && child.name.includes('Mirror')) {
                child.material = new THREE.MeshPhysicalMaterial({
                  metalness: 1,          // Keeps it reflective
                  roughness: 0.05,       // Adds soft blur (increase to 0.2–0.3 for more haze)
                  reflectivity: 0.8,     // High reflectivity, slightly under perfect
                  clearcoat: 0.5,          // Extra shiny layer (like car paint or glass)
                  clearcoatRoughness: 0.8, // Roughness on the clearcoat (adds the window-like haze)
                  envMapIntensity: 1.0,  // Reflection brightness from environment
                  transmission: 0        // Keep at 0 unless you want transparency
                });
              }
        });
        scene.add(model);
      });

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Animate
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  return <div ref={containerRef} style={{ width: '70%', height: '90vh', margin: '0 auto' }} />;
}