import React, { useEffect, useRef, useCallback } from "react";

const CoinLoader = ({ size = "small", showText = true, withSparkle = true, isLoading = true }) => {
  const sparkleRef = useRef(null);
  const animationRef = useRef(null);
  const starsRef = useRef([]);

  // Memoize constants
  const CONSTANTS = {
    MAX_STARS: 40,
    STAR_INTERVAL: 16,
    MAX_STAR_LIFE: 3000, // Convert to ms
    MIN_STAR_LIFE: 1000,
    MAX_STAR_SIZE: 40,
    MIN_STAR_SIZE: 20,
    MIN_STAR_TRAVEL_X: 120,
    MIN_STAR_TRAVEL_Y: 150,
  };

  // Pre-defined color palette to avoid HSL calculations
  const STAR_COLORS = [
    '#00ff80', '#40ff40', '#80ff00', // Blues/Greens
    '#8040ff', '#a040ff', '#c040ff', // Purples
    '#ffff40', '#ffd040', '#ffb040', // Yellows/Golds
  ];

  const getRandomColor = useCallback(() => {
    return STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
  }, []);

  const random = useCallback((max, min) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }, []);

  const randomDirection = useCallback(() => {
    return Math.random() > 0.5 ? 1 : -1;
  }, []);

  // Object pool for star elements
  const starPool = useRef([]);
  
  const getStarElement = useCallback(() => {
    if (starPool.current.length > 0) {
      return starPool.current.pop();
    }
    
    const star = document.createElement("div");
    star.className = "star";
    return star;
  }, []);

  const returnStarElement = useCallback((star) => {
    if (star.parentNode) {
      star.parentNode.removeChild(star);
    }
    // Reset styles
    star.style.cssText = '';
    starPool.current.push(star);
  }, []);

  useEffect(() => {
    if (!withSparkle || typeof window === "undefined" || !sparkleRef.current) {
      return;
    }

    const sparkle = sparkleRef.current;
    const stars = starsRef.current;
    let lastStarTime = 0;
    let animationId;

    const createStar = () => {
      if (stars.length >= CONSTANTS.MAX_STARS) return;

      const size = random(CONSTANTS.MAX_STAR_SIZE, CONSTANTS.MIN_STAR_SIZE);
      
      const startX = random(
        sparkle.offsetWidth * 0.75,
        sparkle.offsetWidth * 0.25
      );
      const startY = sparkle.offsetHeight / 2 - size / 2;

      const xDir = randomDirection();
      const yDir = randomDirection();

      const xMaxTravel = xDir === -1 ? startX : sparkle.offsetWidth - startX - size;
      const yMaxTravel = sparkle.offsetHeight / 2 - size;

      const xTravelDist = random(xMaxTravel, CONSTANTS.MIN_STAR_TRAVEL_X);
      const yTravelDist = random(yMaxTravel, CONSTANTS.MIN_STAR_TRAVEL_Y);

      const endX = startX + xTravelDist * xDir;
      const endY = startY + yTravelDist * yDir;

      const life = random(CONSTANTS.MAX_STAR_LIFE, CONSTANTS.MIN_STAR_LIFE);

      const starElement = getStarElement();
      
      // Set all styles at once with cssText for better performance
      starElement.style.cssText = `
        --start-left: ${startX}px;
        --start-top: ${startY}px;
        --end-left: ${endX}px;
        --end-top: ${endY}px;
        --star-life: ${life}ms;
        --star-life-num: ${life / 1000};
        --star-size: ${size}px;
        --star-color: ${getRandomColor()};
      `;

      const star = {
        element: starElement,
        life,
        startTime: Date.now()
      };

      stars.push(star);
      sparkle.appendChild(starElement);

      // Schedule removal
      setTimeout(() => {
        const index = stars.indexOf(star);
        if (index > -1) {
          stars.splice(index, 1);
          returnStarElement(star.element);
        }
      }, life);
    };

    const animate = (currentTime) => {
      // Throttle star creation
      if (currentTime - lastStarTime >= CONSTANTS.STAR_INTERVAL) {
        createStar();
        lastStarTime = currentTime;
      }

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      
      // Clean up all stars
      stars.forEach(star => returnStarElement(star.element));
      stars.length = 0;
    };
  }, [withSparkle, getRandomColor, random, randomDirection, getStarElement, returnStarElement]);

  // Early return for non-loading state
  if (!isLoading && isLoading !== undefined) {
    return null;
  }

  // Memoize size calculation
  const sizeMap = {
    small: "4rem",
    medium: "6rem", 
    large: "9rem",
    fullscreen: "9rem"
  };

  const coinSize = sizeMap[size] || size;
  const isFullscreen = size === "fullscreen";

  return (
    <div className={`coin-loader-page-wrapper ${isFullscreen ? "fullscreen" : ""}`}>
      <div className="coin-loader-wrapper">
        <div 
          ref={sparkleRef}
          className={`coin-loader-container ${withSparkle ? 'sparkle' : ''}`}
          style={{ 
            "--loader-coin-diam": coinSize,
            "--loader-coin-depth": `calc(${coinSize} * 0.1)`,
            "--loader-spin-speed": "4s"
          }}
        >
          <div className="loader-purse">
            <div className="loader-coin">
              <div className="loader-front"></div>
              <div className="loader-back"></div>
              <div className="loader-side">
                {[...Array(16)].map((_, index) => (
                  <div key={index} className="loader-spoke"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      
      </div>
    </div>
  );
};

export default CoinLoader;