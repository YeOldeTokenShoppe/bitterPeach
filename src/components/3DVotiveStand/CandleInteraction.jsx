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

function SceneContent({ userData }) {
  const { scene, animations } = useGLTF("/singleCandleAnimatedFlame.glb");
  const candleRef = useRef();
  const controlsRef = useRef();
  const spotlightRef = useRef();
  const flamePointLightRef = useRef();
  const mixerRef = useRef(null);

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
    context.fillStyle = "#F5F5DC"; // Parchment color
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Save the context state
    context.save();

    // Rotate the text 180 degrees to make it readable on the candle
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(Math.PI);
    context.translate(-canvas.width / 2, -canvas.height / 2);

    // Set text properties
    context.fillStyle = "#000000";
    context.textAlign = "center";
    context.textBaseline = "middle";

    // Use a more reliable font stack
    const fontFamily = "serif";
    context.font = `bold 48px ${fontFamily}`;

    const formattedText = text.replace(
      "{userName}",
      userData.userName || "Friend"
    );

    const maxWidth = 800;
    const lineHeight = 60;
    const words = formattedText.split(" ");
    let lines = [];
    let currentLine = "";

    // Word wrapping
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

    // Draw text with shadow for better visibility
    const startY = (canvas.height - lines.length * lineHeight) / 2;
    lines.forEach((line, index) => {
      // Add shadow
      context.shadowColor = "rgba(0, 0, 0, 0.5)";
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;

      // Draw text
      context.fillText(line, canvas.width / 2, startY + index * lineHeight);

      // Reset shadow
      context.shadowColor = "transparent";
    });

    // Restore the context state
    context.restore();

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
      // Create a more personalized message
      const message =
        userData.message && userData.message.trim() !== ""
          ? userData.message
          : "may the light of Our Lady of Perpetual Profit illuminate the path to prosperity.";

      const dynamicText = `On behalf of {userName},\n\n${message}`;

      const texture = createDynamicTextTexture(dynamicText, userData);

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.5,
        emissiveMap: texture,
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

  // Add this function to update on each frame
  const onFrame = () => {
    if (candleRef.current && flamePointLightRef.current) {
      // Get the world position of the candle
      const box = new THREE.Box3().setFromObject(candleRef.current);
      const center = box.getCenter(new THREE.Vector3());

      // Position the light at the top of the candle
      flamePointLightRef.current.position.set(
        center.x,
        center.y + 1.8, // Adjust this value to position at flame height
        center.z
      );

      // Update animation mixer if it exists
      if (mixerRef.current) {
        mixerRef.current.update(0.016); // Update with approximately 60fps timing
      }
    }
  };

  useThree(({ gl }) => {
    gl.setAnimationLoop(() => {
      onFrame();
    });

    return () => {
      gl.setAnimationLoop(null);
    };
  });

  useEffect(() => {
    if (!candleRef.current) return;

    const box = new THREE.Box3().setFromObject(candleRef.current);
    const center = box.getCenter(new THREE.Vector3());

    // Position the spotlight to focus on the flame area
    if (spotlightRef.current) {
      spotlightRef.current.position.set(center.x, center.y + 3, center.z + 2);
      spotlightRef.current.target.position.set(
        center.x,
        center.y + 1.5,
        center.z
      );
      spotlightRef.current.target.updateMatrixWorld();
    }

    if (controlsRef.current) {
      controlsRef.current.target.set(center.x, center.y, center.z);
      controlsRef.current.update();
    }

    if (userData?.image) {
      applyUserImageToLabel(scene, userData.image);
    }

    applyDynamicTextToLabel(scene, userData);

    // Setup flame animation
    if (animations && animations.length > 0) {
      // Create animation mixer
      mixerRef.current = new THREE.AnimationMixer(scene);

      // Find and play the flame animation
      const flameAnimation = animations.find(
        (anim) => anim.name === "Animation"
      );
      if (flameAnimation) {
        const action = mixerRef.current.clipAction(flameAnimation);
        action.play();
      }
    }

    scene.traverse((child) => {
      if (child.name.startsWith("FLAME")) {
        const isDefaultCandle =
          userData?.userName === "Triumph" &&
          userData?.message === "In memory of triumph";
        child.visible = !isDefaultCandle;
      }
    });
  }, [scene, userData, animations]);

  return (
    <>
      <group ref={candleRef} scale={1.5}>
        <primitive object={scene} />
      </group>

      {/* Ambient light for overall scene illumination */}
      <ambientLight intensity={0.5} />

      {/* Spotlight for general candle illumination */}
      <spotLight
        ref={spotlightRef}
        intensity={1.5}
        angle={0.4}
        penumbra={0.5}
        distance={10}
        castShadow={false}
        color="#ffedd0"
      />

      {/* Point light that will always follow the flame area */}
      <pointLight
        ref={flamePointLightRef}
        intensity={2.0}
        distance={3}
        color="#ff9c5e"
        decay={2}
      />

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

useGLTF.preload("/singleCandleAnimatedFlame.glb");

export default FloatingCandleViewer;
