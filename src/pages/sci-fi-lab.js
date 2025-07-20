import React, { useState, useEffect, memo } from "react";
import {
  Box,
  IconButton,
  useBreakpointValue,
} from "@chakra-ui/react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import SciFiLabScene from "../components/3DVotiveStand/SciFiLabScene";
import CyberNav from "../components/CyberNav";
import CyberCalloutOverlay from "../components/3DVotiveStand/CyberCalloutOverlay";
import Link from "next/link";

const MemoizedSciFiLabScene = memo(SciFiLabScene);

const SciFiLab = () => {
  const [is80sMode, setIs80sMode] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  
  const isMobileView = useBreakpointValue({ base: true, lg: false });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);


  return (
    <Box
      bg="black"
      minH="100vh"
      position="relative"
      overflow="hidden"
      fontFamily="'Rajdhani', monospace"
    >
       <div className="textLight" id="textLight" style={{
          position: "absolute",
          top: "1.5rem", 
          left: "1.5rem",
          zIndex: 100, // Ensure it's above the scene if opaque
          borderRadius: "8px",
          padding: "10px",
          pointerEvents: "auto"
        }}>
          <div 
            id="text"
            style={{
              position: "relative",
              fontFamily: "'UnifrakturMaguntia', cursive",
              fontSize: isMobileView ? "3rem" : "4rem",
              // color: is80sMode ? "#67e8f9" : "#ffffff",
              cursor: "pointer"
            }}
          >
            <Link href="/home" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
              <span>RL80</span>
              {/* <span style={{ color: "inherit" }}>80</span> */}
            </Link>
            {Array.from({length: 100}).map((_, i) => {
              const index = i + 1;
              return (
                <div
                  key={index}
                  className="text__copy"
                  style={{
                    position: "absolute",
                    pointerEvents: "none",
                    zIndex: -1,
                    top: 0,
                    left: 0,
                    color: is80sMode 
                      ? `rgba(${201 - index * 2}, ${55 - index * 3}, ${256 - index * 2})` 
                      : `rgba(${255 - index * 2}, ${255 - index * 3}, ${255 - index * 2})`,
                    filter: "blur(0.1rem)",
                    transform: `translate(
                      ${index * 0.1}rem, 
                      ${index * 0.1}rem
                    ) scale(${1 + index * 0.01})`,
                    opacity: (1 / index) * 1.5,
                  }}
                >
                  <span>RL80</span>
                  {/* <span style={{ color: is80sMode ? "#00ff41" : "inherit" }}>80</span> */}
                </div>
              );
            })}
          </div>
        </div>
      {/* Cyber Navigation */}
      <CyberNav variant="space" is80sMode={is80sMode} />
      
      {/* Cyber Callout Overlay */}
      <CyberCalloutOverlay
        title="NATIV80 LAB"
        subtitle="EXPERIMENTAL CHAMBER"
        description="Welcome to the high-tech laboratory where cutting-edge experiments in digital consciousness take place. Explore the frontier of cyborg technology."
        buttonText="ENTER LAB"
        is80sMode={is80sMode}
        autoHide={false}
        onButtonClick={() => {
          console.log('Entering the lab...');
        }}
      />
      
      {/* 3D Canvas */}
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        zIndex="1"
      >
        <Canvas
          shadows
      
          camera={{ position: [1, 1.2, 5.5], fov: 45 }}
          style={{ width: "100%", height: "100%" }}
        >
          <OrbitControls 
            enableDamping 
            dampingFactor={0.5}
            maxPolarAngle={Math.PI / 2}
            minDistance={2}
            maxDistance={10}
            zoomToCursor={true}
            target={[0, -0.2, 0]}
          />
          <MemoizedSciFiLabScene
            position={[0, 0, 0]}
            scale={[1, 1, 1]}
            rotation={[0, Math.PI / 1.3, 0]}
            hover={false}
            rotate={false}
            is80sMode={is80sMode}
            onLoad={() => {
              console.log("Sci-Fi Lab scene loaded");
              setSceneLoaded(true);
            }}
          />
        </Canvas>
      </Box>

      {/* Scene Title */}
      {/* <VStack
        position="fixed"
        bottom={isMobileView ? "2rem" : "4rem"}
        left="50%"
        transform="translateX(-50%)"
        zIndex="1000"
        spacing={2}
        align="center"
      >
        <Text
          fontSize={isMobileView ? "2xl" : "4xl"}
          fontWeight="bold"
          color={is80sMode ? "#00ff41" : "white"}
          textShadow={
            is80sMode
              ? "0 0 10px #00ff41, 0 0 20px #00ff41"
              : "0 0 10px rgba(255,255,255,0.5)"
          }
          letterSpacing="wider"
          textTransform="uppercase"
        >
          Sci-Fi Lab
        </Text>
        <Text
          fontSize={isMobileView ? "sm" : "md"}
          color={is80sMode ? "#67e8f9" : "gray.400"}
          textAlign="center"
          maxW="400px"
        >
          Lighting reference scene for cyborg development
        </Text>
      </VStack> */}

      {/* User Login Icon */}
      <IconButton
        position="fixed"
        top={isMobileView ? "4rem" : "4.5rem"}
        right={isMobileView ? "20px" : "2rem"}
        zIndex="1100"
        aria-label="User Account"
        icon={
          <svg width={isMobileView ? "30" : "2.5rem"} height={isMobileView ? "30" : "2.5rem"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        }
        color={is80sMode ? "#67e8f9" : "white"}
        bg="transparent"
        size="md"
        onClick={() => {
          console.log("User account clicked");
        }}
        _hover={{
          bg: "rgba(255, 255, 255, 0.1)",
          color: is80sMode ? "#00ff41" : "#67e8f9",
          transform: "scale(1.1)",
        }}
        transition="all 0.3s ease"
      />
      
      {/* 80s Mode Toggle */}
      {/* <IconButton
        position="fixed"
        top={isMobileView ? "10rem" : "10.5rem"}
        right={isMobileView ? "20px" : "2rem"}
        zIndex="1100"
        aria-label="Toggle 80s Mode"
        icon={
          <svg width={isMobileView ? "30" : "2.5rem"} height={isMobileView ? "30" : "2.5rem"} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill={is80sMode ? "currentColor" : "none"}/>
            <text 
              x="12" 
              y="12" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fontSize="10" 
              fontWeight="bold"
              fontFamily="'Rajdhani', sans-serif"
              fill={is80sMode ? "#000" : "currentColor"}
            >
              80s
            </text>
          </svg>
        }
        color={is80sMode ? "#67e8f9" : "white"}
        bg="transparent"
        size="md"
        onClick={() => setIs80sMode(!is80sMode)}
        _hover={{
          bg: "rgba(255, 255, 255, 0.1)",
          color: is80sMode ? "#00ff41" : "#67e8f9",
          transform: "scale(1.1)",
        }}
        transition="all 0.3s ease"
      /> */}
    </Box>
  );
};

export default SciFiLab;