import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

const TickerDisplay2 = ({ modelRef, ...props }) => {
  // Font size configuration - adjust BASE_FONT_SIZE to scale everything
  const BASE_FONT_SIZE = 16; // Change this to experiment with font sizes
  const FONT_SIZES = {
    main: BASE_FONT_SIZE,
    separator: BASE_FONT_SIZE,
    label: BASE_FONT_SIZE,
    value: BASE_FONT_SIZE,
    classification: BASE_FONT_SIZE - 2,
    change: BASE_FONT_SIZE - 1,
    loading: BASE_FONT_SIZE + 2,
    noData: BASE_FONT_SIZE + 2,
  };
  
  const meshRef = useRef();
  const canvasRef = useRef();
  const textureRef = useRef();
  const scrollPos = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [circleMesh, setCircleMesh] = useState(null);

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
    const now = Date.now();
    
    const filteredIndices = [
      ...fmpIndices,
      ...marketSymbolsGroup1,
      ...marketSymbolsGroup2
    ].filter(item => item.name !== "Oil");
    
    const mockIndices = filteredIndices.map(({ name, symbol }) => {
      const basePrice = getMockPrice(symbol);
      const timeVariation = Math.sin(now / 10000000) * 2;
      const randomVariation = (Math.random() - 0.5) * 0.5;
      const changePercent = timeVariation + randomVariation;
      
      return {
        name,
        symbol,
        price: basePrice * (1 + changePercent/100),
        changePercent: changePercent,
      };
    });
    
    setMarketData(prevData => {
      const cryptoData = prevData.filter(
        item => item.name === "Bitcoin" || item.name === "Ethereum"
      );
      
      const oilData = prevData.filter(
        item => item.name === "Oil" && item.symbol === "CL=F"
      );
      
      const treasuryYield = mockIndices.find(item => item.name === "10Y Treasury Yield");
      const otherItems = mockIndices.filter(item => item.name !== "10Y Treasury Yield");
      
      const orderedItems = [...otherItems];
      if (treasuryYield) {
        orderedItems.push(treasuryYield);
      }
      
      return [...cryptoData, ...oilData, ...orderedItems];
    });
  };

  // Generate plausible mock prices for development/fallback
  const getMockPrice = (symbol) => {
    switch(symbol) {
      case "^IXIC": return 16423.5;
      case "^DJI": return 38521.4;
      case "^GSPC": return 5231.3;
      case "^VIX": return 14.2;
      case "DX-Y.NYB": return 105.8;
      case "GC=F": return 2328.7;
      case "^TNX": return 4.427;
      default: return 100.0;
    }
  };
  
  // Use mock market data with a timer for updates
  useEffect(() => {
    mockMarketData();
    fetchAlphaVantageData();
    
    const realDataInterval = setInterval(() => {
      fetchAlphaVantageData();
    }, 1800000);
    
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
        const filteredData = prevData.filter(
          item => item.name !== "Bitcoin" && item.name !== "Ethereum"
        );
        return [...filteredData, ...cryptoMarketData];
      });
    } catch (error) {
      console.error("Error fetching crypto data from CoinGecko:", error);
    }
  };

  // Simplified Fear and Greed Index function using mock data
  const fetchFearGreedIndex = async () => {
    try {
      const cmcResponse = await fetch(
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
      
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
      
      const baseMockValue = ((dayOfYear * 7) % 100);
      
      const hourVariation = (today.getHours() % 4) - 2;
      const mockValue = Math.max(1, Math.min(99, baseMockValue + hourVariation));
      
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

  useEffect(() => {
    fetchFearGreedIndex();
    const interval = setInterval(fetchFearGreedIndex, 7200000);
    return () => clearInterval(interval);
  }, []);

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

    // Save current font
    const savedFont = ctx.font;
    ctx.font = `bold ${FONT_SIZES.main}px Arial`;

    let totalWidth = 0;
    const itemSpacing = 15; // Space between items

    marketData.forEach((item) => {
      // Use shortened names
      let displayName = item.name;
      if (item.name === "10Y Treasury Yield") displayName = "10Y";
      else if (item.name === "Dollar Index") displayName = "DXY";
      else if (item.name === "Dow Jones") displayName = "DOW";
      else if (item.name === "Bitcoin") displayName = "BTC";
      else if (item.name === "Ethereum") displayName = "ETH";
      else if (item.name === "S&P 500") displayName = "S&P";
      else if (item.name === "Nasdaq") displayName = "NDQ";
      
      totalWidth += ctx.measureText(`${displayName}: `).width;
      totalWidth += ctx.measureText(`$99999.99 `).width; // Max price width
      totalWidth += ctx.measureText(`▼99.9% `).width; // Max change width
      totalWidth += itemSpacing;
    });

    if (fearGreed) {
      totalWidth += ctx.measureText(`F&G: 99 (Extreme Greed) `).width;
      totalWidth += itemSpacing;
    }

    // Restore font
    ctx.font = savedFont;

    return totalWidth;
  };

  // Create ticker mesh programmatically with stable positioning
  useEffect(() => {
    // Create a cylinder for the ticker
    const geometry = new THREE.CylinderGeometry(
      3.0,     // Top radius - increased to match Circle.001
      3.0,     // Bottom radius
      0.127,   // Height - matching your Blender mesh height
      64,      // Segments
      1,
      true     // Open ended
    );

    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      color: 0xffffff,
      depthTest: true,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    
    // Position and orient to match where Circle.001 would be
    mesh.position.set(0, -1.06, -1);  // Raised position
    mesh.rotation.set(0, 0, 0);    // No rotation - let texture handle orientation

    mainScene.add(mesh);
    meshRef.current = mesh;
    setCircleMesh(mesh);
    
    console.log('TickerDisplay2: Created ticker mesh');

    return () => {
      // Cleanup
      if (meshRef.current && mainScene) {
        setIsInitialized(false); // Stop updates before cleanup
        mainScene.remove(meshRef.current);
        
        // Dispose of material and its texture first
        if (meshRef.current.material) {
          if (meshRef.current.material.map) {
            meshRef.current.material.map.dispose();
            meshRef.current.material.map = null;
          }
          meshRef.current.material.dispose();
        }
        
        // Then dispose geometry
        if (meshRef.current.geometry) {
          meshRef.current.geometry.dispose();
        }
        
        meshRef.current = null;
        setCircleMesh(null);
      }
    };
  }, [mainScene]);

  // Initialize canvas and texture
  useEffect(() => {
    if (!circleMesh) {
      console.log('TickerDisplay2: No circleMesh available for texture');
      return;
    }
    
    console.log('TickerDisplay2: Initializing texture for mesh:', circleMesh);
    
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 4096;  // Good resolution for scrolling text
      canvas.height = 60;    // Height for readable text
      canvasRef.current = canvas;

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      texture.needsUpdate = true;
      textureRef.current = texture;

      texture.flipY = true;  // Flip texture to correct upside-down appearance

      // Draw initial test pattern
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${FONT_SIZES.loading}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          "LOADING TICKER DATA...",
          canvas.width / 2,
          canvas.height / 2
        );

        texture.needsUpdate = true;
      }

      console.log('TickerDisplay2: Canvas texture created');

      // Apply texture to the mesh
      if (circleMesh && circleMesh.material) {
        console.log('TickerDisplay2: Applying texture to material');
        
        // For MeshBasicMaterial, just set the map
        circleMesh.material.map = texture;
        circleMesh.material.needsUpdate = true;
        
        console.log('TickerDisplay2: Texture applied to material');
      }

      setIsInitialized(true);
      console.log('TickerDisplay2: Initialization complete');
    } catch (error) {
      console.error("TickerDisplay2: Failed to initialize ticker display:", error);
    }
  }, [circleMesh]);

  // Update canvas content
  const updateCanvas = () => {
    if (!canvasRef.current || !isInitialized) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Debug logging - only log once
    if (!updateCanvas.hasLogged) {
      console.log('TickerDisplay2: updateCanvas running, combinedData:', combinedData);
      console.log('TickerDisplay2: marketData length:', marketData.length);
      updateCanvas.hasLogged = true;
    }

    ctx.font = `bold ${FONT_SIZES.main}px Arial`;

    const setWidth = calculateTotalWidth(ctx, combinedData);
    if (setWidth === 0) {
      // If no data, show a test pattern
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${FONT_SIZES.noData}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("NO TICKER DATA", canvas.width / 2, canvas.height / 2);
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
      return;
    }

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    scrollPos.current = (scrollPos.current + 0.2) % setWidth;  // Medium scroll speed

    ctx.textBaseline = "middle";

    const drawData = (startX) => {
      let xPos = startX;
      const basepadding = 30;  // Normal padding
      const yPos = canvas.height / 2;
      
      ctx.fillStyle = "#222222";
      ctx.fillRect(0, canvas.height - 8, canvas.width, 2);  // Normal separator

      let needSeparator = true;

      combinedData.forEach((item) => {

        if (needSeparator || item.name === "10Y Treasury Yield") {
          ctx.fillStyle = "#666666";
          ctx.font = `bold ${FONT_SIZES.separator}px Arial`;
          
          ctx.fillText(" • ", xPos, yPos);
          xPos += ctx.measureText(" • ").width + 10;
        }
        
        needSeparator = true;

        let changeColor = "#FFFFFF";
        let nameColor = "#DDDDDD";
        let priceColor = "#FFFFFF";
        let changePercent = 0;
        
        if (item.isSentiment) {
          const value = item.price;
          let sentimentColor = "#FFFFFF";
          
          if (value <= 25) sentimentColor = "#FF3B30";
          else if (value <= 40) sentimentColor = "#FF9500";
          else if (value <= 60) sentimentColor = "#FFCC00";
          else if (value <= 75) sentimentColor = "#34C759";
          else sentimentColor = "#00C7BE";
          
          ctx.fillStyle = "#E5E5EA";
          ctx.font = `bold ${FONT_SIZES.label}px Arial`;
          ctx.fillText("F&G:", xPos, yPos);
          xPos += ctx.measureText("F&G:").width + 5;
          
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `bold ${FONT_SIZES.value}px Arial`;
          ctx.fillText(value, xPos, yPos);
          xPos += ctx.measureText(value).width + 5;
          
          ctx.fillStyle = sentimentColor;
          ctx.font = `bold ${FONT_SIZES.classification}px Arial`;
          ctx.fillText(`(${item.classification})`, xPos, yPos);
          xPos += ctx.measureText(`(${item.classification})`).width + basepadding;
        } else if (item.symbol) {
          const price = item.price ? 
            (item.symbol === "^VIX" || item.symbol === "^TNX" ? 
              `${item.price.toFixed(2)}` : 
              `$${item.price.toFixed(2)}`) : 
            "N/A";
            
          changePercent = item.changePercent ? parseFloat(item.changePercent) : 0;
          
          changeColor = changePercent >= 0 ? "#4CD964" : "#FF3B30";
          
          switch (item.name) {
            case "Gold":
              nameColor = "#FFD700";
              break;
            case "Oil":
              nameColor = "#FF9500";
              break;
            case "Nasdaq":
              nameColor = "#5856D6";
              break;
            case "Dow Jones":
              nameColor = "#007AFF";
              break;
            case "S&P 500":
              nameColor = "#5AC8FA";
              break;
            case "VIX":
              nameColor = "#FF2D55";
              break;
            case "Bitcoin":
              nameColor = "#FF9500";
              break;
            case "Ethereum":
              nameColor = "#5856D6";
              break;
            case "Dollar Index":
              nameColor = "#64D2FF";
              break;
            case "10Y Treasury Yield":
              nameColor = "#FFCC00";
              break;
            default:
              nameColor = "#DDDDDD";
          }
          
          ctx.fillStyle = nameColor;
          ctx.font = `bold ${FONT_SIZES.label}px Arial`;
          
          // Keep full names for larger display
          ctx.fillText(`${item.name}:`, xPos, yPos);
          xPos += ctx.measureText(`${item.name}:`).width + 8;
          
          ctx.fillStyle = priceColor;
          ctx.font = `bold ${FONT_SIZES.value}px Arial`;
          
          // Format price more compactly
          let compactPrice = price;
          if (item.price > 1000) {
            compactPrice = `$${(item.price/1000).toFixed(1)}k`;
          } else if (item.price < 10 && item.symbol !== "^VIX" && item.symbol !== "^TNX") {
            compactPrice = `$${item.price.toFixed(3)}`;
          }
          
          ctx.fillText(compactPrice, xPos, yPos);
          xPos += ctx.measureText(compactPrice).width + 2;
          
          const arrow = changePercent >= 0 ? "▲" : "▼";
          ctx.fillStyle = changeColor;
          ctx.font = `bold ${FONT_SIZES.change}px Arial`;
          ctx.fillText(`${arrow}${Math.abs(changePercent).toFixed(1)}%`, xPos, yPos);
          
          xPos += ctx.measureText(`${arrow}${Math.abs(changePercent).toFixed(1)}%`).width + basepadding;
        }
      });

      return xPos;
    };

    let currentPos = drawData(0 - scrollPos.current);

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
    if (isInitialized && meshRef.current && meshRef.current.material) {
      updateCanvas();
      
      // Keep ticker position stable relative to the scene
      if (modelRef && modelRef.current) {
        // Update position relative to the model if provided
        const modelPos = modelRef.current.position;
        meshRef.current.position.set(
          modelPos.x,
          modelPos.y,  // Same Y position as model
          modelPos.z
        );
      }
    }
  });

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 1800000);
    return () => clearInterval(interval);
  }, []);

  // Add a function to fetch Alpha Vantage data for Oil and FMP data for Dollar Index
  const fetchAlphaVantageData = async () => {
    try {
      const results = [];
      
      const oilURL = "https://us-central1-hailmary-3ff6c.cloudfunctions.net/getOilData";
      const fmpURL = "https://us-central1-hailmary-3ff6c.cloudfunctions.net/getFMPData";
      
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
      
      try {
        const treasuryResponse = await fetch(`${fmpURL}/TREASURY`, {
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
          }
        } else {
          const errorText = await treasuryResponse.text();
          console.error(`Error response from Treasury endpoint: ${treasuryResponse.status} - ${errorText}`);
        }
      } catch (error) {
        console.error("Error fetching treasury data:", error);
      }
      
      if (!results.some(item => item.symbol === "^TNX")) {
        const baseYield = getMockPrice("^TNX");
        const today = new Date();
        const dayOffset = (today.getDate() + today.getMonth() * 30) % 10;
        const hourOffset = today.getHours() % 6;
        const yieldVariation = (dayOffset - 5) * 0.02 + (hourOffset - 3) * 0.005;
        const treasuryYield = baseYield + yieldVariation;
        
        const changePercent = (yieldVariation / baseYield) * 100;
        
        results.push({
          name: "10Y Treasury Yield",
          symbol: "^TNX",
          price: parseFloat(treasuryYield.toFixed(3)),
          changePercent: parseFloat(changePercent.toFixed(2)),
        });
      }
      
      if (results.length > 0) {
        setMarketData((prevData) => {
          const cryptoData = prevData.filter(
            item => item.name === "Bitcoin" || item.name === "Ethereum"
          );
          
          const otherData = prevData.filter(
            (item) => 
              item.symbol !== "CL=F" &&
              item.symbol !== "DX-Y.NYB" &&
              item.symbol !== "^TNX" &&
              item.name !== "Bitcoin" && 
              item.name !== "Ethereum" &&
              item.name !== "Oil"
          );
          
          return [...cryptoData, ...otherData, ...results];
        });
      }
    } catch (error) {
      console.error("Error fetching API data:", error);
    }
  };
  
  useEffect(() => {
    fetchAlphaVantageData();
    const interval = setInterval(fetchAlphaVantageData, 1800000);
    return () => clearInterval(interval);
  }, []);

  return null;
};

export default TickerDisplay2;