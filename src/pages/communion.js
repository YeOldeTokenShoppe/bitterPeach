import React, { useState, useEffect, useRef } from "react";
import { Box, Image, Text, useDisclosure } from "@chakra-ui/react";
import Carousel from "../components/Carousel";
import NavBar from "../components/NavBar.client";
import Communion from "../components/Communion";
import MusicPlayer from "../components/MusicPlayer2";
import { Heading } from "@chakra-ui/react";
import gsap from "gsap";
import Loader from "../components/Loader";
import dynamic from "next/dynamic";
import MoonRoomModal from "../components/MoonRoomModal";
import Bouncer from "../components/Bouncer";
import GoldCards from "../components/3DVotiveStand/GoldCards";

export default function CommunionPage() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [isLoading, setIsLoading] = useState(true);
  const [carouselLoaded, setCarouselLoaded] = useState(false);
  // const [communionLoaded, setCommunionLoaded] = useState(false);

  useEffect(() => {
    // Force loader to hide after 10 seconds
    const timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn("⚠️ Loading timed out, forcing page to show");
        setIsLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [isLoading]);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (carouselLoaded) {
      setIsLoading(false);
    }
  }, [carouselLoaded]);
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
        zIndex: 1000,
      }
    : {
        transform: "translateX(-50%) scale(0.5)",
        top: "-6rem",
        position: "absolute",
        left: "50%",
        width: "auto",
        maxWidth: "none",
        maxHeight: "none",
        zIndex: 1000,
      };

  useEffect(() => {
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
  }, []);

  return (
    <>
      {isLoading && <Loader />}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          // height: "42%",
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
          zIndex: 10,
        }}
      >
        {/* Container wrapping the Carousel and the sign */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 10,
            opacity: isLoading ? 0 : 1,
            transition: "opacity 0.5s ease-in-out",
            visibility: isLoading ? "hidden" : "visible",
          }}
        >
          <Image src="/carouselSign.png" alt="sign" style={imgStyle} />
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
      </div>

      <Box
        display="flex"
        flexDirection={{ base: "column", md: "row" }} // Column on small screens, row on larger screens
        alignItems="center"
        justifyContent="center"
        marginBottom="2rem"
        position="relative"
        marginTop="1rem"
        gap={4}
        zIndex={1} // Adjust z-index if needed
      >
        <Box
          display="flex"
          alignItems="center"
          width="30rem"
          // border="3px solid goldenrod"
          // paddingTop="3rem"
          borderRadius="10px"
          justifyContent="center"
          // marginBottom="2rem"
          position="relative"
          marginTop="1rem"
          zIndex={-1} // Adjust z-index if needed
        >
          {/* <Bouncer onDoorClick={onOpen} disableBlockingBehavior={false} />


          <MoonRoomModal isOpen={isOpen} onClose={onClose} /> */}
          <GoldCards />
        </Box>
      </Box>

      <Box
        style={{
          position: "relative",
          left: "40%",
          align: "center",
          justifyContent: "center",
          border: "3px solid goldenrod",
          borderRadius: "10px",
          width: "20%",
          alignContent: "center",
        }}
      >
        <iframe
          src="https://open.spotify.com/embed/playlist/5wWiiVDG0Q83zVitjPf6fj?utm_source=generator&theme=0"
          width="100%"
          height="152"
          frameBorder="0"
          allowfullscreen=""
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        ></iframe>
      </Box>
      <div
        style={{
          position: "relative",
          marginBottom: "2rem",
          marginTop: "3rem",
        }}
      >
        <NavBar />
      </div>
      {/* </div> */}
      <Communion />

      {/* Loader on top */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
          }}
        >
          <Loader />
        </div>
      )}
    </>
  );
}
