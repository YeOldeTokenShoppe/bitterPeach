import React, { useState, useCallback } from "react";

const Bouncer = ({
  onDoorClick,
  doorLink = "http://127.0.0.1:5500/public/html/MoonRoom.html",
  disableBlockingBehavior = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isBlocked = !disableBlockingBehavior && isHovered;
  const [currentMessage, setCurrentMessage] = useState(0);

  const bouncerMessages = [
    // Original messages
    "Hold up! You need to hold at least 1 LUNAR token to enter.",
    "Nice try! But this moon's for token holders only. 🌙",
    "No token, no entry! House rules, pal. 🚫",
    "Sorry friend, VIP means Very Important Protocol... and you need a token for that!",
    "Psst... get yourself a LUNAR token and we'll talk. 😉",

    // New space-themed messages
    "Houston, we have a problem... you're missing a LUNAR token! 🚀",
    "One small token for entry, one giant leap for your portfolio! 🌎",
    "Sorry, can't let you space walk without a token suit! 👨‍🚀",
    "This moon party requires proper tokenization! 🎪",

    // Playful bouncer messages
    "My token scanner is showing zero... can't let you in like that! 🔍",
    "No ticket? No token? No entry! I don't make the rules... wait, yes I do! 😎",
    "The password is LUNAR... token. You need the token part too! 🎫",
    "You shall not pass! ...without a LUNAR token, that is. 🧙‍♂️",

    // Crypto-themed humor
    "DYOR? Then you know you need a token to enter! 📚",
    "Proof of Token required beyond this point! ✅",
    // "This isn't a free mint, friend. Token holders only! 🎨",
    "Diamond hands hold tokens. Paper hands stay outside! 💎",

    // Pop culture references
    "To the moon? You'll need a token for that! 🚀",
    "I'm gonna need to see some token verification... 🧐",
    "The first rule of Moon Club? Hold a LUNAR token! 🌙",
    "Luke, I am your bouncer. Show me your tokens! ⭐",

    // Extra silly ones
    "Knock knock! Who's there? Not you without a token! 🚪",
    "My token sense is tingling... and you're not setting it off! 🕷️",
    "Error 403: Token Not Found 🤖",
    "Have token, will travel. No token, no dice! 🎲",
  ];

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setCurrentMessage(Math.floor(Math.random() * bouncerMessages.length));
  }, []);

  const handleDoorClick = (e) => {
    e.preventDefault();
    if (!isBlocked) {
      onDoorClick();
    }
  };
  return (
    <div className="bouncer-container">
      <style>{`
        {/* html, body {
          width: 100%;
          height: 100%;
          margin: 0;
          padding: 0;
          font-family: 'Limelight', cursive;
          color: #38434A;
        } */}
        
        .bouncer-container {
          width: 100%;
          height: 100%;
          position: relative;
          margin-top: 28rem;
          z-index: -1;
   
        }
        
        .background {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
                 
        }
        
        {/* .background::before {
  display: block;
  content: '';
  position: absolute;
  top: -100px;
  left: 50%;
  transform: translateX(-50%);
  width: 450px;
  height: 450px;
  background-image: url('lunar_color.jpg');
  background-size: cover;
  background-position: center;
  border-radius: 50%;
  z-index: -1;
} */}

.background::after {
  display: block;
  content: '';
  position: absolute;
  top: -150px;
  left: 50%;
  transform: translateX(-50%);
  width: 550px;
  height: 550px;
  background-image: url('lunar_color.jpg');
  {/* background-color: #F3F2EE; */}
  opacity: 0.99;
  background-size: cover;
  border: 3px solid goldenrod;
  background-position: center;
  border-radius: 50%;
  z-index: -2;
}
        
          .door {
          position: relative;
          width: 180px;
          height: 300px;
          margin: 0 auto -10px;
          background: #F3F2EE;
          border: 10px solid #DAD2C9;
          border-radius: 3px;
          font-size: 50px;
          line-height: 3;
          text-align: center;
          text-shadow: 0 2px #F5AE4E;
          cursor: pointer;
          transition: all 0.3s ease;
          color: #1D2528;
      
        }
        
        .door::before {
          display: block;
          content: '';
          position: absolute;
          top: 140px;
          right: 10px;
          width: 25px;
          height: 25px;
          background: #1D2528;
          border-radius: 50%;
        }
        
        .door::after {
          display: block;
          content: '';
          position: absolute;
          top: 148px;
          right: 18px;
          width: 35px;
          height: 10px;
          background: #49555B;
          border-radius: 5px;
        }

   
        
        .door.blocked {
          cursor: not-allowed;
          opacity: 0.9;
        }

        .door-link {
          text-decoration: none;
          color: inherit;
          display: block;
          width: 100%;
          height: 100%;
                   font-family: 'Limelight', cursive;
                   line-height: 3;
        }

        .door-link.blocked {
          pointer-events: none;
        }

        /* Testing mode indicator */
        .test-mode {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #FF6B6B;
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 14px;
          z-index: 100;
        }

        
        .rug {
          width: 180px;
          border-bottom: 120px solid #CF352C;
          border-left: 50px solid transparent;
          border-right: 50px solid transparent;
        }
        
        .rug::before {
          display: block;
          content: '';
          position: relative;
          width: 100%;
          height: 10px;
          background: #9C0502;
        }
        
        .foreground {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
        }
        
        .bouncer {
          position: relative;
          left: -130px;
          transition: left 1.5s;
        }
        
        .head {
          position: relative;
          left: 10px;
          margin-bottom: 10px;
          width: 65px;
          height: 90px;
          background: #FFB482;
          border-radius: 15px;
          border-top-left-radius: 30px;
          border-top-right-radius: 30px;
        }
        
        .head::before {
          display: block;
          content: '';
          position: absolute;
          right: 0;
          bottom: 0;
          width: 55px;
          height: 40px;
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
          border-top-left-radius: 30px;
          border-bottom-right-radius: 15px;
          z-index: 10;
        }
        
        .neck {
          position: absolute;
          bottom: -15px;
          width: 48px;
          height: 30px;
          background: #FFB482;
          z-index: 5;
        }
        
        .neck::before {
          display: block;
          content: '';
          position: absolute;
          top: 15px;
          right: 0;
          width: 0px;
          height: 0px;
          border-left: 15px solid transparent;
          border-right: 15px solid rgba(0,0,0,0.3);
          border-top: 2px solid rgba(0,0,0,0.3);
          border-bottom: 2px solid transparent;
        }
        
        .eye {
          position: absolute;
          top: 40px;
          width: 5px;
          height: 5px;
          background: #1D2528;
          border-radius: 50%;
        }
        
        .eye.left {
          right: 5px;
        }
        
        .eye.right {
          right: 30px;
        }
        
        .eye::before {
          display: block;
          content: '';
          position: relative;
          bottom: 8px;
          right: 5px;
          width: 15px;
          height: 5px;
          background: rgba(0,0,0,0.3);
          border-radius: 5px;
          transition: bottom 0.5s;
        }
        
        .ear {
          position: relative;
          top: 40px;
          left: -10px;
          width: 20px;
          height: 20px;
          background: #FFB482;
          border-radius: 50%;
        }
        
        .ear::before {
          display: block;
          content: '';
          position: relative;
          top: 5px;
          left: 5px;
          width: 10px;
          height: 10px;
          background: #FFF;
          border-radius: 50%;
        }
        
        .ear::after {
          display: block;
          content: '';
          position: relative;
          top: -3px;
          left: 10px;
          width: 10px;
          height: 55px;
          border-top: 3px solid transparent;
          border-left: 2px solid #FFF;
          border-bottom: 3px solid transparent;
          border-radius: 50%;
          transform: rotate(-10deg);
          z-index: 10;
        }
        
        .body {
          position: relative;
          width: 110px;
          height: 270px;
          background: #1D2528;
          border-top-right-radius: 45px;
          border-top-left-radius: 15px;
        }
        
        .body::before {
          display: block;
          content: '';
          position: relative;
          top: 5px;
          width: 104px;
          height: 110px;
          background: #FFF;
          border-top-right-radius: 42px;
        }
        
        .body::after {
          display: block;
          content: '';
          position: absolute;
          top: 0;
          width: 75px;
          height: 180px;
          background: #38434A;
          border-top-right-radius: 42px;
          border-top-left-radius: 15px;
          border-bottom-right-radius: 100px;
          border-bottom-left-radius: 10px;
          z-index: 15;
        }
        
        .arm {
          position: absolute;
          top: 105px;
          left: -20px;
          width: 60px;
          height: 230px;
          background: #49555B;
          border-radius: 30px;
          box-shadow: -1px 0px #1D2528;
          transform: rotate(-30deg);
          transform-origin: top center;
          z-index: 20;
          transition: transform 1s;
        }
        
        .arm::before {
          display: block;
          content: '';
          position: absolute;
          bottom: 0;
          width: 60px;
          height: 60px;
          background: #FFB482;
          border-radius: 50%;
        }
        
        .poles {
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-25%);
        }
        
        .pole {
          position: absolute;
          bottom: 0;
          width: 15px;
          height: 135px;
          background: #F5AE4E;
        }
        
        .pole.left {
          left: 200px;
        }
        
        .pole.right {
          right: 200px;
        }
        
        .pole::before {
          display: block;
          content: '';
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 25px;
          height: 25px;
          background: #F5AE4E;
          border-radius: 50%;
          box-shadow: inset 0 -2px #DF9D41;
        }
        
        .pole::after {
          display: block;
          content: '';
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: 25px;
          height: 4px;
          background: #F5AE4E;
          border-radius: 4px;
          box-shadow: 0 2px #DF9D41;
        }
        
        .rope {
          position: absolute;
          top: -110px;
          left: -218px;
          width: 150px;
          height: 75px;
          border: 20px solid #CF352C;
          border-top: 0;
          border-bottom-left-radius: 150px;
          border-bottom-right-radius: 150px;
          box-shadow: 0 2px #9C0502;
          box-sizing: border-box;
          transition: width 1.5s;
        }
        .speech-bubble {
          position: absolute;
          background-color: white;
          border: 2px solid #1D2528;
          border-radius: 10px;
          padding: 12px 15px;
          max-width: 220px;
          top: -80px;
          left: -60px;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.3s, transform 0.3s;
          pointer-events: none;
          z-index: 100;
        }

        .speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 80px;
          border-width: 10px 10px 0;
          border-style: solid;
          border-color: white transparent transparent transparent;
        }

        .speech-bubble::before {
          content: '';
          position: absolute;
          bottom: -12px;
          left: 79px;
          border-width: 11px 11px 0;
          border-style: solid;
          border-color: #1D2528 transparent transparent transparent;
        }

        .speech-bubble-text {
          margin: 0;
          font-family: Arial, sans-serif;
          font-size: 14px;
          color: #1D2528;
          text-align: center;
          line-height: 1.4;
        }

        /* Show speech bubble when bouncer is blocking */
        .hover:hover .bouncer .speech-bubble {
          opacity: 1;
          transform: translateY(0);
        }

        /* Add a slight bounce effect to the speech bubble */
        @keyframes bubbleBounce {
          0% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
          100% { transform: translateY(0); }
        }

        .hover:hover .bouncer .speech-bubble {
          opacity: 1;
          transform: translateY(0);
          animation: bubbleBounce 1s ease-in-out;
        }
        
        .hover:hover .bouncer {
          left: 130px;
        }
        
        .hover:hover .arm {
          transform: rotate(-42deg);
        }
        
        .hover:hover .rope {
          width: 435px;
        }
        
        .hover:hover .eye::before {
          bottom: 4px;
        }
        {/* hover:not(.test-mode):hover .bouncer {
          left: 130px;
        }
        
        .hover:not(.test-mode):hover .arm {
          transform: rotate(-42deg);
        }
        
        .hover:not(.test-mode):hover .rope {
          width: 435px;
        }
        
        .hover:not(.test-mode):hover .eye::before {
          bottom: 4px;
        } */}
      `}</style>
      {disableBlockingBehavior && (
        <div className="test-mode-banner">Test Mode - Blocking Disabled</div>
      )}
      <div
        className={`hover ${disableBlockingBehavior ? "test-mode" : ""}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="background">
          <div
            className={`door ${isBlocked ? "blocked" : ""}`}
            onClick={handleDoorClick}
          >
            <a
              href={doorLink}
              className={`door-link ${isBlocked ? "blocked" : ""}`}
              aria-disabled={isBlocked}
            >
              RL80
              <br />
              <span
                style={{
                  fontSize: "20px",
                  position: "relative",
                  top: "-120px",
                }}
              >
                Moon Room
              </span>
            </a>
          </div>
          <div className="rug"></div>
        </div>
        <div className="foreground">
          <div className="bouncer">
            <div className="speech-bubble">
              <p className="speech-bubble-text">
                {bouncerMessages[currentMessage]}
              </p>
            </div>
            <div className="head">
              <div className="neck"></div>
              <div className="eye left"></div>
              <div className="eye right"></div>
              <div className="ear"></div>
            </div>
            <div className="body"></div>
            <div className="arm"></div>
          </div>
          <div className="poles">
            <div className="pole left"></div>
            <div className="pole right"></div>
            <div className="rope"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Bouncer;
