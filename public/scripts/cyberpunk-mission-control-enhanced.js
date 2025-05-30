// Enhanced Cyberpunk Mission Control JavaScript
// This script extends the base functionality with gauge animations and enhanced effects

// Initialize gauges and indicators
document.addEventListener('DOMContentLoaded', function() {
  // Delay initialization slightly to ensure main script runs first
  setTimeout(() => {
    console.log('🚀 Initializing enhanced controls...');
    
    // Start mission timer
    startMissionTimer();
    
    // Initialize gauge animations
    initializeGauges();
    
    // Initialize enhanced toggle controls
    initializeEnhancedToggles();
    
    // Add enhanced button effects
    initializeEnhancedButtons();
    
    // Start random gauge fluctuations
    startGaugeFluctuations();
    
    // Initialize system animations
    initializeSystemAnimations();
    
    // Initialize header effects
    initializeHeaderEffects();
    
    // Override the transcript expand functionality
    overrideTranscriptExpand();
    
    // Fix language selector FIRST (includes toggleTranscript override)
    fixLanguageSelector();
    
    // Wait a bit to ensure base script is loaded, then override functions
    setTimeout(() => {
      // Override language change handler
      overrideLanguageChangeHandler();
      
      // Override the transcript show function to preserve UI
      overrideTranscriptShow();
      
      // Override transcript expand after base script initializes
      overrideTranscriptExpand();
      
      // Re-run fixLanguageSelector to catch any late-loaded elements
      fixLanguageSelector();
    }, 500);
  }, 100);
});

// Mission Timer
function startMissionTimer() {
  let seconds = 0;
  const timerElement = document.getElementById('mission-time');
  
  setInterval(() => {
    seconds++;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    timerElement.textContent = 
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, 1000);
}

// Initialize Gauges
function initializeGauges() {
  // Get all gauge paths by their stroke color
  const gauges = [
    { selector: 'path[stroke="#00e5ff"]', valueSelector: '.gauge-value-mini', baseValue: 78, variance: 10, name: 'oxygen' },
    { selector: 'path[stroke="#76ff03"]', valueSelector: '.gauge-value-mini', baseValue: 90, variance: 5, name: 'power', decreasing: true },
    { selector: 'path[stroke="#ff9500"]', valueSelector: '.gauge-value-mini', baseValue: 25, variance: 15, name: 'temp' },
    { selector: 'path[stroke="#ffff00"]', valueSelector: '.gauge-value-mini', baseValue: 65, variance: 5, name: 'fuel', decreasing: true }
  ];
  
  // Update gauge values periodically
  setInterval(() => {
    gauges.forEach((gauge, index) => {
      const gaugePath = document.querySelectorAll(gauge.selector)[0];
      const valueElement = document.querySelectorAll(gauge.valueSelector)[index];
      
      if (gaugePath && valueElement) {
        let currentValue = parseInt(valueElement.textContent);
        let newValue;
        
        if (gauge.decreasing) {
          // Slowly decrease (power, fuel)
          newValue = Math.max(15, currentValue - Math.random() * 0.5);
        } else {
          // Fluctuate around base value
          newValue = gauge.baseValue + (Math.random() - 0.5) * gauge.variance;
          newValue = Math.max(0, Math.min(100, newValue));
        }
        
        // Calculate stroke-dashoffset (quarter circle = 34.5 total length for radius 11)
        const offset = 34.5 - (34.5 * newValue / 100);
        gaugePath.style.strokeDashoffset = offset;
        valueElement.textContent = `${Math.round(newValue)}%`;
        
        // Special color changes for power gauge
        if (gauge.name === 'power' && newValue < 30) {
          gaugePath.style.stroke = '#ff0040';
        } else if (gauge.name === 'power' && newValue < 50) {
          gaugePath.style.stroke = '#ff9500';
        }
        
        // Temperature color based on value
        if (gauge.name === 'temp') {
          if (newValue > 35) {
            gaugePath.style.stroke = '#ff0040'; // Red for hot
          } else if (newValue < 15) {
            gaugePath.style.stroke = '#00e5ff'; // Cyan for cold
          }
        }
      }
    });
  }, 2000);
}

// Initialize Enhanced Toggle Controls
function initializeEnhancedToggles() {
  // Vertical Toggle (80s Mode)
  const eightiesToggle = document.getElementById('eighties-toggle');
  const videoDisplay = document.querySelector('.video-display');
  const missionControl = document.querySelector('.mission-control');
  
  if (eightiesToggle) {
    eightiesToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      
      // Toggle video display expansion and video source
      const deadAir = document.getElementById('deadAir');
      const offlineDisplay = document.getElementById('offline-display');
      const musicToggle = document.getElementById('music-toggle');
      
      if (this.classList.contains('active')) {
        videoDisplay?.classList.add('video-active');
        missionControl?.classList.add('eighties-active');
        
        // Switch to vaporwave video
        if (deadAir) {
          deadAir.src = '/vaporwave-sunset.mp4';
          deadAir.style.display = 'block';
          deadAir.play().catch(e => console.log('Video play failed:', e));
        }
        if (offlineDisplay) {
          offlineDisplay.style.display = 'none';
        }
        
        // Also activate music toggle when turning on 80s mode
        if (musicToggle && !musicToggle.classList.contains('active')) {
          console.log('🎵 Auto-activating music toggle for 80s mode');
          musicToggle.classList.add('active');
        }
      } else {
        videoDisplay?.classList.remove('video-active');
        missionControl?.classList.remove('eighties-active');
        
        // Switch back to default video
        if (deadAir) {
          deadAir.src = '/1.mp4';
          deadAir.style.display = 'none';
          deadAir.pause();
        }
        if (offlineDisplay) {
          offlineDisplay.style.display = 'flex';
        }
      }
      
      // Trigger parent toggle function
      if (window.parent) {
        window.parent.postMessage({ type: 'EIGHTIES_MODE_CHANGE' }, '*');
      }
    });
  }
  
  // Vertical Toggle (Music)
  const musicToggle = document.getElementById('music-toggle');
  
  if (musicToggle) {
    musicToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      
      // Trigger parent toggle function
      if (window.parent) {
        window.parent.postMessage({ 
          type: 'MUSIC_TOGGLE', 
          enabled: this.classList.contains('active')
        }, '*');
      }
    });
  }
  
  // Vertical Toggle (Constellation)
  const constellationToggle = document.getElementById('constellation-toggle');
  
  if (constellationToggle) {
    constellationToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      
      // Trigger parent toggle function
      if (window.parent) {
        window.parent.postMessage({ type: 'CONSTELLATION_TOGGLE' }, '*');
      }
    });
  }
}

