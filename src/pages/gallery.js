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

import Header3 from "../components/Header3";

// Dynamically import heavy components
const BurnGalleryDynamic = dynamic(() => import("../components/BurnGallery"), {
  ssr: false,
  loading: () => <Loader />,
});

const MusicPlayerDynamic = dynamic(() => import("../components/MusicPlayer2"), {
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
  const [showSpotify, setShowSpotify] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  const handleClose = () => {
    setShowSpotify(false);
  };

  // In GalleryPage.js
  useEffect(() => {
    if (isModalOpen) {
      const container = document.getElementById("oddcast-container");
      if (!container) return;

      // Load Oddcast functions
      const functionScript = document.createElement("script");
      functionScript.src =
        "//vhss-d.oddcast.com/vhost_embed_functions_v4.php?acc=9157686&js=0";

      functionScript.onload = () => {
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
      };

      container.appendChild(functionScript);

      return () => {
        container.innerHTML = "";
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
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
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
                  type="text/javascript"
                  src="//vhss-d.oddcast.com/vhost_embed_functions_v4.php?acc=9157686&js=0"
                ></script>
                <script type="text/javascript">
                  AC_VHost_Embed(9157686,600,800,"",1,1,2771572,0,1,0,"q8ZaEpXFSepCuYqUKCKgCBXBz1Q5nqqi",0,1);
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
          <div
            style={{
              position: "fixed",
              bottom: "6rem",
              right: "4rem",
              // width: "8rem",
              // height: "8rem",
              zIndex: 1000,
              borderRadius: "12px",
              // overflow: "hidden",
              boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
              opacity: showSpotify ? 1 : 0,
              transform: `scale(0.6) translateY(${showSpotify ? 0 : "20px"})`,
              transition: "opacity 0.3s ease, transform 0.3s ease",
              pointerEvents: showSpotify ? "auto" : "none",
              cursor: "move",
            }}
          >
            {/* <MusicPlayer isVisible={showSpotify} onClose={handleClose} /> */}
            {/* <iframe
              src="https://open.spotify.com/embed/playlist/5wWiiVDG0Q83zVitjPf6fj?utm_source=generator"
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen=""
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            /> */}
          </div>
          {/* </Draggable> */}
        </div>
      </div>
    </>
  );
  GalleryPage.theme = "dark";
}
