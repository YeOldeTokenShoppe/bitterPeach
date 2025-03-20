import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

export default function AudioWaveform({
  audioUrl,
  color = "#3498db",
  height = 80,
}) {
  const waveformRef = useRef(null);
  const wavesurferRef = useRef(null);

  useEffect(() => {
    if (!audioUrl) return;

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: color,
      progressColor: "#2980b9",
      cursorColor: "#e74c3c",
      barWidth: 2,
      barRadius: 3,
      height: height,
      responsive: true,
      normalize: true,
      backend: "WebAudio",
    });

    wavesurferRef.current = wavesurfer;

    // Load audio
    wavesurfer.load(audioUrl);

    // Clean up on unmount
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl, color, height]);

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  return (
    <div className="audio-waveform-container">
      <div className="waveform" ref={waveformRef}></div>
      <div className="flex justify-center mt-2">
        <button
          className="px-4 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white"
          onClick={handlePlayPause}
        >
          Play/Pause
        </button>
      </div>
    </div>
  );
}
