"use client";

import React, { useState, useEffect } from "react";
import WordPressSlider from "../components/WordPressSlider";
import RotatingBadge from "../components/RotatingBadge";
import Link from "next/link";
import Loader from "../components/Loader";

export default function Page() {
  const [isLoading, setIsLoading] = useState(true);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    // Simulate content loading
    const timeout = setTimeout(() => {
      setContentReady(true); // Mark content as ready
    }, 3000); // Simulate a 3-second load time

    return () => clearTimeout(timeout); // Cleanup timeout
  }, []);

  useEffect(() => {
    if (contentReady) {
      const fadeOutTimeout = setTimeout(() => {
        setIsLoading(false); // Fade out the loader after content is ready
      }, 500); // Delay fade-out slightly for smooth transition

      return () => clearTimeout(fadeOutTimeout); // Cleanup timeout
    }
  }, [contentReady]);

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
            backgroundColor: "rgba(255, 255, 255, 1)",
            zIndex: 50,
            transition: "opacity 0.5s ease-out",
            opacity: isLoading ? 1 : 0,
          }}
        >
          <Loader />
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
            width: "100%",
            margin: "auto",
            position: "absolute",
          }}
        >
          <WordPressSlider />
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
          <RotatingBadge />
        </Link>
      </div>
    </div>
  );
}
