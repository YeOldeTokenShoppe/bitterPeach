import React, { useState } from "react";
import styles from "../../styles/Carousel8.module.css";

const Carousel8 = ({ images, onImageSelect, avatarUrl }) => {
  const [currdeg, setCurrdeg] = useState(0);
  const [selectedUrl, setSelectedUrl] = useState(null); // Track the selected image URL
  const rotationStep = 360 / images.length;

  const getBaseUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch (e) {
      return url;
    }
  };

  const avatarBaseURL = getBaseUrl(avatarUrl);

  const handleSelectImage = (image, index) => {
    setSelectedUrl(image.url); // Store the selected image URL
    onImageSelect(image, index); // Pass both image and index to the parent
  };

  const rotate = (direction) => {
    const newDegree =
      currdeg + (direction === "next" ? -rotationStep : rotationStep);
    setCurrdeg(newDegree);
  };

  const calculateBlur = (index) => {
    const angle = (index * rotationStep + currdeg) % 360;
    return (angle >= -45 && angle <= 45) ||
      (angle >= 315 && angle <= 360) ||
      (angle >= -360 && angle <= -315)
      ? "none"
      : "blur(5px)";
  };

  const isVideo = (url) => {
    return url.endsWith(".mp4");
  };

  return (
    <div className={styles.container8}>
      <div
        className={styles.carousel8}
        style={{ transform: `rotateY(${currdeg}deg)` }}
      >
        {images.map((image, index) => {
          const isAvatar = getBaseUrl(image.url) === avatarBaseURL;
          const isSelected = getBaseUrl(image.url) === getBaseUrl(selectedUrl); // Check if this image is selected

          return (
            <div
              key={index}
              className={`${styles.item8} ${
                isSelected ? styles.selectedImage : ""
              }`}
              style={{
                transform: `rotateY(${
                  index * rotationStep
                }deg) translateZ(320px)`,
                filter: calculateBlur(index),
                transition: "filter 0.3s ease",
              }}
              onClick={() => handleSelectImage(image, index)} // Ensure index is passed
            >
              {/* Conditionally render video or image */}
              {isVideo(image.url) ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className={styles.video}
                  style={{
                    width: "100%",
                    height: "auto",
                    objectFit: "cover",
                    border: isSelected ? "3px solid green" : "none", // Highlight video border if selected
                  }}
                >
                  <source src={image.url} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <img
                  src={image.url}
                  alt={`Slide ${index + 1}`}
                  className={isAvatar ? styles.avatarImage : ""}
                />
              )}

              {isAvatar && (
                <img
                  src="/frame1.png"
                  alt="Frame"
                  className={styles.frameStyle}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className={styles.next} onClick={() => rotate("next")}>
        Next
      </div>
      <div className={styles.prev} onClick={() => rotate("prev")}>
        Prev
      </div>
    </div>
  );
};

export default Carousel8;
