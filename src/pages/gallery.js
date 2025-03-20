import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import BurnGallery from "../components/BurnGallery";
import NavBar from "../components/NavBar.client";
import Communion3 from "../components/Communion3";
import Loader from "../components/Loader";
import MusicPlayer from "../components/MusicPlayer2";
import LightweightTestCanvas from "../components/LightweightTestCanvas";
import { X } from "lucide-react";

// Dynamically import heavy components
// const BurnGalleryDynamic = dynamic(() => import("../components/BurnGallery"), {
//   ssr: false,
//   loading: () => <Loader />,
// });

// // Use dynamic import for MusicPlayer to ensure it's loaded properly
const MusicPlayerDynamic = dynamic(() => import("../components/MusicPlayer3"), {
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
  const [showSpotify, setShowSpotify] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const [shouldRenderGallery, setShouldRenderGallery] = useState(false);

  // Toggle function for 80s mode
  const toggle80sMode = () => {
    const newMode = !is80sMode;
    setIs80sMode(newMode);

    // Always show music player, it will conditionally render the correct component
    setShowSpotify(true);

    console.log("Gallery: 80's mode toggled to", newMode);
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

          {/* Single MusicPlayer that works for both 80s mode and regular mode */}
          {showSpotify && (
            <div
              style={{
                position: "fixed",
                bottom: "6rem",
                left: "4rem",
                zIndex: 1000,
                borderRadius: "12px",
                boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
                opacity: 1,
                transform: "scale(0.6)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                pointerEvents: "auto",
                cursor: "move",
              }}
            >
              <Suspense fallback={<div>Loading music player...</div>}>
                {is80sMode ? (
                  <MusicPlayerDynamic
                    isVisible={true}
                    onClose={handleClose}
                    autoPlay={true}
                  />
                ) : (
                  <MusicPlayer
                    isVisible={true}
                    onClose={handleClose}
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
