// Theatre.js initialization file
// This should be imported at the top level of your app

let studioInitialized = false;

export const initializeTheatreStudio = async () => {
  if (studioInitialized || process.env.NODE_ENV !== 'development') {
    return;
  }
  
  try {
    const { default: studio } = await import('@theatre/studio');
    const { default: extension } = await import('@theatre/r3f/dist/extension');
    
    studio.initialize();
    studio.extend(extension);
    
    // Make studio globally available
    window.theatreStudio = studio;
    
    studioInitialized = true;
    console.log('Theatre.js Studio initialized with r3f extension');
    
    return studio;
  } catch (error) {
    console.error('Failed to initialize Theatre.js studio:', error);
  }
};

// Auto-initialize if this file is imported
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  initializeTheatreStudio();
}