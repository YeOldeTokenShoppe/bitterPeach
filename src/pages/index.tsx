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

  // Simulate loading progress for the WordPress iframe
  useEffect(() => {
    if (!wordPressSliderLoaded) {
      // Start with a small initial progress
      setLoadingProgress(5);
      setLoadingStage("connecting to wordpress");

      // Simulate gradual progress while waiting for the iframe
      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          // Slow down as it approaches the expected completion
          const increment = prev < 30 ? 2 : prev < 60 ? 1 : 0.5;
          return Math.min(prev + increment, 70);
        });
      }, 200);

      return () => clearInterval(progressInterval);
    }
  }, [wordPressSliderLoaded]);

  // Update loading progress based on component states
  useEffect(() => {
    if (wordPressSliderLoaded) {
      setLoadingProgress((prev) => Math.max(prev, 70));
      setLoadingStage("wordpress loaded");
    }

    if (badgeLoaded) {
      setLoadingProgress((prev) => Math.max(prev, 85));
      setLoadingStage("badge loaded");
    }

    if (allImagesLoaded) {
      setLoadingProgress((prev) => Math.max(prev, 95));
      setLoadingStage("images loaded");
    }

    // When all components are loaded, set to 100%
    if (wordPressSliderLoaded && badgeLoaded && allImagesLoaded) {
      setLoadingProgress(100);
      setLoadingStage("complete");
    }
  }, [wordPressSliderLoaded, badgeLoaded, allImagesLoaded]);

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

  // Force loader to hide after timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("⚠️ Loading timed out, forcing page to show");
        setIsLoading(false);
        setShowContent(true);

        // Fade in content after a short delay
        setTimeout(() => {
          setContentOpacity(1);
        }, 100);
      }
    }, 15000); // 15 second maximum wait time

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Handle transition from loading to content
  useEffect(() => {
    if (wordPressSliderLoaded && allImagesLoaded && badgeLoaded) {
      console.log("✅ All components and images loaded, showing index page");

      // First show the content container (but keep it invisible)
      setShowContent(true);

      // Add a small delay for smoother transition
      setTimeout(() => {
        // Hide the loader
        setIsLoading(false);

        // After loader is hidden, fade in the content
        setTimeout(() => {
          setContentOpacity(1);
        }, 500);
      }, 500);
    } else if (loadingProgress >= 95) {
      // If we're at 95% or higher, we can show the page even if not everything is loaded
      console.log(
        "⚠️ Showing page at high progress but not all components loaded"
      );

      // First show the content container (but keep it invisible)
      setShowContent(true);

      setTimeout(() => {
        // Hide the loader
        setIsLoading(false);

        // After loader is hidden, fade in the content
        setTimeout(() => {
          setContentOpacity(1);
        }, 500);
      }, 500);
    }
  }, [wordPressSliderLoaded, allImagesLoaded, badgeLoaded, loadingProgress]);

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
          <Loader progress={loadingProgress} />
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
              setWordPressSliderLoaded={setWordPressSliderLoaded}
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
