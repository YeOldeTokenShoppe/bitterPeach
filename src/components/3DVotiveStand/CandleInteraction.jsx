import React, { useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function FloatingCandleViewer({ isVisible, onClose, userData }) {
  if (!isVisible) return null;

  const handleClick = (e) => {
    // Close viewer when clicking outside the canvas area
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
      }}
      onClick={handleClick}
    >
      {/* The top close button has been removed */}

      {/* Canvas container */}
      <div
        style={{
          width: "60vw",
          height: "80vh",
          borderRadius: "10px",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Canvas
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "10px",
          }}
          gl={{ alpha: true }}
          camera={{ position: [0, 1, 5], fov: 45 }}
        >
          <SceneContent userData={userData} />
        </Canvas>

        {/* Instructions overlay with close button */}
        <div
          style={{
            position: "absolute",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255, 255, 255, 0.2)",
            padding: "10px 20px",
            borderRadius: "20px",
            fontSize: "14px",
            pointerEvents: "auto",
            zIndex: 12,
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "15px",
          }}
        >
          <span>Use one finger to rotate • Two fingers to zoom</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              background: "rgba(255, 255, 255, 0.7)",
              border: "1px solid rgba(0, 0, 0, 0.3)",
              borderRadius: "15px",
              padding: "5px 12px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
              color: "#333",
              transition: "all 0.2s ease",
              userSelect: "none",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.7)";
              e.currentTarget.style.transform = "scale(1)";
            }}
            aria-label="Close viewer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
// Rest of the SceneContent component remains the same...

function SceneContent({ userData }) {
  const { scene } = useGLTF("/singleCandle.glb");
  const candleRef = useRef();
  const controlsRef = useRef();

  const applyUserImageToLabel = (scene, imageUrl) => {
    if (!scene || !imageUrl) return;

    let labelMesh = null;
    scene.traverse((child) => {
      if (child.name.includes("Label2")) {
        labelMesh = child;
        console.log("Found Label2 mesh:", child.name);
      }
    });

    if (labelMesh) {
      const textureLoader = new THREE.TextureLoader();

      textureLoader.load(
        imageUrl,
        (texture) => {
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
            emissive: new THREE.Color(0xffffff),
            emissiveIntensity: 0.5,
            emissiveMap: texture,
            metalness: 0.3,
            roughness: 0.2,
          });

          texture.encoding = THREE.sRGBEncoding;
          texture.flipY = false;
          texture.needsUpdate = true;

          if (labelMesh.material) {
            if (labelMesh.material.map) {
              labelMesh.material.map.dispose();
            }
            labelMesh.material.dispose();
          }

          labelMesh.material = material;
          labelMesh.material.needsUpdate = true;
        },
        undefined,
        (error) => console.error("Error loading texture:", error)
      );
    }
  };

  const createDynamicTextTexture = (text, userData) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");

    // Clear canvas and set background
    context.fillStyle = "#F5F5DC";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();

    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(Math.PI);
    context.translate(-canvas.width / 2, -canvas.height / 2);

    context.fillStyle = "#000000";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.font = "bold 32px UnifrakturCook";

    const formattedText = text.replace(
      "{userName}",
      userData.userName || "Friend"
    );

    const maxWidth = 400;
    const lineHeight = 40;
    const words = formattedText.split(" ");
    let lines = [];
    let currentLine = "";

    context.font = "32px UnifrakturCook";

    words.forEach((word) => {
      const testLine = currentLine + word + " ";
      const metrics = context.measureText(testLine);

      if (metrics.width > maxWidth) {
        lines.push(currentLine);
        currentLine = word + " ";
      } else {
        currentLine = testLine;
      }
    });
    lines.push(currentLine);

    const startY = (canvas.height - lines.length * lineHeight) / 2;
    lines.forEach((line, index) => {
      context.strokeStyle = "#000000";
      context.lineWidth = 2;
      context.strokeText(line, canvas.width / 2, startY + index * lineHeight);
      context.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  };

  const applyDynamicTextToLabel = (scene, userData) => {
    if (!scene || !userData) return;

    let labelMesh = null;
    scene.traverse((child) => {
      if (child.name.includes("Label1")) {
        labelMesh = child;
        console.log("Found Label1 mesh:", child.name);
      }
    });

    if (labelMesh) {
      const dynamicText = `On behalf of {userName},\n\nmay the light of Our Lady of Perepetual Profit illuminate the path to prosperity.`;

      const texture = createDynamicTextTexture(dynamicText, userData);

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.8,
      });

      if (labelMesh.material) {
        if (labelMesh.material.map) {
          labelMesh.material.map.dispose();
        }
        labelMesh.material.dispose();
      }

      labelMesh.material = material;
      labelMesh.material.needsUpdate = true;
    }
  };

  useEffect(() => {
    if (!candleRef.current) return;

    const box = new THREE.Box3().setFromObject(candleRef.current);
    const center = box.getCenter(new THREE.Vector3());

    if (controlsRef.current) {
      controlsRef.current.target.set(center.x, center.y, center.z);
      controlsRef.current.update();
    }

    if (userData?.image) {
      applyUserImageToLabel(scene, userData.image);
    }

    applyDynamicTextToLabel(scene, userData);

    scene.traverse((child) => {
      if (child.name.startsWith("FLAME")) {
        const isDefaultCandle =
          userData?.userName === "Triumph" &&
          userData?.message === "In memory of triumph";
        child.visible = !isDefaultCandle;
      }
    });
  }, [scene, userData]);

  return (
    <>
      <group ref={candleRef} scale={1.5}>
        <primitive object={scene} />
      </group>
      <OrbitControls
        ref={controlsRef}
        enableZoom={true}
        enablePan={false}
        minDistance={2}
        maxDistance={10}
        touchAction="none"
      />
    </>
  );
}

useGLTF.preload("/singleCandle.glb");

export default FloatingCandleViewer;
