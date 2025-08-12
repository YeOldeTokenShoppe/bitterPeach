import * as THREE from 'three';

class VideoManager {
  constructor() {
    this.videos = new Map();
    this.textures = new Map();
    this.currentVideo = null;
    this.transitionDuration = 1000; // ms for crossfade
  }

  // Load a video and create texture
  loadVideo(id, source, options = {}) {
    if (this.videos.has(id)) {
      console.log(`Video ${id} already loaded`);
      return this.textures.get(id);
    }

    const video = document.createElement('video');
    
    // Check if source is a YouTube URL
    if (source.includes('youtube.com') || source.includes('youtu.be')) {
      console.warn('YouTube URLs need iframe embedding. Use loadYouTubeEmbed instead.');
      return null;
    }

    // Add support for MOV files
    if (source.endsWith('.mov')) {
      video.setAttribute('type', 'video/quicktime');
      console.log(`Loading MOV file: ${source}`);
    }

    video.src = source;
    video.loop = options.loop !== false; // Default true
    video.muted = options.muted !== false; // Default true for autoplay
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.autoplay = false; // We'll control playback manually
    
    // Set video quality/performance options
    if (options.quality === 'low') {
      video.width = 640;
      video.height = 360;
    } else if (options.quality === 'high') {
      video.width = 1920;
      video.height = 1080;
    } else {
      video.width = 1280;
      video.height = 720;
    }

    // Preload strategy
    video.preload = options.preload || 'auto';

    // Create Three.js video texture
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.generateMipmaps = false;
    texture.encoding = THREE.sRGBEncoding;
    
    // Flip the texture vertically (videos often need this)
    texture.flipY = false; // Set to false to flip vertically

    // Handle video events
    video.addEventListener('loadeddata', () => {
      console.log(`✅ Video ${id} loaded successfully`);
      texture.needsUpdate = true;
    });

    video.addEventListener('error', (e) => {
      console.error(`❌ Error loading video ${id}:`, e);
    });

    this.videos.set(id, video);
    this.textures.set(id, texture);

    return texture;
  }

  // Load multiple videos at once
  loadVideos(videoConfig) {
    const loadedTextures = {};
    
    Object.entries(videoConfig).forEach(([id, config]) => {
      const texture = this.loadVideo(id, config.url, config.options);
      if (texture) {
        loadedTextures[id] = texture;
      }
    });

    return loadedTextures;
  }

  // Play a specific video
  play(id) {
    const video = this.videos.get(id);
    if (!video) {
      console.warn(`Video ${id} not found`);
      return;
    }

    // Pause current video if different
    if (this.currentVideo && this.currentVideo !== video) {
      this.currentVideo.pause();
    }

    video.play().catch(e => {
      console.error(`Error playing video ${id}:`, e);
    });

    this.currentVideo = video;
    console.log(`▶️ Playing video: ${id}`);
  }

  // Pause a specific video
  pause(id) {
    const video = this.videos.get(id);
    if (video) {
      video.pause();
      console.log(`⏸️ Paused video: ${id}`);
    }
  }

  // Stop all videos
  stopAll() {
    this.videos.forEach((video, id) => {
      video.pause();
      video.currentTime = 0;
    });
    this.currentVideo = null;
    console.log('⏹️ Stopped all videos');
  }

  // Switch between videos with optional crossfade
  switchVideo(fromId, toId, crossfade = false) {
    if (!crossfade) {
      this.pause(fromId);
      this.play(toId);
      return;
    }

    // Crossfade implementation
    const fromVideo = this.videos.get(fromId);
    const toVideo = this.videos.get(toId);

    if (!fromVideo || !toVideo) {
      console.warn('Videos not found for crossfade');
      return;
    }

    // Start playing the new video at low volume
    toVideo.volume = 0;
    toVideo.play();

    // Animate volume crossfade
    const steps = 20;
    const stepDuration = this.transitionDuration / steps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      fromVideo.volume = 1 - progress;
      toVideo.volume = progress;

      if (currentStep >= steps) {
        clearInterval(fadeInterval);
        fromVideo.pause();
        fromVideo.currentTime = 0;
        this.currentVideo = toVideo;
      }
    }, stepDuration);
  }

  // Get video texture by ID
  getTexture(id) {
    return this.textures.get(id);
  }

  // Update all active video textures (call in render loop if needed)
  update() {
    this.textures.forEach((texture, id) => {
      const video = this.videos.get(id);
      if (video && !video.paused && video.readyState >= video.HAVE_CURRENT_DATA) {
        texture.needsUpdate = true;
      }
    });
  }

  // Cleanup
  dispose() {
    this.videos.forEach((video) => {
      video.pause();
      video.src = '';
      video.load();
    });

    this.textures.forEach((texture) => {
      texture.dispose();
    });

    this.videos.clear();
    this.textures.clear();
    this.currentVideo = null;
    
    console.log('🧹 VideoManager disposed');
  }

  // Get playback info
  getVideoInfo(id) {
    const video = this.videos.get(id);
    if (!video) return null;

    return {
      currentTime: video.currentTime,
      duration: video.duration,
      paused: video.paused,
      volume: video.volume,
      readyState: video.readyState
    };
  }

  // Set playback rate (for slow-mo or speed up effects)
  setPlaybackRate(id, rate = 1.0) {
    const video = this.videos.get(id);
    if (video) {
      video.playbackRate = rate;
    }
  }
}

// Singleton instance
export const videoManager = new VideoManager();
export default VideoManager;