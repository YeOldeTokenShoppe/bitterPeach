import React, { useEffect, useState } from 'react';
import { db, doc, onSnapshot } from '../utilities/firebaseClient';
import styles from '../styles/RL80MarketWidget.module.css';

const RL80MarketWidget = () => {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeUntilNext, setTimeUntilNext] = useState('');

  // Parse markdown-style formatting
  const formatAnalysis = (text) => {
    if (!text) return '';
    
    // Convert markdown bold to HTML
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert bullet points to proper list items
    const lines = formatted.split('\n');
    let inList = false;
    let result = [];
    
    for (let line of lines) {
      if (line.trim().startsWith('•')) {
        if (!inList) {
          result.push('<ul>');
          inList = true;
        }
        result.push(`<li>${line.trim().substring(1).trim()}</li>`);
      } else if (line.trim().startsWith('🔸')) {
        if (!inList) {
          result.push('<ul class="' + styles.coinList + '">');
          inList = true;
        }
        result.push(`<li>${line.trim()}</li>`);
      } else {
        if (inList) {
          result.push('</ul>');
          inList = false;
        }
        result.push(`<p>${line}</p>`);
      }
    }
    
    if (inList) {
      result.push('</ul>');
    }
    
    return result.join('');
  };

  // Calculate time until next update (8 AM or 8 PM UTC)
  const calculateTimeUntilNext = () => {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();
    
    // Next update is at 8 AM or 8 PM UTC
    let hoursUntilNext;
    if (utcHours < 8) {
      // Next update is at 8 AM today
      hoursUntilNext = 8 - utcHours - 1;
    } else if (utcHours < 20) {
      // Next update is at 8 PM today
      hoursUntilNext = 20 - utcHours - 1;
    } else {
      // Next update is at 8 AM tomorrow
      hoursUntilNext = 32 - utcHours - 1;
    }
    
    const minutesUntilNext = 59 - utcMinutes;
    const secondsUntilNext = 59 - utcSeconds;
    
    // Format the time remaining
    const hours = hoursUntilNext.toString().padStart(2, '0');
    const minutes = minutesUntilNext.toString().padStart(2, '0');
    const seconds = secondsUntilNext.toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    // Real-time listener for market data
    const marketRef = doc(db, 'marketData', 'latest');
    
    const unsubscribe = onSnapshot(marketRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          setMarketData(data);
          setLoading(false);
          setError(null);
        } else {
          setError("No market data available yet");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching market data:", err);
        setError("Failed to load market data");
        setLoading(false);
      }
    );

    // Update countdown timer every second
    const timer = setInterval(() => {
      setTimeUntilNext(calculateTimeUntilNext());
    }, 1000);

    // Initial calculation
    setTimeUntilNext(calculateTimeUntilNext());

    // Cleanup listener and timer on unmount
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.marketWidget}>
        <div className={styles.loading}>Loading market data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.marketWidget}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.marketWidget}>
      <div className={styles.updateInfo}>
        {marketData.timestamp && (
          <div className={styles.timestamp}>
            Last updated: {new Date(marketData.timestamp).toLocaleString()}
          </div>
        )}
        <div className={styles.countdown}>
          Next update in: <span className={styles.countdownTime}>{timeUntilNext}</span>
        </div>
      </div>
      
      {marketData.summary && (
        <div className={styles.summary}>{marketData.summary}</div>
      )}
      
      {marketData.analysis && (
        <div className={styles.analysis}>
          <h3>Market Analysis</h3>
          <div dangerouslySetInnerHTML={{ __html: formatAnalysis(marketData.analysis) }} />
        </div>
      )}
      
      {marketData.topCoins && marketData.topCoins.length > 0 && (
        <div className={styles.topCoins}>
          <h3>Top Performing Coins</h3>
          <div className={styles.coinsGrid}>
            {marketData.topCoins.map((coin, index) => {
              // Parse coin data (e.g., "CAKE (+13.9%)")
              const match = coin.match(/^(\w+)\s*\(([\+\-]?[\d.]+%)\)$/);
              const symbol = match ? match[1] : coin;
              const change = match ? match[2] : '';
              
              return (
                <div key={index} className={styles.coinCard}>
                  <span className={styles.coinSymbol}>{symbol}</span>
                  {change && <span className={styles.coinChange}>{change}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {marketData.receivedAt && (
        <div className={styles.receivedTimestamp}>
          Data received: {new Date(marketData.receivedAt.toDate()).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default RL80MarketWidget;