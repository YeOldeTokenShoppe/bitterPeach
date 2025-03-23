"use client";

import * as THREE from "three";
import { Canvas, extend } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import { geometry } from "maath";
import { useEffect, useState } from "react";
import PortalFrame from "./ImprovedPortalFrame";
import PortalRig from "./PortalRig";
import ReturnButton from "./ReturnButton";
import ReturnButton3D from "./ReturnButton3D";

// Import Logo if you have it
// import { Logo } from "@pmndrs/branding";

// Extend Three.js with custom geometries
extend(geometry);

// Constants
const GOLDENRATIO = 1.61803398875;

function PortalGallery({ frames = [], backgroundColor = "#f0f0f0" }) {
  // Track if we're client-side
  const [isClient, setIsClient] = useState(false);
  // Track current route path and set method
  const [path, setPath] = useState("/");

  useEffect(() => {
    // Set client flag when component mounts
    setIsClient(true);

    // Handle browser history navigation
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Get route params by parsing the path
  const getParams = () => {
    const match = /\/item\/(.+)/.exec(path);
    return match ? { id: match[1] } : null;
  };

  const params = getParams();

  // Navigation function to replace useLocation
  const navigate = (to) => {
    window.history.pushState(null, "", to);
    setPath(to);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* This return button will automatically hide when not in portal view */}
      {isClient && <ReturnButton />}

      {isClient && (
        <Canvas
          gl={{ localClippingEnabled: true }}
          camera={{ fov: 75, position: [0, 0, 20] }}
          eventPrefix="client"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
          }}
        >
          <color attach="background" args={[backgroundColor]} />

          {/* Render all portal frames with params and navigate function passed down */}
          {frames.map((frame) => (
            <PortalFrame
              key={frame.id}
              id={frame.id}
              name={frame.name}
              author={frame.author}
              bg={frame.bg}
              position={frame.position}
              rotation={frame.rotation}
              width={1}
              height={GOLDENRATIO}
              currentParams={params}
              onNavigate={navigate}
            >
              {frame.children}
            </PortalFrame>
          ))}

          {/* Pass the params to the rig */}
          <PortalRig currentParams={params} />
          <ReturnButton3D currentParams={params} onNavigate={navigate} />
          <Preload all />
        </Canvas>
      )}

      {/* UI Overlay Elements from the original script */}
      {isClient && (
        <>
          {/* The original back button/instruction */}
          <a
            style={{
              position: "absolute",
              top: 40,
              left: 40,
              fontSize: "13px",
              color: "#000",
              textDecoration: "none",
              zIndex: 1000,
            }}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            {params ? "← back" : "double click to enter portal"}
          </a>

          {/* Footer elements */}
          <a
            href="https://pmnd.rs/"
            style={{
              position: "absolute",
              bottom: 40,
              left: 90,
              fontSize: "13px",
              color: "#000",
              textDecoration: "none",
              zIndex: 1000,
            }}
          >
            pmnd.rs
            <br />
            dev collective
          </a>

          <div
            style={{
              position: "absolute",
              bottom: 40,
              right: 40,
              fontSize: "13px",
              color: "#000",
              zIndex: 1000,
            }}
          >
            {new Date().toLocaleDateString("en-US", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </div>

          {/* Uncomment if you have the Logo component */}
          {/* <Logo style={{ position: 'absolute', bottom: 40, left: 40, width: 30, zIndex: 1000 }} /> */}
        </>
      )}
    </div>
  );
}

export default PortalGallery;
