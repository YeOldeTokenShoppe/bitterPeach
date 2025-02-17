"use client";

import React, { useEffect, useRef } from "react";

function Confetti({ children }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas not found");
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      console.error("Parent element not found");
      return;
    }

    const updateCanvasSize = () => {
      const { width: W, height: H } = parent.getBoundingClientRect();

      console.log(`Parent size: ${W}x${H}`);

      if (W > 0 && H > 0) {
        canvas.width = W;
        canvas.height = H;
        console.log(`Canvas updated to size: ${canvas.width}x${canvas.height}`);
      } else {
        console.error("Invalid canvas size");
      }
    };

    updateCanvasSize(); // Initial update
    window.addEventListener("resize", updateCanvasSize);

    const context = canvas.getContext("2d");
    const maxConfettis = 30;
    const particles = [];

    const possibleColors = [
      "DodgerBlue",
      "OliveDrab",
      "Gold",
      "Pink",
      "SlateBlue",
      "LightBlue",
      "Gold",
      "Violet",
      "PaleGreen",
      "SteelBlue",
      "SandyBrown",
      "Chocolate",
      "Crimson",
    ];

    function randomFromTo(from, to) {
      return Math.floor(Math.random() * (to - from + 1) + from);
    }

    function confettiParticle() {
      this.x = Math.random() * (canvas.width - 30);
      this.y = Math.random() * canvas.height - canvas.height;
      this.r = randomFromTo(11, 33);
      this.d = Math.random() * maxConfettis + 11;
      this.color =
        possibleColors[Math.floor(Math.random() * possibleColors.length)];
      this.tilt = Math.floor(Math.random() * 33) - 11;
      this.tiltAngleIncremental = Math.random() * 0.07 + 0.05;
      this.tiltAngle = 0;

      this.draw = function () {
        context.beginPath();
        context.lineWidth = this.r / 2;
        context.strokeStyle = this.color;
        context.moveTo(this.x + this.tilt + this.r / 3, this.y);
        context.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 5);
        return context.stroke();
      };
    }

    function Draw() {
      const results = [];

      requestAnimationFrame(Draw);

      context.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < maxConfettis; i++) {
        results.push(particles[i].draw());
      }

      let particle = {};
      let remainingFlakes = 0;
      for (let i = 0; i < maxConfettis; i++) {
        particle = particles[i];

        particle.tiltAngle += particle.tiltAngleIncremental;
        particle.y += (Math.cos(particle.d) + 0.0001 + particle.r / 5) / 2;
        particle.tilt = Math.sin(particle.tiltAngle - i / 3) * 15;

        if (particle.y <= canvas.height) remainingFlakes++;

        if (
          particle.x > canvas.width + 30 ||
          particle.x < -30 ||
          particle.y > canvas.height
        ) {
          particle.x = Math.random() * (canvas.width - 30);
          particle.y = -30;
          particle.tilt = Math.floor(Math.random() * 10) - 20;
        }
      }

      return results;
    }

    for (let i = 0; i < maxConfettis; i++) {
      particles.push(new confettiParticle());
    }

    Draw();

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        className="confetti-canvas"
        style={{ position: "absolute", top: 0, left: 0, zIndex: 0 }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "95%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default Confetti;
