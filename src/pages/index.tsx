"use client";

import React, { useState, useEffect, useMemo } from "react";
import WordPressSlider from "../components/WordPressSlider";
import RotatingBadge from "../components/RotatingBadge";
import Link from "next/link";
import Magic8BallLoader from "../components/Magic8BallLoader";

export default function Page() {
  const [isLoading, setIsLoading] = useState(true);
  const [wordPressSliderLoaded, setWordPressSliderLoaded] = useState(false);
  const [badgeLoaded, setBadgeLoaded] = useState(false);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState("initializing");
  const [showContent, setShowContent] = useState(false);
  const [contentOpacity, setContentOpacity] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // List of critical images to preload for the index page
  const criticalImages = [
    // Add your critical index page images here
    // For example:
    "/nuhart1.svg", // Badge image
    // Add any other critical images
  ];

  useEffect(() => {
    const handleIframeMessage = (event: MessageEvent) => {
      // Only accept messages from the trusted iframe origin
      if (event.origin !== "https://ourlady.io") return;
  
      if (event.data?.type === "redirect-home") {
        window.location.href = "/home"; // Or use full path if needed
      }
    };
  
    window.addEventListener("message", handleIframeMessage);
    return () => window.removeEventListener("message", handleIframeMessage);
  }, []);

  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Check initially
    checkMobile();

    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Combined loading progress effect
  useEffect(() => {
    console.log("Loading state:", { wordPressSliderLoaded, loadingProgress, loadingStage });
    
    if (!wordPressSliderLoaded) {
      // Start with a small initial progress
      setLoadingProgress(5);
      setLoadingStage("connecting to wordpress");

      // Simulate gradual progress while waiting for the iframe
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          // Slow down as it approaches the expected completion
          const increment = prev < 30 ? 2 : prev < 60 ? 1 : 0.5;
          const newProgress = Math.min(prev + increment, 70);
          console.log("Progress update:", { prev, newProgress });
          return newProgress;
        });
      }, 200);

      // Add a fallback timeout to ensure the page loads
      const fallbackTimeout = setTimeout(() => {
        console.log("Fallback: WordPress loading timed out, forcing completion");
        setWordPressSliderLoaded(true);
      }, 10000); // 10 second timeout

      return () => {
        clearInterval(progressInterval);
        clearTimeout(fallbackTimeout);
      };
    } else {
      // WordPress is loaded, set to 100%
      console.log("WordPress loaded, setting to 100%");
      setLoadingProgress(100);
      setLoadingStage("complete");
    }
  }, [wordPressSliderLoaded]);

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
        const img = new Image();
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

  // Handle transition from loading to content - simplified to focus on WordPress loading
  useEffect(() => {
    if (wordPressSliderLoaded) {
      console.log("✅ WordPress content loaded, preparing to show page");

      // Add a small delay for smoother transition
      setTimeout(() => {
        // First show the content container (but keep it invisible)
        setShowContent(true);

        // After a short delay, hide the loader and fade in content
        setTimeout(() => {
          setIsLoading(false);
          setContentOpacity(1);
        }, 500);
      }, 500);
    }
  }, [wordPressSliderLoaded]);

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
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#1b1724",
            zIndex: 50,
            transition: "opacity 0.5s ease-out",
            opacity: isLoading ? 1 : 0,
          }}
        >
          <Magic8BallLoader 
            isLoading={isLoading}
            loadingProgress={loadingProgress}
            onComplete={() => {
              console.log("Magic8BallLoader onComplete called");
            }}
          />
          <div
            style={{
              color: "#e1b67e",
              marginTop: "20px",
              fontSize: "14px",
              textAlign: "center",
              maxWidth: "80%",
            }}
          >
            {loadingStage === "initializing" && "Initializing..."}
            {loadingStage === "connecting to wordpress" &&
              "Connecting to WordPress..."}
            {loadingStage === "wordpress loaded" &&
              "WordPress content loaded..."}
            {loadingStage === "badge loaded" && "Badge loaded..."}
            {loadingStage === "images loaded" && "Images loaded..."}
            {loadingStage === "complete" && "Loading complete!"}
          </div>
        </div>
      )}

      {/* Main Content */}
      {showContent && (
        <div
          style={{
            opacity: contentOpacity,
            transition: "opacity 0.8s ease-in",
            width: "100vw",
            minHeight: "100vh",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: "100%",
              margin: "0",
              padding: "0",
              position: "relative",
            }}
          >
            <WordPressSlider
              setWordPressSliderLoaded={(loaded: boolean) => {
                console.log("WordPressSlider loaded state changed:", loaded);
                setWordPressSliderLoaded(loaded);
              }}
            />
          </div>
          <Link
            href="/home"
            style={{
              textDecoration: "none",
              position: "absolute",
              top: isMobile ? "unset" : "2rem",
              bottom: isMobile ? "4rem" : "unset",
              right: isMobile ? "1rem" : "2rem",
              zIndex: 9999,
            }}
          >
            <RotatingBadge setBadgeLoaded={setBadgeLoaded} />
          </Link>
        </div>
      )}
    </div>
  );
}
