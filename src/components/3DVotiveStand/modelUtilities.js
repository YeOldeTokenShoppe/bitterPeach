import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  getFirestore,
} from "firebase/firestore";
import { db } from "../../utilities/firebaseClient";
import * as THREE from "three";
import { getRandomShader } from "./shaders/shaderManager";

export const createMarkerFace = (index) => {
  const container = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.4),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
  );

  function createGradientTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");

    // Create gradient
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#584827");
    gradient.addColorStop(0.37, "#c7a03c");
    gradient.addColorStop(0.3, "#f9de90");
    gradient.addColorStop(0.33, "#c7a03c");
    gradient.addColorStop(0.4, "#584827");
    gradient.addColorStop(0.5, "#584827");
    gradient.addColorStop(0.77, "#c7a03c");
    gradient.addColorStop(0.8, "#f9de90");
    gradient.addColorStop(0.83, "#c7a03c");
    gradient.addColorStop(1, "#584827");

    // Apply gradient to canvas
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }
  container.isMarker = true;
  container.markerIndex = index;
  container.scale.set(0.3, 0.3, 0.3);

  // Marker Circle
  const markerGeometry = new THREE.CircleGeometry(0.15, 32);
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });
  const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
  markerMesh.position.z = 0.001;
  markerMesh.renderOrder = 1;
  container.add(markerMesh);

  // Marker Border (with emissive glow)
  const borderGeometry = new THREE.RingGeometry(0.16, 0.2, 32);
  const borderMaterial = new THREE.MeshStandardMaterial({
    map: createGradientTexture(),

    emissive: 0xc7a03c,
    emissiveIntensity: 1,
    side: THREE.DoubleSide,
  });
  const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
  borderMesh.position.z = 0;
  borderMesh.renderOrder = 0;
  container.add(borderMesh);

  // Number Texture
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.font = "bold 40px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText((index + 1).toString(), 32, 32);

  const numberTexture = new THREE.CanvasTexture(canvas);
  const numberGeometry = new THREE.PlaneGeometry(0.2, 0.2);
  const numberMaterial = new THREE.MeshBasicMaterial({
    map: numberTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const numberMesh = new THREE.Mesh(numberGeometry, numberMaterial);
  numberMesh.position.z = 0.01;
  container.add(numberMesh);

  // Add pulsing and glowing effect
  let pulseTime = 0;
  container.onBeforeRender = () => {
    pulseTime += 0.05;
    const scale = 1 + Math.sin(pulseTime) * 0.15;
    borderMesh.scale.set(scale, scale, scale);
    borderMaterial.emissiveIntensity = 0.8 + Math.sin(pulseTime) * 0.2;
  };

  return container;
};

// export function setupVideoTextures(modelRef) {
//   const videoMaterials = {};
//   const overlayMaterials = {};
//   let animationFrameId = null;
//   let unsubscribeFirestore;
//   let userNames = [];
//   const overlayMeshes = {};
//   let userDataInterval;

//   // Array of video URLs - replace these with your actual MP4 URLs
//   const videoUrls = [
//     "/1.mp4",
//     "/2.mp4",
//     "/3.mp4",
//     "/4.mp4",
//     "/5.mp4",
//     "/6.mp4",
//     "/7.mp4",
//     "/8.mp4",
//     "/9.mp4",
//   ];

//   // Function to create video texture
//   const createVideoTexture = (videoUrl) => {
//     const video = document.createElement("video");
//     video.src = videoUrl;
//     video.crossOrigin = "anonymous";
//     video.loop = true;
//     video.muted = true;
//     video.play();

//     const texture = new THREE.VideoTexture(video);
//     texture.minFilter = THREE.LinearFilter;
//     texture.magFilter = THREE.LinearFilter;
//     texture.format = THREE.RGBAFormat;

//     // Create a matrix to rotate 90 degrees and flip on Y-axis
//     texture.matrix.setUvTransform(0, 0, -1, 1, Math.PI / 2, 0.5, 0.5);
//     texture.matrixAutoUpdate = false;

//     return { texture, video };
//   };

//   const fetchUserNames = async () => {
//     try {
//       if (unsubscribeFirestore) {
//         unsubscribeFirestore();
//       }

//       const q = query(collection(db, "results"), orderBy("createdAt", "desc"));
//       unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
//         const newUserNames = querySnapshot.docs.map((doc) => {
//           const data = doc.data();
//           return {
//             userName: data.userName || "Anonymous",
//             burnedAmount: data.burnedAmount || 0,
//             image: data.image || null,
//           };
//         });

//         if (JSON.stringify(newUserNames) !== JSON.stringify(userNames)) {
//           userNames = newUserNames;
//           updateScreens();
//         }
//       });
//     } catch (error) {
//       console.error("Error in fetchUserNames:", error);
//       userNames = [
//         { userName: "Error loading data", burnedAmount: 0, image: null },
//       ];
//     }
//   };

//   const initializeScreens = () => {
//     if (modelRef.current) {
//       const screens = [];
//       modelRef.current.traverse((child) => {
//         if (child.isMesh && child.name.startsWith("Screen")) {
//           screens.push(child);
//         }
//       });

//       // Distribute videos among screens
//       screens.forEach((screen, index) => {
//         const videoUrl = videoUrls[index % videoUrls.length];
//         const { texture, video } = createVideoTexture(videoUrl);

//         const material = new THREE.MeshBasicMaterial({
//           map: texture,
//           side: THREE.DoubleSide,
//         });

//         videoMaterials[screen.name] = { material, video };
//         screen.material = material;
//       });
//     }
//   };

//   const createTextTexture = (textData) => {
//     return new Promise((resolve) => {
//       const canvas = document.createElement("canvas");
//       canvas.width = 512;
//       canvas.height = 512;
//       const context = canvas.getContext("2d");

//       if (textData.image) {
//         const img = new Image();
//         img.onload = () => {
//           context.save();
//           context.scale(1, -1);
//           context.rotate(-Math.PI / 2);

//           const scale =
//             Math.max(canvas.width / img.width, canvas.height / img.height) *
//             1.1;
//           const x = (canvas.width - img.width * scale) / 1.8;
//           const y = (canvas.height - img.height * scale) / 2;

//           context.drawImage(img, x, y, img.width * scale, img.height * scale);
//           context.restore();

//           // Draw text
//           context.save();
//           context.translate(canvas.width / 2 + 70, canvas.height / 2);
//           context.scale(-1, 1);
//           context.rotate(Math.PI / 2);

//           context.fillStyle = "#ffffff";
//           context.font = "bold 90px Oleo Script";
//           context.textAlign = "center";
//           context.textBaseline = "middle";

//           const text = `${textData.userName}`;
//           context.fillText(text, 0, 0);
//           context.restore();

//           const texture = new THREE.CanvasTexture(canvas);
//           texture.needsUpdate = true;
//           resolve(texture);
//         };
//         img.src = textData.image;
//       }
//     });
//   };

//   const addOverlays = () => {
//     if (modelRef.current) {
//       modelRef.current.traverse((child) => {
//         if (child.isMesh && child.name.startsWith("Screen")) {
//           const overlayMesh = new THREE.Mesh(
//             child.geometry.clone(),
//             new THREE.MeshBasicMaterial({
//               transparent: true,
//               opacity: 1.0,
//               depthTest: true,
//             })
//           );

//           overlayMesh.position.copy(child.position);
//           overlayMesh.rotation.copy(child.rotation);
//           overlayMesh.scale.copy(child.scale);
//           overlayMesh.position.z += 0.001;

//           child.parent.add(overlayMesh);
//           overlayMeshes[child.name] = overlayMesh;
//         }
//       });
//     }
//   };

//   const updateScreens = async () => {
//     await fetchUserNames();

//     // Get all screen names and shuffle them
//     const screenNames = Object.keys(overlayMeshes);
//     const shuffledScreens = [...screenNames].sort(() => Math.random() - 0.5);

//     // Reset all overlays to hide them initially
//     Object.values(overlayMeshes).forEach((mesh) => {
//       mesh.visible = false;
//     });

//     // If we have users to display
//     if (userNames.length > 0) {
//       // Select one random screen to show user data
//       const selectedScreen = shuffledScreens[0];

//       // Select one random user
//       const selectedUser =
//         userNames[Math.floor(Math.random() * userNames.length)];

//       // Create and apply texture for the selected user
//       const texture = await createTextTexture(selectedUser);
//       if (overlayMeshes[selectedScreen]) {
//         overlayMeshes[selectedScreen].material.map = texture;
//         overlayMeshes[selectedScreen].visible = true;
//         overlayMeshes[selectedScreen].material.needsUpdate = true;
//       }
//     }
//   };

//   const animate = () => {
//     animationFrameId = requestAnimationFrame(animate);
//     // No need to update uniforms for videos
//   };

//   userDataInterval = setInterval(updateScreens, 10000);

//   const cleanup = () => {
//     if (animationFrameId != null) {
//       cancelAnimationFrame(animationFrameId);
//       animationFrameId = null;
//     }
//     if (userDataInterval) {
//       clearInterval(userDataInterval);
//     }

//     // Cleanup videos
//     Object.values(videoMaterials).forEach(({ material, video }) => {
//       video.pause();
//       video.src = "";
//       video.load();
//       material.dispose();
//     });

//     // Cleanup overlays
//     Object.values(overlayMeshes).forEach((mesh) => {
//       if (mesh.material.map) {
//         mesh.material.map.dispose();
//       }
//       mesh.material.dispose();
//       mesh.removeFromParent();
//     });
//   };

//   initializeScreens();
//   addOverlays();
//   animate();
//   fetchUserNames();

//   return cleanup;
// }

// utility for clicking on screens for up-close view
// modelUtilities.js
export const SCREEN_VIEWS = {
  Screen1: {
    cameraView: {
      "tablet-small-landscape": {
        position: () => ({ x: 3.17, y: 1.8, z: 7.81 }),
        target: () => ({ x: -0.7, y: 1.8, z: 5.8 }),
        fov: 84.8,
      },
      "tablet-small-portrait": {
        position: () => ({ x: 4.8, y: 1.2, z: 9.21 }),
        target: () => ({ x: 0, y: 2.3, z: 5.9 }),
        fov: 42,
      },
      "tablet-medium-landscape": {
        position: () => ({ x: 3.17, y: 1.8, z: 7.81 }),
        target: () => ({ x: -0.7, y: 1.8, z: 5.8 }),
        fov: 84.8,
      },
      "tablet-medium-portrait": {
        position: () => ({ x: 4.8, y: 1.2, z: 9.21 }),
        target: () => ({ x: 0, y: 2.3, z: 5.9 }),
        fov: 42,
      },
      "tablet-large-landscape": {
        position: () => ({ x: 3.17, y: 1.8, z: 7.81 }),
        target: () => ({ x: -0.7, y: 1.8, z: 5.8 }),
        fov: 84.8,
      },
      "tablet-large-portrait": {
        position: () => ({ x: 4.8, y: 1.2, z: 9.21 }),
        target: () => ({ x: 0, y: 2.3, z: 5.9 }),
        fov: 42,
      },
      "desktop-small": {
        position: () => ({ x: 3.17, y: 1.8, z: 7.81 }),
        target: () => ({ x: -0.7, y: 1.8, z: 5.8 }),
        fov: 84.8,
      },
      "desktop-medium": {
        position: () => ({ x: 3.17, y: 1.8, z: 7.81 }),
        target: () => ({ x: -0.7, y: 1.8, z: 5.8 }),
        fov: 84.8,
      },
      "desktop-large": {
        position: () => ({ x: 3.17, y: 1.8, z: 7.81 }),
        target: () => ({ x: -0.7, y: 1.8, z: 5.8 }),
        fov: 84.8,
      },
    },
    getDescription: () => {
      const content = screenStateManager.screenContent.Screen1;
      return content ? content.userName : null;
    },

    annotationPosition: {
      "tablet-small-landscape": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-small-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-medium-landscape": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-medium-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-large-landscape": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-large-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "desktop-small": {
        xPercent: 50,
        yPercent: 70,
      },
      "desktop-medium": {
        xPercent: 50,
        yPercent: 70,
      },
      "desktop-large": {
        xPercent: 50,
        yPercent: 70,
      },
    },
    handleClick: (moveCamera, markers) => {
      if (markers && markers[2]) {
        // Index 2 for marker 3
        moveCamera(markers[2], 2);
      }
    },
  },
  Screen2: {
    cameraView: {
      "tablet-small-landscape": {
        position: () => ({ x: 5.15, y: 3.9, z: 6.94 }),
        target: () => ({ x: -12.8, y: 2.7, z: -1 }),
        fov: 42.4,
      },
      "tablet-small-portrait": {
        position: () => ({ x: 5.24, y: 3.36, z: 6.97 }),
        target: () => ({ x: -11.1, y: 5.9, z: -2.1 }),
        fov: 55.8,
      },
      "tablet-medium-landscape": {
        position: () => ({ x: 5.15, y: 3.9, z: 6.94 }),
        target: () => ({ x: -12.8, y: 2.7, z: -1 }),
        fov: 42.4,
      },
      "tablet-medium-portrait": {
        position: () => ({ x: 5.24, y: 3.36, z: 6.97 }),
        target: () => ({ x: -11.1, y: 5.9, z: -2.1 }),
        fov: 55.8,
      },
      "tablet-large-landscape": {
        position: () => ({ x: 5.15, y: 3.9, z: 6.94 }),
        target: () => ({ x: -12.8, y: 2.7, z: -1 }),
        fov: 42.4,
      },
      "tablet-large-portrait": {
        position: () => ({ x: 5.24, y: 3.36, z: 6.97 }),
        target: () => ({ x: -11.1, y: 5.9, z: -2.1 }),
        fov: 55.8,
      },
      "desktop-small": {
        position: () => ({ x: 5.15, y: 3.9, z: 6.94 }),
        target: () => ({ x: -12.8, y: 2.7, z: -1 }),
        fov: 42.4,
      },
      "desktop-medium": {
        position: () => ({ x: 5.15, y: 3.9, z: 6.94 }),
        target: () => ({ x: -12.8, y: 2.7, z: -1 }),
        fov: 42.4,
      },
      "desktop-large": {
        position: () => ({ x: 5.15, y: 3.9, z: 6.94 }),
        target: () => ({ x: -12.8, y: 2.7, z: -1 }),
        fov: 42.4,
      },
    },
    getDescription: () => {
      const content = screenStateManager.screenContent.Screen2;
      return content ? content.userName : null;
    },
    annotationPosition: {
      "tablet-small-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-small-portrait": {
        xPercent: 40,
        yPercent: 70,
      },
      "tablet-medium-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-medium-portrait": {
        xPercent: 40,
        yPercent: 70,
      },
      "tablet-large-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-large-portrait": {
        xPercent: 40,
        yPercent: 70,
      },
      "desktop-small": {
        xPercent: 50,
        yPercent: 80,
      },
      "desktop-medium": {
        xPercent: 50,
        yPercent: 80,
      },
      "desktop-large": {
        xPercent: 50,
        yPercent: 80,
      },
    },
    handleClick: (moveCamera, markers) => {
      if (markers && markers[2]) {
        // Index 2 for marker 3
        moveCamera(markers[2], 2);
      }
    },
  },
  Screen3: {
    cameraView: {
      "tablet-small-landscape": {
        position: () => ({ x: 4.9, y: 2.88, z: 6.9 }),
        target: () => ({ x: 4.9, y: 2.8, z: 5.1 }),
        fov: 56.1,
      },
      "tablet-small-portrait": {
        position: () => ({ x: 4.9, y: 2.9, z: 7.26 }),
        target: () => ({ x: 4.4, y: 2.1, z: -2.1 }),
        fov: 57.6,
      },
      "tablet-medium-landscape": {
        position: () => ({ x: 4.9, y: 2.88, z: 6.9 }),
        target: () => ({ x: 4.9, y: 2.8, z: 5.1 }),
        fov: 56.1,
      },
      "tablet-medium-portrait": {
        position: () => ({ x: 4.9, y: 2.9, z: 7.26 }),
        target: () => ({ x: 4.4, y: 2.1, z: -2.1 }),
        fov: 57.6,
      },
      "tablet-large-landscape": {
        position: () => ({ x: 4.9, y: 2.88, z: 6.9 }),
        target: () => ({ x: 4.9, y: 2.8, z: 5.1 }),
        fov: 56.1,
      },
      "tablet-large-portrait": {
        position: () => ({ x: 4.9, y: 2.9, z: 7.26 }),
        target: () => ({ x: 4.4, y: 2.1, z: -2.1 }),
        fov: 57.6,
      },
      "desktop-small": {
        position: () => ({ x: 4.9, y: 2.88, z: 6.9 }),
        target: () => ({ x: 4.9, y: 2.8, z: 5.1 }),
        fov: 56.1,
      },
      "desktop-medium": {
        position: () => ({ x: 4.9, y: 2.88, z: 6.9 }),
        target: () => ({ x: 4.9, y: 2.8, z: 5.1 }),
        fov: 56.1,
      },
      "desktop-large": {
        position: () => ({ x: 4.9, y: 2.88, z: 6.9 }),
        target: () => ({ x: 4.9, y: 2.8, z: 5.1 }),
        fov: 56.1,
      },
    },
    getDescription: () => {
      const content = screenStateManager.screenContent.Screen3;
      return content ? content.userName : null;
    },
    annotationPosition: {
      "tablet-small-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-small-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-medium-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-medium-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-large-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-large-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "desktop-small": {
        xPercent: 50,
        yPercent: 80,
      },
      "desktop-medium": {
        xPercent: 50,
        yPercent: 80,
      },
      "desktop-large": {
        xPercent: 50,
        yPercent: 80,
      },
    },
    handleClick: (moveCamera, markers) => {
      if (markers && markers[2]) {
        // Index 2 for marker 3
        moveCamera(markers[2], 2);
      }
    },
  },
  Screen4: {
    cameraView: {
      "tablet-small-landscape": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
      "tablet-small-portrait": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
      "tablet-medium-landscape": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
      "tablet-medium-portrait": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
      "tablet-large-landscape": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
      "tablet-large-portrait": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
      "desktop-small": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
      "desktop-medium": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
      "desktop-large": {
        position: () => ({ x: 6.6, y: 3.1, z: 6.2 }),
        target: () => ({ x: 9.3, y: 4.6, z: -2.1 }),
        fov: 75.3,
      },
    },
    getDescription: () => {
      const content = screenStateManager.screenContent.Screen4;
      return content ? content.userName : null;
    },
    annotationPosition: {
      "tablet-small-landscape": {
        xPercent: 40,
        yPercent: 75,
      },
      "tablet-small-portrait": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-medium-landscape": {
        xPercent: 40,
        yPercent: 75,
      },
      "tablet-medium-portrait": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-large-landscape": {
        xPercent: 40,
        yPercent: 75,
      },
      "tablet-large-portrait": {
        xPercent: 50,
        yPercent: 80,
      },
      "desktop-small": {
        xPercent: 40,
        yPercent: 75,
      },
      "desktop-medium": {
        xPercent: 40,
        yPercent: 75,
      },
      "desktop-large": {
        xPercent: 40,
        yPercent: 75,
      },
    },
    handleClick: (moveCamera, markers) => {
      if (markers && markers[2]) {
        // Index 2 for marker 3
        moveCamera(markers[2], 2);
      }
    },
  },
  Screen5: {
    cameraView: {
      "tablet-small-landscape": {
        position: () => ({ x: 6.55, y: 3.2, z: 8.65 }),
        target: () => ({ x: 19.3, y: 4.5, z: -6.1 }),
        fov: 49.1,
      },
      "tablet-small-portrait": {
        position: () => ({ x: 6.89, y: 4, z: 8.1 }),
        target: () => ({ x: 17.7, y: 4.6, z: -2 }),
        fov: 97,
      },
      "tablet-medium-landscape": {
        position: () => ({ x: 6.55, y: 3.2, z: 8.65 }),
        target: () => ({ x: 19.3, y: 4.5, z: -6.1 }),
        fov: 49.1,
      },
      "tablet-medium-portrait": {
        position: () => ({ x: 6.89, y: 4, z: 8.1 }),
        target: () => ({ x: 17.7, y: 4.6, z: -2 }),
        fov: 97,
      },
      "tablet-large-landscape": {
        position: () => ({ x: 6.55, y: 3.2, z: 8.65 }),
        target: () => ({ x: 19.3, y: 4.5, z: -6.1 }),
        fov: 49.1,
      },
      "tablet-large-portrait": {
        position: () => ({ x: 6.89, y: 4, z: 8.1 }),
        target: () => ({ x: 17.7, y: 4.6, z: -2 }),
        fov: 97,
      },
      "desktop-small": {
        position: () => ({ x: 6.55, y: 3.2, z: 8.65 }),
        target: () => ({ x: 19.3, y: 4.5, z: -6.1 }),
        fov: 49.1,
      },
      "desktop-medium": {
        position: () => ({ x: 6.55, y: 3.2, z: 8.65 }),
        target: () => ({ x: 19.3, y: 4.5, z: -6.1 }),
        fov: 49.1,
      },
      "desktop-large": {
        position: () => ({ x: 6.55, y: 3.2, z: 8.65 }),
        target: () => ({ x: 19.3, y: 4.5, z: -6.1 }),
        fov: 49.1,
      },
    },
    getDescription: () => {
      const content = screenStateManager.screenContent.Screen5;
      return content ? content.userName : null;
    },
    annotationPosition: {
      "tablet-small-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-small-portrait": {
        xPercent: 50,
        yPercent: 75,
      },
      "tablet-medium-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-medium-portrait": {
        xPercent: 50,
        yPercent: 75,
      },
      "tablet-large-landscape": {
        xPercent: 50,
        yPercent: 80,
      },
      "tablet-large-portrait": {
        xPercent: 50,
        yPercent: 75,
      },
      "desktop-small": {
        xPercent: 50,
        yPercent: 80,
      },
      "desktop-medium": {
        xPercent: 50,
        yPercent: 80,
      },
      "desktop-large": {
        xPercent: 50,
        yPercent: 80,
      },
    },
    handleClick: (moveCamera, markers) => {
      if (markers && markers[2]) {
        // Index 2 for marker 3
        moveCamera(markers[2], 2);
      }
    },
  },
  Screen6: {
    cameraView: {
      "tablet-small-landscape": {
        position: () => ({ x: 5.8, y: 1.6, z: 8.8 }),
        target: () => ({ x: 8, y: 2.1, z: -2.4 }),
        fov: 39.1,
      },
      "tablet-small-portrait": {
        position: () => ({ x: 5.8, y: 2.01, z: 7.6 }),
        target: () => ({ x: 11.7, y: 2, z: -8.4 }),
        fov: 86.4,
      },
      "tablet-medium-landscape": {
        position: () => ({ x: 5.8, y: 1.6, z: 8.8 }),
        target: () => ({ x: 8, y: 2.1, z: -2.4 }),
        fov: 39.1,
      },
      "tablet-medium-portrait": {
        position: () => ({ x: 5.8, y: 2.01, z: 7.6 }),
        target: () => ({ x: 11.7, y: 2, z: -8.4 }),
        fov: 86.4,
      },
      "tablet-large-landscape": {
        position: () => ({ x: 5.8, y: 1.6, z: 8.8 }),
        target: () => ({ x: 8, y: 2.1, z: -2.4 }),
        fov: 39.1,
      },
      "tablet-large-portrait": {
        position: () => ({ x: 5.8, y: 2.01, z: 7.6 }),
        target: () => ({ x: 11.7, y: 2, z: -8.4 }),
        fov: 86.4,
      },
      "desktop-small": {
        position: () => ({ x: 5.8, y: 1.6, z: 8.8 }),
        target: () => ({ x: 8, y: 2.1, z: -2.4 }),
        fov: 39.1,
      },
    },
    "desktop-medium": {
      position: () => ({ x: 5.8, y: 1.6, z: 8.8 }),
      target: () => ({ x: 8, y: 2.1, z: -2.4 }),
      fov: 39.1,
    },

    "desktop-large": {
      position: () => ({ x: 5.8, y: 1.6, z: 8.8 }),
      target: () => ({ x: 8, y: 2.1, z: -2.4 }),
      fov: 39.1,
    },

    getDescription: () => {
      const content = screenStateManager.screenContent.Screen6;
      return content ? content.userName : null;
    },
    annotationPosition: {
      "tablet-small-landscape": {
        xPercent: 50,
        yPercent: 75,
      },
      "tablet-small-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-medium-landscape": {
        xPercent: 50,
        yPercent: 75,
      },
      "tablet-medium-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "tablet-large-landscape": {
        xPercent: 50,
        yPercent: 75,
      },
      "tablet-large-portrait": {
        xPercent: 50,
        yPercent: 70,
      },
      "desktop-small": {
        xPercent: 50,
        yPercent: 75,
      },
      "desktop-medium": {
        xPercent: 50,
        yPercent: 75,
      },
      "desktop-large": {
        xPercent: 50,
        yPercent: 75,
      },
    },
    handleClick: (moveCamera, markers) => {
      if (markers && markers[2]) {
        // Index 2 for marker 3
        moveCamera(markers[2], 2);
      }
    },
  },
};

