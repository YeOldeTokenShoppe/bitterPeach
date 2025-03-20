import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  getBrowserConnectionSpeed,
  getRecommendedAudioQuality,
  isMeteredConnection,
} from "../utils/networkUtils";
import { storage } from "../utilities/firebaseClient"; // Import Firebase storage
import { ref, getDownloadURL } from "firebase/storage"; // Import Firebase storage functions

const MusicPlayer = ({ isVisible, onClose, autoPlay = true }) => {
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

  const albums = ["  Man - Steven Drozd"];

  const trackNames = ["Rocket Man - Steven Drozd"];

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

  useEffect(() => {
    console.log(
      "Shuffle state effect triggered. isShuffled:",
      isShuffled,
      "Queue:",
      shuffledQueue
    );
  }, [isShuffled, shuffledQueue]);
  const getRandomTrackIndex = () => {
    return Math.floor(Math.random() * trackNames.length);
  };

  const [currentTrackIndex, setCurrentTrackIndex] = useState(
    getRandomTrackIndex()
  );
  // Create shuffled queue when shuffle is toggled
  useEffect(() => {
    console.log("Shuffle state changed:", isShuffled);
    if (isShuffled) {
      const allTracks = [...Array(trackNames.length).keys()];
      const shuffled = allTracks
        .filter((index) => index !== currentTrackIndex)
        .sort(() => Math.random() - 0.5);
      console.log("New shuffle queue:", [currentTrackIndex, ...shuffled]);
      setShuffledQueue([currentTrackIndex, ...shuffled]);
    } else {
      console.log("Clearing shuffle queue");
      setShuffledQueue([]); // Clear queue when shuffle is disabled
    }
  }, [isShuffled, currentTrackIndex, trackNames.length]); // Add all dependencies

  const getNextTrackIndex = (direction) => {
    console.log(
      "Getting next track. Shuffle:",
      isShuffled,
      "Direction:",
      direction,
      "Current Queue:",
      shuffledQueue
    );

    if (!isShuffled) {
      const nextIndex =
        (currentTrackIndex + direction + trackNames.length) % trackNames.length;
      console.log("Sequential playback, next index:", nextIndex);
      return nextIndex;
    }

    if (shuffledQueue.length === 0) {
      console.log("Empty shuffle queue, creating new one");
      const allTracks = [...Array(trackNames.length).keys()];
      const newQueue = allTracks
        .filter((index) => index !== currentTrackIndex)
        .sort(() => Math.random() - 0.5);
      setShuffledQueue([currentTrackIndex, ...newQueue]);
      console.log("New queue created:", [currentTrackIndex, ...newQueue]);
      return newQueue[0];
    }

    const currentQueueIndex = shuffledQueue.indexOf(currentTrackIndex);
    console.log("Current position in shuffle queue:", currentQueueIndex);

    let nextQueueIndex;
    if (direction === 1) {
      nextQueueIndex = (currentQueueIndex + 1) % shuffledQueue.length;
    } else {
      nextQueueIndex =
        (currentQueueIndex - 1 + shuffledQueue.length) % shuffledQueue.length;
    }

    console.log(
      "Next track from shuffle queue:",
      shuffledQueue[nextQueueIndex]
    );
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
      console.log(
        "MusicPlayer is now visible, attempting auto-play at volume:",
        volume
      );
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
      console.log("MusicPlayer is no longer visible, pausing playback");
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isVisible, volume, autoPlay]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    console.log("Volume slider changed to:", newVolume);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      console.log("Current audio volume:", audioRef.current.volume);
    }
  };

  const toggleShuffle = () => {
    console.log("toggleShuffle called, current state:", isShuffled);
    const newShuffleState = !isShuffled;
    console.log("Setting shuffle to:", newShuffleState);

    if (newShuffleState) {
      // Create new shuffle queue
      const allTracks = [...Array(trackNames.length).keys()];
      const shuffled = allTracks
        .filter((index) => index !== currentTrackIndex)
        .sort(() => Math.random() - 0.5);
      const newQueue = [currentTrackIndex, ...shuffled];
      console.log("New shuffle queue:", newQueue);
      setShuffledQueue(newQueue);
    } else {
      console.log("Clearing shuffle queue");
      setShuffledQueue([]);
    }

    setIsShuffled(newShuffleState);
  };

  const changeTrack = (direction) => {
    const newIndex = getNextTrackIndex(direction);
    setCurrentTrackIndex(newIndex);
    setIsPlaying(true);
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
  // Initialize audio element
  useEffect(() => {
    // Direct URL to Firebase Storage audio file
    const firebaseAudioUrl =
      "https://firebasestorage.googleapis.com/v0/b/hailmary-3ff6c.firebasestorage.app/o/audio%2F320k%2Frocket-man---steven-drozd.m4a?alt=media&token=03a93b83-7077-4090-aff9-58b1ddabb6f8";

    console.log("Setting audio URL:", firebaseAudioUrl);
    setTrackUrl(firebaseAudioUrl);
  }, []);

  // Update the useEffect that creates the audio element
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

    console.log(`Loading audio from URL: ${trackUrl}`);
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
  }, [trackUrl, isVisible, autoPlay, volume]);

  // Handle play/pause state changes
  useEffect(() => {
    if (audioRef.current) {
      console.log("Play state changed, isPlaying:", isPlaying);
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

  return (
    <div className="music-player">
      {!trackUrl ? (
        <div style={{ textAlign: "center", padding: "20px" }}>
          Loading audio file...
        </div>
      ) : (
        <div id="app-cover">
          <div
            style={closeButtonStyle}
            onClick={handleClose}
            className="hover:bg-black/50"
            title="Close player"
          >
            <i className="fa-solid fa-times text-white text-xl"></i>
          </div>

          <div id="player">
            <div id="player-track" className={isPlaying ? "active" : ""}>
              <div id="album-name">{albums[currentTrackIndex]}</div>
              <div id="track-name">{trackNames[currentTrackIndex]}</div>
              <div id="track-time">
                <div id="current-time">{currentTime}</div>
                <div id="track-length">{duration}</div>
              </div>
              <div id="s-area" onClick={handleSeek}>
                <div id="seek-bar" style={{ width: `${playProgress}%` }}></div>
              </div>
            </div>
            <div id="player-content">
              <div id="album-art" className={`${isPlaying ? "rotate" : ""}`}>
                <img
                  src="/virginRecords.jpg"
                  className="active"
                  alt="Album Art"
                />
              </div>
              <div id="player-controls">
                <div className="control" onClick={() => changeTrack(-1)}>
                  <div className="button" id="play-previous">
                    <i className="fa-solid fa-backward"></i>
                  </div>
                </div>
                <div className="control" onClick={playPause}>
                  <div className="button" id="play-pause-button">
                    <i className={playPauseIconClass}></i>
                  </div>
                </div>
                <div className="control" onClick={() => changeTrack(1)}>
                  <div className="button" id="play-next">
                    <i className="fa-solid fa-forward"></i>
                  </div>
                </div>
                <div className="control">
                  <div
                    className="button"
                    id="shuffle-button"
                    onClick={(e) => {
                      console.log("Shuffle button clicked"); // Add this log
                      toggleShuffle();
                    }}
                  >
                    {/* <i
                      className={`fa-solid fa-random ${
                        isShuffled ? "text-green-400" : "text-white"
                      }`}
                    ></i> */}
                  </div>
                </div>
                <div className="control">
                  <div
                    className="volume-control"
                    style={{ display: "flex", alignItems: "center" }}
                  >
                    <i
                      className={`fa-solid ${
                        volume === 0 ? "fa-volume-mute" : "fa-volume-up"
                      }`}
                      style={{
                        marginRight: "8px",
                        cursor: "pointer",
                        position: "absolute",
                        bottom: "25px",
                        left: "50%",
                      }}
                      onClick={() =>
                        handleVolumeChange({
                          target: { value: volume === 0 ? 0.2 : 0 },
                        })
                      }
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        left: "60%",
                        width: "60px",
                        height: "4px",
                        WebkitAppearance: "none",
                        background: `linear-gradient(to right, #fff ${
                          volume * 100
                        }%, #4a4a4a ${volume * 100}%)`,
                        borderRadius: "2px",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                </div>
                <div
                  id="current-track-info"
                  style={{ textAlign: "center", marginTop: "2.5rem" }}
                >
                  {trackNames[currentTrackIndex]}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* <div className="text-xs text-gray-400 mt-2 text-center">
        Playing in {networkQuality} quality
      </div> */}
    </div>
  );
};

export default MusicPlayer;
