import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const JunkyardScene = dynamic(() => import('../components/JunkyardScene'), {
  ssr: false,
  loading: () => <div style={{ width: '100vw', height: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>Loading Junkyard...</div>
});

export default function JunkyardPage() {
  const [isMobileView, setIsMobileView] = useState(false);
  const [isDefinitelyPhone, setIsDefinitelyPhone] = useState(false);

  // Detect if device is actually a phone (not tablet or desktop)
  const detectMobileDevice = useCallback(() => {
    const userAgent = navigator.userAgent || window.opera;
    const lowerUA = userAgent.toLowerCase();
    
    // More comprehensive mobile detection
    const isIPhone = /iphone/i.test(lowerUA);
    const isIPad = /ipad/i.test(lowerUA);
    const isAndroid = /android/i.test(lowerUA);
    const hasMobileKeyword = /mobile/i.test(lowerUA);
    
    // Check screen properties
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    
    // Physical screen size (accounting for pixel ratio)
    const physicalWidth = screenWidth / pixelRatio;
    const physicalHeight = screenHeight / pixelRatio;
    
    // Touch capability
    const hasTouch = 'ontouchstart' in window || 
                    navigator.maxTouchPoints > 0 || 
                    navigator.msMaxTouchPoints > 0;
    
    // Simple phone detection: iPhone or (Android + Mobile keyword)
    const isPhoneUA = isIPhone || (isAndroid && hasMobileKeyword);
    
    // Size check: viewport OR physical size small enough
    const hasPhoneSize = Math.min(innerWidth, innerHeight) < 600 || 
                        Math.min(physicalWidth, physicalHeight) < 400;
    
    // Final decision
    const isMobile = isPhoneUA && hasTouch && hasPhoneSize;
    
    return isMobile;
  }, []);

  // Initial detection - run once on mount
  useEffect(() => {
    // Check for force mobile parameter (for testing)
    const urlParams = new URLSearchParams(window.location.search);
    const forceMobile = urlParams.get('mobile') === 'true';
    
    if (forceMobile) {
      setIsDefinitelyPhone(true);
      setIsMobileView(true);
      return;
    }
    
    // Use the same strict detection on initial load
    const isMobile = detectMobileDevice();
    
    if (isMobile) {
      setIsDefinitelyPhone(true);
      setIsMobileView(true);
    } else {
      setIsDefinitelyPhone(false);
      setIsMobileView(false);
    }
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      // If we've already determined it's a phone, keep mobile view
      if (isDefinitelyPhone) {
        setIsMobileView(true);
        return;
      }
      
      // Otherwise, do normal detection
      const isMobile = detectMobileDevice();
      setIsMobileView(isMobile);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [isDefinitelyPhone, detectMobileDevice]);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* RL80 Text with 3D effect */}
      <div className="textLight" id="textLight" style={{
        position: "absolute",
        top: "20px", 
        left: "20px",
        zIndex: 100,
        borderRadius: "8px",
        padding: "10px",
        pointerEvents: "auto"
      }}>
        <div 
          id="text"
          style={{
            position: "relative",
            fontFamily: "'UnifrakturMaguntia', cursive",
            fontSize: isMobileView ? "3rem" : "4rem",
            color: "#ffffff",
            cursor: "pointer"
          }}
        >
          <Link href="/home" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
            RL80
          </Link>
          {Array.from({length: 100}).map((_, i) => {
            const index = i + 1;
            return (
              <div
                key={index}
                className="text__copy"
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  zIndex: -1,
                  top: 0,
                  left: 0,
                  color: `rgba(${255 - index * 2}, ${255 - index * 3}, ${255 - index * 2})`,
                  filter: "blur(0.1rem)",
                  transform: `translate(
                    ${index * 0.1}rem, 
                    ${index * 0.1}rem
                  ) scale(${1 + index * 0.01})`,
                  opacity: (1 / index) * 1.5,
                }}
              >
                RL80
              </div>
            );
          })}
        </div>
      </div>
      
      <JunkyardScene />
    </div>
  );
}