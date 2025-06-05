"use client";
import React, { useState, useEffect, useMemo } from "react";
import Hero from "../components/Hero";
import Header from "../components/Header";
import NavBar from "../components/NavBar.client";
import Footer from "../components/Footer";
import Carousel from "../components/Carousel";
import dynamic from "next/dynamic";
import Magic8BallLoader from "../components/Magic8BallLoader";

const BurningEffect = dynamic(() => import("../components/BurningEffect"), {
  ssr: false,
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(true); // Track the overall loading state
  const [heroLoaded, setHeroLoaded] = useState(false); // Track when Hero is loaded
  const [communionLoaded, setCommunionLoaded] = useState(false); // Track when Communion is loaded
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // List of critical images to preload for the home page
  const criticalImages = useMemo(
    () => [
      // Add your critical home page images here
      // For example:
      // "/logo.png",

      "/3d_spotify.png",
      "/3D_tiktok.png",
      "/3d_discord.png",
      "/3D_X.png",
      "/3d_instagram.png",
      "/3d_tg2.png",
      // Coin images
      "/coinFront.png",
      "/coinBack1.png",
      // VVV image
      "/vvv.jpg",
    ],
    []
  ); // Empty dependency array means this will only be created once

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
          // Update loading progress based on images loaded
          setLoadingProgress((loadedCount / totalImages) * 100);
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
        console.log("All critical images preloaded for home page");
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
    if (heroLoaded && communionLoaded && allImagesLoaded) {
      console.log("✅ All components and images loaded, showing home page");
      setLoadingProgress(100);
      // Add a small delay before hiding the loader
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [heroLoaded, communionLoaded, allImagesLoaded]);

  return (
    <>
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            backgroundColor: "#1b1724",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Magic8BallLoader 
            isLoading={isLoading}
            loadingProgress={loadingProgress}
            onComplete={() => {
              if (heroLoaded && communionLoaded && allImagesLoaded) {
                setIsLoading(false);
              }
            }}
          />
        </div>
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: "4rem",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.5s ease-in-out",
          visibility: isLoading ? "hidden" : "visible",
        }}
      >
        <Hero setHeroLoaded={setHeroLoaded} />
        <NavBar />
      </div>
      <Footer setCommunionLoaded={setCommunionLoaded} />
    </>
  );
}