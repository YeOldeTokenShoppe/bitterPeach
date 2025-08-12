import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { videoManager } from '../utilities/VideoManager';

// Video configuration - supports MP4, WebM, OGG, and MOV files
const VIDEO_CONFIG = {
  // === NORMAL MODE VIDEOS ===
  // Modern/abstract videos for regular music
  abstract1: {
    url: '/videos/83.mov', 
    options: { loop: true, quality: 'medium' }
  },
  

  modern1: {
    url: '/videos/dino.mov',
    options: { loop: true, quality: 'medium' }
  },
  particles1: {
    url: '/videos/astronaut.mov',
    options: { loop: true, quality: 'high' }
  },
  
  // === 80s MODE VIDEOS ===

  retro1: {
    url: '/videos/car.mov',
    options: { loop: true, quality: 'medium' }
  },
  // retro2: {
  //   url: '/videos/neon-city.mp4',
  //   options: { loop: true, quality: 'high' }
  // },
  // retro3: {
  //   url: '/videos/vhs-static.mp4',
  //   options: { loop: true, quality: 'medium' }
  // },
  // abstract3: {
  //   url: '/videos/particle-flow.mp4',
  //   options: { loop: true, quality: 'medium' }
  // },
  
  // Music visualizer style videos
  // visualizer1: {
  //   url: '/videos/audio-visualizer.mp4',
  //   options: { loop: true, quality: 'high' }
  // },
  // visualizer2: {
  //   url: '/videos/frequency-bars.mp4',
  //   options: { loop: true, quality: 'high' }
  // },
  
  // Cyberpunk/80s themed videos
  // cyber1: {
  //   url: '/videos/cyberpunk-city.mp4',
  //   options: { loop: true, quality: 'high' }
  // },
  // retro1: {
  //   url: '/videos/80s-grid.mp4',
  //   options: { loop: true, quality: 'medium' }
  // },
  
  // You can also use external URLs (ensure CORS is configured)
  // external1: {
  //   url: 'https://example.com/video.mp4',
  //   options: { loop: true, quality: 'medium' }
  // }
};

// Track-specific video mapping for NORMAL mode
const TRACK_VIDEO_MAP = {
  0: 'abstract1',  // Track 0 - plays abstract1
  1: 'modern1',  // Track 1 - customize as you add more videos
  2: 'retro1',  // Track 2
  3: 'retro1',  // Track 3
  4: 'abstract1',  // Track 4
  // Add more mappings as needed
};

// Track-specific video mapping for 80s MODE
const TRACK_VIDEO_MAP_80S = {
  0: 'abstract1',  // Track 0 in 80s mode - can be different video
  1: 'modern1',  // Track 1 in 80s mode
  2: 'particles1',  // Track 2 in 80s mode
  3: 'abstract1',  // Track 3 in 80s mode
  4: 'abstract1',  // Track 4 in 80s mode
  // Map to retro/synthwave videos when you add them
};

// === AUTO-SWITCH CONFIGURATION ===
const AUTO_SWITCH_CONFIG = {
  enabled: false,        // Set to true to enable auto-switching
  interval: 5000,       // Switch every 5 seconds (5000ms)
  random: false,        // true = random order, false = sequential
  fadeTransition: true, // Use crossfade when switching
  
  // Different intervals for different modes (optional)
  intervalNormal: 5000,  // 5 seconds for normal mode
  interval80s: 3000,     // 3 seconds for 80s mode (faster cuts)
};

