// FireEffect.js
import React, { useEffect, useRef } from "react";

const TokenText = () => {
  const fireRef = useRef(null);

  useEffect(() => {
    const obj = fireRef.current;
    const fps = 200;
    const letters = obj.textContent.split(""); // Use textContent instead of innerHTML
    obj.innerHTML = ""; // Clear the original content
    letters.forEach((letter) => {
      const span = document.createElement("span");
      span.textContent = letter; // Use textContent to avoid HTML injection
      obj.appendChild(span);
    });

    const animateLetters = obj.querySelectorAll("span");
    const intervalId = setInterval(() => {
      animateLetters.forEach((letter) => {
        letter.style.fontSize = `${80 + Math.floor(Math.random() * 50)}px`;
      });
    }, fps);

    return () => clearInterval(intervalId); // Clean up on unmount
  }, []);

  return (
    <p ref={fireRef} className="unique-fire-effect">
      PI80
    </p>
  );
};

export default TokenText;
