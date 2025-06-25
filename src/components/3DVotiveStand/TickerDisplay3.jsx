import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

const TickerDisplay3 = ({ modelRef, is80sMode = false }) => {
  const meshRef = useRef();
  const canvasRef = useRef();
  const textureRef = useRef();
  const scrollPos = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const gltf = useGLTF("/alligatorStroll3.glb");
  const lastModelScale = useRef(1); // Track the last known model scale
  const isMountedRef = useRef(true); // Track if component is mounted

  // Get access to the main Three.js scene
  const threeContext = useThree();
  const mainScene = threeContext?.scene;
  const sceneRef = useRef(mainScene); // Store a stable reference
  const [tickerPosition, setTickerPosition] = useState(null);
  const [tickerRotation, setTickerRotation] = useState(null);
  const [tickerScale, setTickerScale] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const [marketData, setMarketData] = useState([]);
  const [fearGreed, setFearGreed] = useState(null);

  // Cleanup on unmount
  useEffect(() => {
    // Ensure mounted ref is true when component mounts
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Update scene ref when scene changes
  useEffect(() => {
    sceneRef.current = mainScene;
  }, [mainScene]);

  // Check if we're ready to proceed
  useEffect(() => {

    if (threeContext && mainScene && typeof mainScene.traverse === 'function') {
      setIsReady(true);
    } else {
      setIsReady(false);
    }
  }, [threeContext, mainScene]);

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

  // Fear & Greed Index effect
  useEffect(() => {
    fetchFearGreedIndex();
    // Fetch Fear & Greed index every 2 hours
    const interval = setInterval(fetchFearGreedIndex, 7200000);
    return () => clearInterval(interval);
  }, []);

  // Crypto data effect
  useEffect(() => {
    fetchCryptoData();
    // Fetch crypto every 30 minutes
    const interval = setInterval(fetchCryptoData, 1800000);
    return () => clearInterval(interval);
  }, []);

  // Alpha Vantage data effect
  useEffect(() => {
    fetchAlphaVantageData();
    // Fetch Alpha Vantage data every 30 minutes
    const interval = setInterval(fetchAlphaVantageData, 1800000);
    return () => clearInterval(interval);
  }, []);

  // Instead of searching for ticker, just use a fixed position
  useEffect(() => {

    // Don't proceed if component is not ready
    if (!isReady) {
      return;
    }

    // Don't proceed if not mounted
    if (!isMountedRef.current) {
      return;
    }

    // Set a fixed position for the ticker instead of searching for it
    setTickerPosition(new THREE.Vector3(0, 0.95, 0)); // Position at ground level
    setTickerRotation(new THREE.Euler(0, 0, 0));
    setTickerScale(new THREE.Vector3(2.1, 2.1, 2.1));
  }, [isReady]); // Only depend on isReady

  // Initialize canvas and texture when ticker position is found
  useEffect(() => {
    if (!tickerPosition || !mainScene || !isReady) return;
    
    try {
      const canvas = document.createElement("canvas");
      // Set canvas dimensions for the thin height
      canvas.width = 2048; // Power of 2 for better GPU performance
      canvas.height = 32;  // Smaller height for the very thin ticker
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
        ctx.font = "bold 14px Arial"; // Smaller font for thin ticker
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

      // Create a curved cylinder for the ticker display matching the original dimensions
      // Original ticker dimensions: x: 4.16, y: 4.16, z: 0.213
      // Radius is 4.16 / 2 = 2.08, height is 0.213
      
      // Create cylinder matching the original ticker dimensions
      // Original dimensions from logs: x: 2, y: 0.08228, z: 2
      // So radius = 1 (2/2), height = 0.08228
      const originalRadius = 1; // Half of x or z dimension
      const originalHeight = 0.08228; // y dimension from logs
      
      
      const geometry = new THREE.CylinderGeometry(
        originalRadius,    // radiusTop
        originalRadius,    // radiusBottom
        originalHeight,    // height
        64,               // radialSegments
        1,                // heightSegments
        true              // openEnded
      );

      // Create material with our texture
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: false,
        side: THREE.FrontSide, // Only show front side
        color: 0xffffff,
        depthTest: true,
        depthWrite: true,
      });

      // Flip texture horizontally to correct mirroring
      texture.repeat.set(-1, 1); // Negative X to flip horizontally
      
      // Redraw the loading text with adjusted size
      const ctx2 = canvas.getContext("2d");
      if (ctx2) {
        ctx2.fillStyle = "#000000";
        ctx2.fillRect(0, 0, canvas.width, canvas.height);
        ctx2.fillStyle = "#FFFFFF";
        ctx2.font = "bold 20px Arial"; // Smaller font for smaller height
        ctx2.textAlign = "center";
        ctx2.textBaseline = "middle";
        ctx2.fillText(
          "LOADING TICKER DATA...",
          canvas.width / 2,
          canvas.height / 2
        );
        texture.needsUpdate = true;
      }

      // Create the mesh
      const mesh = new THREE.Mesh(geometry, material);

      // Use the ticker's position, rotation AND scale
      mesh.position.copy(tickerPosition);
      mesh.position.y += 0.12; // Raise the ticker slightly (adjust this value as needed)
      mesh.rotation.copy(tickerRotation);
      mesh.scale.copy(tickerScale); // Apply the world scale
      
      // Flip the cylinder to correct text direction
      // Try rotating 180 degrees around Y axis
      mesh.rotation.x += Math.PI;

      // Add it to the main scene - with safety check
      if (mainScene && typeof mainScene.add === 'function') {
        mainScene.add(mesh);
      } else {
        console.error('[TickerDisplay3] Cannot add mesh to scene - scene not available or invalid');
        return;
      }

      // Store reference
      meshRef.current = mesh;

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize ticker display:", error);
    }
  }, [isReady, mainScene, tickerPosition, tickerRotation, tickerScale]);

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

  // Early return if we're not in a valid Three.js context
  if (!threeContext || !mainScene || typeof mainScene.traverse !== 'function') {
    return null;
  }


  // Define a smaller set of key market indicators
  const fmpIndices = [
    { name: "S&P 500", symbol: "^GSPC", fmpSymbol: "%5EGSPC" },
    { name: "Nasdaq", symbol: "^IXIC", fmpSymbol: "%5EIXIC" },
  ];

  // Reduced market data - only essentials
  const marketSymbolsGroup1 = [
    { name: "VIX", symbol: "^VIX" },
  ];
  
  const marketSymbolsGroup2 = [
    { name: "Gold", symbol: "GC=F" },
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
        

        return;
      } else {
        console.warn("Failed to fetch from CoinMarketCap Fear & Greed API via Firebase, trying alternative.me...");
      }

      // Fallback to alternative.me API

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
      

    }
  };

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
    const basepadding = 80; // Match the basepadding in drawData

    // Calculate the exact same width as drawData produces
    combinedData.forEach((item, index) => {
      // Add separator width
      totalWidth += ctx.measureText(" ◆ ").width + basepadding;
      
      if (item.isSentiment) {
        // Fear & Greed - match the exact spacing from drawData
        totalWidth += ctx.measureText("Fear & Greed:").width + 15; // Match the +15 adjustment
        totalWidth += ctx.measureText(item.price.toString()).width + 70;
        totalWidth += ctx.measureText(`(${item.classification})`).width + basepadding * 3.6;
      } else if (item.symbol) {
        // Market data
        const priceText = item.symbol === "^VIX" ? 
          `${item.price.toFixed(2)}` : 
          `$${item.price.toFixed(2)}`;
        
        // Use same spacing map as drawData
        const spacingMap = {
          "Gold": 32, "Oil": 32, "VIX": 32, "Dollar Index": 28,
          "10Y Treasury Yield": 15, "Nasdaq": 25, "Dow Jones": 25,
          "S&P 500": 25, "Bitcoin": 32, "Ethereum": 30
        };
        const nameSpacing = spacingMap[item.name] || 22;
        
        // Special handling for 10Y Treasury Yield
        if (item.name === "10Y Treasury Yield") {
          totalWidth += ctx.measureText(`${item.name}`).width + 20; // No colon
          totalWidth += ctx.measureText(`: ${priceText}`).width + 25; // Colon with price
        } else {
          totalWidth += ctx.measureText(`${item.name}:`).width + nameSpacing;
          totalWidth += ctx.measureText(priceText).width + 25;
        }
        
        // Change width
        const changeText = `${item.changePercent >= 0 ? "▲" : "▼"} ${Math.abs(item.changePercent).toFixed(2)}%`;
        totalWidth += ctx.measureText(changeText).width + basepadding * 0.7;
      }
    });

    return totalWidth;
  };

  // Function to update ticker geometry based on model scale
  const updateTickerGeometry = (modelScale) => {
    if (!meshRef.current || !modelScale) return;

    // Only update if the scale has changed significantly
    if (Math.abs(lastModelScale.current - modelScale) < 0.01) return;

    // Calculate new radius based on model scale
    const newRadius = 2.08 * modelScale;

    // Create new geometry with updated radius, keeping the original height ratio
    const newGeometry = new THREE.CylinderGeometry(
      newRadius,
      newRadius,
      0.213 * modelScale, // Scale height proportionally
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
    ctx.font = "bold 14px Arial";

    // Calculate total width needed for one set of data
    const setWidth = calculateTotalWidth(ctx, combinedData);
    if (setWidth === 0) return; // No data to display yet

    // Clear canvas with black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update scroll position for continuous scrolling (slower speed)
    scrollPos.current = (scrollPos.current + 0.5) % canvas.width; // Reduced speed from 2 to 0.5

    // Draw text
    ctx.textBaseline = "middle";

    // Enhanced drawing function with better styling and fixed spacing:
    const drawData = (startX) => {
      let xPos = startX;
      const basepadding = 80; // Increased padding to prevent overlap
      const yPos = canvas.height / 2;
      
      // Add subtle separator line at the bottom
      ctx.fillStyle = "#222222";
      ctx.fillRect(0, canvas.height - 3, canvas.width, 1); // Thinner line for smaller canvas

      // Initialize needSeparator to true to ensure all items get separators
      let needSeparator = true;
      let previousItemName = ""; // Track previous item to adjust separator spacing

      combinedData.forEach((item, index) => {
        // Simplified separator spacing for fewer items
        let separatorPadding = basepadding;
        if (previousItemName === "Fear & Greed") {
          separatorPadding = basepadding * 0.5; // Less space after Fear & Greed
        }

        // Draw separator before this item (except the first one)
        if (needSeparator || item.name === "10Y Treasury Yield") {
          ctx.fillStyle = is80sMode ? "#67e8f9" : "#666666"; // Cyan in 80s mode, brighter color for better visibility
          ctx.font = "bold 14px Arial"; // Added bold for better visibility
          
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
          
          // Simplified spacing after separators
          let postSeparatorSpacing = separatorPadding;
          
          
          xPos += ctx.measureText(" ◆ ").width + postSeparatorSpacing;
        }
        
        // After first item, we'll need separators before all subsequent items
        needSeparator = true;
        previousItemName = item.name; // Store for next iteration

        let displayText = "";
        let changeColor = "#FFFFFF"; // default white
        let nameColor = is80sMode ? "#67e8f9" : "#DDDDDD"; // cyan in 80s mode, slightly dimmer for name in normal
        let priceColor = is80sMode ? "#00ff41" : "#FFFFFF"; // green numbers in 80s mode, bright for price in normal
        let changePercent = 0;
        
        // Special case - if this is 10Y Treasury Yield or Fear & Greed, we need to ensure it has enough space
        if (item.name === "10Y Treasury Yield") {
          // Force an extra separator for 10Y Treasury
          ctx.fillStyle = "#AAAAAA"; // Bright color for visibility
          ctx.font = "bold 14px Arial"; // Adjusted for smaller canvas
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
          ctx.fillStyle = is80sMode ? "#67e8f9" : "#E5E5EA";
          ctx.font = "bold 14px Arial";
          ctx.fillText("Fear & Greed:", xPos, yPos);
          xPos += ctx.measureText("Fear & Greed:").width + 15; // Changed from -90 to +15 for proper spacing
          
          // Value - with controlled space
          ctx.fillStyle = is80sMode ? "#00ff41" : "#FFFFFF";
          ctx.font = "bold 14px Arial";
          ctx.fillText(value, xPos, yPos);
          xPos += ctx.measureText(value).width + 70;
          
          // Classification in parentheses
          ctx.fillStyle = sentimentColor;
          ctx.font = "bold 12px Arial";
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
          const colorMap = is80sMode ? {
            // 80s mode - all names in cyan
            "Gold": "#67e8f9",
            "Oil": "#67e8f9",
            "Nasdaq": "#67e8f9",
            "Dow Jones": "#67e8f9",
            "S&P 500": "#67e8f9",
            "VIX": "#67e8f9",
            "Bitcoin": "#67e8f9",
            "Ethereum": "#67e8f9",
            "Dollar Index": "#67e8f9",
            "10Y Treasury Yield": "#67e8f9"
          } : {
            // Normal mode - original colors
            "Gold": "#FFD700",
            "Oil": "#FF9500",
            "Nasdaq": "#5856D6",
            "Dow Jones": "#007AFF",
            "S&P 500": "#5AC8FA",
            "VIX": "#FF2D55",
            "Bitcoin": "#FF9500",
            "Ethereum": "#5856D6",
            "Dollar Index": "#64D2FF",
            "10Y Treasury Yield": "#FFCC00"
          };
          nameColor = colorMap[item.name] || (is80sMode ? "#67e8f9" : "#DDDDDD");
          
          // Spacing configuration
          const spacingMap = {
            "Gold": 32,
            "Oil": 32,
            "VIX": 32,
            "Dollar Index": 28,
            "10Y Treasury Yield": 15,
            "Nasdaq": 25,
            "Dow Jones": 25,
            "S&P 500": 25,
            "Bitcoin": 32,
            "Ethereum": 30
          };
          const nameSpacing = spacingMap[item.name] || 22;
          
          // Draw name
          ctx.fillStyle = nameColor;
          ctx.font = "bold 14px Arial";
          
          // Special handling for 10Y Treasury Yield name
          if (item.name === "10Y Treasury Yield") {
            // Draw name without colon to save space
            ctx.fillText(`${item.name}`, xPos, yPos);
            // Normal spacing for Treasury Yield
            xPos += ctx.measureText(`${item.name}`).width + 20;
          } else {
            // Normal case for other items
            ctx.fillText(`${item.name}:`, xPos, yPos);
            xPos += ctx.measureText(`${item.name}:`).width + nameSpacing;
          }
          
          // Draw price
          ctx.fillStyle = priceColor;
          ctx.font = "bold 14px Arial";
          
          // Price spacing configuration
          const priceSpacingMap = {
            "VIX": 35,
            "10Y Treasury Yield": 15,
            "Dollar Index": 30,
            "Oil": 28,
            "Bitcoin": 25,
            "Ethereum": 25
          };
          const priceSpacing = priceSpacingMap[item.name] || 25;
          
          // For 10Y Treasury Yield, add a colon and pack things tighter
          if (item.name === "10Y Treasury Yield") {
            ctx.fillText(`: ${price}`, xPos, yPos);
            
            // Normal spacing after 10Y Treasury price
            xPos += ctx.measureText(`: ${price}`).width + 25;
          } else {
            ctx.fillText(`${price}`, xPos, yPos);
            
            // Regular price spacing for other items
            xPos += ctx.measureText(`${price}`).width + priceSpacing;
          }
          
          // Draw change with arrow
          const arrow = changePercent >= 0 ? "▲ " : "▼ ";
          ctx.fillStyle = changeColor;
          ctx.font = "bold 12px Arial";
          ctx.fillText(`${arrow}${Math.abs(changePercent).toFixed(2)}%`, xPos, yPos);
          
          // Percent spacing configuration
          const percentSpacingMap = {
            "VIX": 0.9,
            "10Y Treasury Yield": 0.7,
            "Dollar Index": 0.8,
            "Oil": 0.85,
            "Gold": 1.0
          };
          const percentSpacing = basepadding * (percentSpacingMap[item.name] || 0.7);
          
          xPos += ctx.measureText(`${arrow}${Math.abs(changePercent).toFixed(2)}%`).width + percentSpacing;
        }
      });

      return xPos;
    };

    // Draw data multiple times to fill the canvas for seamless scrolling
    const dataWidth = calculateTotalWidth(ctx, combinedData);
    
    // We need at least 3 copies to ensure seamless scrolling
    // One for the main view, one for the left buffer, one for the right buffer
    const startX = -(scrollPos.current % dataWidth);
    
    for (let i = -1; i <= Math.ceil(canvas.width / dataWidth) + 1; i++) {
      drawData(startX + (i * dataWidth));
    }

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };

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

        } else {
          console.error("Invalid oil data:", oilData);
        }
      } catch (error) {
        console.error("Error fetching oil data:", error);
      }
      
      // Fetch dollar index data from FMP

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

  return null;
};

export default TickerDisplay3;
