import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
// import Loader from "../components/Loader";
import Magic8BallLoader from "../components/Magic8BallLoader";
import { useUser } from "@clerk/nextjs";
import { useMusic } from "../contexts/MusicContext";

// Dynamically import music players (keep for potential 80s mode use)
// const MusicPlayer3 = dynamic(() => import("../components/MusicPlayer3"), {
//   ssr: false,
// });


// SimplifiedMusicPlayer removed - handled in SidePanelEnhanced

// const NavBarDynamic = dynamic(() => import("../components/NavBar.client"), {
//   ssr: false,
// });

const BurnGalleryClient = dynamic(() => import("../components/BurnGallery"), {
  ssr: false,
  loading: () => <Magic8BallLoader />,
});

export default function GalleryPage() {
  const { user: currentUser } = useUser();
  const { showSpotify, setShowSpotify } = useMusic(); // Use context for music state
  const musicPlayerRef = useRef(null);
  const isTogglingRef = useRef(false); // Prevent multiple rapid toggles
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  // Add synthwave mode state
  const [synthwaveMode, setSynthwaveMode] = useState(false);
  const [shouldRenderGallery, setShouldRenderGallery] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isDefinitelyPhone, setIsDefinitelyPhone] = useState(false); // Lock mobile view for phones
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [threeDSceneLoaded, setThreeDSceneLoaded] = useState(false);

  // Handle music toggle - control both visibility and playback
  const handleMusicToggle = (enabled) => {
    console.log("🎵 Music toggle requested:", enabled, "Current showSpotify:", showSpotify);
    
    // Prevent rapid toggling
    if (isTogglingRef.current) {
      console.log("🎵 Toggle in progress, ignoring");
      return;
    }
    
    // If already in the desired state, do nothing
    if (enabled === showSpotify) {
      console.log("🎵 Already in desired state:", enabled);
      // But if enabled and music isn't playing, try to play it
      if (enabled && musicPlayerRef.current && typeof musicPlayerRef.current.play === 'function') {
        musicPlayerRef.current.play();
      }
      return;
    }
    
    isTogglingRef.current = true;
    
    if (enabled) {
      // Show the player first
      setShowSpotify(true);
      // Then play music after a delay to ensure component is mounted
      setTimeout(() => {
        if (musicPlayerRef.current && typeof musicPlayerRef.current.play === 'function') {
          console.log("🎵 Playing music");
          musicPlayerRef.current.play();
        }
        isTogglingRef.current = false;
      }, 300); // Slightly longer delay for mounting
    } else {
      // Pause first, then hide
      if (musicPlayerRef.current && typeof musicPlayerRef.current.pause === 'function') {
        console.log("🎵 Pausing music");
        musicPlayerRef.current.pause();
      }
      // Hide after pausing
      setTimeout(() => {
        setShowSpotify(false);
        isTogglingRef.current = false;
      }, 100);
    }
  };

  // Detect if device is actually a phone (not tablet or desktop)
  const detectMobileDevice = () => {
    // Get all the info for debugging
    const userAgent = navigator.userAgent || window.opera;
    const lowerUA = userAgent.toLowerCase();
    
    // More comprehensive mobile detection
    const isIPhone = /iphone/i.test(lowerUA);
    const isIPad = /ipad/i.test(lowerUA);
    const isAndroid = /android/i.test(lowerUA);
    const hasMobileKeyword = /mobile/i.test(lowerUA);
    
    // Check screen properties
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Physical screen size (accounting for pixel ratio)
    const physicalWidth = screenWidth / pixelRatio;
    const physicalHeight = screenHeight / pixelRatio;
    
    // Touch capability
    const hasTouch = 'ontouchstart' in window || 
                    navigator.maxTouchPoints > 0 || 
                    navigator.msMaxTouchPoints > 0;
    
    // Simple phone detection: iPhone or (Android + Mobile keyword)
    const isPhoneUA = isIPhone || (isAndroid && hasMobileKeyword);
    
    // Size check: viewport OR physical size small enough
    const hasPhoneSize = Math.min(innerWidth, innerHeight) < 600 || 
                        Math.min(physicalWidth, physicalHeight) < 400;
    
    // Final decision
    const isMobile = isPhoneUA && hasTouch && hasPhoneSize;
    
    // Enhanced logging
    console.log('📱 Enhanced Mobile Detection:', {
      userAgent: userAgent,
      isIPhone,
      isIPad,
      isAndroid,
      hasMobileKeyword,
      hasTouch,
      screen: { width: screenWidth, height: screenHeight },
      viewport: { width: innerWidth, height: innerHeight },
      physical: { width: physicalWidth, height: physicalHeight },
      pixelRatio,
      hasPhoneSize,
      isPhoneUA,
      RESULT: isMobile
    });
    
    
    return isMobile;
  };

  // Initial detection - run once on mount
  useEffect(() => {
    // Check for force mobile parameter (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const forceMobile = urlParams.get('mobile') === 'true';
    
    if (forceMobile) {
      console.log('🔧 Force mobile mode via URL parameter');
      setIsDefinitelyPhone(true);
      setIsMobileView(true);
      return;
    }
    
    // Use the same strict detection on initial load
    const isMobile = detectMobileDevice();
    
    if (isMobile) {
      console.log('📱 Definitely a phone - locking mobile view');
      setIsDefinitelyPhone(true);
      setIsMobileView(true);
    } else {
      console.log('💻 Not a phone - using desktop view');
      setIsDefinitelyPhone(false);
      setIsMobileView(false);
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // If we've already determined it's a phone, keep mobile view
      if (isDefinitelyPhone) {
        setIsMobileView(true);
        return;
      }
      
      // Otherwise, do normal detection
      const isMobile = detectMobileDevice();
      setIsMobileView(isMobile);
      // Remove automatic showSpotify setting
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize); // Also listen for orientation changes
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [isDefinitelyPhone]);

  // Add helper function to get the mission control iframe
  const getMissionControlIframe = () => {
    // Try to find the mission control iframe
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      if (iframe.src && iframe.src.includes("cyberpunk_mission_control_clean.html")) {
        return iframe;
      }
    }
    return null;
  };

  // Modify toggle80sMode to respect mobile view
  const toggle80sMode = () => {
    const newMode = !is80sMode;
    setIs80sMode(newMode);

    // When turning ON 80s mode, automatically show and play music ONLY for desktop
    if (newMode && !showSpotify && !isMobileView) {
      console.log("🎵 Gallery: Turning ON 80s mode - automatically showing and playing music (desktop only)");
      handleMusicToggle(true);
    }
    // When turning OFF 80s mode, preserve the existing music state
    // (showSpotify state is maintained separately)
  };

  // // Handle close for music player
  // const handleClose = () => {
  //   // Always hide Spotify when closing the music player
  //   setShowSpotify(false);

  //   // Get iframe reference
  //   const iframe = getMissionControlIframe();

  //   // Notify mission control that music is no longer playing
  //   if (iframe && iframe.contentWindow) {
  //     iframe.contentWindow.postMessage(
  //       { type: "SET_MUSIC_STATE", isPlaying: false },
  //       "*"
  //     );
  //   } else {
  //     console.warn("Mission control iframe not found");
  //   }
  // };

  // Update loading state based on component and 3D scene loading states
  useEffect(() => {
    if (componentLoaded && threeDSceneLoaded) {
      // Both components are loaded, hide loader
      // Add a small delay before hiding the loader to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [componentLoaded, threeDSceneLoaded]);

  useEffect(() => {
    // Delay mounting the heavy component until needed
    setShouldRenderGallery(true);

    return () => {
      // Ensure unmounting when page changes
      setShouldRenderGallery(false);
    };
  }, []);

  // Add debugging
  useEffect(() => {
    console.log("Gallery page showSpotify state:", showSpotify);
    console.log("Gallery page is80sMode state:", is80sMode);
    console.log("Gallery page isMobileView state:", isMobileView);

    // Get iframe reference
    const iframe = getMissionControlIframe();

    // Sync music toggle state with mission control
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          type: "MUSIC_TOGGLE",
          enabled: showSpotify,
        },
        "*"
      );

      // Also send the more explicit SET_MUSIC_STATE message
      iframe.contentWindow.postMessage(
        {
          type: "SET_MUSIC_STATE",
          isPlaying: showSpotify,
        },
        "*"
      );
    } else {
      console.warn(
        "Mission control iframe not found for showSpotify state sync"
      );
    }
  }, [showSpotify]);

  // Handle mission control ignition command
  const handleIgnition = () => {
    console.log("Ignition triggered - entering synthwave mode");
    setSynthwaveMode(true);
    
    // Notify mission control about the mode change
    const iframe = getMissionControlIframe();
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: "SYNTHWAVE_MODE_CHANGED", active: true },
        "*"
      );
    }
  };
  
  // Handle returning from synthwave mode
  const handleReturnFromSynthwave = () => {
    console.log("Returning from synthwave mode");
    setSynthwaveMode(false);
    
    // Notify mission control about the mode change
    const iframe = getMissionControlIframe();
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: "SYNTHWAVE_MODE_CHANGED", active: false },
        "*"
      );
    }
  };

  // Listen for messages from the mission control panel iframe - extend to handle ignition
  useEffect(() => {
    const handleMessage = (event) => {
      // Check if the message is from our mission control panel
      if (event.data && typeof event.data === "object") {
        // Handle 80s mode toggle from mission control
        if (
          event.data.type === "EIGHTIES_MODE_CHANGE" &&
          !event.data.fromGallery
        ) {
          toggle80sMode();
        }

        // Handle music toggle
        if (event.data.type === "MUSIC_TOGGLE") {
          console.log("Music toggle message received:", event.data.enabled);
          handleMusicToggle(event.data.enabled);
        }

        // Handle request for current music state
        if (event.data.type === "REQUEST_MUSIC_STATE") {
  

          // Get iframe reference
          const iframe = getMissionControlIframe();

          // Send current music state to mission control panel
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              {
                type: "SET_MUSIC_STATE",
                isPlaying: showSpotify,
              },
              "*"
            );
          } else {
            console.warn(
              "Mission control iframe not found for REQUEST_MUSIC_STATE response"
            );
          }
        }

        // Handle ignition command
        if (event.data.type === "IGNITION_COMMAND") {
          handleIgnition();
        }
        
        // Handle other message types as needed
      }
    };

    // Add event listener for messages
    window.addEventListener("message", handleMessage);

    // Clean up
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [toggle80sMode, showSpotify, synthwaveMode]); // Add synthwaveMode to dependencies

  // Add an effect to ensure mission control is synced once available
  useEffect(() => {
    // Function to check for iframe and sync state
    const syncMissionControl = () => {
      const iframe = getMissionControlIframe();
      if (iframe && iframe.contentWindow) {


        // Send initial state sync
        iframe.contentWindow.postMessage(
          {
            type: "SYNC_STATE",
            isEightiesMode: is80sMode,
            isMusicEnabled: showSpotify,
          },
          "*"
        );

        // Also send explicit music state
        iframe.contentWindow.postMessage(
          {
            type: "SET_MUSIC_STATE",
            isPlaying: showSpotify,
          },
          "*"
        );
        return true;
      }
      return false;
    };

    // Try immediately
    if (!syncMissionControl()) {
      // If not available yet, set up a retry interval
      const checkInterval = setInterval(() => {
        if (syncMissionControl()) {
          clearInterval(checkInterval);
        }
      }, 1000);

      // Clean up interval
      return () => clearInterval(checkInterval);
    }
  }, [is80sMode, showSpotify]); // Dependencies include both states that need syncing

  return (
    <div
      style={{
        backgroundColor: "#000000",
        minHeight: "100vh",
        width: "100vw",
        maxWidth: "100%",
        margin: 0,
        padding: 0,
        position: "fixed",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        overflow: "auto",
      }}
    >
      {/* Loader with progress */}
      {isLoading && <Magic8BallLoader isLoading={isLoading} />}

      {/* Main content */}
      <div className="textLight" id="textLight" style={{
          position: "absolute",
          top: "20px", 
          left: "20px",
          zIndex: 100, // Ensure it's above the scene if opaque
          borderRadius: "8px",
          padding: "10px",
          pointerEvents: "none"
        }}>
          <div 
            id="text"
            style={{
              position: "relative",
              fontFamily: "'UnifrakturMaguntia', cursive",
              fontSize: isMobileView ? "3rem" : "4rem",
              color: "#ffffff",
            }}
          >
            RL80
            {Array.from({length: 100}).map((_, i) => {
              const index = i + 1;
              return (
                <div
                  key={index}
                  className="text__copy"
                  style={{
                    position: "absolute",
                    pointerEvents: "none",
                    zIndex: -1,
                    top: 0,
                    left: 0,
                    color: `rgba(${255 - index * 2}, ${255 - index * 3}, ${255 - index * 2})`,
                    filter: "blur(0.1rem)",
                    transform: `translate(
                      ${index * 0.1}rem, 
                      ${index * 0.1}rem
                    ) scale(${1 + index * 0.01})`,
                    opacity: (1 / index) * 1.5,
                  }}
                >
                  RL80
                </div>
              );
            })}
          </div>
        </div>
      <div
        style={{
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.5s ease-in-out",
          position: "relative",
          zIndex: 1,
        }}
      >
        {shouldRenderGallery && (
          <BurnGalleryClient
            key="burn-gallery-client" // Add stable key
            setComponentLoaded={setComponentLoaded}
            setThreeDSceneLoaded={setThreeDSceneLoaded}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            is80sMode={is80sMode}
            toggle80sMode={toggle80sMode}
            synthwaveMode={synthwaveMode}
            setSynthwaveMode={setSynthwaveMode}
            handleIgnition={handleIgnition}
            handleReturnFromSynthwave={handleReturnFromSynthwave}
            isMobileView={isMobileView}
            isDefinitelyPhone={isDefinitelyPhone}
          />
        )}
      </div>
      
      {/* Simplified Music Player - Removed from here as it's handled in SidePanelEnhanced */}
    </div>
  );
}