import { get2DPosition } from "./annotations";
import React, { useEffect, useState } from "react";

export const SCREEN_BUTTON_CONFIG = {
  default: {
    primaryButton: {
      label: "OK",
      action: "resetToMarker3", // This will trigger returning to marker 3 view
    },
  },
  Screen1: {
    primaryButton: {
      label: "OK",
      action: "resetToMarker3",
    },
  },
  Screen2: {
    primaryButton: {
      label: "OK",
      action: "resetToMarker3",
    },
  },
  Screen3: {
    primaryButton: {
      label: "OK",
      action: "resetToMarker3",
    },
  },
  Screen4: {
    primaryButton: {
      label: "OK",
      action: "resetToMarker3",
    },
  },
  Screen5: {
    primaryButton: {
      label: "OK",
      action: "resetToMarker3",
    },
  },
  Screen6: {
    primaryButton: {
      label: "OK",
      action: "resetToMarker3",
    },
  },
};

export const ScreenAnnotation = ({
  text,
  isVisible,
  setIsVisible,
  position,
  onReset,
  containerSize,
  camera,
  screenName,
}) => {
  const [delayedVisibility, setDelayedVisibility] = useState(false);

  useEffect(() => {
    if (isVisible) {
      const timeout = setTimeout(() => {
        setDelayedVisibility(true);
      }, 1500);

      return () => clearTimeout(timeout);
    } else {
      setDelayedVisibility(false);
    }
  }, [isVisible]);

  const buttonConfig =
    SCREEN_BUTTON_CONFIG[screenName] || SCREEN_BUTTON_CONFIG.default;
  const screenPos = get2DPosition(position, camera, containerSize);

  return (
    <div
      className="screen-annotation"
      style={{
        position: "fixed",
        left: `${Math.max(
          Math.min(screenPos.x, containerSize.width - 100),
          10
        )}px`,
        top: `${Math.max(
          Math.min(screenPos.y, containerSize.height - 100),
          10
        )}px`,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "#fff",
        borderRadius: "5%",
        zIndex: 100000,
        opacity: delayedVisibility ? 1 : 0,
        visibility: isVisible ? "visible" : "hidden",
        display: isVisible ? "flex" : "none",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px",
        pointerEvents: isVisible && delayedVisibility ? "all" : "none",
        border: "2px solid #ffff00",
        transition: "opacity 0.3s ease-in-out",
      }}
    >
      <button
        onClick={() => setIsVisible(false)}
        style={{
          position: "absolute",
          top: "5px",
          right: "5px",
          backgroundColor: "transparent",
          color: "#fff",
          border: "none",
          fontSize: "20px",
          fontWeight: "bold",
          cursor: "pointer",
          padding: "5px",
          borderRadius: "50%",
        }}
      >
        ×
      </button>

      <p style={{ margin: 0, paddingBottom: "10px", paddingTop: "10px" }}>
        {text}
      </p>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (buttonConfig.primaryButton.action === "resetToMarker3") {
            onReset();
          }
        }}
        style={{
          padding: "10px",
          marginTop: "10px",
          backgroundColor: "#ffff00",
          color: "#000000",
          border: "none",
          borderRadius: "8px",
          width: "auto",
          minWidth: "5rem",
          height: "36px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        {buttonConfig.primaryButton.label}
      </button>
    </div>
  );
};
