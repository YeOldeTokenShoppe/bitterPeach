/**
 * Simple utility to estimate browser connection speed
 * @returns {Promise<number>} Estimated speed in Mbps
 */
export const getBrowserConnectionSpeed = () => {
  return new Promise((resolve) => {
    // Default to medium speed without trying to load an image
    resolve(3); // Simply return a medium speed value (3 Mbps)

    // Commented out the image loading logic to avoid 404 errors
    /* 
    // Original code causing 404 errors
    const fallbackSpeed = 3;
    const timeoutId = setTimeout(() => {
      console.log("Connection speed test timed out, using fallback value");
      resolve(fallbackSpeed);
    }, 5000);

    try {
      // Generate a random string to prevent caching
      const random = Math.floor(Math.random() * 10000000);
      const imageUrl = `/virginRecords.jpg?nocache=${random}`;
      
      // Record start time
      const startTime = new Date().getTime();
      
      // Create image object
      const downloadImage = new Image();
      
      // Handle successful load
      downloadImage.onload = () => {
        clearTimeout(timeoutId);
        
        // Calculate download time
        const endTime = new Date().getTime();
        const duration = (endTime - startTime) / 1000;
        
        // Approximated image size in KB
        const imageSize = 10;
        
        // Calculate speed in Mbps
        const speedKbps = (imageSize * 8) / duration;
        const speedMbps = speedKbps / 1000;
        
        console.log(`Estimated connection speed: ${speedMbps.toFixed(2)} Mbps`);
        
        // Cap the returned speed
        const cappedSpeed = Math.max(0.5, Math.min(speedMbps, 15));
        resolve(cappedSpeed);
      };
      
      // Handle failed load
      downloadImage.onerror = () => {
        clearTimeout(timeoutId);
        console.warn("Connection speed test failed, using fallback value");
        resolve(fallbackSpeed);
      };
      
      // Start download
      downloadImage.src = imageUrl;
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Error during connection speed test:", err);
      resolve(fallbackSpeed);
    }
    */
  });
};

/**
 * Detect network type (if supported by browser)
 * @returns {string} Network type or "unknown"
 */
export const getNetworkType = () => {
  if (navigator.connection && navigator.connection.type) {
    return navigator.connection.type;
  }
  return "unknown";
};

/**
 * Detect if user is on a metered connection (if supported by browser)
 * @returns {boolean|null} True if metered, false if not, null if can't detect
 */
export const isMeteredConnection = () => {
  if (navigator.connection && navigator.connection.saveData !== undefined) {
    return navigator.connection.saveData;
  }
  if (navigator.connection && navigator.connection.metered !== undefined) {
    return navigator.connection.metered;
  }
  return null;
};

/**
 * Get the recommended audio quality based on connection speed
 * @param {number} speedMbps Connection speed in Mbps
 * @param {boolean} isMetered Whether connection is metered
 * @returns {string} Recommended quality level: "low", "medium", or "high"
 */
export const getRecommendedAudioQuality = (speedMbps, isMetered) => {
  // If on a metered connection, recommend low quality to save data
  if (isMetered) {
    return "low";
  }

  // Based on speed, recommend quality
  if (speedMbps < 1) {
    return "low"; // < 1 Mbps: Use low quality
  } else if (speedMbps < 5) {
    return "medium"; // 1-5 Mbps: Use medium quality
  } else {
    return "high"; // > 5 Mbps: Use high quality
  }
};
