import React, { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import CyborgTempleScene from '../components/3DVotiveStand/CyborgTempleScene';
import ConstellationModel from '../components/3DVotiveStand/ConstellationModel';
import StarField from '../components/3DVotiveStand/StarField';
import { Box, IconButton, Text } from '@chakra-ui/react';
import PostProcessingEffects from '../components/3DVotiveStand/PostProcessingEffects';
import dynamic from 'next/dynamic';
import { useMusic } from '../contexts/MusicContext';
import Link from 'next/link';

const MobileMusicPlayer = dynamic(() => import('../components/MobileMusicPlayer'), {
  ssr: false,
});

export default function CyborgTemple() {
  const [showMobileMusicPlayer, setShowMobileMusicPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const audioRef = useRef(null);
  const { setIsPlaying: setContextIsPlaying, setShowSpotify: setContextShowSpotify } = useMusic();
  const [musicControls, setMusicControls] = useState(null);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMusicControlsReady = useCallback((controls) => {
    console.log('🎵 Music controls ready in CyborgTemple');
    setMusicControls(controls);
    setShowMobileMusicPlayer(true);
    
    // Auto-play when controls are ready
    if (controls?.play) {
      controls.play();
    }
  }, []);
  
  const handleSceneLoad = useCallback(() => {
    console.log('Cyborg Temple Scene loaded');
  }, []);

  return (
    <Box 
      width="100%" 
      height="100vh" 
      bg="#000" 
      position="relative" 
      overflow="hidden"
    >
      {/* Main content */}
      <div className="textLight" id="textLight" style={{
          position: "absolute",
          top: "20px", 
          left: "20px",
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
              color: "#ffffff",
              cursor: "pointer"
            }}
          >
            <Link href="/home" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
              RL80
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
                    color: `rgba(${255 - index * 2}, ${255 - index * 3}, ${255 - index * 2})`,
                    filter: "blur(0.1rem)",
                    transform: `translate(
                      ${index * 0.1}rem, 
                      ${index * 0.1}rem
                    ) scale(${1 + index * 0.01})`,
                    opacity: (1 / index) * 1.5,
                  }}
                >
                  RL80
                </div>
              );
            })}
          </div>
        </div>
      <Canvas
        key="cyborg-temple-canvas"
        camera={{ position: [0, -1, 7.5], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#000' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <Environment preset="night" />
          <PostProcessingEffects is80sMode={is80sMode} />
          
          {/* Starry background */}
          <StarField radius={500} count1={500} count2={300} />
          <ConstellationModel  groupScale={[10, 10, 10]} groupPosition={[0, 15, -150]}    isVisible={true} />
          
          <CyborgTempleScene
            position={[0, 0, 0]}
            scale={[1, 1, 1]}
            rotation={[0, 0, 0]}
            hover={true}
            rotate={true}
            onLoad={handleSceneLoad}
            isPlaying={isPlaying}
            is80sMode={is80sMode}
          />
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            zoomSpeed={0.2}
      

            enableDamping={true}
            dampingFactor={0.1}
            minDistance={1}
            maxDistance={10}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 1.9}
            zoomToCursor={true}
            // autoRotate={true}
            // autoRotateSpeed={0.2}
          />
        </Suspense>
      </Canvas>
      
      {/* Music Icon Button */}
      {!showMobileMusicPlayer && (
        <IconButton
          position="fixed"
          top="2rem"
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
          }}
          _hover={{
            bg: "rgba(255, 255, 255, 0.1)",
          }}
        />
      )}
      
      {showMobileMusicPlayer && (
        <Box display="none">
          <MobileMusicPlayer
            isVisible={true}
            isMobile={true}
            autoPlay={true}
            is80sMode={is80sMode}
            onControlsReady={handleMusicControlsReady}
            onPlayingStateChange={(playing) => {
              console.log('🎵 Music state changed:', playing);
              setIsPlaying(playing);
              setContextIsPlaying(playing);
            }}
            audioRef={audioRef}
          />
        </Box>
      )}
      
      {/* Minimal Music Player UI */}
      {showMobileMusicPlayer && (
        <Box
          position="fixed"
          top="2rem"
          right="2rem"
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
              if (musicControls) {
                if (isPlaying) {
                  musicControls.pause();
                } else {
                  musicControls.play();
                }
              }
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
              if (musicControls?.nextTrack) {
                musicControls.nextTrack();
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
              setShowMobileMusicPlayer(false);
              setMusicPlayerVisible(false);
              setContextShowSpotify(false);
              if (musicControls?.pause) {
                musicControls.pause();
              }
            }}
          />
        </Box>
      )}
      
      {/* 80s Mode Toggle - Always visible below music icon */}
      <Box
        position="fixed"
        top={isMobileView ? "4rem" : "5.5rem"}
        right={isMobileView ? "20px" : "2rem"}
        zIndex="1100"
        display="flex"
        alignItems="center"
        gap="0.5rem"
        bg="rgba(0, 0, 0, 0.7)"
        borderRadius="full"
        padding="0.5rem 1rem"
        backdropFilter="blur(10px)"
      >
        <Text
          fontSize="0.9rem"
          fontWeight="medium"
          color="white"
        >
          80s Mode
        </Text>
        <Box
          as="button"
          position="relative"
          width="3rem"
          height="1.5rem"
          borderRadius="full"
          bg={is80sMode ? "rgba(0, 255, 65, 0.3)" : "rgba(255, 255, 255, 0.2)"}
          border={`2px solid ${is80sMode ? "#00ff41" : "white"}`}
          cursor="pointer"
          transition="all 0.3s ease"
          onClick={() => setIs80sMode(!is80sMode)}
          _hover={{
            transform: "scale(1.05)"
          }}
        >
          <Box
            position="absolute"
            top="50%"
            transform={`translateY(-50%) translateX(${is80sMode ? "1.5rem" : "0.1rem"})`}
            width="1rem"
            height="1rem"
            borderRadius="full"
            bg={is80sMode ? "#00ff41" : "white"}
            transition="all 0.3s ease"
            boxShadow={is80sMode ? "0 0 10px #00ff41" : "0 0 4px rgba(255,255,255,0.5)"}
          />
        </Box>
      </Box>
      
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Box>
  );
}