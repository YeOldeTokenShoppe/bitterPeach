import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { storage } from "../utilities/firebaseClient";
import { ref as storageRefUtil, getDownloadURL } from "firebase/storage";

// Create the music context
export const MusicContext = createContext();

// Custom hook to use the music context
export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

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

// Music Provider component
export const MusicProvider = ({ children }) => {
  const [showSpotify, setShowSpotify] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [trackProgress, setTrackProgress] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [is80sMode, setIs80sMode] = useState(false);
  const [currentTrackUrl, setCurrentTrackUrl] = useState('');
  const [currentTrackPath, setCurrentTrackPath] = useState(''); // Add path tracking
  const [currentTrackBPM, setCurrentTrackBPM] = useState(100); // Add BPM tracking
  const [currentTrackShader, setCurrentTrackShader] = useState(null); // Add shader tracking
  const audioRef = React.useRef(null);
  const [audioElement, setAudioElement] = useState(null);
  const [isLoadingTrack, setIsLoadingTrack] = useState(false);
  
  // Helper function to get the mission control iframe
  const getMissionControlIframe = useCallback(() => {
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      if (iframe.src && (iframe.src.includes("cyberpunk_mission_control_clean.html") || iframe.src.includes("cyberpunk_mission_control_enhanced.html"))) {
        return iframe;
      }
    }
    return null;
  }, []);
  
  // Sync music state with mission control
  const syncWithMissionControl = useCallback((musicEnabled) => {
    const iframe = getMissionControlIframe();
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: "MUSIC_TOGGLE",
          enabled: musicEnabled,
        },
        "*"
      );
      iframe.contentWindow.postMessage(
        {
          type: "SET_MUSIC_STATE",
          isPlaying: musicEnabled,
        },
        "*"
      );
    }
  }, [getMissionControlIframe]);
  
  // Toggle music visibility
  const toggleMusic = useCallback((value) => {
    const newValue = value !== undefined ? value : !showSpotify;
    // console.log("🎵 MusicContext: Setting showSpotify to", newValue);
    setShowSpotify(newValue);
    
    // Pause audio when music is toggled off
    if (!newValue && audioRef.current && isPlaying) {
      // console.log("🎵 MusicContext: Pausing audio as music is toggled off");
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    syncWithMissionControl(newValue);
  }, [showSpotify, isPlaying, syncWithMissionControl]);
  
  // Handle messages from mission control
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && typeof event.data === "object") {
        // Handle music toggle from mission control
        if (event.data.type === "MUSIC_TOGGLE") {
          // console.log("🎵 MusicContext: Music toggle message received:", event.data.enabled);
          setShowSpotify(event.data.enabled);
          
          // Pause audio when music is toggled off via iframe
          if (!event.data.enabled && audioRef.current && isPlaying) {
            // console.log("🎵 MusicContext: Pausing audio as music is toggled off via iframe");
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
        
        // Handle request for current music state
        if (event.data.type === "REQUEST_MUSIC_STATE") {
          // console.log("🎵 MusicContext: Music state requested");
          syncWithMissionControl(showSpotify);
        }
      }
    };
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [showSpotify, isPlaying, syncWithMissionControl]);
  
  // Load and play track function
  const loadTrack = useCallback(async (index, shouldAutoPlay = false) => {
    // Add to global action log
    if (!window.__musicDebugLog) window.__musicDebugLog = [];
    window.__musicDebugLog.push({
      action: 'loadTrack called',
      time: new Date().toISOString(),
      index,
      shouldAutoPlay,
      hasGlobalSrc: !!window.__globalAudioElement?.src,
      globalTrackIndex: window.__globalMusicTrackIndex,
      is80sMode,
      globalIs80s: window.__globalMusic80sMode,
      caller: new Error().stack.split('\n').slice(1, 4).join(' -> ')
    });
    
    // CRITICAL: Check if the EXACT SAME track is already loaded
    if (window.__globalAudioElement?.src && window.__globalMusicTrackIndex === index && is80sMode === window.__globalMusic80sMode) {
      console.log('🎵 MusicContext: Same track already loaded at index', index, ', just resuming', {
        index,
        isPaused: window.__globalAudioElement.paused
      });
      
      // Update state to match what's already loaded
      setCurrentTrackIndex(index);
      setCurrentTrackBPM(playlist[index].bpm || 100);
      setCurrentTrack(playlist[index]);
      setIsLoadingTrack(false);
      
      if (shouldAutoPlay && window.__globalAudioElement.paused) {
        window.__globalAudioElement.play().catch(e => console.log('Play blocked:', e));
        setIsPlaying(true);
      }
      return;
    }
    
    const playlist = is80sMode ? eightyTracks : non80sTracks;
    if (index < 0 || index >= playlist.length) return;
    
    console.log('🎵 MusicContext: Loading new track', index, playlist[index].name);
    setIsLoadingTrack(true);
    
    try {
      const trackRef = storageRefUtil(storage, playlist[index].path);
      const url = await getDownloadURL(trackRef);
      
      if (window.__globalAudioElement) {
        // Check if this is actually a different track
        const isSameTrack = window.__globalAudioElement.src === url || 
                          (window.__globalAudioElement.src && window.__globalAudioElement.src.includes(playlist[index].path.split('/').pop()));
        
        if (isSameTrack) {
          console.log('🎵 MusicContext: Same track URL, not reloading', {
            index,
            trackName: playlist[index].name
          });
          
          // Just update state and play if needed
          setCurrentTrackIndex(index);
          setCurrentTrackBPM(playlist[index].bpm || 100);
          setCurrentTrack(playlist[index]);
          setIsLoadingTrack(false);
          window.__globalMusicTrackIndex = index;
          window.__globalMusic80sMode = is80sMode;
          
          if (shouldAutoPlay && window.__globalAudioElement.paused) {
            window.__globalAudioElement.play().then(() => {
              setIsPlaying(true);
            }).catch(e => console.log('Play blocked:', e));
          }
          return;
        }
        
        // Log the ACTUAL change
        window.__musicDebugLog.push({
          action: '🔴 ACTUALLY CHANGING SRC',
          time: new Date().toISOString(),
          oldSrc: window.__globalAudioElement.src,
          newSrc: url,
          index,
          trackName: playlist[index].name
        });
        
        window.__globalAudioElement.src = url;
        window.__globalAudioElement.load();
        window.__globalMusicTrackIndex = index;
        window.__globalMusic80sMode = is80sMode;
        
        await new Promise((resolve) => {
          const handleCanPlay = () => {
            window.__globalAudioElement.removeEventListener('canplaythrough', handleCanPlay);
            resolve();
          };
          window.__globalAudioElement.addEventListener('canplaythrough', handleCanPlay);
        });
        
        setCurrentTrackIndex(index);
        setCurrentTrackBPM(playlist[index].bpm || 100);
        setCurrentTrack(playlist[index]);
        setIsLoadingTrack(false);
        
        if (shouldAutoPlay) {
          window.__globalAudioElement.play().then(() => {
            setIsPlaying(true);
          }).catch(e => console.log('Auto-play blocked:', e));
        }
      }
    } catch (error) {
      console.error('Error loading track:', error);
      setIsLoadingTrack(false);
    }
  }, [is80sMode, setCurrentTrackBPM]);
  
  // Play/Pause functions
  const play = useCallback(() => {
    if (window.__globalAudioElement) {
      // If no track loaded, load the first one
      if (!window.__globalAudioElement.src) {
        loadTrack(0, true);
      } else {
        window.__globalAudioElement.play().then(() => {
          setIsPlaying(true);
        }).catch(e => console.log('Play blocked:', e));
      }
    }
  }, [loadTrack]);
  
  const pause = useCallback(() => {
    if (window.__globalAudioElement) {
      window.__globalAudioElement.pause();
      setIsPlaying(false);
    }
  }, []);
  
  // Next track function
  const nextTrack = useCallback(() => {
    const playlist = is80sMode ? eightyTracks : non80sTracks;
    const nextIndex = (currentTrackIndex + 1) % playlist.length;
    const wasPlaying = window.__globalAudioElement && !window.__globalAudioElement.paused;
    console.log('🎵 MusicContext: Next track', currentTrackIndex, '->', nextIndex);
    loadTrack(nextIndex, wasPlaying);
  }, [currentTrackIndex, is80sMode, loadTrack]);
  
  // Previous track function
  const prevTrack = useCallback(() => {
    const playlist = is80sMode ? eightyTracks : non80sTracks;
    const prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    const wasPlaying = window.__globalAudioElement && !window.__globalAudioElement.paused;
    console.log('🎵 MusicContext: Previous track', currentTrackIndex, '->', prevIndex);
    loadTrack(prevIndex, wasPlaying);
  }, [currentTrackIndex, is80sMode, loadTrack]);
  
  // Add debug key listener
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        console.log('🎵 MUSIC DEBUG LOG:', window.__musicDebugLog || []);
        console.log('🎵 Current state:', {
          globalSrc: window.__globalAudioElement?.src,
          globalPaused: window.__globalAudioElement?.paused,
          globalTrackIndex: window.__globalMusicTrackIndex,
          global80sMode: window.__globalMusic80sMode
        });
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
  
  // Initialize audio element once and persist it GLOBALLY
  useEffect(() => {
    // Use window object for true persistence across ALL renders
    if (!window.__globalAudioElement) {
      console.log("🎵🟢 MusicContext: Creating GLOBAL persistent audio element");
      const audio = new Audio();
      audio.volume = volume;
      audio.crossOrigin = "anonymous"; // Add CORS support
      window.__globalAudioElement = audio;
      
      // Add debug listener
      audio.addEventListener('loadstart', () => {
        console.log('🎵🔄 Audio loadstart - NEW TRACK LOADING!', {
          src: audio.src,
          currentTime: audio.currentTime
        });
      });
    } else {
      console.log("🎵 MusicContext: Using existing GLOBAL audio element");
    }
    
    audioRef.current = window.__globalAudioElement;
    setAudioElement(window.__globalAudioElement);
    
    // Set up audio context and listeners only once
    if (!window.__globalAudioElement._initialized) {
      const audio = window.__globalAudioElement;
      window.__globalAudioElement._initialized = true;
      
      // Create an audio context to prevent suspension
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext && !audio._audioContext) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(audio);
        const gainNode = audioContext.createGain();
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Resume audio context if it gets suspended
        const resumeAudioContext = () => {
          if (audioContext.state === 'suspended') {
            audioContext.resume();
          }
        };
        
        // Check periodically for suspended state
        const contextCheckInterval = setInterval(resumeAudioContext, 1000);
        
        // Store references for cleanup
        audio._audioContext = audioContext;
        audio._contextCheckInterval = contextCheckInterval;
      }
      
      // Add event listeners
      audio.addEventListener('ended', () => {
        console.log('🎵🔚 Audio ENDED event');
        setIsPlaying(false);
      });
      
      audio.addEventListener('pause', () => {
        console.log('🎵⏸️ Audio PAUSED event');
      });
      
      audio.addEventListener('play', () => {
        console.log('🎵▶️ Audio PLAY event');
      });
      
      audio.addEventListener('loadeddata', () => {
        console.log('🎵📦 Audio LOADEDDATA event - track loaded');
      });
    }
    
    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden && audioRef.current && !audioRef.current.paused) {
        // Don't pause the audio when tab becomes hidden
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Don't destroy the audio element on unmount
      // It will persist across scene changes
    };
  }, []);
  
  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  // Debug logging
  useEffect(() => {
    // console.log("🎵 MusicContext showSpotify state:", showSpotify);
  }, [showSpotify]);
  
  // Create a stable reference for setShowSpotify
  const stableSetShowSpotify = useCallback((value) => {
    if (typeof value === 'function') {
      // Handle function form of setState
      setShowSpotify(prevValue => {
        const newValue = value(prevValue);
        syncWithMissionControl(newValue);
        return newValue;
      });
    } else {
      setShowSpotify(value);
      syncWithMissionControl(value);
    }
  }, [syncWithMissionControl]);

  const value = {
    showSpotify,
    setShowSpotify: stableSetShowSpotify,
    currentTrack,
    setCurrentTrack,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    trackProgress,
    setTrackProgress,
    currentTrackIndex,
    setCurrentTrackIndex,
    is80sMode,
    setIs80sMode,
    currentTrackUrl,
    setCurrentTrackUrl,
    currentTrackPath,
    setCurrentTrackPath,
    currentTrackBPM,
    setCurrentTrackBPM,
    currentTrackShader,
    setCurrentTrackShader,
    audioElement: audioRef.current,
    audioRef,
    // New methods for direct control
    loadTrack,
    play,
    pause,
    nextTrack,
    prevTrack,
    isLoadingTrack,
    non80sTracks,
    eightyTracks,
  };
  
  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};