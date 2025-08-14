import React, { useState } from 'react';

const SwirlLoader = ({ showControls = true, show80 = true }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isUppercase, setIsUppercase] = useState(true);

  return (
    <>
      <style jsx>{`
        .swirl-loader-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          margin: 0;
          background: transparent;
          overflow: hidden;
          display: grid;
          height: 100vh;
          place-items: center;
          container-type: size;
          z-index: 9999;
        }

        .container {
          position: relative;
          display: flex;
          font-size: min(.9cqh, .45cqw);
          --h: 100em;
          height: var(--h);
          width: calc(2*var(--h) - 6.5em);
          transform: scale(0.5);
          background: transparent;
        }

        .wrapper {
          position: absolute;
          height: 100%;
          width: unset;
          aspect-ratio: 1;
          display: grid;
          background: transparent;
        }

        .wrapper:nth-child(2) {
          right: 0;
          bottom: unset;
        }

        .swirl {
          position: absolute;
          inset: 0;
          --dur: 10s;
          display: grid;
          align-items: center;
          justify-items: unset;
          animation: spin var(--dur) linear infinite;
          animation-play-state: ${isPlaying ? 'running' : 'paused'};
          background: transparent;
        }

        .wrapper:nth-child(2) .swirl {
          animation-direction: reverse;
        }

        span {
          position: absolute;
          width: 50%;
          height: unset;
          color: #fff;
          font-family: monospace;
          font-weight: bold;
          font-size: calc(var(--h)/10);
          rotate: calc(360deg/28*var(--nth)*var(--dir));
          animation: fade var(--dur) linear infinite;
          animation-delay: calc(-1*var(--dur)/28 * var(--nth));
          animation-play-state: ${isPlaying ? 'running' : 'paused'};
          --glow: hsl(calc(360deg/28*var(--nth)) 100% 50%);
          text-shadow: 0 0 1em var(--glow), 0 0 .5em var(--glow), 0 0 .25em var(--glow);
          text-transform: ${isUppercase ? 'uppercase' : 'lowercase'};
        }

        span:nth-child(1) { --nth: 1; }
        span:nth-child(2) { --nth: 2; }
        span:nth-child(3) { --nth: 3; }
        span:nth-child(4) { --nth: 4; }
        span:nth-child(5) { --nth: 5; }
        span:nth-child(6) { --nth: 6; }
        span:nth-child(7) { --nth: 7; }
        span:nth-child(8) { --nth: 8; }
        span:nth-child(9) { --nth: 9; }
        span:nth-child(10) { --nth: 10; }
        span:nth-child(11) { --nth: 11; }
        span:nth-child(12) { --nth: 12; }
        span:nth-child(13) { --nth: 13; }
        span:nth-child(14) { --nth: 14; }
        span:nth-child(15) { --nth: 15; }
        span:nth-child(16) { --nth: 16; }
        span:nth-child(17) { --nth: 17; }
        span:nth-child(18) { --nth: 18; }
        span:nth-child(19) { --nth: 19; }
        span:nth-child(20) { --nth: 20; }
        span:nth-child(21) { --nth: 21; }
        span:nth-child(22) { --nth: 22; }
        span:nth-child(23) { --nth: 23; }
        span:nth-child(24) { --nth: 24; }
        span:nth-child(25) { --nth: 25; }
        span:nth-child(26) { --nth: 26; }
        span:nth-child(27) { --nth: 27; }
        span:nth-child(28) { --nth: 28; }
        
        .wrapper:nth-child(1) span {
          left: 50%;
          text-align: end;
          transform-origin: 0% 50%;
          --dir: 1;
          animation-direction: reverse;
        }

        .wrapper:nth-child(2) span {
          right: 50%;
          text-align: start;
          transform-origin: 100% 50%;
          --dir: -1;
        }

        @keyframes spin {
          100% { rotate: 360deg; }
        }

        @keyframes fade {
          0%, 10% { opacity: 0; }
          55%, 100% { opacity: 1; }
        }

        @media (orientation: portrait) {
          .container {
            font-size: min(.9cqw,.45cqh);
            width: var(--h);
            height: calc(2*var(--h) - 11.5em);
          }

          .wrapper {
            width: 100%;
            height: unset;
            right: unset;
            bottom: 0;
          }

          .swirl {
            justify-items: center;
            align-items: unset;
          }

          span {
            height: 50%;
            width: unset;
            display: grid;
          }

          .wrapper:nth-child(1) span {
            bottom: 50%;
            left: unset;
            text-align: end;
            transform-origin: 50% 100%;
            --dir: 1;
            animation-direction: reverse;
            
          }

          .wrapper:nth-child(2) span {
            top: 50%;
            right: unset;
            text-align: start;
            transform-origin: 50% 0%;
            --dir: -1;
            align-items: end;
          }
        }
      `}</style>
      
      <div className="swirl-loader-container">
        <div className="container">
          <div className="wrapper">
            <div className="swirl">
              <span>T</span>
              <span>H</span>
              <span>E</span>
              <span> </span>
              <span>E</span>
              <span>N</span>
              <span>D</span>
              <span> </span>
              <span>I</span>
              <span>S</span>
              <span> </span>
              <span>T</span>
              <span>H</span>
              <span>E</span>
              <span> </span>
              <span>B</span>
              <span>E</span>
              <span>G</span>
              <span>I</span>
              <span>N</span>
              <span>N</span>
              <span>I</span>
              <span>N</span>
              <span>G</span>
              <span> </span>
              <span>I</span>
              <span>S</span>
            </div>
          </div>

          <div className="wrapper">
            <div className="swirl">
              <span>T</span>
              <span>H</span>
              <span>E</span>
              <span> </span>
              <span>E</span>
              <span>N</span>
              <span>D</span>
              <span> </span>
              <span>I</span>
              <span>S</span>
              <span> </span>
              <span>T</span>
              <span>H</span>
              <span>E</span>
              <span> </span>
              <span>B</span>
              <span>E</span>
              <span>G</span>
              <span>I</span>
              <span>N</span>
              <span>N</span>
              <span>I</span>
              <span>N</span>
              <span>G</span>
              <span> </span>
              <span>I</span>
              <span>S</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SwirlLoader;