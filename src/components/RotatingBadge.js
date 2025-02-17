// RotatingBadge.js
"use client";
import React, { useEffect, useRef } from "react";

const RotatingBadge = () => {
  const badgeRef = useRef(null);
  // useEffect(() => {
  //   // Simulate async data or image loading
  //   const loadRotatingBadgeContent = async () => {
  //     // Example: simulate loading (replace with real logic)
  //     await new Promise((resolve) => setTimeout(resolve, 500));
  //     setRotatingBadgeLoaded(true); // Notify parent that loading is complete
  //   };

  //   loadRotatingBadgeContent();
  // }, [setRotatingBadgeLoaded]);

  useEffect(() => {
    const elements = badgeRef.current.querySelectorAll(".badge__char");
    const step = 360 / elements.length;

    elements.forEach((elem, i) => {
      elem.style.setProperty("--char-rotate", `${i * step}deg`);
    });
  }, []);

  return (
    <div className="badge" ref={badgeRef}>
      {/* <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span> */}
      {/* <span className="badge__char" style={{ color: "#e1b67e" }}>
        ★
      </span> */}
      {/* <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span> */}
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        R
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        O
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        S
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        E
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        R
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span>

      <span className="badge__char" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        O
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        L
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        S
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        ★
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      {/* <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        X
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        E
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        T
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span> */}
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        L
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        C
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        R
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        M
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        E
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        R
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        E
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        T
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        E
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        M
      </span>
      {/* <span className="badge__char" style={{ color: "#e1b67e" }}>
        T
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        U
      </span> */}
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char" style={{ color: "#e1b67e" }}>
        ★
      </span>
      <img
        className="badge__emoji"
        src="/nuhart1.svg"
        width="72"
        height="72"
        alt=""
      />
      {/* <p className="badge__emoji" style={{ fontSize: "2.7rem" }}>
        ❤️‍🔥
      </p> */}
    </div>
  );
};

export default RotatingBadge;
