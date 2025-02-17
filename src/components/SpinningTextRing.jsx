import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader";
import { TextureLoader } from "three";

const SpinningTextRing = ({
  textArray,
  radius = 3,
  color = 0xff4a4a,
  tiltAngleX = Math.PI / -0.9, // Tilt around the X-axis
  tiltAngleZ = 0,
  canvasWidth = 300,
  canvasHeight = 300,
  reverseRotation = false,
}) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasWidth / canvasHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); // Transparent background
    renderer.setSize(canvasWidth, canvasHeight);
    mountRef.current.appendChild(renderer.domElement);

    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const fontLoader = new FontLoader();
    const textureLoader = new TextureLoader();

    fontLoader.load(
      "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
      function (font) {
        textArray.forEach((letter, index) => {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          canvas.width = 256;
          canvas.height = 256;
          context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
          context.font = "bold 128px Arial";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(letter, 128, 128);

          const texture = new THREE.CanvasTexture(canvas);
          const textMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(textMaterial);

          const angle = (index / textArray.length) * Math.PI * 2;
          sprite.position.set(
            radius * Math.cos(angle),
            0,
            radius * Math.sin(angle)
          );
          sprite.scale.set(1.5, 1.5, 1.5);
          ringGroup.add(sprite);
        });

        ringGroup.rotation.x = tiltAngleX; // Apply X-axis tilt
        ringGroup.rotation.z = tiltAngleZ; // Ap
      }
    );

    camera.position.z = 10;

    const animate = () => {
      requestAnimationFrame(animate);

      if (reverseRotation) {
        ringGroup.rotation.y -= 0.01;
      } else {
        ringGroup.rotation.y += 0.01;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [
    textArray,
    radius,
    color,
    tiltAngleX,
    tiltAngleZ,
    canvasWidth,
    canvasHeight,
    reverseRotation,
  ]);

  return (
    <div
      ref={mountRef}
      style={{
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        position: "absolute",
        top: "0",
        left: "0",
        pointerEvents: "none",
      }}
    />
  );
};

export default SpinningTextRing;
