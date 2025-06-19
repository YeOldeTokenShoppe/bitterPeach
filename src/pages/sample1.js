import React, { useState, useCallback } from "react";
import SkullMirrorViewer from "../components/3DVotiveStand/MirrorView";
import SynthRoad from "../components/3DVotiveStand/SynthRoad";
import PalmTreeDrive from "../components/PalmTreeDrive";
import NoiseParticleEffect from "../components/NoiseParticleEffect";
import BookAnimation from "../components/Book";
import Synthwave from "../components/Synthwave";
import PalmTreeIsland from "../components/PalmTreeIsland";
import Link from "next/link";





export default function SamplePage() {

  const [isLoading, setIsLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);

    // Detect if device is actually a phone (not tablet or desktop)
    const detectMobileDevice = useCallback(() => {
        // Get all the info for debugging
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
        
        // Enhanced logging
        // console.log('📱 Enhanced Mobile Detection:', {
        //   userAgent: userAgent,
        //   isIPhone,
        //   isIPad,
        //   isAndroid,
        //   hasMobileKeyword,
        //   hasTouch,
        //   screen: { width: screenWidth, height: screenHeight },
        //   viewport: { width: innerWidth, height: innerHeight },
        //   physical: { width: physicalWidth, height: physicalHeight },
        //   pixelRatio,
        //   hasPhoneSize,
        //   isPhoneUA,
        //   RESULT: isMobile
        // });
        
        
        return isMobile;
      }, []);
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
         <div className="textLight" id="textLight" style={{
          position: "absolute",
          top: "20px", 
          left: "20px",
          zIndex: 100, // Ensure it's above the scene if opaque
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
            <Link href="/gallery" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
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
        
      {/* <PalmTreeDrive /> */}
      {/* <NoiseParticleEffect /> */}
      {/* <BookAnimation /> */}
      {/* <PalmTreeIsland /> */}
      <PalmTreeDrive />
    
    </div>
  );
}
