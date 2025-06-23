// Theatre.js debugging utilities

export const checkTheatreStudio = () => {
  console.log('=== Theatre.js Debug Info ===');
  
  // Check if studio exists
  if (window.__theatreStudio) {
    console.log('✓ Studio exists:', window.__theatreStudio);
    console.log('UI methods:', Object.keys(window.__theatreStudio.ui));
    console.log('Is hidden:', window.__theatreStudio.ui.isHidden);
  } else {
    console.log('✗ Studio not found on window');
  }
  
  // Check for Theatre.js DOM elements
  const selectors = [
    '[data-theatre]',
    '[data-theatre-studio]',
    '.theatre-studio',
    '#theatre-studio-root',
    '#theatrejs-studio-root',
    '[class*="theatre"]',
    '[id*="theatre"]',
    'iframe[src*="theatre"]'
  ];
  
  console.log('Searching for Theatre.js DOM elements...');
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`Found ${elements.length} elements with selector "${selector}":`, elements);
    }
  });
  
  // Check all iframes
  const iframes = document.querySelectorAll('iframe');
  console.log(`Found ${iframes.length} iframes:`, iframes);
  
  // Check shadow roots
  const allElements = document.querySelectorAll('*');
  const shadowRoots = [];
  allElements.forEach(el => {
    if (el.shadowRoot) {
      shadowRoots.push({ element: el, shadowRoot: el.shadowRoot });
    }
  });
  if (shadowRoots.length > 0) {
    console.log('Found shadow roots:', shadowRoots);
  }
  
  console.log('=== End Theatre.js Debug ===');
};

// Add to window for easy console access
if (typeof window !== 'undefined') {
  window.checkTheatreStudio = checkTheatreStudio;
}