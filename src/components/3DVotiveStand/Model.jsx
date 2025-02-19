import React, { useEffect, useState, useRef, Suspense } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { DEFAULT_MARKERS } from "./markers";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../../utilities/firebaseClient";
import {
  createMarkerFace,
  setupVideoTextures,
  initializeScreenManagement,
} from "./modelUtilities";
// import { OrbitControls } from "@react-three/drei";
import { BoxHelper, AxesHelper, PointLightHelper } from "three";
import { DirectionalLight, PointLight, DirectionalLightHelper } from "three";
import gsap from "gsap";
import DarkClouds from "./Clouds";
import HolographicStatue from "./HolographicStatue";
import MoonScene from "./MoonLamps";
// import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { GUI } from "lil-gui";
import FloatingCandleViewer from "./CandleInteraction";
import gui from "lil-gui";
import BackgroundEffects from "./BackgroundEffects";
import FloatingPhoneViewer from "./FloatingPhoneViewer";
import coffeeSmokeVertexShader from "./shaders/coffeeSmoke/vertex.glsl";
import coffeeSmokeFragmentShader from "./shaders/coffeeSmoke/fragment.glsl";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import CoffeeSmoke from "./CoffeeSmoke";
import {
  VideoTexture,
  LinearFilter,
  DoubleSide,
  MeshBasicMaterial,
} from "three";
import ScreenModal from "./ScreenModal";
import { shaderMaterial } from "@react-three/drei";

