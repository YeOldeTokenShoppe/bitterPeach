"use client";

import React, { useState, useEffect, useMemo } from "react";
import WordPressSlider from "../components/WordPressSlider";
import RotatingBadge from "../components/RotatingBadge";
import Link from "next/link";
import Loader from "../components/Loader";

export default function Page() {
  const [isLoading, setIsLoading] = useState(true);
  const [wordPressSliderLoaded, setWordPressSliderLoaded] = useState(false);
  const [badgeLoaded, setBadgeLoaded] = useState(false);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);

  // Calculate loading progress based on component loading states
  const loadingProgress = useMemo(() => {
    let progress = 0;

    // Each component contributes to the total loading progress
    if (wordPressSliderLoaded) progress += 40; // WordPress slider is 40% of loading
    if (badgeLoaded) progress += 30; // Badge is 30% of loading
    if (allImagesLoaded) progress += 30; // Images are 30% of loading

    return Math.min(99, Math.round(progress)); // Cap at 99% until fully loaded
  }, [wordPressSliderLoaded, badgeLoaded, allImagesLoaded]);

  // List of critical images to preload for the index page
  const criticalImages = useMemo(
    () => [
      // Add your critical index page images here
      // For example:
      "/rotating-badge.png", // If your RotatingBadge uses this image
      "/nuhart1.svg", // Badge image
      // Coin images
      "/coinFront.png",
      "/coinBack1.png",
      // VVV image
      "/vvv.jpg",
      // Add any other critical images
    ],
    []
  );

  // Preload all critical images
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = criticalImages.length;

    // If there are no critical images, mark as loaded
    if (totalImages === 0) {
      setAllImagesLoaded(true);
      return;
    }

    const preloadImage = (src: string) => {
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
        console.log("All critical images preloaded for index page");
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
    }, 12000); // 12 second maximum wait time

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Only hide loader when all components are loaded
  useEffect(() => {
    if (wordPressSliderLoaded && allImagesLoaded && badgeLoaded) {
      console.log("✅ All components and images loaded, showing index page");

      // Add a small delay for smoother transition
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [wordPressSliderLoaded, allImagesLoaded, badgeLoaded]);

  return (
    <div>
      {/* Loader */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#1b1724",
            zIndex: 50,
            transition: "opacity 0.5s ease-out",
            opacity: isLoading ? 1 : 0,
          }}
        >
          <Loader progress={loadingProgress} />
        </div>
      )}

      {/* Main Content */}
      <div
        style={{
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.5s ease-in",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",

            margin: "auto",
            position: "absolute",
          }}
        >
          <WordPressSlider
            setWordPressSliderLoaded={setWordPressSliderLoaded}
          />
        </div>
        <Link
          href="/home"
          style={{
            textDecoration: "none",
            position: "absolute",
            top: "2rem",
            right: "2rem",
          }}
        >
          <RotatingBadge setBadgeLoaded={setBadgeLoaded} />
        </Link>
      </div>
    </div>
  );
}
