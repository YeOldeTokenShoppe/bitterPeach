// components/AdBlocker.jsx
import { useEffect, useRef } from "react";

export default function AdBlocker() {
  const cleanupRef = useRef(null);

  useEffect(() => {
    // Run only in browser
    if (typeof window === "undefined") return;

    // List of ad domains to block
    const adDomains = [
      "googleads",
      "doubleclick.net",
      "googlesyndication",
      "adsbygoogle",
      "googleadservices",
      "zrt_lookup",
    ];

    console.log("[AdBlocker] Initialized");

    const cleanupAds = () => {
      // Remove scripts
      const scripts = document.querySelectorAll("script");
      scripts.forEach((script) => {
        const src = script.src.toLowerCase();
        if (adDomains.some((domain) => src.includes(domain))) {
          console.info("[AdBlocker] Removing ad script:", script.src);
          script.remove();
        }
      });

      // Remove iframes
      const iframes = document.querySelectorAll("iframe");
      iframes.forEach((iframe) => {
        const src = iframe.src.toLowerCase();
        if (adDomains.some((domain) => src.includes(domain))) {
          console.info("[AdBlocker] Removing ad iframe:", iframe.src);
          iframe.remove();
        }
      });

      // Remove inline scripts that contain ad-related text
      const inlineScripts = document.querySelectorAll("script:not([src])");
      inlineScripts.forEach((script) => {
        const content = script.textContent?.toLowerCase() || "";
        if (adDomains.some((domain) => content.includes(domain))) {
          console.info("[AdBlocker] Removing inline ad script");
          script.remove();
        }
      });
    };

    // Initial cleanup
    cleanupAds();

    // Watch for dynamic insertions
    const observer = new MutationObserver((mutations) => {
      let shouldCleanup = false;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Element node
            const element = node;
            if (
              element.tagName === "SCRIPT" ||
              element.tagName === "IFRAME" ||
              element.querySelector("script, iframe")
            ) {
              shouldCleanup = true;
            }
          }
        });
      });

      if (shouldCleanup) {
        cleanupAds();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    // Network request interception
    const originalFetch = window.fetch;
    window.fetch = async function (input, init) {
      let url = "";
      if (typeof input === "string") {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
      }

      if (
        url &&
        adDomains.some((domain) => url.toLowerCase().includes(domain))
      ) {
        console.info("[AdBlocker] Blocking fetch request to:", url);
        return new Response("", { status: 200 });
      }

      return originalFetch.apply(this, [input, init]);
    };

    const originalXHR = window.XMLHttpRequest.prototype.open;
    window.XMLHttpRequest.prototype.open = function (method, url, ...args) {
      if (
        url &&
        typeof url === "string" &&
        adDomains.some((domain) => url.toLowerCase().includes(domain))
      ) {
        console.info("[AdBlocker] Blocking XHR request to:", url);
        // Redirect to empty response
        return originalXHR.call(this, method, "about:blank", ...args);
      }

      return originalXHR.call(this, method, url, ...args);
    };

    cleanupRef.current = () => {
      observer.disconnect();
      window.fetch = originalFetch;
      window.XMLHttpRequest.prototype.open = originalXHR;
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // This component doesn't render anything
  return null;
}
