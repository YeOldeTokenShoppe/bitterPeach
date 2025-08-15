import React, { useState, useEffect, useCallback } from "react";
import musicManager from "../utilities/globalMusicManager";

// Track lists for display
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

const MusicPlayer3Simple = React.forwardRef(
  ({ isVisible, onClose, autoPlay = true, is80sMode = false }, ref) => {
    // Local state synced with singleton
    const [state, setState] = useState(musicManager.getState());
    const [currentTime, setCurrentTime] = useState("00:00");
    const [duration, setDuration] = useState("00:00");
    const [playProgress, setPlayProgress] = useState(0);
    const [isShuffled, setIsShuffled] = useState(false);
    const [volume, setVolume] = useState(0.2);
    
    // Get current playlist
    const currentPlaylist = is80sMode ? eightyTracks : non80sTracks;
    
    // Initialize on mount
    useEffect(() => {
      console.log('🎵 MusicPlayer3Simple mounted');
      
      // Set 80s mode in manager
      musicManager.set80sMode(is80sMode);
      
      // Subscribe to state changes
      const unsubscribe = musicManager.subscribe((newState) => {
        setState(newState);
        setVolume(newState.volume);
      });
      
      // Auto-play if needed and no audio loaded
      if (autoPlay && !musicManager.audio.src) {
        console.log('🎵 Auto-playing first track');
        musicManager.loadTrack(0, true);
      }
      
      return () => {
        console.log('🎵 MusicPlayer3Simple unmounting');
        unsubscribe();
      };
    }, []);
    
    // Update 80s mode when prop changes
    useEffect(() => {
      musicManager.set80sMode(is80sMode);
    }, [is80sMode]);
    
    // Update time display
    useEffect(() => {
      const updateProgress = () => {
        const audio = musicManager.audio;
        if (audio && audio.duration) {
          const current = formatTime(audio.currentTime);
          const total = formatTime(audio.duration);
          const progress = (audio.currentTime / audio.duration) * 100;
          
          setCurrentTime(current);
          setDuration(total);
          setPlayProgress(progress);
        }
      };
      
      const interval = setInterval(updateProgress, 100);
      return () => clearInterval(interval);
    }, []);
    
    // Format time helper
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };
    
    // Handle volume change
    const handleVolumeChange = (e) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
      musicManager.setVolume(newVolume);
    };
    
    // Handle seek
    const handleSeek = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const seekTime = percent * musicManager.audio.duration;
      musicManager.seek(seekTime);
    };
    
    // Toggle shuffle (local only for now)
    const toggleShuffle = () => {
      setIsShuffled(!isShuffled);
    };
    
    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      play: () => musicManager.play(),
      pause: () => musicManager.pause(),
      togglePlayPause: () => musicManager.togglePlayPause(),
      nextTrack: () => musicManager.nextTrack(),
      prevTrack: () => musicManager.prevTrack(),
    }));
    
    // Define colors based on mode
    const accentColor = is80sMode ? "#ff71ce" : "#1DB954";
    const glowColor = is80sMode ? "0 0 15px rgba(255, 113, 206, 0.7)" : "0 0 15px rgba(29, 185, 84, 0.5)";
    
    // Album spin animation
    const albumAnimation = state.isPlaying ? "spin 20s linear infinite" : "none";
    
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
            {/* Album Art */}
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
              onClick={() => musicManager.togglePlayPause()}
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
            
            {/* Track title */}
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
                {currentPlaylist[state.currentTrackIndex]?.name || 'No Track'}
              </div>
              
              {/* Player controls */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-evenly',
                width: '100%'
              }}>
                <button
                  onClick={() => musicManager.prevTrack()}
                  disabled={state.isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: state.isLoading ? '#666' : 'white',
                    cursor: state.isLoading ? 'not-allowed' : 'pointer',
                    fontSize: '18px',
                    padding: '0 5px'
                  }}
                >
                  ⏮️
                </button>
                
                <button
                  onClick={() => musicManager.togglePlayPause()}
                  disabled={state.isLoading}
                  style={{
                    background: accentColor,
                    border: 'none',
                    color: 'black',
                    cursor: state.isLoading ? 'not-allowed' : 'pointer',
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
                  {state.isLoading ? "⏳" : state.isPlaying ? "❚❚" : "▶"}
                </button>
                
                <button
                  onClick={() => musicManager.nextTrack()}
                  disabled={state.isLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: state.isLoading ? '#666' : 'white',
                    cursor: state.isLoading ? 'not-allowed' : 'pointer',
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
        
        {/* CSS animation for spinning album */}
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

MusicPlayer3Simple.displayName = "MusicPlayer3Simple";

export default MusicPlayer3Simple;