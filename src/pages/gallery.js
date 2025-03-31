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

const ClientOnlyMusicPlayer = ({
  is80sMode,
  showSpotify,
  setShowSpotify,
  isMobileView,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: isMobileView ? "60px" : "7rem",
        left: isMobileView ? "20%" : "2rem",
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
  );
};

const BurnGalleryClient = dynamic(() => import("../components/BurnGallery"), {
  ssr: false,
  loading: () => <Loader />,
});

export default function GalleryPage() {
  const [isLoading, setIsLoading] = useState(true);
  // Initialize showSpotify based on screen size
  const [showSpotify, setShowSpotify] = useState(false); // Start with false for SSR
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);
  const [shouldRenderGallery, setShouldRenderGallery] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  // Move the window check to useEffect
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowSpotify(window.innerWidth > 768);
    }
  }, []);

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
  }, [showSpotify]);

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
      {/* Loader */}
      {isLoading && <Loader />}

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
            setComponentLoaded={() => {}} // No-op since we're not using this anymore
            setThreeDSceneLoaded={() => setIsLoading(false)} // Directly control loading state
            setShowSpotify={setShowSpotify}
            showSpotify={showSpotify}
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
            is80sMode={is80sMode}
            toggle80sMode={toggle80sMode}
          />
        )}

        {/* Music Player */}
        {showSpotify && (
          <ClientOnlyMusicPlayer
            is80sMode={is80sMode}
            showSpotify={showSpotify}
            setShowSpotify={setShowSpotify}
            isMobileView={isMobileView}
          />
        )}
      </div>
    </div>
  );
}
