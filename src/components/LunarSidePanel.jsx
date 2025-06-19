import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Flex,
  Button,
  Text,
  Icon,
  VStack,
  HStack,
} from "@chakra-ui/react";
import {
  useUser,
} from "@clerk/nextjs";
import { useMusic } from "../contexts/MusicContext";
// Removed MissionControlIframe import - building video display directly
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import dynamic from "next/dynamic";
import EnhancedAstronautViewer from './EnhancedAstronautViewer';

// Dynamically import the simplified music player
const MobileMusicPlayer = dynamic(() => import("./MobileMusicPlayer"), {
  ssr: false,
  loading: () => null
});

// Removed inline AstronautViewer component - now using modal viewer only

const LunarSidePanel = ({
  is80sMode,
  toggle80sMode,
  rocketModelVisible,
}) => {
  // Use context for music state
  const { 
    showSpotify, 
    setShowSpotify, 
    audioRef, 
    setIsPlaying,
  } = useMusic();
  const [isTextBoxVisible, setIsTextBoxVisible] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const panelRef = useRef(null);
  const [musicPlayerControls, setMusicPlayerControls] = useState(null);
  const hotzoneSize = 25;
  
  // Callback to receive controls from MobileMusicPlayer
  const handleMusicControlsReady = useCallback((controls) => {
    setMusicPlayerControls(controls);
  }, []);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const { user } = useUser();

  // Lunar-specific state
  const [selectedAstronaut, setSelectedAstronaut] = useState(null);
  const [customizedAstronaut, setCustomizedAstronaut] = useState(null);
  
  // Astronaut customization state
  const [selectedModel, setSelectedModel] = useState('astronaut1');
  const [customImageUrl, setCustomImageUrl] = useState(null);
  const [helmetTextureUrl, setHelmetTextureUrl] = useState(null); // Separate helmet texture
  const [suitTextureUrl, setSuitTextureUrl] = useState(null); // Separate suit texture
  const [textureOffset, setTextureOffset] = useState({ x: 0, y: 0 });
  const [textureScale, setTextureScale] = useState(1);
  const [currentTextureIndex, setCurrentTextureIndex] = useState(0);
  
  // Section expansion states - only one can be expanded at a time
  const [expandedSection, setExpandedSection] = useState('video'); // 'video', 'directory', or 'none'
  const [showEnhancedViewer, setShowEnhancedViewer] = useState(false); // Track enhanced viewer modal
  
  // Update helmet texture when user data is available - only on initial load
  useEffect(() => {
    if (user?.imageUrl && !helmetTextureUrl) {
      setHelmetTextureUrl(user.imageUrl);
    }
  }, [user]); // Only depend on user to prevent resets
  
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
    // { id: 'astronaut1', name: 'Classic Astronaut', path: '/astronaut.glb' },
    { id: 'astronaut2', name: 'Space Explorer', path: '/Astronaut2.glb' },
  ];
  
  // Predefined texture options from astronaut_colors folder
  const textureOptions = [
    { id: 'galactic', name: 'Galactic', path: '/astronaut_colors/Studio_Ochi_Astronauts_Gallactic.png' },
    { id: 'origin', name: 'Origin', path: '/astronaut_colors/Studio_Ochi_Astronauts_Origin.png' },
    { id: 'spaxe', name: 'Spaxe', path: '/astronaut_colors/Studio_Ochi_Astronauts_Spaxe.png' },
    { id: 'generic1', name: 'Generic 1', path: '/astronaut_colors/Studio_Ochi_Astronauts_Generic_01.png' },
    { id: 'generic2', name: 'Generic 2', path: '/astronaut_colors/Studio_Ochi_Astronauts_Generic_02.png' },
    { id: 'generic3', name: 'Generic 3', path: '/astronaut_colors/Studio_Ochi_Astronauts_Generic_03.png' },
    { id: 'people1', name: 'Pro People 1', path: '/astronaut_colors/Studio Ochi Professional People 01.png' },
    { id: 'people2', name: 'Pro People 2', path: '/astronaut_colors/Studio Ochi Professional People 02.png' },
    { id: 'people3', name: 'Pro People 3', path: '/astronaut_colors/Studio Ochi Professional People 03.png' },
    { id: 'people4', name: 'Pro People 4', path: '/astronaut_colors/Studio Ochi Professional People 04.png' },
    { id: 'people5', name: 'Pro People 5', path: '/astronaut_colors/Studio Ochi Professional People 05.png' },
    { id: 'people6', name: 'Pro People 6', path: '/astronaut_colors/Studio Ochi Professional People 06.png' },
  ];
  
  // Handle image file selection (for helmet)
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target.result;
        setCustomImageUrl(result);
        setHelmetTextureUrl(result); // Set helmet texture specifically
        setTextureOffset({ x: 0, y: 0 });
        setTextureScale(1);
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
      {/* Toggle button - always visible when panel is hidden */}
      {!isTextBoxVisible && (
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
                    {astronautDirectory.filter(a => a.status === "Active").slice(0,3).map((_, i) => (
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
          
          <Box p={3} height="calc(100% - 40px)" display="flex" flexDirection="column" alignItems="center" justifyContent="center"> {/* Account for header */}
            {/* Simplified Customizer Section - Just a launch button */}
            <Box 
              bg="linear-gradient(135deg, rgba(30,27,75,0.8), rgba(49,46,129,0.6))"
              borderRadius="md"
              border="2px solid rgba(99,102,241,0.3)"
              position="relative"
              overflow="hidden"
              boxShadow="inset 0 0 20px rgba(0,0,0,0.5), 0 0 15px rgba(99,102,241,0.2)"
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              p={6}
              width="100%"
            >
              {/* Launch Customizer Button */}
              <Button
                bg="rgba(99,102,241,0.2)"
                color="#e0e7ff"
                border="1px solid #6366f1"
                size="sm"
                w="100%"
                _hover={{
                  bg: "rgba(99,102,241,0.3)",
                  borderColor: "#818cf8"
                }}
                _active={{
                  transform: "scale(0.98)"
                }}
                onClick={() => setShowEnhancedViewer(true)}
                fontFamily="monospace"
                fontSize="sm"
              >
                Customize Astronaut
              </Button>
              
            </Box>
          </Box>
        </Box>
        
        {/* Bottom controls - dynamic height */}
        <Box height={sectionHeights.controls} p={4} borderTop="1px solid rgba(167,139,250,0.3)" transition="height 0.3s ease">
          <HStack justify="space-between" align="center" h="100%">
            {/* Exit/Reset Button - Left Side */}
            <Button
              aria-label="Exit to Home"
              size="sm"
              bg={is80sMode ? "rgba(255, 0, 255, 0.2)" : "rgba(99,102,241,0.2)"}
              color={is80sMode ? "#67e8f9" : "#e0e7ff"}
              border={is80sMode ? "1px solid #ff00ff" : "1px solid #6366f1"}
              borderRadius="full"
              boxShadow={is80sMode ?
                "0 0 10px rgba(255, 0, 255, 0.4), inset 0 0 6px rgba(0, 255, 255, 0.2)" :
                "0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 6px rgba(6, 182, 212, 0.2)"
              }
              _hover={{
                bg: is80sMode ? "rgba(255, 0, 255, 0.3)" : "rgba(99,102,241,0.3)",
                transform: "scale(1.08)",
                boxShadow: is80sMode ?
                  "0 0 15px rgba(255, 0, 255, 0.6), 0 0 25px rgba(0, 255, 255, 0.3)" :
                  "0 0 15px rgba(6, 182, 212, 0.5)",
              }}
              onClick={() => {
                console.log("🌍 Exit button clicked - Returning to Earth");
                // Send message to return to gallery
                window.postMessage({ type: 'NAVIGATE_TO_GALLERY' }, '*');
                
                // Reset lunar-specific states
                setSelectedAstronaut(null);
                setExpandedSection('video');
                
                // After a short delay to ensure scene has switched, reset the rocket state
                setTimeout(() => {
                  // Send a message to reset rocket state in the gallery
                  window.postMessage({ type: 'RESET_ROCKET_STATE' }, '*');
                  
                  // Also try to click the rocket button if it exists and is visible
                  const rocketButton = document.querySelector('[aria-label="Rocket Mode"]');
                  if (rocketButton && rocketModelVisible) {
                    console.log('🚀 Clicking rocket button to reset state');
                    rocketButton.click();
                  }
                }, 500); // Half second delay to ensure scene switch completes
              }}
              w="40px"
              h="40px"
              p={0}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                w="20px"
                h="20px"
              >
                <path d="m16 17 5-5-5-5"/>
                <path d="M21 12H9"/>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              </Icon>
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
                    // Skip to next track using music player controls
                    if (musicPlayerControls && musicPlayerControls.skipTrack) {
                      musicPlayerControls.skipTrack();
                    }
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
                  onClick={() => {
                    // Stop the music and hide the player
                    if (audioRef.current && !audioRef.current.paused) {
                      audioRef.current.pause();
                      setIsPlaying(false);
                    }
                    setShowSpotify(false);
                  }}
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
        
        {/* Removed SimplifiedMusicPlayer to prevent track changes on scene transition */}
        
        {/* Hidden MobileMusicPlayer for consistent music handling */}
        <Box display="none">
          <MobileMusicPlayer
            isVisible={showSpotify}
            onClose={() => {
              if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
                setIsPlaying(false);
              }
              setShowSpotify(false);
            }}
            is80sMode={is80sMode}
            onModeChange={(enable80s) => {
              if (enable80s !== is80sMode) {
                toggle80sMode();
              }
            }}
            autoPlay={false}
            hideUI={true}
            onControlsReady={handleMusicControlsReady}
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
      
      {/* Enhanced Astronaut Viewer Modal with all customization controls */}
      <EnhancedAstronautViewer
        isOpen={showEnhancedViewer}
        onClose={() => setShowEnhancedViewer(false)}
        modelPath={astronautModels.find(m => m.id === selectedModel)?.path || '/Astronaut2.glb'}
        helmetTexture={helmetTextureUrl}
        suitTexture={suitTextureUrl}
        textureOffset={textureOffset}
        textureScale={textureScale}
        position="center"
        // Pass all customization props
        onModelChange={setSelectedModel}
        onHelmetTextureChange={setHelmetTextureUrl}
        onSuitTextureChange={setSuitTextureUrl}
        onTextureOffsetChange={setTextureOffset}
        onTextureScaleChange={setTextureScale}
        onImageUpload={handleImageChange}
        onReset={() => {
          setTextureOffset({ x: 0, y: 0 });
          setTextureScale(1);
          setCustomImageUrl(null);
          setHelmetTextureUrl(user?.imageUrl || null);
          setSuitTextureUrl(null);
        }}
        onSave={() => {
          const customization = {
            modelPath: astronautModels.find(m => m.id === selectedModel)?.path,
            helmetTexture: helmetTextureUrl,
            suitTexture: suitTextureUrl,
            customImage: customImageUrl,
            textureOffset,
            textureScale,
          };
          handleAstronautSave(customization);
        }}
        selectedModel={selectedModel}
        astronautModels={astronautModels}
        textureOptions={textureOptions}
        currentTextureIndex={currentTextureIndex}
        onTextureIndexChange={setCurrentTextureIndex}
        user={user}
      />
    </>
  );
};

// Preload astronaut models
// useGLTF.preload('/astronaut.glb');
useGLTF.preload('/Astronaut2.glb');

// Optionally preload some textures for better performance
if (typeof window !== 'undefined') {
  const textureLoader = new THREE.TextureLoader();
  const texturesToPreload = [
    '/astronaut_colors/Studio_Ochi_Astronauts_Gallactic.png',
    '/astronaut_colors/Studio_Ochi_Astronauts_Origin.png',
    '/astronaut_colors/Studio_Ochi_Astronauts_Spaxe.png',
    '/astronaut_colors/Studio_Ochi_Astronauts_Generic_01.png',
  ];
  
  // Preload the first few textures in the background
  texturesToPreload.forEach(path => {
    textureLoader.load(path, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      // Textures are now cached by the browser
    });
  });
}

export default React.memo(LunarSidePanel);