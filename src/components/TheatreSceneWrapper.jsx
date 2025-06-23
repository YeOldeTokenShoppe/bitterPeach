import React, { useEffect, useRef } from 'react';
import { SheetProvider } from '@theatre/r3f';
import { getProject } from '@theatre/core';

// This component wraps your vanilla Three.js scene to make it work with Theatre.js Studio
export const TheatreSceneWrapper = ({ children, projectName = 'PalmTreeDrive', sheetName = 'CameraFlyIn' }) => {
  const projectRef = useRef(null);
  const sheetRef = useRef(null);

  useEffect(() => {
    // Create or get the project
    projectRef.current = getProject(projectName);
    sheetRef.current = projectRef.current.sheet(sheetName);
  }, [projectName, sheetName]);

  // For vanilla Three.js, we can't use SheetProvider directly
  // Instead, we'll just render children and ensure the project exists
  return (
    <>
      {children}
    </>
  );
};

// Helper to manually register Three.js objects with Theatre.js
export const registerThreeObject = (sheet, key, object, props = {}) => {
  const obj = sheet.object(key, props);
  
  // Subscribe to changes
  const unsubscribe = obj.onValuesChange((values) => {
    // Apply values to Three.js object
    Object.entries(values).forEach(([prop, value]) => {
      if (object[prop] !== undefined) {
        if (typeof value === 'object' && 'x' in value) {
          // Handle Vector3-like objects
          object[prop].set(value.x, value.y, value.z);
        } else {
          object[prop] = value;
        }
      }
    });
  });
  
  return { obj, unsubscribe };
};