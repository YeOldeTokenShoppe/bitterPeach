import React from "react";

function Candle({ size = 1, isFlameVisible = false }) {
  // Use `size` to scale the entire candle uniformly
  const scaleFactor = size;

  return (
    <div>
      <div
        style={{
          transform: `scale(${scaleFactor})`, // Scale the entire candle
          transformOrigin: "center bottom", // Ensure scaling happens from the bottom center
        }}
      >
        <div className="holder">
          <div className="candle">
            <div className="thread"></div>
            {/* Show the flame and glow only when isFlameVisible is true */}
            {isFlameVisible ? (
              <>
                <div className="blinking-glow"></div>
                <div className="glow"></div>
                <div className="flame"></div>
              </>
            ) : (
              <div className="unlit-candle"></div> // Candle is unlit when isFlameVisible is false
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Candle;
