"use client";
import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

function Communion({ setCommunionLoaded }) {
  const [loadedIcons, setLoadedIcons] = useState(new Set());

  const icons = useMemo(
    () => [
      { src: "/3d_spotify.png", alt: "Spotify" },
      { src: "/3D_tiktok.png", alt: "Tiktok" },
      { src: "/3d_discord.png", alt: "Discord" },
      { src: "/3d_X.png", alt: "X" },
      { src: "/3d_instagram.png", alt: "Instagram" },
      {
        src: "/3d_tg2.png",
        alt: "Telegram",
        style: { marginBottom: "0.5rem" },
      },
    ],
    []
  );

  useEffect(() => {
    // If setCommunionLoaded is not provided, we don't need to track loading
    if (!setCommunionLoaded) return;

    // Preload all icons
    const preloadIcons = async () => {
      try {
        const iconLoadPromises = icons.map((icon) => {
          return new Promise((resolve) => {
            // Use window.Image instead of Image to avoid conflict with next/image
            const img =
              typeof window !== "undefined" ? new window.Image() : null;

            if (!img) {
              console.warn("Window not available, skipping image preload");
              resolve(false);
              return;
            }

            img.onload = () => {
              setLoadedIcons((prev) => {
                const newSet = new Set(prev);
                newSet.add(icon.src);
                return newSet;
              });
              resolve(true);
            };
            img.onerror = () => {
              console.error(`Failed to load icon: ${icon.src}`);
              resolve(false);
            };
            img.src = icon.src;
          });
        });

        await Promise.all(iconLoadPromises);
        setCommunionLoaded(true);
      } catch (error) {
        console.error("Error preloading icons:", error);
        setCommunionLoaded(true); // Signal loaded anyway to prevent hanging
      }
    };

    preloadIcons();
  }, [setCommunionLoaded, icons]);

  const handleIconLoad = (src) => {
    console.log(`Icon loaded: ${src}`);
    setLoadedIcons((prev) => {
      const newSet = new Set(prev);
      newSet.add(src);

      // If all icons are loaded, signal completion
      if (setCommunionLoaded && newSet.size === icons.length) {
        setCommunionLoaded(true);
      }

      return newSet;
    });
  };

  return (
    <div className="communion-container">
      <section id="footer" className="footer">
        <div className="inner">
          <ul className="icons">
            {icons.map((icon, index) => (
              <li key={index}>
                <Link href="#" passHref>
                  <div className="socials">
                    <Image
                      src={icon.src}
                      alt={icon.alt}
                      width={258}
                      height={257}
                      style={{ width: "4rem", height: "4rem", ...icon.style }}
                      onLoad={() => handleIconLoad(icon.src)}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="rotating-badge">{/* <RotatingBadge /> */}</div>

          <div className="footer-contact">
            Contact: hello@ourlady.io
            <br />
            &copy; Made with C8H11NO2 + C10H12N2O + C43H66N12O12S2 by Ye Olde
            Token Shoppe
          </div>
        </div>
      </section>

      <style jsx>{`
        .communion-container {
          position: relative;
          bottom: 0;
          margin-top: 3rem;
          width: 100%;
          z-index: 0;
        }
        .footer {
          z-index: 0;
        }
        .socials {
          z-index: 0;
        }
        .footer-contact {
          text-align: center;
          font-size: small;
          color: #ffffff;
          margin-bottom: 1rem;
        }
        .rotating-badge {
          display: flex;
          position: absolute;
          right: 10%;
          bottom: 10px;
          margin-top: -2rem;
        }
      `}</style>
    </div>
  );
}

export default Communion;
