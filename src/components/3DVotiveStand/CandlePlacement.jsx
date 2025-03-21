import React, { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

export function CandlePlacement({ isPlacementMode, onPlaceCandle, modelRef }) {
  const { scene, camera } = useThree();
  const { scene: candleScene } = useGLTF("/XCandle1.glb");
  const previewRef = useRef();
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!isPlacementMode || !modelRef.current) return;

    // Create preview candle
    const candlePreview = candleScene.clone();
    candlePreview.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
    candlePreview.traverse((child) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.transparent = true;
        child.material.opacity = 0.5;
      }
    });
    previewRef.current = candlePreview;
    candlePreview.visible = false;
    scene.add(candlePreview);

    const handleMouseMove = (event) => {
      const canvas = event.currentTarget;
      const rect = canvas.getBoundingClientRect();

      mouse.current.x =
        ((event.clientX - rect.left) / canvas.clientWidth) * 2 - 1;
      mouse.current.y =
        -((event.clientY - rect.top) / canvas.clientHeight) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, camera);

      // Find Floor2 object
      let floor2;
      modelRef.current.traverse((child) => {
        if (child.isMesh && child.name === "Floor2") {
          floor2 = child;
        }
      });

      if (floor2) {
        const intersects = raycaster.current.intersectObject(floor2, false);
        if (intersects.length > 0) {
          const point = intersects[0].point;
          candlePreview.position.copy(point);
          candlePreview.rotation.y = Math.random() * Math.PI * 2;
          candlePreview.visible = true;
        } else {
          candlePreview.visible = false;
        }
      }
    };

    const handleClick = (event) => {
      if (!candlePreview.visible) return;

      event.stopPropagation();
      event.preventDefault();

      if (onPlaceCandle) {
        onPlaceCandle({
          position: candlePreview.position.clone(),
          rotation: candlePreview.rotation.clone(),
        });
      }
    };

    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("click", handleClick);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("mousemove", handleMouseMove);
        canvas.removeEventListener("click", handleClick);
      }
      if (candlePreview) {
        scene.remove(candlePreview);
      }
    };
  }, [isPlacementMode, camera, scene, modelRef, candleScene, onPlaceCandle]);

  return null;
}
