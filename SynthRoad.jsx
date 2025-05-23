import React, { useRef, useEffect, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  useGLTF, 
  OrbitControls, 
  PerspectiveCamera,
  Environment,
  Center,
  useHelper,
  Stats,
  AdaptiveDpr,
  Loader,
  Html
} from "@react-three/drei";
import { useControls, folder, button } from "leva";
import * as THREE from "three";

// Preload the model
useGLTF.preload("/SynthwaveRoad.glb");

// Custom loading component
function LoadingScreen() {
  return (
    <div style={{ 
      position: "absolute", 
      top: 0, 
      left: 0, 
      width: "100%", 
      height: "100%", 
      background: "linear-gradient(to bottom, #000020, #2d0066)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      color: "#ff00ff",
      fontFamily: "sans-serif"
    }}>
      <h1 style={{ 
        fontSize: "2rem", 
        marginBottom: "1rem",
        textShadow: "0 0 10px #ff00ff, 0 0 20px #ff00ff"
      }}>
        Loading Synthwave Road
      </h1>
      <div style={{ 
        width: "200px", 
        height: "4px", 
        background: "#22003380",
        borderRadius: "2px",
        overflow: "hidden",
        position: "relative"
      }}>
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          height: "100%",
          width: "30%",
          background: "#ff00ff",
          borderRadius: "2px",
          animation: "loading 1.5s infinite ease-in-out"
        }} />
      </div>
      <style jsx>{`
        @keyframes loading {
          0% { left: -50%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

// Debug component to visualize object positions
function DebugObject({ position, color = "red", label }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {label && (
        <Html position={[0, 0.2, 0]} center>
          <div style={{ 
            color: "white", 
            backgroundColor: "rgba(0,0,0,0.5)", 
            padding: "2px 5px",
            borderRadius: "3px",
            fontSize: "12px",
            fontFamily: "monospace",
            whiteSpace: "nowrap"
          }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

// Model component that handles the actual GLB
function Model({ onCarLoaded }) {
  const modelRef = useRef();
  const { scene, camera } = useThree();
  
  // State for debug info
  const [debugInfo, setDebugInfo] = useState({
    carPosition: null,
    carFound: false,
    roadFound: false,
    showDebugObjects: false
  });
  
  // Load the model
  const { nodes, materials } = useGLTF("/SynthwaveRoad.glb");
  
  // Debug controls
  const { showDebug } = useControls({
    "Debug": folder({
      showDebug: { value: false, label: "Show Debug Objects" }
    })
  });
  
  // Update debug state for visualization
  useEffect(() => {
    setDebugInfo(prev => ({
      ...prev,
      showDebugObjects: showDebug
    }));
  }, [showDebug]);
  
  useEffect(() => {
    console.log("Model nodes structure:", Object.keys(nodes));
    
    // Find and process the Road object
    if (nodes.Road && nodes.Road.material) {
      nodes.Road.material = new THREE.MeshBasicMaterial({
        color: 0xff00ff, // Magenta color for the wireframe
        wireframe: true,
        transparent: true,
        opacity: 0.8
      });
      
      setDebugInfo(prev => ({
        ...prev,
        roadFound: true
      }));
      
      console.log("Road object found and set to wireframe");
    } else {
      console.warn("Road object not found in the model");
    }
    
    // Find all objects in the scene to locate the car
    let carObject = null;
    
    // Log all objects to help identify the car
    scene.traverse((object) => {
      if (object.isMesh && object.name.includes("97")) {
        console.log(`Found potential car object: ${object.name}`);
      }
    });
    
    // First, try to find Object_97 directly
    if (nodes.Object_97) {
      carObject = nodes.Object_97;
      console.log("Found Object_97 directly in nodes");
    } else {
      // Otherwise search through scene hierarchy
      scene.traverse((object) => {
        if (object.name === "Object_97" || object.name.includes("Car")) {
          carObject = object;
          console.log(`Found car object through scene traversal: ${object.name}`);
        }
      });
    }
    
    if (!carObject) {
      console.warn("Car object (Object_97) not found in the model");
      return;
    }
    
    // Update debug info
    setDebugInfo(prev => ({
      ...prev,
      carFound: true
    }));
    
    // Wait for the next frame to ensure the car object is properly placed in the scene
    setTimeout(() => {
      // Get the car's world position and orientation
      const carPosition = new THREE.Vector3();
      carObject.getWorldPosition(carPosition);
      
      const carDirection = new THREE.Vector3(0, 0, -1); // Assuming car points along negative Z
      
      if (carObject.quaternion) {
        // Apply car's rotation to get its forward direction
        carDirection.applyQuaternion(carObject.quaternion);
      }
      
      // Debug info update
      setDebugInfo(prev => ({
        ...prev,
        carPosition: carPosition.toArray()
      }));
      
      console.log("Car position:", carPosition);
      console.log("Car direction:", carDirection);
      
      // Calculate camera position (behind the car)
      // Reverse the direction vector and scale it to position camera behind car
      const cameraOffset = carDirection.clone().multiplyScalar(-2); // 2 units behind car
      const cameraPosition = new THREE.Vector3().copy(carPosition).add(cameraOffset);
      cameraPosition.y += 0.8; // Position camera higher than car for better view
      
      console.log("Camera position:", cameraPosition);
      
      // Ensure the camera looks at the car
      const targetPosition = carPosition.clone();
      targetPosition.y += 0.5; // Look slightly above car
      
      console.log("Camera target:", targetPosition);
      
      // Pass camera settings to parent
      onCarLoaded({
        position: cameraPosition.toArray(),
        target: targetPosition.toArray()
      });
      
    }, 100); // Small delay to ensure scene is ready
    
  }, [nodes, scene, onCarLoaded, showDebug]);
  
  return (
    <group ref={modelRef} dispose={null}>
      <primitive object={nodes.Scene} />
      
      {/* Debug visualization objects */}
      {debugInfo.showDebugObjects && debugInfo.carPosition && (
        <>
          <DebugObject 
            position={debugInfo.carPosition} 
            color="red" 
            label="Car" 
          />
        </>
      )}
    </group>
  );
}

// Main component that sets up the Canvas and scene
function SynthRoad() {
  // Use the specific camera values the user wants
  const specificCameraPosition = [0.7, 0.1, 0];
  const specificCameraTarget = [-7.6, 0.6, -0.9];
  const specificCameraFOV = 55;
  
  // State to store camera position when car is loaded
  const [cameraSettings, setCameraSettings] = useState({
    position: specificCameraPosition,
    target: specificCameraTarget
  });
  
  // State to track if the scene is ready
  const [sceneReady, setSceneReady] = useState(false);
  
  // Handler for when the car object is found and loaded
  const handleCarLoaded = ({ position, target }) => {
    // Ignore calculated position and always use our specific settings
    setCameraSettings({
      position: specificCameraPosition,
      target: specificCameraTarget
    });
    
    // Mark scene as ready
    setSceneReady(true);
    
    console.log('Car found! Using specified camera settings:');
    console.log('Position:', specificCameraPosition);
    console.log('Target:', specificCameraTarget);
    console.log('FOV:', specificCameraFOV);
  };
  
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <Canvas shadows dpr={[1, 2]}>
        <color attach="background" args={["#000020"]} />
        
        {/* Camera setup with GUI */}
        <CameraSetup 
          initialPosition={specificCameraPosition} 
          initialTarget={specificCameraTarget}
          initialFOV={specificCameraFOV}
        />
        
        {/* Performance optimization */}
        <AdaptiveDpr pixelated />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        {/* Model with Suspense for loading */}
        <Suspense fallback={null}>
          <Model onCarLoaded={handleCarLoaded} />
          
          {/* Environment */}
          <Environment preset="sunset" />
        </Suspense>
        
        {/* Add Stats component (press 'l' to show/hide) */}
        <Stats showPanel={0} className="stats" />
      </Canvas>
      
      {/* Loading overlay */}
      {!sceneReady && <LoadingScreen />}
      
      {/* External loader for Suspense fallback */}
      <Loader 
        containerStyles={{ background: 'transparent' }} // to work with our custom loader
        dataInterpolation={(p) => `${p.toFixed(0)}%`} 
        innerStyles={{ background: '#ff00ff' }}
        barStyles={{ background: '#ffffff' }}
      />
    </div>
  );
}

// Camera component with controls
function CameraSetup({ initialPosition, initialTarget, initialFOV }) {
  const cameraRef = useRef();
  const controlsRef = useRef();
  const { camera, gl } = useThree();
  
  // Set specific camera values as requested
  const defaultPosition = initialPosition || [0.7, 0.1, 0];
  const defaultTarget = initialTarget || [-7.6, 0.6, -0.9];
  const defaultFOV = initialFOV || 55;
  
  // Use separate state to track current values to avoid conflicts with leva and OrbitControls
  const [currentTarget, setCurrentTarget] = useState(defaultTarget);
  
  // Create orbit controls settings
  const { 
    posX, posY, posZ, 
    targetX, targetY, targetZ, 
    fov, showHelpers,
    enableRotate,
    rotateSpeed,
    autoRotate 
  } = useControls({
    "Camera Position": folder({
      posX: { value: defaultPosition[0], min: -10, max: 10, step: 0.1 },
      posY: { value: defaultPosition[1], min: -10, max: 10, step: 0.1 },
      posZ: { value: defaultPosition[2], min: -10, max: 10, step: 0.1 }
    }),
    "Camera Target": folder({
      targetX: { value: defaultTarget[0], min: -10, max: 10, step: 0.1, onChange: (v) => setCurrentTarget(prev => [v, prev[1], prev[2]]) },
      targetY: { value: defaultTarget[1], min: -10, max: 10, step: 0.1, onChange: (v) => setCurrentTarget(prev => [prev[0], v, prev[2]]) },
      targetZ: { value: defaultTarget[2], min: -10, max: 10, step: 0.1, onChange: (v) => setCurrentTarget(prev => [prev[0], prev[1], v]) }
    }),
    "Camera Controls": folder({
      enableRotate: { value: true, label: "Enable Rotation" },
      rotateSpeed: { value: 1.0, min: 0.1, max: 5, step: 0.1 },
      autoRotate: { value: false }
    }),
    "Camera Settings": folder({
      fov: { value: defaultFOV, min: 10, max: 120, step: 1 },
      showHelpers: { value: false },
      resetCamera: button(() => {
        if (camera && controlsRef.current) {
          // Update camera position
          camera.position.set(defaultPosition[0], defaultPosition[1], defaultPosition[2]);
          
          // Update orbit controls target
          controlsRef.current.target.set(defaultTarget[0], defaultTarget[1], defaultTarget[2]);
          
          // Update Leva controls
          setCurrentTarget(defaultTarget);
          
          // Update camera FOV
          camera.fov = defaultFOV;
          camera.updateProjectionMatrix();
          
          // Force update orbit controls
          controlsRef.current.update();
          
          console.log("Camera reset complete. Using specified settings:");
          console.log("Position:", defaultPosition);
          console.log("Target:", defaultTarget);
          console.log("FOV:", defaultFOV);
        }
      })
    })
  });
  
  // Add camera helper if enabled
  useHelper(showHelpers && cameraRef, THREE.CameraHelper);
  
  // Sync Leva controls with target state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.set(currentTarget[0], currentTarget[1], currentTarget[2]);
      controlsRef.current.update();
    }
  }, [currentTarget]);
  
  // Update camera position based on GUI controls
  useFrame(() => {
    // Update camera position
    camera.position.set(posX, posY, posZ);
    
    // Update camera FOV
    camera.fov = fov;
    camera.updateProjectionMatrix();
    
    // Force update controls each frame
    if (controlsRef.current) {
      controlsRef.current.update();
    }
  });
  
  // Apply the specific camera settings multiple times to ensure they stick
  useEffect(() => {
    // Function to set camera settings
    const setCamera = () => {
      if (!camera || !controlsRef.current) return;
      
      // Position camera
      camera.position.set(defaultPosition[0], defaultPosition[1], defaultPosition[2]);
      
      // Set target
      controlsRef.current.target.set(defaultTarget[0], defaultTarget[1], defaultTarget[2]);
      setCurrentTarget(defaultTarget);
      
      // Set FOV
      camera.fov = defaultFOV;
      camera.updateProjectionMatrix();
      
      // Update controls
      controlsRef.current.update();
      
      console.log("Camera settings applied:", {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z],
        fov: camera.fov
      });
    };
    
    // Set camera immediately
    setCamera();
    
    // Also set after short delays to ensure settings stick
    const t1 = setTimeout(setCamera, 100);
    const t2 = setTimeout(setCamera, 500);
    const t3 = setTimeout(setCamera, 1000);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [camera, defaultPosition, defaultTarget, defaultFOV]);
  
  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={defaultPosition} fov={defaultFOV} />
      <OrbitControls 
        ref={controlsRef}
        args={[camera, gl.domElement]}
        target={[currentTarget[0], currentTarget[1], currentTarget[2]]}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={0.1}
        maxDistance={50}
        enableRotate={enableRotate}
        rotateSpeed={rotateSpeed}
        autoRotate={autoRotate}
        enablePan={true}
        enableZoom={true}
        makeDefault
      />
    </>
  );
}

export default SynthRoad; 