function Model({
  scale,
  setTooltipData,
  setShowSpotify,
  setCamera,
  setMarkers,
  markers,
  modelRef,
  moveCamera,
  rotation,
  handlePointerMove,
  onButtonClick,
  controlsRef,
  showFloatingViewer,
  setShowFloatingViewer,
  setShowPhoneViewer,
  showPhoneViewer,
  onCandleSelect,
  isModalOpen,
  setIsModalOpen,
}) {
  const gltf = useGLTF("/altar.glb");
  const { actions, mixer } = useAnimations(gltf.animations, modelRef);
  const { camera, size } = useThree();
  const [results, setResults] = useState([]);
  const [shuffledResults, setShuffledResults] = useState([]);
  const [shuffledCandleIndices, setShuffledCandleIndices] = useState([]);
  const mixerRef = useRef();
  const scene = gltf.scene;
  const rotateStandsRef = useRef(null);
  // const [showSpotify, setShowSpotify] = useState(false);
  const directionalLightRef = useRef();
  const ambientLightRef = useRef();
  const hemisphereLightRef = useRef();
  const directionalLightHelperRef = useRef();
  const hemisphereLightHelperRef = useRef();
  // const guiRef = useRef();
  const box = new THREE.Box3();
  // const gui = new GUI();
  const previousCandleRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const mouseDelta = useRef({ x: 0, y: 0 });
  const previousMousePosition = useRef({ x: 0, y: 0 });

  const videoRef = useRef(null);
  const cameraPositions = {
    default: new THREE.Vector3(0, 0, 0),
    closeup: new THREE.Vector3(0, 0, 0),
  };
  const [selectedCandle, setSelectedCandle] = useState(null);
  const textureLoader = new THREE.TextureLoader();
  const [smokePosition, setSmokePosition] = useState([0, 0, 0]);

  // Configuration for screens and videos
  const SCREEN_CONFIG = {
    Screen1: { defaultVideo: "/13.mp4" },
    Screen2: { defaultVideo: "/14.mp4" },
    Screen3: { defaultVideo: "/15.mp4" },
    Screen4: { defaultVideo: "/12.mp4" },
    Screen5: { defaultVideo: "/3.mp4" },
    Screen6: { defaultVideo: "/20.mp4" },
    Screen7: { defaultVideo: "/dos.mp4" },
  };

  // Array of alternate videos that can be randomly selected
  const ALTERNATE_VIDEOS = [
    "/hot.mp4",
    "/angel.mp4",
    "/headroom.mp4",
    "/80s.mp4",
    "/mario.mp4",

    "/nos1.mp4",
    "/nos2.mp4",
    "/madonna.mp4",
  ];

  // Separate state for each screen
  const [screen1Video, setScreen1Video] = useState(
    SCREEN_CONFIG.Screen1.defaultVideo
  );
  const [screen2Video, setScreen2Video] = useState(
    SCREEN_CONFIG.Screen2.defaultVideo
  );
  const [screen3Video, setScreen3Video] = useState(
    SCREEN_CONFIG.Screen3.defaultVideo
  );
  const [screen4Video, setScreen4Video] = useState(
    SCREEN_CONFIG.Screen4.defaultVideo
  );
  const [screen5Video, setScreen5Video] = useState(
    SCREEN_CONFIG.Screen5.defaultVideo
  );
  const [screen6Video, setScreen6Video] = useState(
    SCREEN_CONFIG.Screen6.defaultVideo
  );
  const [screen7Video, setScreen7Video] = useState(
    SCREEN_CONFIG.Screen7.defaultVideo
  );

  // Map screen names to their state setters
  const screenSetters = {
    Screen1: setScreen1Video,
    Screen2: setScreen2Video,
    Screen3: setScreen3Video,
    Screen4: setScreen4Video,
    Screen5: setScreen5Video,
    Screen6: setScreen6Video,
    Screen7: setScreen7Video,
  };

  const getRandomAlternateVideo = () => {
    const randomIndex = Math.floor(Math.random() * ALTERNATE_VIDEOS.length);
    return ALTERNATE_VIDEOS[randomIndex];
  };

  const handleCandleClick = (event) => {
    event.stopPropagation();

    if (showFloatingViewer) return;

    const mouse = new THREE.Vector2();
    mouse.x =
      (event.nativeEvent.offsetX / event.nativeEvent.target.clientWidth) * 2 -
      1;
    mouse.y =
      -(event.nativeEvent.offsetY / event.nativeEvent.target.clientHeight) * 2 +
      1;

    // After your model loads, create a compound physics body for it

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersectableObjects = [];
    modelRef.current.traverse((object) => {
      if (
        object.name === "Object_5" ||
        object.parent?.name === "Object_5" ||
        object.name.startsWith("Boombox") ||
        object.name.toLowerCase().includes("ball") ||
        object.name.startsWith("VCANDLE") ||
        object.name.startsWith("ComputerFrame") ||
        object.name.startsWith("Screen")
      ) {
        // console.log("Found clickable object:", object.name); // Debug log
        intersectableObjects.push(object);

        // Handle VCANDLE children
        if (object.name.startsWith("VCANDLE")) {
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
      }
    });

    const intersects = raycaster.intersectObjects(intersectableObjects, true);

    if (intersects.length > 0) {
      const hitObject = intersects[0].object;

      // Handle screen clicks
      if (hitObject.name.startsWith("Screen")) {
        const screenName = hitObject.name;

        // Check if we have a valid screen config
        if (!SCREEN_CONFIG[screenName]) {
          console.error(`No configuration found for screen: ${screenName}`);
          return;
        }

        const setVideo = screenSetters[screenName];
        const isDefaultVideo =
          hitObject.userData.currentVideo ===
          SCREEN_CONFIG[screenName].defaultVideo;

        if (isDefaultVideo) {
          const newVideo = getRandomAlternateVideo();
          setVideo(newVideo);
          hitObject.userData.currentVideo = newVideo;
        } else {
          const defaultVideo = SCREEN_CONFIG[screenName].defaultVideo;
          setVideo(defaultVideo);
          hitObject.userData.currentVideo = defaultVideo;
        }
        return;
      }

      if (hitObject.name.startsWith("ComputerFrame")) {
        // console.log("Laptop click detected");
        // // console.log("Modal state before:", isModalOpen);
        // console.log(
        //   "Is setIsModalOpen a function?",
        //   typeof setIsModalOpen === "function"
        // );

        try {
          setIsModalOpen(true);
          // console.log("setIsModalOpen called successfully");

          // Force a timeout to check the state after update
          setTimeout(() => {
            // console.log("Modal state after timeout:", isModalOpen);
          }, 100);
        } catch (error) {
          console.error("Error setting modal state:", error);
        }
        return;
      }

      // Handle other clicks
      if (
        hitObject.name === "Object_5" ||
        hitObject.parent?.name === "Object_5.001"
      ) {
        const modal = document.getElementById("phoneModal");
        if (modal) {
          modal.style.display = "flex";
          modal.onclick = (e) => {
            if (e.target === modal) {
              modal.style.display = "none";

              // Use a slight delay in case the menu is re-rendering
              setTimeout(() => {
                const phoneScreen = document.querySelector(".phone-screen");
                if (phoneScreen) {
                  phoneScreen.classList.remove("active");
                }
              }, 10);
            }
          };
        }

        return;
      }

      if (
        hitObject.name.startsWith("Boombox") ||
        (hitObject.parent && hitObject.parent.name.startsWith("Boombox"))
      ) {
        // console.log("Boombox clicked!");
        setShowSpotify((prev) => !prev);
        return;
      }

      if (hitObject.name.toLowerCase().includes("ball")) {
        // console.log("Ball clicked!");
        const modal = document.getElementById("magic8Modal");
        if (modal) {
          modal.style.display = "flex";
        }
        return;
      }

      // Handle candle click
      let candleParent = hitObject;
      while (candleParent && !candleParent.name.startsWith("VCANDLE")) {
        candleParent = candleParent.parent;
      }

      if (candleParent && candleParent.userData.hasUser) {
        // console.log("Found candle with user data:", candleParent.name);
        const candleData = {
          userName: candleParent.userData.userName,
          message: candleParent.userData.message,
          image: candleParent.userData.image,
          burnedAmount: candleParent.userData.burnedAmount,
        };

        // console.log("Candle data:", candleData);
        onCandleSelect(candleData);
        setShowFloatingViewer(true);
      }
    }
  };

  // // Helper function to create and setup a video element with iOS support
  // const createVideoElement = (src) => {
  //   const video = document.createElement("video");

  //   // Essential attributes for iOS
  //   video.playsInline = true;
  //   video.muted = true;
  //   video.loop = true;
  //   video.autoplay = true;
  //   video.crossOrigin = "anonymous";
  //   video.setAttribute("playsinline", "true");
  //   video.setAttribute("webkit-playsinline", "true");
  //   video.src = src;

  //   // Return the video element immediately without trying to play
  //   return video;
  // };
  // // At the top of your component
  const createMediaElement = (src) => {
    const mediaInfo = {
      type: "video",
      element: null,
      src: src,
    };

    const video = document.createElement("video");
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

    // Set properties based on which video
    if (src === "/13.mp4") {
      video.muted = true; // Only mute the default looping video
      video.loop = true;
    } else {
      video.muted = false; // All other videos should have sound
      video.loop = false;
      video.volume = 0.5;
    }

    video.src = src;
    mediaInfo.element = video;
    return mediaInfo;
  };

  // Then in your useEffect
  Object.entries(SCREEN_CONFIG).forEach(([screenName, config]) => {
    useEffect(() => {
      if (!modelRef.current) return;

      const screen = modelRef.current.getObjectByName(screenName);
      if (!screen) {
        // console.log(`Screen not found: ${screenName}`);
        return;
      }
      let texture; // Declare texture here
      let material;
      // console.log(`Initializing ${screenName}`); // Debug initialization

      const currentVideo =
        screenName === "Screen1"
          ? screen1Video
          : screenName === "Screen2"
          ? screen2Video
          : screenName === "Screen3"
          ? screen3Video
          : screenName === "Screen4"
          ? screen4Video
          : screenName === "Screen5"
          ? screen5Video
          : screenName === "Screen6"
          ? screen6Video
          : screen7Video;

      const mediaInfo = createMediaElement(currentVideo);
      screen.userData.currentVideo = currentVideo;

      const video = mediaInfo.element;
      // Create and setup texture
      texture = new VideoTexture(mediaInfo.element);
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.format = THREE.RGBAFormat;
      texture.anisotropy = 16;
      texture.rotation = Math.PI / -2;
      texture.center.set(0.5, 0.5);
      texture.flipY = false;

      // Apply scaling for alternate videos
      if (currentVideo !== config.defaultVideo) {
        texture.repeat.set(1.1, 1);
        texture.offset.set(-0.05, 0);
      }

      // Create and apply material
      material = new MeshBasicMaterial({
        map: texture,
        side: DoubleSide,
        transparent: false,
        opacity: 1,
        color: 0xffffff,
      });

      screen.material = material;
      screen.material.needsUpdate = true;
      const startPlayback = async () => {
        try {
          // console.log(`Attempting to play ${screenName}`);
          // Start all default videos playing immediately
          if (currentVideo === SCREEN_CONFIG[screenName].defaultVideo) {
            video.muted = true;
            video.loop = true;
            await video.play();
          } else {
            // For alternate videos (after clicks)
            video.muted = false;
            video.loop = false;
            video.volume = 0.5;
            try {
              await video.play();
            } catch (e) {
              // If autoplay with sound fails, start muted and unmute on interaction
              video.muted = true;
              await video.play();
              const unmuteOnInteraction = () => {
                video.muted = false;
                video.volume = 0.5;
                document.removeEventListener("click", unmuteOnInteraction);
              };
              document.addEventListener("click", unmuteOnInteraction);
            }
          }
        } catch (error) {
          console.error(`Playback error for ${screenName}:`, error);
          // Add retry logic for initial load
          if (currentVideo === SCREEN_CONFIG[screenName].defaultVideo) {
            setTimeout(startPlayback, 500);
          }
        }
      };

      // Try to start playback both on loadedmetadata and loadeddata
      video.addEventListener("loadedmetadata", () => {
        // console.log(`Metadata loaded for ${screenName}`);
        startPlayback();
      });

      video.addEventListener("loadeddata", () => {
        // console.log(`Data loaded for ${screenName}`);
        startPlayback();
      });

      return () => {
        // console.log(`Cleaning up ${screenName}`); // Debug cleanup
        if (video) {
          video.pause();
          video.src = "";
          video.load();
        }
        if (texture) {
          texture.dispose();
        }
        if (material) {
          material.dispose();
        }
      };
    }, [
      modelRef.current,
      screenName === "Screen1"
        ? screen1Video
        : screenName === "Screen2"
        ? screen2Video
        : screenName === "Screen3"
        ? screen3Video
        : screenName === "Screen4"
        ? screen4Video
        : screenName === "Screen5"
        ? screen5Video
        : screenName === "Screen6"
        ? screen6Video
        : screen7Video,
    ]);
  });

  useEffect(() => {
    const pointLight1 = new THREE.PointLight(0x01ffed, 3.5);
    pointLight1.position.set(1, 43, -24); // Adjusted position
    pointLight1.decay = 2;
    pointLight1.castShadow = true; // Optional: enables shadows
    const pointLight2 = new THREE.PointLight(0xa6ffff, 10);
    pointLight2.position.set(-43, 57, 64); // Adjusted position
    pointLight2.decay = 2;
    pointLight2.castShadow = true;
    const lightHelper = new THREE.PointLightHelper(pointLight2, 15);
    // scene.add(pointLight1);
    // scene.add(pointLight2);
    // scene.add(lightHelper);

    const ambientLight = new THREE.AmbientLight(0x888888, 1.1);
    const hemiLight = new THREE.HemisphereLight(0x7300ff, 0xff0000, 1);
    hemiLight.position.set(32, 33, 89);

    // scene.add(ambientLight);
    scene.add(hemiLight);

    return () => {
      // scene.remove(directionalLight);
      scene.remove(ambientLight);
      scene.remove(hemiLight);
      scene.remove(pointLight1);
      scene.remove(pointLight2);
      // scene.remove(hemisphereLight);
    };
  }, [scene]);

  useEffect(() => {
    if (!modelRef.current) {
      return;
    }

    // First, compute the bounding box
    const boundingBox = new THREE.Box3().setFromObject(modelRef.current);

    // Get the center and dimensions
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    const size = new THREE.Vector3();
    boundingBox.getSize(size);

    console.log("Model dimensions:", {
      width: size.x,
      height: size.y,
      depth: size.z,
      center: center,
    });

    // Reset model position first
    modelRef.current.position.set(0, 0, 0);

    // Move the model up to compensate for the negative center
    modelRef.current.position.y = 0; // Offset to center vertically

    // // Update OrbitControls target to the new center
    // if (controlsRef?.current) {
    //   controlsRef.current.target.set(0, , 0); // Look at middle height of centered model
    //   controlsRef.current.update();
    // }

    // Add visual helpers for debugging
    // const boxHelper = new THREE.BoxHelper(modelRef.current, 0x00ff00);
    // scene.add(boxHelper);

    // // Add axes helper at origin
    // const axesHelper = new THREE.AxesHelper(10);
    // scene.add(axesHelper);

    // console.log("New model position:", modelRef.current.position);
  }, [modelRef.current, controlsRef?.current]);

  // useEffect(() => {
  //   if (typeof setMarkers === "function") {
  //     setMarkers(DEFAULT_MARKERS);
  //   }
  // }, [setMarkers]);

  // // In Model.jsx
  // useEffect(() => {
  //   if (!modelRef.current) return;

  //   // setupVideoTextures(modelRef);

  //   const markerRefs = [];

  //   markers.forEach((marker, index) => {
  //     try {
  //       const markerFace = createMarkerFace(index);
  //       markerFace.position.copy(marker.position);

  //       // Ensure these properties are set
  //       markerFace.isMarker = true;
  //       markerFace.markerIndex = index;

  //       if (gltf.scene) {
  //         gltf.scene.add(markerFace);
  //         markerRefs.push(markerFace);
  //       }
  //     } catch (error) {
  //       console.error("Error adding marker:", error);
  //     }
  //   });

  //   const updateMarkers = () => {
  //     markerRefs.forEach((marker) => {
  //       if (marker && camera) {
  //         const markerWorldPos = new THREE.Vector3();
  //         marker.getWorldPosition(markerWorldPos);

  //         const cameraWorldPos = new THREE.Vector3();
  //         camera.getWorldPosition(cameraWorldPos);

  //         const direction = cameraWorldPos.clone().sub(markerWorldPos);
  //         const rotationMatrix = new THREE.Matrix4();
  //         rotationMatrix.lookAt(
  //           direction,
  //           new THREE.Vector3(0, 0, 0),
  //           new THREE.Vector3(0, 1, 0)
  //         );
  //         marker.setRotationFromMatrix(rotationMatrix);
  //       }
  //     });
  //   };

  //   let animationId;
  //   const animate = () => {
  //     updateMarkers();
  //     animationId = requestAnimationFrame(animate);
  //   };
  //   animationId = requestAnimationFrame(animate);

  //   return () => {
  //     cancelAnimationFrame(animationId);
  //     markerRefs.forEach((marker) => {
  //       if (marker && marker.parent) {
  //         marker.parent.remove(marker);
  //       }
  //     });
  //   };
  // }, [markers, camera, gltf.scene]);

  useEffect(() => {
    if (!modelRef.current || !actions) return;

    const rotationPivot = modelRef.current.getObjectByName("RotationPivot");
    const consoleObject = modelRef.current.getObjectByName("Console");

    // Make console clickable
    if (consoleObject && consoleObject.isMesh) {
      consoleObject.raycast = new THREE.Mesh().raycast;
    }

    const rotateStands = () => {
      if (rotateStandsRef.current?.isRotating) return;

      rotateStandsRef.current = { isRotating: true };

      gsap.to(rotationPivot.rotation, {
        y: rotationPivot.rotation.y + Math.PI,
        duration: 4,
        ease: "power1.inOut",
        onComplete: () => {
          rotationPivot.rotation.y %= 2 * Math.PI;
          rotateStandsRef.current.isRotating = false;
        },
      });
    };

    // Explicitly set up console for interaction
    if (consoleObject) {
      consoleObject.userData.clickHandler = rotateStands;
      consoleObject.userData.interactive = true;
    }

    return () => {
      if (consoleObject) {
        delete consoleObject.userData.clickHandler;
        delete consoleObject.userData.interactive;
      }
    };
  }, [modelRef.current, actions]);
  const handleClick = (event) => {
    if (event.object.userData.clickHandler) {
      event.object.userData.clickHandler();
    }
  };

  useEffect(() => {
    if (gltf.animations.length) {
      mixerRef.current = new THREE.AnimationMixer(gltf.scene);
      const animationClip = gltf.animations.find((clip) =>
        clip.name.startsWith("Take 001")
      );
      if (animationClip) {
        const action = mixerRef.current.clipAction(animationClip);
        action.play();
      }
    }
  }, [gltf]);

  // Fetch results from Firestore
  useEffect(() => {
    const q = query(collection(db, "results"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedResults = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        userName: doc.data().userName || "Anonymous",
        image: doc.data().image,
        message: doc.data().message,
        burnedAmount: doc.data().burnedAmount || 1,
      }));
      setResults(fetchedResults);
    });
    return () => unsubscribe();
  }, []);

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

  const applyUserImageToLabel = (candle, imageUrl) => {
    // console.log("Applying image to candle:", candle.name, imageUrl);

    // Find the Label2 mesh in the candle's children
    const label = candle.children.find((child) =>
      child.name.includes("Label2")
    );
    // console.log("Found label:", label?.name);

    if (label && imageUrl) {
      // Create a new texture loader
      const textureLoader = new THREE.TextureLoader();

      // Load the image as a texture
      textureLoader.load(
        imageUrl,
        (texture) => {
          // console.log("Texture loaded successfully for", candle.name);
          // Create a new material with the loaded texture
          const material = new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide,
          });

          // Apply texture settings
          texture.encoding = THREE.sRGBEncoding;
          texture.flipY = false;
          texture.needsUpdate = true;

          // Apply the new material to the label
          label.material = material;
          label.material.needsUpdate = true;
        },
        undefined,
        (error) => {
          // console.error("Error loading texture:", error);
        }
      );
    } else {
      console.warn("Label2 not found or no image URL provided", {
        hasLabel: !!label,
        hasImageUrl: !!imageUrl,
      });
    }
  };

  useEffect(() => {
    if (results.length === 0 || !modelRef.current) {
      // console.log("No results or modelRef not ready");
      return;
    }

    const DEFAULT_IMAGE = "Triumph.jpg";
    // console.log("Processing results:", results.length, "candles");

    const availableIndices = [
      "001",
      "002",
      "003",
      "004",
      "005",
      "006",
      "007",
      "008",
    ];

    const selectedIndices = availableIndices
      .sort(() => Math.random() - 0.5)
      .slice(0, results.length);

    // console.log("Selected candle indices:", selectedIndices);

    // First reset ALL candles
    modelRef.current.traverse((child) => {
      if (child.name.startsWith("VCANDLE")) {
        const flame = findCandleComponent(child, "FLAME");
        const label = child.children.find((c) => c.name.includes("Label2"));

        // Clean up existing textures and materials
        if (label && label.material) {
          if (label.material.map) {
            label.material.map.dispose();
          }
          label.material.dispose();

          // Reset to basic material
          label.material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide,
          });
        }

        // Reset candle state
        child.userData = {
          hasUser: false,
          userName: null,
          image: null,
          message: null,
          burnedAmount: 0,
          meltingProgress: 0,
        };

        if (flame) {
          flame.visible = false;
        }
      }
    });

    // Then activate selected candles with user data
    results.forEach((result, index) => {
      const paddedIndex = selectedIndices[index];
      if (!paddedIndex) return;

      const candleName = `VCANDLE${paddedIndex}`;
      const candle = modelRef.current.getObjectByName(candleName);

      if (candle) {
        // console.log(`Setting up candle ${candleName} with data:`, {
        //   userName: result.userName,
        //   hasImage: !!result.image,
        //   message: result.message?.substring(0, 20) + "...",
        // });

        // Set up the candle
        candle.userData = {
          hasUser: true,
          userName: result.userName || "Anonymous",
          image: result.image,
          message: result.message,
          burnedAmount: result.burnedAmount || 1,
          meltingProgress: 0,
        };

        // Apply user image if available
        if (result.image) {
          applyUserImageToLabel(candle, result.image);
        }

        const flame = findCandleComponent(candle, "FLAME");
        if (flame) {
          flame.visible = true;
        }
      }
    });

    // Finally, apply default image to unused candles
    availableIndices.forEach((index) => {
      if (!selectedIndices.includes(index)) {
        const candleName = `VCANDLE${index}`;
        const candle = modelRef.current.getObjectByName(candleName);
        if (candle) {
          // console.log(`Applying default image to unused candle ${candleName}`);

          // Make the candle selectable with default data
          candle.userData = {
            hasUser: true, // Set to true to make it selectable
            userName: "Triumph",
            image: DEFAULT_IMAGE,
            message: "In memory of triumph",
            burnedAmount: 1,
            meltingProgress: 0,
          };

          applyUserImageToLabel(candle, DEFAULT_IMAGE);
          const flame = findCandleComponent(candle, "FLAME");
          if (flame) {
            flame.visible = false;
          }
        }
      }
    });

    // Cleanup function
    return () => {
      modelRef.current?.traverse((child) => {
        if (child.name.startsWith("VCANDLE")) {
          const label = child.children.find((c) => c.name.includes("Label2"));
          if (label?.material) {
            if (label.material.map) {
              label.material.map.dispose();
            }
            label.material.dispose();
          }
        }
      });
    };
  }, [results, modelRef.current]);
  // Set Markers
  useEffect(() => {
    if (typeof setMarkers === "function") setMarkers(DEFAULT_MARKERS);
  }, [setMarkers]);

  return (
    <>
      {/* <BackgroundEffects /> */}
      <primitive
        ref={modelRef}
        object={gltf.scene}
        // position={[2.4, 12.7, 37.4]}
        scale={scale}
        rotation={rotation}
        onClick={(e) => {
          e.stopPropagation();
          if (!showFloatingViewer) {
            handleCandleClick(e);
          }
        }}
        onPointerMove={(e) => {
          if (!showFloatingViewer) {
            handlePointerMove(e);
          }
        }}
        style={{
          pointerEvents: showFloatingViewer ? "none" : "auto",
        }}
      />

      <DarkClouds />
      <HolographicStatue />
      {/* <MoonScene modelRef={modelRef} /> */}
      {/* <Suspense fallback={null}>
        <CoffeeSmoke />
      </Suspense> */}
    </>
  );
}
export default Model;
