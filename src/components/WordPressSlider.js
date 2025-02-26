// components/WordPressSlider.js
import React, { useEffect, useState, useRef } from "react";
import Loader from "./Loader";

const frameUrl = "https://rl80.com";

const WordPressSlider = ({ setWordPressSliderLoaded }) => {
  const iframeRef = useRef(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    // Function to handle iframe load event
    const handleIframeLoad = () => {
      console.log("✅ WordPress iframe loaded successfully");
      setIframeLoaded(true);
      if (setWordPressSliderLoaded) {
        setWordPressSliderLoaded(true);
      }
    };

    // Add load event listener to iframe
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener("load", handleIframeLoad);
    }

    // Fallback timeout in case the iframe load event doesn't fire
    const fallbackTimeout = setTimeout(() => {
      if (!iframeLoaded && setWordPressSliderLoaded) {
        console.warn(
          "⚠️ WordPress iframe load timed out, forcing loaded state"
        );
        setWordPressSliderLoaded(true);
      }
    }, 8000); // 8 second fallback

    return () => {
      // Clean up event listener and timeout
      if (iframe) {
        iframe.removeEventListener("load", handleIframeLoad);
      }
      clearTimeout(fallbackTimeout);
    };
  }, [setWordPressSliderLoaded, iframeLoaded]);

  return (
    <>
      <div
        style={{
          width: "100%",
          height: "100vh",
          overflow: "hidden",
          margin: 0,
          padding: 0,
          zIndex: 1,
        }}
      >
        <iframe
          ref={iframeRef}
          id="wordpress-slider"
          src={frameUrl}
          width="100%"
          height="100%"
          style={{ border: "none", margin: 0, padding: 0 }}
          allowFullScreen
          scrolling="no"
        />
      </div>
    </>
  );
};

export default WordPressSlider;
