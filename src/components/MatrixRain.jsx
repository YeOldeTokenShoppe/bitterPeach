import React, { useEffect, useState } from "react";

function MatrixRain() {
  const [streams, setStreams] = useState([]);

  useEffect(() => {
    // Generate random matrix streams
    const generateStreams = () => {
      const newStreams = [];
      const numberOfStreams = 50; // Adjust based on desired density

      for (let i = 0; i < numberOfStreams; i++) {
        newStreams.push({
          id: i,
          left: `${Math.random() * 100}%`,
          animationDuration: `${Math.random() * 5 + 5}s`, // 5-10 seconds
          delay: `${Math.random() * 2}s`,
          characters: generateRandomCharacters(),
        });
      }

      setStreams(newStreams);
    };

    generateStreams();
  }, []);

  // Generate random matrix-like characters
  const generateRandomCharacters = () => {
    const length = Math.floor(Math.random() * 10) + 10; // 10-20 characters
    const chars = [];

    for (let i = 0; i < length; i++) {
      // Mix of numbers, katakana characters, and symbols
      const charType = Math.random();
      let char;

      if (charType < 0.5) {
        // Numbers
        char = Math.floor(Math.random() * 10).toString();
      } else if (charType < 0.8) {
        // Katakana-like characters (simplified for this example)
        const katakana = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛ";
        char = katakana[Math.floor(Math.random() * katakana.length)];
      } else {
        // Symbols
        const symbols = "!@#$%^&*()_+-=[]{}|;:,./<>?";
        char = symbols[Math.floor(Math.random() * symbols.length)];
      }

      chars.push({
        value: char,
        opacity: Math.random() * 0.5 + 0.5, // 0.5-1.0 opacity
      });
    }

    return chars;
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0, 0, 0, 0.8)",
        overflow: "hidden",
        zIndex: -1,
      }}
    >
      {streams.map((stream) => (
        <div
          key={stream.id}
          style={{
            position: "absolute",
            top: "-100px", // Start above the visible area
            left: stream.left,
            color: "#00FF41",
            fontSize: "16px",
            fontFamily: "monospace",
            animation: `matrixFall ${stream.animationDuration} ${stream.delay} infinite linear`,
            textShadow: "0 0 5px #00FF41",
            zIndex: -1,
          }}
        >
          {stream.characters.map((char, index) => (
            <div
              key={index}
              style={{
                opacity: char.opacity,
                textAlign: "center",
                marginBottom: "2px",
              }}
            >
              {char.value}
            </div>
          ))}
        </div>
      ))}

      <style jsx>{`
        @keyframes matrixFall {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100vh);
          }
        }
      `}</style>
    </div>
  );
}

export default MatrixRain;
