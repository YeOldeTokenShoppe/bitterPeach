import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import Cathedral from '../components/Cathedral';
import CyberNav from '../components/CyberNav';
import CyberCalloutOverlay from '../components/3DVotiveStand/CyberCalloutOverlay';
import Link from 'next/link';
import { Box, IconButton, Text } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import { useMusic } from '../contexts/MusicContext';
import BuyTokenFAB from '../components/BuyTokenFAB';

const SimpleMusicPlayer = dynamic(() => import('../components/SimpleMusicPlayer'), {
  ssr: false,
});

// Custom wrapper component for right-aligned overlay
function RightAlignedCyberCallout({ children, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <style jsx>{`
        div :global(> div) {
          left: auto !important;
          right: 80px !important;
          top: 60% !important;
        }
        div :global(> div > div) {
          width: 500px !important;
          transform: skewX(-8deg) !important;
          padding: 40px !important;
          background: rgba(0, 0, 0, 0.55) !important;
        }
        div :global(> div > div > div) {
          transform: skewX(8deg) !important;
        }
        div :global(> div > div > button) {
          transform: skewX(8deg) !important;
        }
      `}</style>
      <CyberCalloutOverlay {...props} />
    </div>
  );
}

export default function CathedralPage({ is80sMode, setIs80sMode }) {
  const [isMobileView, setIsMobileView] = useState(false);
  const [showMobileMusicPlayer, setShowMobileMusicPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showCyberOverlay, setShowCyberOverlay] = useState(true);
  const { setIsPlaying: setContextIsPlaying, setShowSpotify: setContextShowSpotify } = useMusic();
  const musicControlsRef = useRef(null);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);



  return (
    <Box 
    width="100%" 
    height="100vh" 
    bg="#000" 
    position="relative" 
    overflow="hidden"
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
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      
      
      <CyberNav />
      <Cathedral isPlaying={isPlaying} showAnnotations={showAnnotations} />
      
      {/* Right-aligned CyberCalloutOverlay */}
      <CyberCalloutOverlay
        title="THE ILLUMIN80"
        subtitle="GET LIT WITH RL80"
        description="Ancient wisdom, quantum rewards. This is no simulation—it's sacred tech forged in faith. Burn your devotion at the altar of tomorrow."
        buttonText="JOIN"
        is80sMode={is80sMode}
        autoHide={false}
        show={showCyberOverlay}
        onButtonClick={() => {
          setShowCyberOverlay(false);
        }}
        secondButtonText="BURN"
        onSecondButtonClick={() => {
          setShowCyberOverlay(false);
        }}
      />
    </div>
    
    {/* Music Icon Button */}
    {!showMobileMusicPlayer && (
      <IconButton
        position="fixed"
        top={isMobileView ? "7rem" : "7.5rem"}
        right={isMobileView ? "20px" : "2rem"}
        zIndex="1100"
        aria-label="Music Player"
        icon={
          <svg width={isMobileView ? "24" : "2.5rem"} height={isMobileView ? "24" : "2.5rem"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13"/>
            <circle cx="6" cy="18" r="3"/>
            <circle cx="18" cy="16" r="3"/>
          </svg>
        }
        color="white"
        bg="transparent"
        size="md"
        onClick={() => {
          setShowMobileMusicPlayer(true);
          setMusicPlayerVisible(true);
          setContextShowSpotify(true);
          // Try to start music after a delay if controls are ready
          setTimeout(() => {
            if (musicControlsRef.current?.play && !isPlaying) {
              console.log('🎵 Starting music from icon click...');
              musicControlsRef.current.play();
            }
          }, 200);
        }}
        _hover={{
          bg: "rgba(255, 255, 255, 0.1)",
        }}
      />
    )}
    
   
    
    {/* Always render SimpleMusicPlayer but control its visibility */}
    <Box display="none">
      <SimpleMusicPlayer
        isVisible={showMobileMusicPlayer}
        isMobile={true}
        autoPlay={false}
        is80sMode={is80sMode}
        onControlsReady={(controls) => {
          musicControlsRef.current = controls;
          // Auto-play when first shown with a small delay
          if (showMobileMusicPlayer && controls?.play) {
            setTimeout(() => {
              if (!isPlaying && musicControlsRef.current?.play) {
                console.log('🎵 Auto-playing music...');
                musicControlsRef.current.play();
              }
            }, 100);
          }
        }}
        onPlayingStateChange={(playing) => {
          console.log('🎵 Music state changed:', playing, 'from SimpleMusicPlayer');
          setIsPlaying(playing);
          setContextIsPlaying(playing);
        }}
        onClose={() => {
          setShowMobileMusicPlayer(false);
          setMusicPlayerVisible(false);
          setContextShowSpotify(false);
          setIsPlaying(false);
        }}
      />
    </Box>
    
    {/* Minimal Music Player UI */}
    {showMobileMusicPlayer && (
      <Box
        position="fixed"
        top={isMobileView ? "7rem" : "7.5rem"}
        right={isMobileView ? "20px" : "2rem"}
        zIndex="9999"
        display="flex"
        alignItems="center"
        gap="1rem"
      >
        {/* Spinning Album Art */}
        <Box
          width="40px"
          height="40px"
          borderRadius="50%"
          overflow="hidden"
          animation={isPlaying ? "spin 4s linear infinite" : "none"}
          cursor="pointer"
          onClick={() => {
            // Toggle play/pause by changing the state
            // The SimpleMusicPlayer will handle the actual audio control
            setShowMobileMusicPlayer(false);
            setShowMobileMusicPlayer(true);
          }}
        >
          <Box
            width="100%"
            height="100%"
            backgroundImage="url('/virginRecords.jpg')"
            backgroundSize="cover"
            backgroundPosition="center"
          />
        </Box>
        
        {/* Skip Button */}
        <IconButton
          aria-label="Skip Track"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          }
          size="sm"
          bg="rgba(0, 0, 0, 0.5)"
          color="white"
          _hover={{ bg: "rgba(0, 0, 0, 0.7)" }}
          onClick={() => {
            // Call the skip function from music controls
            if (musicControlsRef.current?.skipTrack) {
              musicControlsRef.current.skipTrack();
            }
          }}
        />
        
        {/* Close Button */}
        <IconButton
          aria-label="Close Music Player"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          }
          size="sm"
          bg="rgba(0, 0, 0, 0.5)"
          color="white"
          _hover={{ bg: "rgba(0, 0, 0, 0.7)" }}
          onClick={() => {
            // Force stop the music using the controls
            if (musicControlsRef.current?.pause) {
              musicControlsRef.current.pause();
            }
            setIsPlaying(false);
            setContextIsPlaying(false);
            setShowMobileMusicPlayer(false);
            setMusicPlayerVisible(false);
            setContextShowSpotify(false);
          }}
        />
      </Box>
    )}
    
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
      color={is80sMode ? "#00ff41" : "white"}
      bg="transparent"
      size="md"
      onClick={() => {
        // Add your login/account action here
        // console.log("User account clicked");
      }}
      _hover={{
        bg: "rgba(255, 255, 255, 0.1)",
        color: is80sMode ? "#00ff41" : "#D946EF",
        transform: "scale(1.1)",
      }}
      transition="all 0.3s ease"
    />
    
    {/* 80s Mode Toggle */}
    <IconButton
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
            fill={is80sMode ? (is80sMode === "#00ff41" ? "#000" : "#000") : "currentColor"}
          >
            80s
          </text>
        </svg>
      }
      color={is80sMode ? "#00ff41" : "white"}
      bg="transparent"
      size="md"
      onClick={() => setIs80sMode(!is80sMode)}
      _hover={{
        bg: "rgba(255, 255, 255, 0.1)",
        color: is80sMode ? "#00ff41" : "#D946EF",
        transform: "scale(1.1)",
      }}
      transition="all 0.3s ease"
    />
     {/* Annotations Toggle Button */}
     <IconButton
      position="fixed"
      top={isMobileView ? "13rem" : "13.5rem"}
      right={isMobileView ? "20px" : "2rem"}
      zIndex="1100"
      aria-label="Toggle Annotations"
      icon={
        <svg width={isMobileView ? "30" : "2.5rem"} height={isMobileView ? "30" : "2.5rem"} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
          <g opacity={showAnnotations ? 1 : 0.5} transform="translate(12, 12) scale(0.7) translate(-12, -12)">
            <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" stroke="currentColor" strokeWidth="2" fill="none"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
          </g>
        </svg>
      }
      color="white"
      bg="transparent"
      size="md"
      onClick={() => setShowAnnotations(!showAnnotations)}
      _hover={{
        bg: "rgba(255, 255, 255, 0)",
      }}
    />
    {/* Bot/AI Assistant Icon */}
    <IconButton
      position="fixed"
      top={isMobileView ? "16rem" : "16.5rem"}
      right={isMobileView ? "20px" : "2rem"}
      zIndex="1100"
      aria-label="AI Assistant"
      icon={
        <svg width={isMobileView ? "30" : "2.5rem"} height={isMobileView ? "30" : "2.5rem"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 8V4H8"/>
          <rect width="16" height="12" x="4" y="8" rx="2"/>
          <path d="M2 14h2"/>
          <path d="M20 14h2"/>
          <path d="M15 13v2"/>
          <path d="M9 13v2"/>
        </svg>
      }
      color={is80sMode ? "#00ff41" : "white"}
      bg="transparent"
      size="md"
      onClick={() => {
        // Add your AI assistant action here
        console.log("AI assistant clicked");
      }}
      _hover={{
        bg: "rgba(255, 255, 255, 0.1)",
        color: is80sMode ? "#00ff41" : "#D946EF",
        transform: "scale(1.1)",
      }}
      transition="all 0.3s ease"
    />
    
    {/* Buy Token FAB - Only show after overlay is closed */}
    {!showCyberOverlay && <BuyTokenFAB is80sMode={is80sMode} />}
    
    </Box>
  );
}