import React, { useEffect, useState, useRef, Suspense } from "react";
import { useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { useFirestoreResults } from "../../utilities/useFirestoreResults";
import DarkClouds from "./Clouds";
import FloatingCandleViewer from "./CandleInteraction";

function Model({
  scale,
  modelRef,
  rotation,
  showFloatingViewer,
  setShowFloatingViewer,
  onCandleSelect,
  setModelCenter,
}) {
  const gltf = useGLTF("/altar80s.glb");
  const { camera, scene } = useThree();
  const results = useFirestoreResults();
  const hemiLightRef = useRef();
  const ambientLightRef = useRef();
  const boundingBoxRef = useRef(new THREE.Box3());
  const textureLoader = useRef(new THREE.TextureLoader());

  const [selectedCandleData, setSelectedCandleData] = useState(null);

  /** 🛑 Prevent unnecessary re-renders by storing previous results */
  const prevResultsRef = useRef([]);

  const findCandleComponent = (parent, type) => {
    const candleNumber = parent.name.slice(-3);

    switch (type) {
      case "FLAME":
        // Look for any FLAME in children (since it has different numbering)
        return parent.children.find((child) => child.name.startsWith("FLAME"));

      case "TooltipPlane":
        // Look for TooltipPlane with matching candle number
        return parent.children.find(
          (child) => child.name === `TooltipPlane${candleNumber}`
        );

      case "wax":
        // Find shared wax mesh
        return parent.children.find((child) => child.name.includes("wax"));

      default:
        return null;
    }
  };

  useEffect(() => {
    if (gltf?.scene) {
      gltf.scene.scale.set(1, 1, 1);
      gltf.scene.position.set(0, 0, 0);
      gltf.scene.updateMatrixWorld(true);
    }
  }, [gltf]);
  /** ✅ Compute bounding box and reposition model */
  useEffect(() => {
    if (!modelRef.current) return;

    boundingBoxRef.current.setFromObject(modelRef.current);
    const center = new THREE.Vector3();
    boundingBoxRef.current.getCenter(center);
    modelRef.current.position.sub(center);
    setModelCenter(center);
  }, [gltf.scene]);

  /** 🌟 Add Lights */
  useEffect(() => {
    const hemiLight = new THREE.HemisphereLight(0x7300ff, 0xff0000, 1);
    hemiLight.position.set(32, 33, 89);
    scene.add(hemiLight);

    // const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    // scene.add(ambientLight);

    return () => {
      scene.remove(hemiLight);
      // scene.remove(ambientLight);
    };
  }, [scene]);

  useEffect(() => {
    if (results.length === 0 || !modelRef.current) {
      console.log("No results or modelRef not ready");
      return;
    }

    const DEFAULT_IMAGE = "Triumph.jpg";

    const availableIndices = Array.from({ length: 16 }, (_, i) =>
      String(i + 1).padStart(3, "0")
    );

    const selectedIndices = availableIndices
      .sort(() => Math.random() - 0.5)
      .slice(0, results.length);

    // First reset ALL candles
    modelRef.current.traverse((child) => {
      if (child.name.startsWith("VCANDLE")) {
        const flame = findCandleComponent(child, "FLAME");
        const label = child.children.find((c) => c.name.includes("Label2"));

        if (label && label.material) {
          if (label.material.map) label.material.map.dispose();
          label.material.dispose();

          label.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide,
          });
        }

        child.userData = {
          hasUser: false,
          userName: null,
          image: null,
          message: null,
          burnedAmount: 0,
          meltingProgress: 0,
        };

        if (flame) flame.visible = false;
      }
    });

    // Then activate selected candles with user data
    results.forEach((result, index) => {
      const paddedIndex = selectedIndices[index];
      if (!paddedIndex) return;

      const candleName = `VCANDLE${paddedIndex}`;
      const candle = modelRef.current.getObjectByName(candleName);

      if (candle) {
        candle.userData = {
          hasUser: true,
          userName: result.userName || "Anonymous",
          image: result.image,
          message: result.message,
          burnedAmount: result.burnedAmount || 1,
          meltingProgress: 0,
        };

        if (result.image) {
          applyUserImageToLabel(candle, result.image);
        }

        const flame = findCandleComponent(candle, "FLAME");
        if (flame) flame.visible = true;
      }
    });

    // Apply default image to unused candles
    availableIndices.forEach((index) => {
      if (!selectedIndices.includes(index)) {
        const candleName = `VCANDLE${index}`;
        const candle = modelRef.current.getObjectByName(candleName);
        if (candle) {
          candle.userData = {
            hasUser: true,
            userName: "Triumph",
            image: DEFAULT_IMAGE,
            message: "In memory of triumph",
            burnedAmount: 1,
            meltingProgress: 0,
          };

          applyUserImageToLabel(candle, DEFAULT_IMAGE);
          const flame = findCandleComponent(candle, "FLAME");
          if (flame) flame.visible = false;
        }
      }
    });

    // Cleanup function
    return () => {
      modelRef.current?.traverse((child) => {
        if (child.name.startsWith("VCANDLE")) {
          const label = child.children.find((c) => c.name.includes("Label2"));
          if (label?.material) {
            if (label.material.map) label.material.map.dispose();
            label.material.dispose();
          }
        }
      });
    };
  }, [results, modelRef.current]);

  const applyUserImageToLabel = (candle, imageUrl) => {
    if (!imageUrl) return;

    const label = candle.children.find((child) =>
      child.name.includes("Label2")
    );

    if (!label || !label.material) {
      console.warn("⚠️ Label2 not found for candle:", candle.name);
      return;
    }

    const textureLoader = new THREE.TextureLoader();

    textureLoader.load(
      imageUrl,
      (texture) => {
        console.log("✅ Loaded Texture for:", candle.name); // DEBUG
        texture.encoding = THREE.sRGBEncoding;
        texture.flipY = false;
        texture.needsUpdate = true;
        label.material.map = texture;
        label.material.needsUpdate = true;
      },
      undefined,
      (error) => console.warn("🚨 Texture load error:", error)
    );
  };

  /** 🔥 Reset candle state (for unassigned candles) */
  const resetCandle = (candle) => {
    candle.userData = { hasUser: false };
    const flame = candle.children.find((c) => c.name.startsWith("FLAME"));
    if (flame) flame.visible = false;

    const label = candle.children.find((c) => c.name.includes("Label2"));
    if (label?.material) {
      label.material.map?.dispose();
      label.material.dispose();
      label.material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        side: THREE.DoubleSide,
      });
    }
  };

  const handleCandleClick = (event) => {
    event.stopPropagation();

    if (showFloatingViewer) return;

    const mouse = new THREE.Vector2(
      (event.nativeEvent.offsetX / event.nativeEvent.target.clientWidth) * 2 -
        1,
      -(event.nativeEvent.offsetY / event.nativeEvent.target.clientHeight) * 2 +
        1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersectableObjects = [];
    modelRef.current.traverse((object) => {
      if (object.name.startsWith("VCANDLE")) {
        intersectableObjects.push(object);
        object.children.forEach((child) => {
          if (
            child.name.includes("wax") ||
            child.name.includes("glass") ||
            child.name.startsWith("FLAME")
          ) {
            intersectableObjects.push(child);
          }
        });
      }
    });

    const intersects = raycaster.intersectObjects(intersectableObjects, true);
    if (intersects.length > 0) {
      let candleParent = intersects[0].object;
      while (candleParent && !candleParent.name.startsWith("VCANDLE")) {
        candleParent = candleParent.parent;
      }

      if (candleParent?.userData?.hasUser) {
        console.log("🕯 Candle Clicked:", candleParent.userData);
        onCandleSelect(candleParent.userData); // ✅ correct call
      } else {
        console.warn("Clicked candle has no user data.");
      }
    }
  };
  return (
    <>
      <primitive
        ref={modelRef}
        object={gltf.scene}
        scale={scale}
        rotation={rotation}
        onClick={handleCandleClick}
        style={{
          pointerEvents: showFloatingViewer ? "none" : "auto",
        }}
      />
      <DarkClouds />

      {/* {selectedCandleData && (
        <FloatingCandleViewer
          isVisible={showFloatingViewer}
          onClose={() => {
            setShowFloatingViewer(false);
            setSelectedCandleData(null);
          }}
          userData={selectedCandleData}
          key={selectedCandleData?.image}
        />
      )} */}
    </>
  );
}

export default Model;
