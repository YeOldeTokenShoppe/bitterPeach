// SitePal Integration and Management
// Handles SitePal character initialization, connection, and disconnection

function initSitePal() {
  console.log("Starting SitePal initialization...");
  
  // Check for and stop any lingering orientation video first
  const orientationVideo = document.getElementById("orientation-video");
  if (orientationVideo) {
    console.log("🛑 Found orientation video during SitePal init - stopping it properly");
    // Force stop the video and its audio
    orientationVideo.pause();
    orientationVideo.currentTime = 0;
    orientationVideo.src = "";  // Empty source
    orientationVideo.removeAttribute("src");
    orientationVideo.load();  // Force browser to release resources
    orientationVideo.remove();
  }

  const container = document.getElementById("sitepal-container");
  // Using global deadAir and orientationVideoPlayed

  if (container) {
    container.innerHTML = `
      <div id="vhss_aiPlayer"></div>
      <div id="vhss-aiplayer-aiformlogs"></div>
      <div id="vhss-aiplayer-aiformtranscript"></div>
      <div id="vhss-aiplayer-aiformstatus"></div>
    `;
    container.style.display = "block";
  }

  function embedNow() {
    // Handle the scene loaded event - make sure character is visible
    const handleSceneLoaded = () => {
      console.log("✅ SitePal scene loaded callback triggered");

      // Keep transmission video playing during character load, hide it only after character is ready
      // We'll hide it later in startCharacterInteraction() to give more loading coverage

      // Ensure SitePal container is visible and has active class
      if (container) {
        container.style.display = "block";
        container.classList.add("active");
        container.style.zIndex = "30"; // Explicitly set high z-index when loaded

        // Also set z-index for the vhss_aiPlayer element
        const playerDiv = document.getElementById("vhss_aiPlayer");
        if (playerDiv) {
          playerDiv.style.zIndex = "25";
        }
      }

      // Make SitePal APIs available on window object for easier access
      if (typeof saySilent === "function" && !window.saySilent) {
        window.saySilent = saySilent;
        console.log("✅ Made saySilent available on window");
      }

      if (typeof sayText === "function" && !window.sayText) {
        window.sayText = sayText;
        console.log("✅ Made sayText available on window");
      }

      if (typeof AI_vhost_api === "function" && !window.AI_vhost_api) {
        window.AI_vhost_api = AI_vhost_api;
        console.log("✅ Made AI_vhost_api available on window");
      } else {
        // Try to manually initialize AI functionality
        console.log("⚠️ AI_vhost_api not found, attempting to wait for it to load...");
        
        // Wait longer and check multiple times for real AI
        let retryCount = 0;
        const maxRetries = 10;
        
        const checkForAI = () => {
          retryCount++;
          console.log(`🔍 Checking for AI_vhost_api (attempt ${retryCount}/${maxRetries})`);
          
          if (typeof AI_vhost_api === "function") {
            window.AI_vhost_api = AI_vhost_api;
            console.log("✅ Real AI_vhost_api found and activated!");
            return;
          }
          
          // Check if it's available globally
          if (typeof window.AI_vhost_api === "function") {
            console.log("✅ AI_vhost_api already available on window");
            return;
          }
          
          if (retryCount < maxRetries) {
            setTimeout(checkForAI, 1000); // Check every second
          } else {
            console.error("❌ Real AI_vhost_api never loaded - text input may not work properly");
          }
        };
        
        setTimeout(checkForAI, 1000);
      }
      if (typeof stopListening === "function" && !window.stopListening) {
        window.stopListening = stopListening;
        console.log("✅ Made stopListening available on window");
      }
      if (typeof stopSpeaking === "function" && !window.stopSpeaking) {
        window.stopSpeaking = stopSpeaking;
        console.log("✅ Made stopSpeaking available on window");
      }
      waitForSitePalReadyAndStart();
      // Request microphone permission during CONNECT to avoid interruption during the greeting
      requestMicrophonePermission();

      // DO NOT prime audio or activate mic here - wait for UN-MUTE button
      console.log("⏸️ Waiting for UN-MUTE before activating audio");
      
      // Notify the parent window that SitePal is ready
      window.parent.postMessage({
        type: "SITEPAL_SCENE_LOADED",
        status: "ready"
      }, "*");
    };

    // Function to request microphone permissions ahead of time
    function requestMicrophonePermission() {
      console.log("🎤 Requesting microphone permission during CONNECT phase...");
      try {
        // Use the browser's getUserMedia API to request microphone access
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then(stream => {
              console.log("✅ Microphone permission granted");
              // Stop all tracks to release the microphone - we're just getting permission
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(err => {
              console.warn("⚠️ Microphone permission denied or error:", err);
            });
        } else {
          console.warn("⚠️ getUserMedia not supported in this browser");
        }
      } catch (e) {
        console.error("❌ Error requesting microphone permission:", e);
      }
    }

    // Set both callback names that SitePal might use
    window.vh_sceneLoaded = handleSceneLoaded;
    window.vhss_sceneLoaded = handleSceneLoaded;

    // Add a backup timeout in case callbacks don't fire
    setTimeout(() => {
      console.log("⏱️ Checking if SitePal character is visible...");
      if (container && !container.classList.contains("active")) {
        console.log("⚠️ Character not visible, forcing display");
        handleSceneLoaded();

        // Check if vhss_aiPlayer is actually visible
        const playerDiv = document.getElementById("vhss_aiPlayer");
        if (playerDiv && playerDiv.innerHTML === "") {
          console.log("⚠️ SitePal player appears empty, trying to reload...");

          // Try embedding again
          try {
            playerDiv.innerHTML = "";
            AI_vhost_embed(280, 180, 9157686, 255, 1, 1);
            console.log("🔄 Attempted to reload SitePal character");
          } catch (e) {
            console.error("❌ Error reloading SitePal:", e);
          }
        }
      }
    }, 3000);

    console.log("📱 Calling AI_vhost_embed to load SitePal with AI enabled...");
    // Use exactly the SitePal provided embed call
    AI_vhost_embed(280, 180, 9157686, 255, 1, 1);
  }

  function waitForSitePalReadyAndStart() {
    const maxRetries = 20;
    let attempts = 0;

    const interval = setInterval(() => {
      if (typeof window.sayText === "function") {
        console.log("✅ SitePal sayText is now available, starting interaction...");
        clearInterval(interval);
        startCharacterInteraction();
      } else {
        console.log("⏳ Waiting for SitePal API... attempt", attempts);
        attempts++;
        if (attempts >= maxRetries) {
          console.warn("❌ Timed out waiting for SitePal API");
          clearInterval(interval);
        }
      }
    }, 250);
  }

  function startCharacterInteraction() {
    const signalButton = document.querySelector('.control-button[data-action="signal"]');
    const buttonLabel = signalButton?.querySelector(".button-label") || signalButton;

    if (!signalButton) {
      console.warn("⚠️ signalButton or buttonLabel not found");
      return;
    }

    // Now hide the transmission video effect since character is ready
    setTimeout(() => {
      const deadAir = document.getElementById("deadAir");
      if (deadAir) {
        deadAir.style.opacity = 0;
        deadAir.style.zIndex = "5"; // Lower z-index once character is loaded
        console.log("🎬 Transmission video fading out - character ready");
      }
    }, 1500); // Give character a moment to be visible before hiding transmission effect

    // Don't auto-change button state here - wait for external JS to handle the flow
    console.log("✅ SitePal character interaction ready - waiting for external button handler");
    
    // Play greeting when character loads (only once)
    if (!window.greetingPlayed) {
      setTimeout(() => {
        if (typeof window.sayText === "function") {
          window.sayText("Greetings, Earthling. I am ready to assist you. Please type your message below.", 9, 1, 7);
          console.log("👋 Welcome greeting played");
          window.greetingPlayed = true;
        } else {
          console.warn("⚠️ sayText not available for greeting");
        }
      }, 1000); // Brief delay to ensure character is fully loaded
    }
    
    console.log("📝 Text-only communication mode - ready for input");
    
    // SitePal should handle text input natively now with Input.vhss-ai-text
    console.log("📝 SitePal native text input configured");
    
    // Show text communication interface immediately for text-only mode
    const textCommContainer = document.getElementById("text-comm-container");
    if (textCommContainer) {
      textCommContainer.style.display = "block";
      console.log("📝 Text communication interface activated for text-only mode");
    }
    
    // Debug: Check if SitePal AI elements exist
    setTimeout(() => {
      const aiForm = document.getElementById("vhss-aiplayer-aiform");
      const aiFormLogs = document.getElementById("vhss-aiplayer-aiformlogs");
      const aiPlayer = document.getElementById("vhss_aiPlayer");
      
      console.log("🔍 SitePal AI elements check:", {
        aiForm: !!aiForm,
        aiFormContent: aiForm ? aiForm.innerHTML.length : 0,
        aiFormLogs: !!aiFormLogs,
        aiPlayer: !!aiPlayer,
        AI_vhost_api: typeof window.AI_vhost_api
      });
      
      // Log the actual content to see what SitePal generated
      if (aiForm && aiForm.innerHTML.length > 0) {
        console.log("📋 SitePal AI form content:", aiForm.innerHTML);
        
        // Make sure the form is visible
        aiForm.style.display = 'block';
        aiForm.style.visibility = 'visible';
        aiForm.style.opacity = '1';
        
        // Check if SitePal's AI function is available for our custom input
        if (typeof window.vhss_ai_sayPreAI === 'function') {
          console.log("✅ SitePal AI function (vhss_ai_sayPreAI) is available!");
        } else {
          console.log("⚠️ SitePal AI function (vhss_ai_sayPreAI) not yet available, will check again...");
          
          // Try to make it available from global scope
          setTimeout(() => {
            if (typeof vhss_ai_sayPreAI === 'function') {
              window.vhss_ai_sayPreAI = vhss_ai_sayPreAI;
              console.log("✅ Found and assigned vhss_ai_sayPreAI to window");
            } else {
              console.log("⚠️ vhss_ai_sayPreAI function still not found");
            }
          }, 2000);
        }
        
        console.log("👁️ AI form generated, using custom input interface");
      }
    }, 3000);
  }

  // Use exactly what SitePal provides - no fallback scripts
  if (typeof AI_vhost_embed !== "function") {
    console.log("⚠️ AI_vhost_embed not found - this should be loaded by the main script");
    // Give the main script more time to load
    setTimeout(() => {
      if (typeof AI_vhost_embed === "function") {
        console.log("✅ AI_vhost_embed now available, embedding...");
        embedNow();
      } else {
        console.error("❌ AI_vhost_embed still not available after timeout");
      }
    }, 2000);
  } else {
    console.log("✅ AI_vhost_embed already loaded, embedding now");
    embedNow();
  }
}

function disconnectSitePal() {
  console.log("🔌 Disconnecting SitePal character...");
  unloadScene();
  // 1. Hide the character visually
  const container = document.getElementById("sitepal-container");
  if (container) {
    container.style.display = "none";
    container.classList.remove("active");
  }

  // 2. Stop the character from listening
  if (typeof window.stopListening === "function") {
    window.stopListening();
    console.log("🛑 Stopped listening.");
  }

  // 3. Stop any ongoing speech (if applicable)
  if (typeof window.stopSpeaking === "function") {
    window.stopSpeaking();
    console.log("🔇 Stopped speaking.");
  }
  
  // 4. Explicitly stop all active audio tracks to fully release the mic
  if (window.microphoneStream) {
    console.log("🎤 Stopping stored microphone stream");
    window.microphoneStream.getTracks().forEach(track => {
      track.stop();
      console.log("🎤 Microphone track stopped from stored stream");
    });
    window.microphoneStream = null;
  } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => {
          if (track.kind === "audio") {
            track.stop();
            console.log("🎤 Microphone track stopped");
          }
        });
      })
      .catch(err => {
        console.warn("⚠️ Could not access mic to stop tracks:", err);
      });
  }
}

// Make functions available globally
window.initSitePal = initSitePal;
window.disconnectSitePal = disconnectSitePal;