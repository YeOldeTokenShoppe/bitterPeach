import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

const CathedralTicker = ({ 
  is80sMode = false,
  position = { x: 0, y: 0, z: 0 }, // Direct position
  rotation = { x: 0, y: 0, z: 0 }, // Direct rotation in radians
  scale = 1,
  size = { width: 55.5, height: 4 },
  curved = true,
  curvature = 0., // 0 = flat, 1 = full semicircle
  rotationOffset = { x: 0, y: 0, z: 0 }, // Additional rotation offset for fine-tuning
  positionOffset = { x: 0, y: 0, z: 0 } // Additional position offset for fine-tuning
}) => {
  const canvasRef = useRef();
  const textureRef = useRef();
  const scrollPos = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const createdMeshRef = useRef();
  const [marketData, setMarketData] = useState([]);
  const [fearGreed, setFearGreed] = useState(null);

  // Get access to the main Three.js scene
  const { scene } = useThree();

  // Initialize canvas and texture immediately
  useEffect(() => {
    if (!scene) return;

    try {
      const canvas = document.createElement("canvas");
      // Set canvas dimensions for the ticker
      canvas.width = 2048;
      canvas.height = 128;
      canvasRef.current = canvas;

      // Draw initial content before creating texture
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 60px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("LOADING MARKET DATA...", canvas.width / 2, canvas.height / 2);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.needsUpdate = true;
      
      // Flip texture for cylinder geometry
      if (curved) {
        texture.repeat.set(1, 1); // Don't flip - test normal orientation first
      }
      
      textureRef.current = texture;

      // Create geometry based on curved setting
      let geometry;
      if (curved) {
        // Create a curved cylinder segment
        // Calculate radius with a different approach for larger widths
        const thetaLength = Math.PI * curvature; // How much of the circle to use
        
        // For larger widths, we need to limit the radius to prevent issues
        // Use a fixed radius approach based on desired curvature depth
        const desiredDepth = size.width * curvature * 0.15; // Curve depth proportional to width and curvature
        const chordLength = size.width;
        
        // Calculate radius using the chord formula: r = (c² + 4h²) / 8h
        // where c = chord length (width), h = depth of curve
        const radius = (chordLength * chordLength + 4 * desiredDepth * desiredDepth) / (8 * desiredDepth);
        
        // Calculate the actual theta needed for this chord length
        const actualTheta = 2 * Math.asin(chordLength / (2 * radius));
        
        geometry = new THREE.CylinderGeometry(
          radius,           // radiusTop
          radius,           // radiusBottom
          size.height,      // height
          128,              // radialSegments (more for smooth curve)
          1,                // heightSegments
          true,             // openEnded
          -actualTheta/2,   // thetaStart (center the arc)
          actualTheta       // thetaLength (actual angle for the chord)
        );
        
        // Don't rotate here - we'll handle rotation with the mesh transform
        // geometry.rotateY(Math.PI / 2);
      } else {
        // Flat plane geometry
        geometry = new THREE.PlaneGeometry(size.width, size.height, 32, 4);
      }

      // Create material without texture first
      const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide,
        transparent: false,
      });
      
      // Apply texture after a frame to ensure it's ready
      requestAnimationFrame(() => {
        if (material && texture) {
          material.map = texture;
          material.color.set(0xffffff);
          material.needsUpdate = true;
        }
      });

      // Create the mesh
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = "CathedralTickerMesh";
      
      // Simply position and rotate the mesh directly with optional offset
      mesh.position.set(
        position.x + positionOffset.x, 
        position.y + positionOffset.y, 
        position.z + positionOffset.z
      );
      // Apply rotation with optional offset
      mesh.rotation.set(
        rotation.x + rotationOffset.x, 
        rotation.y + rotationOffset.y, 
        rotation.z + rotationOffset.z
      );
      mesh.scale.setScalar(scale);
      
      // Set render order
      mesh.renderOrder = 999;
      
      // Add mesh directly to scene
      scene.add(mesh);
      createdMeshRef.current = mesh;

      setIsInitialized(true);
      console.log('Ticker mesh created at:', {
        position: position,
        rotation: rotation,
        scale: scale
      });

    } catch (error) {
      console.error("Failed to initialize ticker:", error);
    }
  }, [scene, position, rotation, scale, size, curved, curvature, rotationOffset, positionOffset]);

  // Market data setup (simplified version from TickerCanvas3)
  useEffect(() => {
    mockMarketData();
    fetchCryptoData();
    fetchFearGreedIndex();
    
    const mockDataInterval = setInterval(() => {
      mockMarketData();
    }, 300000); // Update every 5 minutes
    
    const cryptoInterval = setInterval(() => {
      fetchCryptoData();
    }, 1800000); // Update every 30 minutes
    
    const fearGreedInterval = setInterval(() => {
      fetchFearGreedIndex();
    }, 7200000); // Update every 2 hours
    
    return () => {
      clearInterval(mockDataInterval);
      clearInterval(cryptoInterval);
      clearInterval(fearGreedInterval);
    };
  }, []);

  // Mock market data
  const mockMarketData = () => {
    const indices = [
      { name: "S&P 500", symbol: "^GSPC", price: 5231.3, changePercent: 0.75 },
      { name: "Nasdaq", symbol: "^IXIC", price: 16423.5, changePercent: 1.2 },
      { name: "VIX", symbol: "^VIX", price: 14.2, changePercent: -2.3 },
      { name: "Gold", symbol: "GC=F", price: 2328.7, changePercent: 0.4 },
    ];
    
    setMarketData(prev => {
      // Keep crypto data
      const cryptoData = prev.filter(item => 
        item.name === "Bitcoin" || item.name === "Ethereum"
      );
      return [...cryptoData, ...indices];
    });
  };

  // Fetch crypto data
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

  // Fetch Fear & Greed Index
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
      // Use mock data as fallback
      setFearGreed({
        name: "Fear & Greed",
        value: 50,
        classification: "Neutral",
        isSentiment: true
      });
    }
  };

  // Update canvas content
  const updateCanvas = () => {
    if (!canvasRef.current || !isInitialized) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update scroll position
    scrollPos.current = (scrollPos.current + 2) % canvas.width;

    // Combine all data
    const allData = [
      ...marketData,
      ...(fearGreed ? [fearGreed] : [])
    ];

    // Draw the ticker data
    ctx.font = "bold 50px Arial";
    ctx.textBaseline = "middle";
    
    const drawData = (startX) => {
      let xPos = startX;
      const padding = 50;
      const yPos = canvas.height / 2;

      allData.forEach((item, index) => {
        // Draw separator
        if (index > 0) {
          ctx.fillStyle = is80sMode ? "#67e8f9" : "#666666";
          ctx.fillText(" ◆ ", xPos, yPos);
          xPos += ctx.measureText(" ◆ ").width + padding;
        }

        if (item.isSentiment) {
          // Fear & Greed
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
          // Market data
          const nameColor = is80sMode ? "#67e8f9" : "#DDDDDD";
          const priceColor = is80sMode ? "#00ff41" : "#FFFFFF";
          const changeColor = item.changePercent >= 0 ? "#4CD964" : "#FF3B30";

          // Name
          ctx.fillStyle = nameColor;
          ctx.fillText(`${item.name}:`, xPos, yPos);
          xPos += ctx.measureText(`${item.name}:`).width + 80;

          // Price
          ctx.fillStyle = priceColor;
          const priceText = item.symbol === "^VIX" ? 
            `${item.price.toFixed(2)}` : 
            `$${item.price.toFixed(2)}`;
          ctx.fillText(priceText, xPos, yPos);
          xPos += ctx.measureText(priceText).width + 80;

          // Change
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

    // Calculate total width
    const totalWidth = drawData(-10000); // Dry run to calculate width
    
    // Draw multiple times for seamless scrolling
    const startX = -(scrollPos.current % totalWidth);
    for (let i = -1; i <= Math.ceil(canvas.width / totalWidth) + 1; i++) {
      drawData(startX + (i * totalWidth));
    }

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };

  // Animation loop
  useFrame(() => {
    if (isInitialized) {
      updateCanvas();
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (createdMeshRef.current && scene) {
          scene.remove(createdMeshRef.current);
          if (createdMeshRef.current.geometry) {
            createdMeshRef.current.geometry.dispose();
          }
          if (createdMeshRef.current.material) {
            if (createdMeshRef.current.material.map) {
              createdMeshRef.current.material.map.dispose();
            }
            createdMeshRef.current.material.dispose();
          }
        }
        if (textureRef.current) {
          textureRef.current.dispose();
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [scene]);

  return null;
};

export default CathedralTicker;