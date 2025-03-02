import React from "react";
import MatrixRain from "./MatrixRain";

function MatrixRainTest() {
  return (
    <div
      style={{
        width: "100%",
        height: "200px",
        position: "relative",
        backgroundColor: "black",
        overflow: "hidden",
      }}
    >
      <MatrixRain />
    </div>
  );
}

export default MatrixRainTest;
