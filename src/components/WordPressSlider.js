// components/WordPressSlider.js
import React, { useEffect, useState } from "react";
import Loader from "./Loader";

const frameUrl = "https://rl80.com";

const WordPressSlider = () => {
  // const [isLoading, setIsLoading] = useState(true);
  // useEffect(() => {
  //   const timeout = setTimeout(() => {
  //     setWordPressSliderLoaded(true);
  //   }, 3000); // Adjust timeout as needed
  //   return () => clearTimeout(timeout); // Cleanup
  // }, [setWordPressSliderLoaded]);
  return (
    <>
      <div
        style={{
          width: "100%",
          height: "100vh",
          overflow: "hidden",
          margin: 0,
          padding: 0,
          zIndex: 1,
        }}
      >
        <iframe
          id="wordpress-slider"
          src={frameUrl}
          width="100%"
          height="100%"
          style={{ border: "none", margin: 0, padding: 0 }}
          allowFullScreen
          scrolling="no"
        />
      </div>
    </>
  );
};

export default WordPressSlider;
