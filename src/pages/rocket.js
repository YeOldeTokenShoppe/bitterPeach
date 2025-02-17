import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import RocketSimulator from "../components/Rocket";

const RocketPage = () => {
  const router = useRouter();
  const iframeRef = useRef(null);

  useEffect(() => {
    // Set a timer for 20 seconds (or adjust as needed)
    const timer = setTimeout(() => {
      if (iframeRef.current) {
        // Remove the iframe from the document before navigation
        iframeRef.current.remove();
      }
      window.location.href = "https://rl80.xyz"; // Replace with the actual external URL
    }, 10000);

    // Clean up the timer on component unmount
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <RocketSimulator />
      {/* Hidden iframe for preloading */}
      <iframe
        ref={iframeRef}
        src="https://rl80.xyz" // Replace with the actual external URL
        style={{ display: "none" }}
        aria-hidden="true"
      />
    </div>
  );
};

export default RocketPage;
