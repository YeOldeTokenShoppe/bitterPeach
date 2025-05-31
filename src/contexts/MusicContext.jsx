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
  const [volume, setVolume] = useState(1);
  const [trackProgress, setTrackProgress] = useState(0);
  
  // Helper function to get the mission control iframe
  const getMissionControlIframe = useCallback(() => {
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      if (iframe.src && iframe.src.includes("cyberpunk_mission_control_clean.html")) {
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
    syncWithMissionControl(newValue);
  }, [showSpotify, syncWithMissionControl]);
  
  // Handle messages from mission control
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && typeof event.data === "object") {
        // Handle music toggle from mission control
        if (event.data.type === "MUSIC_TOGGLE") {
          console.log("🎵 MusicContext: Music toggle message received:", event.data.enabled);
          setShowSpotify(event.data.enabled);
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
  }, [showSpotify, syncWithMissionControl]);
  
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
  };
  
  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};