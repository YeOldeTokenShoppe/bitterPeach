import React, { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import HolographicStatue2 from '../components/3DVotiveStand/HolographicStatue2';
import GlassButton from '../components/GlassButton';
// import PrismaticOverlay from '../components/PrismaticOverlay';
import ExtrudedTitle from '../components/ExtrudedTitle';
// import SimpleMarqueeCandles from '../components/SimpleMarqueeCandles';
import MarqueeCandles from '../components/MarqueeCandles';
import { Box, IconButton, Text, useDisclosure } from '@chakra-ui/react';
import Model from '../components/3DVotiveStand/Model';
import FloatingCandleViewer from '../components/3DVotiveStand/CandleInteraction';
import { useFirestoreResults } from '../utilities/useFirestoreResults';
import dynamic from 'next/dynamic';
import { useMusic } from '../contexts/MusicContext';
import PostProcessingEffects from '../components/3DVotiveStand/PostProcessingEffects';

// Dynamically import the Mobile Music Player component
const MobileMusicPlayer = dynamic(() => import('../components/MobileMusicPlayer'), {
  ssr: false,
});

const SimpleModel = React.forwardRef(({ url, position = [0, 0, 0] }, ref) => {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach(action => {
        action.play();
      });
    }
  }, [actions]);
  
  // Expose the group ref
  React.useImperativeHandle(ref, () => group);

  return <primitive ref={group} object={scene} position={position} />;
});

