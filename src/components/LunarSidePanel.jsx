import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Flex,
  Button,
  Text,
  Icon,
  Switch,
  FormControl,
  FormLabel,
  Grid,
  Select,
  VStack,
  HStack,
  Divider,
} from "@chakra-ui/react";
import AnimatedRadioButtons from "./3DVotiveStand/CyberButtons";
import { useRouter } from "next/router";
import {
  useUser,
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { useMusic } from "../contexts/MusicContext";
// Removed MissionControlIframe import - building video display directly
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center } from "@react-three/drei";
import * as THREE from "three";
import dynamic from "next/dynamic";

// Dynamically import the simplified music player
const SimplifiedMusicPlayer = dynamic(() => import("./SimplifiedMusicPlayer"), {
  ssr: false,
  loading: () => null
});
const MobileMusicPlayer = dynamic(() => import("./MobileMusicPlayer"), {
  ssr: false,
  loading: () => null
});

// Integrated Astronaut Viewer Component
function AstronautViewer({ modelPath, textureUrl, textureOffset, textureScale }) {
  // Model component
  function AstronautModel() {
    const { scene } = useGLTF(modelPath);
    const modelRef = useRef();
    const [texture, setTexture] = useState(null);
    
    // Clone the scene to avoid conflicts
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);
    
    // Load and apply texture
    useEffect(() => {
      if (!textureUrl) return;
      
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(textureUrl, (loadedTexture) => {
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.center = new THREE.Vector2(0.5, 0.5);
        loadedTexture.rotation = Math.PI;
        loadedTexture.repeat.set(-textureScale, textureScale);
        loadedTexture.offset.set(textureOffset.x, textureOffset.y);
        setTexture(loadedTexture);
      });
      
      return () => {
        if (texture) {
          texture.dispose();
        }
      };
    }, [textureUrl, textureOffset, textureScale]);
    
    // Apply texture to helmet
    useEffect(() => {
      if (!clonedScene || !texture) return;
      
      clonedScene.traverse((child) => {
        if (child.isMesh && child.name.toLowerCase().includes('helmet')) {
          const newMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            emissive: new THREE.Color(0x6366f1), // Lunar purple tint
            emissiveIntensity: 0.3,
            emissiveMap: texture,
            depthWrite: true,
            depthTest: true,
            side: THREE.FrontSide,
            polygonOffset: true,
            polygonOffsetFactor: -1, // Push texture slightly forward to prevent z-fighting
            polygonOffsetUnits: -1
          });
          child.material = newMaterial;
          child.renderOrder = 1; // Ensure helmet renders after body
        }
      });
    }, [clonedScene, texture]);
    
    return <primitive object={clonedScene} scale={1.2} rotation={[0, -Math.PI / 2, 0]} />;
  }
  
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 40 }}>
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <color attach="background" args={['#1e1b4b']} />
      <Center>
        <AstronautModel />
      </Center>
      <OrbitControls 
        enableZoom={true}
        enablePan={false}
        autoRotate={true}
        autoRotateSpeed={1}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
        zoomToCursor={true}
      />
    </Canvas>
  );
}

