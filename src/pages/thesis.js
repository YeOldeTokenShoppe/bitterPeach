// pages/thesis.js
import React, { useState, useEffect, useMemo } from "react";
import Thesis from "../components/Thesis";
import NavBar from "../components/NavBar.client";
import Footer from "../components/Footer";
import Loader from "../components/Loader";

export default function ThesisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [thesisLoaded, setThesisLoaded] = useState(false);
  const [communionLoaded, setCommunionLoaded] = useState(false);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  // List of critical images to preload for the thesis page
  const criticalImages = useMemo(
    () => [
      // Add your critical thesis page images here
      // For example:
      "/3D_spotify.png",
      "/3D_tiktok.png",
      "/3d_discord.png",
      "/3d_X.png",
      "/3d_instagram.png",
      "/3d_tg2.png",
      // Add any thesis-specific images
    ],
    []
  );

  // Preload all critical images
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = criticalImages.length;

    const preloadImage = (src) => {
      return new Promise((resolve) => {
        // Use window.Image instead of Image to avoid conflict
        const img = typeof window !== "undefined" ? new window.Image() : null;

        if (!img) {
          console.warn("Window not available, skipping image preload");
          resolve(false);
          return;
        }

        img.onload = () => {
          loadedCount++;
          console.log(`Loaded image ${loadedCount}/${totalImages}: ${src}`);
          resolve(true);
        };
        img.onerror = () => {
          console.error(`Failed to load image: ${src}`);
          loadedCount++;
          resolve(false);
        };
        img.src = src;
      });
    };

    Promise.all(criticalImages.map(preloadImage))
      .then(() => {
        console.log("All critical images preloaded for thesis page");
        setAllImagesLoaded(true);
      })
      .catch((err) => {
        console.error("Error preloading images:", err);
        // Still set as loaded after timeout to prevent hanging
        setTimeout(() => setAllImagesLoaded(true), 3000);
      });
  }, [criticalImages]);

  // Force loader to hide after timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("⚠️ Loading timed out, forcing page to show");
        setIsLoading(false);
      }
    }, 8000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Only hide loader when all components are loaded
  useEffect(() => {
    if (thesisLoaded && communionLoaded && allImagesLoaded) {
      console.log("✅ All components and images loaded, showing thesis page");
      setIsLoading(false);
    }
  }, [thesisLoaded, communionLoaded, allImagesLoaded]);

  return (
    <div style={{ marginTop: "2rem", position: "relative" }}>
      {/* Always render the content, but control visibility with CSS */}
      <div
        style={{
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.5s ease-in-out",
          visibility: isLoading ? "hidden" : "visible",
        }}
      >
        <Thesis setThesisLoaded={setThesisLoaded} />
        <div style={{ paddingTop: "1rem", marginTop: "4rem" }}>
          <NavBar />
        </div>
        <Footer setCommunionLoaded={setCommunionLoaded} />
      </div>

      {/* Loader on top */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
          }}
        >
          <Loader />
        </div>
      )}
    </div>
  );
}
