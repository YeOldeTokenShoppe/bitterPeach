import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  getBrowserConnectionSpeed,
  getRecommendedAudioQuality,
  isMeteredConnection,
} from "../utils/networkUtils";
import styles from "../../styles/MusicPlayer.module.css";
import { storage } from "../utilities/firebaseClient"; // Import Firebase storage
import { ref as storageRefUtil, getDownloadURL } from "firebase/storage"; // Import Firebase storage functions & RENAME ref

const MusicPlayer = React.forwardRef(
  ({ isVisible, onClose, autoPlay = true, is80sMode = false }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const [currentTime, setCurrentTime] = useState("00:00");
    const [duration, setDuration] = useState("00:00");
    const [playProgress, setPlayProgress] = useState(0);
    const [isShuffled, setIsShuffled] = useState(false);
    const [shuffledQueue, setShuffledQueue] = useState([]);
    const audioRef = useRef(null);
    const [volume, setVolume] = useState(0.2);
    const [userBandwidth, setUserBandwidth] = useState(200); // Default to medium
    const [isLoaded, setIsLoaded] = useState(false);
    const [networkQuality, setNetworkQuality] = useState("medium");
    const [trackUrl, setTrackUrl] = useState(""); // Add state for the track URL

    // --- Track List for Non-80s Mode ---
    const non80sTrackNames = [
      "Rocket Man - Steven Drozd",
      // Add more track names here later
    ];
    const non80sFirebasePaths = [
      "audio/320k/rocket-man---steven-drozd.m4a", // Ensure this path is correct in your storage
      // Add corresponding Firebase paths here
    ];
    // --- End Track List ---

    // --- Track List for 80s Mode ---
    const eightyTrackNames = [
      "Like A Prayer - Madonna",
      "Intergalactic - Beastie Boys",
      "For Those About To Rock - AC/DC",
      "Good Life - Inner City",
      "99 Luftballoons - Nena",
      "Sweet Dreams - Eurythmics",
    ];
    const eightyFirebasePaths = [
      "audio/320k/like-a-prayer-madonna.m4a",
      "audio/320k/intergalactic-beastie-boys.m4a",
      "audio/320k/for-those-about-to-rock-ac-dc.m4a",
      "audio/320k/good-life-inner-city.m4a",
      "audio/320k/99-luftballoons-nena.m4a",
      "audio/320k/sweet-dreams-eurythmics.m4a",
    ];
    // --- End 80s Track List ---

    // Use the appropriate track lists based on 80s mode
    const trackNames = is80sMode ? eightyTrackNames : non80sTrackNames;
    const firebasePaths = is80sMode ? eightyFirebasePaths : non80sFirebasePaths;

    // Re-introduce state for current track index
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0); // Start with the first track
    const [previousMode, setPreviousMode] = useState(is80sMode); // Track mode changes

    // Handle mode changes by resetting track index
    useEffect(() => {
      if (previousMode !== is80sMode) {
        // Save current playing state
        const wasPlaying = isPlaying;
        
        // Reset to first track when mode changes
        setCurrentTrackIndex(0);
        setPreviousMode(is80sMode);
        
        // If audio was playing, ensure it continues in new mode
        if (wasPlaying) {
          setIsPlaying(true);
        }
      }
    }, [is80sMode, previousMode, isPlaying]);

    // Detect user bandwidth
    useEffect(() => {
      // Skip bandwidth detection and just set a default value
      setUserBandwidth(200); // Default to 200 kbps
    }, []);

    // Get audio URLs based on network quality
    const getTrackUrl = (index) => {
      const baseUrl = ""; // Your base URL (empty if files are in public folder)
      const track = trackNames[index].replace(/\s+/g, "-").toLowerCase();

      // Select the right quality
      const quality =
        networkQuality === "low"
          ? "128k"
          : networkQuality === "medium"
          ? "192k"
          : "320k";

      return `${baseUrl}/audio/${quality}/${track}.m4a`;
    };

    // Detect network quality on mount
    useEffect(() => {
      let isMounted = true;

      // Set a default quality and don't try to detect
      setNetworkQuality("medium");

      return () => {
        isMounted = false;
      };
    }, []); // Empty dependency array = run once

    const getRandomTrackIndex = () => {
      return Math.floor(Math.random() * trackNames.length);
    };

    // Create shuffled queue when shuffle is toggled
    useEffect(() => {
      if (isShuffled) {
        const allTracks = [...Array(trackNames.length).keys()];
        const shuffled = allTracks
          .filter((index) => index !== currentTrackIndex)
          .sort(() => Math.random() - 0.5);

        setShuffledQueue([currentTrackIndex, ...shuffled]);
      } else {
        setShuffledQueue([]); // Clear queue when shuffle is disabled
      }
    }, [isShuffled, currentTrackIndex, trackNames.length]); // Use dynamic list length

    // Update getNextTrackIndex to use dynamic list
    const getNextTrackIndex = (direction) => {
      const trackListLength = trackNames.length;
      if (!isShuffled) {
        const nextIndex =
          (currentTrackIndex + direction + trackListLength) % trackListLength;
        return nextIndex;
      }

      if (shuffledQueue.length === 0) {
        const allTracks = [...Array(trackListLength).keys()];
        const newQueue = allTracks
          .filter((index) => index !== currentTrackIndex)
          .sort(() => Math.random() - 0.5);
        setShuffledQueue([currentTrackIndex, ...newQueue]);
        return newQueue.length > 0 ? newQueue[0] : currentTrackIndex; // Handle empty queue case
      }

      const currentQueueIndex = shuffledQueue.indexOf(currentTrackIndex);
      let nextQueueIndex;
      if (direction === 1) {
        nextQueueIndex = (currentQueueIndex + 1) % shuffledQueue.length;
      } else {
        nextQueueIndex =
          (currentQueueIndex - 1 + shuffledQueue.length) % shuffledQueue.length;
      }
      return shuffledQueue[nextQueueIndex];
    };

    const updateProgress = () => {
      const audio = audioRef.current;
      if (!audio) return;

      const currentTimeValue = audio.currentTime;
      const durationValue = audio.duration;

      // Check if duration is valid (not NaN, Infinity, or 0)
      if (!durationValue || isNaN(durationValue) || !isFinite(durationValue)) {
        return;
      }

      setCurrentTime(formatTime(currentTimeValue));
      setPlayProgress((currentTimeValue / durationValue) * 100);

      // Check if we're near the end of the track
      if (durationValue - currentTimeValue <= 0.5 && durationValue > 0) {
        const nextIndex = getNextTrackIndex(1);
        setCurrentTrackIndex(nextIndex);
      }
    };

    useEffect(() => {
      if (isVisible && audioRef.current && autoPlay) {
        // Set volume before playing
        audioRef.current.volume = volume;

        // Attempt to play
        audioRef.current
          .play()
          .then(() => {
            console.log(
              "Auto-play successful at volume:",
              audioRef.current.volume
            );
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error("Auto-play failed:", error);
            // Set isPlaying to false if auto-play fails
            setIsPlaying(false);
          });
      } else if (!isVisible && audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }, [isVisible, volume, autoPlay]);

    const handleVolumeChange = (e) => {
      const newVolume = parseFloat(e.target.value);

      setVolume(newVolume);
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
      }
    };

    const toggleShuffle = () => {
      const newShuffleState = !isShuffled;

      if (newShuffleState) {
        // Create new shuffle queue
        const allTracks = [...Array(trackNames.length).keys()];
        const shuffled = allTracks
          .filter((index) => index !== currentTrackIndex)
          .sort(() => Math.random() - 0.5);
        const newQueue = [currentTrackIndex, ...shuffled];

        setShuffledQueue(newQueue);
      } else {
        setShuffledQueue([]);
      }

      setIsShuffled(newShuffleState);
    };

    // Function to change track (using dynamic list)
    const changeTrack = (direction) => {
      const newIndex = getNextTrackIndex(direction);
      setCurrentTrackIndex(newIndex);
      // Don't set isPlaying here, let the loading process handle it
      // setIsPlaying(true);
    };

    const closeButtonStyle = {
      position: "absolute",
      top: "-5rem",
      left: "15px",
      cursor: "pointer",
      padding: "12px",
      width: "40px",
      height: "40px",
      borderRadius: "50%",
      color: "#000000",
      // backgroundColor: "rgba(0, 0, 0, 0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
      zIndex: 1000,
      border: "2px solid rgba(255, 255, 255, 0.2)",
    };

    // Handle close action
    const handleClose = () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      onClose && onClose();
    };

    // Fetch and set track URL when currentTrackIndex changes
    useEffect(() => {
      async function loadTrackUrl() {
        if (
          currentTrackIndex < 0 ||
          currentTrackIndex >= firebasePaths.length
        ) {
          console.error(
            "Invalid track index for fetching URL:",
            currentTrackIndex
          );
          return;
        }
        const path = firebasePaths[currentTrackIndex];
        console.log("Attempting to fetch URL for path:", path);
        try {
          const storageReference = storageRefUtil(storage, path);
          const downloadUrl = await getDownloadURL(storageReference);
          console.log("Fetched URL from Firebase:", downloadUrl);
          setTrackUrl(downloadUrl); // Set the fetched URL
          setIsLoaded(false); // Reset loaded state for new track
        } catch (error) {
          console.error("Error getting track URL from Firebase:", error);
          // Handle error (e.g., show message, try local fallback if implemented)
          setTrackUrl(""); // Clear URL on error
        }
      }
      loadTrackUrl();
    }, [currentTrackIndex, firebasePaths]); // Depend on currentTrackIndex and firebasePaths

    // Initialize audio element when trackUrl changes
    useEffect(() => {
      // Only proceed if we have a valid URL
      if (!trackUrl) {
        return;
      }

      // Create a new audio element
      const audio = new Audio();
      audio.preload = "metadata";
      audio.volume = volume;
      audio.src = trackUrl;

      audioRef.current = audio;

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleLoaded = () => setIsLoaded(true);

      // Add an error handler to debug issues
      const handleError = (e) => {
        console.error("Audio error:", e);
        console.error("Audio error details:", {
          error: e.target.error,
          src: e.target.src,
          readyState: e.target.readyState,
        });
      };

      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("error", handleError);
      audio.addEventListener("loadedmetadata", () => {
        setDuration(formatTime(audio.duration));
        setIsLoaded(true);

        // Auto-play if component is visible
        if (isVisible && autoPlay) {
          audio.play().catch((error) => {
            console.error("Auto-play failed:", error);
          });
        }
      });
      audio.addEventListener("timeupdate", updateProgress);

      // Cleanup function
      return () => {
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("error", handleError);
        audio.removeEventListener("timeupdate", updateProgress);
        audio.pause();
        audio.src = "";
        audioRef.current = null;
      };
    }, [trackUrl, isVisible, autoPlay, volume]); // Keep dependencies

    // Handle play/pause state changes
    useEffect(() => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current
            .play()
            .then(() => {
              console.log(
                "Successfully started playback, volume:",
                audioRef.current.volume
              );
            })
            .catch((error) => console.error("Error playing:", error));
        } else {
          audioRef.current.pause();
        }
      }
    }, [isPlaying]);

    // Handle volume changes
    useEffect(() => {
      if (audioRef.current) {
        console.log("Setting volume to:", volume);
        audioRef.current.volume = volume;
      }
    }, [volume]);

    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const playPause = () => {
      setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
      const audio = audioRef.current;
      if (audio) {
        const seekTime =
          (e.nativeEvent.offsetX / e.target.clientWidth) * audio.duration;
        audio.currentTime = seekTime;
        updateProgress();
      }
    };

    // Toggle play/pause when the component is clicked
    const handleClick = () => {
      playPause();
    };

    // Expose controls via ref
    React.useImperativeHandle(ref, () => ({
      play: () => {
        if (audioRef.current) {
          audioRef.current
            .play()
            .catch((e) => console.error("Play command failed:", e));
          setIsPlaying(true);
        }
      },
      pause: () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      },
      togglePlayPause: () => {
        setIsPlaying((prev) => !prev);
      },
      nextTrack: () => {
        changeTrack(1);
      },
      prevTrack: () => {
        changeTrack(-1);
      },
    }));

    // Define colors based on mode
    const accentColor = is80sMode ? "#ff71ce" : "#1DB954";
    const glowColor = is80sMode ? "0 0 15px rgba(255, 113, 206, 0.7)" : "0 0 15px rgba(29, 185, 84, 0.5)";
    
    // Album spin animation
    const albumAnimation = isPlaying ? 
      "spin 20s linear infinite" : 
      "none";

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
              onClick={playPause}
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
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '25px',
                  height: '25px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px'
                }}
              >
                {isPlaying ? "❚❚" : "▶"}
              </div>
            </div>
            
            {/* Track title and artist */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div 
                style={{ 
                  color: accentColor,
                  fontWeight: 'bold',
                  fontSize: '0.95rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  marginBottom: '8px',
                  textShadow: `0 0 5px ${accentColor}70`,
                  textAlign: 'center'
                }}
              >
                {trackNames[currentTrackIndex]}
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
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '0 5px'
                  }}
                >
                  ⏮️
                </button>
                
                <button
                  onClick={playPause}
                  style={{
                    background: accentColor,
                    border: 'none',
                    color: 'black',
                    cursor: 'pointer',
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
                  {isPlaying ? "❚❚" : "▶"}
                </button>
                
                <button
                  onClick={() => changeTrack(1)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
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

// Add the display name
MusicPlayer.displayName = "MusicPlayer2";

export default MusicPlayer;
