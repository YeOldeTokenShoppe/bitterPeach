import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Create the music context
const MusicContext = createContext();

// Custom hook to use the music context
export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};

// Music Provider component
export const MusicProvider = ({ children }) => {
  const [showSpotify, setShowSpotify] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2);
  const [trackProgress, setTrackProgress] = useState(0);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [is80sMode, setIs80sMode] = useState(false);
  const audioRef = React.useRef(null);
  const [audioElement, setAudioElement] = useState(null);
  
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
    console.log("🎵 MusicContext: Setting showSpotify to", newValue);
    setShowSpotify(newValue);
    
    // Pause audio when music is toggled off
    if (!newValue && audioRef.current && isPlaying) {
      console.log("🎵 MusicContext: Pausing audio as music is toggled off");
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
          console.log("🎵 MusicContext: Music toggle message received:", event.data.enabled);
          setShowSpotify(event.data.enabled);
          
          // Pause audio when music is toggled off via iframe
          if (!event.data.enabled && audioRef.current && isPlaying) {
            console.log("🎵 MusicContext: Pausing audio as music is toggled off via iframe");
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
        
        // Handle request for current music state
        if (event.data.type === "REQUEST_MUSIC_STATE") {
          console.log("🎵 MusicContext: Music state requested");
          syncWithMissionControl(showSpotify);
        }
      }
    };
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [showSpotify, isPlaying, syncWithMissionControl]);
  
  // Initialize audio element once and persist it
  useEffect(() => {
    if (!audioRef.current) {
      console.log("🎵 MusicContext: Creating persistent audio element");
      const audio = new Audio();
      audio.volume = volume;
      audioRef.current = audio;
      setAudioElement(audio);
      
      // Add event listeners
      audio.addEventListener('ended', () => {
        console.log("🎵 Track ended");
        setIsPlaying(false);
      });
    }
    
    return () => {
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
    console.log("🎵 MusicContext showSpotify state:", showSpotify);
  }, [showSpotify]);
  
  const value = {
    showSpotify,
    setShowSpotify: toggleMusic,
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
    audioElement: audioRef.current,
    audioRef,
  };
  
  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};