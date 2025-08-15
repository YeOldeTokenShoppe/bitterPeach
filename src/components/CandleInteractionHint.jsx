import React, { useState, useEffect } from 'react';

const CandleInteractionHint = ({ isMobileView }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if user has already seen the hint
    const hasSeenHint = localStorage.getItem('hasSeenCandleHint');
    
    // For testing, you can uncomment the next line to always show the hint
    // localStorage.removeItem('hasSeenCandleHint');
    
    if (!hasSeenHint) {
      // First, mount the component but keep it off-screen
      const mountTimer = setTimeout(() => {
        setShouldShow(true);
        // Then animate it in after a brief delay
        setTimeout(() => {
          setIsVisible(true);
        }, 100);
      }, 2000);

      // Auto-hide after 8 seconds
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        // Mark as seen after animation completes
        setTimeout(() => {
          localStorage.setItem('hasSeenCandleHint', 'true');
        }, 500);
      }, 10000);

      return () => {
        clearTimeout(mountTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('hasSeenCandleHint', 'true');
  };

  if (!shouldShow) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        transform: isVisible ? 'translateX(0)' : 'translateX(calc(100% + 40px))',
        zIndex: 10001,
        pointerEvents: isVisible ? 'auto' : 'none',
        opacity: isVisible ? 1 : 0,
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-in-out',
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(17, 17, 17, 0.95) 100%)',
          border: '1.5px solid #00ff41',
          borderRadius: '8px',
          padding: isMobileView ? '16px' : '20px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 0 10px rgba(0, 255, 65, 0.3), 0 0 20px rgba(0, 255, 65, 0.15), inset 0 0 20px rgba(0, 255, 65, 0.05)',
          maxWidth: isMobileView ? '260px' : '320px',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'transparent',
            border: '1px solid #00ff41',
            borderRadius: '4px',
            color: '#00ff41',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '2px 6px',
            lineHeight: '1',
            transition: 'all 0.2s ease',
            textShadow: '0 0 4px #00ff41',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(0, 255, 65, 0.1)';
            e.target.style.boxShadow = '0 0 8px rgba(0, 255, 65, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'transparent';
            e.target.style.boxShadow = 'none';
          }}
        >
          ×
        </button>

        {/* Animated hand cursor */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '60px',
              height: '60px',
            }}
          >
            {/* Candle icon */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '32px',
                filter: 'drop-shadow(0 0 12px #00ff41) drop-shadow(0 0 6px #67e8f9)',
                animation: 'glowPulse 2s ease-in-out infinite',
              }}
            >
              🕯️
            </div>
            
            {/* Animated hand cursor */}
            <div
              style={{
                position: 'absolute',
                top: '45%',
                left: '60%',
                animation: 'tapAnimation 2s ease-in-out infinite',
                fontSize: '24px',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
              }}
            >
              {isMobileView ? '👆' : '👆'}
            </div>

            {/* Ripple effect */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                border: '2px solid #00ff41',
                boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
                animation: 'ripple 2s ease-in-out infinite',
              }}
            />
          </div>
        </div>

        {/* Instruction text */}
        <div
          style={{
            textAlign: 'center',
            color: '#00ff41',
            fontSize: isMobileView ? '15px' : '16px',
            fontWeight: '600',
            marginBottom: '6px',
            textShadow: '0 0 8px #00ff41, 0 0 4px #00ff41',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          {isMobileView ? 'Tap' : 'Click'} on any candle
        </div>
        
        <div
          style={{
            textAlign: 'center',
            color: '#67e8f9',
            fontSize: isMobileView ? '13px' : '14px',
            lineHeight: '1.3',
            textShadow: '0 0 6px rgba(103, 232, 249, 0.6)',
            fontFamily: 'monospace',
          }}
        >
          for closer view
        </div>

        {/* Skip hint text */}
        <div
          style={{
            textAlign: 'center',
            color: 'rgba(0, 255, 65, 0.5)',
            fontSize: '11px',
            marginTop: '10px',
            fontFamily: 'monospace',
            textShadow: '0 0 3px rgba(0, 255, 65, 0.3)',
          }}
        >
          [{isMobileView ? 'TAP' : 'CLICK'} TO DISMISS]
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes tapAnimation {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-8px, -8px) scale(0.95);
          }
        }

        @keyframes ripple {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.5);
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.5);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            filter: drop-shadow(0 0 12px #00ff41) drop-shadow(0 0 6px #67e8f9);
          }
          50% {
            filter: drop-shadow(0 0 20px #00ff41) drop-shadow(0 0 12px #67e8f9);
          }
        }
      `}</style>
    </div>
  );
};

export default CandleInteractionHint;