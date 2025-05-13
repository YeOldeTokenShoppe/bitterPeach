"use client";

import { useState, useEffect } from 'react';

/**
 * Custom hook that returns true if the current viewport matches the provided media query
 * @param {string} query - CSS media query string (e.g., '(min-width: 768px)')
 * @returns {boolean} - True if the media query matches
 */
function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    // Create media query list
    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);
    
    // Define callback for changes
    const listener = (event) => {
      setMatches(event.matches);
    };
    
    // Add listener
    media.addEventListener('change', listener);
    
    // Cleanup
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);
  
  return matches;
}

export default useMediaQuery; 