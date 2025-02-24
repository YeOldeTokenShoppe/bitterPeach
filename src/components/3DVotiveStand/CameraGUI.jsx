import React, { useEffect } from "react";
import GUI from "lil-gui";
import * as THREE from "three";

function CameraGUI({ cameraRef, controlsRef }) {
  useEffect(() => {
    if (!cameraRef.current || !controlsRef.current) {
      console.log("CameraGUI: Camera or Controls NOT found", {
        camera: cameraRef.current,
        controls: controlsRef.current,
      });
      return;
    }

    console.log("CameraGUI: Initializing GUI");

    const gui = new GUI();
    const cameraFolder = gui.addFolder("Camera Settings");

    cameraFolder
      .add(cameraRef.current.position, "x", -100, 100)
      .name("Position X");
    cameraFolder
      .add(cameraRef.current.position, "y", -100, 100)
      .name("Position Y");
    cameraFolder
      .add(cameraRef.current.position, "z", -100, 100)
      .name("Position Z");

    cameraFolder
      .add(cameraRef.current, "fov", 10, 100)
      .name("FOV")
      .onChange(() => cameraRef.current.updateProjectionMatrix());

    cameraFolder.open();

    // ✅ Add OrbitControls Target to GUI
    const targetFolder = gui.addFolder("Target Settings");
    targetFolder
      .add(controlsRef.current.target, "x", -100, 100)
      .name("Target X");
    targetFolder
      .add(controlsRef.current.target, "y", -100, 100)
      .name("Target Y");
    targetFolder
      .add(controlsRef.current.target, "z", -100, 100)
      .name("Target Z");

    targetFolder.open();

    // ✅ Add "Copy to Console" button
    gui
      .add(
        {
          copyToConsole: () => {
            console.log(`🚀 Camera Position:`, cameraRef.current.position);
            console.log(`🎯 OrbitControls Target:`, controlsRef.current.target);
            console.log(`🔭 FOV:`, cameraRef.current.fov);
            console.log(`👉 Copy these values into your code!`);
          },
        },
        "copyToConsole"
      )
      .name("📋 Copy to Console");

    return () => {
      console.log("CameraGUI: Destroying GUI");
      gui.destroy();
    };
  }, [cameraRef, controlsRef]);

  return null;
}

export default CameraGUI;
