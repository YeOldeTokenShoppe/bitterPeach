# Video Assets for Cathedral Scene

This directory should contain video files that will be displayed on the cathedral walls when music is playing.

## Supported Formats
- MP4 (recommended)
- WebM
- OGG

## Recommended Video Specifications
- Resolution: 1280x720 (medium quality) or 1920x1080 (high quality)
- Frame rate: 30fps
- Codec: H.264 for MP4
- File size: Keep under 50MB for optimal loading

## Required Video Files

Add your video files to this directory with these names:

### Abstract/Artistic Videos
- `abstract-waves.mp4` - Abstract wave patterns
- `neon-tunnel.mp4` - Neon tunnel visualization
- `particle-flow.mp4` - Particle flow animation

### Music Visualizer Videos
- `audio-visualizer.mp4` - Audio spectrum visualizer
- `frequency-bars.mp4` - Frequency bar animation

### Cyberpunk/80s Themed Videos
- `cyberpunk-city.mp4` - Cyberpunk cityscape
- `80s-grid.mp4` - Retro 80s grid animation

## Free Video Resources

You can download free videos from:
- [Pexels Videos](https://www.pexels.com/videos/)
- [Pixabay Videos](https://pixabay.com/videos/)
- [Videvo](https://www.videvo.net/)
- [Mixkit](https://mixkit.co/)

Search for terms like:
- "abstract loop"
- "neon visualization"
- "particle animation"
- "cyberpunk background"
- "80s retro grid"
- "audio visualizer"

## YouTube Integration (Alternative)

To use YouTube videos instead, modify the VideoWallEffects.jsx to use iframe embedding:

```javascript
// In VIDEO_CONFIG, use YouTube URLs:
youtube1: {
  url: 'https://www.youtube.com/embed/VIDEO_ID',
  options: { type: 'youtube' }
}
```

Note: YouTube embedding requires additional setup and may have performance implications.

## Customizing Video Mapping

Edit `/src/components/VideoWallEffects.jsx` to:
1. Update `VIDEO_CONFIG` with your video URLs
2. Modify `TRACK_VIDEO_MAP` to assign specific videos to music tracks
3. Adjust quality settings in the options

## Testing

1. Add at least one video file to this directory
2. Update the VIDEO_CONFIG in VideoWallEffects.jsx with the correct filename
3. Play music in the cathedral scene to see the videos on the walls