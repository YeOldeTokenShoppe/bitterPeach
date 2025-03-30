// This component should replace your current SitePal iframe implementation
// It follows SitePal's official recommendation for React/Next.js

import React, { useEffect, useRef } from "react";
import { Box } from "@chakra-ui/react";

const SitePalComponent = ({ onReady }) => {
  const containerRef = useRef(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Check if we're in browser environment
    if (typeof window === "undefined") return;

    console.log("SitePal: Beginning initialization...");

    // Create the container div if it doesn't exist
    if (!document.getElementById("vhss_aiPlayer")) {
      const aiPlayerDiv = document.createElement("div");
      aiPlayerDiv.id = "vhss_aiPlayer";
      containerRef.current.appendChild(aiPlayerDiv);
      console.log("SitePal: Created vhss_aiPlayer div");
    }

    // Load the embed script dynamically
    const script1 = document.createElement("script");
    script1.type = "text/javascript";
    script1.src = "//vhss-d.oddcast.com/ai_embed_functions_v1.php";
    document.body.appendChild(script1);
    console.log("SitePal: Added main script to document body");

    // Load the AI embed function after the script is loaded
    script1.onload = () => {
      console.log("SitePal: Main script loaded, initializing AI embed...");

      const script2 = document.createElement("script");
      script2.type = "text/javascript";
      // Update these parameters with your specific SitePal values
      script2.innerHTML = "AI_vhost_embed(800,600,9157686,244,0,1);";
      document.body.appendChild(script2);
      console.log("SitePal: Added initialization script");

      // Notify parent that SitePal is ready
      if (onReady) {
        setTimeout(() => {
          console.log(
            "SitePal: Notifying parent component that SitePal is ready"
          );
          onReady();
        }, 1000); // Give it a second to initialize
      }

      // Add listener for microphone button - you'll need to modify this
      // based on what elements SitePal creates
      setTimeout(() => {
        setupMicButtonListener();
      }, 2000);
    };

    return () => {
      // Cleanup function
      console.log("SitePal: Cleaning up");
      // You might want to remove the scripts on unmount
      // This depends on how SitePal should behave when the component unmounts
    };
  }, [onReady]);

  // Function to set up listener for mic button clicks
  const setupMicButtonListener = () => {
    console.log("SitePal: Setting up mic button listener");
    // Look for elements with classes that might be related to the mic button
    const possibleMicButtons = document.querySelectorAll(
      '[class*="mic"], [id*="mic"]'
    );
    console.log(
      `SitePal: Found ${possibleMicButtons.length} possible mic buttons`
    );

    possibleMicButtons.forEach((button, index) => {
      console.log(`SitePal: Adding listener to button ${index}`);
      button.addEventListener("click", () => {
        console.log("SitePal: Mic button clicked");
        // You could dispatch an event here to notify your React component
        window.dispatchEvent(new CustomEvent("sitepal-mic-clicked"));
      });
    });
  };

  return (
    <Box
      ref={containerRef}
      width="100%"
      height="100%"
      position="relative"
      overflow="hidden"
    >
      {/* SitePal will initialize here through the scripts */}
    </Box>
  );
};

export default SitePalComponent;
