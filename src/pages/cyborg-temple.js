import React, { Suspense, useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import CyborgTempleScene from '../components/3DVotiveStand/CyborgTempleScene';
import ConstellationModel from '../components/3DVotiveStand/ConstellationModel';
import StarField from '../components/3DVotiveStand/StarField';
import { Box, IconButton } from '@chakra-ui/react';
import PostProcessingEffects from '../components/3DVotiveStand/PostProcessingEffects';
import dynamic from 'next/dynamic';
import { useMusic } from '../contexts/MusicContext';
import Link from 'next/link';
import { Lights } from '../components/Lights';
import { StarrySky } from '../components/3DVotiveStand/StarrySky';
import BuyTokenFAB from '../components/BuyTokenFAB';
import CandlePaginationUI from '../components/CandlePaginationUI';
import CyberCalloutOverlay from '../components/3DVotiveStand/CyberCalloutOverlay';
const SimpleMusicPlayer = dynamic(() => import('../components/SimpleMusicPlayer'), {
  ssr: false,
});



export default function CyborgTemple({ is80sMode, setIs80sMode }) {
  const [showMobileMusicPlayer, setShowMobileMusicPlayer] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const videoRef = useRef(null);
  const { setIsPlaying: setContextIsPlaying, setShowSpotify: setContextShowSpotify } = useMusic();
  const [musicControls, setMusicControls] = useState(null);
  const [paginationControls, setPaginationControls] = useState(null);
  const [showCalloutOverlay, setShowCalloutOverlay] = useState(true);

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Suppress Chrome extension errors
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.includes?.('message channel closed')) {
        return; // Suppress extension errors
      }
      originalError.apply(console, args);
    };
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      console.error = originalError;
    };
  }, []);
  

  // Handle 80s mode video playback
  useEffect(() => {
    if (is80sMode && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.log('Video autoplay failed:', err);
      });
    } else if (!is80sMode && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [is80sMode]);



  const controlsInitializedRef = useRef(false);
  
  const handleMusicControlsReady = useCallback((controls) => {
    console.log('🎵 Music controls updated in CyborgTemple');
    setMusicControls(controls);
    
    // Only initialize player visibility once
    if (!controlsInitializedRef.current) {
      controlsInitializedRef.current = true;
      setShowMobileMusicPlayer(true);
      
      // Auto-play when controls are ready (only once)
      if (controls?.play && !isPlaying) {
        controls.play();
      }
    }
  }, [isPlaying]);
  
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
      {/* Cyber Callout Overlay */}
      <CyberCalloutOverlay
        title="CYBORG TEMPLE"
        subtitle="DIGITAL SANCTUARY"
        description="Welcome to the sacred nexus where consciousness meets code. Light a virtual candle and join the collective meditation."
        buttonText="ENTER"
        is80sMode={is80sMode}
        autoHide={false}
        show={showCalloutOverlay}
        onButtonClick={() => {
          console.log('Entering the temple...');
          setShowCalloutOverlay(false);
          // Add any temple entry logic here
        }}
      />
      
      {/* 80s Mode Video Background */}
      {/* {is80sMode && (
        <video
          ref={videoRef}
          src="/83.mov"
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.3,
            zIndex: 1,
            mixBlendMode: 'screen',
            pointerEvents: 'none'
          }}
        />
      )} */}
      
      {/* Main content */}
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
      <Canvas
        key="cyborg-temple-canvas"
        camera={{ position: [0, -1.2, 8.5], fov: 40 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', position: 'relative', zIndex: 2 }}
      >
        <fog attach="fog" args={['#000000', 20, 200]} />
        <Suspense fallback={null}>
          <ambientLight intensity={0.3} />
          {/* <directionalLight position={[5, 10, 5]} intensity={1} /> */}
             {/* Starry background */}
             <StarField radius={150} count1={500} count2={300} is80sMode={is80sMode} />
             {/* <StarrySky /> */}
          <ConstellationModel  groupScale={[10, 10, 10]} groupPosition={[0, 15, -80]}    isVisible={true} />
          <Environment frames={Infinity} resolution={512} blur={(0.5)}> 
            <Lights />
            {/* Removed the mesh that was blocking the view */}
          </Environment>
          <PostProcessingEffects is80sMode={is80sMode} />
          
       
          
          <CyborgTempleScene
            position={[0, 0.5, 0]}
            scale={[1, 1, 1]}
            rotation={[0, 0, 0]}
            hover={true}
            rotate={true}
            onLoad={handleSceneLoad}
            isPlaying={isPlaying}
            is80sMode={is80sMode}
            onAnnotationClick={() => setShowCalloutOverlay(false)}
            candleData={[
              // Sample candle data - replace with actual user data
              // { name: "User 1", image: "/path/to/image1.jpg", burnAmount: 0.5 },
              // { name: "User 2", image: "/path/to/image2.jpg", burnAmount: 0.3 },
              // { name: "User 3", image: "/path/to/image3.jpg", burnAmount: 0.7 },
              // { name: "User 4", image: "/path/to/image4.jpg", burnAmount: 0.2 },
              // { name: "User 5", image: "/path/to/image5.jpg", burnAmount: 0.9 },
              // { name: "User 6", image: "/path/to/image6.jpg", burnAmount: 0.4 },
              // { name: "User 7", image: "/path/to/image7.jpg", burnAmount: 0.6 },
              // { name: "User 8", image: "/path/to/image8.jpg", burnAmount: 0.8 },
              // // Add more candle data as needed for pagination demo
              // { name: "User 9", image: "/path/to/image9.jpg", burnAmount: 0.1 },
              // { name: "User 10", image: "/path/to/image10.jpg", burnAmount: 0.5 },
            ]}
            onCandleClick={(index, userData) => {
              console.log('Candle clicked:', index, userData);
              // Here you can open your candle viewer modal
              // For example: setSelectedCandle(userData); setShowCandleViewer(true);
            }}
            onPaginationReady={(controls) => {
              setPaginationControls(controls);
            }}
          />
          
          <OrbitControls 
            makeDefault
            enablePan={true}
            enableZoom={true}
            zoomSpeed={0.2}
            enableDamping={true}
            dampingFactor={0.1}
            minDistance={0.1}
            maxDistance={20}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 1.9}
            zoomToCursor={true}
            autoRotate={true}
            autoRotateSpeed={0.4}
            target={[0, 0, 0]}
          />
        </Suspense>
      </Canvas>
      
      
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
          }}
          _hover={{
            bg: "rgba(255, 255, 255, 0.1)",
          }}
        />
      )}
      
      {showMobileMusicPlayer && (
        <Box display="none">
          <SimpleMusicPlayer
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
            onClose={() => {
              setShowMobileMusicPlayer(false);
              setMusicPlayerVisible(false);
              setContextShowSpotify(false);
            }}
          />
        </Box>
      )}
      
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
              console.log('🎵 Skip button clicked, musicControls:', musicControls);
              if (musicControls?.skipTrack) {
                console.log('🎵 Calling skipTrack');
                musicControls.skipTrack();
              } else {
                console.log('❌ skipTrack method not found on musicControls');
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
          console.log("User account clicked");
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
      
      {/* Buy Token FAB */}
      <BuyTokenFAB is80sMode={is80sMode} />
      
      {/* Candle Pagination UI */}
      {paginationControls && (
        <CandlePaginationUI
          currentPage={paginationControls.currentPage}
          totalPages={paginationControls.totalPages}
          candlesPerPage={paginationControls.candlesPerPage}
          totalCandles={paginationControls.totalCandles}
          onPageChange={paginationControls.changePage}
          is80sMode={is80sMode}
          isMobile={isMobileView}
        />
      )}
      
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