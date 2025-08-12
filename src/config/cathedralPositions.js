// Cathedral position configuration
// Use the PositionFinder tool (Shift+Click) to find these positions in the scene

export const CATHEDRAL_POSITIONS = {
  // Model positioning - adjust if cathedral needs to be raised/lowered
  model: {
    position: [0, 0, 0],  // Try adjusting Y value if floor doesn't align (e.g., [0, -1, 0])
    rotation: [0, 0, 0],
    scale: 1
  },
  
  // Grid and ground
  grid: {
    size: 300,
    divisions: 50,
    position: [0, 0, 0], // Grid at ground level
    color: 0x00ff41
  },
  
  // Spotlight positions for nightclub effect
  spotlights: [
    { 
      position: [14, 28, 15],     // Front right - UPDATE WITH ACTUAL POSITION
      color: 0xff00ff,
      target: [0, 0, 0]
    },
    { 
      position: [-14, 28, 15],    // Front left - UPDATE WITH ACTUAL POSITION
      color: 0x00ffff,
      target: [0, 0, 0]
    },
    { 
      position: [21, 28, -13],    // Back right - UPDATE WITH ACTUAL POSITION
      color: 0xff0080,
      target: [0, 0, 0]
    },
    { 
      position: [-21, 28, -13],   // Back left - UPDATE WITH ACTUAL POSITION
      color: 0x00ff80,
      target: [0, 0, 0]
    }
  ],
  
  // Annotation positions - adjusted to be visible near cathedral
  annotations: [
    {
      id: 'altar',
      position: [0, 5, -10],  // Front center, raised
      text: "Sacred Digital Altar\nWhere prayers become code",
      customCamera: {
        position: [5, 8, -5],   
        lookAt: [0, 5, -10]      
      }
    },
    {
      id: 'right_side',
      position: [10, 5, 0],      // Right side
      text: "Click any candle to examine"
    },
    {
      id: 'left_side', 
      position: [-10, 5, 0],    // Left side
      text: "Click any candle to examine"
    },
    {
      id: 'upper_area',
      position: [0, 15, 0],      // Above cathedral
      text: "Holographic Heavens\nCloud computing the divine",
      customCamera: {
        position: [0, 20, 10],    
        lookAt: [0, 15, 0],      
        distance: 15
      }
    }
  ],
  
  // Camera positions
  camera: {
    initial: {
      position: [15, 10, 25],  // View from front-right, elevated
      target: [0, 5, 0],         // Look at center of cathedral
      fov: 45
    },
    cinematic: {
      keyframes: [
        {
          time: 0,
          position: [-7.7, 17.5, 3.5],   // UPDATE: Close to statue
          lookAt: [-8, 17.5, 4],         // UPDATE: Looking at statue
          fov: 45
        },
        {
          time: 1,
          position: [16, 6, -36],        // UPDATE: Pulled back view
          lookAt: [-1, 14.5, 1],         // UPDATE: Still looking at statue
          fov: 55
        }
      ]
    }
  }
};

// Instructions for updating positions:
// 1. Run the app in development mode
// 2. Use Shift+Click to mark positions in the scene
// 3. Check the console for the exact coordinates
// 4. Update the positions in this file
// 5. The annotations, spotlights, and camera will use these positions

export default CATHEDRAL_POSITIONS;