import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import { storage } from "../utilities/firebaseClient";
import { ref as storageRefUtil, getDownloadURL } from "firebase/storage";
import { useMusic } from "../contexts/MusicContext";

const MobileMusicPlayer = ({ isVisible, onClose, autoPlay = true, is80sMode = false, onModeChange, showInitialChoice = false, onPlayingStateChange, hideUI = false, onControlsReady }) => {

  // Use shared audio from MusicContext
  const { 
    audioRef,
    isPlaying: contextIsPlaying,
    setIsPlaying: setContextIsPlaying,
    currentTrackIndex: contextTrackIndex,
    setCurrentTrackIndex: setContextTrackIndex,
    currentTrackUrl: contextTrackUrl,
    setCurrentTrackUrl: setContextTrackUrl
  } = useMusic();
  
  // Local state for UI
  const [isPlaying, setIsPlaying] = useState(contextIsPlaying);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(contextTrackIndex || 0);
  const [trackUrl, setTrackUrl] = useState(contextTrackUrl || "");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showModeChoice, setShowModeChoice] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState(null);
  
  // Track previous mode to detect actual mode changes
  const prevModeRef = useRef(is80sMode);
  const [hasModeChanged, setHasModeChanged] = useState(false);
  const isFirstMount = useRef(true);
  const isChangingTrackRef = useRef(false);
  const currentTrackIndexRef = useRef(0); // Track the actual current index
  const lastProcessedModeRef = useRef(is80sMode); // Track last processed mode

  // Detect actual mode changes
  useEffect(() => {
    if (prevModeRef.current !== is80sMode) {
      console.log('🎵 MobileMusicPlayer: Mode actually changed from', prevModeRef.current, 'to', is80sMode);
      setHasModeChanged(true);
      prevModeRef.current = is80sMode;
    } else {
      setHasModeChanged(false);
    }
  }, [is80sMode]);

  // Show initial choice popup if requested
  useEffect(() => {
    if (showInitialChoice && isVisible) {
      setShowModeChoice(true);
    }
  }, [showInitialChoice, isVisible]);

  // Track lists
  const non80sTrackNames = [
    // "Rocket Man - Steven Drozd",
    // "Magnetic - Tunde Adebimpe",
    // "Intergalactic - Beastie Boys",  // Space themed, fits alternative mode
 

    "Lifetimes",
    "Corner Of My Eye"
  ];
  const non80sFirebasePaths = [
    // "audio/320k/rocket-man---steven-drozd.m4a",
    // "audio/320k/01-magnetic.m4a",
    // "audio/320k/intergalactic-beastie-boys.m4a",


    "audio/192k/07-lifetimes.m4a",
    "audio/192k/future-islands---corner-of-my-eye.mp3"
  ];

  const eightyTrackNames = [
    "For Those About To Rock - AC/DC",
    "Dirty Cash - The Adventures of Stevie V", 
    "Intergalactic - Beastie Boys",
    "Good Life - Inner City",
    "Like A Prayer - Madonna",
    "99 Luftballoons - Nena",
    "Sweet Dreams - Eurythmics",
  ];
  const eightyFirebasePaths = [
    "audio/320k/for-those-about-to-rock-ac-dc.m4a",
    "audio/320k/dirty-cash.m4a", 
    "audio/320k/intergalactic-beastie-boys.m4a",
    "audio/320k/good-life-inner-city.m4a",
    "audio/320k/like-a-prayer-madonna.m4a",
    "audio/320k/99-luftballoons-nena.m4a",
    "audio/320k/sweet-dreams-eurythmics.m4a",
  ];

  const trackNames = useMemo(() => is80sMode ? eightyTrackNames : non80sTrackNames, [is80sMode]);
  const firebasePaths = useMemo(() => is80sMode ? eightyFirebasePaths : non80sFirebasePaths, [is80sMode]);
  


  // Track failed tracks to avoid infinite loops
  const failedTracksRef = useRef(new Set());

  // Load track from Firebase
  const loadTrack = useCallback(async (index, attemptCount = 0) => {
    console.log('🎵 loadTrack called with index:', index, 'attemptCount:', attemptCount);
    console.log('🎵 is80sMode:', is80sMode, 'trackNames.length:', trackNames.length);
    console.log('🎵 Track to load:', trackNames[index], 'Path:', firebasePaths[index]);
    console.log('🎵 Current track index:', currentTrackIndex, 'Current URL:', trackUrl);
    
    if (!trackNames[index] || !firebasePaths[index]) {
      console.error('❌ Invalid track index:', index, 'trackNames:', trackNames);
      return;
    }
    
    // Set flag to indicate we're changing tracks
    isChangingTrackRef.current = true;
    
    try {
      const audioRef = storageRefUtil(storage, firebasePaths[index]);
      const url = await getDownloadURL(audioRef);
      console.log('🎵 Track URL obtained:', url);
      setTrackUrl(url);
      setCurrentTrackIndex(index);
      currentTrackIndexRef.current = index; // Update ref immediately
      setContextTrackIndex(index); // Also update context immediately
      setIsLoaded(true);

      // Clear failed tracks on successful load
      failedTracksRef.current.clear();
      console.log('🎵 Track loaded successfully, index set to:', index);
    } catch (error) {
      console.error(`❌ Mobile: Error loading track ${index} (${trackNames[index]}):`, error);
      console.error('Firebase path attempted:', firebasePaths[index]);
      console.error('Error details:', error.code, error.message);
      failedTracksRef.current.add(index);
      
      // If all tracks have failed, stop trying
      if (failedTracksRef.current.size >= trackNames.length) {
        console.error("❌ Mobile: All tracks failed to load");
        return;
      }
      
      // Try next track if this one fails
      if (attemptCount < trackNames.length) {
        const nextIndex = (index + 1) % trackNames.length;
        loadTrack(nextIndex, attemptCount + 1);
      }
    }
  }, [firebasePaths, trackNames, setContextTrackIndex, is80sMode, currentTrackIndex, trackUrl]);

  // Initialize with first track or sync with existing track
  useEffect(() => {
    if (isVisible && trackNames.length > 0) {
      // Initialization check
      
      // Clear failed tracks only on first visibility
      if (isVisible && failedTracksRef.current.size > 0) {
        console.log('🎵 MobileMusicPlayer: Clearing failed tracks on visibility change');
        failedTracksRef.current.clear();
      }

      // Handle first mount when 80s mode is already active
      if (isFirstMount.current) {
        isFirstMount.current = false;
        
        // If we're mounting with 80s mode already active and no track playing
        if (is80sMode && !contextTrackUrl && autoPlay) {
          // First mount with 80s mode active, loading first 80s track
          // Small delay to ensure component is fully mounted
          setTimeout(() => {
            loadTrack(0);
          }, 100);
          return;
        }
        
        // Also handle non-80s mode first mount with autoPlay
        if (!is80sMode && !contextTrackUrl && autoPlay) {
          // First mount in normal mode, loading first track
          setTimeout(() => {
            loadTrack(0);
          }, 100);
          return;
        }
      }
      
      // Clear failed tracks when switching modes
      if (hasModeChanged) {
        failedTracksRef.current.clear();
      }
      
      // Only check for playlist switch if mode actually changed AND we haven't processed it yet
      if (hasModeChanged && lastProcessedModeRef.current !== is80sMode) {
        console.log('🎵 MobileMusicPlayer: Mode change detected, hasModeChanged:', hasModeChanged, 'is80sMode:', is80sMode);
        
        // Update last processed mode
        lastProcessedModeRef.current = is80sMode;
        
        // Reset the track index to 0 when switching modes
        currentTrackIndexRef.current = 0;
        setCurrentTrackIndex(0);
        setContextTrackIndex(0);
        
        // When mode changes, always switch to the new playlist
        if (contextTrackUrl && audioRef.current) {
          // Check if current track is from the other mode's playlist
          const currentPath = firebasePaths[contextTrackIndex];
          const isCurrentTrackInNewPlaylist = currentPath && contextTrackUrl.includes(currentPath);
          
          if (!isCurrentTrackInNewPlaylist) {
            // Current track is not in the new playlist, load first track of new mode
            console.log('🎵 MobileMusicPlayer: Switching to new playlist due to mode change');
            const wasPlaying = !audioRef.current.paused || autoPlay;
            
            // Stop current track
            if (audioRef.current) {
              audioRef.current.pause();
            }
            
            // Load first track of new playlist
            loadTrack(0);
            return;
          }
        } else {
          // No track in context, but mode changed - load first track of new mode
          console.log('🎵 MobileMusicPlayer: Mode changed with no current track, loading first track of new mode');
          loadTrack(0);
          return;
        }
      }
      
      // For normal scene transitions (no mode change), just sync with existing track
      if (!hasModeChanged && contextTrackUrl && audioRef.current) {
        console.log('🎵 MobileMusicPlayer: Scene transition - maintaining current track:', {
          contextTrackUrl,
          contextIsPlaying,
          audioSrc: audioRef.current.src,
          audioPaused: audioRef.current.paused
        });
        
        // Don't reload if the same track is already loaded
        if (audioRef.current.src === contextTrackUrl || audioRef.current.src.includes(contextTrackUrl)) {
          console.log('🎵 MobileMusicPlayer: Same track already loaded, just syncing state');
          setTrackUrl(contextTrackUrl);
          // Don't update the index here - it should already be correct
          setIsPlaying(!audioRef.current.paused);
          setIsLoaded(true);
          return; // Don't load a new track
        }
      }
      
      // Only load first track if nothing is in context
      if (!contextTrackUrl && !hasModeChanged) {
        console.log('🎵 MobileMusicPlayer: No track in context, loading first track');
        loadTrack(0);
      }
    }
  }, [isVisible, hasModeChanged, trackNames.length, firebasePaths, contextTrackUrl, contextTrackIndex, contextIsPlaying, loadTrack, autoPlay, is80sMode]);

  // Track if user has intentionally paused
  const userPausedRef = useRef(false);
  
  // Auto-play when component first mounts with a track
  useEffect(() => {
    if (trackUrl && autoPlay && audioRef.current && isVisible && isFirstMount.current) {
      // Only auto-play on first mount
      isFirstMount.current = false;
      
      // Don't auto-play if already playing
      if (!audioRef.current.paused) {
        console.log('🎵 MobileMusicPlayer: Audio already playing, skipping auto-play');
        return;
      }
      
      // Small delay to ensure audio element is ready
      setTimeout(() => {
        if (audioRef.current && audioRef.current.paused) {
          console.log('🎵 MobileMusicPlayer: Attempting initial auto-play');
          audioRef.current.play().then(() => {
            console.log('🎵 MobileMusicPlayer: Auto-play successful');
            setIsPlaying(true);
            setContextIsPlaying(true);
            if (onPlayingStateChange) onPlayingStateChange(true);
          }).catch(e => {
            console.log("🔇 Mobile: Auto-play blocked by browser:", e);
          });
        }
      }, 100);
    }
  }, [trackUrl, autoPlay, isVisible, setContextIsPlaying, onPlayingStateChange]);

  // Find next available track index
  const findNextAvailableTrack = useCallback((startIndex, direction = 1) => {
    console.log('🎵 findNextAvailableTrack called:', { startIndex, direction, totalTracks: trackNames.length });
    let attempts = 0;
    let index = startIndex;
    
    while (attempts < trackNames.length) {
      index = direction > 0 
        ? (index + 1) % trackNames.length 
        : index === 0 ? trackNames.length - 1 : index - 1;
      
      console.log('🎵 Checking index:', index, 'Failed tracks:', Array.from(failedTracksRef.current));
      
      if (!failedTracksRef.current.has(index)) {
        console.log('🎵 Found available track at index:', index);
        return index;
      }
      attempts++;
    }
    
    // If all tracks failed, return the original next index
    const fallbackIndex = direction > 0 
      ? (startIndex + 1) % trackNames.length 
      : startIndex === 0 ? trackNames.length - 1 : startIndex - 1;
    console.log('🎵 All tracks failed, returning fallback index:', fallbackIndex);
    return fallbackIndex;
  }, [trackNames.length]);

  // Skip to next track
  const skipNext = useCallback(() => {
    // Use the ref as source of truth for current index, but ensure it's within bounds
    let actualCurrentIndex = currentTrackIndexRef.current;
    
    // Ensure index is within bounds for current playlist
    if (actualCurrentIndex >= trackNames.length) {
      console.log('⚠️ Current index out of bounds, resetting to 0');
      actualCurrentIndex = 0;
      currentTrackIndexRef.current = 0;
    }
    
    console.log('🎵 skipNext called, current state:', {
      is80sMode,
      currentTrackIndex,
      contextTrackIndex,
      actualCurrentIndex,
      currentTrackIndexRef: currentTrackIndexRef.current,
      trackNames: trackNames.length,
      trackNamesList: trackNames,
      firebasePathsList: firebasePaths,
      currentTrackName: trackNames[actualCurrentIndex],
      currentAudioSrc: audioRef.current?.src,
      failedTracks: failedTracksRef.current.size
    });
    
    if (trackNames.length <= 1) {
      console.log('❌ Only one track in playlist, cannot skip');
      return;
    }

    const nextIndex = (actualCurrentIndex + 1) % trackNames.length;
    console.log('🎵 Next track index:', nextIndex, 'from current:', actualCurrentIndex);
    console.log('🎵 Next track will be:', trackNames[nextIndex], 'Path:', firebasePaths[nextIndex]);
    
    // Stop current playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Clear user paused flag
    userPausedRef.current = false;
    
    // Just call loadTrack which will handle everything
    loadTrack(nextIndex);
  }, [trackNames, firebasePaths, loadTrack, currentTrackIndex, contextTrackIndex, is80sMode]);

  // Skip to previous track
  const skipPrevious = useCallback(() => {
    if (trackNames.length <= 1) {
  
      return;
    }
    const prevIndex = findNextAvailableTrack(currentTrackIndex, -1);
   
    loadTrack(prevIndex);
  }, [trackNames.length, currentTrackIndex, findNextAvailableTrack, loadTrack]);

  // Handle track end
  const handleTrackEnd = useCallback(() => {
    const nextIndex = findNextAvailableTrack(currentTrackIndex, 1);
    loadTrack(nextIndex);
  }, [currentTrackIndex, findNextAvailableTrack, loadTrack]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      setContextIsPlaying(false);
      userPausedRef.current = true; // Mark as user-paused
      if (onPlayingStateChange) onPlayingStateChange(false);
    } else {
      userPausedRef.current = false; // Clear user-paused flag
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setContextIsPlaying(true);
        if (onPlayingStateChange) onPlayingStateChange(true);
      }).catch(e => {
        console.log("🔇 Mobile: Play blocked by browser");
      });
    }
  }, [isPlaying, onPlayingStateChange, setContextIsPlaying]);

  // Long press handlers for genre switching
  const handleLongPressStart = useCallback(() => {
    console.log('🎵 Long press started');
    const timer = setTimeout(() => {
      console.log('🎵 Long press triggered - showing mode choice dialog');
      setShowModeChoice(true);
    }, 800); // 800ms long press
    setLongPressTimer(timer);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  // Handle mode change from popup
  const handleModeChoice = useCallback((enable80s) => {
    console.log('🎵 MobileMusicPlayer handleModeChoice:', enable80s, 'current is80sMode:', is80sMode);
    setShowModeChoice(false);
    
    // Only proceed if this is actually a mode change
    if (enable80s === is80sMode) {
      console.log('🎵 Same mode selected, no change needed');
      return;
    }
    
    if (onModeChange) {
      const wasPlaying = isPlaying;
      setIsPlaying(false); // Stop current track
      setCurrentTrackIndex(0); // Reset to first track of new mode
      onModeChange(enable80s);
      
      // After mode change, if we were playing, start the new track
      if (wasPlaying) {
        setTimeout(() => {
          loadTrack(0);
        }, 200);
      }
    }
  }, [isPlaying, is80sMode, onModeChange, loadTrack]);
  
  // Add a dedicated pause method
  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setContextIsPlaying(false);
      userPausedRef.current = true; // Mark as user-paused
      if (onPlayingStateChange) onPlayingStateChange(false);
    } else {
      console.log('⚠️ Mobile: No audio ref available to pause');
    }
  }, [onPlayingStateChange, setContextIsPlaying]);
  
  // Add a dedicated play method
  const play = useCallback(() => {
    if (audioRef.current) {
      userPausedRef.current = false; // Clear user-paused flag
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setContextIsPlaying(true);
        if (onPlayingStateChange) onPlayingStateChange(true);
        console.log('🎵 Play successful via play method');
      }).catch(e => {
        console.log("🔇 Mobile: Play blocked by browser", e);
      });
    } else {
      console.log('⚠️ Mobile: No audio ref available to play');
    }
  }, [onPlayingStateChange, setContextIsPlaying]);

  // Track if controls have been sent to prevent repeated calls
  const controlsSentRef = useRef(false);
  
  // Pass control methods to parent via callback - only once when functions are ready
  useEffect(() => {
    if (onControlsReady && togglePlayPause && skipNext && pause && play && !controlsSentRef.current) {
      controlsSentRef.current = true;
      onControlsReady({
        togglePlayPause,
        skipTrack: skipNext,
        pause,
        play,
        isPlaying: () => audioRef.current && !audioRef.current.paused
      });
    }
  }, [onControlsReady, skipNext, togglePlayPause, pause, play]);

  // Update the shared audio element's src when track changes
  useEffect(() => {
    if (!audioRef.current || !trackUrl) return;
    
    if (isChangingTrackRef.current) {
      console.log('🎵 MobileMusicPlayer: Track change detected, updating audio src to:', trackUrl);
      const wasPlaying = !audioRef.current.paused || autoPlay;
      
      // Immediately reset the flag to prevent re-runs
      isChangingTrackRef.current = false;
      
      // Reset the audio element to ensure clean playback
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = trackUrl;
      
      // Trigger load event
      audioRef.current.load();
      
      // Remove any existing loadeddata listeners first
      const existingHandlers = audioRef.current._loadHandlers || [];
      existingHandlers.forEach(handler => {
        audioRef.current.removeEventListener('loadeddata', handler);
      });
      
      // Wait for loadeddata event before trying to play
      const handleLoaded = () => {
        console.log('🎵 Track loaded, ready to play');
        
        if (wasPlaying) {
          audioRef.current.play().then(() => {
            console.log('🎵 Playback started after track change');
            setIsPlaying(true);
            setContextIsPlaying(true);
            if (onPlayingStateChange) onPlayingStateChange(true);
          }).catch(e => {
            console.log('🎵 Could not auto-play after src change:', e);
            setIsPlaying(false);
            setContextIsPlaying(false);
            if (onPlayingStateChange) onPlayingStateChange(false);
          });
        }
        
        // Remove this one-time listener
        audioRef.current.removeEventListener('loadeddata', handleLoaded);
        // Clean up stored handlers
        audioRef.current._loadHandlers = audioRef.current._loadHandlers?.filter(h => h !== handleLoaded) || [];
      };
      
      // Store handler reference for cleanup
      audioRef.current._loadHandlers = audioRef.current._loadHandlers || [];
      audioRef.current._loadHandlers.push(handleLoaded);
      
      audioRef.current.addEventListener('loadeddata', handleLoaded);
      
      // Timeout fallback in case loadeddata doesn't fire
      const loadTimeout = setTimeout(() => {
        console.log('⚠️ loadeddata timeout, forcing play attempt');
        if (wasPlaying && audioRef.current.paused) {
          handleLoaded();
        }
      }, 1000);
      
      // Store timeout for cleanup
      audioRef.current._loadTimeout = loadTimeout;
      
      // Update context with current track info
      setContextTrackUrl(trackUrl);
      // Don't update context index here - it should be updated when we actually change tracks
    }
    
    // Cleanup function
    return () => {
      if (audioRef.current?._loadTimeout) {
        clearTimeout(audioRef.current._loadTimeout);
      }
    };
  }, [trackUrl, currentTrackIndex, setContextTrackUrl, setContextTrackIndex, autoPlay, setContextIsPlaying, onPlayingStateChange]);

  // Set up event listeners on the shared audio element
  useEffect(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Add event listeners
    const handleEnded = () => {
      console.log('🎵 MobileMusicPlayer: Track ended');
      handleTrackEnd();
    };
    
    const handleLoadedData = () => {
      console.log('🎵 MobileMusicPlayer: Track loaded');
      setIsLoaded(true);
    };
    
    const handlePlay = () => {
      console.log('🎵 MobileMusicPlayer: Audio started playing');
      setIsPlaying(true);
      setContextIsPlaying(true);
      if (onPlayingStateChange) onPlayingStateChange(true);
    };
    
    const handlePause = () => {
      console.log('🎵 MobileMusicPlayer: Audio paused');
      setIsPlaying(false);
      setContextIsPlaying(false);
      if (onPlayingStateChange) onPlayingStateChange(false);
    };
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadeddata', handleLoadedData);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [handleTrackEnd, setContextIsPlaying, onPlayingStateChange]);

  // Sync local state with context state
  useEffect(() => {
    setIsPlaying(contextIsPlaying);
  }, [contextIsPlaying]);

  // Handle close
  useEffect(() => {
    if (!isVisible && audioRef.current && !audioRef.current.paused) {
      // Component is being hidden while music is playing - mark as user action
      userPausedRef.current = true;
    }
  }, [isVisible]);
  
  // Listen for force stop message
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'FORCE_STOP_MUSIC') {
        console.log('🎵 MobileMusicPlayer: Received force stop message');
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setIsPlaying(false);
          setContextIsPlaying(false);
          userPausedRef.current = true;
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setContextIsPlaying]);
  
  // If not visible or hideUI, return null (no audio element needed)
  if (!isVisible || hideUI) {
    return null;
  }

  return (
    <Box
      position="fixed"
      bottom={isMinimized ? "11px" : "100px"} // Move to exact bottom nav button position when minimized
      left={isMinimized ? "calc((100% / 5) * 0.5 - 24px)" : "50%"} // Position at leftmost button location when minimized
      transform={isMinimized ? "none" : "translateX(-50%)"}
      width={isMinimized ? "48px" : "280px"} // Match button size when minimized
      height={isMinimized ? "48px" : "100px"}
      bg={isMinimized ? "transparent" : "rgba(15, 23, 42, 0.95)"}
      border={isMinimized ? "2px solid #22d3ee" : "2px solid #22d3ee"}
      borderRadius={isMinimized ? "50%" : "12px"}
      backdropFilter={isMinimized ? "none" : "blur(10px)"}
      boxShadow={isMinimized ? "0 0 10px rgba(6, 182, 212, 0.3), inset 0 0 6px rgba(6, 182, 212, 0.2)" : "0 4px 20px rgba(6, 182, 212, 0.8)"}
      display="flex"
      alignItems="center"
      justifyContent={isMinimized ? "center" : "flex-start"}
      gap={isMinimized ? 0 : 3}
      p={isMinimized ? 0 : 2}
      zIndex={isMinimized ? "1001" : "9999"} // Lower z-index when minimized to blend with nav
      transition="all 0.5s ease"
    >
      {/* Audio element removed - using shared audio from context */}

      {/* Album Art - Only when minimized (becomes the button) */}
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
          onDoubleClick={onClose}
          transition="all 0.5s ease"
          _hover={{
            transform: "scale(1.08)",
            boxShadow: "0 0 15px rgba(6, 182, 212, 0.5)"
          }}
          sx={{
            animation: isPlaying ? "spin 3s linear infinite" : "none",
            "@keyframes spin": {
              "0%": { transform: "rotate(0deg)" },
              "100%": { transform: "rotate(360deg)" }
            }
          }}
        >
          {/* Play/Pause Icon Overlay - Only when minimized */}
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            width="20px"
            height="20px"
            borderRadius="50%"
            bg="rgba(0, 0, 0, 0.7)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            fontSize="10px"
            userSelect="none"
            cursor="pointer"
            onClick={(e) => {
              e.stopPropagation();
              togglePlayPause();
            }}
          >
            {isPlaying ? "⏸️" : "▶️"}
          </Box>
          
          {/* Expand hint on hover when minimized */}
          <Box
            position="absolute"
            bottom="-20px"
            left="50%"
            transform="translateX(-50%)"
            fontSize="7px"
            color="#22d3ee"
            opacity="0"
            transition="opacity 0.3s ease"
            pointerEvents="none"
            userSelect="none"
            textAlign="center"
            _groupHover={{ opacity: 1 }}
          >
            <Text fontSize="8px">⬆</Text>
            <Text fontSize="6px" mt="-2px">2x = close</Text>
          </Box>
        </Box>
      )}

      {/* Track Info - Hidden when minimized */}
      {!isMinimized && (
        <Box flex="1" minWidth="0" px={3}>
          <Text
            fontSize="0.75rem"
            fontWeight="bold"
            color="#22d3ee"
            fontFamily="monospace"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            mb={2}
            textAlign="center"
          >
            {trackNames[currentTrackIndex] || "Loading..."}
          </Text>
          <Box display="flex" flexDirection="column" gap={1}>
            {/* Centered Forward/Album/Back Controls */}
            <Box display="flex" gap={6} justifyContent="center" alignItems="center">
              <Text
                fontSize="1.5rem"
                color="#67e8f9"
                cursor="pointer"
                p={2}
                borderRadius="8px"
                _hover={{ 
                  color: "#22d3ee",
                  bg: "rgba(34, 211, 238, 0.15)",
                  transform: "scale(1.15)"
                }}
                onClick={skipPrevious}
                userSelect="none"
                transition="all 0.2s ease"
              >
                ⏮️
              </Text>
              
              {/* Central Album Art with Play/Pause */}
              <Box
                width="60px"
                height="60px"
                minWidth="60px"
                minHeight="60px"
                borderRadius="50%"
                backgroundImage="url('/virginRecords.jpg')"
                backgroundSize="cover"
                backgroundPosition="center"
                backgroundRepeat="no-repeat"
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
                cursor="pointer"
                onClick={togglePlayPause}
                onMouseDown={handleLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
                transition="all 0.3s ease"
                border="2px solid #22d3ee"
                flexShrink="0"
                _hover={{
                  transform: "scale(1.1)",
                  boxShadow: "0 0 15px rgba(34, 211, 238, 0.6)"
                }}
                sx={{
                  animation: isPlaying ? "spin 3s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" }
                  }
                }}
              >
                {/* Play/Pause Icon Overlay */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  width="28px"
                  height="28px"
                  borderRadius="50%"
                  bg="rgba(0, 0, 0, 0.7)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontSize="14px"
                  userSelect="none"
                >
                  {isPlaying ? "⏸️" : "▶️"}
                </Box>
              </Box>
              
              <Text
                fontSize="1.5rem"
                color="#67e8f9"
                cursor="pointer"
                p={2}
                borderRadius="8px"
                _hover={{ 
                  color: "#22d3ee",
                  bg: "rgba(34, 211, 238, 0.15)",
                  transform: "scale(1.15)"
                }}
                onClick={skipNext}
                userSelect="none"
                transition="all 0.2s ease"
              >
                ⏭️
              </Text>
            </Box>
            
            {/* Mode Indicator */}
            {/* <Box textAlign="center">
              <Text
                fontSize="0.6rem"
                color="#67e8f9"
                userSelect="none"
              >
                {is80sMode ? "80s" : "Alt"}
              </Text>
            </Box> */}
          </Box>
        </Box>
      )}

      {/* Minimize Button - Right side of controls */}
      {!isMinimized && (
        <Box>
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
            boxShadow="0 0 12px rgba(34, 211, 238, 0.4)"
            _hover={{
              bg: "rgba(34, 211, 238, 0.4)",
              boxShadow: "0 0 20px rgba(34, 211, 238, 0.7)",
              transform: "scale(1.15)"
            }}
            onClick={() => setIsMinimized(!isMinimized)}
            transition="all 0.2s ease"
          >
            ⬇
          </Box>
        </Box>
      )}
      
      {/* Mode Choice Popup */}
      {showModeChoice && (
        <Box
          position="fixed"
          top="0"
          left="0"
          width="100%"
          height="100%"
          bg="rgba(0, 0, 0, 0.7)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex="10001"
          onClick={() => setShowModeChoice(false)}
        >
          <Box
            bg="rgba(15, 23, 42, 0.95)"
            border="2px solid #22d3ee"
            borderRadius="16px"
            p={6}
            backdropFilter="blur(10px)"
            boxShadow="0 4px 20px rgba(6, 182, 212, 0.8)"
            onClick={(e) => e.stopPropagation()}
            maxWidth="300px"
            width="90%"
          >
            <Text
              fontSize="1.2rem"
              fontWeight="bold"
              color="#22d3ee"
              textAlign="center"
              mb={4}
              fontFamily="monospace"
            >
              Switch Music Mode
            </Text>
            
            <Box display="flex" flexDirection="column" gap={3}>
              <Box
                as="button"
                width="100%"
                bg="rgba(34, 211, 238, 0.2)"
                border="1px solid #22d3ee"
                color="#22d3ee"
                borderRadius="8px"
                p={4}
                onClick={() => handleModeChoice(true)}
                _hover={{
                  bg: "rgba(34, 211, 238, 0.3)",
                  transform: "scale(1.02)"
                }}
                transition="all 0.2s ease"
              >
                {/* <Box textAlign="center">
                  <Text fontSize="1rem" fontWeight="bold">🌊 80s Mode</Text>
                  <Text fontSize="0.8rem" opacity={0.8}>Synthwave & Retro Hits</Text>
                </Box> */}
              </Box>
              
              <Box
                as="button"
                width="100%"
                bg="rgba(34, 211, 238, 0.2)"
                border="1px solid #22d3ee"
                color="#22d3ee"
                borderRadius="8px"
                p={4}
                onClick={() => handleModeChoice(false)}
                _hover={{
                  bg: "rgba(34, 211, 238, 0.3)",
                  transform: "scale(1.02)"
                }}
                transition="all 0.2s ease"
              >
                <Box textAlign="center">
                  <Text fontSize="1rem" fontWeight="bold">🚀 Alternative</Text>
                  <Text fontSize="0.8rem" opacity={0.8}>Space & Ambient Tracks</Text>
                </Box>
              </Box>
            </Box>
            
            <Box
              as="button"
              width="100%"
              mt={4}
              bg="transparent"
              border="1px solid #6b7280"
              color="#6b7280"
              borderRadius="8px"
              p={2}
              onClick={() => setShowModeChoice(false)}
              _hover={{
                bg: "rgba(107, 114, 128, 0.1)"
              }}
              transition="all 0.2s ease"
            >
              Cancel
            </Box>
          </Box>
        </Box>
      )}
      
    </Box>
  );
};

export default MobileMusicPlayer;