import React, { useState, useRef, useEffect, memo } from 'react';
import { Box, IconButton, Text } from '@chakra-ui/react';
import { storage } from '../utilities/firebaseClient';
import { ref as storageRefUtil, getDownloadURL } from 'firebase/storage';

/**
 * Simplified Music Player Component
 * Minimal UI to prevent HolographicStatue blinking
 */
const SimplifiedMusicPlayer = memo(({ 
  isVisible, 
  onClose, 
  is80sMode = false,
  onModeChange,
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [trackUrl, setTrackUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef(null);
  
  // Track lists with Firebase Storage paths
  const tracks80s = [
    { name: "For Those About to Rock", path: "audio/320k/for-those-about-to-rock-ac-dc.m4a" },
    { name: "99 Luftballoons", path: "audio/320k/99-luftballoons-nena.m4a" },
    { name: "Like a Prayer", path: "audio/320k/like-a-prayer-madonna.m4a" },
    { name: "Good Life", path: "audio/320k/good-life-inner-city.m4a" },
    { name: "Dirty Cash", path: "audio/320k/dirty-cash.m4a" },
    { name: "Intergalactic", path: "audio/320k/intergalactic-beastie-boys.m4a" },


  ];
  
  const tracksAlt = [
    { name: "Rocket Man", path: "audio/320k/rocket-man---steven-drozd.m4a" },
  ];
  
  const currentTracks = is80sMode ? tracks80s : tracksAlt;
  const currentTrack = currentTracks[currentTrackIndex];
  
  // Initialize audio element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', handleTrackEnd);
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('ended', handleTrackEnd);
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);
  
  // Load track from Firebase when index or mode changes
  useEffect(() => {
    async function loadTrackUrl() {
      if (!currentTrack || !currentTrack.path) {
        console.error('No track or path available');
        return;
      }
      
      setIsLoading(true);
      
      try {
        const storageReference = storageRefUtil(storage, currentTrack.path);
        const downloadUrl = await getDownloadURL(storageReference);
        setTrackUrl(downloadUrl);
        
        // Update audio element with new URL
        if (audioRef.current) {
          audioRef.current.src = downloadUrl;
          // If we're supposed to be playing (from autoPlay or user action), start playback
          if (isPlaying || (autoPlay && isVisible)) {
            audioRef.current.play()
              .then(() => {
                setIsPlaying(true);
                console.log('🎵 SimplifiedMusicPlayer: Started playing after loading track');
              })
              .catch(err => console.warn('Playback failed:', err));
          }
        }
      } catch (error) {
        console.error('Error getting track URL from Firebase:', error);
        setTrackUrl('');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTrackUrl();
  }, [currentTrackIndex, is80sMode]);
  
  // Auto-play when component becomes visible and autoPlay is true
  useEffect(() => {
    if (autoPlay && isVisible && audioRef.current && trackUrl && !isPlaying) {
      console.log('🎵 SimplifiedMusicPlayer: Auto-playing because music was toggled on');
      play();
    }
  }, [isVisible, autoPlay, trackUrl]);
  
  const handleTrackEnd = () => {
    // Auto-advance to next track
    skipTrack();
  };
  
  const play = () => {
    if (audioRef.current && trackUrl) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          console.log('🎵 SimplifiedMusicPlayer: Started playing');
        })
        .catch(err => {
          console.warn('Playback failed:', err);
          setIsPlaying(false);
        });
    } else if (!trackUrl) {
      console.log('🎵 SimplifiedMusicPlayer: Waiting for track URL to load');
    }
  };
  
  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      console.log('🎵 SimplifiedMusicPlayer: Paused');
    }
  };
  
  const skipTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % currentTracks.length);
  };
  
  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };
  
  // Handle visibility changes
  useEffect(() => {
    if (!isVisible && audioRef.current) {
      pause();
    }
  }, [isVisible]);
  
  if (!isVisible) return null;
  
  return (
    <>
    <Box
      position="fixed"
      bottom="2.5rem"
      right="1.5rem"
      display="flex"
      alignItems="center"
      gap="12px"
      bg={is80sMode ? 
        "linear-gradient(135deg, rgba(217, 70, 239, 0.15), rgba(103, 232, 249, 0.15))" : 
        "rgba(13, 25, 42, 0.95)"
      }
      borderRadius="full"
      padding="10px 16px"
      boxShadow={is80sMode ?
        "0 0 20px rgba(217, 70, 239, 0.4), 0 0 40px rgba(103, 232, 249, 0.2), inset 0 0 20px rgba(217, 70, 239, 0.1)" :
        "0 0 15px rgba(103, 232, 249, 0.3), inset 0 0 10px rgba(103, 232, 249, 0.1)"
      }
      border={is80sMode ? "1px solid rgba(217, 70, 239, 0.6)" : "1px solid #0e7490"}
      backdropFilter="blur(20px)"
      zIndex={10000}
      maxWidth="320px" // Ensure it fits within SidePanelEnhanced's 380px width with margin
      // Performance optimizations
      transform="translateZ(0)"
      willChange="transform"
      contain="layout style paint"
      _before={{
        content: '""',
        position: "absolute",
        inset: 0,
        borderRadius: "full",
        background: is80sMode ?
          "linear-gradient(45deg, transparent 30%, rgba(217, 70, 239, 0.1) 50%, transparent 70%)" :
          "linear-gradient(45deg, transparent 30%, rgba(103, 232, 249, 0.1) 50%, transparent 70%)",
        opacity: 0.5,
        animation: "shimmerMusic 3s ease-in-out infinite"
      }}
    >
      {/* Album Art */}
      <Box
        width="44px"
        height="44px"
        borderRadius="50%"
        backgroundImage="url('/virginRecords.jpg')"
        backgroundSize="cover"
        backgroundPosition="center"
        cursor="pointer"
        onClick={togglePlayPause}
        transition="all 0.3s ease"
        border={is80sMode ? "2px solid rgba(217, 70, 239, 0.6)" : "2px solid rgba(103, 232, 249, 0.4)"}
        boxShadow={isPlaying ? 
          (is80sMode ? 
            "0 0 15px rgba(217, 70, 239, 0.6), 0 0 25px rgba(103, 232, 249, 0.4)" :
            "0 0 12px rgba(103, 232, 249, 0.5)"
          ) : "0 0 8px rgba(0, 0, 0, 0.3)"
        }
        sx={{
          animation: isPlaying ? "spin 3s linear infinite" : (isLoading ? "pulse 1s ease-in-out infinite" : "none"),
          "@keyframes spin": {
            "0%": { transform: "rotate(0deg)" },
            "100%": { transform: "rotate(360deg)" }
          },
          "@keyframes pulse": {
            "0%": { opacity: 0.5 },
            "50%": { opacity: 1 },
            "100%": { opacity: 0.5 }
          }
        }}
        _hover={{
          transform: isPlaying ? "scale(1.05)" : "scale(1.05)",
          boxShadow: is80sMode ? 
            "0 0 20px rgba(217, 70, 239, 0.8), 0 0 30px rgba(103, 232, 249, 0.5)" :
            "0 0 15px rgba(103, 232, 249, 0.7)"
        }}
      />
      
      {/* Track Info */}
      <Box maxWidth="150px" overflow="hidden">
        <Text
          color={is80sMode ? "#ffffff" : "#67e8f9"}
          fontSize="13px"
          fontWeight="bold"
          whiteSpace="nowrap"
          textOverflow="ellipsis"
          overflow="hidden"
          textShadow={is80sMode ? 
            "0 0 8px rgba(217, 70, 239, 0.6)" : 
            "0 0 6px rgba(103, 232, 249, 0.4)"
          }
        >
          {isLoading ? 'Loading...' : (currentTrack?.name || 'No Track')}
        </Text>
        <Text
          color={is80sMode ? "#d946ef" : "#67e8f9"}
          fontSize="11px"
          cursor="pointer"
          onClick={() => onModeChange && onModeChange(!is80sMode)}
          fontFamily="monospace"
          fontWeight="500"
          transition="all 0.2s ease"
          _hover={{ 
            textDecoration: "underline",
            textShadow: is80sMode ? 
              "0 0 10px rgba(217, 70, 239, 0.8)" : 
              "0 0 8px rgba(103, 232, 249, 0.6)",
            transform: "translateX(2px)"
          }}
        >
          {is80sMode ? "80s Mode" : "Alt Mode"}
        </Text>
      </Box>
      
      {/* Controls */}
      <Box display="flex" alignItems="center" gap="6px">
        {/* Play/Pause */}
        <IconButton
          aria-label={isPlaying ? "Pause" : "Play"}
          icon={
            isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill={is80sMode ? "#ffffff" : "#67e8f9"}>
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill={is80sMode ? "#ffffff" : "#67e8f9"}>
                <path d="M8 5v14l11-7z" />
              </svg>
            )
          }
          size="sm"
          variant="ghost"
          bg="rgba(255, 255, 255, 0.05)"
          border="1px solid"
          borderColor={is80sMode ? "rgba(217, 70, 239, 0.3)" : "rgba(103, 232, 249, 0.3)"}
          borderRadius="full"
          onClick={togglePlayPause}
          _hover={{ 
            bg: is80sMode ? "rgba(217, 70, 239, 0.2)" : "rgba(103, 232, 249, 0.15)",
            borderColor: is80sMode ? "rgba(217, 70, 239, 0.6)" : "rgba(103, 232, 249, 0.5)",
            transform: "scale(1.05)"
          }}
          _active={{
            transform: "scale(0.95)"
          }}
          transition="all 0.2s ease"
        />
        
        {/* Skip */}
        <IconButton
          aria-label="Next Track"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={is80sMode ? "#ffffff" : "#67e8f9"} strokeWidth="2">
              <polygon points="5 4 15 12 5 20 5 4"/>
              <line x1="19" y1="5" x2="19" y2="19"/>
            </svg>
          }
          size="sm"
          variant="ghost"
          bg="rgba(255, 255, 255, 0.05)"
          border="1px solid"
          borderColor={is80sMode ? "rgba(217, 70, 239, 0.3)" : "rgba(103, 232, 249, 0.3)"}
          borderRadius="full"
          onClick={skipTrack}
          _hover={{ 
            bg: is80sMode ? "rgba(217, 70, 239, 0.2)" : "rgba(103, 232, 249, 0.15)",
            borderColor: is80sMode ? "rgba(217, 70, 239, 0.6)" : "rgba(103, 232, 249, 0.5)",
            transform: "scale(1.05)"
          }}
          _active={{
            transform: "scale(0.95)"
          }}
          transition="all 0.2s ease"
        />
        
        {/* Close */}
        <IconButton
          aria-label="Close"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={is80sMode ? "#ff6b6b" : "#ef4444"} strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          }
          size="sm"
          variant="ghost"
          bg="rgba(239, 68, 68, 0.1)"
          border="1px solid rgba(239, 68, 68, 0.3)"
          borderRadius="full"
          onClick={() => {
            pause();
            onClose && onClose();
          }}
          _hover={{ 
            bg: "rgba(239, 68, 68, 0.2)",
            borderColor: "rgba(239, 68, 68, 0.5)",
            transform: "scale(1.05)"
          }}
          _active={{
            transform: "scale(0.95)"
          }}
          transition="all 0.2s ease"
        />
      </Box>
    </Box>
    
    {/* CSS for animations */}
    <style jsx global>{`
      @keyframes shimmerMusic {
        0% {
          transform: translateX(-100%) rotate(45deg);
        }
        100% {
          transform: translateX(200%) rotate(45deg);
        }
      }
    `}</style>
    </>
  );
});

SimplifiedMusicPlayer.displayName = 'SimplifiedMusicPlayer';

export default SimplifiedMusicPlayer;