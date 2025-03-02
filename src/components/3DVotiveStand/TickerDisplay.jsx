import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";

const TickerDisplay = ({ modelRef, ...props }) => {
  const meshRef = useRef();
  const canvasRef = useRef();
  const textureRef = useRef();
  const scrollPos = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [trendingData, setTrendingData] = useState([]);
  const gltf = useGLTF("/altarBoomboxTicker.glb");
  const scene = gltf.scene;

  // Get access to the main Three.js scene
  const { scene: mainScene } = useThree();

  // Debug: Log the scene structure
  useEffect(() => {
    console.log("TickerDisplay - Scene loaded:", scene);
    console.log("TickerDisplay - Scene children:", scene.children);
    console.log("TickerDisplay - Main scene:", mainScene);

    // Log all mesh names in the scene
    console.log("TickerDisplay - All meshes in scene:");
    scene.traverse((child) => {
      if (child.isMesh) {
        console.log(`Mesh found: ${child.name}`, child);
      }
    });

    // If modelRef is provided, also check that scene
    if (modelRef && modelRef.current && modelRef.current.scene) {
      console.log("TickerDisplay - Model ref scene:", modelRef.current.scene);

      // Log all mesh names in the modelRef scene
      console.log("TickerDisplay - All meshes in modelRef scene:");
      modelRef.current.scene.traverse((child) => {
        if (child.isMesh) {
          console.log(`ModelRef mesh found: ${child.name}`, child);
        }
      });
    }
  }, [scene, modelRef, mainScene]);

  // Format large numbers
  const formatNumber = (value) => {
    if (value === null || value === undefined) return "---";
    const num =
      typeof value === "string"
        ? parseFloat(value.replace(/[^0-9.-]/g, ""))
        : parseFloat(value);
    if (isNaN(num)) return "---";
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const formatPercentage = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "---";
    return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
  };

  const formatCurrency = (value) => {
    const formatted = formatNumber(value);
    return formatted === "---" ? formatted : `$${formatted}`;
  };

  // Fetch trending coins data
  useEffect(() => {
    const fetchTrendingCoins = async () => {
      try {
        const options = {
          method: "GET",
          headers: {
            accept: "application/json",
            "x-cg-demo-api-key": "CG-N5FecTYTdsiSJaVDG5uPP4H5",
          },
        };

        const response = await fetch(
          "https://api.coingecko.com/api/v3/search/trending",
          options
        );
        const data = await response.json();

        const formattedData = data.coins.map((coin) => ({
          symbol: coin.item.symbol.toUpperCase(),
          name: coin.item.name,
          market_cap_rank: coin.item.market_cap_rank || "---",
          price_usd: coin.item.data?.price || 0,
          market_cap: coin.item.data?.market_cap || 0,
          volume_24h: coin.item.data?.total_volume || 0,
          price_change_24h:
            coin.item.data?.price_change_percentage_24h?.usd || 0,
          score: coin.item.score || 0,
        }));

        setTrendingData(formattedData);
      } catch (error) {
        console.error("Failed to fetch trending coins data:", error);
        setTrendingData([
          {
            symbol: "ERROR",
            name: "API Error",
            market_cap_rank: "---",
            price_usd: 0,
            market_cap: 0,
            volume_24h: 0,
            price_change_24h: 0,
            score: 0,
          },
        ]);
      }
    };

    fetchTrendingCoins();
    const interval = setInterval(fetchTrendingCoins, 60000);
    return () => clearInterval(interval);
  }, []);

  // Initialize canvas and texture
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 4800;
      canvas.height = 128;
      canvasRef.current = canvas;

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      texture.needsUpdate = true;
      textureRef.current = texture;

      // Try different texture settings
      texture.flipY = false; // Changed from true to false
      texture.repeat.set(1, 1); // Reset repeat
      texture.offset.set(0, 0); // Reset offset

      // Draw something on the canvas immediately to test
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Fill with a more subtle background color
        ctx.fillStyle = "#1A1A2E"; // Dark blue instead of bright magenta
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add some text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 80px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("TICKER TEST", canvas.width / 2, canvas.height / 2);

        texture.needsUpdate = true;
      }

      textureRef.current = texture;

      // Create a dedicated test mesh for the ticker display
      console.log("Creating dedicated ticker mesh for display");

      // Create a curved cylinder for the ticker display with larger radius
      // Increase radius to 30 and keep height small for a wide, flat cylinder
      const geometry = new THREE.CylinderGeometry(30.25, 30.25, 1, 64, 1, true);

      // Create material with our texture
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        color: 0xffffff,
        depthTest: true, // Ensure it's always visible
        depthWrite: false, // Don't write to depth buffer
      });

      // Flip the texture to correct the inside-out appearance
      texture.repeat.set(1, -1); // Negative X repeat flips the texture horizontally

      // Create the mesh
      const mesh = new THREE.Mesh(geometry, material);

      // Position it lower in the scene where the original 'Ticker' mesh was
      mesh.position.set(0, -8.5, 0); // Fixed typo: removed 's' after 8.5
      // Rotate it 90 degrees on the y-axis to make it horizontal
      mesh.rotation.set(0, Math.PI / 2, 0);

      // Add it to the main scene
      mainScene.add(mesh);

      // Store reference
      meshRef.current = mesh;

      console.log("Ticker mesh created and added to main scene", mesh);

      // We don't need the additional test meshes anymore since we found the correct orientation

      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize ticker display:", error);
    }
  }, [mainScene]);

  // Update canvas content
  const updateCanvas = () => {
    if (!canvasRef.current || !isInitialized || trendingData.length === 0)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with a more subtle background color
    ctx.fillStyle = "#1A1A2E"; // Dark blue instead of bright magenta
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scroll position
    scrollPos.current = (scrollPos.current + 2) % canvas.width;

    // Draw text
    ctx.font = "bold 50px Arial"; // Increased font size
    ctx.textBaseline = "middle";

    const drawTrendingData = (startX) => {
      let xPos = startX;
      trendingData.forEach((coin, index) => {
        // Rank and Symbol
        ctx.fillStyle = "#FFFFFF"; // Bright white for better visibility
        ctx.fillText(`#${index + 1}`, xPos, canvas.height / 2);
        xPos += 65;

        ctx.fillStyle = "#FFFFFF"; // Bright white
        ctx.fillText(coin.symbol, xPos, canvas.height / 2);
        xPos += 220;

        // USD Price
        ctx.fillStyle = "#00FF00"; // Bright green
        ctx.fillText(
          `${formatNumber(coin.price_usd)}`,
          xPos,
          canvas.height / 2
        );
        xPos += 160;

        // 24h Change
        const changeColor = coin.price_change_24h >= 0 ? "#00FF00" : "#FF0000"; // Bright green/red
        ctx.fillStyle = changeColor;
        ctx.fillText(
          formatPercentage(coin.price_change_24h),
          xPos,
          canvas.height / 2
        );
        xPos += 180;

        // Market Cap
        ctx.fillStyle = "#00FFFF"; // Bright cyan
        ctx.fillText(
          `MC: ${formatNumber(coin.market_cap)}`,
          xPos,
          canvas.height / 2
        );
        xPos += 280;

        // Volume
        ctx.fillStyle = "#FFFF00"; // Bright yellow
        ctx.fillText(
          `Vol: ${formatNumber(coin.volume_24h)}`,
          xPos,
          canvas.height / 2
        );
        xPos += 280;

        // Trending Score
        ctx.fillStyle = "#FFA500"; // Bright orange
        const scoreStars = "⭐".repeat(Math.min(3, Math.ceil(coin.score)));
        ctx.fillText(scoreStars, xPos, canvas.height / 2);
        xPos += 160;
      });
      return xPos;
    };

    // Draw initial set
    let endPos = drawTrendingData(-scrollPos.current);

    // Draw repeated set for seamless scrolling
    if (endPos < canvas.width) {
      drawTrendingData(canvas.width + (canvas.width - scrollPos.current));
    }
  };

  // Animation loop
  useFrame(({ camera }) => {
    if (isInitialized) {
      updateCanvas();
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;

        // Slow down the scroll speed
        textureRef.current.offset.x += 0.00002; // Reduced from 0.002 to 0.0005

        // Log the current texture offset occasionally to confirm it's changing
        if (Math.random() < 0.01) {
          // Log roughly once every 100 frames
          console.log("Current texture offset:", textureRef.current.offset.x);
        }
      }

      // We no longer need to update the test mesh position since we've confirmed visibility
      // This reduces console spam and improves performance
    }
  });

  // Create a direct mesh in the scene - now that we know meshes are visible, we can make these less obtrusive
  return null; // No need for additional test meshes now
};

export default TickerDisplay;
