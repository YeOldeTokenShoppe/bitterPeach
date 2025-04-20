import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import NavBar from "../components/NavBar.client";
import Communion3 from "../components/Communion3";
import Loader from "../components/Loader";
import { X } from "lucide-react";

// Dynamically import music players (keep for potential 80s mode use)
const MusicPlayer3 = dynamic(() => import("../components/MusicPlayer3"), {
  ssr: false,
});

// const NavBarDynamic = dynamic(() => import("../components/NavBar.client"), {
//   ssr: false,
// });

const BurnGalleryClient = dynamic(() => import("../components/BurnGallery"), {
  ssr: false,
  loading: () => <Loader />,
});

export default function GalleryPage() {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // Initialize state
  const [showSpotify, setShowSpotify] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const [monsterMode, setMonsterMode] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [shouldRenderGallery, setShouldRenderGallery] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  const [componentLoaded, setComponentLoaded] = useState(false);
  const [threeDSceneLoaded, setThreeDSceneLoaded] = useState(false);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      setMobile(isMobile);
      setIsMobileView(isMobile);
      // Remove automatic showSpotify setting
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Add helper function to get the mission control iframe
  const getMissionControlIframe = () => {
    // Try to find the mission control iframe
    const iframes = document.querySelectorAll("iframe");
    for (const iframe of iframes) {
      if (iframe.src && iframe.src.includes("cyberpunk_mission_control.html")) {
        return iframe;
      }
    }
    return null;
  };

  // Modify toggle80sMode to respect mobile view
  const toggle80sMode = () => {
    const newMode = !is80sMode;
    setIs80sMode(newMode);

    // Ensure music player is shown when 80s mode is enabled
    if (newMode) {
      setShowSpotify(true);

      // Get iframe reference
      const iframe = getMissionControlIframe();

      // Notify mission control about music state
      if (iframe && iframe.contentWindow) {
        // Use direct communication with the iframe
        iframe.contentWindow.postMessage(
          { type: "STEREO_POWER_STATE", isActive: true, mode: "80s" },
          "*"
        );

        // Explicitly update the music toggle in mission control to show it's active
        iframe.contentWindow.postMessage(
          { type: "SET_MUSIC_STATE", isPlaying: true },
          "*"
        );
      } else {
        console.warn("Mission control iframe not found");
      }
    }

   
  };

  // Handle close for music player
  const handleClose = () => {
    // Always hide Spotify when closing the music player
    setShowSpotify(false);

    // Get iframe reference
    const iframe = getMissionControlIframe();

    // Notify mission control that music is no longer playing
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: "SET_MUSIC_STATE", isPlaying: false },
        "*"
      );
    } else {
      console.warn("Mission control iframe not found");
    }
  };

  // Update loading progress based on component and 3D scene loading states
  useEffect(() => {
    if (componentLoaded && threeDSceneLoaded) {
      // Both components are loaded, set progress to 100%
      setLoadingProgress(100);

      // Add a small delay before hiding the loader to ensure smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(timer);
    } else if (componentLoaded) {
      // Component is loaded but 3D scene is still loading
      setLoadingProgress(50);
    } else if (threeDSceneLoaded) {
      // 3D scene is loaded but component is still loading
      setLoadingProgress(30);
    } else {
      // Neither is loaded yet
      setLoadingProgress(10);
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

  // Listen for messages from the mission control panel iframe
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
          setShowSpotify(event.data.enabled);
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

        // Handle other message types as needed
      }
    };

    // Add event listener for messages
    window.addEventListener("message", handleMessage);

    // Clean up
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [toggle80sMode, showSpotify]); // Include showSpotify in dependencies

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
      {isLoading && <Loader progress={loadingProgress} />}

      {/* Main content */}
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
            setComponentLoaded={setComponentLoaded}
            setThreeDSceneLoaded={setThreeDSceneLoaded}
            setShowSpotify={setShowSpotify}
            showSpotify={showSpotify}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            is80sMode={is80sMode}
            toggle80sMode={toggle80sMode}
          />
        )}
      </div>
    </div>
  );
}