// Signal Strength Animation
function animateSignalStrength() {
  const signalBars = document.querySelectorAll('.signal-bars-mini .signal-bar');
  let strength = 3; // Start with 3 bars
  
  setInterval(() => {
    // Randomly fluctuate signal strength
    strength = Math.max(1, Math.min(5, strength + Math.floor(Math.random() * 3) - 1));
    
    signalBars.forEach((bar, index) => {
      if (index < strength) {
        bar.classList.add('active');
      } else {
        bar.classList.remove('active');
      }
    });
  }, 3000);
}

// Temperature Fluctuation
function animateTemperature() {
  const tempValue = document.querySelector('.temp-value-mini');
  
  if (tempValue) {
    setInterval(() => {
      const variation = Math.random() * 15; // 0-15 variation
      const temp = -273 + Math.round(variation);
      tempValue.textContent = `${temp}°C`;
      
      // Change color based on temperature
      if (variation > 10) {
        tempValue.style.color = '#ff9500';
      } else {
        tempValue.style.color = 'var(--accent-cyan)';
      }
    }, 4000);
  }
}

// Enhanced Button Effects
function initializeEnhancedButtons() {
  const buttons = document.querySelectorAll('.control-button.enhanced');
  
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      // Add ripple effect
      const ripple = document.createElement('div');
      ripple.className = 'button-ripple';
      ripple.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        background: radial-gradient(circle, rgba(0, 255, 255, 0.5), transparent);
        transform: scale(0);
        animation: ripple-expand 0.6s ease-out;
        pointer-events: none;
      `;
      button.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
}

// Gauge Fluctuations
function startGaugeFluctuations() {
  animateSignalStrength();
  animateTemperature();
  
  // Fuel gauge animation (now mini)
  const fuelFill = document.querySelector('.fuel-gauge-mini .fuel-fill');
  let fuelLevel = 65;
  
  if (fuelFill) {
    setInterval(() => {
      fuelLevel = Math.max(15, fuelLevel - 0.1);
      fuelFill.style.width = `${fuelLevel}%`;
      
      // Change fuel color based on level
      if (fuelLevel < 20) {
        fuelFill.style.background = 'linear-gradient(90deg, #ff0040, #ff9500)';
      } else if (fuelLevel < 40) {
        fuelFill.style.background = 'linear-gradient(90deg, #ff9500, var(--accent-cyan))';
      }
    }, 1000);
  }
}

// System Animations
function initializeSystemAnimations() {
  // Add glitch effect periodically
  const glitchOverlay = document.getElementById('glitch-overlay');
  setInterval(() => {
    if (Math.random() < 0.05) { // 5% chance every check
      glitchOverlay.style.opacity = '1';
      setTimeout(() => {
        glitchOverlay.style.opacity = '0';
      }, 200);
    }
  }, 5000);
  
  // Animate data values
  const dataValues = document.querySelectorAll('.data-value');
  setInterval(() => {
    // Update altitude
    const altitudeEl = dataValues[0];
    if (altitudeEl && altitudeEl.textContent.includes('km')) {
      const currentAlt = parseInt(altitudeEl.textContent.replace(/,/g, ''));
      const newAlt = currentAlt + Math.floor(Math.random() * 100) - 50;
      altitudeEl.textContent = `${newAlt.toLocaleString()} km`;
    }
    
    // Update velocity
    const velocityEl = dataValues[1];
    if (velocityEl && velocityEl.textContent.includes('km/s')) {
      const currentVel = parseFloat(velocityEl.textContent);
      const newVel = (currentVel + (Math.random() * 0.01) - 0.005).toFixed(3);
      velocityEl.textContent = `${newVel} km/s`;
    }
  }, 3000);
}

// Add ripple animation CSS and transcript visibility rules
const style = document.createElement('style');
style.textContent = `
  @keyframes ripple-expand {
    to {
      transform: scale(2);
      opacity: 0;
    }
  }
  
  /* Ensure transcript header is always visible when container is shown */
  .transcript-container[style*="display: block"] .transcript-header {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  .transcript-container[style*="display: block"] .transcript-header .language-selector {
    display: flex !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
  
  .transcript-container[style*="display: block"] .transcript-header #transcript-expand-icon {
    display: inline-block !important;
    visibility: visible !important;
    opacity: 1 !important;
  }
`;
document.head.appendChild(style);

// Handle parent messages for enhanced features
window.addEventListener('message', function(event) {
  if (event.data.type === 'SYSTEM_STATUS_UPDATE') {
    // Update system status based on parent commands
    updateSystemStatus(event.data.status);
  }
  
  // Handle video activation states
  if (event.data.type === 'VIDEO_STATE_CHANGE') {
    const videoDisplay = document.querySelector('.video-display');
    if (event.data.active) {
      videoDisplay?.classList.add('video-active');
    } else {
      videoDisplay?.classList.remove('video-active');
    }
  }
  
  // Handle eighties mode from parent
  if (event.data.type === 'EIGHTIES_MODE_STATE') {
    const missionControl = document.querySelector('.mission-control');
    const videoDisplay = document.querySelector('.video-display');
    const eightiesToggle = document.getElementById('eighties-toggle');
    const deadAir = document.getElementById('deadAir');
    const offlineDisplay = document.getElementById('offline-display');
    
    if (event.data.active) {
      missionControl?.classList.add('eighties-active');
      videoDisplay?.classList.add('video-active');
      eightiesToggle?.classList.add('active');
      
      // Switch to vaporwave video
      if (deadAir) {
        deadAir.src = '/vaporwave-sunset.mp4';
        deadAir.style.display = 'block';
        deadAir.play().catch(e => console.log('Video play failed:', e));
      }
      if (offlineDisplay) {
        offlineDisplay.style.display = 'none';
      }
    } else {
      missionControl?.classList.remove('eighties-active');
      videoDisplay?.classList.remove('video-active');
      eightiesToggle?.classList.remove('active');
      
      // Switch back to default video
      if (deadAir) {
        deadAir.src = '/1.mp4';
        deadAir.style.display = 'none';
        deadAir.pause();
      }
      if (offlineDisplay) {
        offlineDisplay.style.display = 'flex';
      }
    }
  }
  
  // Handle music mode sync from parent
  if (event.data.type === 'SET_MUSIC_MODE') {
    const musicToggle = document.getElementById('music-toggle');
    if (musicToggle) {
      if (event.data.isActive) {
        musicToggle.classList.add('active');
      } else {
        musicToggle.classList.remove('active');
      }
    }
  }
  
  // Handle eighties mode sync from parent
  if (event.data.type === 'SET_EIGHTIES_MODE') {
    const eightiesToggle = document.getElementById('eighties-toggle');
    const missionControl = document.querySelector('.mission-control');
    const videoDisplay = document.querySelector('.video-display');
    const deadAir = document.getElementById('deadAir');
    const offlineDisplay = document.getElementById('offline-display');
    const musicToggle = document.getElementById('music-toggle');
    
    if (eightiesToggle) {
      if (event.data.isActive) {
        eightiesToggle.classList.add('active');
        missionControl?.classList.add('eighties-active');
        videoDisplay?.classList.add('video-active');
        
        // Switch to vaporwave video
        if (deadAir) {
          deadAir.src = '/vaporwave-sunset.mp4';
          deadAir.style.display = 'block';
          deadAir.play().catch(e => console.log('Video play failed:', e));
        }
        if (offlineDisplay) {
          offlineDisplay.style.display = 'none';
        }
        
        // Also activate music toggle when 80s mode is synced from parent
        if (musicToggle && !musicToggle.classList.contains('active')) {
          console.log('🎵 Parent sync: Auto-activating music toggle for 80s mode');
          musicToggle.classList.add('active');
        }
      } else {
        eightiesToggle.classList.remove('active');
        missionControl?.classList.remove('eighties-active');
        videoDisplay?.classList.remove('video-active');
        
        // Switch back to default video
        if (deadAir) {
          deadAir.src = '/1.mp4';
          deadAir.style.display = 'none';
          deadAir.pause();
        }
        if (offlineDisplay) {
          offlineDisplay.style.display = 'flex';
        }
      }
    }
  }
  
  // Handle complete state sync from parent
  if (event.data.type === 'SYNC_STATE') {
    // Sync eighties mode
    const eightiesToggle = document.getElementById('eighties-toggle');
    if (eightiesToggle) {
      if (event.data.isEightiesMode) {
        eightiesToggle.classList.add('active');
      } else {
        eightiesToggle.classList.remove('active');
      }
    }
    
    // Sync music mode
    const musicToggle = document.getElementById('music-toggle');
    if (musicToggle) {
      if (event.data.isMusicEnabled) {
        musicToggle.classList.add('active');
      } else {
        musicToggle.classList.remove('active');
      }
    }
  }
});

function updateSystemStatus(status) {
  // Update various system indicators based on status
  if (status.critical) {
    document.querySelectorAll('.warning-light').forEach(light => {
      light.setAttribute('data-status', 'critical');
    });
  }
}

// Fix language selector to prevent UI disappearing
function fixLanguageSelector() {
  console.log('🔧 Setting up transcript UI fix');
  
  // Override the base script's toggleTranscript function
  const originalToggle = window.toggleTranscript;
  if (originalToggle) {
    window.toggleTranscript = function() {
      console.log('🔄 Enhanced toggleTranscript called');
      
      // Store header visibility before toggle
      const header = document.querySelector('.transcript-header');
      const wasVisible = header && header.style.display !== 'none';
      
      // Call original function
      originalToggle.call(this);
      
      // Restore header visibility if it was visible before
      if (wasVisible && header) {
        // Ensure header and its children stay visible
        header.style.display = 'flex';
        header.style.visibility = 'visible';
        header.style.opacity = '1';
        
        const languageSelector = header.querySelector('.language-selector');
        if (languageSelector) {
          languageSelector.style.display = 'flex';
          languageSelector.style.visibility = 'visible';
          languageSelector.style.opacity = '1';
        }
        
        const expandIcon = header.querySelector('#transcript-expand-icon');
        if (expandIcon) {
          expandIcon.style.display = 'inline-block';
          expandIcon.style.visibility = 'visible';
          expandIcon.style.opacity = '1';
        }
      }
    };
  }
  
  // Also add protection against style clearing
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      // If transcript header style is being cleared, restore it
      if (mutation.target.classList?.contains('transcript-header') && 
          mutation.type === 'attributes' && 
          mutation.attributeName === 'style' &&
          mutation.target.style.cssText === '') {
        
        console.log('🛡️ Preventing header style clear');
        mutation.target.style.display = 'flex';
        mutation.target.style.visibility = 'visible';
        mutation.target.style.opacity = '1';
      }
      
      // If expand icon is being replaced, ensure the new one is visible
      if (mutation.target.classList?.contains('language-selector') && 
          mutation.removedNodes.length > 0 && 
          mutation.addedNodes.length > 0) {
        
        console.log('🔄 Expand icon replaced, ensuring visibility');
        setTimeout(() => {
          const newIcon = document.getElementById('transcript-expand-icon');
          if (newIcon) {
            newIcon.style.display = 'inline-block';
            newIcon.style.visibility = 'visible';
            newIcon.style.opacity = '1';
          }
        }, 10);
      }
    });
  });
  
  // Observe the transcript container
  const transcriptContainer = document.querySelector('.transcript-container');
  if (transcriptContainer) {
    observer.observe(transcriptContainer, { 
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
}

// Override transcript expand icon functionality to fix the arrow direction
function overrideTranscriptExpand() {
  // Don't override - just monitor for the icon and fix it when needed
  const checkAndFixExpandIcon = () => {
    const expandIcon = document.getElementById('transcript-expand-icon');
    if (!expandIcon || expandIcon.hasEnhancedHandler) return;
    
    console.log('🔧 Enhancing expand icon functionality');
    
    // Mark that we've enhanced this icon
    expandIcon.hasEnhancedHandler = true;
    
    // Get original onclick handler if it exists
    const originalHandler = expandIcon.onclick;
    
    // Set our enhanced handler
    expandIcon.onclick = function(e) {
      console.log('📝 Expand icon clicked');
      
      // Call original handler first
      if (originalHandler) {
        originalHandler.call(this, e);
      }
      
      // Then ensure UI stays visible
      setTimeout(() => {
        const header = this.closest('.transcript-header');
        const languageSelector = header?.querySelector('.language-selector');
        
        if (header) {
          header.style.removeProperty('display');
          header.style.removeProperty('visibility');
          header.style.removeProperty('opacity');
        }
        
        if (languageSelector) {
          languageSelector.style.removeProperty('display');
          languageSelector.style.removeProperty('visibility');
          languageSelector.style.removeProperty('opacity');
        }
        
        // Ensure this icon stays visible
        this.style.removeProperty('display');
        this.style.removeProperty('visibility');
        this.style.removeProperty('opacity');
      }, 10);
    };
  };
  
  // Check immediately and periodically
  checkAndFixExpandIcon();
  setInterval(checkAndFixExpandIcon, 500);
}

// Override language change handler to preserve UI elements
function overrideLanguageChangeHandler() {
  // Monitor for language select and enhance it
  const checkAndFixLanguageSelect = () => {
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect || languageSelect.hasEnhancedHandler) return;
    
    console.log('🌐 Enhancing language select');
    
    // Mark that we've enhanced this select
    languageSelect.hasEnhancedHandler = true;
    
    // Get original onchange handler if it exists
    const originalHandler = languageSelect.onchange;
    
    // Set our enhanced handler
    languageSelect.onchange = function(e) {
      console.log('🌐 Language changed to:', this.value);
      
      // Call original handler first
      if (originalHandler) {
        originalHandler.call(this, e);
      }
      
      // Then ensure UI stays visible
      setTimeout(() => {
        const header = this.closest('.transcript-header');
        const languageSelector = header?.querySelector('.language-selector');
        const expandIcon = header?.querySelector('#transcript-expand-icon');
        
        if (header) {
          header.style.removeProperty('display');
          header.style.removeProperty('visibility');
          header.style.removeProperty('opacity');
        }
        
        if (languageSelector) {
          languageSelector.style.removeProperty('display');
          languageSelector.style.removeProperty('visibility');
          languageSelector.style.removeProperty('opacity');
        }
        
        if (expandIcon) {
          expandIcon.style.removeProperty('display');
          expandIcon.style.removeProperty('visibility');
          expandIcon.style.removeProperty('opacity');
        }
      }, 50);
    };
  };
  
  // Check immediately and periodically
  checkAndFixLanguageSelect();
  setInterval(checkAndFixLanguageSelect, 500);
}

// Override the showTranscriptForOrientationVideo to preserve UI elements
function overrideTranscriptShow() {
  // Store the original function if it exists
  const originalShow = window.showTranscriptForOrientationVideo;
  
  // Replace with our enhanced version
  window.showTranscriptForOrientationVideo = function() {
    console.log('🎬 Enhanced: Showing transcript for orientation video');
    
    // Call the original function if it exists
    if (originalShow && typeof originalShow === 'function') {
      originalShow.call(this);
    }
    
    // Immediately ensure our UI elements are present and visible
    const ensureTranscriptUI = () => {
      const container = document.querySelector('.transcript-container');
      const header = document.querySelector('.transcript-header');
      const languageSelector = header?.querySelector('.language-selector');
      const expandIcon = document.getElementById('transcript-expand-icon');
      
      // Force container to be visible
      if (container) {
        container.style.display = 'block';
        container.style.visibility = 'visible';
        container.style.opacity = '1';
      }
      
      // Ensure header is visible
      if (header) {
        header.style.display = 'flex';
        header.style.visibility = 'visible';
        header.style.opacity = '1';
        header.style.removeProperty('display'); // Remove any inline display:none
      }
      
      // Ensure language selector is visible
      if (languageSelector) {
        languageSelector.style.display = 'flex';
        languageSelector.style.visibility = 'visible';
        languageSelector.style.opacity = '1';
      }
      
      // Ensure expand icon has correct state and is visible
      if (expandIcon) {
        const content = document.querySelector('.transcript-content');
        expandIcon.textContent = content?.classList.contains('collapsed') ? '▶' : '▼';
        expandIcon.style.display = 'inline-block';
        expandIcon.style.visibility = 'visible';
        expandIcon.style.opacity = '1';
      }
      
      console.log('📄 Transcript UI visibility ensured');
    };
    
    // Run immediately and after a delay
    ensureTranscriptUI();
    setTimeout(ensureTranscriptUI, 100);
    setTimeout(ensureTranscriptUI, 500);
    
    // Also set up a temporary interval to ensure visibility during video
    const ensureInterval = setInterval(ensureTranscriptUI, 1000);
    
    // Stop the interval when video ends
    const orientationVideo = document.getElementById('orientation-video');
    if (orientationVideo) {
      orientationVideo.addEventListener('ended', () => {
        clearInterval(ensureInterval);
      }, { once: true });
    }
  };
}

// Initialize header effects
function initializeHeaderEffects() {
  const letters = document.querySelectorAll('.title-letter, .title-number');
  
  letters.forEach((letter, index) => {
    // Add staggered animation delay
    letter.style.animationDelay = `${index * 0.1}s`;
    
    // Add hover sound effect (optional)
    letter.addEventListener('mouseenter', () => {
      // Create a subtle hover effect
      letter.style.transform = 'translateY(-2px) scale(1.2) rotateZ(5deg)';
      
      // Optional: Add sound effect
      // playHoverSound();
    });
    
    letter.addEventListener('mouseleave', () => {
      letter.style.transform = 'translateY(0) scale(1) rotateZ(0deg)';
    });
    
    // Add click effect
    letter.addEventListener('click', () => {
      letter.style.animation = 'none';
      setTimeout(() => {
        letter.style.animation = '';
      }, 10);
      
      // Create ripple effect
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, currentColor, transparent);
        transform: translate(-50%, -50%) scale(0);
        animation: letter-ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 10;
      `;
      letter.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  });
  
  // Add dynamic glow effect based on mouse position
  const header = document.querySelector('.enhanced-header');
  if (header) {
    header.addEventListener('mousemove', (e) => {
      const rect = header.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      header.style.background = `
        radial-gradient(
          circle at ${x}% ${y}%,
          rgba(103, 232, 249, 0.3) 0%,
          rgba(103, 232, 249, 0.1) 30%,
          rgba(0, 0, 0, 0.9) 60%
        )
      `;
    });
    
    header.addEventListener('mouseleave', () => {
      header.style.background = '';
    });
  }
}

// Export functions for use by main script
window.enhancedControls = {
  updateGauge: function(gaugeName, value) {
    const gauge = document.querySelector(`.${gaugeName}-gauge`);
    if (gauge) {
      const offset = 283 - (283 * value / 100);
      gauge.style.strokeDashoffset = offset;
    }
  },
  
  setWarningLight: function(index, status) {
    const light = document.querySelectorAll('.warning-light')[index];
    if (light) {
      light.setAttribute('data-status', status);
    }
  },
  
  triggerSystemAlert: function() {
    // Flash all warning lights
    document.querySelectorAll('.warning-light').forEach(light => {
      const originalStatus = light.getAttribute('data-status');
      light.setAttribute('data-status', 'critical');
      setTimeout(() => {
        light.setAttribute('data-status', originalStatus);
      }, 2000);
    });
  }
};