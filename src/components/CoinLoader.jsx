import React, { useEffect, useRef } from "react";

const CoinLoader = ({ size = "small", showText = true, withSparkle = true, isLoading = true }) => {
  const sparkleRef = useRef(null);

  useEffect(() => {
    if (!withSparkle || typeof window === "undefined" || !sparkleRef.current) {
      return;
    }

    const sparkle = sparkleRef.current;

    const MAX_STARS = 40;
    const STAR_INTERVAL = 16;

    const MAX_STAR_LIFE = 3;
    const MIN_STAR_LIFE = 1;

    const MAX_STAR_SIZE = 40;
    const MIN_STAR_SIZE = 20;

    const MIN_STAR_TRAVEL_X = 120;
    const MIN_STAR_TRAVEL_Y = 150;

    const randomLimitedColor = () => {
      const randomHue = (() => {
        const ranges = [
          { min: 120, max: 150 }, // Blues
          { min: 270, max: 290 }, // Violets/Purples
          { min: 45, max: 60 }, // Yellows and Golds
        ];
        const range = ranges[Math.floor(Math.random() * ranges.length)];
        return (
          Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
        );
      })();

      return `hsla(${randomHue}, 100%, 50%, 1)`;
    };

    const Star = class {
      constructor() {
        this.size = this.random(MAX_STAR_SIZE, MIN_STAR_SIZE);

        this.x = this.random(
          sparkle.offsetWidth * 0.75,
          sparkle.offsetWidth * 0.25
        );
        this.y = sparkle.offsetHeight / 2 - this.size / 2;

        this.x_dir = this.randomMinus();
        this.y_dir = this.randomMinus();

        this.x_max_travel =
          this.x_dir === -1 ? this.x : sparkle.offsetWidth - this.x - this.size;
        this.y_max_travel = sparkle.offsetHeight / 2 - this.size;

        this.x_travel_dist = this.random(this.x_max_travel, MIN_STAR_TRAVEL_X);
        this.y_travel_dist = this.random(this.y_max_travel, MIN_STAR_TRAVEL_Y);

        this.x_end = this.x + this.x_travel_dist * this.x_dir;
        this.y_end = this.y + this.y_travel_dist * this.y_dir;

        this.life = this.random(MAX_STAR_LIFE, MIN_STAR_LIFE);

        this.star = document.createElement("div");
        this.star.classList.add("star");

        this.star.style.setProperty("--start-left", this.x + "px");
        this.star.style.setProperty("--start-top", this.y + "px");

        this.star.style.setProperty("--end-left", this.x_end + "px");
        this.star.style.setProperty("--end-top", this.y_end + "px");

        this.star.style.setProperty("--star-life", this.life + "s");
        this.star.style.setProperty("--star-life-num", this.life);

        this.star.style.setProperty("--star-size", this.size + "px");
        this.star.style.setProperty("--star-color", randomLimitedColor());
      }

      draw() {
        sparkle.appendChild(this.star);
      }

      pop() {
        sparkle.removeChild(this.star);
      }

      random(max, min) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      randomMinus() {
        return Math.random() > 0.5 ? 1 : -1;
      }
    };

    let current_star_count = 0;
    const intervalId = setInterval(() => {
      if (current_star_count >= MAX_STARS) {
        return;
      }

      current_star_count++;

      const newStar = new Star();
      newStar.draw();

      setTimeout(() => {
        current_star_count--;
        newStar.pop();
      }, newStar.life * 1000);
    }, STAR_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [withSparkle]);

  // If isLoading is passed and false, don't render anything
  if (!isLoading && isLoading !== undefined) {
    return null;
  }

  // Size presets
  const sizeMap = {
    small: "4rem",
    medium: "6rem",
    large: "9rem",
    fullscreen: "9rem"
  };

  const coinSize = sizeMap[size] || size;

  return (
    <div className={`coin-loader-page-wrapper ${size === "fullscreen" ? "fullscreen" : ""}`}>
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
        {showText && (
          <div className="coin-loader-text">Loading...</div>
        )}
      </div>
    </div>
  );
};

export default CoinLoader;