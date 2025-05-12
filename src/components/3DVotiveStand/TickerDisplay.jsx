import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

const TickerDisplay = ({ modelRef, ...props }) => {
  const meshRef = useRef();
  const canvasRef = useRef();
  const textureRef = useRef();
  const scrollPos = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const fetchTimeRef = useRef(Date.now());
  const gltf = useGLTF("/alligatorStroll.glb");
  const scene = gltf.scene;
  const baseRadius = 2.8; // Store the base radius as a constant
  const lastModelScale = useRef(1); // Track the last known model scale
  const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY;
  const FMP_API_KEY = "kUsgBNt4QQmJzi0TFe0MHLIg1NlpWnsR";
  const CMC_API_KEY = process.env.NEXT_PUBLIC_COINMARKETCAP; // Updated to match .env variable name
  const [activeGroup, setActiveGroup] = useState(1);

  // Get access to the main Three.js scene
  const { scene: mainScene } = useThree();

  const [marketData, setMarketData] = useState([]);
  const [fearGreed, setFearGreed] = useState(null);

  // Define which indices to fetch from FMP
  const fmpIndices = [
    { name: "Nasdaq", symbol: "^IXIC", fmpSymbol: "%5EIXIC" },
    { name: "Dow Jones", symbol: "^DJI", fmpSymbol: "%5EDJI" },
    { name: "S&P 500", symbol: "^GSPC", fmpSymbol: "%5EGSPC" },
  ];

  // Market data symbol groups
  const marketSymbolsGroup1 = [
    { name: "VIX", symbol: "^VIX" },
    { name: "Dollar Index", symbol: "DX-Y.NYB" },
  ];
  
  const marketSymbolsGroup2 = [
    { name: "Gold", symbol: "GC=F" },
    { name: "10Y Treasury Yield", symbol: "^TNX" },
  ];

  // Use mock data for market indices
  const mockMarketData = () => {
    // Create reliable mock data with small fluctuations
    const now = Date.now();
    
    // Filter out Oil from the indices list so we don't add it here
    const filteredIndices = [
      ...fmpIndices,
      ...marketSymbolsGroup1,
      ...marketSymbolsGroup2
    ].filter(item => item.name !== "Oil"); // Explicitly filter out Oil from mock data
    
    // Create the initial data
    const mockIndices = filteredIndices.map(({ name, symbol }) => {
      // Base price with slight randomization based on time
      const basePrice = getMockPrice(symbol);
      // Small change that varies slightly over time 
      const timeVariation = Math.sin(now / 10000000) * 2; // Slow variation over time
      const randomVariation = (Math.random() - 0.5) * 0.5; // Small random component
      const changePercent = timeVariation + randomVariation;
      
      return {
        name,
        symbol,
        price: basePrice * (1 + changePercent/100), // Adjust price by change percentage
        changePercent: changePercent,
      };
    });
    
    // Update market data, preserving crypto data
    setMarketData(prevData => {
      // Keep crypto data (Bitcoin and Ethereum) from CoinGecko
      const cryptoData = prevData.filter(
        item => item.name === "Bitcoin" || item.name === "Ethereum"
      );
      
      // Keep real oil data fetched from Alpha Vantage
      const oilData = prevData.filter(
        item => item.name === "Oil" && item.symbol === "CL=F"
      );
      
      // First the indices, then VIX, Dollar Index, Gold, Oil
      // Move 10Y Treasury Yield to the end to give it more space
      const treasuryYield = mockIndices.find(item => item.name === "10Y Treasury Yield");
      const otherItems = mockIndices.filter(item => item.name !== "10Y Treasury Yield");
      
      // Create the ordered array with Treasury Yield at the end if found
      const orderedItems = [...otherItems];
      if (treasuryYield) {
        orderedItems.push(treasuryYield);
      }
      
      return [...cryptoData, ...oilData, ...orderedItems];
    });
  };

  // Generate plausible mock prices for development/fallback
  const getMockPrice = (symbol) => {
    // Return realistic mock prices for different symbols
    switch(symbol) {
      case "^IXIC": return 16423.5;  // Nasdaq
      case "^DJI": return 38521.4;   // Dow Jones
      case "^GSPC": return 5231.3;   // S&P 500
      case "^VIX": return 14.2;      // VIX
      case "DX-Y.NYB": return 105.8; // Dollar Index
      case "GC=F": return 2328.7;    // Gold
      case "^TNX": return 4.427;     // 10Y Treasury
      default: return 100.0;
    }
  };
  
  // Generate plausible mock price changes for development/fallback
  const getMockChange = (symbol) => {
    // Return small random changes within +/- 2%
    return (Math.random() * 4 - 2).toFixed(2);
  };
  
  // Use mock market data with a timer for updates
  useEffect(() => {
    mockMarketData(); // Initially populate with mock data
    fetchAlphaVantageData(); // Fetch real data for oil and dollar index
    
    // Update real data every 30 minutes
    const realDataInterval = setInterval(() => {
      fetchAlphaVantageData();
    }, 1800000);
    
    // Update mock data every 5 minutes for other items
    const mockDataInterval = setInterval(() => {
      mockMarketData();
    }, 300000);
    
    return () => {
      clearInterval(mockDataInterval);
      clearInterval(realDataInterval);
    };
  }, []);

  // Add a function to fetch crypto data from CoinGecko
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
        // Remove any existing BTC/ETH entries
        const filteredData = prevData.filter(
          item => item.name !== "Bitcoin" && item.name !== "Ethereum"
        );
        return [...filteredData, ...cryptoMarketData];
      });
    } catch (error) {
      console.error("Error fetching crypto data from CoinGecko:", error);
      // Optionally, set mock data here as a fallback
    }
  };

  // Simplified Fear and Greed Index function using mock data
  const fetchFearGreedIndex = async () => {
    try {
      // Try to fetch from Firebase Cloud Function that proxies CoinMarketCap
      console.log("Fetching Fear & Greed index from CoinMarketCap via Firebase...");
      const cmcResponse = await fetch(
        // Using the actual Firebase project ID
        "https://us-central1-hailmary-3ff6c.cloudfunctions.net/getFearAndGreed"
      );
      
      if (cmcResponse.ok) {
        const cmcData = await cmcResponse.json();
        
        setFearGreed({
          name: "Fear & Greed",
          value: cmcData.value,
          classification: cmcData.classification,
          isSentiment: true
        });
        
        console.log("Successfully fetched Fear & Greed index from CoinMarketCap");
        return;
      } else {
        console.warn("Failed to fetch from CoinMarketCap Fear & Greed API via Firebase, trying alternative.me...");
      }

      // Fallback to alternative.me API
      console.log("Fetching Fear & Greed index from alternative.me...");
      const altResponse = await fetch("https://api.alternative.me/fng/");
      
      if (!altResponse.ok) {
        throw new Error("Failed to fetch from alternative.me");
      }
      
      const altJson = await altResponse.json();
      const altData = altJson.data[0];
      
      setFearGreed({
        name: "Fear & Greed",
        value: altData.value,
        classification: altData.value_classification,
        isSentiment: true
      });
      
      console.log("Successfully fetched Fear & Greed index from alternative.me");
    } catch (error) {
      console.error("Error fetching Fear & Greed index:", error);
      
      // Generate realistic mock Fear & Greed data
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      
      // Use the day of year as a seed for a semi-random value that changes daily
      // but remains consistent within the same day
      const baseMockValue = ((dayOfYear * 7) % 100);
      
      // Add a small hourly variation
      const hourVariation = (today.getHours() % 4) - 2; // -2 to +1 range
      const mockValue = Math.max(1, Math.min(99, baseMockValue + hourVariation));
      
      // Map to classification
      let mockClassification = "Neutral";
      if (mockValue <= 20) mockClassification = "Extreme Fear";
      else if (mockValue <= 40) mockClassification = "Fear";
      else if (mockValue <= 60) mockClassification = "Neutral";
      else if (mockValue <= 80) mockClassification = "Greed";
      else mockClassification = "Extreme Greed";
      
      setFearGreed({
        name: "Fear & Greed",
        value: mockValue,
        classification: mockClassification,
        isSentiment: true
      });
      
      console.log(`Using mock Fear & Greed index data: ${mockValue} (${mockClassification})`);
    }
  };

  useEffect(() => {
    fetchFearGreedIndex();
    // Fetch Fear & Greed index every 2 hours
    const interval = setInterval(fetchFearGreedIndex, 7200000);
    return () => clearInterval(interval);
  }, []);

  // Format large numbers
  const formatNumber = (value) => {
    if (value === null || value === undefined) return "---";
    const num =
      typeof value === "string"
        ? parseFloat(value.replace(/[^0-9.-]/g, ""))
        : parseFloat(value);
    if (isNaN(num)) return "---";
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(1);
  };

  const formatPercentage = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "---";
    return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
  };

  const formatCurrency = (value) => {
    const formatted = formatNumber(value);
    return formatted === "---" ? formatted : `$${formatted}`;
  };

  // Format volume with whole numbers
  const formatVolume = (value) => {
    if (value === null || value === undefined) return "---";
    const num =
      typeof value === "string"
        ? parseFloat(value.replace(/[^0-9.-]/g, ""))
        : parseFloat(value);
    if (isNaN(num)) return "---";
    if (num >= 1e9) return `${Math.round(num / 1e9)}B`;
    if (num >= 1e6) return `${Math.round(num / 1e6)}M`;
    if (num >= 1e3) return `${Math.round(num / 1e3)}K`;
    return Math.round(num).toString();
  };
  const combinedData = [
    ...marketData,
    ...(fearGreed
      ? [
          {
            name: fearGreed.name,
            price: fearGreed.value,
            classification: fearGreed.classification,
            isSentiment: true,
          },
        ]
      : []),
  ];

  // Calculate total width of one set of data
  const calculateTotalWidth = (ctx, data) => {
    if (!ctx || !data || data.length === 0) return 0;

    let totalWidth = 0;
    const padding = 45; // Increased padding to match the basepadding in drawData

    // Start with market data (indices, commodities, crypto, etc.)
    marketData.forEach((item) => {
      const priceText = item.symbol === "^VIX" || item.symbol === "^TNX"
        ? item.price ? `${item.price.toFixed(2)}` : "N/A"
        : item.price ? `$${item.price.toFixed(2)}` : "$N/A";
      
      const changeText = item.changePercent 
        ? `${item.changePercent >= 0 ? "▲" : "▼"} ${Math.abs(item.changePercent).toFixed(2)}%` 
        : "";
      
      // Name
      totalWidth += ctx.measureText(`${item.name}:`).width + 25; // Increased spacing
      
      // Price
      totalWidth += ctx.measureText(priceText).width + 25; // Increased spacing
      
      // Change
      totalWidth += ctx.measureText(changeText).width + 45; // Increased spacing for separators
    });

    // Add Fear & Greed if present
    if (fearGreed) {
      const fearGreedText = `${fearGreed.name}: ${fearGreed.value} (${fearGreed.classification})`;
      totalWidth += ctx.measureText(fearGreedText).width + 10;
    }

    return totalWidth;
  };

  // Initialize canvas and texture
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      // Increased canvas width to provide more space
      canvas.width = 9000;
      canvas.height = 100;
      canvasRef.current = canvas;

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      texture.needsUpdate = true;
      textureRef.current = texture;

      texture.flipY = false;
      texture.repeat.set(1, 1);
      texture.offset.set(0, 0);

      // Draw initial test pattern
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Fill with a black background
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add some text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "LOADING TICKER DATA...",
          canvas.width / 2,
          canvas.height / 2
        );

        texture.needsUpdate = true;
      }

      textureRef.current = texture;

      // Create a curved cylinder for the ticker display with the same radius but slightly larger
      // to avoid text overlap at the seam
      const geometry = new THREE.CylinderGeometry(
        baseRadius,
        baseRadius,
        1,
        128,
        1,
        true
      );

      // Create material with our texture
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        color: 0xffffff,
        depthTest: true,
        depthWrite: false,
      });

      // Flip the texture to correct the inside-out appearance
      texture.repeat.set(1, -1);

      // Create the mesh
      const mesh = new THREE.Mesh(geometry, material);

      // Position it lower in the scene where the original 'Ticker' mesh was
      mesh.position.set(0, -8.5, 0);
      // Rotate it 90 degrees on the y-axis to make it horizontal
      mesh.rotation.set(0, Math.PI / 2, 0);

      // Add it to the main scene
      mainScene.add(mesh);

      // Store reference
      meshRef.current = mesh;

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize ticker display:", error);
    }
  }, [mainScene]);

  // Function to update ticker geometry based on model scale
  const updateTickerGeometry = (modelScale) => {
    if (!meshRef.current || !modelScale) return;

    // Only update if the scale has changed significantly
    if (Math.abs(lastModelScale.current - modelScale) < 0.01) return;

    // Calculate new radius based on model scale
    const newRadius = baseRadius * modelScale;

    // Create new geometry with updated radius
    const newGeometry = new THREE.CylinderGeometry(
      newRadius,
      newRadius,
      1,
      128,
      1,
      true
    );

    // Replace the old geometry
    meshRef.current.geometry.dispose(); // Clean up old geometry
    meshRef.current.geometry = newGeometry;

    // Update the last known scale
    lastModelScale.current = modelScale;
  };

  // Update canvas content
  const updateCanvas = () => {
    if (!canvasRef.current || !isInitialized) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up font first to get measurements
    ctx.font = "bold 40px Arial";

    // Calculate total width needed for one set of data
    const setWidth = calculateTotalWidth(ctx, combinedData);
    if (setWidth === 0) return; // No data to display yet

    // Clear canvas with pure black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update scroll position
    scrollPos.current = (scrollPos.current + 0.9) % setWidth; // Slightly reduced scroll speed for better readability

    // Draw text
    ctx.textBaseline = "middle";

    // Enhanced drawing function with better styling and fixed spacing:
    const drawData = (startX) => {
      let xPos = startX;
      const basepadding = 45; // Base padding for spacing between items
      const yPos = canvas.height / 2;
      
      // Add subtle separator line at the bottom
      ctx.fillStyle = "#222222";
      ctx.fillRect(0, canvas.height - 10, canvas.width, 2);

      // Initialize needSeparator to true to ensure all items get separators
      let needSeparator = true;
      let previousItemName = ""; // Track previous item to adjust separator spacing

      combinedData.forEach((item, index) => {
        // Customize separator spacing based on previous item
        let separatorPadding = basepadding;
        if (previousItemName === "VIX") {
          separatorPadding = 55; // More space after VIX
        } else if (previousItemName === "Dollar Index") {
          separatorPadding = 50; // More space after Dollar Index
        } else if (previousItemName === "10Y Treasury Yield") {
          separatorPadding = 20; // More space after Treasury Yield
        } else if (previousItemName === "Fear & Greed") {
          separatorPadding = 1; // Reduced from 60 to 35 to tighten spacing
        } else if (previousItemName === "Oil") {
          separatorPadding = 52; // More space after Oil
        } else if (previousItemName === "Gold") {
          separatorPadding = 60; // Extra space after Gold (which comes before 10Y Treasury)
        } else if (previousItemName === "Bitcoin" || previousItemName === "Ethereum") {
          separatorPadding = 50; // More space after crypto
        } else if (previousItemName === "Nasdaq") {
          separatorPadding = 25; // Extra space after separator for Nasdaq
        }

        // Draw separator before this item (except the first one)
        if (needSeparator || item.name === "10Y Treasury Yield") {
          ctx.fillStyle = "#666666"; // Brighter color for better visibility
          ctx.font = "bold 40px Arial"; // Added bold for better visibility
          
          // Add extra space before 10Y Treasury Yield
          if (item.name === "10Y Treasury Yield") {
            xPos += 60; // Increased from 35 to 60 for much more space before separator
          } else if (item.isSentiment) {
            xPos += 20; // Add extra space before Fear & Greed separator
          }
          
          // Draw separator with custom position for Treasury Yield
          if (item.name === "10Y Treasury Yield") {
            // Draw separator slightly higher for Treasury Yield
            ctx.fillText(" ◆ ", xPos, yPos - 2);
          } else {
            ctx.fillText(" ◆ ", xPos, yPos);
          }
          
          // Add extra spacing after the separator for specific items
          let postSeparatorSpacing = separatorPadding;
          if (item.name === "10Y Treasury Yield") {
            postSeparatorSpacing -= 90; // Reduced from 25 to 15 for better spacing
          } else if (item.name === "Dow Jones") {
            postSeparatorSpacing += 55; // Extra space after separator for Dow Jones
          } else if (item.name === "Bitcoin") {
            postSeparatorSpacing += 18; // Extra space after separator for Bitcoin
          } else if (item.name === "Ethereum") {
            postSeparatorSpacing += 18; // Extra space after separator for Ethereum
          } else if (item.name === "S&P") {
            postSeparatorSpacing += 18; // Extra space after separator for S&P
          } else if (item.name === "Nasdaq") {
            postSeparatorSpacing += 15; // Extra space after separator for Nasdaq
          } else if (item.name === "Oil") {
            postSeparatorSpacing -= 48; // Extra space after separator for Oil
          } else if (item.name === "VIX") {
            postSeparatorSpacing -= 38; // Extra space after separator for VIX
          } else if (item.name === "Fear & Greed") {
            postSeparatorSpacing += 38; // Extra space after separator for Fear & Greed
          } else if (item.name === "Gold") {
            postSeparatorSpacing -= 18; // Extra space after separator for Gold
          } else if (item.name === "Dollar Index") {
            postSeparatorSpacing += 35; // Extra space after separator for Dollar Index
          }
          
          
          xPos += ctx.measureText(" ◆ ").width + postSeparatorSpacing;
        }
        
        // After first item, we'll need separators before all subsequent items
        needSeparator = true;
        previousItemName = item.name; // Store for next iteration

        let displayText = "";
        let changeColor = "#FFFFFF"; // default white
        let nameColor = "#DDDDDD"; // slightly dimmer for name
        let priceColor = "#FFFFFF"; // bright for price
        let changePercent = 0;
        
        // Special case - if this is 10Y Treasury Yield or Fear & Greed, we need to ensure it has enough space
        if (item.name === "10Y Treasury Yield") {
          // Force an extra separator for 10Y Treasury
          ctx.fillStyle = "#AAAAAA"; // Bright color for visibility
          ctx.font = "bold 45px Arial"; // Larger for emphasis
          ctx.fillText(" ", xPos, yPos);
          xPos += ctx.measureText(" ◆ ").width + 110;
          
          // Add extra padding for 10Y Treasury Yield
          xPos += 25; // Extra space after the forced separator
        } else if (item.isSentiment) {
          // Add extra padding for Fear & Greed Index
          xPos += 55; // Add space before Fear & Greed to ensure separator visibility
        }
        
        if (item.isSentiment) {
          // Fear & Greed - using compact custom rendering
          const value = item.price;
          let sentimentColor = "#FFFFFF";
          
          // Color based on sentiment value
          if (value <= 25) sentimentColor = "#FF3B30"; // Extreme Fear - Bright red
          else if (value <= 40) sentimentColor = "#FF9500"; // Fear - Orange
          else if (value <= 60) sentimentColor = "#FFCC00"; // Neutral - Yellow
          else if (value <= 75) sentimentColor = "#34C759"; // Greed - Green
          else sentimentColor = "#00C7BE"; // Extreme Greed - Teal
          
          // Draw everything with precise control
          // First the name with no spacing issues
          ctx.fillStyle = "#E5E5EA";
          ctx.font = "bold 40px Arial";
          ctx.fillText("Fear & Greed:", xPos, yPos);
          xPos += ctx.measureText("Fear & Greed:").width -90;
          
          // Value - with controlled space
          ctx.fillStyle = "#FFFFFF";
          ctx.font = "bold 40px Arial";
          ctx.fillText(value, xPos, yPos);
          xPos += ctx.measureText(value).width + 70;
          
          // Classification in parentheses
          ctx.fillStyle = sentimentColor;
          ctx.font = "bold 36px Arial";
          ctx.fillText(`(${item.classification})`, xPos, yPos);
          xPos += ctx.measureText(`(${item.classification})`).width + basepadding * 3.6;
        } else if (item.symbol) {
          // Market data (indices, crypto, commodities, etc.)
          const price = item.price ? 
            (item.symbol === "^VIX" || item.symbol === "^TNX" ? 
              `${item.price.toFixed(2)}` : 
              `$${item.price.toFixed(2)}`) : 
            "N/A";
            
          changePercent = item.changePercent ? parseFloat(item.changePercent) : 0;
          
          // Set colors based on type and price movement
          changeColor = changePercent >= 0 ? "#4CD964" : "#FF3B30"; // Green for positive, red for negative
          
          // Different colors for different market categories
          switch (item.name) {
            case "Gold":
              nameColor = "#FFD700"; // gold
              break;
            case "Oil":
              nameColor = "#FF9500"; // orange
              break;
            case "Nasdaq":
              nameColor = "#5856D6"; // purple
              break;
            case "Dow Jones":
              nameColor = "#007AFF"; // blue
              break;
            case "S&P 500":
              nameColor = "#5AC8FA"; // light blue
              break;
            case "VIX":
              nameColor = "#FF2D55"; // pink-red
              break;
            case "Bitcoin":
              nameColor = "#FF9500"; // orange
              break;
            case "Ethereum":
              nameColor = "#5856D6"; // purple
              break;
            case "Dollar Index":
              nameColor = "#64D2FF"; // sky blue
              break;
            case "10Y Treasury Yield":
              nameColor = "#FFCC00"; // yellow
              break;
            default:
              nameColor = "#DDDDDD";
          }
          
          // Highly customized spacing based on item name
          let nameSpacing;
          switch (item.name) {
            case "Gold":
              nameSpacing = 32;
              break;
            case "Oil":
              nameSpacing = 32; // Increased from 22 to 32 for more space
              break;
            case "VIX": 
              nameSpacing = 32;
              break;
            case "Dollar Index":
              nameSpacing = 28;
              break;
            case "10Y Treasury Yield":
              nameSpacing = -40; // Reduced even further to negative value to bring value much closer to name
              break;
            case "Nasdaq":
              nameSpacing = 25;
              break;
            case "Dow Jones":
              nameSpacing = 25;
              break;
            case "S&P 500":
              nameSpacing = 25;
              break;
            case "Bitcoin":
              nameSpacing = 32;
              break;
            case "Ethereum":
              nameSpacing = 30;
              break;
            default:
              nameSpacing = 22;
          }
          
          // Draw name
          ctx.fillStyle = nameColor;
          ctx.font = "bold 40px Arial";
          
          // Special handling for 10Y Treasury Yield name
          if (item.name === "10Y Treasury Yield") {
            // Draw name without colon to save space
            ctx.fillText(`${item.name}`, xPos, yPos);
            // Reduced spacing
            xPos += ctx.measureText(`${item.name}`).width - 123;
          } else {
            // Normal case for other items
            ctx.fillText(`${item.name}:`, xPos, yPos);
            xPos += ctx.measureText(`${item.name}:`).width + nameSpacing;
          }
          
          // Draw price
          ctx.fillStyle = priceColor;
          ctx.font = "bold 40px Arial";
          
          // Custom spacing after price based on item
          let priceSpacing;
          switch (item.name) {
            case "VIX":
              priceSpacing = 35;
              break;
            case "10Y Treasury Yield":
              priceSpacing = 15; // Reduced from 30 to 15 for tighter spacing
              break;
            case "Dollar Index":
              priceSpacing = 30;
              break;
            case "Oil":
              priceSpacing = 28; // Added specific spacing for Oil
              break;
            case "Bitcoin":
            case "Ethereum":
              priceSpacing = 25;
              break;
            default:
              priceSpacing = 25;
          }
          
          // For 10Y Treasury Yield, add a colon and pack things tighter
          if (item.name === "10Y Treasury Yield") {
            ctx.fillText(`: ${price}`, xPos, yPos);
            
            // Custom spacing after 10Y Treasury price
            xPos += ctx.measureText(`: ${price}`).width + 35; // Add extra space between value and indicator for Treasury Yield
          } else {
            ctx.fillText(`${price}`, xPos, yPos);
            
            // Regular price spacing for other items
            xPos += ctx.measureText(`${price}`).width + priceSpacing;
          }
          
          // Draw change with arrow
          const arrow = changePercent >= 0 ? "▲ " : "▼ ";
          ctx.fillStyle = changeColor;
          ctx.font = "bold 38px Arial";
          ctx.fillText(`${arrow}${Math.abs(changePercent).toFixed(2)}%`, xPos, yPos);
          
          // Adjust spacing after the percentage based on item
          let percentSpacing;
          switch (item.name) {
            case "VIX":
              percentSpacing = basepadding * 0.9;
              break;
            case "10Y Treasury Yield":
              percentSpacing = basepadding * 0.7; // Reduced to bring the next item closer
              break;
            case "Dollar Index":
              percentSpacing = basepadding * 0.8;
              break;
            case "Oil":
              percentSpacing = basepadding * 0.85;
              break;
            case "Gold":
              percentSpacing = basepadding * 1.0; // Extra space after Gold to position 10Y Treasury Yield better
              break;
            default:
              percentSpacing = basepadding * 0.7;
          }
          
          xPos += ctx.measureText(`${arrow}${Math.abs(changePercent).toFixed(2)}%`).width + percentSpacing;
        }
      });

      return xPos;
    };

    // Draw initial set
    let currentPos = drawData(0 - scrollPos.current);

    // Draw additional sets to ensure continuous scrolling
    let repeatPosition = currentPos;
    while (repeatPosition < canvas.width + setWidth) {
      repeatPosition = drawData(repeatPosition);
    }

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };

  // Animation loop
  useFrame(() => {
    if (isInitialized) {
      updateCanvas();

      // Check if modelRef exists and update ticker geometry based on model scale
      if (modelRef && modelRef.current) {
        const modelScale = modelRef.current.scale.x;
        updateTickerGeometry(modelScale);
      }
    }
  });

  useEffect(() => {
    fetchCryptoData();
    // Fetch crypto every 30 minutes
    const interval = setInterval(fetchCryptoData, 1800000);
    return () => clearInterval(interval);
  }, []);

  // Add a function to fetch Alpha Vantage data for Oil and FMP data for Dollar Index
  const fetchAlphaVantageData = async () => {
    try {
      // Create a map to store results
      const results = [];
      
      // Firebase Function URL for dedicated Oil data
      const oilURL = "https://us-central1-hailmary-3ff6c.cloudfunctions.net/getOilData";
      
      // Firebase Function URL for Alpha Vantage data
      const alphaVantageURL = "https://us-central1-hailmary-3ff6c.cloudfunctions.net/getAlphaVantageData";
      
      // Firebase Function URL for FMP data (Dollar Index using UUP)
      const fmpURL = "https://us-central1-hailmary-3ff6c.cloudfunctions.net/getFMPData";
      
      // Fetch oil data from dedicated Oil endpoint
      console.log("Fetching Oil data from dedicated endpoint");
      try {
        const oilResponse = await fetch(oilURL);
        const oilData = await oilResponse.json();
        
        if (oilData && oilData.price && !isNaN(oilData.price)) {
          results.push({
            name: "Oil",
            symbol: "CL=F",
            price: oilData.price,
            changePercent: oilData.changePercent,
          });
          console.log(`Successfully fetched Oil data: $${oilData.price} (${oilData.changePercent}%)`);
        } else {
          console.error("Invalid oil data:", oilData);
        }
      } catch (error) {
        console.error("Error fetching oil data:", error);
      }
      
      // Fetch dollar index data from FMP
      console.log("Fetching Dollar Index data from FMP");
      try {
        const dollarResponse = await fetch(`${fmpURL}/DOLLAR`);
        const dollarData = await dollarResponse.json();
        
        if (dollarData && dollarData.price && !isNaN(dollarData.price)) {
          results.push({
            name: "Dollar Index",
            symbol: "DX-Y.NYB",
            price: dollarData.price,
            changePercent: dollarData.changePercent,
          });
        } else {
          console.error("Invalid dollar data:", dollarData);
        }
      } catch (error) {
        console.error("Error fetching dollar data:", error);
      }
      
      // Fetch 10Y Treasury Yield data
      console.log("Fetching 10Y Treasury Yield data from FMP");
      try {
        const treasuryResponse = await fetch(`${fmpURL}/TREASURY`, {
          // Add a cache-busting parameter to avoid getting cached responses
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (treasuryResponse.ok) {
          const treasuryData = await treasuryResponse.json();
          
          if (treasuryData && treasuryData.price !== undefined && !isNaN(treasuryData.price)) {
            console.log("Successfully fetched 10Y Treasury Yield data:", treasuryData);
            
            results.push({
              name: "10Y Treasury Yield",
              symbol: "^TNX",
              price: treasuryData.price,
              changePercent: treasuryData.changePercent,
            });
          } else {
            console.error("Invalid treasury data format:", treasuryData);
            // Will fall back to mock data below
          }
        } else {
          const errorText = await treasuryResponse.text();
          console.error(`Error response from Treasury endpoint: ${treasuryResponse.status} - ${errorText}`);
          // Will fall back to mock data below
        }
      } catch (error) {
        console.error("Error fetching treasury data:", error);
        // Will fall back to mock data below
      }
      
      // If we don't have Treasury data yet, use mock data
      if (!results.some(item => item.symbol === "^TNX")) {
        console.log("Using mock data for 10Y Treasury Yield");
        // Use getMockPrice to get a consistent base yield number
        const baseYield = getMockPrice("^TNX");
        // Create a small daily variation
        const today = new Date();
        const dayOffset = (today.getDate() + today.getMonth() * 30) % 10;
        const hourOffset = today.getHours() % 6;
        // Calculate variation based on day and hour for realism
        const yieldVariation = (dayOffset - 5) * 0.02 + (hourOffset - 3) * 0.005;
        const treasuryYield = baseYield + yieldVariation;
        
        // Create a plausible change percentage
        const changePercent = (yieldVariation / baseYield) * 100;
        
        results.push({
          name: "10Y Treasury Yield",
          symbol: "^TNX",
          price: parseFloat(treasuryYield.toFixed(3)),
          changePercent: parseFloat(changePercent.toFixed(2)),
        });
      }
      
      // Note: VIX and major indices (S&P 500, Dow Jones, Nasdaq) are not available on the free FMP plan
      // They will be provided by mockMarketData() which runs separately
      
      // Only update the market data if we have valid entries
      if (results.length > 0) {
        setMarketData((prevData) => {
          // Keep crypto data (Bitcoin and Ethereum) from CoinGecko
          const cryptoData = prevData.filter(
            item => item.name === "Bitcoin" || item.name === "Ethereum"
          );
          
          // Keep other market data that isn't being updated
          const otherData = prevData.filter(
            (item) => 
              // Keep items that aren't being updated and aren't crypto
              item.symbol !== "CL=F" && // Remove existing Oil data
              item.symbol !== "DX-Y.NYB" && // Remove existing Dollar Index data
              item.symbol !== "^TNX" && // Remove existing Treasury data
              item.name !== "Bitcoin" && 
              item.name !== "Ethereum" &&
              item.name !== "Oil" // Explicitly filter out any existing Oil entries
          );
          
          return [...cryptoData, ...otherData, ...results];
        });
      }
    } catch (error) {
      console.error("Error fetching API data:", error);
    }
  };
  
  // Call fetchAlphaVantageData on component mount and periodically
  useEffect(() => {
    fetchAlphaVantageData();
    // Fetch Alpha Vantage data every 30 minutes
    const interval = setInterval(fetchAlphaVantageData, 1800000);
    return () => clearInterval(interval);
  }, []);

  return null;
};

export default TickerDisplay;
