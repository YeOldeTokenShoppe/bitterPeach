// components/WordPressSlider.js
import React, { useEffect, useState, useRef } from "react";
import Loader from "./Loader";

const frameUrl = "https://ourlady.io";
const proxyBaseUrl = "https://us-central1-hailmary-3ff6c.cloudfunctions.net/proxy";

const WordPressSlider = ({ setWordPressSliderLoaded }) => {
  const iframeRef = useRef(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const [loadingAttempts, setLoadingAttempts] = useState(0);
  const [contentReady, setContentReady] = useState(false);
  const maxAttempts = 3;
  const contentCheckInterval = useRef(null);

  // Function to inject proxy script into iframe
  const injectProxyScript = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const script = iframe.contentDocument.createElement('script');
    script.textContent = `
      // Override XMLHttpRequest
      const originalXHR = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        const xhr = new originalXHR();
        const originalOpen = xhr.open;
        
        xhr.open = function(method, url, ...args) {
          if (url.includes('rl80.com') || url.includes('ourlady.io')) {
            const proxiedUrl = '${proxyBaseUrl}/' + url.replace(/^https?:\\/\\//, '');
            return originalOpen.call(this, method, proxiedUrl, ...args);
          }
          return originalOpen.call(this, method, url, ...args);
        };
        
        return xhr;
      };

      // Override fetch
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
        if (typeof url === 'string' && (url.includes('rl80.com') || url.includes('ourlady.io'))) {
          const proxiedUrl = '${proxyBaseUrl}/' + url.replace(/^https?:\\/\\//, '');
          return originalFetch(proxiedUrl, options);
        }
        return originalFetch(url, options);
      };

      // Override image src
      const originalImage = window.Image;
      window.Image = function() {
        const img = new originalImage();
        const originalSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        
        Object.defineProperty(img, 'src', {
          get: function() {
            return originalSrc.get.call(this);
          },
          set: function(url) {
            if (url.includes('rl80.com') || url.includes('ourlady.io')) {
              const proxiedUrl = '${proxyBaseUrl}/' + url.replace(/^https?:\\/\\//, '');
              return originalSrc.set.call(this, proxiedUrl);
            }
            return originalSrc.set.call(this, url);
          }
        });
        
        return img;
      };
    `;
    iframe.contentDocument.head.appendChild(script);
  };

  // Function to handle iframe content
  const handleIframeContent = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    // Find all elements with src or href attributes
    const elements = iframe.contentDocument.querySelectorAll('[src], [href]');
    elements.forEach(element => {
      const url = element.src || element.href;
      if (url && (url.includes('ourlady.io') || url.includes('rl80.com'))) {
        const proxiedUrl = proxyResource(url);
        if (element.src) element.src = proxiedUrl;
        if (element.href) element.href = proxiedUrl;
      }
    });

    // Find all elements with background-image style
    const elementsWithBg = iframe.contentDocument.querySelectorAll('[style*="background-image"]');
    elementsWithBg.forEach(element => {
      const style = element.getAttribute('style');
      const urlMatch = style.match(/url\(['"]?(https:\/\/[^'")]+)['"]?\)/);
      if (urlMatch && (urlMatch[1].includes('ourlady.io') || urlMatch[1].includes('rl80.com'))) {
        const proxiedUrl = proxyResource(urlMatch[1]);
        element.style.backgroundImage = `url('${proxiedUrl}')`;
      }
    });
  };

  useEffect(() => {
    // Function to handle iframe load event
    const handleIframeLoad = () => {
      console.log("✅ WordPress iframe loaded successfully");
      setIframeLoaded(true);

      // Inject proxy script
      injectProxyScript();

      // Handle iframe content after load
      handleIframeContent();

      // Start checking if content is actually ready
      startContentReadyCheck();

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
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          referrerPolicy="no-referrer"
        />
      </div>
    </>
  );
};

export default WordPressSlider;
