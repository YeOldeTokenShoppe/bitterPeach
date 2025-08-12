import { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TickerCanvasTextureApplier = ({ is80sMode = false }) => {
  const { scene } = useThree();
  const canvasRef = useRef();
  const textureRef = useRef();
  const scrollPos = useRef(0);
  const [tickerMesh, setTickerMesh] = useState(null);
  const [marketData, setMarketData] = useState([]);
  const [fearGreed, setFearGreed] = useState(null);

  // Find the TickerCanvas mesh in the scene
  useEffect(() => {
    if (!scene) return;

    const findTickerCanvas = () => {
      scene.traverse((child) => {
        if (child.name === 'TickerCanvas' && child.isMesh) {
          // console.log('Found TickerCanvas mesh:', child);
          
          // Store reference to the mesh
          setTickerMesh(child);
          
          // Make sure it's visible
          child.visible = true;
          
          // Scale down the height (Y axis)
          child.scale.y *= 0.85;  // Reduce height to 70% of original
          
          // Create canvas with extreme height to compensate for UV stretching
          const canvas = document.createElement("canvas");
          canvas.width = 2048;
          canvas.height = 2048;  // Square canvas to avoid stretching
          canvasRef.current = canvas;

          // Draw initial content
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw in the middle band of the canvas
            const bandY = canvas.height / 2;
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 40px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("LOADING MARKET DATA...", canvas.width / 2, bandY);
          }

          // Create texture from canvas
          const texture = new THREE.CanvasTexture(canvas);
          texture.wrapS = THREE.ClampToEdgeWrapping;  // Changed to clamp to avoid seam issues
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.flipY = false;  // Flip the texture vertically
          texture.needsUpdate = true;
          textureRef.current = texture;

          // Apply texture to the existing mesh's material
          if (child.material) {
            // Create a new material that will show the ticker clearly
            child.material = new THREE.MeshBasicMaterial({
              map: texture,
              color: 0xffffff,
              side: THREE.DoubleSide,
              transparent: false
            });
            // console.log('Applied texture to TickerCanvas mesh');
          }
        }
      });
    };

    // Try immediately
    findTickerCanvas();
    
    // Also try after a delay
    const timeout = setTimeout(findTickerCanvas, 1000);
    
    return () => clearTimeout(timeout);
  }, [scene]);

  // Market data setup
  useEffect(() => {
    mockMarketData();
    fetchCryptoData();
    fetchFearGreedIndex();
    
    const mockDataInterval = setInterval(() => {
      mockMarketData();
    }, 300000);
    
    const cryptoInterval = setInterval(() => {
      fetchCryptoData();
    }, 1800000);
    
    const fearGreedInterval = setInterval(() => {
      fetchFearGreedIndex();
    }, 7200000);
    
    return () => {
      clearInterval(mockDataInterval);
      clearInterval(cryptoInterval);
      clearInterval(fearGreedInterval);
    };
  }, []);

  const mockMarketData = () => {
    const indices = [
      { name: "S&P 500", symbol: "^GSPC", price: 5231.3, changePercent: 0.75 },
      { name: "Nasdaq", symbol: "^IXIC", price: 16423.5, changePercent: 1.2 },
      { name: "VIX", symbol: "^VIX", price: 14.2, changePercent: -2.3 },
      { name: "Gold", symbol: "GC=F", price: 2328.7, changePercent: 0.4 },
    ];
    
    setMarketData(prev => {
      const cryptoData = prev.filter(item => 
        item.name === "Bitcoin" || item.name === "Ethereum"
      );
      return [...cryptoData, ...indices];
    });
  };

  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
      );
      const data = await response.json();

      const cryptoMarketData = [
        {
          name: "Bitcoin",
          symbol: "BTC",
          price: data.bitcoin.usd,
          changePercent: data.bitcoin.usd_24h_change,
        },
        {
          name: "Ethereum",
          symbol: "ETH",
          price: data.ethereum.usd,
          changePercent: data.ethereum.usd_24h_change,
        }
      ];

      setMarketData(prevData => {
        const filteredData = prevData.filter(
          item => item.name !== "Bitcoin" && item.name !== "Ethereum"
        );
        return [...cryptoMarketData, ...filteredData];
      });
    } catch (error) {
      console.error("Error fetching crypto data:", error);
    }
  };

  const fetchFearGreedIndex = async () => {
    try {
      const response = await fetch("https://api.alternative.me/fng/");
      const json = await response.json();
      const data = json.data[0];
      
      setFearGreed({
        name: "Fear & Greed",
        value: data.value,
        classification: data.value_classification,
        isSentiment: true
      });
    } catch (error) {
      console.error("Error fetching Fear & Greed index:", error);
      setFearGreed({
        name: "Fear & Greed",
        value: 50,
        classification: "Neutral",
        isSentiment: true
      });
    }
  };

  const updateCanvas = () => {
    if (!canvasRef.current || !tickerMesh) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update scroll position (slower speed)
    scrollPos.current = (scrollPos.current + 1.5) % canvas.width;

    const allData = [
      ...marketData,
      ...(fearGreed ? [fearGreed] : [])
    ];

    // Draw in a horizontal band in the middle of the canvas
    const bandHeight = 200;  // Height of the text band
    const bandY = (canvas.height - bandHeight) / 2;  // Center the band vertically
    
    ctx.save();
    ctx.translate(0, bandY);
    
    ctx.font = "bold 50px Arial";
    ctx.textBaseline = "middle";
    const yPos = bandHeight / 2;
    
    const drawData = (startX) => {
      let xPos = startX;
      const padding = 150;  // Increased padding to reduce overlap

      allData.forEach((item, index) => {
        if (index > 0) {
          ctx.fillStyle = is80sMode ? "#67e8f9" : "#666666";
          ctx.fillText(" ◆ ", xPos, yPos);
          xPos += ctx.measureText(" ◆ ").width + padding;
        }

        if (item.isSentiment) {
          ctx.fillStyle = is80sMode ? "#67e8f9" : "#E5E5EA";
          ctx.fillText("Fear & Greed:", xPos, yPos);
          xPos += ctx.measureText("Fear & Greed:").width + 50;

          ctx.fillStyle = is80sMode ? "#00ff41" : "#FFFFFF";
          ctx.fillText(item.value, xPos, yPos);
          xPos += ctx.measureText(item.value).width + 50;

          let sentimentColor = "#FFFFFF";
          if (item.value <= 25) sentimentColor = "#FF3B30";
          else if (item.value <= 40) sentimentColor = "#FF9500";
          else if (item.value <= 60) sentimentColor = "#FFCC00";
          else if (item.value <= 75) sentimentColor = "#34C759";
          else sentimentColor = "#00C7BE";

          ctx.fillStyle = sentimentColor;
          ctx.font = "bold 40px Arial";
          ctx.fillText(`(${item.classification})`, xPos, yPos);
          ctx.font = "bold 50px Arial";
          xPos += ctx.measureText(`(${item.classification})`).width + padding * 2;
        } else {
          const nameColor = is80sMode ? "#67e8f9" : "#DDDDDD";
          const priceColor = is80sMode ? "#00ff41" : "#FFFFFF";
          const changeColor = item.changePercent >= 0 ? "#4CD964" : "#FF3B30";

          ctx.fillStyle = nameColor;
          ctx.fillText(`${item.name}:`, xPos, yPos);
          xPos += ctx.measureText(`${item.name}:`).width + 20;  // Reduced spacing

          ctx.fillStyle = priceColor;
          const priceText = item.symbol === "^VIX" ? 
            `${item.price.toFixed(2)}` : 
            `$${item.price.toFixed(2)}`;
          ctx.fillText(priceText, xPos, yPos);
          xPos += ctx.measureText(priceText).width + 20;  // Reduced spacing

          ctx.fillStyle = changeColor;
          ctx.font = "bold 40px Arial";
          const arrow = item.changePercent >= 0 ? "▲" : "▼";
          ctx.fillText(`${arrow}${Math.abs(item.changePercent).toFixed(2)}%`, xPos, yPos);
          ctx.font = "bold 50px Arial";
          xPos += ctx.measureText(`${arrow}${Math.abs(item.changePercent).toFixed(2)}%`).width + padding;
        }
      });

      return xPos;
    };

    // Calculate total width first
    const padding = 150;  // Define padding here for the calculation
    let totalWidth = 0;
    allData.forEach((item, index) => {
      if (index > 0) totalWidth += ctx.measureText(" ◆ ").width + padding;
      if (item.isSentiment) {
        totalWidth += ctx.measureText("Fear & Greed:").width + 50;
        totalWidth += ctx.measureText(item.value).width + 50;
        totalWidth += ctx.measureText(`(${item.classification})`).width + padding * 2;
      } else {
        totalWidth += ctx.measureText(`${item.name}:`).width + 20;
        const priceText = item.symbol === "^VIX" ? `${item.price.toFixed(2)}` : `$${item.price.toFixed(2)}`;
        totalWidth += ctx.measureText(priceText).width + 20;
        totalWidth += ctx.measureText(`▲${Math.abs(item.changePercent).toFixed(2)}%`).width + padding;
      }
    });
    
    // Ensure we have a minimum width to avoid division by zero
    totalWidth = Math.max(totalWidth, 100);
    
    // Draw the ticker data continuously within canvas bounds
    let currentX = -(scrollPos.current % totalWidth);
    while (currentX < canvas.width + totalWidth) {
      drawData(currentX);
      currentX += totalWidth;
    }
    
    ctx.restore();

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };

  useFrame(() => {
    updateCanvas();
  });

  return null;
};

export default TickerCanvasTextureApplier;