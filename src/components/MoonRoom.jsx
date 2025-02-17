import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import Ammo from "ammo.js";
import styles from "./MoonRoom.module.css";

const MoonLamps = ({
  scene,
  physicsWorld,
  lunarTexture,
  envMap,
  addPhysicsMesh,
}) => {
  const moonPositions = [
    { x: 0, y: 10, z: 0 },
    { x: -5, y: 7, z: -3 },
    { x: 7, y: 12, z: 5 },
    { x: -10, y: 8, z: 10 },
    { x: 10, y: 15, z: -10 },
  ];

  useEffect(() => {
    if (!physicsWorld) return; // Wait until physicsWorld is ready

    moonPositions.forEach((pos) => {
      const geometry = new THREE.SphereGeometry(2, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        map: lunarTexture,
        envMap: envMap,
        shininess: 50,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.castShadow = true;

      // Add physics
      const shape = new Ammo.btSphereShape(2);
      addPhysicsMesh(mesh, shape, 1, physicsWorld);

      // Add to scene
      scene.add(mesh);
    });
  }, [scene, physicsWorld, lunarTexture, envMap, addPhysicsMesh]);

  return null;
};

const Floor = ({ scene, physicsWorld, addPhysicsMesh }) => {
  useEffect(() => {
    if (!physicsWorld) return; // Wait until physicsWorld is ready

    const geometry = new THREE.BoxGeometry(50, 1, 50);
    const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
    const floor = new THREE.Mesh(geometry, material);
    floor.receiveShadow = true;
    floor.position.set(0, -0.5, 0);

    const shape = new Ammo.btBoxShape(new Ammo.btVector3(25, 0.5, 25));
    addPhysicsMesh(floor, shape, 0, physicsWorld);

    scene.add(floor);
  }, [scene, physicsWorld, addPhysicsMesh]);

  return null;
};

const ArmChair = ({ scene }) => {
  const { scene: chairScene } = useGLTF("/ArmChair.glb");
  useEffect(() => {
    chairScene.scale.set(10, 10, 10);
    scene.add(chairScene);
  }, [scene, chairScene]);

  return null;
};

const PhysicsUpdater = ({ physicsWorld, rigidBodies, tmpTrans }) => {
  useFrame(() => {
    if (!physicsWorld) return; // Wait until physicsWorld is ready

    const deltaTime = 1 / 60;

    // Step the physics simulation
    physicsWorld.stepSimulation(deltaTime, 10);

    // Update physics objects
    rigidBodies.current.forEach((body) => {
      const objAmmo = body.userData.physicsBody;
      const ms = objAmmo.getMotionState();
      if (ms) {
        ms.getWorldTransform(tmpTrans.current);
        const p = tmpTrans.current.getOrigin();
        const q = tmpTrans.current.getRotation();
        body.position.set(p.x(), p.y(), p.z());
        body.quaternion.set(q.x(), q.y(), q.z(), q.w());
      }
    });
  });

  return null;
};

const MoonRoom = () => {
  const [physicsWorld, setPhysicsWorld] = useState(null);
  const rigidBodies = useRef([]);
  const tmpTrans = useRef(new Ammo.btTransform());
  const sceneRef = useRef(new THREE.Scene());

  const addPhysicsMesh = (mesh, shape, mass, physicsWorld) => {
    const transform = new Ammo.btTransform();
    transform.setIdentity();

    const position = mesh.position;
    transform.setOrigin(new Ammo.btVector3(position.x, position.y, position.z));

    const quaternion = mesh.quaternion;
    transform.setRotation(
      new Ammo.btQuaternion(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      )
    );

    const motionState = new Ammo.btDefaultMotionState(transform);
    const localInertia = new Ammo.btVector3(0, 0, 0);
    shape.calculateLocalInertia(mass, localInertia);

    const rbInfo = new Ammo.btRigidBodyConstructionInfo(
      mass,
      motionState,
      shape,
      localInertia
    );
    const body = new Ammo.btRigidBody(rbInfo);

    physicsWorld.addRigidBody(body); // Ensure physicsWorld is defined here
    rigidBodies.current.push(mesh);
    mesh.userData.physicsBody = body;
  };

  useEffect(() => {
    const setupPhysicsWorld = async () => {
      const collisionConfig = new Ammo.btDefaultCollisionConfiguration();
      const dispatcher = new Ammo.btCollisionDispatcher(collisionConfig);
      const broadphase = new Ammo.btDbvtBroadphase();
      const solver = new Ammo.btSequentialImpulseConstraintSolver();
      const world = new Ammo.btDiscreteDynamicsWorld(
        dispatcher,
        broadphase,
        solver,
        collisionConfig
      );
      world.setGravity(new Ammo.btVector3(0, -10, 0));
      setPhysicsWorld(world); // Set physicsWorld after initialization
    };

    setupPhysicsWorld();

    return () => {
      if (physicsWorld) Ammo.destroy(physicsWorld);
    };
  }, []);

  if (!physicsWorld) return null; // Wait for physicsWorld initialization

  return (
    <div className={styles.moonRoom}>
      <Canvas shadows>
        <ambientLight intensity={0.5} />
        <OrbitControls enableDamping maxPolarAngle={(Math.PI / 2) * 0.9} />
        <PhysicsUpdater
          physicsWorld={physicsWorld}
          rigidBodies={rigidBodies}
          tmpTrans={tmpTrans}
        />
        <MoonLamps
          scene={sceneRef.current}
          physicsWorld={physicsWorld}
          addPhysicsMesh={addPhysicsMesh}
          lunarTexture={new THREE.TextureLoader().load("/textures/lunar.jpg")}
          envMap={new THREE.CubeTextureLoader()
            .setPath("/textures/env/")
            .load(["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"])}
        />
        <Floor
          scene={sceneRef.current}
          physicsWorld={physicsWorld}
          addPhysicsMesh={addPhysicsMesh}
        />
        <ArmChair scene={sceneRef.current} />
      </Canvas>
    </div>
  );
};

export default MoonRoom;
