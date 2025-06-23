// Theatre.js setup for vanilla Three.js (without React Three Fiber)
import { getProject } from '@theatre/core';

let studio = null;

export const setupTheatreForVanillaThree = async () => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  try {
    // Import studio dynamically
    const studioModule = await import('@theatre/studio');
    studio = studioModule.default;
    
    // Initialize studio without the r3f extension
    // The r3f extension requires React Three Fiber components
    studio.initialize();
    
    console.log('Theatre.js Studio initialized for vanilla Three.js');
    console.log('Note: The visual scene editor requires React Three Fiber.');
    console.log('You can still use the timeline and property panels.');
    
    // Make studio globally available
    window.theatreStudio = studio;
    
    return studio;
  } catch (error) {
    console.error('Failed to setup Theatre.js:', error);
    return null;
  }
};

// Helper to create animatable properties for vanilla Three.js
export const createTheatreObject = (projectName, sheetName, objectName, initialProps) => {
  const project = getProject(projectName);
  const sheet = project.sheet(sheetName);
  const obj = sheet.object(objectName, initialProps);
  
  return { project, sheet, obj };
};

// Helper to animate Three.js objects with Theatre.js
export const animateWithTheatre = (theatreObj, threeObj, propertyMap = {}) => {
  const unsubscribe = theatreObj.onValuesChange((values) => {
    Object.entries(values).forEach(([key, value]) => {
      const mapping = propertyMap[key] || key;
      
      if (typeof mapping === 'function') {
        mapping(threeObj, value);
      } else if (typeof mapping === 'string') {
        const parts = mapping.split('.');
        let target = threeObj;
        
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]];
        }
        
        const prop = parts[parts.length - 1];
        if (target[prop] !== undefined) {
          if (typeof value === 'object' && 'x' in value) {
            target[prop].set(value.x, value.y, value.z);
          } else {
            target[prop] = value;
          }
        }
      }
    });
  });
  
  return unsubscribe;
};