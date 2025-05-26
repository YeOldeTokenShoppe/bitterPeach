// Custom AI Input Handler and Transcript Toggle Functionality
// Extracted from cyberpunk_mission_control_clean.html for better code organization

// Custom AI input handler
function setupCustomAIInput() {
  const input = document.getElementById('custom-ai-input');
  const sendArrow = document.getElementById('custom-ai-send');
  
  if (!input || !sendArrow) return;
  
  function sendMessage() {
    const message = input.value.trim();
    if (!message) return;
    
    console.log("📤 Sending custom message:", message);
    
    // Visual feedback for arrow click
    sendArrow.style.transform = 'translateY(-50%) scale(1.2)';
    sendArrow.style.filter = 'drop-shadow(0 0 15px rgba(0, 255, 65, 1))';
    
    // Try multiple ways to call the AI function
    if (typeof window.vhss_ai_sayPreAI === 'function') {
      window.vhss_ai_sayPreAI(message);
      console.log("✅ Message sent via window.vhss_ai_sayPreAI");
    } else if (typeof vhss_ai_sayPreAI === 'function') {
      vhss_ai_sayPreAI(message);
      console.log("✅ Message sent via global vhss_ai_sayPreAI");
    } else {
      // Fallback: try to find the function in the global scope
      const aiFunc = window['vhss_ai_sayPreAI'];
      if (typeof aiFunc === 'function') {
        aiFunc(message);
        console.log("✅ Message sent via window['vhss_ai_sayPreAI']");
      } else {
        console.log("❌ AI function not available");
        alert("AI function not ready yet. Please wait a moment and try again.");
        return;
      }
    }
    
    input.value = '';
    input.style.borderColor = '#00ff41';
    
    // Reset visual feedback
    setTimeout(() => {
      input.style.borderColor = '#00c8ff';
      sendArrow.style.transform = 'translateY(-50%) scale(1)';
      sendArrow.style.filter = 'drop-shadow(0 0 8px rgba(0, 255, 65, 0.6))';
    }, 1000);
  }
  
  // Handle Enter key
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
  
  // Handle arrow click
  sendArrow.addEventListener('click', sendMessage);
  
  // Hover effects for arrow
  sendArrow.addEventListener('mouseenter', function() {
    this.style.opacity = '1';
    this.style.filter = 'drop-shadow(0 0 12px rgba(0, 255, 65, 0.8))';
  });
  
  sendArrow.addEventListener('mouseleave', function() {
    this.style.opacity = '0.8';
    this.style.filter = 'drop-shadow(0 0 8px rgba(0, 255, 65, 0.6))';
  });
  
  console.log("✅ Custom AI input with arrow setup complete");
}

// Setup transcript expand/collapse functionality
function setupTranscriptToggle() {
  const expandIcon = document.getElementById('transcript-expand-icon');
  const transcriptContent = document.getElementById('transcript-content');
  const transcriptContainer = document.querySelector('.transcript-container');
  
  if (!expandIcon || !transcriptContent || !transcriptContainer) return;
  
  let isExpanded = true; // Start expanded when visible
  
  expandIcon.addEventListener('click', function() {
    isExpanded = !isExpanded;
    
    if (isExpanded) {
      transcriptContainer.classList.remove('collapsed');
      transcriptContent.classList.remove('collapsed');
      expandIcon.textContent = '▼';
      expandIcon.style.transform = 'rotate(0deg)';
      expandIcon.classList.remove('collapsed');
    } else {
      transcriptContainer.classList.add('collapsed');
      transcriptContent.classList.add('collapsed');
      expandIcon.textContent = '▶';
      expandIcon.style.transform = 'rotate(-90deg)';
      expandIcon.classList.add('collapsed');
    }
    
    console.log(`📄 Transcript ${isExpanded ? 'expanded' : 'collapsed'}`);
  });
  
  // Add hover effect
  expandIcon.style.cursor = 'pointer';
  expandIcon.style.transition = 'transform 0.3s ease, color 0.3s ease';
  
  expandIcon.addEventListener('mouseenter', function() {
    this.style.color = '#00ff41';
  });
  
  expandIcon.addEventListener('mouseleave', function() {
    this.style.color = '';
  });
  
  console.log('✅ Transcript toggle functionality setup complete');
}

// Initialize functions when DOM is ready
function initCustomAIInterface() {
  // Setup the custom input after a delay to ensure SitePal is loaded
  setTimeout(setupCustomAIInput, 2000);
  
  // Setup transcript toggle when DOM is ready
  setupTranscriptToggle();
  
  console.log('✅ Custom AI interface initialization complete');
}

// Auto-initialize if DOM is already loaded, otherwise wait for it
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCustomAIInterface);
} else {
  initCustomAIInterface();
}

// Make functions available globally for external access
window.setupCustomAIInput = setupCustomAIInput;
window.setupTranscriptToggle = setupTranscriptToggle;
window.initCustomAIInterface = initCustomAIInterface;