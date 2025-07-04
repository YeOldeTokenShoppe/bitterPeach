import { useState, useEffect } from 'react';
import { Html } from '@react-three/drei';

function CyberCallout({ 
  position = [0, 3, 0],
  title = "WELCOME TO THE TEMPLE",
  subtitle = "DIGITAL SANCTUARY",
  description = "Enter the sacred space where technology meets spirituality. Explore the cyborg temple and discover its mysteries.",
  buttonText = "CONTINUE",
  onButtonClick,
  is80sMode = false,
  show = true,
  autoHide = true,
  autoHideDelay = 8000 // 8 seconds
}) {
  const [isVisible, setIsVisible] = useState(show);
  
  useEffect(() => {
    if (show && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, autoHideDelay]);
  
  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    }
    setIsVisible(false);
  };
  
  if (!isVisible) return null;
  
  const primaryColor = is80sMode ? '#D946EF' : '#00ff41';
  const accentColor = is80sMode ? '#67e8f9' : '#ffff00';
  
  return (
    <group position={position}>
      <Html
        center
        distanceFactor={10}
        style={{
          transition: 'all 0.3s ease-in-out',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'scale(1)' : 'scale(0.8)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '400px',
            background: 'rgba(0, 0, 0, 0.95)',
            border: `2px solid ${primaryColor}`,
            padding: '30px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            transform: 'skewX(-5deg)',
            boxShadow: `0 0 30px ${primaryColor}40, inset 0 0 30px ${primaryColor}20`,
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Inner content wrapper to counteract skew */}
          <div style={{ transform: 'skewX(5deg)' }}>
            {/* Subtitle */}
            <div
              style={{
                fontSize: '12px',
                color: primaryColor,
                letterSpacing: '3px',
                marginBottom: '8px',
                textTransform: 'uppercase',
              }}
            >
              {subtitle}
            </div>
            
            {/* Title */}
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: accentColor,
                marginBottom: '20px',
                textShadow: `0 0 10px ${accentColor}80`,
                letterSpacing: '1px',
              }}
            >
              {title}
            </div>
            
            {/* Description */}
            <div
              style={{
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '25px',
                color: '#cccccc',
              }}
            >
              {description}
            </div>
            
            {/* Button */}
            <button
              onClick={handleButtonClick}
              style={{
                background: accentColor,
                color: '#000000',
                border: 'none',
                padding: '12px 40px',
                fontSize: '18px',
                fontWeight: 'bold',
                letterSpacing: '2px',
                cursor: 'pointer',
                transform: 'skewX(-5deg)',
                transition: 'all 0.3s ease',
                boxShadow: `0 0 20px ${accentColor}60`,
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'skewX(-5deg) scale(1.05)';
                e.target.style.boxShadow = `0 0 30px ${accentColor}80`;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'skewX(-5deg) scale(1)';
                e.target.style.boxShadow = `0 0 20px ${accentColor}60`;
              }}
            >
              {buttonText}
            </button>
          </div>
          
          {/* Corner decorations */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '0',
              width: '20px',
              height: '20px',
              borderTop: `2px solid ${primaryColor}`,
              borderLeft: `2px solid ${primaryColor}`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              right: '0',
              width: '20px',
              height: '20px',
              borderBottom: `2px solid ${primaryColor}`,
              borderRight: `2px solid ${primaryColor}`,
            }}
          />
        </div>
      </Html>
    </group>
  );
}

export default CyberCallout;