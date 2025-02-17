import React, { useRef, useEffect, useState, Suspense } from "react";

import { useFrame, Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { initializeScreenManagement } from "./modelUtilities";
import Scene from "../3dChandelier2";

function RoomWalls({ db }) {
  const doorRef = useRef();
  const shelfRef = useRef();
  const portalMaterial = useRef();
  const modelRef = useRef();
  const [isVisible, setIsVisible] = useState(true);
  const sizeScale = 4;
  const roomSize = 20 * sizeScale;
  const wallHeight = 8 * sizeScale;
  const frameWidth = 5 * sizeScale;
  const frameHeight = 7 * sizeScale;
  const heightOffset = 9 * sizeScale;

  const offsets = {
    back: { x: -5 * sizeScale, y: 1 * sizeScale },
    left: { x: 2 * sizeScale, y: 2 * sizeScale },
    right: { x: -1 * sizeScale, y: 1 * sizeScale },
  };

  const portal = useGLTF("/portal4.glb");
  const wallShelf = useGLTF("/eightMonitors.glb");

  useEffect(() => {
    if (wallShelf.scene) {
      const clonedScene = wallShelf.scene.clone();
      modelRef.current = clonedScene;

      const cleanup = initializeScreenManagement({
        modelRef: modelRef,
        db: db,
      });

      return () => {
        if (cleanup) {
          cleanup();
        }
        if (modelRef.current) {
          modelRef.current.traverse((child) => {
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
          });
        }
      };
    }
  }, [wallShelf.scene, db]);

  useFrame((state, delta) => {
    if (portalMaterial.current?.uniforms?.uTime) {
      portalMaterial.current.uniforms.uTime.value += delta;
    }
  });

  return (
    <group position={[0, heightOffset, 0]}>
      {/* Portal/Door */}
      <group renderOrder={2}>
        {/* Back wall */}
        <mesh
          position={[
            offsets.back.x,
            wallHeight / 2 + offsets.back.y + 2,
            -roomSize / 2 + 0.1,
          ]}
          // rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[frameWidth, frameHeight]} />
          {/* <meshBasicMaterial
            map={new THREE.TextureLoader().load("/sgframed.png")}
            transparent
            side={THREE.DoubleSide}
            depthTest={true}
            depthWrite={true}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          /> */}
          <group ref={shelfRef}>
            {/* Use the modelRef for the wallShelf */}
            {/* <primitive
              object={modelRef.current || wallShelf.scene}
              scale={[25, 25, 25]}
              position={[
                -roomSize / 2 + 12,
                wallHeight / 2 + offsets.left.y + 4,
                -8.2,
              ]}
              rotation={[-Math.PI, 0, 0]}
            /> */}

            {/* Use Scene as a child component */}
          </group>
        </mesh>

        {/* Left wall */}
        <mesh
          position={[
            -roomSize / 2 + 0.5,
            wallHeight / 2 + offsets.left.y + 0.5,
            offsets.left.x + 0.5,
          ]}
          rotation={[0, Math.PI / 2, 0]}
          renderOrder={1}
        >
          {/* <group position={[18, 5, 20]} scale={8} rotation={[0, 0, 0]}>
            <Scene />
          </group> */}
          <planeGeometry args={[frameWidth, frameHeight]} />
          {/* <meshBasicMaterial
            map={new THREE.TextureLoader().load("/sgframed2.png")}
            transparent
            side={THREE.DoubleSide}
            depthTest={true}
            depthWrite={true}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          /> */}
        </mesh>

        {/* Right wall */}
        <mesh
          position={[
            roomSize / 2,
            wallHeight / 2 + offsets.left.y,
            offsets.right.x,
          ]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <planeGeometry args={[frameWidth, frameHeight]} />
          <meshBasicMaterial
            map={new THREE.TextureLoader().load("/sgframed3.png")}
            transparent
            side={THREE.DoubleSide}
            depthTest={true}
            depthWrite={true}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
          />
        </mesh>
      </group>
    </group>
  );
}
export default RoomWalls;
