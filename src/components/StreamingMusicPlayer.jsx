import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

function StreamingMusicPlayer({ trackUrl }) {
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hls.loadSource(trackUrl);
      hls.attachMedia(audio);

      return () => {
        hls.destroy();
      };
    } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari
      audio.src = trackUrl;
    }
  }, [trackUrl]);

  return <audio ref={audioRef} controls />;
}

export default StreamingMusicPlayer;
