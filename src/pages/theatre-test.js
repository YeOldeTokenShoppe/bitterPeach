import React, { useEffect } from 'react';
import { getProject } from '@theatre/core';

const TheatreTest = () => {
  useEffect(() => {
    const initTheatre = async () => {
      try {
        // Create a simple project
        const project = getProject('TestProject');
        const sheet = project.sheet('TestSheet');
        
        // Create a simple object
        const obj = sheet.object('TestObject', {
          x: 0,
          y: 0,
        });
        
        console.log('Theatre.js core initialized:', { project, sheet, obj });
        
        // Try to load studio
        if (process.env.NODE_ENV === 'development') {
          const { default: studio } = await import('@theatre/studio');
          studio.initialize();
          console.log('Theatre.js studio initialized in test page');
          
          // Make it available globally
          window.testStudio = studio;
          
          // Try to show UI after a delay
          setTimeout(() => {
            studio.ui.restore();
            console.log('Studio UI restored in test page');
          }, 1000);
        }
      } catch (error) {
        console.error('Theatre.js test error:', error);
      }
    };
    
    initTheatre();
  }, []);
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>Theatre.js Test Page</h1>
      <p>Check the console for initialization logs.</p>
      <p>If Theatre.js studio loads here, we know it works in your environment.</p>
      <button 
        onClick={() => {
          if (window.testStudio) {
            window.testStudio.ui.restore();
            console.log('Manually restored studio UI');
          }
        }}
        style={{
          padding: '10px 20px',
          fontSize: '16px',
          backgroundColor: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer'
        }}
      >
        Show Theatre.js Studio
      </button>
    </div>
  );
};

export default TheatreTest;