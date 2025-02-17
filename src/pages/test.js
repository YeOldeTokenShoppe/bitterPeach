// pages/thesis.js
import React, { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import Buy from "../components/3DVotiveStand/Buy";

import ShelfStand from "../components/3DVotiveStand/CandleInstances";

export default function TestPage() {
  return (
    <div
      style={{
        marginTop: "4rem",
        position: "relative",
        width: "100vw",
        height: "100vh",
      }}
    >
      {/* Always render the content, but control visibility with CSS */}
      <div
        style={{
          marginTop: "4rem",
          position: "relative",
          width: "100vw",
          height: "100vh",
          zIndex: "100",
        }}
      >
        <Buy />
        {/* <Canvas
          camera={{ position: [0, 5, 10], fov: 75 }}
          style={{ height: "100vh" }}
        >
          <ShelfStand />
        </Canvas> */}
      </div>
    </div>
  );
}
