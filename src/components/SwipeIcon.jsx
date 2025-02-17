import React, { useEffect, useState } from "react";

const SwipeIcon = ({
  onDisappear,
  autoHideDelay = 5000,
  direction = "down",
  rotation = 0,
}) => {
  const [visible, setVisible] = useState(false); // Initially not visible
  const [userInteracted, setUserInteracted] = useState(false); // Tracks user interaction

  useEffect(() => {
    // Handle user interactions (click and scroll)
    const handleUserInteraction = () => {
      setUserInteracted(true);
    };

    window.addEventListener("click", handleUserInteraction);
    window.addEventListener("scroll", handleUserInteraction);

    const visibilityTimer = setTimeout(() => {
      if (!userInteracted) {
        setVisible(true); // Show the animation if no interaction occurred
      }
    }, 5000); // 5-second delay

    return () => {
      // Cleanup event listeners and timers
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("scroll", handleUserInteraction);
      clearTimeout(visibilityTimer);
    };
  }, [userInteracted]);

  useEffect(() => {
    if (visible && autoHideDelay) {
      const hideTimer = setTimeout(() => {
        setVisible(false);
        if (onDisappear) onDisappear();
      }, autoHideDelay);

      return () => clearTimeout(hideTimer);
    }
  }, [visible, autoHideDelay, onDisappear]);

  const handleInteraction = () => {
    setVisible(false);
    if (onDisappear) onDisappear();
  };

  if (!visible) return null;

  const getSwipeAnimation = () => `
    @keyframes swipe-y {
      0% { transform: translateY(0px); }

      50% { transform: translateY(50px); }
 
      100% { transform: translateY(0px); }
    }
  `;

  return (
    <div
      className="swipe-icon-wrapper"
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      <style>{`
     .swipe-icon-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}

.swipe-icon {
  width: 4em; /* Slightly larger than an emoji */
  height: 4em;

animation: swipe-y 1.25s cubic-bezier(0.25, 1, 0.5, 1) infinite;

  cursor: pointer;
}

.hand-y {
  fill: "#ff0000";
  stroke: #000;
  stroke-width: 3px;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.line-vertical,
.arrow-down,
.arrow-up {
  fill:  #ff0000;
  stroke: #ff0000;
  stroke-width: 6px;
  stroke-linecap: round;
  stroke-linejoin: round;
}



@keyframes swipe-y {
  0% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(50px);
  }

  100% {
    transform: translateY(0px);
  }
}
        `}</style>

      <svg
        id="Swipe-vertical_1"
        data-name="Swipe vertical 1"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        className="swipe-icon"
      >
        <path
          className="hand-y"
          d="M131.09,69.21l-34,24.17-21.6-21.6a9.25,9.25,0,0,0-13.08,0h0a9.25,9.25,0,0,0,0,13.08L103,125.43l-14.18-1.08c-5.11,0-8.72,3.22-9.25,9.25,0,0-1,9.25,3.83,9.25h48l30.14-30.14A9.25,9.25,0,0,0,162.72,101L143.43,72.11A9.28,9.28,0,0,0,131.09,69.21Z"
        />
        <g className="swipe-vertical">
          <path
            className="line-vertical"
            d="M43.94,94.27c-12.46-19.69,0-37,0-37"
          />
          <polyline
            className="arrow-down"
            points="47.93 88.53 45.35 96.75 45.33 96.75 37.11 94.17"
          />
          <polyline
            className="arrow-up"
            points="46.59 64.92 44.01 56.69 43.98 56.7 35.76 59.28"
          />
        </g>
      </svg>
    </div>
  );
};

export default SwipeIcon;
