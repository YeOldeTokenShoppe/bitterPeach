# Moon Scene Video Texture Implementation

## Overview
I've implemented video texture functionality for the moon scene GLB file. The code will automatically detect and apply video textures to any screen or display objects in the moon model.

## Changes Made

### 1. Modified `/src/components/MoonScene.jsx`

Added video texture support to the `Moon` component:

```javascript
// Added video ref
const videoRef = useRef();

// Enhanced object detection to find screen/display objects
scene.traverse((child) => {
  // Look for screen object
  if (child.name && (child.name.toLowerCase().includes('screen') || 
                     child.name.toLowerCase().includes('display'))) {
    console.log("Found potential screen object:", {
      name: child.name,
      type: child.type,
      isMesh: child.isMesh,
      material: child.material?.name,
      parent: child.parent?.name
    });
  }
});

// Apply video texture to screen objects
const video = document.createElement('video');
video.src = '/vaporwave-sunset.mp4'; // Default video
video.crossOrigin = 'Anonymous';
video.loop = true;
video.muted = true;
video.playsInline = true;
video.autoplay = true;

const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.format = THREE.RGBAFormat;
videoTexture.colorSpace = THREE.SRGBColorSpace;

// Apply to screen objects
if (child.isMesh && child.name && 
    (child.name.toLowerCase().includes('screen') || 
     child.name.toLowerCase().includes('display') ||
     child.name === 'Object_3' || 
     child.name === 'Plane')) {
  
  const videoMaterial = new THREE.MeshStandardMaterial({
    map: videoTexture,
    emissive: new THREE.Color(0.2, 0.2, 0.2),
    emissiveMap: videoTexture,
    emissiveIntensity: 0.5,
    metalness: 0,
    roughness: 0.5,
    side: THREE.DoubleSide
  });
  
  child.material = videoMaterial;
}
```

## How It Works

1. **Object Detection**: The code traverses the moon GLB model looking for objects with names containing "screen" or "display"
2. **Video Creation**: Creates an HTML5 video element with autoplay, loop, and muted settings
3. **Texture Application**: Creates a VideoTexture from the video and applies it as a material to detected screen objects
4. **Fallback**: If autoplay fails (common in browsers), it will attempt to play on first user click

## Available Videos

The following videos are available in `/public/`:
- `/vaporwave-sunset.mp4` (default)
- `/angel.mp4`
- `/deadAir.mp4`
- `/dos.mp4`
- `/evil.mp4`
- `/greetings.mp4`
- `/headroom.mp4`
- `/hot.mp4`
- `/madonna.mp4`
- `/mario.mp4`
- `/nos2.mp4`
- `/nosEnters.mp4`
- `/orientation.mp4`
- `/ufo.mp4`
- `/wildRide.mp4`
- `/1.mp4` through `/5.mp4`

## Customization

To change the video:
1. Edit line 186 in `MoonScene.jsx`: `video.src = '/your-video.mp4';`
2. Ensure your video is in the `/public/` folder

To adjust the screen material properties:
- `emissiveIntensity`: Controls how bright the screen glows (0-1)
- `metalness`: Controls reflectivity (0-1)
- `roughness`: Controls surface smoothness (0-1)

## Testing

1. Run the development server
2. Navigate to `/moon-scene`
3. Check the browser console for messages about detected screen objects
4. The video should automatically play on any screen/display objects

## Troubleshooting

- **Video not playing**: Most browsers require user interaction. Click anywhere on the page to start playback
- **Screen not found**: Check console logs to see what objects are in your GLB file
- **Black screen**: Ensure video path is correct and video file exists in `/public/`

## Future Enhancements

1. **Multiple Screens**: Support different videos on different screens
2. **Video Controls**: Add play/pause functionality via object interaction
3. **Dynamic Content**: Load videos from Firebase or external URLs
4. **Performance**: Add LOD (Level of Detail) for mobile devices