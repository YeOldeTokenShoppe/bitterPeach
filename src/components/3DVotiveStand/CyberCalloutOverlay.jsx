import { useState, useEffect } from 'react';

function CyberCalloutOverlay({ 
  title = "WELCOME TO THE TEMPLE",
  subtitle = "DIGITAL SANCTUARY",
  description = "Enter the sacred space where technology meets spirituality. Explore the cyborg temple and discover its mysteries.",
  buttonText = "CONTINUE",
  onButtonClick,
  secondButtonText = null,
  onSecondButtonClick = null,
  is80sMode = false,
  show = true,
  autoHide = true,
  autoHideDelay = 8000 // 8 seconds
}) {
  const [isVisible, setIsVisible] = useState(show);
  const [isClosing, setIsClosing] = useState(false);
  
  // Sync internal state with show prop
  useEffect(() => {
    setIsVisible(show);
  }, [show]);
  
  useEffect(() => {
    if (show && autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoHide, autoHideDelay]);
  
  const triggerClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
    }, 500); // Wait for glitch animation to complete
  };

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    }
    triggerClose();
  };
  
  const handleSecondButtonClick = () => {
    if (onSecondButtonClick) {
      onSecondButtonClick();
    }
    triggerClose();
  };
  
  if (!isVisible) return null;
  
  const primaryColor = is80sMode ? '#D946EF' : '#c896ff';
  const accentColor = is80sMode ? '#67e8f9' : '#ffff00';
  
  return (
    <div
        style={{
          position: 'fixed',
          left: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          transition: 'all 0.3s ease-in-out',
          opacity: isVisible ? 1 : 0,
          pointerEvents: isVisible ? 'auto' : 'none',
          maxWidth: 'calc(100vw - 40px)', // Ensure it doesn't overflow viewport
        }}
      >
          <div
        className={isClosing ? "glitch-box-closing" : (is80sMode ? "glitch-box" : "")}
        style={{
          position: 'relative',
          width: '320px',
          maxWidth: '100%',
          background: 'rgba(0, 0, 0, 0.55)',
          border: `2px solid ${primaryColor}`,
          padding: '20px',
          fontFamily: 'Arial, sans-serif',
          color: '#ffffff',
          transform: 'skewX(5deg)',
          boxShadow: `0 0 30px ${primaryColor}40, inset 0 0 30px ${primaryColor}20`,
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => {
            if (onButtonClick) {
              onButtonClick();
            }
            triggerClose();
          }}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'transparent',
            border: `1px solid ${primaryColor}`,
            color: primaryColor,
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            fontSize: '20px',
            lineHeight: '1',
            padding: '0',
            transition: 'all 0.3s ease',
            transform: 'skewX(-5deg)', // Counteract parent skew
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001,
          }}
          onMouseEnter={(e) => {
            e.target.style.background = primaryColor;
            e.target.style.color = '#000000';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.color = primaryColor;
          }}
          aria-label="Close"
        >
          ×
        </button>
        
        {/* Inner content wrapper to counteract skew */}
        <div style={{ transform: 'skewX(-5deg)' }}>
          {/* Subtitle */}
          <div
            style={{
              fontSize: 'clamp(10px, 2vw, 12px)',
              color: primaryColor,
              letterSpacing: '2px',
              marginBottom: '6px',
              textTransform: 'uppercase',
            }}
          >
            {subtitle}
          </div>
          
          {/* Title with glitch effect */}
          <div
            className={is80sMode ? "glitch-active" : ""}
            style={{
              fontSize: 'clamp(20px, 4vw, 26px)',
              fontWeight: 'bold',
              color: accentColor,
              marginBottom: '15px',
              textShadow: `0 0 10px ${accentColor}80`,
              letterSpacing: '1px',
              lineHeight: '1.2',
              position: 'relative',
              animation: is80sMode ? 'glitch-skew 1s infinite linear alternate-reverse' : 'none',
            }}
          >
            <span className="glitch-text" data-text={title}>
              {title}
            </span>
          </div>
          
          {/* Description */}
          <div
            style={{
              fontSize: 'clamp(13px, 2.5vw, 14px)',
              lineHeight: '1.5',
              marginBottom: '20px',
              color: '#cccccc',
            }}
          >
            {description}
          </div>
          
          {/* Buttons */}
          <div
            style={{
              display: 'flex',
              gap: '15px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <button
              onClick={handleButtonClick}
              style={{
                background: accentColor,
                color: '#000000',
                border: 'none',
                padding: 'clamp(8px, 2vw, 10px) clamp(20px, 4vw, 30px)',
                fontSize: 'clamp(14px, 2.5vw, 16px)',
                fontWeight: 'bold',
                letterSpacing: '2px',
                cursor: 'pointer',
                transform: 'skewX(5deg)',
                transition: 'all 0.3s ease',
                boxShadow: `0 0 20px ${accentColor}60`,
                textTransform: 'uppercase',
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'skewX(5deg) scale(1.05)';
                e.target.style.boxShadow = `0 0 30px ${accentColor}80`;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'skewX(5deg) scale(1)';
                e.target.style.boxShadow = `0 0 20px ${accentColor}60`;
              }}
            >
              {buttonText}
            </button>
            
            {secondButtonText && (
              <button
                onClick={handleSecondButtonClick}
                style={{
                  background: 'transparent',
                  color: accentColor,
                  border: `2px solid ${accentColor}`,
                  padding: 'clamp(8px, 2vw, 10px) clamp(20px, 4vw, 30px)',
                  fontSize: 'clamp(14px, 2.5vw, 16px)',
                  fontWeight: 'bold',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  transform: 'skewX(5deg)',
                  transition: 'all 0.3s ease',
                  boxShadow: `0 0 20px ${accentColor}40`,
                  textTransform: 'uppercase',
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = accentColor;
                  e.target.style.color = '#000000';
                  e.target.style.transform = 'skewX(5deg) scale(1.05)';
                  e.target.style.boxShadow = `0 0 30px ${accentColor}80`;
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = accentColor;
                  e.target.style.transform = 'skewX(5deg) scale(1)';
                  e.target.style.boxShadow = `0 0 20px ${accentColor}40`;
                }}
              >
                {secondButtonText}
              </button>
            )}
          </div>
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
        
        {/* Animated scan line effect */}
        <div
          style={{
            position: 'absolute',
            zIndex: '-1',
            top: '0',
            left: '0',
            right: '0',
            height: '2px',
            background: `linear-gradient(90deg, transparent, #67e8f9, transparent)`,
            animation: 'scanline 3s linear infinite',
          }}
        />
      </div>
      
      {/* CSS for animations and glitch effect */}
      <style jsx>{`
        @keyframes scanline {
          0% { transform: translateY(0); }
          100% { transform: translateY(250px); }
        }
        
        @keyframes glitch-skew {
          0% {
            transform: skew(0deg);
          }
          20% {
            transform: skew(2deg);
          }
          40% {
            transform: skew(-1deg);
          }
          60% {
            transform: skew(0.5deg);
          }
          80% {
            transform: skew(-0.5deg);
          }
          100% {
            transform: skew(0deg);
          }
        }
        
        .glitch-text {
          position: relative;
          display: inline-block;
        }
        
        .glitch-active .glitch-text::before,
        .glitch-active .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: transparent;
        }
        
        .glitch-active .glitch-text::before {
          animation: glitch-1 0.5s infinite;
          color: #00ff41;
          z-index: -1;
          opacity: 0.8;
        }
        
        .glitch-active .glitch-text::after {
          animation: glitch-2 0.5s infinite;
          color: #ff00ff;
          z-index: -2;
          opacity: 0.8;
        }
        
        @keyframes glitch-1 {
          0% {
            clip-path: inset(40% 0 61% 0);
            transform: translate(-3px, 0);
          }
          20% {
            clip-path: inset(92% 0 1% 0);
            transform: translate(3px, 0);
          }
          40% {
            clip-path: inset(43% 0 1% 0);
            transform: translate(-3px, 0);
          }
          60% {
            clip-path: inset(25% 0 58% 0);
            transform: translate(3px, 0);
          }
          80% {
            clip-path: inset(54% 0 7% 0);
            transform: translate(-3px, 0);
          }
          100% {
            clip-path: inset(58% 0 43% 0);
            transform: translate(3px, 0);
          }
        }
        
        @keyframes glitch-2 {
          0% {
            clip-path: inset(65% 0 8% 0);
            transform: translate(3px, 0);
          }
          20% {
            clip-path: inset(31% 0 70% 0);
            transform: translate(-3px, 0);
          }
          40% {
            clip-path: inset(10% 0 85% 0);
            transform: translate(3px, 0);
          }
          60% {
            clip-path: inset(85% 0 15% 0);
            transform: translate(-3px, 0);
          }
          80% {
            clip-path: inset(21% 0 74% 0);
            transform: translate(3px, 0);
          }
          100% {
            clip-path: inset(40% 0 61% 0);
            transform: translate(-3px, 0);
          }
        }
        
        /* Closing glitch animation for both modes */
        .glitch-box-closing {
          animation: box-close-glitch 0.5s ease-out;
        }
        
        @keyframes box-close-glitch {
          0% {
            filter: none;
            transform: skewX(5deg) scale(1);
            opacity: 1;
          }
          10% {
            filter: saturate(3) hue-rotate(90deg) brightness(1.2);
            transform: skewX(-8deg) translateX(5px) scale(1.02);
          }
          20% {
            filter: saturate(0.5) hue-rotate(-90deg) contrast(2);
            transform: skewX(15deg) translateX(-8px) scale(0.98);
          }
          30% {
            filter: brightness(1.5) contrast(2);
            transform: skewX(-12deg) scale(1.03);
          }
          40% {
            filter: invert(1) hue-rotate(180deg);
            transform: skewX(20deg) translateX(10px);
          }
          50% {
            filter: brightness(2) saturate(0);
            transform: skewX(-15deg) translateX(-5px) scale(0.95);
          }
          60% {
            filter: hue-rotate(270deg) contrast(3);
            transform: skewX(10deg) scale(1.05);
            opacity: 0.8;
          }
          70% {
            transform: skewX(-20deg) translateX(15px) scale(0.9);
            opacity: 0.6;
          }
          80% {
            transform: skewX(25deg) translateX(-10px) scale(0.85);
            opacity: 0.4;
          }
          90% {
            transform: skewX(-10deg) scale(0.8);
            opacity: 0.2;
          }
          100% {
            filter: none;
            transform: skewX(0deg) scale(0.7);
            opacity: 0;
          }
        }
        
        /* Keep the 80s mode continuous glitch for title */
        .glitch-box {
          /* Remove the box glitch animation for 80s mode since we only want title glitch */
        }
        
        @media (max-width: 480px) {
          /* Mobile phones */
          div[style*="width: 320px"] {
            width: 260px !important;
            padding: 15px !important;
          }
          div[style*="gap: 15px"] {
            flex-direction: column !important;
            gap: 10px !important;
          }
          div[style*="left: 20px"] {
            left: 10px !important;
          }
        }
        
        @media (min-width: 481px) and (max-width: 768px) {
          /* Tablets */
          div[style*="width: 320px"] {
            width: 300px !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          /* Small laptops - use default 320px */
        }
      `}</style>
    </div>
  );
}

export default CyberCalloutOverlay;