function VideoWallEffects({ isPlaying, currentTrackIndex = 0, is80sMode = false }) {
  const { scene } = useThree();
  const videoWallsRef = useRef([]);
  const originalMaterialsRef = useRef(new Map());
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(false); // Enable auto-switching
  const autoSwitchIntervalRef = useRef(null);

  // Load all videos on mount
  useEffect(() => {
    console.log('📹 Loading video assets...');
    console.log('Video config:', VIDEO_CONFIG);
    
    // Load all configured videos
    const textures = videoManager.loadVideos(VIDEO_CONFIG);
    console.log('Loaded textures:', textures);
    
    // Check if any videos loaded successfully
    const loadedCount = Object.keys(textures).length;
    if (loadedCount > 0) {
      console.log(`✅ Loaded ${loadedCount} videos`);
      setVideosLoaded(true);
    } else {
      console.warn('⚠️ No videos loaded. Please check video URLs and add video files to public/videos/');
      console.warn('Expected video path: /videos/83.mov');
    }

    // Cleanup on unmount
    return () => {
      videoManager.dispose();
    };
  }, []);

  // Find and setup video walls in the scene
  useEffect(() => {
    if (!scene || !videosLoaded) return;

    const setupTimeout = setTimeout(() => {
      console.log('🔍 Searching for video walls in scene...');
      
      const videoWalls = [];
      // These are the actual wall names in your Cathedral model
      const videoWallNames = [
        'pPlane3_Walls_0_1',
        'pPlane3_Walls_0_2',
        'pPlane_Walls3_0.001',
        // Fallback names in case model changes
        'VideoWall', 'VideoWall2', 'VideoWall3', 'VideoWall4',
        'ShaderWall', 'ShaderWall2', 'ShaderWall3', 'ShaderWall4'
      ];

      scene.traverse((child) => {
        // Log all mesh names to help debug
        if (child.isMesh && child.name) {
          console.log(`Mesh found: ${child.name}`);
        }
        
        if (child.isMesh && videoWallNames.includes(child.name)) {
          console.log(`✅ Found video wall: ${child.name}`);
          
          // Store original material
          originalMaterialsRef.current.set(child, child.material);
          
          // Mark as video wall
          child.userData.isVideoWall = true;
          videoWalls.push(child);
        }
      });

      videoWallsRef.current = videoWalls;
      console.log(`✅ Setup ${videoWalls.length} video walls`);
      if (videoWalls.length === 0) {
        console.warn('⚠️ No video walls found! Looking for:', videoWallNames);
      }
    }, 1000);

    return () => clearTimeout(setupTimeout);
  }, [scene, videosLoaded]);

  // Handle video switching based on track and mode
  useEffect(() => {
    if (!videosLoaded || !isPlaying) return;

    // Choose the appropriate mapping based on mode
    const trackMap = is80sMode ? TRACK_VIDEO_MAP_80S : TRACK_VIDEO_MAP;
    
    // Get video for current track from the appropriate mapping
    let videoId = trackMap[currentTrackIndex];
    
    // Fallback to cycling through available videos if no specific mapping
    if (!videoId || !VIDEO_CONFIG[videoId]) {
      const videoIds = Object.keys(VIDEO_CONFIG);
      videoId = videoIds[currentTrackIndex % videoIds.length];
      console.warn(`No video mapped for track ${currentTrackIndex} in ${is80sMode ? '80s' : 'normal'} mode, using fallback: ${videoId}`);
    }

    console.log(`🎬 Switching to video: ${videoId} for track ${currentTrackIndex}`);

    // Switch videos with crossfade if there was a previous video
    if (currentVideoId && currentVideoId !== videoId) {
      videoManager.switchVideo(currentVideoId, videoId, true);
    } else {
      videoManager.play(videoId);
    }

    setCurrentVideoId(videoId);

  }, [currentTrackIndex, is80sMode, isPlaying, videosLoaded]);

  // Auto-switch videos every few seconds (optional feature)
  useEffect(() => {
    if (!AUTO_SWITCH_CONFIG.enabled || !isPlaying || !videosLoaded) return;
    
    const videoIds = Object.keys(VIDEO_CONFIG);
    if (videoIds.length <= 1) return; // No point switching with only 1 video
    
    let currentIndex = videoIds.indexOf(currentVideoId) || 0;
    const interval = is80sMode ? AUTO_SWITCH_CONFIG.interval80s : AUTO_SWITCH_CONFIG.intervalNormal;
    
    console.log(`🔄 Auto-switch enabled: every ${interval/1000}s, ${AUTO_SWITCH_CONFIG.random ? 'random' : 'sequential'} order`);
    
    autoSwitchIntervalRef.current = setInterval(() => {
      let nextVideoId;
      
      if (AUTO_SWITCH_CONFIG.random) {
        // Random selection (avoid repeating current)
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * videoIds.length);
        } while (nextIndex === currentIndex && videoIds.length > 1);
        currentIndex = nextIndex;
        nextVideoId = videoIds[nextIndex];
      } else {
        // Sequential cycling
        currentIndex = (currentIndex + 1) % videoIds.length;
        nextVideoId = videoIds[currentIndex];
      }
      
      console.log(`⏰ Auto-switching: ${currentVideoId} → ${nextVideoId}`);
      
      // Use crossfade if enabled
      if (currentVideoId && currentVideoId !== nextVideoId) {
        videoManager.switchVideo(currentVideoId, nextVideoId, AUTO_SWITCH_CONFIG.fadeTransition);
      }
      
      setCurrentVideoId(nextVideoId);
    }, interval);
    
    return () => {
      if (autoSwitchIntervalRef.current) {
        console.log('🛑 Stopping auto-switch timer');
        clearInterval(autoSwitchIntervalRef.current);
        autoSwitchIntervalRef.current = null;
      }
    };
  }, [isPlaying, videosLoaded, is80sMode]);

  // Apply video textures to walls when playing or track changes
  useEffect(() => {
    if (!videosLoaded || videoWallsRef.current.length === 0) return;

    if (isPlaying && currentVideoId) {
      const videoTexture = videoManager.getTexture(currentVideoId);
      
      if (!videoTexture) {
        console.warn(`Video texture not found for: ${currentVideoId}`);
        return;
      }

      console.log(`🎨 Applying video ${currentVideoId} to ${videoWallsRef.current.length} walls`);

      // Apply video texture to each wall
      videoWallsRef.current.forEach((wall, index) => {
        // Clone texture for effects
        const tiledTexture = videoTexture.clone();
        
        // === EFFECT OPTIONS (Performance cost in parentheses) ===
        
        // 1. TILING (Very Low Cost - just UV math)
        // tiledTexture.repeat.set(2, 2); // 2x2 tile grid
        // tiledTexture.repeat.set(3, 1); // 3 tiles horizontally
        // tiledTexture.repeat.set(4, 4); // 4x4 grid - kaleidoscope effect
        
        // 2. OFFSET ANIMATION (Very Low Cost)
        // Animate texture position for scrolling effect
        // tiledTexture.offset.x = Math.sin(Date.now() * 0.001) * 0.5;
        // tiledTexture.offset.y = Math.cos(Date.now() * 0.001) * 0.5;
        
        // 3. ROTATION (Very Low Cost)
        // tiledTexture.rotation = Math.PI / 4; // 45 degree rotation
        // tiledTexture.center.set(0.5, 0.5); // Rotate around center
        
        // 4. MIRROR EFFECT (Low Cost)
        // tiledTexture.wrapS = THREE.MirroredRepeatWrapping;
        // tiledTexture.wrapT = THREE.MirroredRepeatWrapping;
        // tiledTexture.repeat.set(2, 2);
        
        // Apply different effects based on mode
        if (is80sMode) {
          // Retro TV scan lines effect
          tiledTexture.repeat.set(1, 3); // Vertical stretch
          tiledTexture.wrapS = THREE.RepeatWrapping;
          tiledTexture.wrapT = THREE.MirroredRepeatWrapping;
        } else {
          // Modern clean look - no tiling
          tiledTexture.repeat.set(1, 1);
        }
        
        tiledTexture.wrapS = THREE.RepeatWrapping;
        tiledTexture.wrapT = THREE.RepeatWrapping;
        
        // Create new video material with the current video texture
        const videoMaterial = new THREE.MeshBasicMaterial({
          map: tiledTexture,
          side: THREE.DoubleSide,
          toneMapped: false,
          // Add some emissive glow for 80s effect
          emissive: is80sMode ? new THREE.Color(0x440088) : new THREE.Color(0x000000),
          emissiveIntensity: is80sMode ? 0.2 : 0
        });

        // Direct application without fade for track changes
        wall.material = videoMaterial;
        console.log(`✅ Applied video ${currentVideoId} to wall: ${wall.name}`);
      });

      // Start playing the video
      videoManager.play(currentVideoId);

    } else if (!isPlaying) {
      // Restore original materials when not playing
      console.log('🔄 Restoring original wall materials');
      
      videoWallsRef.current.forEach((wall) => {
        const originalMaterial = originalMaterialsRef.current.get(wall);
        if (originalMaterial) {
          wall.material = originalMaterial;
        }
      });

      // Stop all videos
      videoManager.stopAll();
      setCurrentVideoId(null);
    }
  }, [isPlaying, is80sMode, videosLoaded, currentVideoId]); // Now properly tracks currentVideoId state

  // Update video textures in render loop
  useFrame(() => {
    if (isPlaying && videosLoaded) {
      videoManager.update();
    }
  });

  return null;
}

// YouTube Embed Component (optional - for iframe-based YouTube videos)
// export function YouTubeVideoWall({ position, videoId, width = 16, height = 9 }) {
//   const meshRef = useRef();
  
//   useEffect(() => {
//     // This would require CSS3DRenderer setup in your main scene
//     // For now, this is a placeholder showing how you might integrate YouTube
//     console.log('YouTube integration requires additional setup with CSS3DRenderer');
//   }, [videoId]);

//   return (
//     <mesh ref={meshRef} position={position}>
//       <planeGeometry args={[width, height]} />
//       <meshBasicMaterial color="black" />
//     </mesh>
//   );
// }

export default VideoWallEffects;