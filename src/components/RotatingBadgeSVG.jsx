// RotatingBadgeSVG.jsx
"use client";
import React from "react";

const RotatingBadgeSVG = ({ 
  scale = 1, 
  size = 150, 
  text = "PROSPER POPULUS ★ LUCRUM PERPETUUM ★ ",
  textColor = "#e1b67e",
  imageSrc = null, // Center image is optional
  imageSize = 0.5, // Image size as percentage of circle diameter
  rotationSpeed = 20, // seconds for full rotation
  fontSize = 12,
  letterSpacing = 3,
  style = {}
}) => {
  // Calculate dimensions
  const viewBoxSize = 200;
  const radius = viewBoxSize * 0.42; // Text radius
  const center = viewBoxSize / 2;
  
  // Calculate actual size considering scale
  const actualSize = size * scale;
  
  // Split text into individual characters
  const characters = text.split('');
  const angleStep = 360 / characters.length;
  
  return (
    <div 
      style={{
        display: 'inline-block',
        width: `${actualSize}px`,
        height: `${actualSize}px`,
        position: 'relative',
        ...style
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        style={{
          overflow: 'visible',
        }}
      >
        {/* Rotating text group */}
        <g
          style={{
            animation: `rotate ${rotationSpeed}s linear infinite`,
            transformOrigin: `${center}px ${center}px`,
          }}
        >
          {characters.map((char, index) => {
            const angle = index * angleStep;
            const radian = (angle * Math.PI) / 180;
            const x = center + radius * Math.cos(radian - Math.PI / 2);
            const y = center + radius * Math.sin(radian - Math.PI / 2);
            
            return (
              <text
                key={index}
                x={x}
                y={y}
                fill={textColor}
                fontSize={fontSize}
                fontWeight="600"
                fontFamily="Arial, sans-serif"
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${angle} ${x} ${y})`}
                letterSpacing={letterSpacing}
              >
                {char}
              </text>
            );
          })}
        </g>
        
        {/* Center image (static, not rotating) */}
        {imageSrc && (
          <image
            href={imageSrc}
            x={center - (radius * imageSize)}
            y={center - (radius * imageSize)}
            width={radius * imageSize * 2}
            height={radius * imageSize * 2}
            preserveAspectRatio="xMidYMid meet"
          />
        )}
      </svg>
      
      <style jsx>{`
        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default RotatingBadgeSVG;