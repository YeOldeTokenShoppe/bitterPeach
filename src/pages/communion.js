import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Image, Text, useDisclosure } from "@chakra-ui/react";
import Carousel from "../components/Carousel";
import NavBar from "../components/NavBar.client";
import Footer from "../components/Footer";
import { Heading } from "@chakra-ui/react";
import gsap from "gsap";
import Loader from "../components/Loader";
import dynamic from "next/dynamic";
import Header from "../components/Header";
// import { zIndex } from "html2canvas/dist/types/css/property-descriptors/z-index";

export default function CommunionPage() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(true);
  const [carouselLoaded, setCarouselLoaded] = useState(false);
  const [communionLoaded, setCommunionLoaded] = useState(false);
  const [goldCardsLoaded, setGoldCardsLoaded] = useState(true);
  const [allImagesLoaded, setAllImagesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState("initializing");
  const [showContent, setShowContent] = useState(false);
  const [contentOpacity, setContentOpacity] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState([]);

  // List of all critical images that need to be preloaded
  const criticalImages = useMemo(
    () => [
      "/carouselSign.png",
      // Add other critical images here
      "seaMonster.png",
      "bull.png",
      "bear.png",
      "gator.png",
      "chupa.png",
      "snowman.png",
      "unicorn.png",
      "jackalope.png",
      "liger.png",
      "dire.png",
      "warthog.png",
      "mothmanRide.png",
      "/8ballicon.svg",
      "/horseshoe.svg",
      "/roulette.svg",
    ],
    []
  );

  // Calculate loading progress
  useEffect(() => {
    let progress = 0;
    let stageProgress = 0;

    // Base progress for each stage
    const stageWeights = {
      initializing: 0.1, // 0-10%
      "loading carousel": 0.3, // 10-40%
      "loading images": 0.4, // 40-80%
      finalizing: 0.1, // 80-90%
      complete: 0.1, // 90-100%
    };

    // Calculate progress based on current stage
    switch (loadingStage) {
      case "initializing":
        stageProgress = 0.1;
        break;
      case "loading carousel":
        stageProgress = 0.3;
        break;
      case "loading images":
        // Add progress based on loaded images
        const loadedImages = imagesLoaded.length;
        const totalImages = criticalImages.length;
        stageProgress = 0.3 + 0.4 * (loadedImages / totalImages);
        break;
      case "finalizing":
        stageProgress = 0.8;
        break;
      case "complete":
        stageProgress = 0.9;
        break;
    }

    // Add small random increments to make progress more dynamic
    const randomIncrement = Math.random() * 0.01;
    progress = Math.min(stageProgress + randomIncrement, 0.99);

    setLoadingProgress(Math.floor(progress * 100));
  }, [loadingStage, imagesLoaded, criticalImages]);

  // Update loading stage based on component states
  useEffect(() => {
    if (!carouselLoaded) {
      setLoadingStage("loading carousel");
    } else if (!allImagesLoaded) {
      setLoadingStage("loading images");
    } else if (!communionLoaded) {
      setLoadingStage("finalizing");
    } else {
      setLoadingStage("complete");
    }
    
    // Log each stage change for debugging
    console.log(`🔄 Loading stage updated: ${loadingStage}`);
  }, [carouselLoaded, allImagesLoaded, communionLoaded, loadingStage]);

  // Preload all critical images
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = criticalImages.length;

    console.log(
      `🔄 Preloading ${totalImages} critical images for communion page...`
    );

    const preloadImage = (src) => {
      return new Promise((resolve) => {
        // Use window.Image instead of Image to avoid conflict
        const img = typeof window !== "undefined" ? new window.Image() : null;

        if (!img) {
          resolve(false);
          return;
        }

        img.onload = () => {
          loadedCount++;
          console.log(`✅ Loaded image ${loadedCount}/${totalImages}: ${src}`);
          setImagesLoaded((prev) => [...prev, src]);
          resolve(true);
        };
        img.onerror = () => {
          console.error(`❌ Failed to load image: ${src}`);
          loadedCount++;
          resolve(false);
        };
        img.src = src;
      });
    };

    Promise.all(criticalImages.map(preloadImage))
      .then(() => {
        console.log("✅ All critical images preloaded for communion page");
        setAllImagesLoaded(true);
      })
      .catch((err) => {
        console.error("Error preloading images:", err);
        // Still set as loaded after timeout to prevent hanging
        setTimeout(() => setAllImagesLoaded(true), 3000);
      });
  }, [criticalImages]);

  // Force loader to hide after timeout
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("⚠️ Loading timed out, forcing page to show");
        setIsLoading(false);
        setShowContent(true);

        // Fade in content after a short delay
        setTimeout(() => {
          setContentOpacity(1);
        }, 100);
      }
    }, 15000); // 15 second maximum wait time

    return () => clearTimeout(timeoutId);
  }, [isLoading]);

  // Add explicit check to ensure loader is shown immediately on page load
  useEffect(() => {
    console.log("🔍 Current loading state:", { 
      isLoading, 
      showContent, 
      contentOpacity,
      carouselLoaded,
      allImagesLoaded,
      communionLoaded,
      loadingProgress
    });
  }, [isLoading, showContent, contentOpacity, carouselLoaded, allImagesLoaded, communionLoaded, loadingProgress]);

  // Handle transition from loading to content
  useEffect(() => {
    if (
      carouselLoaded &&
      allImagesLoaded &&
      communionLoaded
    ) {
      console.log(
        "✅ All components and images loaded, showing communion page"
      );

      // First show the content container (but keep it invisible)
      setShowContent(true);

      // Add a small delay for smoother transition
      setTimeout(() => {
        // Hide the loader
        setIsLoading(false);

        // After loader is hidden, fade in the content
        setTimeout(() => {
          setContentOpacity(1);
        }, 500);
      }, 500);
    } else if (loadingProgress >= 95) {
      // If we're at 95% or higher, we can show the page even if not everything is loaded
      console.log(
        "⚠️ Showing page at high progress but not all components loaded"
      );

      // First show the content container (but keep it invisible)
      setShowContent(true);

      setTimeout(() => {
        // Hide the loader
        setIsLoading(false);

        // After loader is hidden, fade in the content
        setTimeout(() => {
          setContentOpacity(1);
        }, 500);
      }, 500);
    }
  }, [
    carouselLoaded,
    allImagesLoaded,
    communionLoaded,
    loadingProgress,
  ]);

  // Initialize loading state properly
  useEffect(() => {
    // Start with loader visible and content hidden
    setIsLoading(true);
    setShowContent(false);
    setContentOpacity(0);
    
    // This ensures the loader is visible before any component loading begins
    console.log("🔄 Initializing loader");
  }, []);

  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    if (typeof window !== "undefined") {
      // Check if window is defined
      handleResize(); // Set initial state
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const imgStyle = isLargeScreen
    ? {
        transform: "translateX(-50%) scale(0.5)",
        top: "-6rem",
        position: "absolute",
        left: "50%",
        width: "auto",
        maxWidth: "none",
        maxHeight: "none",
        zIndex: 9999,
        pointerEvents: "none",
      }
    : {
        transform: "translateX(-50%) scale(0.5)",
        top: "-6rem",
        position: "absolute",
        left: "50%",
        width: "auto",
        maxWidth: "none",
        maxHeight: "none",
        zIndex: 9999,
        pointerEvents: "none",
      };

  useEffect(() => {
    // Only run this effect when showContent is true and the canvas exists
    if (!showContent || !canvasRef.current) return;

    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    let cw = (c.width = window.innerWidth);
    let ch = (c.height = window.innerHeight);

    const ticks = 150;
    const ring1 = [];
    const ring2 = [];
    const dur = 12;

    for (let i = 0; i < ticks; i++) {
      const angle = (i / ticks) * Math.PI * 2;
      const radius = 250;
      ring1[i] = {
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0,
        lineWidth: 6,
        a: angle,
        r: radius,
        h: 30 + gsap.utils.wrapYoyo(0, 40, (i / ticks) * 160),
      };
      ring2[i] = {
        x1: 0,
        x2: 0,
        y1: 0,
        y2: 0,
        lineWidth: 2,
        a: angle,
        r: radius / 2,
        h: 10 + gsap.utils.wrapYoyo(0, 40, (i / ticks) * 160),
      };
    }

    const tl = gsap
      .timeline({ onUpdate: update })
      .fromTo(
        [ring1, ring2],
        {
          x1: (i, t) => Math.cos(t.a) * t.r * -2,
          y1: (i, t) => Math.sin(t.a) * t.r * -2,
          x2: (i, t) => Math.cos(t.a) * t.r * 15,
          y2: (i, t) => Math.sin(t.a) * t.r * 8,
        },
        {
          x1: (i, t) => Math.cos(t.a) * t.r * 0.3,
          y1: (i, t) => Math.sin(t.a) * t.r * 0.3,
          x2: (i, t) => Math.cos(t.a) * t.r * 0.12,
          y2: (i, t) => Math.sin(t.a) * t.r * 0.12,
          duration: dur / 2,
          ease: "back",
          repeat: -1,
          yoyo: true,
        },
        0
      )
      .to(
        ring1,
        {
          lineWidth: 1,
          h: "+=120",
          duration: dur * 0.25,
          ease: "power4",
          yoyoEase: "power2.in",
          stagger: { amount: dur, from: 0, repeat: -1, yoyo: true },
        },
        0
      )
      .play(dur * 1.5);

    function drawPath(t) {
      ctx.strokeStyle = "hsl(" + t.h + ",100%,50%)";
      ctx.lineCap = "round";
      ctx.lineWidth = t.lineWidth;
      ctx.setLineDash([t.lineWidth * 2, 30]);
      ctx.beginPath();
      ctx.moveTo(t.x1 + cw / 2, t.y1 + ch / 2);
      ctx.lineTo(t.x2 + cw / 2, t.y2 + ch / 2);
      ctx.stroke();
    }

    function update() {
      ctx.clearRect(0, 0, cw, ch);
      ring1.forEach(drawPath);
      ring2.forEach(drawPath);
    }

    window.onresize = () => {
      cw = c.width = window.innerWidth;
      ch = c.height = window.innerHeight;
      update();
    };

    window.onpointerup = () => {
      gsap.to(tl, {
        duration: 1,
        ease: "power3",
        timeScale: tl.isActive() ? 0 : 1,
      });
    };
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("pointerup", update);
    };
  }, [showContent]); // Add showContent as a dependency

  return (
    <>
 
      {/* Loader */}
      {isLoading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#1b1724",
            zIndex: 50,
            transition: "opacity 0.5s ease-out",
            opacity: 1,
            pointerEvents: "all"
          }}
        >
          <Loader progress={loadingProgress} />
          <div
            style={{
              color: "#e1b67e",
              marginTop: "20px",
              fontSize: "14px",
              textAlign: "center",
              maxWidth: "80%",
            }}
          >
            {loadingStage === "initializing" && "Initializing..."}
            {loadingStage === "loading carousel" && "Loading carousel..."}
            {loadingStage === "loading images" && "Loading images..."}
            {loadingStage === "finalizing" && "Finalizing..."}
            {loadingStage === "complete" && "Loading complete!"}
          </div>
        </div>
      )}

      {/* Main Content */}
      {showContent && (
        <div
          style={{
            opacity: contentOpacity,
            transition: "opacity 0.8s ease-in",
            width: "100vw",
            minHeight: "100vh",
            overflow: "hidden",
            position: "relative",

          }}
        >
          <div style={{zIndex: 100}}>
           <Header />
           </div>

          <canvas
            ref={canvasRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "120vh",
              zIndex: 0,
            }}
          ></canvas>
          <div
            style={{
              position: "relative",
              marginBottom: "1rem",
              transform: "scale(.8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
            }}
          >
            {/* Container wrapping the Carousel and the sign */}
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 2,
              }}
            >
              <Carousel
                setCarouselLoaded={setCarouselLoaded}
                images={[
                  { src: "seaMonster.png", title: "Sea Monster" },
                  { src: "bull.png", title: "Bull" },
                  { src: "bear.png", title: "Bear" },
                  { src: "gator.png", title: "G8r" },
                  { src: "chupa.png", title: "Chupacabra" },
                  { src: "snowman.png", title: "Yeti" },
                  { src: "unicorn.png", title: "Unicorn" },
                  { src: "jackalope.png", title: "Jackalope" },
                  { src: "liger.png", title: "Liger" },
                  { src: "dire.png", title: "Dire Wolf" },
                  { src: "warthog.png", title: "Warthog" },
                  { src: "mothmanRide.png", title: "Mothman" },
                ]}
                logos={[
                  {
                    logo: "/3d_spotify.png",
                    title: "Threads",
                    link: "https://www.threads.net",
                  },
                  {
                    logo: "/telegram.svg",
                    title: "Telegram",
                    link: "https://t.me",
                  },
                  { logo: "/x_.svg", title: "X", link: "https://x.com" },
                  {
                    logo: "/threads_.png",
                    title: "Threads",
                    link: "https://www.threads.net",
                  },
                  {
                    logo: "/instagram_.png",
                    title: "Instagram",
                    link: "https://www.instagram.com",
                  },
                  // {
                  //   logo: "/facebook_.png",
                  //   title: "Facebook",
                  //   link: "https://www.facebook.com",
                  // },
                  {
                    logo: "/discord.svg",
                    title: "Discord",
                    link: "https://discord.com",
                  },
                ]}
              />
            </div>

            {/* Carousel sign with improved positioning and z-index */}
            <div
              style={{
                position: "absolute",
                top: "-6rem",
                left: "50%",
                transform: "translateX(-50%) scale(0.5)",
                width: "auto",
                maxWidth: "none",
                maxHeight: "none",
                zIndex: 9999,
                pointerEvents: "none",
                willChange: "transform",
                isolation: "isolate",
                translate: "no",
              }}
            >
              <img
                src="/carouselSign.png"
          
                translate="no" 
                style={{
                  width: "auto",
                  maxWidth: "none",
                  maxHeight: "none",
                }}
                onLoad={() => console.log("Carousel sign loaded")}
              />
            </div>
          </div>

          <div style={{ marginTop: "3rem", zIndex: "100" }}>
            <NavBar />
          </div>
          <div style={{ marginTop: "3rem", zIndex: "100" }}>
            <Footer setCommunionLoaded={setCommunionLoaded} />
          </div>
        </div>
      )}
    </>
  );
}
