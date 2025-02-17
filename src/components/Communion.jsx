"use client";
import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

function Communion({}) {
  // useEffect(() => {
  //   // Simulate async data or image loading
  //   const loadCommunionContent = async () => {
  //     // Example: simulate loading (replace with real logic)
  //     await new Promise((resolve) => setTimeout(resolve, 500));
  //     setCommunionLoaded(true); // Notify parent that loading is complete
  //   };

  //   loadCommunionContent();
  // }, [setCommunionLoaded]);

  return (
    <div className="communion-container">
      <section id="footer" className="footer">
        <div className="inner">
          <ul className="icons">
            {[
              { src: "/3D_spotify.png", alt: "Spotify" },
              { src: "/3D_tiktok.png", alt: "Tiktok" },
              { src: "/3d_discord.png", alt: "Discord" },
              { src: "/3d_X.png", alt: "X" },
              { src: "/3d_instagram.png", alt: "Instagram" },
              {
                src: "/3d_tg2.png",
                alt: "Telegram",
                style: { marginBottom: "0.5rem" },
              },
            ].map((icon, index) => (
              <li key={index}>
                <Link href="#" passHref>
                  <div className="socials">
                    <Image
                      src={icon.src}
                      alt={icon.alt}
                      width={258}
                      height={257}
                      style={{ width: "4rem", height: "4rem", ...icon.style }}
                      onLoad={() => console.log(`${icon.alt} loaded`)} // Debug image load
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
