import React, { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import BurnGallery from "../components/BurnGallery";
import NavBar from "../components/NavBar.client";
import Communion3 from "../components/Communion3";
import Loader from "../components/Loader";
import MusicPlayer from "../components/MusicPlayer2";
import Draggable from "react-draggable";
import Head from "next/head";

import { X } from "lucide-react";

// Dynamically import heavy components
const BurnGalleryDynamic = dynamic(() => import("../components/BurnGallery"), {
  ssr: false,
  loading: () => <Loader />,
});

// Use dynamic import for MusicPlayer to ensure it's loaded properly
const MusicPlayerDynamic = dynamic(() => import("../components/MusicPlayer3"), {
  ssr: false,
});

const NavBarDynamic = dynamic(() => import("../components/NavBar.client"), {
  ssr: false,
});

export default function GalleryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [componentsLoaded, setComponentsLoaded] = useState({
    burnGallery: false,
    threeDScene: false,
  });
  const [showSpotify, setShowSpotify] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [is80sMode, setIs80sMode] = useState(false);

  // Toggle function for 80s mode
  const toggle80sMode = () => {
    const newMode = !is80sMode;
    setIs80sMode(newMode);
    // Hide music player when entering 80s mode
    if (newMode) {
      setShowSpotify(false);
    } else {
      // Show MusicPlayer2 when exiting 80s mode
      setShowSpotify(true);
    }
    console.log("Gallery: 80's mode toggled to", newMode);
  };

  // Handle Boombox click
  const handleBoomboxClick = () => {
    if (is80sMode) {
      setShowSpotify(true);
    }
  };

  // Handle close for music player
  const handleClose = () => {
    // Always hide Spotify when closing the music player
    setShowSpotify(false);
  };

  // Add useEffect to set body class
  useEffect(() => {
    // Add gallery-page class to html and body
    document.documentElement.classList.add("gallery-page");
    document.body.classList.add("gallery-page");
    document.documentElement.style.backgroundColor = "#000000";
    document.body.style.backgroundColor = "#000000";

    // Cleanup function to remove class when component unmounts
    return () => {
      document.documentElement.classList.remove("gallery-page");
      document.body.classList.remove("gallery-page");
    };
  }, []);

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

  // In GalleryPage.js
  useEffect(() => {
    if (isModalOpen) {
      // Create the container if it doesn't exist
      let container = document.getElementById("oddcast-container");
      if (!container) {
        container = document.createElement("div");
        container.id = "oddcast-container";
        document.body.appendChild(container);
      }

      // Load Oddcast functions
      const functionScript = document.createElement("script");
      functionScript.src =
        "//vhss-d.oddcast.com/vhost_embed_functions_v4.php?acc=9157686&js=0";

      functionScript.onload = () => {
        if (typeof window.AC_VHost_Embed === "function") {
          window.AC_VHost_Embed(
            9157686,
            600,
            800,
            "",
            1,
            1,
            2771572,
            0,
            1,
            0,
            "PeyjLQTbroKvn5GemUFaLhU5dYbIHZH6",
            0,
            1
          );
        }
      };

      container.appendChild(functionScript);

      return () => {
        if (container) {
          container.innerHTML = "";
        }
      };
    }
  }, [isModalOpen]);

  return (
    <>
      <Head>
        <meta name="theme-color" content="#000000" />
        <style>{`
          html, body, #__next {
            background-color: #000000 !important;
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
          }
          
          /* Target any container with max-width */
          [style*="max-width"] {
            background-color: #000000 !important;
          }
          
          /* Ensure the entire viewport has a black background */
          html.gallery-page,
          body.gallery-page,
          .gallery-page,
          .gallery-page body,
          .gallery-page html,
          .gallery-page #__next,
          body.gallery-page #__next,
          html.gallery-page #__next {
            background-color: #000000 !important;
          }
          
          /* Center the header */
          #header {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          
          .menu-wrapper {
            display: flex;
            justify-content: center;
            width: 100%;
            position: relative;
          }
        `}</style>
      </Head>

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
        <div id="oddcast-container" style={{ display: "none" }}></div>

        {isLoading && <Loader />}
        <div
          style={{
            opacity: isLoading ? 0 : 1,
            transition: "opacity 0.5s ease-in-out",
            position: "relative",
            zIndex: 1,
          }}
        >
          <BurnGalleryDynamic
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
            onBoomboxClick={handleBoomboxClick}
          />

          {isModalOpen && (
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
                <script
                  async
                  type="text/javascript"
                  src="//vhss-d.oddcast.com/vhost_embed_functions_v4.php?acc=9157686&js=0"
                ></script>
                <script type="text/javascript">
                  AC_VHost_Embed(9157686,600,800,&quot;&quot;,1,1,2771572,0,1,0,&quot;q8ZaEpXFSepCuYqUKCKgCBXBz1Q5nqqi&quot;,0,1);
                </script>
              </div>
            </>
          )}

          {/* <div style={{ marginTop: "1rem" }}>
            <Communion3 />
          </div> */}
          <div id="magic8Modal" className="modal-overlay">
            <div className="magic-modal-content">
              <iframe
                src="/html/magic.html" // Make sure this path matches where you put the HTML file
                frameBorder="0"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "20px",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  overflow: "hidden", // Prevent content from spilling out
                }}
              />
            </div>
          </div>
          <div
            id="phoneModal"
            className="phone-modal-overlay"
            style={{ display: "none" }}
          >
            <div
              className="phone-modal-content"
              style={{
                transform: "scale(1.5)", // Adjust this value to scale up or down
                transformOrigin: "center center",
              }}
            >
              <iframe
                src="/html/phone_modal.html"
                frameBorder="0"
                style={{
                  width: "240px",
                  height: "480px",
                  borderRadius: "20px",
                  overflow: "hidden",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                }}
              />
            </div>
          </div>
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
  GalleryPage.theme = "dark";
}
