// UserTooltip.jsx
import React, { useState } from "react";

export const CandleTooltip = ({ userName, image, message, position }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  console.log("CandleTooltip rendering at:", position);

  if (!position) return null;

  return (
    <div
      className="tooltip-container"
      style={{
        position: "absolute",
        left: `${position.x}px`, // Add px unit
        top: `${position.y}px`, // Add px unit
        transform: "translate(-50%, -100%)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        pointerEvents: "auto",
        backgroundColor: "rgba(0,0,0,0.75)", // Add background for visibility
        padding: "4px",
        borderRadius: "4px",
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div
        className="avatar-container"
        style={{
          width: isExpanded ? "80px" : "40px",
          height: isExpanded ? "80px" : "40px",
          borderRadius: "50%",
          overflow: "hidden",
          transition: "all 0.3s ease",
          border: "2px solid rgba(255,255,255,0.8)",
          boxShadow: "0 0 20px rgba(255,165,0,0.5)",
          backgroundColor: "rgba(0,0,0,0.2)",
        }}
      >
        {image ? (
          <img
            src={image}
            alt={userName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: isExpanded ? "24px" : "16px",
            }}
          >
            {userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div
        style={{
          opacity: isExpanded ? 1 : 0,
          transform: `translateY(${isExpanded ? 0 : -10}px)`,
          transition: "all 0.3s ease",
          marginTop: "8px",
          textAlign: "center",
          color: "white",
          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: "8px",
          borderRadius: "4px",
          maxWidth: "200px",
        }}
      >
        <div
          className="user-name"
          style={{ fontWeight: "bold", marginBottom: "4px" }}
        >
          {userName}
        </div>
        {message && (
          <div
            className="message"
            style={{
              fontSize: "0.9em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              wordBreak: "break-word",
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
};
export const TooltipContainer = ({ tooltipData }) => {
  if (!tooltipData?.length) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 9999,
      }}
    >
      {tooltipData.map((data) => (
        <CandleTooltip key={data.candleId} {...data} />
      ))}
    </div>
  );
};
export default TooltipContainer;
