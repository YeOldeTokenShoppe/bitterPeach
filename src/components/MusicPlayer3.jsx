import React, { useState, useRef, useEffect, useCallback } from "react";
import { storage } from "../utilities/firebaseClient";
import { ref as storageRefUtil, getDownloadURL } from "firebase/storage";
import { useMusic } from "../contexts/MusicContext";

// Initialize global state if it doesn't exist
if (typeof window !== 'undefined' && !window.__musicPlayer3State) {
  window.__musicPlayer3State = {
    hasCheckedForAudio: false,
    hasLoadedTrack: false
  };
}

const MusicPlayer3 = React.forwardRef(
  ({ isVisible, onClose, autoPlay = true, is80sMode = false }, ref) => {
    // Use global persistent state instead of local refs
    const hasCheckedForAudio = useRef(window.__musicPlayer3State?.hasCheckedForAudio || false);
    const hasLoadedTrack = useRef(window.__musicPlayer3State?.hasLoadedTrack || false);
    
    // Create a unique ID for this instance
    const instanceId = useRef(Math.random().toString(36).substr(2, 9));
    

    // Get shared audio element and context functions from MusicContext FIRST
    const { audioRef, setCurrentTrackBPM, currentTrackIndex: contextTrackIndex, setCurrentTrackIndex: setContextTrackIndex, setIsPlaying: setContextIsPlaying, isPlaying: contextIsPlaying } = useMusic();
    
    // State - initialize from context where applicable
    const [currentTrackIndex, setCurrentTrackIndex] = useState(contextTrackIndex || 0);
    const [isPlaying, setIsPlaying] = useState(contextIsPlaying || false);
    const [isLoading, setIsLoading] = useState(false);
    const isLoadingRef = useRef(false);
    const [currentTime, setCurrentTime] = useState("00:00");
    const [duration, setDuration] = useState("00:00");
    const [playProgress, setPlayProgress] = useState(0);
    const [isShuffled, setIsShuffled] = useState(false);
    const [shuffledQueue, setShuffledQueue] = useState([]);
    const [volume, setVolume] = useState(0.2);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Use context track index as the source of truth, with local ref for quick access
    const currentTrackIndexRef = useRef(contextTrackIndex || 0);
    const isInitializedRef = useRef(false);
    const lastModeRef = useRef(is80sMode);
    
    // Always sync ref with context
    useEffect(() => {
      currentTrackIndexRef.current = contextTrackIndex || 0;
    }, [contextTrackIndex]);
    
    // Component mount effect - sync with global state
    useEffect(() => {
      console.log('🎵🟢 MusicPlayer3 MOUNTED', {
        instanceId: instanceId.current,
        hasGlobalAudio: !!window.__globalAudioElement?.src,
        globalPaused: window.__globalAudioElement?.paused,
        autoPlay,
        isVisible,
        globalHasLoadedTrack: window.__musicPlayer3State.hasLoadedTrack,
        globalTrackIndex: window.__globalMusicTrackIndex
      });
      
      // Sync with global state on mount
      if (window.__globalAudioElement?.src && window.__globalMusicTrackIndex !== undefined) {
        setCurrentTrackIndex(window.__globalMusicTrackIndex);
        currentTrackIndexRef.current = window.__globalMusicTrackIndex;
        setContextTrackIndex(window.__globalMusicTrackIndex);
        setIsPlaying(!window.__globalAudioElement.paused);
        setContextIsPlaying(!window.__globalAudioElement.paused);
        setIsLoaded(true);
      }
      
      return () => {
        console.log('🎵🔴 MusicPlayer3 UNMOUNTING', {
          instanceId: instanceId.current
        });
      };
    }, []);
    
    // Track lists
    const non80sTracks = [
      { name: "Lifetimes", path: "audio/192k/07-lifetimes.m4a", bpm: 135 },
      { name: "Magnetic - Tunde Adebimpe", path: "audio/320k/01-magnetic.m4a", bpm: 130 },
      { name: "Rocket Man - Steven Drozd", path: "audio/320k/rocket-man---steven-drozd.m4a", bpm: 75 }
    ];
    
    const eightyTracks = [
      { name: "For Those About To Rock - AC/DC", path: "audio/320k/for-those-about-to-rock-ac-dc.m4a", bpm: 75 },
      { name: "Dirty Cash - The Adventures of Stevie V", path: "audio/320k/dirty-cash.m4a", bpm: 100 },
      { name: "Intergalactic - Beastie Boys", path: "audio/320k/intergalactic-beastie-boys.m4a", bpm: 108 },
      { name: "Good Life - Inner City", path: "audio/320k/good-life-inner-city.m4a", bpm: 120 },
      { name: "Like A Prayer - Madonna", path: "audio/320k/like-a-prayer-madonna.m4a", bpm: 85 },
      { name: "99 Luftballoons - Nena", path: "audio/320k/99-luftballoons-nena.m4a", bpm: 85 },
      { name: "Sweet Dreams - Eurythmics", path: "audio/320k/sweet-dreams-eurythmics.m4a", bpm: 85 }
    ];
    
    // Get current playlist based on mode
    const currentPlaylist = is80sMode ? eightyTracks : non80sTracks;
    
    // Format time
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };
    
    // Update progress
    const updateProgress = useCallback(() => {
      if (!audioRef.current) return;
      
      const currentTimeValue = audioRef.current.currentTime;
      const durationValue = audioRef.current.duration;
      
      if (!durationValue || isNaN(durationValue) || !isFinite(durationValue)) {
        return;
      }
      
      setCurrentTime(formatTime(currentTimeValue));
      setDuration(formatTime(durationValue));
      setPlayProgress((currentTimeValue / durationValue) * 100);
    }, [audioRef]);
    
    // Load and play track
    const loadTrack = useCallback(async (index, shouldAutoPlay = null) => {
      console.log('🎵🔴 loadTrack called!', {
        instanceId: instanceId.current,
        index,
        shouldAutoPlay,
        autoPlay,
        caller: new Error().stack.split('\n')[2] // Get immediate caller
      });
      
      // Check if we're trying to load the same track that's already loaded
      const playlist = is80sMode ? eightyTracks : non80sTracks;
      const currentLoadedTrack = audioRef.current?.src;
      
      // IMPROVED CHECK: If audio exists, check if it's the same track
      if (audioRef.current?.src) {
        // Check if we switched modes (80s vs non-80s)
        const currentIs80s = eightyTracks.some(track => 
          currentLoadedTrack && currentLoadedTrack.includes(track.path.split('/').pop())
        );
        
        // Check if we're trying to load the exact same track index
        const isSameTrack = window.__globalMusicTrackIndex === index && currentIs80s === is80sMode;
        
        if (isSameTrack) {
          // Same track, just sync state and potentially resume
          console.log('🎵 Same track already loaded, syncing state', {
            isPaused: audioRef.current.paused,
            requestedIndex: index,
            currentIs80s,
            is80sMode
          });
          
          // Update UI state to match current audio
          setIsLoaded(true);
          setIsPlaying(!audioRef.current.paused);
          setContextIsPlaying(!audioRef.current.paused);
          
          // Update track index if we have it from global state
          if (window.__globalMusicTrackIndex !== undefined) {
            setCurrentTrackIndex(window.__globalMusicTrackIndex);
            currentTrackIndexRef.current = window.__globalMusicTrackIndex;
            setContextTrackIndex(window.__globalMusicTrackIndex);
          }
          
          // If paused and should play, just resume
          if (audioRef.current.paused && (shouldAutoPlay || autoPlay)) {
            console.log('🎵 Resuming existing audio');
            audioRef.current.play().then(() => {
              setIsPlaying(true);
              setContextIsPlaying(true);
            }).catch(e => console.log('Play blocked:', e));
          }
          return;
        } else if (currentIs80s !== is80sMode) {
          // Mode changed, need to load new track
          console.log('🎵 Mode changed, loading new track for different playlist');
        } else {
          // Different track in same mode
          console.log('🎵 Loading different track:', index, 'from current:', window.__globalMusicTrackIndex);
        }
      }
      
      console.log('🎵🔴 loadTrack - NO EXISTING AUDIO, proceeding', {
        index,
        shouldAutoPlay,
        autoPlay
      });
      
      // playlist already declared at the top of this function
      if (!audioRef.current || index < 0 || index >= playlist.length) return;
      
      setIsLoading(true);
      isLoadingRef.current = true;
      
      try {
        console.log('🎵🔴 ACTUALLY LOADING NEW TRACK!', index, playlist[index].name);
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
        currentTrackIndexRef.current = index;
        setContextTrackIndex(index);
        setCurrentTrackBPM(playlist[index].bpm || 100);
        setIsLoaded(true);
        setIsLoading(false);
        isLoadingRef.current = false;
        
        // Auto-play if requested
        const shouldPlay = shouldAutoPlay !== null ? shouldAutoPlay : autoPlay;
        if (shouldPlay && audioRef.current) {
          audioRef.current.play().then(() => {
            setIsPlaying(true);
          }).catch(e => console.log('Auto-play blocked:', e));
        }
      } catch (error) {
        console.error('Error loading track:', error);
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    }, [audioRef, autoPlay, is80sMode, setCurrentTrackBPM, setContextTrackIndex, setContextIsPlaying, instanceId]);
    
    // Play/pause controls
    const play = useCallback(() => {
      console.log('🎵 play() called', {
        hasAudio: !!audioRef.current,
        hasSrc: !!audioRef.current?.src,
        isLoading
      });
      
      if (audioRef.current && audioRef.current.src && !isLoading) {
        audioRef.current.play().then(() => {
          console.log('🎵 Playback started successfully');
          setIsPlaying(true);
        }).catch(e => console.log('Play blocked:', e));
      } else if (audioRef.current && !audioRef.current.src) {
        console.log('⚠️ No audio source loaded yet');
      }
    }, [audioRef, isLoading]);
    
    const pause = useCallback(() => {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }, [audioRef]);
    
    const togglePlayPause = useCallback(() => {
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    }, [isPlaying, play, pause]);
    
    // Get next track index
    const getNextTrackIndex = useCallback((direction) => {
      const playlist = is80sMode ? eightyTracks : non80sTracks;
      const currentIndex = currentTrackIndexRef.current;
      
      if (!isShuffled) {
        return (currentIndex + direction + playlist.length) % playlist.length;
      }
      
      // Handle shuffle mode
      if (shuffledQueue.length === 0) {
        const allTracks = [...Array(playlist.length).keys()];
        const newQueue = allTracks
          .filter((index) => index !== currentIndex)
          .sort(() => Math.random() - 0.5);
        setShuffledQueue([currentIndex, ...newQueue]);
        return newQueue.length > 0 ? newQueue[0] : currentIndex;
      }
      
      const currentQueueIndex = shuffledQueue.indexOf(currentIndex);
      let nextQueueIndex;
      if (direction === 1) {
        nextQueueIndex = (currentQueueIndex + 1) % shuffledQueue.length;
      } else {
        nextQueueIndex = (currentQueueIndex - 1 + shuffledQueue.length) % shuffledQueue.length;
      }
      return shuffledQueue[nextQueueIndex];
    }, [is80sMode, isShuffled, shuffledQueue]);
    
    // Skip to next/prev track
    const changeTrack = useCallback(async (direction) => {
      if (isLoading) return;
      
      const nextIndex = getNextTrackIndex(direction);
      const wasPlaying = audioRef.current && !audioRef.current.paused;
      
      // Force load the new track even if one is playing
      await loadTrack(nextIndex, wasPlaying);
    }, [loadTrack, getNextTrackIndex, isLoading, audioRef]);
    
    // Toggle shuffle
    const toggleShuffle = useCallback(() => {
      const newShuffleState = !isShuffled;
      
      if (newShuffleState) {
        const playlist = is80sMode ? eightyTracks : non80sTracks;
        const allTracks = [...Array(playlist.length).keys()];
        const shuffled = allTracks
          .filter((index) => index !== currentTrackIndexRef.current)
          .sort(() => Math.random() - 0.5);
        const newQueue = [currentTrackIndexRef.current, ...shuffled];
        setShuffledQueue(newQueue);
      } else {
        setShuffledQueue([]);
      }
      
      setIsShuffled(newShuffleState);
    }, [isShuffled, is80sMode]);
    
    // Handle volume change
    const handleVolumeChange = (e) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
    };
    
    // Handle seek
    const handleSeek = (e) => {
      const audio = audioRef.current;
      if (audio && audio.duration) {
        const seekTime = (e.nativeEvent.offsetX / e.target.clientWidth) * audio.duration;
        audio.currentTime = seekTime;
        updateProgress();
      }
    };
    
    // Update volume when it changes
    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.volume = volume;
      }
    }, [volume, audioRef]);
    
    // Initialize and sync with existing audio - ONLY sync, never load
    useEffect(() => {
      // Skip if audio element doesn't exist or we've already checked
      if (!audioRef.current || hasCheckedForAudio.current) return;
      
      const hasAudioSource = !!audioRef.current.src;
      const isAudioPlaying = hasAudioSource && !audioRef.current.paused;
      
      console.log('🎵 MusicPlayer3 Initial Mount Check:', {
        hasAudioSource,
        isAudioPlaying,
        contextIsPlaying,
        contextTrackIndex
      });
      
      hasCheckedForAudio.current = true;
      
      // If audio exists (from any previous page), just sync the UI
      if (hasAudioSource) {
        console.log('🎵 Audio already exists on mount, syncing UI only');
        setIsPlaying(isAudioPlaying);
        setContextIsPlaying(isAudioPlaying); // Sync context state too
        if (contextTrackIndex !== undefined) {
          setCurrentTrackIndex(contextTrackIndex);
          currentTrackIndexRef.current = contextTrackIndex;
        }
        updateProgress();
        // Mark that we've already loaded
        hasLoadedTrack.current = true;
        window.__musicPlayer3State.hasLoadedTrack = true;
        setIsLoaded(true); // Mark as loaded to enable controls
      }
      // DO NOT load new tracks here - let the visibility effect handle it
    }, [audioRef, contextTrackIndex, updateProgress, setContextIsPlaying]);
    
    // Handle first-time initialization when becoming visible
    const hasEverPlayed = useRef(false);
    const lastAutoPlayState = useRef(autoPlay);
    
    useEffect(() => {
      console.log('🎵🔍 Visibility/AutoPlay effect triggered', {
        instanceId: instanceId.current,
        isVisible,
        autoPlay,
        hasGlobalSrc: !!window.__globalAudioElement?.src,
        hasAudioRefSrc: !!audioRef.current?.src,
        globalHasLoadedTrack: window.__musicPlayer3State.hasLoadedTrack
      });
      
      // EARLY RETURN if we've already loaded a track globally
      if (window.__musicPlayer3State.hasLoadedTrack) {
        console.log('🎵 Track already loaded globally, just syncing state');
        if (audioRef.current) {
          const isPaused = audioRef.current.paused;
          setIsPlaying(!isPaused);
          setContextIsPlaying(!isPaused);
          updateProgress();
          
          // Resume if needed
          if (autoPlay && isPaused) {
            audioRef.current.play().catch(e => console.log('Play blocked:', e));
          }
        }
        return;
      }
      
      // GLOBAL CHECK - Check for any existing audio
      if (window.__globalAudioElement?.src || audioRef.current?.src) {
        const hasSource = window.__globalAudioElement?.src || audioRef.current?.src;
        const isPaused = audioRef.current?.paused ?? true;
        
        console.log('🎵✅ Audio exists, just syncing UI', {
          hasSource,
          isPaused,
          autoPlay,
          hasEverPlayed: hasEverPlayed.current,
          autoPlayChanged: lastAutoPlayState.current !== autoPlay
        });
        
        // Mark that we have loaded audio
        hasLoadedTrack.current = true;
        window.__musicPlayer3State.hasLoadedTrack = true;
        setIsLoaded(true);
        
        // Just sync UI state
        if (audioRef.current) {
          setIsPlaying(!isPaused);
          setContextIsPlaying(!isPaused);
          updateProgress();
          
          // Only play if autoPlay is explicitly requested AND audio is paused
          // BUT don't reload the track
          if (autoPlay && isPaused) {
            console.log('🎵 Resuming paused audio (no reload)');
            audioRef.current.play().then(() => {
              setIsPlaying(true);
              setContextIsPlaying(true);
            }).catch(e => console.log('Play blocked:', e));
          }
          
          lastAutoPlayState.current = autoPlay;
        }
        return; // Audio already loaded, nothing to do
      }
      
      if (!audioRef.current) return;
      
      const hasAudioSource = !!audioRef.current.src;
      
      console.log('🎵 Initialization check:', {
        isVisible,
        hasAudioSource,
        hasLoadedTrack: hasLoadedTrack.current,
        isLoading,
        autoPlay,
        autoPlayChanged: lastAutoPlayState.current !== autoPlay
      });
      
      // If audio exists, just sync state
      if (hasAudioSource) {
        console.log('🎵 Audio source exists, syncing state only');
        hasLoadedTrack.current = true;
        window.__musicPlayer3State.hasLoadedTrack = true;
        setIsPlaying(!audioRef.current.paused);
        updateProgress();
        
        // If autoPlay changed from false to true, play the audio
        if (autoPlay && !lastAutoPlayState.current && audioRef.current.paused) {
          console.log('🎵🎯 AutoPlay toggled ON, playing existing audio');
          audioRef.current.play().then(() => {
            setIsPlaying(true);
            setContextIsPlaying(true);
          }).catch(e => console.log('Play blocked:', e));
        }
        
        lastAutoPlayState.current = autoPlay;
        return;
      }
      
      // Only load ONCE - check if we've EVER loaded a track globally
      if (isVisible && !window.__globalAudioElement?.src && !window.__musicPlayer3State.hasLoadedTrack && !isLoading) {
        console.log('🎵 First time EVER initialization, loading track 0', {
          autoPlay,
          willPlay: autoPlay,
          globalHasLoadedTrack: window.__musicPlayer3State.hasLoadedTrack
        });
        // Set the flag BEFORE loading to prevent double loads
        window.__musicPlayer3State.hasLoadedTrack = true;
        hasLoadedTrack.current = true;
        lastAutoPlayState.current = autoPlay;
        // Load and play if autoPlay is true
        loadTrack(0, autoPlay);
      } else if (isVisible) {
        console.log('🎵 Not loading - audio already exists or has been loaded before', {
          hasGlobalSrc: !!window.__globalAudioElement?.src,
          hasLoadedBefore: window.__musicPlayer3State.hasLoadedTrack
        });
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible]); // Only depend on visibility, not autoPlay
    
    
    // Handle track end
    useEffect(() => {
      if (!audioRef.current) return;
      
      const handleEnded = () => {
        changeTrack(1);
      };
      
      const handlePlay = () => {
        setIsPlaying(true);
        if (setContextIsPlaying) setContextIsPlaying(true);
      };
      
      const handlePause = () => {
        setIsPlaying(false);
        if (setContextIsPlaying) setContextIsPlaying(false);
      };
      
      const handleTimeUpdate = () => {
        updateProgress();
      };
      
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('play', handlePlay);
      audioRef.current.addEventListener('pause', handlePause);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', handleEnded);
          audioRef.current.removeEventListener('play', handlePlay);
          audioRef.current.removeEventListener('pause', handlePause);
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        }
      };
    }, [audioRef, changeTrack, updateProgress]);
    
    // Handle visibility changes
    useEffect(() => {
      if (!isVisible && audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }, [isVisible, audioRef, isPlaying]);
    
    // Expose controls via ref
    React.useImperativeHandle(ref, () => {
      console.log('🎵 Setting up imperative handle');
      return {
        play: async () => {
          console.log('🎵 play() called via ref', {
            hasAudioRef: !!audioRef.current,
            hasSrc: !!audioRef.current?.src,
            currentIsLoading: isLoadingRef.current
          });
          
          // Wait for any current loading to finish
          if (isLoadingRef.current) {
            console.log('🎵 Waiting for current load to finish...');
            await new Promise(resolve => {
              const checkLoading = setInterval(() => {
                if (!isLoadingRef.current) {
                  clearInterval(checkLoading);
                  resolve();
                }
              }, 100);
            });
          }
          
          // If no audio loaded yet, load first track
          if (!audioRef.current?.src) {
            console.log('🎵 No audio loaded, loading track 0 before playing');
            await loadTrack(0, true);
          } else {
            console.log('🎵 Audio already loaded, calling play()');
            play();
          }
        },
        pause: () => pause(),
        togglePlayPause: () => togglePlayPause(),
        nextTrack: () => changeTrack(1),
        prevTrack: () => changeTrack(-1),
      };
    }, [play, pause, togglePlayPause, changeTrack, loadTrack, audioRef]);
    
    // Define colors based on mode
    const accentColor = is80sMode ? "#ff71ce" : "#1DB954";
    const glowColor = is80sMode ? "0 0 15px rgba(255, 113, 206, 0.7)" : "0 0 15px rgba(29, 185, 84, 0.5)";
    
    // Album spin animation
    const albumAnimation = isPlaying ? "spin 20s linear infinite" : "none";
    
    return (
      <div 
        className="music-player"
        style={{ 
          width: '100%',
          background: 'rgba(0, 0, 0, 0.85)',
          borderTop: `1px solid ${accentColor}30`,
          borderBottom: `1px solid ${accentColor}30`,
          padding: '12px 0',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            padding: '0 15px'
          }}
        >
          {/* Track info and album art row */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            {/* Album Art - Enhanced and more prominent */}
            <div
              style={{
                position: 'relative',
                width: '70px',
                height: '70px',
                marginRight: '15px',
                borderRadius: '50%',
                overflow: 'hidden',
                boxShadow: `0 0 20px rgba(0,0,0,0.5), ${glowColor}`,
                animation: albumAnimation,
                cursor: 'pointer',
                border: `3px solid ${accentColor}40`
              }}
              onClick={togglePlayPause}
            >
              <img
                src="/virginRecords.jpg"
                alt="Album Art"
                style={{ 
                  width: '100%', 
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>
            
            {/* Track title and artist */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div 
                style={{ 
                  color: accentColor,
                  fontWeight: 'bold',
                  fontSize: '0.65rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: '8px',
                  textShadow: `0 0 5px ${accentColor}70`,
                  textAlign: 'center'
                }}
              >
                {currentPlaylist[currentTrackIndex]?.name || 'Loading...'}
              </div>
              
              {/* Player controls */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-evenly',
                width: '100%'
              }}>
                <button
                  onClick={() => changeTrack(-1)}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isLoading ? '#666' : 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    padding: '0 5px'
                  }}
                >
                  ⏮️
                </button>
                
                <button
                  onClick={togglePlayPause}
                  disabled={isLoading}
                  style={{
                    background: accentColor,
                    border: 'none',
                    color: 'black',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    boxShadow: glowColor
                  }}
                >
                  {isLoading ? "⏳" : isPlaying ? "❚❚" : "▶"}
                </button>
                
                <button
                  onClick={() => changeTrack(1)}
                  disabled={isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isLoading ? '#666' : 'white',
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    padding: '0 5px'
                  }}
                >
                  ⏭️
                </button>
                
                <button
                  onClick={toggleShuffle}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isShuffled ? accentColor : 'white',
                    cursor: 'pointer',
                    fontSize: '16px',
                    padding: '0',
                    opacity: isShuffled ? 1 : 0.7
                  }}
                >
                  🔀
                </button>
              </div>
            </div>
          </div>
          
          {/* Progress bar and time */}
          <div style={{ width: '100%' }}>
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                width: '100%',
                marginBottom: '7px'
              }}
            >
              <span style={{ color: 'white', opacity: 0.8, fontSize: '0.75rem', marginRight: '5px', minWidth: '35px' }}>
                {currentTime}
              </span>
              
              <div
                style={{
                  flex: 1,
                  height: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  position: 'relative'
                }}
                onClick={handleSeek}
              >
                <div
                  style={{
                    width: `${playProgress}%`,
                    height: '100%',
                    backgroundColor: accentColor,
                    borderRadius: '2px',
                    position: 'relative'
                  }}
                >
                  <div 
                    style={{
                      position: 'absolute',
                      right: '0',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'white',
                      boxShadow: glowColor
                    }}
                  />
                </div>
              </div>
              
              <span style={{ color: 'white', opacity: 0.8, fontSize: '0.75rem', marginLeft: '5px', minWidth: '35px', textAlign: 'right' }}>
                {duration}
              </span>
            </div>
            
            {/* Volume control */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ color: 'white', fontSize: '12px', marginRight: '5px' }}>
                {volume === 0 ? '🔇' : volume < 0.3 ? '🔈' : volume < 0.7 ? '🔉' : '🔊'}
              </span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                style={{
                  width: '100%',
                  accentColor: accentColor,
                  height: '4px'
                }}
              />
            </div>
          </div>
        </div>
        
        {/* Define CSS animation for spinning album */}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
);

MusicPlayer3.displayName = "MusicPlayer3";

export default MusicPlayer3;