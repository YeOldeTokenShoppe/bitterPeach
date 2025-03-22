import React, { useState, useRef, useEffect, useMemo } from "react";
import { storage } from "../utilities/firebaseClient";
import { ref, getDownloadURL } from "firebase/storage";

const MusicPlayer = ({ isVisible, onClose, autoPlay = true }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration] = useState("00:00");
  const [playProgress, setPlayProgress] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledQueue, setShuffledQueue] = useState([]);
  const audioRef = useRef(null);
  // Set initial volume to 0.15 (15%) for an even lower starting volume
  const [volume, setVolume] = useState(0.15);
  const [trackUrl, setTrackUrl] = useState(""); // Add state for the track URL
  const [isLoaded, setIsLoaded] = useState(false);

  const albums = [
    "Like A Prayer - Madonna",
    "Intergalactic - Beastie Boys",
    "For Those About To Rock - AC/DC",
    "Good Life - Paradise",
    "99 Luftballons - Nena",
  ];

  const trackNames = [
    "Like A Prayer - Madonna",
    "Intergalactic - Beastie Boys",
    "For Those About To Rock - AC/DC",
    "Good Life - Inner City",
    "99 Luftballoons - Nena",
  ];

  // Map of file paths in Firebase Storage
  const trackStoragePaths = [
    "audio/320k/like-a-prayer-madonna.m4a",
    "audio/320k/intergalactic-beastie-boys.m4a",
    "audio/320k/for-those-about-to-rock-ac-dc.m4a",
    "audio/320k/good-life-inner-city.m4a",
    "audio/320k/99-luftballoons-nena.m4a",
  ];

  // Fallback local paths
  const trackUrls = [
    "likeAPrayer.m4a",
    "intergalactic Beastie Boys.m4a",
    "ForThoseAboutToRock.m4a",
    "goodLife.m4a",
    "99 Luftballoons Nena.m4a",
  ];

  useEffect(() => {}, [isShuffled, shuffledQueue]);
  const getRandomTrackIndex = () => {
    return Math.floor(Math.random() * trackUrls.length);
  };

  const [currentTrackIndex, setCurrentTrackIndex] = useState(
    getRandomTrackIndex()
  );
  // Create shuffled queue when shuffle is toggled
  useEffect(() => {
    if (isShuffled) {
      const allTracks = [...Array(trackUrls.length).keys()];
      const shuffled = allTracks
        .filter((index) => index !== currentTrackIndex)
        .sort(() => Math.random() - 0.5);
      console.log("New shuffle queue:", [currentTrackIndex, ...shuffled]);
      setShuffledQueue([currentTrackIndex, ...shuffled]);
    } else {
      console.log("Clearing shuffle queue");
      setShuffledQueue([]); // Clear queue when shuffle is disabled
    }
  }, [isShuffled, currentTrackIndex, trackUrls.length]); // Add all dependencies

  const getNextTrackIndex = (direction) => {
    if (!isShuffled) {
      const nextIndex =
        (currentTrackIndex + direction + trackUrls.length) % trackUrls.length;

      return nextIndex;
    }

    if (shuffledQueue.length === 0) {
      const allTracks = [...Array(trackUrls.length).keys()];
      const newQueue = allTracks
        .filter((index) => index !== currentTrackIndex)
        .sort(() => Math.random() - 0.5);
      setShuffledQueue([currentTrackIndex, ...newQueue]);

      return newQueue[0];
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

  // Enhanced effect to auto-play when component becomes visible
  useEffect(() => {
    if (isVisible && audioRef.current && autoPlay) {
      // Set volume before playing
      audioRef.current.volume = volume;

      // Attempt to play
      audioRef.current
        .play()
        .then(() => {
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
      const allTracks = [...Array(trackUrls.length).keys()];
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

  const changeTrack = (direction) => {
    console.log("Changing track. Current audio state:", {
      ref: audioRef.current,
      isPlaying,
      currentTrackIndex,
    });

    // If there's an existing audio, ensure it's stopped
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      console.log("Paused previous audio");
    }

    const newIndex = getNextTrackIndex(direction);
    setCurrentTrackIndex(newIndex);
    setIsPlaying(true);

    console.log("Changed to track index:", newIndex);
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

  // Handle play/pause state changes
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current
          .play()
          .then(() => {})
          .catch((error) => console.error("Error playing:", error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
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

  // Effect to load the current track URL from Firebase Storage
  useEffect(() => {
    async function loadTrackFromStorage() {
      try {
        // Check if trackStoragePaths is valid and has the current index
        if (
          !trackStoragePaths ||
          currentTrackIndex >= trackStoragePaths.length
        ) {
          console.error("Invalid storage path:", {
            trackStoragePaths,
            currentTrackIndex,
          });
          // Fallback to local URL
          setTrackUrl(trackUrls[currentTrackIndex]);
          return;
        }

        // Get track from Firebase Storage
        console.log(`Loading track ${currentTrackIndex} from Firebase Storage`);
        const storageRef = ref(storage, trackStoragePaths[currentTrackIndex]);

        const downloadUrl = await getDownloadURL(storageRef);
        console.log("Got download URL:", downloadUrl);
        setTrackUrl(downloadUrl);
      } catch (error) {
        console.error("Error getting track from Firebase:", error);
        // Fallback to local URL
        console.log("Falling back to local URL:", trackUrls[currentTrackIndex]);
        setTrackUrl(trackUrls[currentTrackIndex]);
      }
    }

    loadTrackFromStorage();
  }, [currentTrackIndex]);

  // Initialize audio element when track URL changes
  useEffect(() => {
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

      // If Firebase URL fails, try local fallback
      if (trackUrl.includes("firebasestorage.googleapis.com")) {
        console.log("Firebase URL failed, trying local fallback");
        audio.src = trackUrls[currentTrackIndex];
      }
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
          console.error("Auto-play on metadata load failed:", error);
        });
      }
    });
    audio.addEventListener("timeupdate", updateProgress);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("timeupdate", updateProgress);
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [trackUrl, isVisible, volume, autoPlay]);

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
            <i className="fa-solid fa-times text-white text-xl">X</i>
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
                          target: { value: volume === 0 ? 0.15 : 0 },
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
      {/* <div className="text-xs text-gray-400 mt-2 text-center">80's Mode</div> */}
    </div>
  );
};

export default MusicPlayer;