export const screenStateManager = {
  listeners: new Set(),
  screenContent: {
    Screen1: null,
    Screen2: null,
    Screen3: null,
    Screen4: null,
    Screen5: null,
    Screen6: null,
  },

  // Method to update content and notify listeners
  updateContent(screenName, content) {
    this.screenContent[screenName] = content;
    this.notifyListeners();
  },

  // Method to clear content
  clearContent(screenName) {
    this.screenContent[screenName] = null;
    this.notifyListeners();
  },

  // Subscribe to changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },

  // Notify all listeners of changes
  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.screenContent));
  },
};
// screenStateManager.subscribe((content) => {
//   console.log("Screen content updated:", content);
// });
export const initializeScreenManagement = ({ modelRef, db }) => {
  if (!modelRef?.current) {
    console.error("modelRef or modelRef.current is undefined");
    return () => {};
  }

  let currentTopUsers = [];
  let currentNewestUsers = [];
  let unsubscribeFirestore = null;
  const screenMeshes = {};

  const createDefaultScreenContent = () => ({
    userName: "Screen Available",
    burnedAmount: 0,
    image: null,
    isDefault: true,
    subtitle: "Burn to join the leaderboard",
  });

  const drawCircularImage = (context, image, centerX, centerY, radius) => {
    context.save();
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    context.closePath();
    context.clip();

    const aspectRatio = image.width / image.height;
    let drawWidth = radius * 2;
    let drawHeight = radius * 2;

    if (aspectRatio > 1) {
      drawWidth = drawHeight * aspectRatio;
    } else {
      drawHeight = drawWidth / aspectRatio;
    }

    const x = centerX - radius;
    const y = centerY - radius;

    context.drawImage(
      image,
      x - (drawWidth - radius * 2) / 2,
      y - (drawHeight - radius * 2) / 2,
      drawWidth,
      drawHeight
    );

    context.restore();

    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
    context.strokeStyle = "#FFFFFF";
    context.lineWidth = 1;
    context.stroke();
  };

  const loadImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      const timeout = setTimeout(() => {
        reject(new Error("Image load timed out"));
      }, 5000);

      img.onload = () => {
        clearTimeout(timeout);

        resolve(img);
      };

      img.onerror = (error) => {
        clearTimeout(timeout);
        console.error("Error loading image:", url, error);
        reject(error);
      };

      img.src = url;

      if (img.complete) {
        clearTimeout(timeout);
        resolve(img);
      }
    });
  };

  const createFormattedTextTexture = async (
    userData,
    screenIndex,
    isTopScreen
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = Math.round(512 / 1.146);
    const context = canvas.getContext("2d");

    // Create terminal-like background
    const terminalBg = "#001a1a"; // Dark cyan-tinted background
    context.fillStyle = terminalBg;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add subtle scan lines
    context.fillStyle = "rgba(0, 40, 40, 0.4)";
    const scanLineHeight = 2;
    for (let y = 0; y < canvas.height; y += scanLineHeight * 2) {
      context.fillRect(0, y, canvas.width, scanLineHeight);
    }

    // Add subtle glow effect
    const gradient = context.createRadialGradient(
      canvas.width / 2,
      canvas.height / 2,
      0,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width / 1.5
    );
    gradient.addColorStop(0, "rgba(0, 255, 255, 0.03)"); // Cyan glow
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.save();
    context.translate(canvas.height / 2, canvas.width / 2);
    context.rotate(-Math.PI / 2);

    const fontSizeAdjustment = calculateFontSizeAdjustment(userData.userName);
    const titleSize = Math.floor((canvas.height / 30) * fontSizeAdjustment);
    const userNameSize = Math.floor((canvas.height / 25) * fontSizeAdjustment);
    const burnedTextSize = Math.floor(
      (canvas.height / 32) * fontSizeAdjustment
    );
    const maxWidth = canvas.height * 0.4;

    const rankNumber = isTopScreen ? `#${screenIndex + 1}` : "";
    const rankText = isTopScreen ? "TOP BURNER" : "NEW BURNER";
    const userName = userData.userName;
    const burnedText = `Burned ${userData.burnedAmount.toLocaleString()}`;

    const titleHeight = titleSize * 1.2;
    const titleSpacing = titleSize * 1;

    let currentY = -canvas.width / 12; // Moved starting position higher up

    if (isTopScreen) {
      context.fillStyle = "rgba(255, 200, 0, 0.9)"; // Slightly transparent gold
      context.font = `bold ${titleSize}px "Courier New", monospace`; // Terminal-style font
      context.textAlign = "center";
      context.textBaseline = "middle";

      // Add text glow effect for rank number
      context.shadowColor = "rgba(255, 200, 0, 0.5)";
      context.shadowBlur = 10;
      context.fillText(rankNumber, 0, currentY);

      currentY += titleSpacing;
      context.fillText(rankText, 0, currentY);
      currentY += titleSpacing;

      // Reset shadow
      context.shadowBlur = 0;
    } else {
      context.fillStyle = "rgba(0, 255, 0, 0.9)"; // Slightly transparent terminal green
      context.font = `bold ${titleSize}px "Courier New", monospace`;
      context.textAlign = "center";
      context.textBaseline = "middle";

      // Add text glow effect
      context.shadowColor = "rgba(0, 255, 0, 0.5)";
      context.shadowBlur = 10;
      context.fillText(rankText, 0, currentY);
      currentY += titleSpacing;

      // Reset shadow
      context.shadowBlur = 0;
    }

    context.fillStyle = "rgba(200, 255, 255, 0.95)"; // Bright terminal text color with slight transparency
    context.font = `${userNameSize}px "Courier New", monospace`;
    context.shadowColor = "rgba(200, 255, 255, 0.5)";
    context.shadowBlur = 5;
    const wrappedUsername = wrapText(context, userName, maxWidth);
    wrappedUsername.forEach((line) => {
      context.fillText(line, 0, currentY);
      currentY += userNameSize * 1;
    });

    context.font = `${burnedTextSize}px "Courier New", monospace`;
    context.fillText(burnedText, 0, currentY);
    currentY += burnedTextSize * 1.4;

    // Reset shadow
    context.shadowBlur = 0;

    if (userData.image) {
      try {
        const img = await loadImage(userData.image);
        // Increased multipliers for both title size and canvas height
        const imageRadius = Math.min(titleSize * 2, canvas.height * 0.12);
        currentY += imageRadius * 0.65;
        drawCircularImage(context, img, 0, currentY, imageRadius);
      } catch (error) {
        console.error("Error loading user image:", error, userData.image);
      }
    }

    context.restore();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.center.set(0.5, 0.5);
    texture.offset.set(-0.05, 0.05);
    texture.repeat.set(1, 1);

    return texture;
  };

  const calculateFontSizeAdjustment = (username) => {
    const baseLength = 12;
    const maxLength = 20;

    if (username.length <= baseLength) return 1;
    if (username.length >= maxLength) return 0.7;
    return (
      1 - (0.3 * (username.length - baseLength)) / (maxLength - baseLength)
    );
  };

  const wrapText = (context, text, maxWidth) => {
    if (text.length > 12 && !text.includes(" ")) {
      const chunks = [];
      for (let i = 0; i < text.length; i += 8) {
        chunks.push(text.slice(i, i + 8));
      }
      return chunks;
    }

    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + " " + words[i];
      const metrics = context.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);

    const finalLines = [];
    lines.forEach((line) => {
      if (context.measureText(line).width > maxWidth) {
        for (let i = 0; i < line.length; i += 8) {
          finalLines.push(line.slice(i, i + 8));
        }
      } else {
        finalLines.push(line);
      }
    });

    return finalLines;
  };

  const initializeScreens = async () => {
    modelRef.current.traverse((child) => {
      if (child.isMesh && child.name.startsWith("Screen")) {
        const material = new THREE.MeshBasicMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          depthTest: true,
          color: 0xffffff,
        });

        createFormattedTextTexture(createDefaultScreenContent(), 0, false)
          .then((texture) => {
            material.map = texture;
            material.needsUpdate = true;
            child.material = material;
            screenMeshes[child.name] = child;
          })
          .catch((error) => {
            console.error("Error creating initial texture:", error);
          });
      }
    });
  };

  const fetchUserNames = () => {
    try {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }

      const q = query(collection(db, "results"), orderBy("createdAt", "desc"));

      unsubscribeFirestore = onSnapshot(q, (querySnapshot) => {
        const allUsers = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            userName: data.userName || "Anonymous",
            burnedAmount: Number(data.burnedAmount) || 0,
            image: data.image || null,
            createdAt: data.createdAt?.toDate() || new Date(),
          };
        });

        const newTopUsers = [...allUsers]
          .sort((a, b) => b.burnedAmount - a.burnedAmount)
          .slice(0, 4);

        const newNewestUsers = [...allUsers]
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 4);

        if (
          JSON.stringify(newTopUsers) !== JSON.stringify(currentTopUsers) ||
          JSON.stringify(newNewestUsers) !== JSON.stringify(currentNewestUsers)
        ) {
          currentTopUsers = newTopUsers;
          currentNewestUsers = newNewestUsers;
          updateScreens();
        }
      });
    } catch (error) {
      console.error("Error in fetchUserNames:", error);
    }
  };

  const getTopBurnerPosition = (screenIndex) => {
    const positions = {
      4: 3,
      5: 2,
      6: 1,
      7: 0,
    };
    return positions[screenIndex];
  };

  const getNewBurnerPosition = (screenIndex) => {
    const positions = {
      0: 3,
      1: 2,
      2: 1,
      3: 0,
    };
    return positions[screenIndex];
  };

  const updateScreens = async () => {
    const paddedTopUsers = [...currentTopUsers];
    while (paddedTopUsers.length < 4) {
      paddedTopUsers.push(createDefaultScreenContent());
    }

    const paddedNewestUsers = [...currentNewestUsers];
    while (paddedNewestUsers.length < 4) {
      paddedNewestUsers.push(createDefaultScreenContent());
    }

    for (let i = 0; i < 8; i++) {
      const screenName = `Screen${i + 1}`;
      const screen = screenMeshes[screenName];
      if (!screen) continue;

      const isTopScreen = i >= 4;
      const userData = isTopScreen
        ? paddedTopUsers[getTopBurnerPosition(i)]
        : paddedNewestUsers[getNewBurnerPosition(i)];

      try {
        if (screen.material.map) {
          screen.material.map.dispose();
        }

        const texture = await createFormattedTextTexture(
          userData,
          isTopScreen ? getTopBurnerPosition(i) : getNewBurnerPosition(i),
          isTopScreen
        );

        screen.material.map = texture;
        screen.material.needsUpdate = true;
      } catch (error) {
        console.error(`Error updating screen ${screenName}:`, error);
      }
    }
  };

  console.log("Starting screen management initialization");
  initializeScreens();
  fetchUserNames();

  return () => {
    if (unsubscribeFirestore) unsubscribeFirestore();

    Object.values(screenMeshes).forEach((screen) => {
      if (screen.material.map) {
        screen.material.map.dispose();
      }
      screen.material.dispose();
    });
  };
};
