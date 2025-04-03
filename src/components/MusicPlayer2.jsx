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
  ({ isVisible, onClose, autoPlay = true }, ref) => {
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

    const albums = ["Rocket Man - Steven Drozd"]; // Example album

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

    // Re-introduce state for current track index
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0); // Start with the first track

    // Detect user bandwidth
    useEffect(() => {
      // Skip bandwidth detection and just set a default value
      setUserBandwidth(200); // Default to 200 kbps
    }, []);

    // Get audio URLs based on network quality
    const getTrackUrl = (index) => {
      const baseUrl = ""; // Your base URL (empty if files are in public folder)
      const track = non80sTrackNames[index].replace(/\s+/g, "-").toLowerCase();

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
      return Math.floor(Math.random() * non80sTrackNames.length);
    };

    // Create shuffled queue when shuffle is toggled
    useEffect(() => {
      if (isShuffled) {
        const allTracks = [...Array(non80sTrackNames.length).keys()];
        const shuffled = allTracks
          .filter((index) => index !== currentTrackIndex)
          .sort(() => Math.random() - 0.5);

        setShuffledQueue([currentTrackIndex, ...shuffled]);
      } else {
        setShuffledQueue([]); // Clear queue when shuffle is disabled
      }
    }, [isShuffled, currentTrackIndex, non80sTrackNames.length]); // Use non80s list length

    // Update getNextTrackIndex to use non80s list
    const getNextTrackIndex = (direction) => {
      const trackListLength = non80sTrackNames.length;
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
        const allTracks = [...Array(non80sTrackNames.length).keys()];
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

    // Function to change track (using non-80s list)
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
          currentTrackIndex >= non80sFirebasePaths.length
        ) {
          console.error(
            "Invalid track index for fetching URL:",
            currentTrackIndex
          );
          return;
        }
        const path = non80sFirebasePaths[currentTrackIndex];
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
    }, [currentTrackIndex]); // Depend on currentTrackIndex

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

    const playPauseIconClass = isPlaying
      ? "fa-solid fa-pause"
      : "fa-solid fa-play";

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

    return (
      <div className="music-player">
        <div id="app-cover">
          <div id="player">
            <div
              id="album-art"
              className={`${isPlaying ? "rotate" : ""}`}
              onClick={handleClick}
              style={{ cursor: "pointer", position: "relative" }}
            >
              <img
                src="/virginRecords.jpg"
                className="active"
                alt="Album Art"
              />

              <div
                style={{
                  position: "absolute",
                  bottom: "0",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "50%",
                  fontSize: "1.5rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  zIndex: 1000,
                }}
              >
                {isPlaying ? "❚❚" : "▶"}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

// Add the display name
MusicPlayer.displayName = "MusicPlayer2";

export default MusicPlayer;
