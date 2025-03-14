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
  const [trendingData, setTrendingData] = useState([]);
  const [previousData, setPreviousData] = useState([]);
  const fetchTimeRef = useRef(Date.now());
  const gltf = useGLTF("/altarBoomboxTicker.glb");
  const scene = gltf.scene;
  const baseRadius = 30.25; // Store the base radius as a constant
  const lastModelScale = useRef(1); // Track the last known model scale

  // Get access to the main Three.js scene
  const { scene: mainScene } = useThree();

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

        const formattedData = data.coins
          .slice(0, 7) // Reduced from 10 to 7 coins for better spacing
          .map((coin) => ({
            symbol: coin.item.symbol.toUpperCase(),
            name: coin.item.name,
            market_cap_rank: coin.item.market_cap_rank || "---",
            price_usd: coin.item.data?.price || 0,
            market_cap: coin.item.data?.market_cap || 0,
            volume_24h: coin.item.data?.total_volume || 0,
            price_change_24h:
              coin.item.data?.price_change_percentage_24h?.usd || 0,
          }));

        // Store previous data before updating
        setPreviousData(trendingData.length > 0 ? trendingData : formattedData);
        setTrendingData(formattedData);
        fetchTimeRef.current = Date.now();
      } catch (error) {
        setTrendingData([
          {
            symbol: "ERROR",
            name: "API Error",
            market_cap_rank: "---",
            price_usd: 0,
            market_cap: 0,
            volume_24h: 0,
            price_change_24h: 0,
          },
        ]);
      }
    };

    fetchTrendingCoins();
    // Reduced interval for more frequent updates
    const interval = setInterval(fetchTrendingCoins, 45000);
    return () => clearInterval(interval);
  }, []);

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

  // Calculate total width of one set of trending data
  const calculateTotalWidth = (ctx, data) => {
    if (!ctx || !data || data.length === 0) return 0;

    let totalWidth = 0;
    const padding = 20;

    data.forEach((coin, index) => {
      // Rank
      const rankText = `#${index + 1} -`;
      totalWidth += ctx.measureText(rankText).width + padding;

      // Symbol
      const symbolText = coin.symbol;
      totalWidth += ctx.measureText(symbolText).width + padding;

      // USD Price
      const priceText = `${parseFloat(coin.price_usd).toFixed(2)}`;
      totalWidth += ctx.measureText(priceText).width + padding * 1.8; // Added extra space

      // 24h Change
      const changeText = formatPercentage(coin.price_change_24h);
      totalWidth += ctx.measureText(changeText).width + padding * 1.8; // Added extra space

      // Market Cap
      const mcText = `MC: ${formatNumber(coin.market_cap)}`;
      totalWidth += ctx.measureText(mcText).width + padding * 1.5; // Added extra space

      // Volume
      const volText = `Vol: ${formatVolume(coin.volume_24h)}`;
      totalWidth += ctx.measureText(volText).width + padding * 2;

      // Separator
      totalWidth += ctx.measureText(" ⭐️ ").width + padding * 3; // Extra padding for separator
    });

    return totalWidth;
  };

  // Update canvas content
  const updateCanvas = () => {
    if (!canvasRef.current || !isInitialized) return;

    // Use previous data if we're in the middle of fetching new data
    const data = trendingData.length > 0 ? trendingData : previousData;
    if (data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up font first to get measurements
    ctx.font = "bold 40px Arial";

    // Calculate total width needed for one set of data
    const setWidth = calculateTotalWidth(ctx, data);

    // Clear canvas with a black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update scroll position
    scrollPos.current = (scrollPos.current + 1.2) % setWidth; // Adjusted scroll speed

    // Draw text
    ctx.textBaseline = "middle";

    const drawTrendingData = (startX) => {
      let xPos = startX;
      const padding = 20;

      data.forEach((coin, index) => {
        // Rank
        ctx.fillStyle = "#ff8c00";
        const rankText = `#${index + 1}: `;
        ctx.fillText(rankText, xPos, canvas.height / 2);
        xPos += ctx.measureText(rankText).width + padding;

        // Symbol
        ctx.fillStyle = "#FFFFFF";
        const symbolText = coin.symbol;
        ctx.fillText(symbolText, xPos, canvas.height / 2);
        xPos += ctx.measureText(symbolText).width + padding * 1.2;

        // USD Price
        ctx.fillStyle = "#00FF00";
        const priceText = `${parseFloat(coin.price_usd).toFixed(2)}`;
        ctx.fillText(priceText, xPos, canvas.height / 2);
        xPos += ctx.measureText(priceText).width + padding * 2.2; // Extra space after price

        // 24h Change
        const changeColor = coin.price_change_24h >= 0 ? "#00FF00" : "#FF0000";
        ctx.fillStyle = changeColor;
        const changeText = formatPercentage(coin.price_change_24h);
        ctx.fillText(changeText, xPos, canvas.height / 2);
        xPos += ctx.measureText(changeText).width + padding * 2.2; // Extra space after percentage

        // Market Cap
        ctx.fillStyle = "#00FFFF";
        const mcText = `MC: ${formatNumber(coin.market_cap)}`;
        ctx.fillText(mcText, xPos, canvas.height / 2);
        xPos += ctx.measureText(mcText).width + padding * 1.5; // Extra space after market cap

        // Volume
        ctx.fillStyle = "#FFFF00";
        const volText = `Vol: ${formatVolume(coin.volume_24h)}`;
        ctx.fillText(volText, xPos, canvas.height / 2);
        xPos += ctx.measureText(volText).width + padding * 2;

        // Add a separator between coins
        ctx.fillStyle = "#666666";
        ctx.fillText(" ⭐️ ", xPos, canvas.height / 2);
        xPos += ctx.measureText(" ⭐️ ").width + padding * 3; // Extra padding for better separation
      });

      return xPos;
    };

    // Draw initial set
    let currentPos = drawTrendingData(0 - scrollPos.current);

    // Draw additional sets to ensure continuous scrolling
    let repeatPosition = currentPos;
    while (repeatPosition < canvas.width + setWidth) {
      repeatPosition = drawTrendingData(repeatPosition);
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

  return null;
};

export default TickerDisplay;
