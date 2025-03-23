import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import BurnGallery from "../components/BurnGallery";
import NavBar from "../components/NavBar.client";
import Communion3 from "../components/Communion3";
import Loader from "../components/Loader";
import { X } from "lucide-react";

// Dynamically import heavy components
// const BurnGalleryDynamic = dynamic(() => import("../components/BurnGallery"), {
//   ssr: false,
//   loading: () => <Loader />,
// });

// Dynamically import both music players
const MusicPlayer2 = dynamic(() => import("../components/MusicPlayer2"), {
  ssr: false,
});

const MusicPlayer3 = dynamic(() => import("../components/MusicPlayer3"), {
  ssr: false,
});

// const NavBarDynamic = dynamic(() => import("../components/NavBar.client"), {
//   ssr: false,
// });

export default function GalleryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [componentsLoaded, setComponentsLoaded] = useState({
    burnGallery: false,
    threeDScene: false,
  });
  // Initialize showSpotify based on screen size
  const [showSpotify, setShowSpotify] = useState(() => {
    // Only run this during client-side rendering
    if (typeof window !== "undefined") {
      return window.innerWidth > 768; // true for desktop, false for mobile
    }
    return false; // default for server-side rendering
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const [shouldRenderGallery, setShouldRenderGallery] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Modify the mobile detection useEffect
  useEffect(() => {
    const checkMobile = () => {
      const mobile = typeof window !== "undefined" && window.innerWidth <= 768;
      setIsMobileView(mobile);
      // Set showSpotify based on screen size
      setShowSpotify(!mobile);
    };

    if (typeof window !== "undefined") {
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }
  }, []);

  // Modify toggle80sMode to respect mobile view
  const toggle80sMode = () => {
    const newMode = !is80sMode;
    setIs80sMode(newMode);

    // Always show music player when 80s mode is turned on
    if (newMode) {
      setShowSpotify(true);
    }
    // Don't hide the player when turning 80s mode off

    console.log(
      "Gallery: 80's mode toggled to",
      newMode,
      "showSpotify:",
      showSpotify
    );
  };

  // Handle close for music player
  const handleClose = () => {
    // Always hide Spotify when closing the music player
    setShowSpotify(false);
  };

  // Add loading state management
  useEffect(() => {
    if (componentsLoaded.burnGallery && componentsLoaded.threeDScene) {
      // console.log("All components loaded, setting loading to false");
      setIsLoading(false);
    }
  }, [componentsLoaded]);

  const handleComponentLoad = (component, status) => {
    // console.log(`Setting ${component} loaded status to:`, status);
    setComponentsLoaded((prev) => ({
      ...prev,
      [component]: status,
    }));
  };

  useEffect(() => {
    // Delay mounting the heavy component until needed
    setShouldRenderGallery(true);

    return () => {
      // Ensure unmounting when page changes
      setShouldRenderGallery(false);
    };
  }, []);

  // Add this to identify memory issues
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const memoryUsage = performance.memory
        ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`
        : "Not available";
      console.log(`Memory usage: ${memoryUsage}`);

      // Log at intervals to track memory growth
      const intervalId = setInterval(() => {
        const updatedMemory = performance.memory
          ? `${Math.round(performance.memory.usedJSHeapSize / 1048576)}MB`
          : "Not available";
        console.log(`Memory usage (updated): ${updatedMemory}`);
      }, 10000);

      return () => clearInterval(intervalId);
    }
  }, []);

  // Add debugging
  useEffect(() => {
    console.log("Gallery page showSpotify state:", showSpotify);
  }, [showSpotify]);

  // Add a useEffect to monitor showSpotify state changes
  useEffect(() => {
    console.log("Gallery.js: showSpotify changed to:", showSpotify);

    // Ensure music players are mounted/unmounted correctly when showSpotify changes
    if (showSpotify) {
      console.log("Music player should be visible");
    } else {
      console.log("Music player should be hidden");
    }
  }, [showSpotify]);

  return (
    <>
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
        {isLoading && <Loader />}
        <div
          style={{
            opacity: isLoading ? 0 : 1,
            transition: "opacity 0.5s ease-in-out",
            position: "relative",
            zIndex: 1,
          }}
        >
          {shouldRenderGallery && (
            <BurnGallery
              setComponentLoaded={(status) =>
                handleComponentLoad("burnGallery", status)
              }
              setThreeDSceneLoaded={(status) =>
                handleComponentLoad("threeDScene", status)
              }
              setShowSpotify={setShowSpotify}
              showSpotify={showSpotify}
              isModalOpen={isModalOpen}
              setIsModalOpen={setIsModalOpen}
              is80sMode={is80sMode}
              toggle80sMode={toggle80sMode}
            />
          )}

          {/* {isModalOpen && (
            <>
              <div
                // className="fixed inset-0 bg-black bg-opacity-50"
                onClick={() => setIsModalOpen(false)}
                style={{ zIndex: 9998 }}
              />
              <div
                style={{
                  position: "fixed",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "400px", // Smaller width to clip sides
                  height: "370px",
                  zIndex: 9999,
                  backgroundColor: "#000000",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "2px goldenrod solid",
                }}
              >
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute top-2 right-2 text-white hover:text-gray-300 transition-colors"
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    zIndex: 1,
                    background: "transparent",
                    border: "none",
                    padding: "4px",
                  }}
                >
                  <X size={24} />
                </button>
              </div>
            </>
          )} */}

          {/* Music Player with proper conditional rendering */}
          {showSpotify && (
            <div
              style={{
                position: "absolute",
                bottom: isMobileView ? "60px" : "3rem",
                left: isMobileView ? "20%" : "0",
                transform: isMobileView
                  ? "translate(-50%, 0) scale(0.5)"
                  : "scale(0.6)",
                zIndex: 1000,
                borderRadius: "12px",
                boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
                opacity: 1,
                transition: "all 0.3s ease",
                pointerEvents: "auto",
                cursor: "move",
              }}
            >
              <Suspense fallback={<div>Loading music player...</div>}>
                {is80sMode ? (
                  <MusicPlayer3
                    isVisible={showSpotify}
                    onClose={() => setShowSpotify(false)}
                    autoPlay={true}
                  />
                ) : (
                  <MusicPlayer2
                    isVisible={showSpotify}
                    onClose={() => setShowSpotify(false)}
                    autoPlay={false}
                  />
                )}
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
