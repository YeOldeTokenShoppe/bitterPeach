// Add message event listener for state sync
window.addEventListener('message', function(event) {
  console.log('Mission control received message:', event.data.type);
  
  if (event.data.type === 'SYNC_STATE') {
    console.log('Syncing constellation state:', event.data.isConstellationsEnabled);
    const constellationToggle = document.querySelector('.constellation-toggle');
    if (constellationToggle) {
      // Remove any existing active class first
      constellationToggle.classList.remove('active');
      
      // Then add it if needed
      if (event.data.isConstellationsEnabled) {
        constellationToggle.classList.add('active');
      }
      console.log('Constellation toggle state synced:', event.data.isConstellationsEnabled);
    } else {
      console.warn('Constellation toggle element not found');
    }
  }
});

// Add event listener for iframe ready message
window.addEventListener('load', function() {
  console.log('Mission control iframe loaded');
  
  // Notify parent that iframe is ready
  window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
  
  // Request initial state from parent
  window.parent.postMessage({ type: 'REQUEST_STATE' }, '*');
});

// Add click handler for constellation toggle
document.addEventListener('DOMContentLoaded', function() {
  const constellationToggle = document.querySelector('.constellation-toggle');
  if (constellationToggle) {
    console.log('Found constellation toggle element');
    
    constellationToggle.addEventListener('click', function() {
      const isActive = this.classList.contains('active');
      console.log('Constellation toggle clicked, current state:', isActive);
      
      // Toggle the active class
      this.classList.toggle('active');
      
      // Get the new state
      const newState = this.classList.contains('active');
      console.log('Constellation toggle new state:', newState);
      
      // Add a small delay before sending the message
      setTimeout(() => {
        // Notify parent of the constellation toggle
        window.parent.postMessage(
          {
            type: "CONSTELLATION_TOGGLE",
            enabled: newState,
          },
          "*"
        );
      }, 50);
    });
  } else {
    console.warn('Constellation toggle element not found on DOMContentLoaded');
  }
}); 