import React, { useState, useEffect } from "react";
import styles from "../../styles/Loader.module.css"; // Scoped styles for the loader

function Loader({ progress }) {
  // Use provided progress or create internal state for simulated progress
  const [loadingPercentage, setLoadingPercentage] = useState(progress || 0);

  // Debug log when component mounts
  useEffect(() => {
    console.log("Loader component mounted with initial progress:", progress);
  }, []);

  // If no progress prop is provided, simulate loading progress
  useEffect(() => {
    if (progress === undefined) {
      console.log("No progress provided, using simulated progress");
      // Only run the simulation if no progress prop is provided
      const interval = setInterval(() => {
        setLoadingPercentage((prevPercentage) => {
          // Slow down as it approaches 100%
          const increment =
            prevPercentage < 70 ? 5 : prevPercentage < 90 ? 2 : 1;
          const newPercentage = Math.min(prevPercentage + increment, 99);
          return newPercentage;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [progress]);

  // Update internal state when progress prop changes
  useEffect(() => {
    if (progress !== undefined) {
      console.log("Progress updated:", progress);
      setLoadingPercentage(progress);
    }
  }, [progress]);

  // Log current percentage for debugging
  useEffect(() => {
    console.log("Current loading percentage:", loadingPercentage);
  }, [loadingPercentage]);

  return (
    <div className={styles.loaderRoot}>
      <div className={styles.loaderWrapper}>
        <div className={styles.loaderContainer}>
          {/* Coin animation */}
          <div id="loadingScreen" className={styles.pl}>
            <div className={styles.pl__coin}>
              <div className={styles.pl__coinFlare}></div>
              <div className={styles.pl__coinFlare}></div>
              <div className={styles.pl__coinFlare}></div>
              <div className={styles.pl__coinFlare}></div>
              <div className={styles.pl__coinLayers}>
                <div className={styles.pl__coinLayer}>
                  <div className={styles.pl__coinInscription}>RL80</div>
                </div>
                <div className={styles.pl__coinLayer}></div>
                <div className={styles.pl__coinLayer}></div>
                <div className={styles.pl__coinLayer}></div>
                <div className={styles.pl__coinLayer}>
                  <div className={styles.pl__coinInscription}>RL80</div>
                </div>
              </div>
            </div>
            <div className={styles.pl__shadow}></div>
          </div>

          {/* Loading percentage display - now as a separate element */}
          <div className={styles.loadingInfo}>
            <div className={styles.loadingMessage}>Loading...</div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${loadingPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Loader;
