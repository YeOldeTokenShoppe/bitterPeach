import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import * as CANNON from "cannon-es";

const PhysicsMoons = ({ scene, camera }) => {
  const moonPhysicsRef = useRef({
    world: null,
    moons: [],
    meshes: [],
  });

  useEffect(() => {
    // Initialize physics world
    const world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    moonPhysicsRef.current.world = world;

    // Create moon materials
    const moonMaterial = new THREE.MeshPhongMaterial({
      color: "#faf0e6",
      // You'll need to load the lunar texture separately
      // map: lunarTexture,
      // lightMap: lunarTexture,
      lightMapIntensity: 3,
    });

    const moonPhysMaterial = new CANNON.Material("moon");

    // Create multiple moons
    for (let i = 0; i < 5; i++) {
      const radius = 2;

      // Three.js mesh
      const moonGeometry = new THREE.SphereGeometry(radius, 30, 30);
      const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial.clone());

      // Add lighting effect
      const moonLight = new THREE.PointLight("#faf0e6", 40, 10);
      moonLight.castShadow = true;
      moonLight.shadow.bias = -0.01;
      moonMesh.add(moonLight);

      // Add glow effects
      const glowMaterial1 = new THREE.MeshLambertMaterial({
        color: "white",
        transparent: true,
        opacity: 0.3,
      });

      const glowMaterial2 = new THREE.MeshBasicMaterial({
        color: "white",
        transparent: true,
        opacity: 0.05,
      });

      const glow1 = new THREE.Mesh(moonGeometry, glowMaterial1);
      const glow2 = new THREE.Mesh(moonGeometry, glowMaterial2);

      glow1.scale.set(1.02, 1.02, 1.02);
      glow2.scale.set(1.05, 1.05, 1.05);

      moonMesh.add(glow1);
      moonMesh.add(glow2);

      // Random position
      const x = THREE.MathUtils.randInt(-20, 20);
      const y = THREE.MathUtils.randFloat(7.5, 20);
      const z = THREE.MathUtils.randInt(-20, 13);

      moonMesh.position.set(x, y, z);
      scene.add(moonMesh);

      // Cannon.js body
      const moonBody = new CANNON.Body({
        mass: 0.5,
        material: moonPhysMaterial,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3(x, y, z),
        linearDamping: 0.1,
      });

      world.addBody(moonBody);

      moonPhysicsRef.current.moons.push(moonBody);
      moonPhysicsRef.current.meshes.push(moonMesh);
    }

    // Create ground plane
    const groundPhysMaterial = new CANNON.Material("ground");
    const groundBody = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: groundPhysMaterial,
      position: new CANNON.Vec3(0, 0, 0),
    });
    groundBody.quaternion.setFromAxisAngle(
      new CANNON.Vec3(1, 0, 0),
      -Math.PI / 2
    );
    world.addBody(groundBody);

    // Contact behavior
    const contactMaterial = new CANNON.ContactMaterial(
      moonPhysMaterial,
      groundPhysMaterial,
      {
        restitution: 0.7,
        friction: 0.5,
      }
    );
    world.addContactMaterial(contactMaterial);

    // Click handler for throwing new moons
    const raycaster = new THREE.Raycaster();
    const clickPosition = new THREE.Vector2();

    const handleClick = (event) => {
      clickPosition.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      raycaster.setFromCamera(clickPosition, camera);
      const direction = raycaster.ray.direction;

      // Create new moon at click
      const radius = 0.8;
      const moonGeometry = new THREE.SphereGeometry(radius, 20, 20);
      const moonMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(Math.random(), 1, 0.6),
      });

      const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
      moonMesh.position.copy(raycaster.ray.origin);
      scene.add(moonMesh);

      const moonBody = new CANNON.Body({
        mass: 1,
        shape: new CANNON.Sphere(radius),
        position: new CANNON.Vec3().copy(moonMesh.position),
        material: moonPhysMaterial,
      });

      const throwVelocity = 35;
      moonBody.velocity.set(
        direction.x * throwVelocity,
        direction.y * throwVelocity,
        direction.z * throwVelocity
      );

      world.addBody(moonBody);
      moonPhysicsRef.current.moons.push(moonBody);
      moonPhysicsRef.current.meshes.push(moonMesh);
    };

    window.addEventListener("pointerdown", handleClick);

    // Animation loop
    const animate = () => {
      const { world, moons, meshes } = moonPhysicsRef.current;

      world.step(1 / 60);

      // Update mesh positions
      for (let i = 0; i < moons.length; i++) {
        meshes[i].position.copy(moons[i].position);
        meshes[i].quaternion.copy(moons[i].quaternion);
      }
    };

    // Add animate to your existing animation loop
    const unsubscribeAnimate = subscribeToAnimationLoop(animate);

    // Cleanup
    return () => {
      window.removeEventListener("pointerdown", handleClick);
      unsubscribeAnimate();

      // Remove meshes from scene
      moonPhysicsRef.current.meshes.forEach((mesh) => {
        scene.remove(mesh);
      });

      moonPhysicsRef.current = {
        world: null,
        moons: [],
        meshes: [],
      };
    };
  }, [scene, camera]);

  return null;
};

export default PhysicsMoons;

// Helper function - implement this based on your animation system
function subscribeToAnimationLoop(callback) {
  // If using React Three Fiber:
  // useFrame(callback)

  // If using vanilla Three.js animation loop:
  // Add callback to your requestAnimationFrame loop

  // Return cleanup function
  return () => {
    // Remove callback from animation system
  };
}
