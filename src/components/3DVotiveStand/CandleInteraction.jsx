import React, { useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function FloatingCandleViewer({ isVisible, onClose, userData }) {
  if (!isVisible) return null;

  const handleClick = (e) => {
    // Prevent single clicks from propagating
    e.stopPropagation();
  };

  const handleDoubleClick = (e) => {
    // Close viewer on double click
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
      onDoubleClick={handleDoubleClick}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: "fixed", // Changed to fixed
          top: "20%",
          right: "30%",
          background: "white",
          border: "2px solid #333",
          borderRadius: "50%",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: "32px", // Increased font size
          fontWeight: "bold", // Made text bold
          color: "#000", // Changed to black
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
          zIndex: 9999, // Ensure it's always on top
          touchAction: "manipulation",
          transition: "all 0.2s ease",
          userSelect: "none", // Prevent text selection
          lineHeight: "1", // Better vertical centering
          padding: "0 0 4px 0", // Slight adjustment for the × symbol
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.background = "white";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
        }}
        aria-label="Close viewer"
      >
        ×
      </button>

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

        {/* Instructions overlay */}
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
            pointerEvents: "none",
            zIndex: 12,
            whiteSpace: "nowrap",
          }}
        >
          Use one finger to rotate • Two fingers to zoom • Double-click or tap ×
          to close
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
        <ambientLight intensity={0.8} />
        <pointLight position={[2, 2, 2]} intensity={0.5} />
        <pointLight position={[-2, 1, -2]} intensity={0.3} color="#ff7f50" />
        <pointLight position={[0, 3, 3]} intensity={0.3} color="#ffffff" />
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
