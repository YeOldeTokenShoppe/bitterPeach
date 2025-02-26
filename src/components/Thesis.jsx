"use client";
import React, { useState, useEffect } from "react";
import { Box, Flex, Text, Skeleton } from "@chakra-ui/react";
import Image from "next/image";
import SwipeIcon from "../components/SwipeIcon";

const scrollUrl = "/html/scroll.html";

function Thesis({ setThesisLoaded }) {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const thesisImages = [
    "/s8ntgr81.png",
    // Add any other critical images used in the Thesis component
  ];

  useEffect(() => {
    const preloadThesisImages = async () => {
      try {
        const imageLoadPromises = thesisImages.map((src) => {
          return new Promise((resolve) => {
            // Use window.Image instead of Image to avoid conflict
            const img =
              typeof window !== "undefined" ? new window.Image() : null;

            if (!img) {
              console.warn("Window not available, skipping image preload");
              resolve(false);
              return;
            }

            img.onload = () => {
              setLoadedImages((prev) => {
                const newSet = new Set(prev);
                newSet.add(src);
                return newSet;
              });
              console.log(`Thesis image loaded: ${src}`);
              resolve(true);
            };
            img.onerror = () => {
              console.error(`Failed to load thesis image: ${src}`);
              resolve(false);
            };
            img.src = src;
          });
        });

        await Promise.all(imageLoadPromises);
        console.log("✅ All thesis images preloaded");
        setImageLoaded(true);
        setThesisLoaded(true);
        console.log("✅ Thesis loaded successfully.");
      } catch (error) {
        console.error("❌ Error loading Thesis:", error);
        // Signal loaded anyway to prevent hanging
        setImageLoaded(true);
        setThesisLoaded(true);
      }
    };

    preloadThesisImages();
  }, [setThesisLoaded, thesisImages]);

  const handleSwipeIconDisappear = () => {
    console.log("Swipe icon disappeared");
  };

  const [imageLoaded, setImageLoaded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  const [iframeHeight, setIframeHeight] = useState("40vh");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return (
    <>
      <Box py={{ base: 0, md: 8 }}>
        <Flex
          direction={["column-reverse", "column-reverse", "row-reverse"]}
          align="center"
        >
          <Box
            mt={"5rem"}
            flex={["1 0 100%", "1 0 100%", "1 0 50%"]}
            minH={{ base: "300px", md: "auto" }}
          >
            <iframe
              src={scrollUrl}
              style={{
                width: "28rem",
                height: windowWidth < 400 ? "48vh" : "50vh",
                border: "none",
              }}
              allowFullScreen
              title="Scroll"
            />

            <div style={{ position: "relative", top: "-10rem" }}>
              <SwipeIcon
                handColor="goldenrod" /* Light blue */
                arrowColor="#ff0000" /* Red arrows */
                autoHideDelay={5000} /* Disappears after 7 seconds */
                animationDelay="3s" /* Start immediately */
                debug={true} /* Add a prop to enable debugging */
              />
            </div>
          </Box>
          <Box
            flex={["1 0 100%", "1 0 100%", "1 0 50%"]}
            textAlign={["center", "center", "left"]}
            justifyContent="center"
            display="flex"
            flexDirection="column"
            alignItems="center"
            pl={[0, 0, 5, 12]}
            mt={"3rem"}
            mb={"5rem"}
          >
            <h1 className="thelma1" style={{ fontSize: "4em", zIndex: "0" }}>
              Thesis
            </h1>
            <Text fontSize="lg" mb={5} ml={8}>
              A treatise in which we discuss ethics, economics, metaphysics and
              the future of the{" "}
              <span style={{ fontFamily: "Oleo Script" }}>{" RL80 "}</span>{" "}
              token.
            </Text>
            {/* <div className="speech-container">
              <div className="speech">
                <p>
                  et us recognize that In the hallowed halls of our digital age,
                  where the echoes of medieval
                </p>
              </div>
            </div> */}
            <Skeleton isLoaded={imageLoaded}>
              <Image
                src="/s8ntgr81.png"
                alt="crier"
                height="441"
                width="423"
                onLoad={() => setImageLoaded(true)}
              />
            </Skeleton>
          </Box>
        </Flex>
      </Box>
    </>
  );
}

export default Thesis;
