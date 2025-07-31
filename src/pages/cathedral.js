import React, { Suspense, useState, useRef, useEffect} from 'react';
import Cathedral from '../components/Cathedral';
import CyberNav from '../components/CyberNav';
import CyberCalloutOverlay from '../components/3DVotiveStand/CyberCalloutOverlay';
import Link from 'next/link';
import { Box, IconButton } from '@chakra-ui/react';

// Custom wrapper component for right-aligned overlay
function RightAlignedCyberCallout({ children, ...props }) {
  return (
    <div style={{ position: 'relative' }}>
      <style jsx>{`
        div :global(> div) {
          left: auto !important;
          right: 80px !important;
          top: 60% !important;
        }
        div :global(> div > div) {
          width: 500px !important;
          transform: skewX(-8deg) !important;
          padding: 40px !important;
          background: rgba(0, 0, 0, 0.55) !important;
        }
        div :global(> div > div > div) {
          transform: skewX(8deg) !important;
        }
        div :global(> div > div > button) {
          transform: skewX(8deg) !important;
        }
      `}</style>
      <CyberCalloutOverlay {...props} />
    </div>
  );
}

export default function CathedralPage({ is80sMode, setIs80sMode }) {
  const [isMobileView, setIsMobileView] = useState(false);
  return (
    <Box 
    width="100%" 
    height="100vh" 
    bg="#000" 
    position="relative" 
    overflow="hidden"
  >

    <div className="textLight" id="textLight" style={{
      position: "absolute",
      top: "1.5rem", 
      left: "1.5rem",
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
          // color: is80sMode ? "#67e8f9" : "#ffffff",
          cursor: "pointer"
        }}
      >
        <Link href="/home" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
          <span>RL80</span>
          {/* <span style={{ color: "inherit" }}>80</span> */}
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
                color: is80sMode 
                  ? `rgba(${201 - index * 2}, ${55 - index * 3}, ${256 - index * 2})` 
                  : `rgba(${255 - index * 2}, ${255 - index * 3}, ${255 - index * 2})`,
                filter: "blur(0.1rem)",
                transform: `translate(
                  ${index * 0.1}rem, 
                  ${index * 0.1}rem
                ) scale(${1 + index * 0.01})`,
                opacity: (1 / index) * 1.5,
              }}
            >
              <span>RL80</span>
              {/* <span style={{ color: is80sMode ? "#00ff41" : "inherit" }}>80</span> */}
            </div>
          );
        })}
      </div>
      </div>
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      
      
      <CyberNav />
      <Cathedral />
      
      {/* Right-aligned CyberCalloutOverlay */}
      <RightAlignedCyberCallout
        title="CATHEDRAL"
        subtitle="SACRED DIGITAL SPACE"
        description="Enter the cathedral where ancient architecture meets digital transcendence. Experience the convergence of past and future."
        buttonText="EXPLORE"
        is80sMode={is80sMode}
        autoHide={false}
        onButtonClick={() => {
          console.log('Exploring the cathedral...');
        }}
      />
    </div></Box>
  );
}