const LunarSidePanel = ({
  onButtonClick,
  is80sMode,
  toggle80sMode,
  monsterMode,
  toggleMonsterMode,
  rocketModelVisible,
  toggleRocketModel,
  toggleConstellationVisibility,
  isConstellationsVisible,
}) => {
  // Use context for music state
  const { showSpotify, setShowSpotify } = useMusic();
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const panelRef = useRef(null);
  const hotzoneSize = 25;
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [panelWidth, setPanelWidth] = useState("320px");
  const [mounted, setMounted] = useState(false);
  const sitepalIframeRef = useRef(null);
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  // Lunar-specific state
  const [selectedAstronaut, setSelectedAstronaut] = useState(null);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showAstronautModal, setShowAstronautModal] = useState(false);
  const [customizedAstronaut, setCustomizedAstronaut] = useState(null);
  
  // Astronaut customization state
  const [selectedModel, setSelectedModel] = useState('astronaut1');
  const [customImageUrl, setCustomImageUrl] = useState(null);
  const [activeTextureUrl, setActiveTextureUrl] = useState(null);
  const [textureOffset, setTextureOffset] = useState({ x: 0, y: 0 });
  const [textureScale, setTextureScale] = useState(1);
  
  // Section expansion states - only one can be expanded at a time
  const [expandedSection, setExpandedSection] = useState('video'); // 'video', 'directory', or 'none'
  const [isCustomizing, setIsCustomizing] = useState(false); // Track when user is actively customizing
  const [showCustomizerControls, setShowCustomizerControls] = useState(false); // Track if customizer controls are expanded
  
  // Update activeTextureUrl when user data is available
  useEffect(() => {
    if (user?.imageUrl && !customImageUrl) {
      setActiveTextureUrl(user.imageUrl);
    }
  }, [user, customImageUrl]);
  
  // Mock astronaut directory data
  const astronautDirectory = [
    { id: 1, name: "Armstrong", status: "Active", location: "Mare Tranquillitatis" },
    { id: 2, name: "Aldrin", status: "Active", location: "Tycho Crater" },
    { id: 3, name: "Collins", status: "Orbital", location: "Command Module" },
    { id: 4, name: "Lovell", status: "Reserve", location: "Base Alpha" },
    { id: 5, name: "Cernan", status: "EVA", location: "South Pole" },
  ];
  
  // Astronaut model options
  const astronautModels = [
    { id: 'astronaut1', name: 'Classic Astronaut', path: '/astronaut.glb' },
    { id: 'astronaut2', name: 'Space Explorer', path: '/Astronaut2.glb' },
  ];
  
  // Handle image file selection
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target.result;
        setCustomImageUrl(result);
        setActiveTextureUrl(result);
        setTextureOffset({ x: 0, y: 0 });
        setTextureScale(1);
        setShowCustomizerControls(true); // Show controls when image is selected
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Detect touch devices
  useEffect(() => {
    const isTouchCapable =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;
    setIsTouchDevice(isTouchCapable);
  }, []);

  // Handle first click to close panel and mark user interaction
  useEffect(() => {
    if (!isTextBoxVisible) return;

    const handleOutsideClick = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) {
        return;
      }
      setIsTextBoxVisible(false);
      setHasUserInteracted(true);
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isTextBoxVisible]);

  // Mouse movement detection for panel visibility
  useEffect(() => {
    if (isTouchDevice) return;

    const handleMouseMove = (event) => {
      const rightEdgeDistance = window.innerWidth - event.clientX;

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        if (rightEdgeDistance < hotzoneSize) {
          setIsTextBoxVisible(true);
        } else if (rightEdgeDistance > 300) {
          setIsTextBoxVisible(false);
        }
      }, 100);

      setDebounceTimer(timer);
    };

    if (hasUserInteracted) {
      document.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [hasUserInteracted, isTouchDevice, hotzoneSize, debounceTimer]);

  const handleButtonClick = (e) => {
    if (e) e.stopPropagation();
    setIsTextBoxVisible(!isTextBoxVisible);
    setHasUserInteracted(true);
  };

  // Update panel width based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        const isPortrait = window.innerHeight > window.innerWidth;

        if (window.innerWidth <= 768) {
          setPanelWidth("85%");
        } else if (window.innerWidth <= 1024) {
          setPanelWidth(isPortrait ? "50%" : "40%");
        } else {
          setPanelWidth(isPortrait ? "35%" : "25%");
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      handleResize(); // Initial call
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // State for video display
  const [currentVideo, setCurrentVideo] = useState(null);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const videoRef = useRef(null);
  
  // Lunar video configurations
  const lunarVideos = {
    default: "/moonRoom.jpeg",
    comm: "/moon-video-test.html",
    emergency: "/orientation.mp4"
  };
  
  // Handle CONNECT button click for AI signal
  const handleConnectClick = () => {
    console.log("🌙 CONNECT button clicked - Starting lunar transmission");
    
    // Start video transmission
    setCurrentVideo(lunarVideos.comm);
    setIsVideoActive(true);
    
    // Auto-stop after 10 seconds
    setTimeout(() => {
      setIsVideoActive(false);
      setCurrentVideo(null);
    }, 10000);
  };
  
  // Handle astronaut customization save
  const handleAstronautSave = (customization) => {
    console.log("🚀 Astronaut customization saved:", customization);
    setCustomizedAstronaut(customization);
    
    // Send customization to parent or other components as needed
    if (window.parent) {
      window.parent.postMessage({
        type: 'ASTRONAUT_CUSTOMIZED',
        data: customization
      }, '*');
    }
  };

  // Handle video ended
  const handleVideoEnded = () => {
    setIsVideoActive(false);
    setCurrentVideo(null);
  };
  
  // Section expansion handlers
  const toggleVideoSection = () => {
    setExpandedSection(expandedSection === 'video' ? 'none' : 'video');
  };
  
  const toggleDirectorySection = () => {
    setExpandedSection(expandedSection === 'directory' ? 'none' : 'directory');
  };
  
  // Calculate section heights based on expansion state
  const getSectionHeights = () => {
    const headerHeight = 48; // Panel header
    const controlsHeight = '6%'; // Very compact controls height
    
    switch (expandedSection) {
      case 'video':
        return {
          video: `calc(40% - ${headerHeight}px)`, // Reduced from 45%
          directory: '5%', // Fully collapsed - just header
          customizer: '49%', // More room than before
          controls: controlsHeight
        };
      case 'directory':
        return {
          video: `calc(12% - ${headerHeight}px)`, // Reduced from 15%  
          directory: '38%', // Slightly smaller
          customizer: '44%', // More room
          controls: controlsHeight
        };
      default: // 'none'
        return {
          video: `calc(20% - ${headerHeight}px)`, // Reduced from 25%
          directory: '10%', // Slightly smaller  
          customizer: '64%', // Much more space!
          controls: controlsHeight
        };
    }
  };
  
  const sectionHeights = getSectionHeights();

  return (
    <>
      {/* Toggle button for touch devices */}
      {isTouchDevice && !isTextBoxVisible && (
        <Button
          position="fixed"
          right="0"
          top="50%"
          transform="translateY(-50%)"
          height="100px"
          width="40px"
          zIndex="5001"
          onClick={handleButtonClick}
          className="panel-toggle-button"
          background="radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.9) 0px, rgba(139,92,246,0.4) 100px)"
          backdropFilter="blur(20px) contrast(1.1)"
          borderRadius="20px 0 0 20px"
          border="2px solid"
          borderRight="none"
          borderImage="linear-gradient(25deg, #4338ca, #6366f1, #818cf8, #a78bfa, #6366f1)"
          borderImageSlice="2"
          _hover={{
            transform: "translateY(-50%) translateX(-4px)",
            boxShadow: "-4px 0 30px rgba(99,102,241,0.6)",
          }}
          boxShadow="-2px 0 20px rgba(0,0,0,0.7)"
          transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
        >
          <Icon as={() => (
            <Box 
              width="30px" 
              height="30px" 
              borderRadius="50%"
              background="radial-gradient(circle at center, rgba(167,139,250,0.8), rgba(99,102,241,0.6))"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="1.5rem">🚀</Text>
            </Box>
          )} />
        </Button>
      )}

      {/* Main Panel with lunar theme */}
      <Box
        ref={panelRef}
        position="fixed"
        top="0"
        right="0"
        width="380px"
        height="100%"
        zIndex="5000"
        transform={isTextBoxVisible ? "translateX(0)" : "translateX(100%)"}
        transition="transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
        overflow="hidden"
        backgroundColor="transparent"
        display="flex"
        flexDirection="column"
        className="enhanced-panel lunar-panel"
        _before={{
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(to bottom right, #1e1b4b, #312e81, #4c1d95, #1e1b4b)",
          opacity: 0.95,
          zIndex: -2
        }}
        _after={{
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.3), rgba(139,92,246,0.3))",
          backgroundBlendMode: "overlay",
          zIndex: -1
        }}
      >
        {/* Panel Header */}
        <Box
          height="48px"
          borderBottom="2px solid rgba(99,102,241,0.5)"
          bg="linear-gradient(135deg, rgba(49,46,129,0.9), rgba(30,27,75,0.95))"
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="relative"
        >
          <Text
            fontSize="md"
            fontWeight="bold"
            color="#e0e7ff"
            fontFamily="monospace"
            letterSpacing="wider"
            textShadow="0 0 10px rgba(99,102,241,0.6)"
          >
            LUNAR COMMAND CENTER
          </Text>
          {/* Decorative elements */}
          <Box
            position="absolute"
            left="20px"
            width="8px"
            height="8px"
            bg="#a78bfa"
            borderRadius="50%"
            boxShadow="0 0 8px #a78bfa"
            animation="pulse 2s infinite"
          />
          <Box
            position="absolute"
            right="20px"
            width="8px"
            height="8px"
            bg="#6366f1"
            borderRadius="50%"
            boxShadow="0 0 8px #6366f1"
            animation="pulse 2s infinite 1s"
          />
        </Box>
        
        {/* Mission Control Video Display - dynamic height */}
        <Box height={sectionHeights.video} position="relative" zIndex={3} transition="height 0.3s ease">
          <Box
            position="absolute"
            inset="20px"
            bottom="40px" // Reduced space for compact CONNECT button
            bg="linear-gradient(135deg, rgba(30,27,75,0.9), rgba(49,46,129,0.8))"
            borderRadius="md"
            border="2px solid rgba(99,102,241,0.3)"
            overflow="hidden"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            {/* Clickable Header */}
            <Flex
              position="absolute"
              top="0"
              left="0"
              right="0"
              height="32px"
              bg={expandedSection === 'video' ? 
                  "linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.8))" :
                  "linear-gradient(135deg, rgba(49,46,129,0.9), rgba(30,27,75,0.95))"}
              borderBottom={expandedSection === 'video' ? 
                  "1px solid rgba(99,102,241,0.8)" : 
                  "1px solid rgba(99,102,241,0.5)"}
              alignItems="center"
              justifyContent="space-between"
              px={3}
              cursor="pointer"
              onClick={toggleVideoSection}
              _hover={{
                bg: "linear-gradient(135deg, rgba(49,46,129,0.7), rgba(30,27,75,0.8))"
              }}
              zIndex={2}
            >
              <Text
                fontSize="xs"
                fontWeight="bold"
                color="#a78bfa"
                fontFamily="monospace"
                letterSpacing="wider"
              >
                LUNAR TRANSMISSION//INFIN80
              </Text>
              <Icon
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                color="#a78bfa"
                transform={expandedSection === 'video' ? "rotate(180deg)" : "rotate(0deg)"}
                transition="transform 0.2s"
              >
                <path d="M6 9l6 6 6-6"/>
              </Icon>
            </Flex>
            
            {/* Video Content */}
            <Box
              position="absolute"
              top="32px"
              left="0"
              right="0"
              bottom="0"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {isVideoActive && currentVideo ? (
                currentVideo.endsWith('.mp4') ? (
                  <video
                    ref={videoRef}
                    src={currentVideo}
                    autoPlay
                    muted
                    onEnded={handleVideoEnded}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : currentVideo.endsWith('.html') ? (
                  <iframe
                    src={currentVideo}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                    title="Lunar Transmission"
                  />
                ) : (
                  <img
                    src={currentVideo}
                    alt="Lunar Base"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                )
              ) : (
                <Box textAlign="center" color="rgba(167,139,250,0.6)">
                  <Text fontSize="sm" fontFamily="monospace" mb={2}>
                    TRANSMISSION OFFLINE
                  </Text>
                  <Text fontSize="xs" fontFamily="monospace">
                    LUNAR BASE//STANDBY
                  </Text>
                  {/* Crosshairs */}
                  <Box
                    position="relative"
                    width="60px"
                    height="60px"
                    margin="16px auto"
                  >
                    <Box
                      position="absolute"
                      top="50%"
                      left="0"
                      right="0"
                      height="1px"
                      bg="rgba(167,139,250,0.4)"
                      transform="translateY(-50%)"
                    />
                    <Box
                      position="absolute"
                      top="0"
                      bottom="0"
                      left="50%"
                      width="1px"
                      bg="rgba(167,139,250,0.4)"
                      transform="translateX(-50%)"
                    />
                    <Box
                      position="absolute"
                      top="50%"
                      left="50%"
                      width="20px"
                      height="20px"
                      border="1px solid rgba(167,139,250,0.4)"
                      borderRadius="50%"
                      transform="translate(-50%, -50%)"
                    />
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
          
          {/* CONNECT Button - Lunar AI Signal */}
          <Flex
              position="absolute"
              bottom="8px"
              left="0"
              right="0"
              justifyContent="center"
            >
              <Button
              size="sm"
              bg="linear-gradient(135deg, rgba(99,102,241,0.8) 0%, rgba(139,92,246,0.8) 100%)"
              color="#e0e7ff"
              border="1px solid #6366f1"
              px={4}
              h="24px"
              _hover={{
                bg: "linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(139,92,246,1) 100%)",
                transform: "scale(1.02)",
                boxShadow: "0 0 15px rgba(99,102,241,0.6)"
              }}
              _active={{
                transform: "scale(0.98)"
              }}
              onClick={handleConnectClick}
              fontFamily="monospace"
              fontSize="xs"
              fontWeight="bold"
              letterSpacing="wide"
              leftIcon={
                <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" w="14px" h="14px">
                  <path d="M4.9 16.1C1 12.2 1 5.8 4.9 1.9"/>
                  <path d="M7.8 4.7a6.14 6.14 0 0 0-.8 7.5"/>
                  <circle cx="12" cy="9" r="2"/>
                  <path d="M16.2 4.8c2 2 2.26 5.11.8 7.47"/>
                  <path d="M19.1 1.9a9.96 9.96 0 0 1 0 14.1"/>
                  <path d="M9.5 18h5"/>
                  <path d="m8 22 4-11 4 11"/>
                </Icon>
              }
            >
              CONNECT
            </Button>
          </Flex>
        </Box>
        
        {/* Astronaut Directory - dynamic height */}
        <Box height={sectionHeights.directory} borderTop="1px solid rgba(167,139,250,0.3)" transition="height 0.3s ease">
          {/* Directory Header */}
          <Flex
            p={3}
            alignItems="center"
            justifyContent="space-between"
            bg={expandedSection === 'directory' ? 
                "linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.4))" :
                "rgba(49,46,129,0.3)"}
            borderBottom={expandedSection === 'directory' ? 
                "1px solid rgba(99,102,241,0.6)" : 
                "1px solid rgba(167,139,250,0.2)"}
            cursor="pointer"
            onClick={toggleDirectorySection}
            _hover={{
              bg: "rgba(49,46,129,0.5)"
            }}
          >
            <Text fontSize="xs" fontWeight="bold" color="#a78bfa" fontFamily="monospace">
              ASTRONAUT DIRECTORY//LUNAR_OPS
            </Text>
            <Icon
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              color="#a78bfa"
              transform={expandedSection === 'directory' ? "rotate(180deg)" : "rotate(0deg)"}
              transition="transform 0.2s"
            >
              <path d="M6 9l6 6 6-6"/>
            </Icon>
          </Flex>
          
          {/* Directory Content */}
          <Box
            height="calc(100% - 48px)"
            overflow="hidden"
            transition="all 0.3s ease"
            opacity={expandedSection === 'video' ? 0.3 : 1} // Dim when video is expanded
          >
            <Box p={3} overflowY="auto" height="100%">
              {/* Show condensed view when video is expanded */}
              {expandedSection === 'video' ? (
                <Box textAlign="center" py={1}>
                  <Text fontSize="xs" color="rgba(167,139,250,0.6)" fontFamily="monospace">
                    {astronautDirectory.filter(a => a.status === "Active").length} ACTIVE
                  </Text>
                  <HStack justify="center" spacing={1} mt={1}>
                    {astronautDirectory.filter(a => a.status === "Active").slice(0,3).map((astronaut, i) => (
                      <Box key={i} w="4px" h="4px" bg="#22c55e" borderRadius="50%" opacity={0.7} />
                    ))}
                  </HStack>
                </Box>
              ) : (
                <VStack spacing={2} align="stretch">
                  {astronautDirectory.map((astronaut) => (
                  <Box
                    key={astronaut.id}
                    p={2}
                    bg={selectedAstronaut?.id === astronaut.id ? "rgba(99,102,241,0.2)" : "rgba(139,92,246,0.1)"}
                    borderRadius="md"
                    border="1px solid"
                    borderColor={selectedAstronaut?.id === astronaut.id ? "#6366f1" : "rgba(167,139,250,0.3)"}
                    cursor="pointer"
                    onClick={() => setSelectedAstronaut(astronaut)}
                    transition="all 0.2s"
                    _hover={{
                      bg: "rgba(99,102,241,0.2)",
                      borderColor: "#6366f1"
                    }}
                  >
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" fontWeight="bold" color="#e0e7ff">
                          {astronaut.name}
                        </Text>
                        <Text fontSize="xs" color="#a78bfa">
                          {astronaut.location}
                        </Text>
                      </VStack>
                      <Box
                        px={2}
                        py={1}
                        bg={astronaut.status === "Active" ? "rgba(34,197,94,0.2)" : 
                           astronaut.status === "EVA" ? "rgba(251,146,60,0.2)" : 
                           "rgba(167,139,250,0.2)"}
                        borderRadius="full"
                        border="1px solid"
                        borderColor={astronaut.status === "Active" ? "#22c55e" : 
                                    astronaut.status === "EVA" ? "#fb923c" : 
                                    "#a78bfa"}
                      >
                        <Text fontSize="xs" fontWeight="bold" color="#e0e7ff">
                          {astronaut.status}
                        </Text>
                      </Box>
                    </HStack>
                  </Box>
                  ))}
                </VStack>
              )}
            </Box>
          </Box>
        </Box>
        
        {/* Astronaut Customizer - dynamic height */}
        <Box height={sectionHeights.customizer} borderTop="1px solid rgba(167,139,250,0.3)" overflow="hidden" transition="height 0.3s ease">
          {/* Customizer Header */}
          <Box
            p={2}
            bg="rgba(49,46,129,0.3)"
            borderBottom="1px solid rgba(167,139,250,0.2)"
            position="relative"
          >
            <Text fontSize="xs" fontWeight="bold" color="#a78bfa" fontFamily="monospace">
              ASTRONAUT CUSTOMIZER//BETA
            </Text>
          </Box>
          
          <Box p={3} height="calc(100% - 40px)" display="flex" flexDirection="column"> {/* Account for header */}
            {/* 3D Viewer - Full Width on Top */}
            <Box 
              bg="linear-gradient(135deg, rgba(30,27,75,0.8), rgba(49,46,129,0.6))"
              borderRadius="md"
              border="2px solid rgba(99,102,241,0.3)"
              position="relative"
              overflow="hidden"
              boxShadow="inset 0 0 20px rgba(0,0,0,0.5), 0 0 15px rgba(99,102,241,0.2)"
              height={showCustomizerControls ? "60%" : "calc(100% - 80px)"} // Adjust based on controls visibility
              mb={showCustomizerControls ? 3 : 2}
            >
              {/* Viewer Header */}
              {/* <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                height="24px"
                bg="rgba(49,46,129,0.8)"
                borderBottom="1px solid rgba(99,102,241,0.4)"
                display="flex"
                alignItems="center"
                justifyContent="center"
                zIndex={2}
              >
                <Text fontSize="xs" color="#a78bfa" fontFamily="monospace">
                  3D ASTRONAUT PREVIEW//FULL_VIEW
                </Text>
              </Box> */}
              
              {/* 3D Viewer Content - Much Larger! */}
              <Box position="absolute" top="0" left="0" right="0" bottom="0">
                <AstronautViewer
                  modelPath={astronautModels.find(m => m.id === selectedModel)?.path || '/astronaut.glb'}
                  textureUrl={activeTextureUrl}
                  textureOffset={textureOffset}
                  textureScale={textureScale}
                />
              </Box>
              
              {/* Model Selector Arrows - Positioned over viewer */}
              <HStack 
                position="absolute" 
                bottom="8px" 
                left="50%" 
                transform="translateX(-50%)"
                spacing={2}
                bg="rgba(30,27,75,0.8)"
                borderRadius="md"
                border="1px solid rgba(99,102,241,0.4)"
                p={1}
                backdropFilter="blur(5px)"
              >
                <Button
                  size="xs"
                  onClick={() => {
                    const currentIndex = astronautModels.findIndex(m => m.id === selectedModel);
                    const prevIndex = (currentIndex - 1 + astronautModels.length) % astronautModels.length;
                    setSelectedModel(astronautModels[prevIndex].id);
                  }}
                  bg="rgba(99,102,241,0.3)"
                  _hover={{ bg: "rgba(99,102,241,0.5)" }}
                  color="#e0e7ff"
                  minW="28px"
                  h="20px"
                  fontSize="sm"
                >
                  ←
                </Button>
                <Text fontSize="xs" color="#e0e7ff" minW="30px" textAlign="center" py={1}>
                  {astronautModels.findIndex(m => m.id === selectedModel) + 1}/{astronautModels.length}
                </Text>
                <Button
                  size="xs"
                  onClick={() => {
                    const currentIndex = astronautModels.findIndex(m => m.id === selectedModel);
                    const nextIndex = (currentIndex + 1) % astronautModels.length;
                    setSelectedModel(astronautModels[nextIndex].id);
                  }}
                  bg="rgba(99,102,241,0.3)"
                  _hover={{ bg: "rgba(99,102,241,0.5)" }}
                  color="#e0e7ff"
                  minW="28px"
                  h="20px"
                  fontSize="sm"
                >
                  →
                </Button>
              </HStack>
              
              {/* Corner indicators */}
              <Box position="absolute" top="4px" left="4px" width="8px" height="8px" bg="#6366f1" opacity={0.6} />
              <Box position="absolute" top="4px" right="4px" width="8px" height="8px" bg="#8b5cf6" opacity={0.6} />
              <Box position="absolute" bottom="4px" left="4px" width="8px" height="8px" bg="#a78bfa" opacity={0.6} />
              <Box position="absolute" bottom="4px" right="4px" width="8px" height="8px" bg="#6366f1" opacity={0.6} />
            </Box>
            
            {/* Controls Panel - Clean Layout */}
            <Box 
              bg="linear-gradient(135deg, rgba(49,46,129,0.4), rgba(30,27,75,0.6))"
              borderRadius="md"
              border="1px solid rgba(167,139,250,0.3)"
              p={3}
              height={showCustomizerControls ? "40%" : "auto"} // Expand when showing controls
              minHeight={showCustomizerControls ? "40%" : "60px"} // Minimum height
              maxHeight={showCustomizerControls ? "40%" : "60px"} // Constrain when collapsed
              boxShadow="inset 0 0 10px rgba(0,0,0,0.3)"
              overflow="hidden"
              display="flex"
              flexDirection="column"
              justifyContent={showCustomizerControls ? "space-between" : "center"}
              transition="all 0.3s ease"
            >
              {/* Image Upload Button */}
              <Button
                as="label"
                size="sm"
                bg="linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.3) 100%)"
                color="#e0e7ff"
                border="1px solid #6366f1"
                cursor="pointer"
                fontSize="sm"
                h="32px"
                w="100%"
                _hover={{
                  bg: "linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.5) 100%)"
                }}
                leftIcon={<Text fontSize="lg">📁</Text>}
                rightIcon={
                  <Icon
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    transform={showCustomizerControls ? "rotate(180deg)" : "rotate(0deg)"}
                    transition="transform 0.2s"
                  >
                    <path d="M6 9l6 6 6-6"/>
                  </Icon>
                }
                onClick={() => {
                  // Toggle controls visibility
                  setShowCustomizerControls(!showCustomizerControls);
                }}
              >
                CHANGE IMAGE
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
              </Button>

              {/* Texture Adjustment Controls */}
              {showCustomizerControls && activeTextureUrl && (
                <VStack spacing={2} flex={1} justify="center">
                  <Text fontSize="xs" color="#a78bfa" fontFamily="monospace" alignSelf="flex-start">
                    TEXTURE ADJUSTMENT
                  </Text>
                  
                  {/* Scale Control */}
                  <HStack spacing={3} w="100%">
                    <Text color="#a78bfa" fontSize="sm" minW="50px">Scale:</Text>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={textureScale}
                      onChange={(e) => setTextureScale(parseFloat(e.target.value))}
                      style={{
                        flex: 1,
                        height: '4px',
                        background: '#4c1d95',
                        borderRadius: '2px',
                        outline: 'none'
                      }}
                    />
                    <Text color="#e0e7ff" fontSize="sm" minW="30px" textAlign="right">
                      {textureScale.toFixed(1)}
                    </Text>
                  </HStack>
                  
                  {/* X Offset Control */}
                  <HStack spacing={3} w="100%">
                    <Text color="#a78bfa" fontSize="sm" minW="50px">X Pos:</Text>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={textureOffset.x}
                      onChange={(e) => setTextureOffset(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                      style={{
                        flex: 1,
                        height: '4px',
                        background: '#4c1d95',
                        borderRadius: '2px',
                        outline: 'none'
                      }}
                    />
                    <Text color="#e0e7ff" fontSize="sm" minW="30px" textAlign="right">
                      {textureOffset.x.toFixed(2)}
                    </Text>
                  </HStack>
                  
                  {/* Y Offset Control */}
                  <HStack spacing={3} w="100%">
                    <Text color="#a78bfa" fontSize="sm" minW="50px">Y Pos:</Text>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.01"
                      value={textureOffset.y}
                      onChange={(e) => setTextureOffset(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                      style={{
                        flex: 1,
                        height: '4px',
                        background: '#4c1d95',
                        borderRadius: '2px',
                        outline: 'none'
                      }}
                    />
                    <Text color="#e0e7ff" fontSize="sm" minW="30px" textAlign="right">
                      {textureOffset.y.toFixed(2)}
                    </Text>
                  </HStack>
                </VStack>
              )}
              
              {/* Action Buttons */}
              {showCustomizerControls && (
                <HStack spacing={2}>
                  <Button
                  size="sm"
                  bg="rgba(99,102,241,0.2)"
                  color="#e0e7ff"
                  border="1px solid #6366f1"
                  fontSize="sm"
                  h="28px"
                  flex={1}
                  _hover={{
                    bg: "rgba(99,102,241,0.3)"
                  }}
                  onClick={() => {
                    // Reset to defaults
                    setTextureOffset({ x: 0, y: 0 });
                    setTextureScale(1);
                    setCustomImageUrl(null);
                    setActiveTextureUrl(user?.imageUrl || null);
                    setShowCustomizerControls(false); // Collapse controls
                  }}
                >
                  RESET
                </Button>
                <Button
                  size="sm"
                  bg="linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0.5) 100%)"
                  color="#22c55e"
                  border="1px solid #22c55e"
                  fontSize="sm"
                  h="28px"
                  flex={2}
                  onClick={() => {
                    const customization = {
                      modelPath: astronautModels.find(m => m.id === selectedModel)?.path,
                      customImage: customImageUrl || activeTextureUrl,
                      textureOffset,
                      textureScale,
                    };
                    handleAstronautSave(customization);
                    setShowCustomizerControls(false); // Collapse controls after saving
                  }}
                  _hover={{
                    bg: "linear-gradient(135deg, rgba(34,197,94,0.5) 0%, rgba(34,197,94,0.7) 100%)"
                  }}
                >
                  ✓ APPLY
                </Button>
                </HStack>
              )}
            </Box>
          </Box>
        </Box>
        
        {/* Bottom controls - dynamic height */}
        <Box height={sectionHeights.controls} p={4} borderTop="1px solid rgba(167,139,250,0.3)" transition="height 0.3s ease">
          <HStack justify="space-between" align="center" h="100%">
            {/* Return to Earth Button - Left Side */}
            <Button
              size="sm"
              bg="rgba(99,102,241,0.2)"
              color="#e0e7ff"
              border="1px solid #6366f1"
              _hover={{
                bg: "rgba(99,102,241,0.3)",
                transform: "scale(1.05)"
              }}
              onClick={() => {
                console.log("Return to Earth Gallery");
                // Post message to parent iframe
                if (window.parent) {
                  window.parent.postMessage({
                    type: 'NAVIGATE_TO_GALLERY'
                  }, '*');
                }
              }}
            >
              Return to Earth
            </Button>
            
            {/* Music Player Button - Right Side */}
            {!showSpotify ? (
              <Button
                aria-label="Music Player"
                color="white"
                bg="rgba(139,92,246,0.3)"
                border="1px solid rgba(139,92,246,0.5)"
                size="sm"
                w="40px"
                h="40px"
                p={0}
                borderRadius="50%"
                onClick={() => setShowSpotify(true)}
                _hover={{
                  bg: "rgba(139,92,246,0.5)",
                  transform: "scale(1.1)",
                  boxShadow: "0 0 20px rgba(139,92,246,0.6)"
                }}
                transition="all 0.3s ease"
              >
                <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" w="20px" h="20px">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </Icon>
              </Button>
            ) : (
              // Minimal Music Player Widget - Inline
              <Box
                display="flex"
                alignItems="center"
                gap="6px"
                bg="rgba(30,27,75,0.95)"
                border="1px solid rgba(139,92,246,0.5)"
                borderRadius="full"
                p="6px"
                backdropFilter="blur(10px)"
              >
                {/* Spinning Album Art */}
                <Box
                  width="28px"
                  height="28px"
                  borderRadius="50%"
                  bg="linear-gradient(135deg, #6366f1, #8b5cf6)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  position="relative"
                  overflow="hidden"
                  sx={{
                    animation: "spin 3s linear infinite",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" }
                    }
                  }}
                >
                  <Text fontSize="sm">🎵</Text>
                </Box>
                
                {/* Mode Toggle */}
                <Button
                  aria-label="Toggle 80s Mode"
                  size="xs"
                  w="26px"
                  h="26px"
                  p={0}
                  bg={is80sMode ? "rgba(217,70,239,0.3)" : "rgba(99,102,241,0.2)"}
                  color="#e0e7ff"
                  border="1px solid"
                  borderColor={is80sMode ? "#d946ef" : "#6366f1"}
                  borderRadius="50%"
                  onClick={() => toggle80sMode()}
                  _hover={{
                    bg: is80sMode ? "rgba(217,70,239,0.5)" : "rgba(99,102,241,0.4)",
                    transform: "scale(1.1)"
                  }}
                  transition="all 0.3s ease"
                >
                  <Text fontSize="10px" fontWeight="bold">
                    {is80sMode ? "80" : "♪"}
                  </Text>
                </Button>
                
                {/* Skip Track Button */}
                <Button
                  aria-label="Next Track"
                  size="xs"
                  w="26px"
                  h="26px"
                  p={0}
                  bg="rgba(99,102,241,0.2)"
                  color="#e0e7ff"
                  border="1px solid #6366f1"
                  borderRadius="50%"
                  onClick={() => {
                    // Trigger skip on the hidden SimplifiedMusicPlayer
                    const skipButton = document.querySelector('.simplified-music-player button[aria-label*="Next"]');
                    if (skipButton) skipButton.click();
                  }}
                  _hover={{
                    bg: "rgba(99,102,241,0.4)",
                    transform: "scale(1.1)"
                  }}
                  transition="all 0.3s ease"
                >
                  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" w="14px" h="14px">
                    <polygon points="5 4 15 12 5 20 5 4"/>
                    <line x1="19" y1="5" x2="19" y2="19"/>
                  </Icon>
                </Button>
                
                {/* Close Button */}
                <Button
                  aria-label="Close Music Player"
                  size="xs"
                  w="24px"
                  h="24px"
                  p={0}
                  bg="rgba(239,68,68,0.2)"
                  color="#f87171"
                  border="1px solid rgba(239,68,68,0.5)"
                  borderRadius="50%"
                  onClick={() => setShowSpotify(false)}
                  _hover={{
                    bg: "rgba(239,68,68,0.4)",
                    transform: "scale(1.1)"
                  }}
                  transition="all 0.3s ease"
                >
                  <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" w="12px" h="12px">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </Icon>
                </Button>
              </Box>
            )}
          </HStack>
        </Box>
        
        {/* Hidden SimplifiedMusicPlayer for audio functionality */}
        <Box display="none">
          <SimplifiedMusicPlayer
            isVisible={showSpotify}
            onClose={() => setShowSpotify(false)}
            is80sMode={is80sMode}
            onModeChange={(enable80s) => {
              if (enable80s !== is80sMode) {
                toggle80sMode();
              }
            }}
            autoPlay={true}
          />
        </Box>
      </Box>
      
      {/* Lunar-specific styles */}
      <style jsx global>{`
        .lunar-panel {
          font-family: 'Rajdhani', monospace;
        }
        
        .lunar-panel::-webkit-scrollbar {
          width: 10px;
          background: rgba(30,27,75,0.3);
        }
        
        .lunar-panel::-webkit-scrollbar-track {
          background: linear-gradient(180deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
          border-radius: 5px;
        }
        
        .lunar-panel::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #6366f1, #8b5cf6);
          border-radius: 5px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        
        .lunar-panel::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #818cf8, #a78bfa);
          box-shadow: 0 0 10px rgba(99,102,241,0.5);
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
        
        /* Custom range input styles */
        .lunar-panel input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        
        .lunar-panel input[type="range"]::-webkit-slider-track {
          background: #4c1d95;
          height: 4px;
          border-radius: 2px;
        }
        
        .lunar-panel input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          background: #a78bfa;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          border: 1px solid #6366f1;
          box-shadow: 0 0 6px rgba(167,139,250,0.6);
          transition: all 0.2s;
        }
        
        .lunar-panel input[type="range"]::-webkit-slider-thumb:hover {
          background: #c4b5fd;
          box-shadow: 0 0 10px rgba(196,181,253,0.8);
          transform: scale(1.2);
        }
        
        .lunar-panel input[type="range"]::-moz-range-track {
          background: #4c1d95;
          height: 4px;
          border-radius: 2px;
        }
        
        .lunar-panel input[type="range"]::-moz-range-thumb {
          background: #a78bfa;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          border: 1px solid #6366f1;
          box-shadow: 0 0 6px rgba(167,139,250,0.6);
          transition: all 0.2s;
        }
      `}</style>
    </>
  );
};

// Preload astronaut models
useGLTF.preload('/astronaut.glb');
useGLTF.preload('/Astronaut2.glb');

export default React.memo(LunarSidePanel);