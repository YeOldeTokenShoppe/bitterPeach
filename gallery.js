import React, { useState } from "react";

const Gallery = () => {
  // Initialize visibility state to true for showing on page load
  const [isMusicPlayerVisible, setIsMusicPlayerVisible] = useState(true);
  const [is80sMode, setIs80sMode] = useState(false);

  return (
    <>
      <MusicPlayer2
        isVisible={isMusicPlayerVisible}
        // other props...
      />
      {/* other components */}
    </>
  );
};

export default Gallery;
