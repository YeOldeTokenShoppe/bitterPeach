import React, { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
// import Loader from "../components/Loader";
// import Magic8BallLoader from "../components/Magic8BallLoader";
// import CoinLoader from "../components/CoinLoader";
import { useUser } from "@clerk/nextjs";
import { useMusic } from "../contexts/MusicContext";
import SimpleLoader from "../components/SimpleLoader";
import CandleInteractionHint from "../components/CandleInteractionHint";


// Dynamically import music players
const MobileMusicPlayer = dynamic(() => import("../components/MobileMusicPlayer"), {
  ssr: false,
});

// const NavBarDynamic = dynamic(() => import("../components/NavBar.client"), {
//   ssr: false,
// });

const BurnGalleryClient = dynamic(() => import("../components/BurnGallery"), {
  ssr: false,
  loading: () => <SimpleLoader/>,
});

export default function GalleryPage({ globalMusicPlayerRef, showGlobalPlayer, setShowGlobalPlayer } = {}) {
  const { user: currentUser } = useUser();
  const { 
    showSpotify, 
    setShowSpotify, 
    isPlaying: contextIsPlaying,
    play: playMusic,
    pause: pauseMusic,
    loadTrack,
    nextTrack: contextNextTrack
  } = useMusic(); // Use context for music state
  const musicPlayerRef = globalMusicPlayerRef; // Always use global ref
  const isTogglingRef = useRef(false); // Prevent multiple rapid toggles
  const isToggling80sRef = useRef(false); // Track 80s mode toggle state
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

  // Debug log the music state and sync with global player
  useEffect(() => {
    console.log("🎵 Gallery mounted - showSpotify:", showSpotify, "contextIsPlaying:", contextIsPlaying, "isMobileView:", isMobileView);
    // Sync local state with global player state
    if (showGlobalPlayer !== undefined) {
      setShowSpotify(showGlobalPlayer);
    }
  }, [showGlobalPlayer]);
  
  useEffect(() => {
    console.log("🎵 Gallery - showSpotify changed:", showSpotify);
  }, [showSpotify, contextIsPlaying, isMobileView]);

  // Handle music toggle - control both visibility and playback
  const handleMusicToggle = useCallback((enabled) => {

    
    // Prevent rapid toggling
    if (isTogglingRef.current) {

      return;
    }
    
    // If already in the desired state, do nothing
    if (enabled === showSpotify) {

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
      if (setShowGlobalPlayer) setShowGlobalPlayer(true);
      // Use context to play music
      setTimeout(() => {
        // Load first track if needed, then play
        if (!window.__globalAudioElement?.src) {
          loadTrack(0, true);
        } else {
          playMusic();
        }
        isTogglingRef.current = false;
      }, 100);
    } else {
      // Pause using context
      pauseMusic();
      // Hide after pausing
      setTimeout(() => {
        setShowSpotify(false);
        if (setShowGlobalPlayer) setShowGlobalPlayer(false);
        isTogglingRef.current = false;
      }, 100);
    }
  }, [showSpotify, setShowSpotify]);

  // Detect if device is actually a phone (not tablet or desktop)
  const detectMobileDevice = useCallback(() => {
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
    // console.log('📱 Enhanced Mobile Detection:', {
    //   userAgent: userAgent,
    //   isIPhone,
    //   isIPad,
    //   isAndroid,
    //   hasMobileKeyword,
    //   hasTouch,
    //   screen: { width: screenWidth, height: screenHeight },
    //   viewport: { width: innerWidth, height: innerHeight },
    //   physical: { width: physicalWidth, height: physicalHeight },
    //   pixelRatio,
    //   hasPhoneSize,
    //   isPhoneUA,
    //   RESULT: isMobile
    // });
    
    
    return isMobile;
  }, []);

  // Initial detection - run once on mount
  useEffect(() => {
    // Check for force mobile parameter (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const forceMobile = urlParams.get('mobile') === 'true';
    
    if (forceMobile) {

      setIsDefinitelyPhone(true);
      setIsMobileView(true);
      return;
    }
    
    // Use the same strict detection on initial load
    const isMobile = detectMobileDevice();
    
    if (isMobile) {

      setIsDefinitelyPhone(true);
      setIsMobileView(true);
    } else {

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
  const getMissionControlIframe = useCallback(() => {
    // Try to find the mission control iframe
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      if (iframe.src && iframe.src.includes("cyberpunk_mission_control_enhanced.html")) {
        return iframe;
      }
    }
    return null;
  }, []);

  // Modify toggle80sMode to respect mobile view
  const toggle80sMode = useCallback(() => {
    if (isToggling80sRef.current) {
      console.log("🎨 Gallery: Ignoring toggle - already in progress");
      return;
    }
    
    isToggling80sRef.current = true;
    console.log("🎨 Gallery: toggle80sMode called, current:", is80sMode);
    
    setIs80sMode(prev => {
      const newMode = !prev;
      console.log("🎨 Gallery: Setting 80s mode from", prev, "to", newMode);
      
      // Reset toggle flag after state update
      setTimeout(() => {
        isToggling80sRef.current = false;
      }, 100);
      
      return newMode;
    });
  }, []);

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
  }, [showSpotify, getMissionControlIframe]);

  // Handle mission control ignition command
  const handleIgnition = useCallback(() => {

    setSynthwaveMode(true);
    
    // Notify mission control about the mode change
    const iframe = getMissionControlIframe();
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: "SYNTHWAVE_MODE_CHANGED", active: true },
        "*"
      );
    }
  }, [getMissionControlIframe]);
  
  // Handle returning from synthwave mode
  const handleReturnFromSynthwave = useCallback(() => {

    setSynthwaveMode(false);
    
    // Notify mission control about the mode change
    const iframe = getMissionControlIframe();
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: "SYNTHWAVE_MODE_CHANGED", active: false },
        "*"
      );
    }
  }, [getMissionControlIframe]);

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
          console.log("🎨 Gallery: Received EIGHTIES_MODE_CHANGE from mission control");
          toggle80sMode();
        }
        

        // Handle music toggle
        if (event.data.type === "MUSIC_TOGGLE") {
      
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
  }, [toggle80sMode, showSpotify, synthwaveMode, handleMusicToggle, handleIgnition]); // Add synthwaveMode to dependencies

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
      {isLoading && <SimpleLoader size="fullscreen" showText={false} withSparkle={true} />}

      {/* Candle Interaction Hint */}
      {!isLoading && <CandleInteractionHint isMobileView={isMobileView} />}

      {/* Main content - RL80 Logo */}
      <div style={{
          position: "fixed",
          top: "20px", 
          left: "20px",
          zIndex: 10000, // Increased z-index to ensure it stays on top
          borderRadius: "8px",
          padding: "10px",
          pointerEvents: "auto",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.5s ease-in-out"
        }}>
          <div 
            id="text"
            style={{
              position: "relative",
              fontFamily: "'UnifrakturMaguntia', cursive",
              fontSize: isMobileView ? "3rem" : "4rem",
              color: "#ffffff",
              cursor: "pointer"
            }}
          >
            <Link href="/home" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
              RL80
            </Link>
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
                    color: is80sMode 
                      ? `rgba(${201 - index * 2}, ${55 - index * 3}, ${256 - index * 2})` 
                      : `rgba(${255 - index * 2}, ${255 - index * 3}, ${255 - index * 2})`,
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
      
      {/* 80s Mode Video Background for Desktop */}
      {!isMobileView && is80sMode && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              minWidth: "100%",
              minHeight: "100%",
              width: "auto",
              height: "auto",
              transform: "translate(-50%, -50%)",
              objectFit: "cover",
              opacity: 0.15,
              filter: "saturate(2) hue-rotate(15deg) brightness(0.8)",
            }}
            onLoadedData={(e) => {
              console.log("Desktop 80s video loaded:", e.target.src);
              e.target.play().catch(err => console.log("Video autoplay failed:", err));
            }}
            onError={(e) => {
              console.error("Desktop video failed to load:", e);
              // Try fallback video if main video fails
              if (e.target.src.includes("83.mov")) {
                e.target.src = "/vaporwave-sunset.mp4";
              }
            }}
          >
            <source src="/videos/83.mov" type="video/quicktime" />
            <source src="/videos/83.mov" type="video/mp4" />
            <source src="/vaporwave-sunset.mp4" type="video/mp4" />
          </video>
        </div>
      )}
      
      {/* Desktop controls for Music and 80s Mode */}
      {!isMobileView && !isLoading && (
        <>
          {/* Music toggle button OR compact player */}
          {!showSpotify ? (
            // Music Icon Button
            <button
              onClick={() => handleMusicToggle(true)}
              style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.7)",
                border: "2px solid rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                backdropFilter: "blur(10px)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                zIndex: 9999,
              }}
              title="Toggle Music"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </button>
          ) : (
            // Compact Music Player Controls (matching mobile)
            <div
              style={{
                position: "fixed",
                top: "20px",
                right: "20px",
                zIndex: 9999,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {/* Spinning Album Art */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundImage: "url('/virginRecords.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  animation: showSpotify ? "spin 3s linear infinite" : "none",
                }}
              />
              
              {/* Skip Button */}
              <button
                onClick={() => {
                  if (contextNextTrack) {
                    contextNextTrack();
                  } else if (musicPlayerRef.current && musicPlayerRef.current.nextTrack) {
                    musicPlayerRef.current.nextTrack();
                  }
                }}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                title="Next Track"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 4 15 12 5 20 5 4"/>
                  <line x1="19" y1="5" x2="19" y2="19"/>
                </svg>
              </button>
              
              {/* Close Button */}
              <button
                onClick={() => handleMusicToggle(false)}
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                title="Close Music"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}
          
          {/* 80s Mode Toggle Icon - positioned below music controls */}
          <button
            onClick={() => toggle80sMode(!is80sMode)}
            style={{
              position: "fixed",
              top: "80px",
              right: "20px",
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: is80sMode ? "rgba(217, 70, 239, 0.3)" : "rgba(0, 0, 0, 0.7)",
              border: is80sMode ? "2px solid #D946EF" : "2px solid rgba(255, 255, 255, 0.2)",
              color: is80sMode ? "#67e8f9" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backdropFilter: "blur(10px)",
              boxShadow: is80sMode 
                ? "0 0 20px rgba(217, 70, 239, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)" 
                : "0 2px 8px rgba(0, 0, 0, 0.3)",
              zIndex: 9999,
            }}
            onMouseEnter={(e) => {
              if (is80sMode) {
                e.currentTarget.style.boxShadow = "0 0 30px rgba(217, 70, 239, 0.7), 0 2px 8px rgba(0, 0, 0, 0.3)";
              } else {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
              }
            }}
            onMouseLeave={(e) => {
              if (is80sMode) {
                e.currentTarget.style.boxShadow = "0 0 20px rgba(217, 70, 239, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3)";
              } else {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
              }
            }}
            title={is80sMode ? "Disable 80s Mode" : "Enable 80s Mode"}
          >
            <span style={{ 
              fontSize: "20px", 
              fontWeight: "bold",
              color: is80sMode ? "#00ff41" : "#67e8f9",
              textShadow: is80sMode ? "0 0 10px #00ff41" : "none",
              fontFamily: "monospace"
            }}>
              80s
            </span>
          </button>
        </>
      )}
      
      
      {/* Music Player for Desktop - use global player if available, otherwise local */}
      {/* Removed local MusicPlayer3 - using global instance from _app.jsx */}
      
      {/* Add CSS for spin animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}