// components/WordPressSlider.js
import React, { useEffect, useState, useRef } from "react";
import Loader from "./Loader";

const frameUrl = "https://rl80.com";

const WordPressSlider = ({ setWordPressSliderLoaded }) => {
  const iframeRef = useRef(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [contentReady, setContentReady] = useState(false);
  const maxAttempts = 3;
  const contentCheckInterval = useRef(null);

  useEffect(() => {
    // Function to handle iframe load event
    const handleIframeLoad = () => {
      console.log("✅ WordPress iframe loaded successfully");
      setIframeLoaded(true);

      // Start checking if content is actually ready
      startContentReadyCheck();

      // We'll still notify parent that iframe is loaded, but with a note that content might not be fully ready
      if (setWordPressSliderLoaded) {
        setWordPressSliderLoaded(true);
      }
    };

    // Function to handle iframe error
    const handleIframeError = () => {
      console.error("❌ WordPress iframe failed to load");
      setIframeError(true);

      // Increment loading attempts
      setLoadingAttempts((prev) => {
        const newAttempts = prev + 1;

        // If we've reached max attempts, force loaded state
        if (newAttempts >= maxAttempts) {
          console.warn(
            `⚠️ WordPress iframe failed after ${maxAttempts} attempts, forcing loaded state`
          );
          if (setWordPressSliderLoaded) {
            setWordPressSliderLoaded(true);
          }
        }

        return newAttempts;
      });
    };

    // Add load event listener to iframe
    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener("load", handleIframeLoad);
      iframe.addEventListener("error", handleIframeError);
    }

    // Fallback timeout in case the iframe load event doesn't fire
    const fallbackTimeout = setTimeout(() => {
      if (!iframeLoaded && !iframeError && setWordPressSliderLoaded) {
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
        iframe.removeEventListener("error", handleIframeError);
      }
      clearTimeout(fallbackTimeout);

      // Clean up content check interval
      if (contentCheckInterval.current) {
        clearInterval(contentCheckInterval.current);
      }
    };
  }, [setWordPressSliderLoaded, iframeLoaded, iframeError]);

  // Function to check if content is actually ready
  const startContentReadyCheck = () => {
    // Clear any existing interval
    if (contentCheckInterval.current) {
      clearInterval(contentCheckInterval.current);
    }

    let checkCount = 0;
    const maxChecks = 20; // Check up to 20 times (10 seconds total)

    contentCheckInterval.current = setInterval(() => {
      checkCount++;

      try {
        const iframe = iframeRef.current;
        if (!iframe || !iframe.contentDocument) {
          // Can't access iframe content (likely due to same-origin policy)
          console.log(
            "⚠️ Cannot access iframe content due to same-origin policy"
          );
          clearInterval(contentCheckInterval.current);
          return;
        }

        // Check for various indicators that content is ready
        const hasImages =
          iframe.contentDocument.querySelectorAll("img").length > 0;
        const hasLoadedImages = Array.from(
          iframe.contentDocument.querySelectorAll("img")
        ).every((img) => img.complete);

        // If we have images and they're all loaded, or we've checked enough times
        if ((hasImages && hasLoadedImages) || checkCount >= maxChecks) {
          console.log(
            `✅ WordPress content ready check: ${checkCount}/${maxChecks} checks`
          );
          setContentReady(true);
          clearInterval(contentCheckInterval.current);
        } else {
          console.log(
            `⏳ WordPress content still loading: ${checkCount}/${maxChecks} checks`
          );
        }
      } catch (error) {
        // Handle cross-origin errors
        console.warn(
          "⚠️ Cannot check iframe content due to cross-origin restrictions"
        );
        clearInterval(contentCheckInterval.current);
      }
    }, 500); // Check every 500ms
  };

  // Retry loading if we have an error and haven't reached max attempts
  useEffect(() => {
    if (iframeError && loadingAttempts < maxAttempts) {
      console.log(
        `🔄 Retrying WordPress iframe load (attempt ${
          loadingAttempts + 1
        }/${maxAttempts})`
      );

      // Reset error state
      setIframeError(false);

      // Force iframe reload
      if (iframeRef.current) {
        iframeRef.current.src = frameUrl;
      }
    }
  }, [iframeError, loadingAttempts]);

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
          position: "relative",
        }}
      >
        {iframeError && loadingAttempts >= maxAttempts && (
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
              color: "#e1b67e",
              textAlign: "center",
              padding: "20px",
            }}
          >
            <div>
              <h2>Unable to load content</h2>
              <p>
                Please try refreshing the page or check your internet
                connection.
              </p>
              <button
                onClick={() => {
                  setIframeError(false);
                  setLoadingAttempts(0);
                  if (iframeRef.current) {
                    iframeRef.current.src = frameUrl;
                  }
                }}
                style={{
                  marginTop: "20px",
                  padding: "10px 20px",
                  backgroundColor: "#e1b67e",
                  color: "#1b1724",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          id="wordpress-slider"
          src={frameUrl}
          width="100%"
          height="100%"
          style={{
            border: "none",
            margin: 0,
            padding: 0,
            opacity: iframeError ? 0 : 1,
            transition: "opacity 0.3s ease-in-out",
          }}
          allowFullScreen
          scrolling="no"
        />
      </div>
    </>
  );
};

export default WordPressSlider;
