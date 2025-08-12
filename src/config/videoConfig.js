// Video configuration for Cathedral walls
// You can use local files or external URLs (ensure CORS is properly configured)

export const VIDEO_CONFIG = {
  // Example with external URLs (these are placeholder URLs - replace with actual video URLs)
  abstract1: {
    url: 'https://cdn.pixabay.com/vimeo/328940142/abstract-26112.mp4?width=640&hash=7f3e2c8d9a',
    options: { loop: true, quality: 'medium', preload: 'auto' }
  },
  
  // Example with local files (place videos in public/videos/)
  local1: {
    url: '/videos/your-video.mp4',
    options: { loop: true, quality: 'high' }
  },
  
  // Cyberpunk themed
  cyber1: {
    url: 'https://cdn.pixabay.com/vimeo/514160309/cyberpunk-66718.mp4?width=640&hash=abc123',
    options: { loop: true, quality: 'high' }
  },
  
  // 80s retro themed
  retro1: {
    url: '/videos/80s-grid.mp4',
    options: { loop: true, quality: 'medium' }
  },
  
  // Particle effects
  particles1: {
    url: 'https://cdn.pixabay.com/vimeo/342005805/particles-30917.mp4?width=640&hash=xyz789',
    options: { loop: true, quality: 'medium' }
  }
};

// Map specific tracks to videos (optional)
// If a track isn't mapped, it will cycle through available videos
export const TRACK_VIDEO_MAP = {
  0: 'abstract1',   // First track
  1: 'cyber1',      // Second track
  2: 'particles1',  // Third track
  3: 'retro1',      // Fourth track
  // Add more mappings as needed
};

// Alternative: Use a function to dynamically select videos
export const getVideoForTrack = (trackIndex, is80sMode) => {
  // Force retro video in 80s mode
  if (is80sMode) {
    return 'retro1';
  }
  
  // Otherwise use the mapping or cycle through videos
  const videoIds = Object.keys(VIDEO_CONFIG);
  return TRACK_VIDEO_MAP[trackIndex] || videoIds[trackIndex % videoIds.length];
};

// Sample free video URLs you can test with (from Pexels)
export const SAMPLE_VIDEO_URLS = {
  abstract: 'https://player.vimeo.com/external/328940142.sd.mp4?s=2ba4e7e323c8b34a43c7c37e7a0a7001c8a3e7b2&profile_id=164&oauth2_token_id=57447761',
  neon: 'https://player.vimeo.com/external/434045526.sd.mp4?s=c27eeaa69a27dbc4ff3b87d38c0a8ae98a79b423&profile_id=164&oauth2_token_id=57447761',
  particles: 'https://player.vimeo.com/external/342005805.sd.mp4?s=5e8b8a9a5a8d88c4ad0c5f0e6bca5c97fcba02a2&profile_id=164&oauth2_token_id=57447761'
};

// Note: When using external URLs, ensure:
// 1. The video server supports CORS
// 2. Videos are optimized for web (compressed, reasonable file size)
// 3. Consider hosting videos on a CDN for better performance
// 4. Test on different devices and network conditions