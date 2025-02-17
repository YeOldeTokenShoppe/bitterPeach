import React, { useState, useEffect } from "react";

const NeonSign = () => {
  const [text, setText] = useState("  OPEN ");

  useEffect(() => {
    const interval = setInterval(() => {
      setText((prevText) => (prevText === "   OPEN " ? "24/7" : "   OPEN "));
    }, 2000); // Change text every 2 seconds

    return () => clearInterval(interval); // Clean up the interval on unmount
  }, []);

  return (
    <div class="neon-sign-container">
      <div className="neon-sign">
        <h1 id="neon-text">{text}</h1>
        {/* <h1 id="neon-text">OPEN</h1> */}
      </div>
    </div>
  );
};

export default NeonSign;
