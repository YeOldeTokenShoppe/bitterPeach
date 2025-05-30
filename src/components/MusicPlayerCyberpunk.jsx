import React, { useState, useRef, useEffect, useMemo, forwardRef, useImperativeHandle } from "react";
import styles from "../../styles/CyberpunkMusicPlayer.module.css";
import { storage } from "../utilities/firebaseClient";
import { ref as storageRefUtil, getDownloadURL } from "firebase/storage";

const MusicPlayerCyberpunk = forwardRef(
  ({ isVisible, onClose, autoPlay = true, is80sMode = false }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState("00:00");
    const [duration, setDuration] = useState("00:00");
    const [playProgress, setPlayProgress] = useState(0);
    const [isShuffled, setIsShuffled] = useState(false);
    const [shuffledQueue, setShuffledQueue] = useState([]);
    const audioRef = useRef(null);
    const [volume, setVolume] = useState(0.2);
    const [isLoaded, setIsLoaded] = useState(false);
    const [trackUrl, setTrackUrl] = useState("");
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [previousMode, setPreviousMode] = useState(is80sMode);

    // Track Lists
    const non80sTrackNames = [
      "Rocket Man - Steven Drozd",
      "Magnetic - Tunde Adebimpe",
    ];
    const non80sFirebasePaths = [
      "audio/320k/rocket-man---steven-drozd.m4a",
      "audio/320k/01-magnetic.m4a",
    ];

    const eightyTrackNames = [
      "For Those About To Rock - AC/DC",
      "Dirty Cash - The Adventures of Stevie V",
      "Intergalactic - Beastie Boys",
      "Good Life - Inner City",
      "Like A Prayer - Madonna",
      "99 Luftballoons - Nena",
      "Sweet Dreams - Eurythmics",
    ];
    const eightyFirebasePaths = [
      "audio/320k/for-those-about-to-rock-ac-dc.m4a",
      "audio/320k/dirty-cash.m4a",
      "audio/320k/intergalactic-beastie-boys.m4a",
      "audio/320k/good-life-inner-city.m4a",
      "audio/320k/like-a-prayer-madonna.m4a",
      "audio/320k/99-luftballoons-nena.m4a",
      "audio/320k/sweet-dreams-eurythmics.m4a",
    ];

    const trackNames = is80sMode ? eightyTrackNames : non80sTrackNames;
    const firebasePaths = is80sMode ? eightyFirebasePaths : non80sFirebasePaths;

    // Handle mode changes
    useEffect(() => {
      if (previousMode !== is80sMode) {
        const wasPlaying = isPlaying;
        setCurrentTrackIndex(0);
        setPreviousMode(is80sMode);
        if (wasPlaying) {
          setIsPlaying(true);
        }
      }
    }, [is80sMode, previousMode, isPlaying]);

    // Fetch track URL
    useEffect(() => {
      async function loadTrackUrl() {
        if (currentTrackIndex < 0 || currentTrackIndex >= firebasePaths.length) {
          return;
        }
        const path = firebasePaths[currentTrackIndex];
        try {
          const storageReference = storageRefUtil(storage, path);
          const downloadUrl = await getDownloadURL(storageReference);
          setTrackUrl(downloadUrl);
          setIsLoaded(false);
        } catch (error) {
          console.error("Error getting track URL:", error);
          setTrackUrl("");
        }
      }
      loadTrackUrl();
    }, [currentTrackIndex, firebasePaths]);

    // Initialize audio element
    useEffect(() => {
      if (!trackUrl) return;

      const audio = new Audio();
      audio.preload = "metadata";
      audio.volume = volume;
      audio.src = trackUrl;

      audioRef.current = audio;

      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);
      const handleLoaded = () => setIsLoaded(true);
      const handleError = (e) => {
        console.error("Audio error:", e);
      };

      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("error", handleError);
      audio.addEventListener("loadedmetadata", () => {
        setDuration(formatTime(audio.duration));
        setIsLoaded(true);
        if (isVisible && autoPlay) {
          audio.play().catch((error) => {
            console.error("Auto-play failed:", error);
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
    }, [trackUrl, isVisible, autoPlay, volume]);

    // Playback control
    useEffect(() => {
      if (audioRef.current) {
        if (isPlaying) {
          audioRef.current.play().catch((error) => console.error("Error playing:", error));
        } else {
          audioRef.current.pause();
        }
      }
    }, [isPlaying]);

    // Volume control
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

    const updateProgress = () => {
      if (audioRef.current) {
        const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setPlayProgress(progress || 0);
        setCurrentTime(formatTime(audioRef.current.currentTime));
        
        if (audioRef.current.ended) {
          changeTrack(1);
        }
      }
    };

    const playPause = () => {
      setIsPlaying(!isPlaying);
    };

    const handleSeek = (e) => {
      if (audioRef.current) {
        const progressBar = e.currentTarget;
        const clickX = e.nativeEvent.offsetX;
        const width = progressBar.offsetWidth;
        const newTime = (clickX / width) * audioRef.current.duration;
        audioRef.current.currentTime = newTime;
      }
    };

    const handleVolumeChange = (e) => {
      const newVolume = parseFloat(e.target.value);
      setVolume(newVolume);
    };

    const changeTrack = (direction) => {
      let newIndex;
      if (isShuffled && shuffledQueue.length > 0) {
        const currentQueueIndex = shuffledQueue.indexOf(currentTrackIndex);
        const nextQueueIndex = (currentQueueIndex + direction + shuffledQueue.length) % shuffledQueue.length;
        newIndex = shuffledQueue[nextQueueIndex];
      } else {
        newIndex = (currentTrackIndex + direction + trackNames.length) % trackNames.length;
      }
      setCurrentTrackIndex(newIndex);
    };

    const toggleShuffle = () => {
      const newShuffleState = !isShuffled;
      if (newShuffleState) {
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

    // Expose controls to parent
    useImperativeHandle(ref, () => ({
      play: () => {
        if (audioRef.current) {
          audioRef.current.play();
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
      nextTrack: () => changeTrack(1),
      prevTrack: () => changeTrack(-1),
    }));

    return (
      <div className={`${styles.musicPlayer} ${is80sMode ? styles.eighties : ''} ${!isLoaded ? styles.loading : ''}`}>
        <div className={styles.playerContent}>
          <div 
            className={`${styles.albumArt} ${isPlaying ? styles.playing : ''}`}
            onClick={playPause}
          >
            <img
              src="/virginRecords.jpg"
              alt="Album Art"
              className={styles.albumArtImage}
            />
          </div>
          
          <div className={styles.centerContent}>
            <div className={styles.trackName}>
              {trackNames[currentTrackIndex]}
            </div>
            
            <div className={styles.progressContainer}>
              <div className={styles.progressBar} onClick={handleSeek}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${playProgress}%` }}
                />
              </div>
              <div className={styles.timeDisplay}>
                <span className={styles.timeLabel}>{currentTime}</span>
                <span className={styles.timeLabel}>{duration}</span>
              </div>
            </div>
            
            <div className={styles.controlsRow}>
              <div className={styles.controls}>
                <button
                  onClick={() => changeTrack(-1)}
                  className={styles.controlButton}
                >
                  ⏮
                </button>
                
                <button
                  onClick={playPause}
                  className={`${styles.controlButton} ${styles.playButton}`}
                >
                  {isPlaying ? "⏸" : "▶"}
                </button>
                
                <button
                  onClick={() => changeTrack(1)}
                  className={styles.controlButton}
                >
                  ⏭
                </button>
                
                <button
                  onClick={toggleShuffle}
                  className={`${styles.controlButton} ${styles.shuffleButton} ${isShuffled ? styles.active : ''}`}
                >
                  🔀
                </button>
              </div>
              
            </div>
          </div>
        </div>
        
      </div>
    );
  }
);

MusicPlayerCyberpunk.displayName = 'MusicPlayerCyberpunk';

export default MusicPlayerCyberpunk;