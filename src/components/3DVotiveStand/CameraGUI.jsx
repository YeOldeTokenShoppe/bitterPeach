import React, { useEffect, useRef } from "react";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { getCameraConfig, formatCameraPosition } from "./cameraConfig";

const CameraGUI = ({ cameraRef, controlsRef, onGuiStart, onGuiEnd }) => {
  const panelRef = useRef(null);
  const containerRef = useRef(null);
  const styleRef = useRef(null);

  useEffect(() => {
    if (!cameraRef?.current || !controlsRef?.current) return;

    // Create container with styling
    containerRef.current = document.createElement("div");
    Object.assign(containerRef.current.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: "9999",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    });
    document.body.appendChild(containerRef.current);

    // Add custom styles
    styleRef.current = document.createElement("style");
    styleRef.current.textContent = `
      .camera-gui.lil-gui {
        --width: 310px;
        --spacing: 6px;
        --folder-indent: 12px;
        background: rgba(11, 11, 11, 0.95);
      }
      .camera-gui.lil-gui .controller {
        min-height: 28px;
        margin-bottom: 4px;
      }
      .camera-gui.lil-gui .controller .widget {
        min-height: 28px;
      }
      .camera-gui.lil-gui .folder > .children {
        margin-left: var(--folder-indent);
        padding: var(--spacing);
        border-left: 2px solid var(--folder-border-color);
      }
      .camera-gui.lil-gui .folder > .title {
        padding: 8px;
        background: rgba(30, 30, 30, 0.95);
      }
      .camera-gui.lil-gui .slider {
        margin-left: var(--spacing);
        background: rgba(30, 30, 30, 0.95);
      }
      .camera-gui.lil-gui .slider .fill {
        background: #4a9eff;
      }
      .camera-gui.lil-gui button {
        margin: 4px 0;
        padding: 6px;
        width: 100%;
      }
    `;
    document.head.appendChild(styleRef.current);

    // Create GUI
    panelRef.current = new GUI({
      container: containerRef.current,
      width: 310,
      title: "Camera Controls",
      autoPlace: false,
    });

    // Add custom class for styling
    panelRef.current.domElement.classList.add("camera-gui");

    // Notify parent component
    onGuiStart(panelRef.current);

    const config = getCameraConfig();
    const params = {
      positionX: cameraRef.current.position.x,
      positionY: cameraRef.current.position.y,
      positionZ: cameraRef.current.position.z,
      targetX: controlsRef.current.target.x,
      targetY: controlsRef.current.target.y,
      targetZ: controlsRef.current.target.z,
      fov: cameraRef.current.fov,
    };

    const updateCamera = () => {
      cameraRef.current.updateProjectionMatrix();
      controlsRef.current.update();
    };

    // Create folders
    const positionFolder = panelRef.current.addFolder("Camera Position");
    const targetFolder = panelRef.current.addFolder("Look At Target");
    const utilityFolder = panelRef.current.addFolder("Utilities");

    // Position controls
    positionFolder
      .add(params, "positionX", -100, 100)
      .name("X Position")
      .onChange((value) => {
        cameraRef.current.position.x = value;
        updateCamera();
      });

    positionFolder
      .add(params, "positionY", -100, 100)
      .name("Y Position")
      .onChange((value) => {
        cameraRef.current.position.y = value;
        updateCamera();
      });

    positionFolder
      .add(params, "positionZ", -200, 200)
      .name("Z Position")
      .onChange((value) => {
        cameraRef.current.position.z = value;
        updateCamera();
      });

    positionFolder
      .add(params, "fov", 20, 120)
      .name("FOV")
      .onChange((value) => {
        cameraRef.current.fov = value;
        updateCamera();
      });

    // Target controls
    targetFolder
      .add(params, "targetX", -100, 100)
      .name("X Target")
      .onChange((value) => {
        controlsRef.current.target.x = value;
        updateCamera();
      });

    targetFolder
      .add(params, "targetY", -100, 100)
      .name("Y Target")
      .onChange((value) => {
        controlsRef.current.target.y = value;
        updateCamera();
      });

    targetFolder
      .add(params, "targetZ", -100, 100)
      .name("Z Target")
      .onChange((value) => {
        controlsRef.current.target.z = value;
        updateCamera();
      });

    // Utility functions
    const utils = {
      reset: () => {
        const config = getCameraConfig();
        cameraRef.current.position.set(...config.position);
        controlsRef.current.target.set(...config.target);
        cameraRef.current.fov = config.fov;
        updateCamera();
        panelRef.current.updateDisplay();
      },
      copyValues: () => {
        const values = formatCameraPosition(
          cameraRef.current.position,
          controlsRef.current.target,
          cameraRef.current.fov
        );
        const str = JSON.stringify(values, null, 2);
        navigator.clipboard.writeText(str);
        console.log("Copied values:", str);
      },
      toggleView: () => {
        panelRef.current._closed
          ? panelRef.current.open()
          : panelRef.current.close();
      },
    };

    utilityFolder.add(utils, "reset").name("Reset Camera");
    utilityFolder.add(utils, "copyValues").name("Copy Values");
    utilityFolder.add(utils, "toggleView").name("Toggle Panel");

    // Open all folders by default (except on mobile)
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      panelRef.current.close();
    } else {
      positionFolder.open();
      targetFolder.open();
      utilityFolder.open();
    }

    // Cleanup
    return () => {
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
      }
      if (containerRef.current) {
        document.body.removeChild(containerRef.current);
      }
      if (panelRef.current) {
        panelRef.current.destroy();
      }
      onGuiEnd();
    };
  }, [cameraRef?.current, controlsRef?.current]);

  return null;
};

export default CameraGUI;
