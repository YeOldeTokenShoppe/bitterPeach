import React, { useState, useRef, useEffect } from "react";

const MusicPlayer = ({ isVisible, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration] = useState("00:00");
  const [playProgress, setPlayProgress] = useState(0);
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledQueue, setShuffledQueue] = useState([]);
  const audioRef = useRef(null);
  const [volume, setVolume] = useState(1);

  const albums = [
    "Like A Prayer - Madonna",
    "Every 1's A Winner",
    "Take Me To Church - Hozier",
  ];
  const trackNames = [
    "Like A Prayer - Madonna",
    "Every 1's A Winner - Hot Chocolate",
    "Take Me To Church - Hozier",
  ];

  const trackUrls = ["likeAPrayer.m4a", "/every1.mp3", "/church.mp3"];
  useEffect(() => {
    console.log(
      "Shuffle state effect triggered. isShuffled:",
      isShuffled,
      "Queue:",
      shuffledQueue
    );
  }, [isShuffled, shuffledQueue]);
  const getRandomTrackIndex = () => {
    return Math.floor(Math.random() * trackUrls.length);
  };

  const [currentTrackIndex, setCurrentTrackIndex] = useState(
    getRandomTrackIndex()
  );
  // Create shuffled queue when shuffle is toggled
  useEffect(() => {
    console.log("Shuffle state changed:", isShuffled);
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
        (currentTrackIndex + direction + trackUrls.length) % trackUrls.length;
      console.log("Sequential playback, next index:", nextIndex);
      return nextIndex;
    }

    if (shuffledQueue.length === 0) {
      console.log("Empty shuffle queue, creating new one");
      const allTracks = [...Array(trackUrls.length).keys()];
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
    if (audio) {
      const currentTimeValue = audio.currentTime;
      const durationValue = audio.duration;

      setCurrentTime(formatTime(currentTimeValue));
      setPlayProgress((currentTimeValue / durationValue) * 100);

      // Check if we're near the end of the track
      if (durationValue - currentTimeValue <= 0.5 && durationValue > 0) {
        const nextIndex = getNextTrackIndex(1);
        setCurrentTrackIndex(nextIndex);
      }
    }
  };

  useEffect(() => {
    if (isVisible && audioRef.current && !isPlaying) {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((error) => {
          console.error("Auto-play failed:", error);
        });
    } else if (!isVisible && audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isVisible]);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const toggleShuffle = () => {
    console.log("toggleShuffle called, current state:", isShuffled);
    const newShuffleState = !isShuffled;
    console.log("Setting shuffle to:", newShuffleState);

    if (newShuffleState) {
      // Create new shuffle queue
      const allTracks = [...Array(trackUrls.length).keys()];
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
    const audio = new Audio(trackUrls[currentTrackIndex]);
    audioRef.current = audio;
    audio.volume = volume;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", () => {
      setDuration(formatTime(audio.duration));
    });

    if (isPlaying) {
      audio.play().catch((error) => console.error("Error playing:", error));
    }

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("timeupdate", updateProgress);
      audio.pause();
      audio.src = "";
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current
          .play()
          .catch((error) => console.error("Error playing:", error));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

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
                  <i
                    className={`fa-solid fa-random ${
                      isShuffled ? "text-green-400" : "text-white"
                    }`}
                  ></i>
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
                        target: { value: volume === 0 ? 1 : 0 },
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
    </div>
  );
};

export default MusicPlayer;
