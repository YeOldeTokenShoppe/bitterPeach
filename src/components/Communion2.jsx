"use client";
import React, { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

function Communion2() {
  return (
    <div
      style={{
        position: "relative",
        bottom: "0",
        marginTop: "3rem",
        width: "100%",
        zIndex: "0",
      }}
    >
      <section id="footer2" style={{ zIndex: "-2" }}>
        <div className="inner">
          <ul className="icons">
            <li>
              <Link href="#" style={{ zIndex: "-2" }}>
                <div className="socials" style={{ zIndex: "-2" }}>
                  <Image
                    src="/3D_tiktok.png"
                    alt="Tiktok"
                    width={258}
                    height={257}
                    style={{ width: "4rem", height: "4rem" }}
                  />
                </div>
              </Link>
            </li>
            <li>
              <Link href="#">
                <div className="socials" style={{ zIndex: "-2" }}>
                  <Image
                    src="/3d_discord.png"
                    alt="Discord"
                    width={258}
                    height={257}
                    style={{ width: "4rem", height: "4rem" }}
                  />
                </div>
              </Link>
            </li>
            <li>
              <Link href="#">
                <div className="socials" style={{ zIndex: "-2" }}>
                  <Image
                    src="/3d_X.png"
                    alt="X"
                    width={258}
                    height={257}
                    style={{ width: "4rem", height: "4rem" }}
                  />
                </div>
              </Link>
            </li>
            <li>
              <Link href="#">
                <div className="socials" style={{ zIndex: "-2" }}>
                  <Image
                    src="/3d_instagram.png"
                    alt="instagram"
                    width={258}
                    height={257}
                    style={{ width: "4rem", height: "4rem" }}
                  />
                </div>
              </Link>
            </li>
            <li>
              <Link href="#">
                <div className="socials" style={{ zIndex: "-2" }}>
                  <Image
                    src="/3d_tg2.png"
                    alt="Telegram"
                    width={258}
                    height={257}
                    style={{
                      width: "3.6rem",
                      height: "3.6rem",
                      marginBottom: "0.5rem",
                    }} // Adjust the value as needed
                  />
                </div>
              </Link>
            </li>
          </ul>
          <li>
            <Link href="#">
              <div className="socials" style={{ zIndex: "-2" }}>
                <Image
                  src="/3d_spotify.png"
                  alt="Spotify"
                  width={258}
                  height={257}
                  style={{ width: "4rem", height: "4rem" }}
                />
              </div>
            </Link>
          </li>
          <div
            style={{
              display: "flex",
              position: "absolute",
              // width: "6rem",
              // height: "6rem",
              right: "10%",
              bottom: "10px",

              marginTop: "-2rem",
            }}
          >
            {/* <RotatingBadge /> */}
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: "small",
              color: "#ffffff",
              marginBottom: "1rem",
            }}
          >
            Contact: hello@ourlady.io
            <br />
            &copy; Made with C8H11NO2 + C10H12N2O + C43H66N12O12S2 by Ye Olde
            Token Shoppe
          </div>
        </div>
      </section>
    </div>
  );
}

export default Communion2;
