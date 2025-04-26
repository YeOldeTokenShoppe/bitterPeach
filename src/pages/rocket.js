import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import RocketSimulator from "../components/Rocket";

const RocketPage = () => {
  const router = useRouter();
  const iframeRef = useRef(null);
  const [warpActive, setWarpActive] = useState(false);
  const warpTimerRef = useRef(null);
  const hasNavigatedAwayRef = useRef(false);

  // Custom event listener to detect when warp speed is activated
  useEffect(() => {
    const handleWarpToggle = (event) => {
      const isWarping = event.detail.warpActive;
      setWarpActive(isWarping);
      
      // Clear any existing timer
      if (warpTimerRef.current) {
        clearTimeout(warpTimerRef.current);
        warpTimerRef.current = null;
      }
      
      // If warp is activated, set a timer to navigate
      if (isWarping) {
        warpTimerRef.current = setTimeout(() => {
          if (iframeRef.current) {
            // Remove the iframe from the document before navigation
            iframeRef.current.remove();
          }
          // Set flag that we've navigated away
          hasNavigatedAwayRef.current = true;
          window.location.href = "https://rl80.xyz"; // Replace with the actual external URL
        }, 8000); // Navigate after 8 seconds of warp speed
      }
    };

    window.addEventListener('warpToggled', handleWarpToggle);
    return () => {
      window.removeEventListener('warpToggled', handleWarpToggle);
      if (warpTimerRef.current) {
        clearTimeout(warpTimerRef.current);
      }
    };
  }, []);

  // Handle back button to redirect to gallery instead of back to rocket
  useEffect(() => {
    const handleBackButton = (e) => {
      // Only intercept back button if we've navigated away from this page previously
      if (hasNavigatedAwayRef.current) {
        // Prevent default back behavior
        e.preventDefault();
        // Navigate to gallery instead
        router.push('/gallery');
      }
    };

    // Listen for the popstate event (triggered when back button is pressed)
    window.addEventListener('popstate', handleBackButton);
    
    return () => {
      window.removeEventListener('popstate', handleBackButton);
    };
  }, [router]);

  return (
    <div>
      <RocketSimulator />
      {/* Hidden iframe for preloading */}
      <iframe
        ref={iframeRef}
        src="https://rl80.xyz" // Replace with the actual external URL
        style={{ display: "none" }}
        aria-hidden="true"
      />
    </div>
  );
};

export default RocketPage;

