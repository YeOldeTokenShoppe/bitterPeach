import React, { useState, useRef, useEffect, memo } from 'react';
import { Box, IconButton, Text } from '@chakra-ui/react';
import { storage } from '../utilities/firebaseClient';
import { ref as storageRefUtil, getDownloadURL } from 'firebase/storage';
import { useMusic } from '../contexts/MusicContext';

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
  // Use audio element and state from MusicContext
  const { 
    audioRef, 
    isPlaying: contextIsPlaying, 
    setIsPlaying: setContextIsPlaying,
    currentTrackIndex: contextTrackIndex,
    setCurrentTrackIndex: setContextTrackIndex,
    currentTrackUrl: contextTrackUrl,
    setCurrentTrackUrl: setContextTrackUrl,
    currentTrackPath: contextTrackPath,
    setCurrentTrackPath: setContextTrackPath
  } = useMusic();
  
  // Local state for UI
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [pendingPlay, setPendingPlay] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  
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
    { name: "Magnetic", path: "audio/320k/01-magnetic.m4a" },
  ];
  
  const currentTracks = is80sMode ? tracks80s : tracksAlt;
  const currentTrack = currentTracks[contextTrackIndex] || currentTracks[0];
  
  // Initialize on mount
  useEffect(() => {
    console.log('🎵 SimplifiedMusicPlayer: Component mounted');
    console.log('🎵 SimplifiedMusicPlayer: Context values - trackIndex:', contextTrackIndex, 'isPlaying:', contextIsPlaying, 'trackPath:', contextTrackPath);
    
    if (!hasInitialized) {
      // If we have a current track path in context, find its index in current track list
      if (contextTrackPath) {
        const trackIndex = currentTracks.findIndex(track => track.path === contextTrackPath);
        if (trackIndex !== -1) {
          console.log('🎵 SimplifiedMusicPlayer: Found current track at index:', trackIndex);
          // Track is in current mode, use it
        } else {
          // Track not in current mode's list, reset to first track
          console.log('🎵 SimplifiedMusicPlayer: Current track not in mode, resetting to first track');
          setContextTrackIndex(0);
          setContextTrackPath(currentTracks[0].path);
        }
      }
      setHasInitialized(true);
    }
    
    return () => {
      console.log('🎵 SimplifiedMusicPlayer: Component unmounting');
    };
  }, []);
  
  // Handle mode changes - reset to first track of new mode
  useEffect(() => {
    if (hasInitialized && currentTracks.length > 0) {
      console.log('🎵 SimplifiedMusicPlayer: Mode changed to', is80sMode ? '80s' : 'Alt');
      // When mode changes, reset to first track of new mode
      setContextTrackIndex(0);
      setContextTrackPath(currentTracks[0].path);
      
      // If currently playing, stop playback to force reload
      if (contextIsPlaying && audioRef.current) {
        audioRef.current.pause();
        setContextIsPlaying(false);
        // Set flag to auto-resume after track loads
        setPendingPlay(true);
      }
    }
  }, [is80sMode]);
  
  // Define handleTrackEnd early to avoid reference issues
  const handleTrackEnd = () => {
    // Auto-advance to next track
    const nextIndex = (contextTrackIndex + 1) % currentTracks.length;
    setContextTrackIndex(nextIndex);
    setContextTrackPath(currentTracks[nextIndex].path);
  };
  
  // Add event listener for track end
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('ended', handleTrackEnd);
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', handleTrackEnd);
        }
      };
    }
  }, [audioRef, currentTracks.length]);
  
  // Load track from Firebase when index or mode changes
  useEffect(() => {
    async function loadTrackUrl() {
      if (!currentTrack || !currentTrack.path) {
        console.error('No track or path available');
        return;
      }
      
      console.log('🎵 SimplifiedMusicPlayer: Loading track:', currentTrack.name, 'index:', contextTrackIndex);
      
      // Check if we already have this track loaded
      if (audioRef.current && audioRef.current.src) {
        // Get the filename from both URLs for comparison
        const currentFileName = audioRef.current.src.split('/').pop().split('?')[0];
        const newFileName = currentTrack.path.split('/').pop();
        
        if (currentFileName === newFileName && !audioRef.current.paused && !pendingPlay) {
          console.log('🎵 SimplifiedMusicPlayer: Same track already playing, skipping reload');
          return;
        }
      }
      
      setIsLoading(true);
      
      try {
        const storageReference = storageRefUtil(storage, currentTrack.path);
        const downloadUrl = await getDownloadURL(storageReference);
        
        // Check again if we need to update - component might have unmounted/remounted
        if (!audioRef.current) {
          console.warn('🎵 SimplifiedMusicPlayer: Audio ref lost during loading');
          return;
        }
        
        setContextTrackUrl(downloadUrl); // Update context
        setContextTrackPath(currentTrack.path); // Save current track path
        
        // Only update src if it's different
        const needsUpdate = audioRef.current.src !== downloadUrl;
        if (needsUpdate) {
          console.log('🎵 SimplifiedMusicPlayer: Updating audio src');
          const wasPlaying = !audioRef.current.paused;
          audioRef.current.src = downloadUrl;
          
          // Resume playback if it was playing or if autoPlay is enabled or if pendingPlay is set
          if ((wasPlaying || contextIsPlaying || (autoPlay && isVisible) || pendingPlay) && !userPaused) {
            setPendingPlay(true);
            audioRef.current.play()
              .then(() => {
                setContextIsPlaying(true);
                setPendingPlay(false);
                setUserPaused(false);
                console.log('🎵 SimplifiedMusicPlayer: Resumed playback after track change');
              })
              .catch(err => {
                console.warn('Playback failed:', err);
                setPendingPlay(false);
              });
          }
        }
      } catch (error) {
        console.error('Error getting track URL from Firebase:', error);
        setContextTrackUrl('');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadTrackUrl();
  }, [contextTrackIndex, currentTrack?.path]);
  
  // Auto-play when component becomes visible and autoPlay is true
  useEffect(() => {
    if (isVisible && audioRef.current) {
      // Always try to resume audio context when becoming visible
      if (audioRef.current._audioContext && audioRef.current._audioContext.state === 'suspended') {
        console.log('🎵 SimplifiedMusicPlayer: Resuming audio context on visibility change');
        audioRef.current._audioContext.resume();
      }
      
      if (autoPlay && contextTrackUrl && !contextIsPlaying && !pendingPlay && !userPaused) {
        console.log('🎵 SimplifiedMusicPlayer: Auto-playing because music was toggled on');
        play();
      }
    }
  }, [isVisible, autoPlay, contextTrackUrl, contextIsPlaying, pendingPlay, userPaused]);
  
  // Monitor audio context state only (not playback state)
  useEffect(() => {
    if (!audioRef.current || !audioRef.current._audioContext) return;
    
    let contextCheckInterval;
    
    // Only check for suspended audio context, not playback state
    contextCheckInterval = setInterval(() => {
      if (audioRef.current && audioRef.current._audioContext && audioRef.current._audioContext.state === 'suspended') {
        console.log('🎵 SimplifiedMusicPlayer: Audio context suspended, resuming...');
        audioRef.current._audioContext.resume();
      }
    }, 2000);
    
    return () => {
      if (contextCheckInterval) clearInterval(contextCheckInterval);
    };
  }, []);
  
  const play = () => {
    if (audioRef.current && contextTrackUrl) {
      // Resume audio context if needed
      if (audioRef.current._audioContext && audioRef.current._audioContext.state === 'suspended') {
        console.log('🎵 SimplifiedMusicPlayer: Resuming audio context before play');
        audioRef.current._audioContext.resume();
      }
      
      // Store current time before attempting to play
      const currentTime = audioRef.current.currentTime;
      
      // Only set pendingPlay if we're not already pending
      if (!pendingPlay) {
        setPendingPlay(true);
      }
      
      audioRef.current.play()
        .then(() => {
          setContextIsPlaying(true);
          setPendingPlay(false);
          setUserPaused(false);
          console.log('🎵 SimplifiedMusicPlayer: Started playing');
        })
        .catch(err => {
          console.warn('Playback failed:', err);
          setPendingPlay(false);
          
          // Try to resume audio context and play again
          if (audioRef.current._audioContext) {
            audioRef.current._audioContext.resume().then(() => {
              // Try to recover by setting the time and playing again
              if (audioRef.current && currentTime > 0) {
                audioRef.current.currentTime = currentTime;
              }
              setTimeout(() => {
                audioRef.current.play()
                  .then(() => {
                    setContextIsPlaying(true);
                    setUserPaused(false);
                    console.log('🎵 SimplifiedMusicPlayer: Recovered playback after context resume');
                  })
                  .catch(e => {
                    console.error('Recovery play failed:', e);
                    setContextIsPlaying(false);
                  });
              }, 100);
            });
          } else {
            setContextIsPlaying(false);
          }
        });
    } else if (!contextTrackUrl) {
      console.log('🎵 SimplifiedMusicPlayer: Waiting for track URL to load');
    }
  };
  
  const pause = () => {
    if (audioRef.current) {
      setUserPaused(true);
      audioRef.current.pause();
      setContextIsPlaying(false);
      setPendingPlay(false);
      console.log('🎵 SimplifiedMusicPlayer: Paused by user');
    }
  };
  
  const skipTrack = () => {
    console.log('🎵 SimplifiedMusicPlayer: Skipping to next track');
    const nextIndex = (contextTrackIndex + 1) % currentTracks.length;
    
    // Clear pending play to allow new track to load
    setPendingPlay(false);
    
    // Update track index and path
    setContextTrackIndex(nextIndex);
    setContextTrackPath(currentTracks[nextIndex].path);
    
    // If we were playing, set flag to resume after load
    if (contextIsPlaying) {
      setPendingPlay(true);
      setUserPaused(false);
    }
  };
  
  const togglePlayPause = () => {
    console.log('🎵 SimplifiedMusicPlayer: Toggle play/pause - current state:', contextIsPlaying);
    if (contextIsPlaying) {
      pause();
    } else {
      play();
    }
  };
  
  // Handle visibility changes - don't pause when hiding, just hide UI
  useEffect(() => {
    // Component visibility is now just for UI, not for controlling playback
    // The music should continue playing even when the UI is hidden
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
        boxShadow={contextIsPlaying ? 
          (is80sMode ? 
            "0 0 15px rgba(217, 70, 239, 0.6), 0 0 25px rgba(103, 232, 249, 0.4)" :
            "0 0 12px rgba(103, 232, 249, 0.5)"
          ) : "0 0 8px rgba(0, 0, 0, 0.3)"
        }
        sx={{
          animation: contextIsPlaying ? "spin 3s linear infinite" : (isLoading ? "pulse 1s ease-in-out infinite" : "none"),
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
          transform: "scale(1.05)",
          boxShadow: is80sMode ? 
            "0 0 20px rgba(217, 70, 239, 0.8), 0 0 30px rgba(103, 232, 249, 0.5)" :
            "0 0 15px rgba(103, 232, 249, 0.7)"
        }}
      />
      
      {/* Track Info */}
      <Box maxWidth="80px" overflow="hidden">
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
          color="#67e8f9"
          fontSize="11px"
          cursor="pointer"
          onClick={() => {
            if (onModeChange) {
              // Pause before switching modes to prevent conflicts
              if (contextIsPlaying) {
                pause();
              }
              onModeChange(!is80sMode);
            }
          }}
          fontFamily="monospace"
          fontWeight="500"
          transition="all 0.2s ease"
          _hover={{ 
            textDecoration: "underline",
            textShadow: "0 0 8px rgba(103, 232, 249, 0.6)",
            transform: "translateX(2px)"
          }}
        >
          {is80sMode ? (
            <Box as="span">
              <Box as="span" color="#00ff41">80</Box>
              <Box as="span" color="#67e8f9">s Mode</Box>
            </Box>
          ) : "Alt Mode"}
        </Text>
      </Box>
      
      {/* Controls */}
      <Box display="flex" alignItems="center" gap="6px">
        {/* Play/Pause */}
        <IconButton
          aria-label={contextIsPlaying ? "Pause" : "Play"}
          icon={
            contextIsPlaying ? (
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
          isDisabled={isLoading}
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
          isDisabled={isLoading}
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
            // Just close the UI, don't pause the music
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