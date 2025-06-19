// RotatingBadge.js
"use client";
import React, { useEffect, useRef } from "react";

const RotatingBadge2 = ({ scale = 1, size, style }) => {
  const badgeRef = useRef(null);

  useEffect(() => {
    const elements = badgeRef.current.querySelectorAll(".badge__char2");
    const step = 360 / elements.length;

    elements.forEach((elem, i) => {
      elem.style.setProperty("--char-rotate", `${i * step}deg`);
    });
  }, []);

  // Build the badge style object
  const badgeStyle = {
    ...style,
    // Apply scale via CSS custom property which will be safer
    '--scale': scale,
    transform: style?.transform || `scale(${scale})`,
    transformOrigin: style?.transformOrigin || 'center',
    // Make it inline-block to ensure proper scaling
    display: 'inline-block',
  };

  // If size is provided, override the CSS variable
  if (size) {
    badgeStyle['--badge-size'] = size;
  }

  return (
    <div className="badge" translate="no" ref={badgeRef} style={badgeStyle}>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        R
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        O
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        S
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        E
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        R
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        {" "}
      </span>

      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        O
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        L
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        S
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        ★
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
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
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        L
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        C
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        R
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        M
      </span>

      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        P
      </span>

      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        E
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        R
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        P
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        E
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        T
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        M
      </span>
      {/* <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        M
      </span> */}
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        {" "}
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        ★
      </span>

      {/* <span className="badge__char2" style={{ color: "#e1b67e" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        M
      </span> */}
      {/* <span className="badge__char2" style={{ color: "#e1b67e" }}>
        {""}
      </span>
      <span className="badge__char2" style={{ color: "#e1b67e" }}>
        ★
      </span> */}
      {/* <span className="badge__char2" style={{ color: "#000000" }}>
        P
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        E
      </span> 

      <span className="badge__char2" style={{ color: "#000000" }}>
        R
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        P
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        E
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        T
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        I
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        ★
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        L
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        {"C"}
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        {"R"}
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        I
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        ★
      </span> */}
      {/* <span className="badge__char2" style={{ color: "#000000" }}>
        U
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        S
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        T
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        {" "}
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        ★
      </span>
      <span className="badge__char2" style={{ color: "#000000" }}>
        {" "}
      </span> */}
      {/* 
      <img
        className="badge__emoji2"
        src="./NEWRL80.png"
        width="60"
        height="60"
        alt=""
        style={{ zIndex: "-1" }}
      /> */}
    </div>
  );
};

export default RotatingBadge2;
