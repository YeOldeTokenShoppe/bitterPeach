import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ScrollingAnimation = () => {
  const mountRef = useRef(null);
  const [materialColor, setMaterialColor] = useState('#ffeded');
  
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    
    // Sizes
    const sizes = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    // Texture loader
    const textureLoader = new THREE.TextureLoader();
    
    // Create gradient texture programmatically since we can't load external files
    const canvas = document.createElement('canvas');
    canvas.width = 3;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, 3, 0);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.5, '#404040');
    gradient.addColorStop(1, '#ffffff');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 3, 1);
    
    const gradientTexture = new THREE.CanvasTexture(canvas);
    gradientTexture.magFilter = THREE.NearestFilter;

    // Material
    const material = new THREE.MeshToonMaterial({
      color: materialColor,
      gradientMap: gradientTexture
    });

    // Objects
    const objectsDistance = 4;
    const mesh1 = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.4, 16, 60),
      material
    );
    const mesh2 = new THREE.Mesh(
      new THREE.ConeGeometry(1, 2, 32),
      material
    );
    const mesh3 = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.8, 0.35, 100, 16),
      material
    );

    mesh1.position.x = 2;
    mesh2.position.x = -2;
    mesh3.position.x = 2;

    mesh1.position.y = -objectsDistance * 0;
    mesh2.position.y = -objectsDistance * 1;
    mesh3.position.y = -objectsDistance * 2;

    scene.add(mesh1, mesh2, mesh3);
    const sectionMeshes = [mesh1, mesh2, mesh3];

    // Lights
    const directionalLight = new THREE.DirectionalLight('#ffffff', 3);
    directionalLight.position.set(1, 1, 0);
    scene.add(directionalLight);

    // Particles
    const particlesCount = 200;
    const positions = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = objectsDistance * 0.5 - Math.random() * objectsDistance * sectionMeshes.length;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }

    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particlesMaterial = new THREE.PointsMaterial({
      color: materialColor,
      sizeAttenuation: true,
      size: 0.03
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Camera
    const cameraGroup = new THREE.Group();
    scene.add(cameraGroup);

    const camera = new THREE.PerspectiveCamera(35, sizes.width / sizes.height, 0.1, 100);
    camera.position.z = 6;
    cameraGroup.add(camera);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Scroll
    let scrollY = window.scrollY;
    let currentSection = 0;

    // Cursor
    const cursor = { x: 0, y: 0 };

    // Animation variables
    const clock = new THREE.Clock();
    let previousTime = 0;

    // Simple animation for section changes
    const animateSection = (mesh) => {
      const startRotation = {
        x: mesh.rotation.x,
        y: mesh.rotation.y,
        z: mesh.rotation.z
      };
      const targetRotation = {
        x: startRotation.x + 6,
        y: startRotation.y + 3,
        z: startRotation.z + 1.5
      };
      
      const startTime = Date.now();
      const duration = 1500;
      
      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 0.5 - Math.cos(progress * Math.PI) / 2; // easeInOutSine
        
        mesh.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * eased;
        mesh.rotation.y = startRotation.y + (targetRotation.y - startRotation.y) * eased;
        mesh.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * eased;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    };

    // Event handlers
    const handleResize = () => {
      sizes.width = window.innerWidth;
      sizes.height = window.innerHeight;

      camera.aspect = sizes.width / sizes.height;
      camera.updateProjectionMatrix();

      renderer.setSize(sizes.width, sizes.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    const handleScroll = () => {
      scrollY = window.scrollY;
      const newSection = Math.round(scrollY / sizes.height);

      if (newSection !== currentSection && newSection < sectionMeshes.length) {
        currentSection = newSection;
        animateSection(sectionMeshes[currentSection]);
      }
    };

    const handleMouseMove = (event) => {
      cursor.x = event.clientX / sizes.width - 0.5;
      cursor.y = event.clientY / sizes.height - 0.5;
    };

    // Animation loop
    const tick = () => {
      const elapsedTime = clock.getElapsedTime();
      const deltaTime = elapsedTime - previousTime;
      previousTime = elapsedTime;

      // Animate camera
      camera.position.y = -scrollY / sizes.height * objectsDistance;

      const parallaxX = cursor.x * 0.5;
      const parallaxY = -cursor.y * 0.5;
      cameraGroup.position.x += (parallaxX - cameraGroup.position.x) * 5 * deltaTime;
      cameraGroup.position.y += (parallaxY - cameraGroup.position.y) * 5 * deltaTime;

      // Animate meshes
      for (const mesh of sectionMeshes) {
        mesh.rotation.x += deltaTime * 0.1;
        mesh.rotation.y += deltaTime * 0.12;
      }

      // Render
      renderer.render(scene, camera);

      // Call tick again on the next frame
      requestAnimationFrame(tick);
    };

    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);

    // Start animation
    tick();

    // Update materials when color changes
    material.color.set(materialColor);
    particlesMaterial.color.set(materialColor);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
      particlesGeometry.dispose();
      material.dispose();
      particlesMaterial.dispose();
    };
  }, [materialColor]);

  return (
    <div className="relative">
      {/* Three.js Canvas */}
      <div ref={mountRef} className="fixed top-0 left-0 w-full h-full" />
      
      {/* Scrollable Content */}
      <div className="relative z-10">
        <section className="h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-800 mb-4">My Portfolio</h1>
            <p className="text-xl text-gray-600">Welcome to my creative space</p>
          </div>
        </section>
        
        <section className="h-screen flex items-center justify-center">
          <div className="text-center max-w-2xl mx-auto px-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">My Projects</h2>
            <p className="text-lg text-gray-600">
              I create amazing experiences with cutting-edge technologies.
              Each project is crafted with attention to detail and performance.
            </p>
          </div>
        </section>
        
        <section className="h-screen flex items-center justify-center">
          <div className="text-center max-w-2xl mx-auto px-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Contact Me</h2>
            <p className="text-lg text-gray-600 mb-6">
              Let&apos;s work together on your next project
            </p>
            <button className="px-8 py-3 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors">
              Get in Touch
            </button>
          </div>
        </section>
      </div>
      
      {/* Color Picker */}
      <div className="fixed top-4 right-4 z-20 bg-white p-4 rounded-lg shadow-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Material Color
        </label>
        <input
          type="color"
          value={materialColor}
          onChange={(e) => setMaterialColor(e.target.value)}
          className="w-20 h-10 rounded cursor-pointer"
        />
      </div>
    </div>
  );
};

export default ScrollingAnimation;