import React, { useEffect, useState } from 'react';
import { getProject } from '@theatre/core';

// This component handles Theatre.js initialization separately
export const TheatreStudioProvider = ({ children }) => {
  const [studioReady, setStudioReady] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Dynamically import and initialize studio
      import('@theatre/studio').then((studioModule) => {
        const studio = studioModule.default;
        
        // Initialize studio
        studio.initialize();
        
        // Make it globally accessible
        window.theatreStudio = studio;
        
        console.log('Theatre.js Studio initialized in provider');
        
        // Show the UI immediately
        studio.ui.restore();
        
        setStudioReady(true);
      });
    }
  }, []);

  return children;
};

export default TheatreStudioProvider;