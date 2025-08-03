import React, { useState, useRef, useEffect, useCallback } from "react";
import { Box, Text } from "@chakra-ui/react";
import { storage } from "../utilities/firebaseClient";
import { ref as storageRefUtil, getDownloadURL } from "firebase/storage";
import { useMusic } from "../contexts/MusicContext";

const SimpleMusicPlayer = ({ 
  isVisible, 
  autoPlay = true, 
  is80sMode = false, 
  onPlayingStateChange, 
  hideUI = false, 
  onControlsReady,
  onClose 
}) => {
  // State - must be declared before any returns
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Use ref to track current index for reliable access in callbacks
  const currentTrackIndexRef = useRef(0);
  const isInitializedRef = useRef(false);
  const lastModeRef = useRef(is80sMode);
  const prevModeRef = useRef(is80sMode);
  
  // Use shared audio from MusicContext
  const { audioRef } = useMusic();
  
  // Track lists
  const non80sTracks = [
    { name: "Lifetimes", path: "audio/192k/07-lifetimes.m4a" },
    { name: "Rocket Man - Steven Drozd", path: "audio/192k/rocket-man---steven-drozd.m4a" }
  ];
  
  const eightyTracks = [
    { name: "For Those About To Rock - AC/DC", path: "audio/320k/for-those-about-to-rock-ac-dc.m4a" },
    { name: "Dirty Cash - The Adventures of Stevie V", path: "audio/320k/dirty-cash.m4a" },
    { name: "Sweet Dreams - Eurythmics", path: "audio/320k/sweet-dreams-eurythmics.m4a" },
    { name: "Intergalactic - Beastie Boys", path: "audio/320k/intergalactic-beastie-boys.m4a" },
    { name: "1984 - Van Halen", path: "audio/192k/vanhalen---1984.mp3" },
    { name: "Good Life - Inner City", path: "audio/320k/good-life-inner-city.m4a" },
    { name: "Like A Prayer - Madonna", path: "audio/320k/like-a-prayer-madonna.m4a" },
    { name: "99 Luftballoons - Nena", path: "audio/320k/99-luftballoons-nena.m4a" }
  ];
  
  // Get current playlist based on mode
  const currentPlaylist = is80sMode ? eightyTracks : non80sTracks;
  
  // Load and play track
  const loadTrack = useCallback(async (index) => {
    // Get fresh playlist based on current mode
    const playlist = is80sMode ? eightyTracks : non80sTracks;
    
    if (!audioRef.current || index < 0 || index >= playlist.length) return;
    
    console.log('🎵 Loading track:', index, playlist[index].name, `(${is80sMode ? '80s' : 'normal'} mode)`);
    console.log('🎵 Playlist being used:', is80sMode ? 'eightyTracks' : 'non80sTracks');
    console.log('🎵 Track path:', playlist[index].path);
    setIsLoading(true);
    
    try {
      // Get track URL from Firebase
      const trackRef = storageRefUtil(storage, playlist[index].path);
      const url = await getDownloadURL(trackRef);
      
      // Update audio element
      audioRef.current.src = url;
      audioRef.current.load();
      
      // Wait for track to be ready
      await new Promise((resolve) => {
        const handleCanPlay = () => {
          audioRef.current.removeEventListener('canplaythrough', handleCanPlay);
          resolve();
        };
        audioRef.current.addEventListener('canplaythrough', handleCanPlay);
      });
      
      setCurrentTrackIndex(index);
      currentTrackIndexRef.current = index; // Update ref too
      setIsLoading(false);
      
      // Auto-play if requested
      if (autoPlay && audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          if (onPlayingStateChange) onPlayingStateChange(true);
        }).catch(e => console.log('Auto-play blocked:', e));
      }
    } catch (error) {
      console.error('❌ Error loading track:', error);
      console.error('❌ Failed track was:', playlist[index]);
      setIsLoading(false);
    }
  }, [audioRef, autoPlay, onPlayingStateChange, is80sMode]);
  
  // Play/pause controls
  const play = useCallback(() => {
    if (audioRef.current && !isLoading) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        if (onPlayingStateChange) onPlayingStateChange(true);
      }).catch(e => console.log('Play blocked:', e));
    }
  }, [isLoading, onPlayingStateChange]);
  
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (onPlayingStateChange) onPlayingStateChange(false);
    }
  }, [onPlayingStateChange]);
  
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);
  
  // Skip to next track
  const skipTrack = useCallback(async () => {
    // Prevent skipping while loading
    if (isLoading) {
      console.log('🎵 Skip prevented - currently loading');
      return;
    }
    
    // Get fresh playlist based on current mode
    const playlist = is80sMode ? eightyTracks : non80sTracks;
    
    // Use ref for most up-to-date index
    const currentIndex = currentTrackIndexRef.current;
    const nextIndex = (currentIndex + 1) % playlist.length;
    console.log('🎵 Skipping from track', currentIndex, 'to track:', nextIndex, `in ${is80sMode ? '80s' : 'normal'} mode`);
    console.log('🎵 Current is80sMode value:', is80sMode);
    console.log('🎵 Current playlist has', playlist.length, 'tracks');
    console.log('🎵 Next track will be:', playlist[nextIndex]?.name);
    console.log('🎵 Next track path:', playlist[nextIndex]?.path);
    
    // Load the next track
    await loadTrack(nextIndex);
  }, [loadTrack, is80sMode, isLoading]);
  
  useEffect(() => {
    // Reset initialization when mode changes
    if (lastModeRef.current !== is80sMode) {
      lastModeRef.current = is80sMode;
      isInitializedRef.current = false;
    }
    
    if (isVisible && currentPlaylist.length > 0 && !isInitializedRef.current) {
      console.log('🎵 Initializing first track for', is80sMode ? '80s' : 'normal', 'mode');
      isInitializedRef.current = true;
      loadTrack(0);
    }
  }, [isVisible, currentPlaylist.length, loadTrack, is80sMode]);
  
  // Handle track end
  useEffect(() => {
    if (!audioRef.current) return;
    
    const handleEnded = () => {
      console.log('🎵 Track ended, skipping to next in', is80sMode ? '80s' : 'normal', 'mode');
      skipTrack();
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
      if (onPlayingStateChange) onPlayingStateChange(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      if (onPlayingStateChange) onPlayingStateChange(false);
    };
    
    audioRef.current.addEventListener('ended', handleEnded);
    audioRef.current.addEventListener('play', handlePlay);
    audioRef.current.addEventListener('pause', handlePause);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', handleEnded);
        audioRef.current.removeEventListener('play', handlePlay);
        audioRef.current.removeEventListener('pause', handlePause);
      }
    };
  }, [skipTrack, onPlayingStateChange, audioRef, is80sMode]);
  
  // Pass controls to parent whenever they change
  useEffect(() => {
    if (onControlsReady) {
      console.log('🎵 Updating music controls with is80sMode:', is80sMode);
      onControlsReady({
        play,
        pause,
        togglePlayPause,
        skipTrack,
        isPlaying: () => audioRef.current && !audioRef.current.paused
      });
    }
  }, [onControlsReady, play, pause, togglePlayPause, skipTrack, is80sMode]);
  
  // Reset track index when mode changes
  useEffect(() => {
    if (prevModeRef.current !== is80sMode) {
      const newPlaylist = is80sMode ? eightyTracks : non80sTracks;
      console.log('🎵 Mode changed from', prevModeRef.current ? '80s' : 'normal', 'to', is80sMode ? '80s' : 'normal');
      console.log('🎵 New playlist:', is80sMode ? 'eightyTracks' : 'non80sTracks', 'with', newPlaylist.length, 'tracks');
      prevModeRef.current = is80sMode;
      
      // Always reset to track 0 when switching modes
      setCurrentTrackIndex(0);
      currentTrackIndexRef.current = 0;
      
      // Reset initialization flag
      isInitializedRef.current = false;
      
      // Force reload from the new playlist
      if (isVisible && audioRef.current) {
        // Remember if we were playing
        const wasPlaying = !audioRef.current.paused;
        console.log('🎵 Was playing before mode switch:', wasPlaying);
        
        // Stop current playback
        audioRef.current.pause();
        audioRef.current.src = '';
        
        // Load first track from new playlist
        setTimeout(() => {
          console.log('🎵 Loading first track from new playlist');
          loadTrack(0);
          
          // Resume playback if we were playing before
          if (wasPlaying) {
            setTimeout(() => {
              console.log('🎵 Resuming playback after mode switch');
              play();
            }, 200); // Give time for track to load
          }
        }, 100); // Small delay to ensure state updates
      }
    }
  }, [is80sMode, isVisible, loadTrack, audioRef, play]);
  
  // Ensure audioRef exists
  if (!audioRef) {
    console.error('SimpleMusicPlayer: audioRef not available from MusicContext');
    return null;
  }
  
  if (!isVisible || hideUI) return null;
  
  return (
    <Box
      position="fixed"
      bottom={isMinimized ? "11px" : "100px"}
      left={isMinimized ? "calc((100% / 5) * 0.5 - 24px)" : "50%"}
      transform={isMinimized ? "none" : "translateX(-50%)"}
      width={isMinimized ? "48px" : "280px"}
      height={isMinimized ? "48px" : "100px"}
      bg={isMinimized ? "transparent" : "rgba(15, 23, 42, 0.95)"}
      border={isMinimized ? "2px solid #22d3ee" : "2px solid #22d3ee"}
      borderRadius={isMinimized ? "50%" : "12px"}
      backdropFilter={isMinimized ? "none" : "blur(10px)"}
      boxShadow={isMinimized ? "0 0 10px rgba(6, 182, 212, 0.3)" : "0 4px 20px rgba(6, 182, 212, 0.8)"}
      display="flex"
      alignItems="center"
      justifyContent={isMinimized ? "center" : "flex-start"}
      gap={isMinimized ? 0 : 3}
      p={isMinimized ? 0 : 2}
      zIndex={isMinimized ? "1001" : "9999"}
      transition="all 0.5s ease"
    >
      {/* Minimized view */}
      {isMinimized && (
        <Box
          role="group"
          width="48px"
          height="48px"
          borderRadius="50%"
          backgroundImage="url('/virginRecords.jpg')"
          backgroundSize="cover"
          backgroundPosition="center"
          display="flex"
          alignItems="center"
          justifyContent="center"
          position="relative"
          cursor="pointer"
          onClick={() => setIsMinimized(false)}
          sx={{
            animation: isPlaying ? "spin 3s linear infinite" : "none",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" }
            }
          }}
        >
          <Box
            position="absolute"
            bg="rgba(0, 0, 0, 0.7)"
            borderRadius="50%"
            width="20px"
            height="20px"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="10px"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </Box>
        </Box>
      )}
      
      {/* Full view */}
      {!isMinimized && (
        <Box flex="1" minWidth="0" px={3}>
          <Text
            fontSize="0.75rem"
            fontWeight="bold"
            color="#22d3ee"
            fontFamily="monospace"
            textAlign="center"
            mb={2}
            noOfLines={1}
          >
            {isLoading ? "Loading..." : (is80sMode ? eightyTracks : non80sTracks)[currentTrackIndex]?.name || "No track"}
          </Text>
          
          <Box display="flex" gap={6} justifyContent="center" alignItems="center">
            {/* Previous (placeholder) */}
            <Text fontSize="1.5rem" color="#67e8f9" opacity={0.3} userSelect="none">
              ⏮️
            </Text>
            
            {/* Play/Pause */}
            <Box
              width="60px"
              height="60px"
              borderRadius="50%"
              backgroundImage="url('/virginRecords.jpg')"
              backgroundSize="cover"
              backgroundPosition="center"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              border="2px solid #22d3ee"
              onClick={togglePlayPause}
              sx={{
                animation: isPlaying ? "spin 3s linear infinite" : "none",
                "@keyframes spin": {
                  "0%": { transform: "rotate(0deg)" },
                  "100%": { transform: "rotate(360deg)" }
                }
              }}
            >
              <Box
                bg="rgba(0, 0, 0, 0.7)"
                borderRadius="50%"
                width="28px"
                height="28px"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="14px"
              >
                {isPlaying ? "⏸️" : "▶️"}
              </Box>
            </Box>
            
            {/* Skip */}
            <Text
              fontSize="1.5rem"
              color={isLoading ? "#67e8f9" : "#67e8f9"}
              cursor={isLoading ? "not-allowed" : "pointer"}
              opacity={isLoading ? 0.5 : 1}
              p={2}
              borderRadius="8px"
              _hover={isLoading ? {} : { 
                color: "#22d3ee",
                bg: "rgba(34, 211, 238, 0.15)",
                transform: "scale(1.15)"
              }}
              onClick={isLoading ? undefined : skipTrack}
              userSelect="none"
              transition="all 0.2s ease"
            >
              ⏭️
            </Text>
          </Box>
        </Box>
      )}
      
      {/* Control buttons */}
      {!isMinimized && (
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Minimize button */}
          <Box
            width="40px"
            height="40px"
            borderRadius="50%"
            bg="rgba(34, 211, 238, 0.25)"
            border="2px solid #22d3ee"
            display="flex"
            alignItems="center"
            justifyContent="center"
            cursor="pointer"
            fontSize="1.2rem"
            color="#22d3ee"
            _hover={{
              bg: "rgba(34, 211, 238, 0.4)",
              transform: "scale(1.15)"
            }}
            onClick={() => setIsMinimized(true)}
            transition="all 0.2s ease"
          >
            ⬇
          </Box>
          
          {/* Close button */}
          {onClose && (
            <Box
              width="40px"
              height="40px"
              borderRadius="50%"
              bg="rgba(239, 68, 68, 0.25)"
              border="2px solid #ef4444"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              fontSize="1rem"
              color="#ef4444"
              _hover={{
                bg: "rgba(239, 68, 68, 0.4)",
                transform: "scale(1.15)"
              }}
              onClick={() => {
                pause();
                if (onClose) onClose();
              }}
              transition="all 0.2s ease"
            >
              ✕
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SimpleMusicPlayer;