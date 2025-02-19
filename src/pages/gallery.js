import React, { useState, useEffect } from "react";
import BurnGallery from "../components/BurnGallery";
import NavBar from "../components/NavBar.client";
import Communion3 from "../components/Communion3";
import Loader from "../components/Loader";
import MusicPlayer from "../components/MusicPlayer2";
import Draggable from "react-draggable";
import ScreenModal from "../components/3DVotiveStand/ScreenModal";
import { X } from "lucide-react";

import Header3 from "../components/Header3";
export default function GalleryPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [componentsLoaded, setComponentsLoaded] = useState({
    burnGallery: false,
    threeDScene: false,
  });
  const [showSpotify, setShowSpotify] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      <div style={{ visibility: "hidden", position: "absolute", zIndex: -1 }}>
        <iframe
          src="https://www.sitepal.com/geturl/?ss=2771572&sl=0&acc=9157686"
          style={{ width: 0, height: 0 }}
        />
      </div>

      <div style={{ backgroundColor: "#000000", minHeight: "100vh" }}>
        {isLoading && <Loader />}
        <div
          style={{
            opacity: isLoading ? 0 : 1,
            transition: "opacity 0.5s ease-in-out",
            position: "relative",
            zIndex: 1,
          }}
        >
          <BurnGallery
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
                <iframe
                  src="https://www.sitepal.com/geturl/?ss=2771572&sl=0&acc=9157686"
                  style={{
                    width: "600px", // Original width
                    height: "100%",
                    border: "none",
                    marginLeft: "-100px", // Center the wider iframe
                  }}
                  title="Character"
                />
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
