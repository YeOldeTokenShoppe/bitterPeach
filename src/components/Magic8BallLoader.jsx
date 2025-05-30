import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/Magic8BallLoader.module.css';

const Magic8BallLoader = ({ isLoading = true, onComplete, loadingProgress = 0 }) => {
  const [currentMessage, setCurrentMessage] = useState(null);
  const [isShaking, setIsShaking] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isAnswerTrulyVisible, setIsAnswerTrulyVisible] = useState(false);
  const messageIndexRef = useRef(0);

  // Format text to fit triangle shape
  const formatMessageForTriangle = (message) => {
    // Remove existing <br/> tags, normalize spaces, and split into words
    const text = message.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();
    const words = text.split(' ');
    
    // Take up to the first 3 words
    const lines = words.slice(0, 3);
    
    return lines.join('<br/>');
  };

  // Fun loading messages
  const loadingMessages = [
    // "Loading<br/>your<br/>destiny...",

    "Gathering<br/>cosmic<br/>energy...",
    "Almost<br/>there...",
    "Channeling<br/>the<br/>universe...",
    "Preparing<br/>something<br/>magical...",
    "Aligning<br/>the<br/>stars...",
    "Summoning<br/>digital<br/>forces...",
    "Decoding<br/>the<br/>matrix...",
    "Loading<br/>awesomeness...",
    "Patience<br/>young<br/>one...",
    "Consulting<br/>the<br/>spirits...",
    "Brewing<br/>digital<br/>magic...",
    "Calculating<br/>infinite<br/>possibil80s...",
    "Warming<br/>up the<br/>servers...",
    "Fetching<br/>ethereal<br/>data...",
    "Synchronizing<br/>dimensions...",
    "Optimizing<br/>your<br/>experience...",
    "Building<br/>something<br/>special...",
    // "Get ready<br/>for<br/>amazement..."
  ];

  // Auto-reveal messages periodically
  useEffect(() => {
    if (!isLoading) return;

    const shakeInterval = setInterval(() => {
      // First, hide any existing message
      setShowMessage(false);
      setTimeout(() => {
        setIsAnswerTrulyVisible(false);
      }, 250);
      
      // Wait for message to fully hide, then start shaking
      setTimeout(() => {
        setIsShaking(true);
        
        // Get a random message
        const nextIndex = Math.floor(Math.random() * loadingMessages.length);
        messageIndexRef.current = nextIndex;
        
        // Show the new message after shaking starts
        setTimeout(() => {
          const formattedMessage = formatMessageForTriangle(loadingMessages[nextIndex]);
          setCurrentMessage(formattedMessage);
          setDisplayIndex(nextIndex); // Update display index for even/odd styling
          setIsAnswerTrulyVisible(true);
          setShowMessage(true);
        }, 1000);
        
        // Stop shaking after animation completes
        setTimeout(() => {
          setIsShaking(false);
          // Message stays visible while floating for 3 seconds
        }, 1500);
        
        // Hide message after 3 seconds of floating
        setTimeout(() => {
          setShowMessage(false); // Fascia slides down
          setTimeout(() => {
            setIsAnswerTrulyVisible(false); // Hide content after fascia
          }, 250);
        }, 4500); // 1.5s shake + 3s float
      }, 250);
    }, 8750); // Total cycle: 0.25s hide + 1.5s shake + 3s float + 4s wait = 8.75s

    // Initial shake after 1 second
    const initialTimer = setTimeout(() => {
      setIsShaking(true);
      setTimeout(() => {
        const formattedMessage = formatMessageForTriangle(loadingMessages[0]);
        setCurrentMessage(formattedMessage);
        setDisplayIndex(0);
        setIsAnswerTrulyVisible(true);
        setShowMessage(true);
      }, 1000);
      setTimeout(() => {
        setIsShaking(false);
      }, 1500);
      setTimeout(() => {
        setShowMessage(false); // Fascia slides down
        setTimeout(() => {
          setIsAnswerTrulyVisible(false); // Hide content after fascia
        }, 250);
      }, 4500); // 1.5s shake + 3s float = 4.5s from start of shake
    }, 1000);

    return () => {
      clearInterval(shakeInterval);
      clearTimeout(initialTimer);
    };
  }, [isLoading]);

  // Simulate loading progress if none provided
  useEffect(() => {
    if (loadingProgress === 0 && isLoading) {
      const progressInterval = setInterval(() => {
        setFakeProgress(prev => {
          if (prev >= 95) return 95;
          return prev + Math.random() * 5;
        });
      }, 300);
      
      return () => clearInterval(progressInterval);
    } else {
      setFakeProgress(loadingProgress);
    }
  }, [loadingProgress, isLoading]);

  // Handle hover effect
  const handleMouseEnter = () => {
    setIsHovering(true);
    if (!showMessage && !isShaking) {
      setTimeout(() => {
        setIsShaking(true);
        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        
        setTimeout(() => {
          const formattedMessage = formatMessageForTriangle(loadingMessages[randomIndex]);
          setCurrentMessage(formattedMessage);
          setDisplayIndex(randomIndex);
          setIsAnswerTrulyVisible(true);
          setShowMessage(true);
        }, 500);
        
        setTimeout(() => {
          setIsShaking(false);
        }, 1000);
      }, 100);
    }
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  // Handle touch interaction for mobile
  const handleTouch = (e) => {
    e.preventDefault(); // Prevent default touch behavior
    if (!showMessage && !isShaking) {
      setTimeout(() => {
        setIsShaking(true);
        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        
        setTimeout(() => {
          const formattedMessage = formatMessageForTriangle(loadingMessages[randomIndex]);
          setCurrentMessage(formattedMessage);
          setDisplayIndex(randomIndex);
          setIsAnswerTrulyVisible(true);
          setShowMessage(true);
        }, 500);
        
        setTimeout(() => {
          setIsShaking(false);
        }, 1000);
      }, 100);
    }
  };

  if (!isLoading) return null;

  const displayProgress = Math.min(Math.round(fakeProgress || loadingProgress), 100);

  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loaderBackdrop}>
    
        <div 
          className={`${styles.eightBallWrapper} ${isShaking ? styles.shaking : ''} ${isHovering ? styles.hovering : ''}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouch}
        >
          <div className={styles.eightBall}>
            <div className={styles.eightBackdrop}></div>
            <div className={styles.eightWindow}></div>
            <div className={styles.solidBlackMessageBackground}></div>
            <div 
              className={`${styles.answerContainer} ${isAnswerTrulyVisible ? styles.visible : ''} ${displayIndex % 2 === 0 ? styles.even : styles.odd}`}
              dangerouslySetInnerHTML={{ __html: currentMessage }}
            />
            <div className={`${styles.eightFascia} ${showMessage ? styles.slideUp : ''}`}>
              <div className={styles.eightNumber}>80</div>
            </div>
          </div>
        </div>
        <div className="thelma" style={{position: 'relative', top: '1.5rem', fontFamily: 'UnifrakturCook', fontSize: '2.5rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(138, 43, 226, 0.8), 0 0 20px rgba(138, 43, 226, 0.4)'}}>
         <span style={{fontFamily: 'UnifrakturMaguntia', fontSize: '3rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(138, 43, 226, 0.8), 0 0 20px rgba(138, 43, 226, 0.4)'}}>L</span>oading <span style={{fontFamily: 'Roboto', fontSize: '3rem', fontWeight: 'bold', textShadow: '0 0 10px rgba(138, 43, 226, 0.8), 0 0 20px rgba(138, 43, 226, 0.4)'}}> ...</span>{displayProgress}%
        </div>
        {/* <div className={styles.loadingText}>
          <div className={styles.magicalDots} translate="no">
            <span className={styles.dot1}>✦</span>
            <span className={styles.dot2}>✧</span>
            <span className={styles.dot3}>✦</span>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default Magic8BallLoader;