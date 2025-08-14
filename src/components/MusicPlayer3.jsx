import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { storage } from "../utilities/firebaseClient";
import { ref as storageRefUtil, getDownloadURL } from "firebase/storage";
import { useMusic } from "../contexts/MusicContext";

const MusicPlayer3 = React.forwardRef(
  ({ isVisible, onClose, autoPlay = true, is80sMode = false }, ref) => {
    // State
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState("00:00");
    const [duration, setDuration] = useState("00:00");
    const [playProgress, setPlayProgress] = useState(0);
    const [isShuffled, setIsShuffled] = useState(false);
    const [shuffledQueue, setShuffledQueue] = useState([]);
    const [volume, setVolume] = useState(0.2);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // Use ref to track current index for reliable access in callbacks
    const currentTrackIndexRef = useRef(0);
    const isInitializedRef = useRef(false);
    const lastModeRef = useRef(is80sMode);
    const audioRef = useRef(null);
    
    // Get context functions but not the audio element
    const { setCurrentTrackBPM, setCurrentTrackIndex: setContextTrackIndex } = useMusic();
    
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
      const playlist = is80sMode ? eightyTracks : non80sTracks;
      
      if (!audioRef.current || index < 0 || index >= playlist.length) return;
      
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
        currentTrackIndexRef.current = index;
        setContextTrackIndex(index);
        setCurrentTrackBPM(playlist[index].bpm || 100);
        setIsLoaded(true);
        setIsLoading(false);
        
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
      }
    }, [audioRef, autoPlay, is80sMode, setCurrentTrackBPM, setContextTrackIndex]);
    
    // Play/pause controls
    const play = useCallback(() => {
      if (audioRef.current && !isLoading) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(e => console.log('Play blocked:', e));
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
      
      await loadTrack(nextIndex);
      
      if (wasPlaying) {
        play();
      }
    }, [loadTrack, getNextTrackIndex, isLoading, audioRef, play]);
    
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
    
    // Create audio element once on mount
    useEffect(() => {
      if (!audioRef.current) {
        const audio = new Audio();
        audio.volume = volume;
        audio.preload = 'metadata';
        audioRef.current = audio;
      }
      
      return () => {
        // Clean up on unmount
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      };
    }, []);
    
    // Initialize first track
    useEffect(() => {
      if (lastModeRef.current !== is80sMode) {
        lastModeRef.current = is80sMode;
        currentTrackIndexRef.current = 0;
        setCurrentTrackIndex(0);
        isInitializedRef.current = false;
      }
      
      if (isVisible && currentPlaylist.length > 0 && !isInitializedRef.current) {
        isInitializedRef.current = true;
        loadTrack(0);
      }
    }, [isVisible, currentPlaylist.length, loadTrack, is80sMode]);
    
    // Handle track end
    useEffect(() => {
      if (!audioRef.current) return;
      
      const handleEnded = () => {
        changeTrack(1);
      };
      
      const handlePlay = () => {
        setIsPlaying(true);
      };
      
      const handlePause = () => {
        setIsPlaying(false);
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
    React.useImperativeHandle(ref, () => ({
      play: () => play(),
      pause: () => pause(),
      togglePlayPause: () => togglePlayPause(),
      nextTrack: () => changeTrack(1),
      prevTrack: () => changeTrack(-1),
    }));
    
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