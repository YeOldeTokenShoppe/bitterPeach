import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const TempleTickerDisplay = ({ tickerMesh }) => {
  // Font size configuration - scaled up for larger canvas
  const BASE_FONT_SIZE = 48;
  const FONT_SIZES = {
    main: BASE_FONT_SIZE,
    separator: BASE_FONT_SIZE,
    label: BASE_FONT_SIZE,
    value: BASE_FONT_SIZE,
    classification: BASE_FONT_SIZE - 6,
    change: BASE_FONT_SIZE - 4,
    loading: BASE_FONT_SIZE + 8,
    noData: BASE_FONT_SIZE + 8,
  };
  
  const canvasRef = useRef();
  const textureRef = useRef();
  const [isInitialized, setIsInitialized] = useState(false);
  const [marketData, setMarketData] = useState([]);
  const [fearGreed, setFearGreed] = useState(null);

  // Market data configuration (simplified version)
  const fmpIndices = [
    { name: "Nasdaq", symbol: "^IXIC", fmpSymbol: "%5EIXIC" },
    { name: "Dow Jones", symbol: "^DJI", fmpSymbol: "%5EDJI" },
    { name: "S&P 500", symbol: "^GSPC", fmpSymbol: "%5EGSPC" },
  ];

  // Mock data for demonstration
  const mockMarketData = () => {
    const now = Date.now();
    
    const mockIndices = fmpIndices.map(({ name, symbol }) => {
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
    
    setMarketData(mockIndices);
  };

  const getMockPrice = (symbol) => {
    switch(symbol) {
      case "^IXIC": return 16423.5;
      case "^DJI": return 38521.4;
      case "^GSPC": return 5231.3;
      default: return 100.0;
    }
  };

  // Initialize mock data
  useEffect(() => {
    mockMarketData();
    const interval = setInterval(mockMarketData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Initialize canvas and texture when ticker mesh is available
  useEffect(() => {
    if (!tickerMesh) return;

    const canvas = document.createElement("canvas");
    // Adjust canvas dimensions based on the circular mesh
    // 4.06m circumference, 0.206m height gives us roughly 20:1 ratio
    canvas.width = 4096;  // Higher resolution for circular wrap
    canvas.height = 128;  // Taller for better text visibility
    canvasRef.current = canvas;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    // Set texture to wrap once around the cylinder
    texture.repeat.set(1, 1);
    texture.offset.set(0, 0);
    
    // Handle texture orientation
    texture.flipY = true; // Set to true for proper text orientation
    
    texture.needsUpdate = true;
    textureRef.current = texture;
    
    // Log mesh information
    console.log('Ticker mesh geometry:', tickerMesh.geometry);
    console.log('Ticker mesh scale:', tickerMesh.scale);
    console.log('Texture repeat:', texture.repeat);

    // Apply texture to the ticker mesh
    if (tickerMesh.material) {
      // Update material properties for texture display
      tickerMesh.material.map = texture;
      tickerMesh.material.color = new THREE.Color(0xffffff);
      tickerMesh.material.transparent = true;
      tickerMesh.material.opacity = 0.9;
      tickerMesh.material.needsUpdate = true;
      console.log('Applied texture to ticker mesh');
    }

    setIsInitialized(true);

    return () => {
      if (texture) texture.dispose();
      if (canvas) canvas.remove();
    };
  }, [tickerMesh]);

  // Calculate total width of ticker content
  const calculateTotalWidth = (ctx, data) => {
    if (!ctx || !data || data.length === 0) return 0;

    const savedFont = ctx.font;
    ctx.font = `bold ${FONT_SIZES.main}px Arial`;

    let totalWidth = 0;
    const itemSpacing = 30;

    data.forEach((item) => {
      totalWidth += ctx.measureText(`${item.name}: `).width;
      totalWidth += ctx.measureText(`$99999.99 `).width;
      totalWidth += ctx.measureText(`▼99.9% `).width;
      totalWidth += itemSpacing;
    });

    ctx.font = savedFont;
    return totalWidth;
  };

  // Update canvas content
  const updateCanvas = () => {
    if (!canvasRef.current || !isInitialized) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.font = `bold ${FONT_SIZES.main}px Arial`;

    const setWidth = calculateTotalWidth(ctx, marketData);
    if (setWidth === 0) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${FONT_SIZES.loading}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("LOADING MARKET DATA...", canvas.width / 2, canvas.height / 2);
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }
      return;
    }

    // Clear canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textBaseline = "middle";

    // Draw data multiple times to fill the canvas for seamless scrolling
    const drawData = (startX) => {
      let xPos = startX;
      const yPos = canvas.height / 2;

      marketData.forEach((item, index) => {
        // Separator
        if (index > 0) {
          ctx.fillStyle = "#666666";
          ctx.fillText(" • ", xPos, yPos);
          xPos += ctx.measureText(" • ").width + 5;
        }

        // Name
        ctx.fillStyle = "#DDDDDD";
        ctx.font = `bold ${FONT_SIZES.label}px Arial`;
        ctx.fillText(`${item.name}:`, xPos, yPos);
        xPos += ctx.measureText(`${item.name}:`).width + 8;

        // Price
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `bold ${FONT_SIZES.value}px Arial`;
        const price = `$${item.price.toFixed(2)}`;
        ctx.fillText(price, xPos, yPos);
        xPos += ctx.measureText(price).width + 5;

        // Change
        const changePercent = item.changePercent || 0;
        const arrow = changePercent >= 0 ? "▲" : "▼";
        const changeColor = changePercent >= 0 ? "#4CD964" : "#FF3B30";
        
        ctx.fillStyle = changeColor;
        ctx.font = `bold ${FONT_SIZES.change}px Arial`;
        ctx.fillText(`${arrow}${Math.abs(changePercent).toFixed(1)}%`, xPos, yPos);
        xPos += ctx.measureText(`${arrow}${Math.abs(changePercent).toFixed(1)}%`).width + 30;
      });

      return xPos;
    };

    // Draw data multiple times to fill the canvas width
    let currentPos = 0;
    while (currentPos < canvas.width + setWidth) {
      currentPos = drawData(currentPos);
    }

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };

  // Animation loop
  useFrame((_, delta) => {
    if (isInitialized && tickerMesh && textureRef.current) {
      updateCanvas();
      
      // Animate texture offset for smooth scrolling
      textureRef.current.offset.x -= delta * 0.05; // Adjust speed as needed
      if (textureRef.current.offset.x < -1) {
        textureRef.current.offset.x += 1;
      }
      textureRef.current.needsUpdate = true;
    }
  });

  return null;
};

export default TempleTickerDisplay;