export default function ModelViewer() {
  const statuePosition = [0, 0.5, -0.9];
  const modelRef = useRef();
  const votiveModelRef = useRef(); // Ref for the votive stand model with VCANDLEs
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [candleData, setCandleData] = useState([]);
  const [selectedCandle, setSelectedCandle] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isVotiveModelLoaded, setIsVotiveModelLoaded] = useState(false);
  
  // Music player states
  const [showMobileMusicPlayer, setShowMobileMusicPlayer] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [userClosedMusic, setUserClosedMusic] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [musicPlayerControls, setMusicPlayerControls] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const audioRef = useRef(null);
  
  // Debug log for current page
  useEffect(() => {
    console.log('ModelViewer currentPage changed:', currentPage);
  }, [currentPage]);
  
  // Get music context
  const { 
    showSpotify: contextShowSpotify, 
    setShowSpotify: setContextShowSpotify,
    isPlaying: contextIsPlaying,
    setIsPlaying: setContextIsPlaying,
  } = useMusic();
  
  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Get Firebase user data
  const firestoreResults = useFirestoreResults();
  
  // Update candle data when Firebase results change
  useEffect(() => {
    console.log('Firebase results:', firestoreResults);
    if (firestoreResults && firestoreResults.length > 0) {
      setCandleData(firestoreResults);
      const itemsPerPage = 3; // Reduced for testing
      const pages = Math.ceil(firestoreResults.length / itemsPerPage);
      setTotalPages(pages);
      console.log('Setting candle data:', {
        dataLength: firestoreResults.length,
        totalPages: pages,
        itemsPerPage: itemsPerPage
      });
    } else {
      // If no Firebase data, use mock data
      const mockData = Array(80).fill(null).map((_, i) => ({
        id: `user-${i}`,
        userName: `Player${i + 1}`,
        burnedAmount: Math.floor(Math.random() * 1000),
        image: i % 2 === 0 ? '/vvv.jpg' : '/vsClown.jpg',
        message: `Support message ${i + 1}`
      }));
      const itemsPerPage = 3; // Reduced for testing
      setCandleData(mockData);
      setTotalPages(Math.ceil(mockData.length / itemsPerPage));
      console.log('Using mock data:', {
        dataLength: mockData.length,
        totalPages: Math.ceil(mockData.length / itemsPerPage)
      });
    }
  }, [firestoreResults]);
  
  const handleCandleClick = useCallback((candleInfo) => {
    console.log('Candle clicked:', candleInfo);
    setSelectedCandle(candleInfo);
    onOpen();
    
    // Set up global navigation for compatibility with MobileSidePanel
    window.isCandleViewerOpen = true;
    window.candleViewerNavigate = (direction) => {
      const currentData = candleData.slice(currentPage * 10, (currentPage + 1) * 10);
      const currentIndex = currentData.findIndex(c => c.id === candleInfo.id);
      
      if (direction === 'next') {
        const nextIndex = (currentIndex + 1) % currentData.length;
        setSelectedCandle(currentData[nextIndex]);
      } else if (direction === 'prev') {
        const prevIndex = (currentIndex - 1 + currentData.length) % currentData.length;
        setSelectedCandle(currentData[prevIndex]);
      }
    };
  }, [candleData, currentPage, onOpen]);
  
  // Clean up global navigation on modal close
  const handleModalClose = useCallback(() => {
    window.isCandleViewerOpen = false;
    window.candleViewerNavigate = null;
    onClose();
  }, [onClose]);
  
  // Callback to receive controls from MobileMusicPlayer
  const handleMusicControlsReady = useCallback((controls) => {
    setMusicPlayerControls(prevControls => {
      if (prevControls) return prevControls;
      return controls;
    });
    
    // Auto-play when controls are ready and music player is visible
    if (controls && controls.play && !contextIsPlaying && showMobileMusicPlayer) {
      console.log('🎵 Auto-playing music when controls ready');
      setTimeout(() => {
        controls.play();
      }, 500); // Increased delay to ensure track is loaded
    }
  }, [contextIsPlaying, showMobileMusicPlayer]);
  
  // Music player close handler
  const handleMusicPlayerClose = useCallback(() => {
    console.log('🎵 Closing music player');
    
    // Stop the music first
    if (musicPlayerControls && musicPlayerControls.pause) {
      console.log('🎵 Pausing music');
      musicPlayerControls.pause();
    }
    
    // Update context
    setContextIsPlaying(false);
    setContextShowSpotify(false);
    
    // Then hide the player
    setUserClosedMusic(true);
    setShowMobileMusicPlayer(false);
    setMusicPlayerVisible(false);
  }, [musicPlayerControls, setContextIsPlaying, setContextShowSpotify]);
  
  // Toggle 80s mode
  const toggle80sMode = useCallback(() => {
    console.log('🎨 ModelViewer: toggle80sMode called, current:', is80sMode);
    setIs80sMode(prev => !prev);
  }, [is80sMode]);
  
  // Handle music mode change from the player
  const handleMusicModeChange = useCallback((enable80s) => {
    console.log('🎵 Music player mode selection:', enable80s, 'current is80sMode:', is80sMode);
    
    if (enable80s !== is80sMode) {
      console.log('🎵 Mode differs from current state, toggling');
      toggle80sMode();
    }
  }, [is80sMode, toggle80sMode]);
  
  return (
    <div style={{ width: '100%', height: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      {/* 80s Mode Video Background */}
      {is80sMode && (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"  // Only load metadata initially, not the whole video
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            minWidth: "100%",
            minHeight: "100%",
            width: "auto",
            height: "auto",
            transform: "translate(-50%, -50%)",
            objectFit: "cover",
            opacity: 0.25,
            filter: "saturate(2) hue-rotate(15deg) brightness(0.8)",
            zIndex: 0,
          }}
          onError={(e) => {
            console.error("Video failed to load:", e);
            // Try fallback to local video if Firebase fails
            e.target.src = "/83.mov";
          }}
        >
          {/* Primary source from Firebase Storage */}
          <source 
            src="https://firebasestorage.googleapis.com/v0/b/YOUR-PROJECT-ID.appspot.com/o/videos%2F83.mp4?alt=media" 
            type="video/mp4" 
          />
          {/* Fallback to local file */}
          <source src="/83.mov" type="video/quicktime" />
          <source src="/83.mov" type="video/mp4" />
        </video>
      )}
      
      {/* HTML overlays with higher z-index */}
      <ExtrudedTitle />
      
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        <Suspense fallback={null}>
          
         
    
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <SimpleModel ref={modelRef} url='/hologramDesk.glb' position={[0, -1.5, -1]} />
          
          {/* Hidden votive stand model to extract VCANDLEs from */}
          <group visible={false}>
            <Model
              modelRef={votiveModelRef}
              scale={1}
              rotation={[0, 0, 0]}
              setIsModelLoaded={setIsVotiveModelLoaded}
              isModelLoaded={isVotiveModelLoaded}
              onModelDataLoaded={() => console.log('Votive model loaded')}
              isMobileView={false}
            />
          </group>
          
          
          <group renderOrder={-1}>
            <HolographicStatue2
              position={statuePosition}
              scale={[1.7, 1.7, 1.7]}
              hover={true}
              rotate={true}
            />
          </group>
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            enableDamping={true}
            dampingFactor={0.5}
            minDistance={1}
            maxDistance={7}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
            zoomToCursor={true}
          />
          
          {/* Marquee Candles - Use MarqueeCandles when votive model is loaded */}
          {/* {isVotiveModelLoaded && votiveModelRef.current ? ( */}
            <MarqueeCandles
              candleData={candleData}
              onCandleClick={handleCandleClick}
              modelRef={votiveModelRef}
              currentPage={currentPage}
              itemsPerPage={8}
              scrollSpeed={0.2}
            />
          {/* ) : (
            <SimpleMarqueeCandles
              candleData={candleData}
              onCandleClick={handleCandleClick}
              currentPage={currentPage}
              itemsPerPage={10}
              scrollSpeed={0.5}
            />
          )} */}
          
          {/* Post-processing effects for 80s mode */}
          <PostProcessingEffects is80sMode={is80sMode} />
        </Suspense>
      </Canvas>
      

      
      {/* Pagination Controls */}
      <Box
        position="absolute"
        bottom="2.5rem"
        left="50%"
        transform="translateX(-50%)"
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap="0.5rem"
        zIndex={20}
        pointerEvents="auto"
      >
        {/* Title */}
        <Text 
                className={!is80sMode ? "thelma2" : ""}
                fontSize="2rem"
                // Override styles in 80s mode for chrome/neon effect
                sx={is80sMode ? {
                  fontWeight: "900",
                  lineHeight: "0.8",
                  // transform: "rotate(-8deg) skew(-15deg)",
                  background: "linear-gradient(45deg, #ff00ff, #00ffff, #ff00ff)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  position: "relative",
         
                  filter: `
                    drop-shadow(0 0 4px rgba(255, 255, 255, 0.2))
                    drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))
                    drop-shadow(0 0 12px rgba(0, 255, 255, 0.3))
                    drop-shadow(0 0 20px rgba(255, 0, 255, 0.2))
                  `,
                  animation: "neonPulse 2s ease-in-out infinite alternate",
                  // Add TWO pseudo-elements - one for white outline, one for colorful text
                  _after: {
                    content: "'THE ILLUMIN80'",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: -1,
                    color: "transparent",
                    WebkitTextStroke: "1px white",
                    filter: "blur(1px)",
                    opacity: 0.5,
                  },
                  "@keyframes neonPulse": {
                    "0%": {
                      filter: `
                        drop-shadow(0 0 4px rgba(255, 255, 255, 0.2))
                        drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))
                        drop-shadow(0 0 12px rgba(0, 255, 255, 0.3))
                        drop-shadow(0 0 20px rgba(255, 0, 255, 0.2))
                      `,
                    },
                    "100%": {
                      filter: `
                        drop-shadow(0 0 6px rgba(255, 255, 255, 0.3))
                        drop-shadow(0 0 12px rgba(255, 255, 255, 0.4))
                        drop-shadow(0 0 18px rgba(0, 255, 255, 0.4))
                        drop-shadow(0 0 30px rgba(255, 0, 255, 0.3))
                      `,
                    }
                  }
                } : {}}
              >
                THE ILLUMIN80
              </Text>
        
        {/* Controls */}
        <Box
          display="flex"
          alignItems="center"
          gap="1rem"
          bg="rgba(0, 0, 0, 0.7)"
          borderRadius="full"
          px="2rem"
          py="0.5rem"
          border="2px solid rgba(139, 92, 246, 0.5)"
          boxShadow="0 0 20px rgba(139, 92, 246, 0.3)"
        >
        {/* Left Arrow */}
        <IconButton
          aria-label="Previous Page"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          }
          color="#a78bfa"
          bg="transparent"
          borderRadius="full"
          border="2px solid #8b5cf6"
          onClick={() => {
            console.log('Previous button clicked');
            const newPage = (currentPage - 1 + totalPages) % totalPages;
            console.log('Setting page from', currentPage, 'to', newPage);
            setCurrentPage(newPage);
          }}
          _hover={{
            bg: "rgba(139, 92, 246, 0.2)",
            transform: "scale(1.1)",
          }}
          size="sm"
        />
        
        {/* Page Indicator */}
        <Text
          color="#e9d5ff"
          fontSize="sm"
          fontWeight="bold"
          minW="100px"
          textAlign="center"
        >
          {currentPage + 1} / {totalPages}
        </Text>
        
        {/* Right Arrow */}
        <IconButton
          aria-label="Next Page"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          }
          color="#a78bfa"
          bg="transparent"
          borderRadius="full"
          border="2px solid #8b5cf6"
          onClick={() => {
            console.log('Next button clicked');
            const newPage = (currentPage + 1) % totalPages;
            console.log('Setting page from', currentPage, 'to', newPage);
            setCurrentPage(newPage);
          }}
          _hover={{
            bg: "rgba(139, 92, 246, 0.2)",
            transform: "scale(1.1)",
          }}
          size="sm"
        />
        </Box>
      </Box>
      
      {/* Floating Candle Viewer */}
      <FloatingCandleViewer
        isVisible={isOpen}
        onClose={handleModalClose}
        userData={selectedCandle}
        onNavigate={(direction) => {
          window.candleViewerNavigate && window.candleViewerNavigate(direction);
        }}
        currentIndex={candleData.findIndex(c => c.id === selectedCandle?.id)}
        totalCandles={candleData.length}
      />
      
      {/* Music Player UI */}
      {!showMobileMusicPlayer ? (
        <>
          {/* Music Icon Button */}
          <IconButton
            position="fixed"
            top="2rem"
            right={isMobile ? "20px" : "2rem"}
            zIndex="1100"
            aria-label="Music Player"
            icon={
              <svg width={isMobile ? "24" : "2.5rem"} height={isMobile ? "24" : "2.5rem"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/>
                <circle cx="6" cy="18" r="3"/>
                <circle cx="18" cy="16" r="3"/>
              </svg>
            }
            color="white"
            bg="transparent"
            size="md"
            onClick={() => {
            console.log('🎵 Music icon clicked');
            setUserClosedMusic(false);
            
            if (contextShowSpotify && contextIsPlaying) {
              // Music is already playing, just show the UI
              console.log('🎵 Music already playing, showing UI');
              setShowMobileMusicPlayer(true);
              setMusicPlayerVisible(true);
            } else {
              // Start fresh music playback
              setShowMobileMusicPlayer(true);
              setMusicPlayerVisible(true);
              setContextShowSpotify(true);
              
              // Trigger auto-play after a delay to ensure player and track are ready
              setTimeout(() => {
                if (musicPlayerControls && musicPlayerControls.play) {
                  console.log('🎵 Auto-playing music after icon click');
                  musicPlayerControls.play();
                } else {
                  console.log('🎵 Controls not ready yet, will auto-play when ready');
                }
              }, 500); // Increased delay to ensure track is loaded
            }
          }}
          _hover={{
            bg: "rgba(255, 255, 255, 0.1)",
          }}
          />
          
          {/* 80s Mode Toggle */}
          <Box
            position="fixed"
            top="5.5rem"
            right={isMobile ? "20px" : "2rem"}
            zIndex="1100"
            display="flex"
            alignItems="center"
            gap="12px"
            bg="rgba(0, 0, 0, 0.8)"
            backdropFilter="blur(10px)"
            borderRadius="full"
            px="16px"
            py="8px"
            border="1px solid rgba(255, 255, 255, 0.2)"
          >
            <Text
              color="#67e8f9"
              fontSize="12px"
              fontWeight="bold"
              letterSpacing="0.5px"
              textTransform="uppercase"
            >
              80s Mode
            </Text>
            <Box
              as="button"
              position="relative"
              width="44px"
              height="24px"
              borderRadius="12px"
              bg={is80sMode ? "#d946ef" : "rgba(255, 255, 255, 0.2)"}
              border={is80sMode ? "1px solid #d946ef" : "1px solid rgba(255, 255, 255, 0.3)"}
              cursor="pointer"
              transition="all 0.3s ease"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎵 80s Mode Toggle clicked, current state:', is80sMode);
                toggle80sMode();
              }}
              _hover={{
                bg: is80sMode ? "#e879f9" : "rgba(255, 255, 255, 0.3)",
              }}
            >
              <Box
                position="absolute"
                top="2px"
                left={is80sMode ? "22px" : "2px"}
                width="18px"
                height="18px"
                borderRadius="50%"
                bg="white"
                transition="all 0.3s ease"
                boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
              />
              {/* {is80sMode && (
                <Text
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  fontSize="10px"
                  fontWeight="bold"
                  color="#00ff41"
                  zIndex="1"
                >
                  80
                </Text>
              )} */}
            </Box>
          </Box>
        </>
      ) : (
        // Minimal Music Player with overlay to block 3D interactions
        <>
          {/* Invisible overlay to prevent 3D scene interactions */}
          <Box
            position="fixed"
            bottom="2rem"
            right="0"
            width={isMobile ? "200px" : "250px"}
            height="100px"
            zIndex="9998"
            pointerEvents="auto"
            bg="transparent"
            cursor="default"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              e.stopPropagation();
            }}
          />
          
          {/* Music Player Controls */}
          <Box
            position="fixed"
            top="2rem"
            right={isMobile ? "20px" : "2rem"}
            zIndex="9999"
            display="flex"
            alignItems="center"
            gap="8px"
            pointerEvents="auto"
            isolation="isolate"
          >
            {/* Spinning Album Art */}
            <Box
              width="40px"
              height="40px"
              borderRadius="50%"
              backgroundImage="url('/virginRecords.jpg')"
              backgroundSize="cover"
              backgroundPosition="center"
              transition="all 0.3s ease"
              position="relative"
              sx={{
                animation: musicPlayerVisible && isPlaying ? "spin 3s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" }
                }
              }}
            >
              {/* 80s Mode Indicator */}
              {/* {is80sMode && (
                <Box
                  position="absolute"
                  top="-8px"
                  right="-8px"
                  bg="#00ff41"
                  color="#000"
                  fontSize="10px"
                  fontWeight="bold"
                  borderRadius="full"
                  width="20px"
                  height="20px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  border="2px solid #000"
                  boxShadow="0 0 10px rgba(0, 255, 65, 0.8)"
                >
                  80
                </Box>
              )} */}
            </Box>
            
            {/* Skip Button */}
            <IconButton
              aria-label="Next Track"
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4"/>
                  <line x1="19" y1="5" x2="19" y2="19"/>
                </svg>
              }
              color="white"
              bg="rgba(255, 255, 255, 0.1)"
              size="sm"
              minW="32px"
              height="32px"
              position="relative"
              zIndex="10000"
              pointerEvents="auto"
              onClick={() => {
                console.log('🎵 Skip button clicked');
                
                if (musicPlayerControls && musicPlayerControls.skipTrack) {
                  console.log('🎵 Using music player controls to skip');
                  musicPlayerControls.skipTrack();
                } else {
                  console.log('⚠️ No skip controls available');
                  window.postMessage({ type: 'SKIP_TRACK' }, '*');
                }
              }}
              _hover={{
                bg: "rgba(255, 255, 255, 0.2)",
              }}
            />
            
            {/* Close Button */}
            <Box
              as="button"
              aria-label="Close Music Player"
              width="28px"
              height="28px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              bg="rgba(255, 255, 255, 0.1)"
              borderRadius="4px"
              color="white"
              position="relative"
              zIndex="10000"
              cursor="pointer"
              pointerEvents="auto"
              border="1px solid rgba(255, 255, 255, 0.3)"
              _hover={{
                bg: "rgba(255, 0, 0, 0.5)",
                transform: "scale(1.1)",
              }}
              onClick={(e) => {
                console.log('🎵 Close button clicked!');
                e.stopPropagation();
                e.preventDefault();
                handleMusicPlayerClose();
              }}
              onTouchEnd={(e) => {
                console.log('🎵 Close button touch end!');
                e.stopPropagation();
                e.preventDefault();
                handleMusicPlayerClose();
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </Box>
          </Box>
          
          {/* 80s Mode Toggle - visible with music player */}
          <Box
            position="fixed"
            top="5.5rem"
            right={isMobile ? "20px" : "2rem"}
            zIndex="9999"
            display="flex"
            alignItems="center"
            gap="12px"
            bg="rgba(0, 0, 0, 0.8)"
            backdropFilter="blur(10px)"
            borderRadius="full"
            px="16px"
            py="8px"
            border="1px solid rgba(255, 255, 255, 0.2)"
          >
            <Text
              color="#67e8f9"
              fontSize="12px"
              fontWeight="bold"
              letterSpacing="0.5px"
              textTransform="uppercase"
            >
              80s Mode
            </Text>
            <Box
              as="button"
              position="relative"
              width="44px"
              height="24px"
              borderRadius="12px"
              bg={is80sMode ? "#d946ef" : "rgba(255, 255, 255, 0.2)"}
              border={is80sMode ? "1px solid #d946ef" : "1px solid rgba(255, 255, 255, 0.3)"}
              cursor="pointer"
              transition="all 0.3s ease"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🎵 80s Mode Toggle clicked, current state:', is80sMode);
                toggle80sMode();
              }}
              _hover={{
                bg: is80sMode ? "#e879f9" : "rgba(255, 255, 255, 0.3)",
              }}
            >
              <Box
                position="absolute"
                top="2px"
                left={is80sMode ? "22px" : "2px"}
                width="18px"
                height="18px"
                borderRadius="50%"
                bg="white"
                transition="all 0.3s ease"
                boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
              />
              {is80sMode && (
                <Text
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  fontSize="10px"
                  fontWeight="bold"
                  color="#00ff41"
                  zIndex="1"
                >
                  80
                </Text>
              )}
            </Box>
          </Box>
        </>
      )}
      
      {/* Hidden Music Player Component */}
      {showMobileMusicPlayer && (
        <Box display="none">
          <MobileMusicPlayer
            isVisible={true}
            isMobile={true}
            autoPlay={true}
            is80sMode={is80sMode}
            onModeChange={handleMusicModeChange}
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
     
    </div>
  );
}




 {/* UI Overlay */}
//  <div style={{
//   position: 'absolute',
//   bottom: '2rem',
//   left: '50%',
//   transform: 'translateX(-50%)',
//   display: 'flex',
//   gap: '1rem',
//   fontSize: 'clamp(14px, 2vw, 18px)',
//   fontColor: 'white',
//   zIndex: 10
// }}>
//   <GlassButton onClick={() => console.log('Generate clicked')}>
//     Generate
//   </GlassButton>
//   <GlassButton onClick={() => console.log('Customize clicked')}>
//     Customize
//   </GlassButton>
//   <GlassButton onClick={() => console.log('Share clicked')}>
//     Share
//   </GlassButton>
// </div>