// Global Music Manager - Singleton that exists outside React
import { storage } from "./firebaseClient";
import { ref as storageRefUtil, getDownloadURL } from "firebase/storage";

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

class GlobalMusicManager {
  constructor() {
    // Initialize only once
    if (window.__globalMusicManagerInstance) {
      return window.__globalMusicManagerInstance;
    }
    
    console.log('🎵 Creating GlobalMusicManager singleton');
    
    // Create audio element
    this.audio = new Audio();
    this.audio.volume = 0.2;
    this.audio.crossOrigin = "anonymous";
    
    // State
    this.currentTrackIndex = 0;
    this.is80sMode = false;
    this.isPlaying = false;
    this.isLoading = false;
    this.listeners = new Set();
    this.currentTrackUrl = null;
    
    // Bind methods
    this.loadTrack = this.loadTrack.bind(this);
    this.play = this.play.bind(this);
    this.pause = this.pause.bind(this);
    this.togglePlayPause = this.togglePlayPause.bind(this);
    this.nextTrack = this.nextTrack.bind(this);
    this.prevTrack = this.prevTrack.bind(this);
    
    // Set up audio event listeners
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.notifyListeners();
    });
    
    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.notifyListeners();
    });
    
    this.audio.addEventListener('ended', () => {
      this.nextTrack();
    });
    
    // Store instance globally
    window.__globalMusicManagerInstance = this;
  }
  
  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(this.getState());
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  // Notify all listeners of state change
  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
  
  // Get current state
  getState() {
    return {
      isPlaying: this.isPlaying,
      isLoading: this.isLoading,
      currentTrackIndex: this.currentTrackIndex,
      is80sMode: this.is80sMode,
      currentTrack: this.getCurrentTrack(),
      currentTime: this.audio.currentTime,
      duration: this.audio.duration || 0,
      volume: this.audio.volume,
      paused: this.audio.paused
    };
  }
  
  // Get current track info
  getCurrentTrack() {
    const playlist = this.is80sMode ? eightyTracks : non80sTracks;
    return playlist[this.currentTrackIndex] || null;
  }
  
  // Load a track by index
  async loadTrack(index, shouldAutoPlay = false) {
    const playlist = this.is80sMode ? eightyTracks : non80sTracks;
    
    // Check if same track is already loaded
    if (this.currentTrackUrl && this.currentTrackIndex === index && this.audio.src) {
      console.log('🎵 GlobalMusicManager: Same track already loaded, just resuming');
      if (shouldAutoPlay && this.audio.paused) {
        this.play();
      }
      return;
    }
    
    if (index < 0 || index >= playlist.length) return;
    
    console.log('🎵 GlobalMusicManager: Loading track', index, playlist[index].name);
    this.isLoading = true;
    this.notifyListeners();
    
    try {
      const trackRef = storageRefUtil(storage, playlist[index].path);
      const url = await getDownloadURL(trackRef);
      
      // Store the URL to check later
      this.currentTrackUrl = url;
      this.currentTrackIndex = index;
      
      // Load the audio
      this.audio.src = url;
      this.audio.load();
      
      // Wait for audio to be ready
      await new Promise((resolve) => {
        const handleCanPlay = () => {
          this.audio.removeEventListener('canplaythrough', handleCanPlay);
          resolve();
        };
        this.audio.addEventListener('canplaythrough', handleCanPlay);
      });
      
      this.isLoading = false;
      this.notifyListeners();
      
      if (shouldAutoPlay) {
        this.play();
      }
    } catch (error) {
      console.error('🎵 Error loading track:', error);
      this.isLoading = false;
      this.notifyListeners();
    }
  }
  
  // Play current track
  play() {
    if (!this.audio.src) {
      // Load first track if none loaded
      this.loadTrack(0, true);
    } else {
      this.audio.play().catch(e => console.log('Play blocked:', e));
    }
  }
  
  // Pause current track
  pause() {
    this.audio.pause();
  }
  
  // Toggle play/pause
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  // Skip to next track
  async nextTrack() {
    const playlist = this.is80sMode ? eightyTracks : non80sTracks;
    const nextIndex = (this.currentTrackIndex + 1) % playlist.length;
    const wasPlaying = this.isPlaying;
    await this.loadTrack(nextIndex, wasPlaying);
  }
  
  // Skip to previous track
  async prevTrack() {
    const playlist = this.is80sMode ? eightyTracks : non80sTracks;
    const prevIndex = (this.currentTrackIndex - 1 + playlist.length) % playlist.length;
    const wasPlaying = this.isPlaying;
    await this.loadTrack(prevIndex, wasPlaying);
  }
  
  // Set 80s mode
  set80sMode(enabled) {
    if (this.is80sMode !== enabled) {
      this.is80sMode = enabled;
      this.currentTrackIndex = 0;
      this.currentTrackUrl = null; // Force reload
      // Don't auto-load, let user trigger
      this.notifyListeners();
    }
  }
  
  // Set volume
  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.notifyListeners();
  }
  
  // Seek to position
  seek(time) {
    if (this.audio.duration) {
      this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
    }
  }
}

// Export singleton instance
const musicManager = new GlobalMusicManager();
export default musicManager;