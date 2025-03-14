import React, { useRef, useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Stats } from "@react-three/drei";
import GothicScene from "./GothicScene";

function GothicSceneContainer({
  showStats = false,
  cameraPosition = [0, 5, 10],
  controlsEnabled = true,
  lightIntensity = 1.2,
  skyColor = "#7300ff",
  groundColor = "#ff0000",
  pointLights = [
    {
      position: [5, 5, 5],
      color: "#ff0000",
      intensity: 1.5,
      showHelper: false,
      distance: 50,
      decay: 2,
      name: "Red Light",
    },
    {
      position: [-5, 5, 5],
      color: "#0000ff",
      intensity: 1.0,
      showHelper: false,
      distance: 40,
      decay: 2,
      name: "Blue Light",
    },
    {
      position: [0, 5, -5],
      color: "#00ff00",
      intensity: 1.2,
      showHelper: false,
      distance: 45,
      decay: 2,
      name: "Green Light",
    },
    {
      position: [0, -5, 0],
      color: "#ffff00",
      intensity: 0.8,
      showHelper: false,
      distance: 35,
      decay: 2,
      name: "Yellow Light",
    },
  ],
}) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const modelRef = useRef();
  const cameraRef = useRef();

  // Ensure pointLights is always an array
  const safePointLights = Array.isArray(pointLights) ? pointLights : [];

  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      {!isModelLoaded && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#000",
            color: "#fff",
            zIndex: 10,
          }}
        >
          <div>
            <h2>Loading Gothic Scene...</h2>
            <div
              style={{
                width: "200px",
                height: "5px",
                backgroundColor: "#333",
                borderRadius: "5px",
                margin: "10px auto",
              }}
            >
              <div
                style={{
                  width: `${isModelLoaded ? 100 : 0}%`,
                  height: "100%",
                  backgroundColor: "#7300ff",
                  borderRadius: "5px",
                  transition: "width 0.5s ease-in-out",
                }}
              />
            </div>
          </div>
        </div>
      )}

      <Canvas flat pixelRatio={1}>
        {showStats && <Stats />}

        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={cameraPosition}
          fov={45}
          near={0.1}
          far={1000}
        />

        {controlsEnabled && (
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            zoomSpeed={1.0}
            panSpeed={1.0}
            minDistance={1}
            maxDistance={50}
            target={[0, 0, 0]}
            screenSpacePanning={true}
            enableDamping={true}
            dampingFactor={0.1}
            makeDefault
          />
        )}

        <Suspense fallback={null}>
          <GothicScene
            key="gothic-scene"
            modelRef={modelRef}
            setIsModelLoaded={setIsModelLoaded}
            lightIntensity={lightIntensity}
            skyColor={skyColor}
            groundColor={groundColor}
            pointLights={safePointLights}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default GothicSceneContainer;
