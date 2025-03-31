import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

const MobileTickerDisplay = ({ modelRef, ...props }) => {
  const meshRef = useRef();
  const canvasRef = useRef();
  const textureRef = useRef();
  const scrollPos = useRef(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [trendingData, setTrendingData] = useState([]);
  const [previousData, setPreviousData] = useState([]);
  const fetchTimeRef = useRef(Date.now());
  const gltf = useGLTF("/altarMobile.glb");
  const scene = gltf.scene;
  const baseRadius = 6.6; // Actual radius of the mobile model
  const lastModelScale = useRef(1);

  const { scene: mainScene } = useThree();

  // Simplified formatters for mobile to reduce text length
  const formatNumber = (value) => {
    if (value === null || value === undefined) return "---";
    const num =
      typeof value === "string"
        ? parseFloat(value.replace(/[^0-9.-]/g, ""))
        : parseFloat(value);
    if (isNaN(num)) return "---";
    if (num >= 1e9) return `${(num / 1e9).toFixed(0)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(0)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
    return num.toFixed(0);
  };

  const formatPercentage = (value) => {
    const num = parseFloat(value);
    if (isNaN(num)) return "---";
    return `${num >= 0 ? "+" : ""}${num.toFixed(0)}%`;
  };

  // Fetch trending coins data - reduced to 5 coins for mobile
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
          .slice(0, 5) // Only show 5 coins on mobile
          .map((coin) => ({
            symbol: coin.item.symbol.toUpperCase(),
            price_usd: coin.item.data?.price || 0,
            price_change_24h:
              coin.item.data?.price_change_percentage_24h?.usd || 0,
          }));

        setPreviousData(trendingData.length > 0 ? trendingData : formattedData);
        setTrendingData(formattedData);
        fetchTimeRef.current = Date.now();
      } catch (error) {
        setTrendingData([
          {
            symbol: "ERROR",
            price_usd: 0,
            price_change_24h: 0,
          },
        ]);
      }
    };

    fetchTrendingCoins();
    const interval = setInterval(fetchTrendingCoins, 45000);
    return () => clearInterval(interval);
  }, [trendingData]);

  // Initialize canvas and texture
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 4500; // Half the width for mobile
      canvas.height = 50; // Half the height for mobile
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

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 20px Arial"; // Smaller font for mobile
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

      const tickerHeight = 1.2; // try 1.0 to 2.0 for better visibility
      const geometry = new THREE.CylinderGeometry(
        baseRadius,
        baseRadius,
        tickerHeight,
        64,
        1,
        true
      );

      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        color: 0xffffff,
        depthTest: true,
        depthWrite: false,
      });

      texture.repeat.set(1, -1);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, -2.5, 0); // Adjusted position for smaller radius
      mesh.rotation.set(0, Math.PI / 2, 0);

      mainScene.add(mesh);
      meshRef.current = mesh;
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize mobile ticker display:", error);
    }
  }, [mainScene]);

  const updateTickerGeometry = (modelScale) => {
    if (!meshRef.current || !modelScale) return;
    if (Math.abs(lastModelScale.current - modelScale) < 0.01) return;

    const newRadius = baseRadius * modelScale;
    const tickerHeight = 1.2;
    const newGeometry = new THREE.CylinderGeometry(
      newRadius,
      newRadius,
      tickerHeight,
      64,
      1,
      true
    );

    meshRef.current.geometry.dispose();
    meshRef.current.geometry = newGeometry;
    lastModelScale.current = modelScale;
  };

  const calculateTotalWidth = (ctx, data) => {
    if (!ctx || !data || data.length === 0) return 0;

    let totalWidth = 0;
    const padding = 10; // Reduced padding for mobile

    data.forEach((coin) => {
      const symbolText = coin.symbol;
      totalWidth += ctx.measureText(symbolText).width + padding;

      const priceText = `${parseFloat(coin.price_usd).toFixed(1)}`;
      totalWidth += ctx.measureText(priceText).width + padding;

      const changeText = formatPercentage(coin.price_change_24h);
      totalWidth += ctx.measureText(changeText).width + padding * 2;

      totalWidth += ctx.measureText(" ⭐ ").width + padding * 2;
    });

    return totalWidth;
  };

  const updateCanvas = () => {
    if (!canvasRef.current || !isInitialized) return;

    const data = trendingData.length > 0 ? trendingData : previousData;
    if (data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.font = "bold 40px Arial"; // Smaller font for mobile

    const setWidth = calculateTotalWidth(ctx, data);

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    scrollPos.current = (scrollPos.current + 0.8) % setWidth; // Slower scroll for mobile

    ctx.textBaseline = "middle";

    const drawTrendingData = (startX) => {
      let xPos = startX;
      const padding = 10;

      data.forEach((coin) => {
        // Symbol
        ctx.fillStyle = "#FFFFFF";
        const symbolText = coin.symbol;
        ctx.fillText(symbolText, xPos, canvas.height / 2);
        xPos += ctx.measureText(symbolText).width + padding;

        // Price
        ctx.fillStyle = "#00FF00";
        const priceText = `${parseFloat(coin.price_usd).toFixed(1)}`;
        ctx.fillText(priceText, xPos, canvas.height / 2);
        xPos += ctx.measureText(priceText).width + padding;

        // Change
        const changeColor = coin.price_change_24h >= 0 ? "#00FF00" : "#FF0000";
        ctx.fillStyle = changeColor;
        const changeText = formatPercentage(coin.price_change_24h);
        ctx.fillText(changeText, xPos, canvas.height / 2);
        xPos += ctx.measureText(changeText).width + padding * 2;

        // Separator
        ctx.fillStyle = "#666666";
        ctx.fillText(" ⭐ ", xPos, canvas.height / 2);
        xPos += ctx.measureText(" ⭐ ").width + padding * 2;
      });

      return xPos;
    };

    let currentPos = drawTrendingData(0 - scrollPos.current);

    let repeatPosition = currentPos;
    while (repeatPosition < canvas.width + setWidth) {
      repeatPosition = drawTrendingData(repeatPosition);
    }

    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  };

  useFrame(() => {
    if (isInitialized) {
      updateCanvas();
      if (modelRef && modelRef.current) {
        const modelScale = modelRef.current.scale.x;
        updateTickerGeometry(modelScale);
      }
    }
  });

  return null;
};

export default MobileTickerDisplay;
