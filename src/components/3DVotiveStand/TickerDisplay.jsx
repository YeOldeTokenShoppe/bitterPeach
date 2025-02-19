// import React, { useRef, useEffect, useState } from "react";
// import * as THREE from "three";
// import { useFrame } from "@react-three/fiber";
// import { useGLTF, useAnimations } from "@react-three/drei";

// const TickerDisplay = ({ geometry, ...props }) => {
//   const meshRef = useRef();
//   const canvasRef = useRef();
//   const textureRef = useRef();
//   const scrollPos = useRef(0);
//   const [isInitialized, setIsInitialized] = useState(false);
//   const [trendingData, setTrendingData] = useState([]);
//   const gltf = useGLTF("/isometricScene80s.glb");
//   const scene = gltf.scene;

//   // Format large numbers
//   const formatNumber = (value) => {
//     if (value === null || value === undefined) return "---";
//     const num =
//       typeof value === "string"
//         ? parseFloat(value.replace(/[^0-9.-]/g, ""))
//         : parseFloat(value);
//     if (isNaN(num)) return "---";
//     if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
//     if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
//     if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
//     return num.toFixed(2);
//   };

//   const formatPercentage = (value) => {
//     const num = parseFloat(value);
//     if (isNaN(num)) return "---";
//     return `${num >= 0 ? "+" : ""}${num.toFixed(2)}%`;
//   };

//   const formatCurrency = (value) => {
//     const formatted = formatNumber(value);
//     return formatted === "---" ? formatted : `$${formatted}`;
//   };

//   // Fetch trending coins data
//   useEffect(() => {
//     const fetchTrendingCoins = async () => {
//       try {
//         const options = {
//           method: "GET",
//           headers: {
//             accept: "application/json",
//             "x-cg-demo-api-key": "CG-N5FecTYTdsiSJaVDG5uPP4H5",
//           },
//         };

//         const response = await fetch(
//           "https://api.coingecko.com/api/v3/search/trending",
//           options
//         );
//         const data = await response.json();

//         const formattedData = data.coins.map((coin) => ({
//           symbol: coin.item.symbol.toUpperCase(),
//           name: coin.item.name,
//           market_cap_rank: coin.item.market_cap_rank || "---",
//           price_usd: coin.item.data?.price || 0,
//           market_cap: coin.item.data?.market_cap || 0,
//           volume_24h: coin.item.data?.total_volume || 0,
//           price_change_24h:
//             coin.item.data?.price_change_percentage_24h?.usd || 0,
//           score: coin.item.score || 0,
//         }));

//         setTrendingData(formattedData);
//       } catch (error) {
//         console.error("Failed to fetch trending coins data:", error);
//         setTrendingData([
//           {
//             symbol: "ERROR",
//             name: "API Error",
//             market_cap_rank: "---",
//             price_usd: 0,
//             market_cap: 0,
//             volume_24h: 0,
//             price_change_24h: 0,
//             score: 0,
//           },
//         ]);
//       }
//     };

//     fetchTrendingCoins();
//     const interval = setInterval(fetchTrendingCoins, 60000);
//     return () => clearInterval(interval);
//   }, []);

//   // Initialize canvas and texture
//   useEffect(() => {
//     try {
//       const canvas = document.createElement("canvas");
//       canvas.width = 4800;
//       canvas.height = 128;
//       canvasRef.current = canvas;

//       const texture = new THREE.CanvasTexture(canvas);
//       texture.wrapS = THREE.RepeatWrapping;
//       texture.wrapT = THREE.RepeatWrapping;
//       texture.repeat.set(1, 1);
//       texture.needsUpdate = true;
//       textureRef.current = texture;
//       texture.repeat.set(1, -1);
//       texture.flipY = true;

//       // Find the Ticker mesh in your model
//       const ticker = scene.getObjectByName("Ticker");
//       if (ticker) {
//         ticker.material = new THREE.MeshBasicMaterial({
//           map: texture,
//           transparent: true,
//           opacity: 0.9,
//           side: THREE.DoubleSide,
//         });
//       }

//       const ctx = canvas.getContext("2d");
//       if (!ctx) {
//         throw new Error("2D context not supported");
//       }

//       setIsInitialized(true);
//     } catch (error) {
//       console.error("Failed to initialize ticker display:", error);
//     }
//   }, []);

//   // Update canvas content
//   const updateCanvas = () => {
//     if (!canvasRef.current || !isInitialized || trendingData.length === 0)
//       return;

//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     // Clear canvas
//     ctx.fillStyle = "#000000";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);

//     // Scroll position
//     scrollPos.current = (scrollPos.current + 2) % canvas.width;

//     // Draw text
//     ctx.font = "bold 45px Arial";
//     ctx.textBaseline = "middle";

//     const drawTrendingData = (startX) => {
//       let xPos = startX;
//       trendingData.forEach((coin, index) => {
//         // Rank and Symbol
//         ctx.fillStyle = "#9ca3af";
//         ctx.fillText(`#${index + 1}`, xPos, canvas.height / 2);
//         xPos += 65;

//         ctx.fillStyle = "#ffffff";
//         ctx.fillText(coin.symbol, xPos, canvas.height / 2);
//         xPos += 220;

//         // USD Price
//         ctx.fillStyle = "#22c55e";
//         ctx.fillText(
//           `${formatNumber(coin.price_usd)}`,
//           xPos,
//           canvas.height / 2
//         );
//         xPos += 160;

//         // 24h Change
//         const changeColor = coin.price_change_24h >= 0 ? "#22c55e" : "#ef4444";
//         ctx.fillStyle = changeColor;
//         ctx.fillText(
//           formatPercentage(coin.price_change_24h),
//           xPos,
//           canvas.height / 2
//         );
//         xPos += 180;

//         // Market Cap
//         ctx.fillStyle = "#60a5fa";
//         ctx.fillText(
//           `MC: ${formatNumber(coin.market_cap)}`,
//           xPos,
//           canvas.height / 2
//         );
//         xPos += 280;

//         // Volume
//         ctx.fillStyle = "#818cf8";
//         ctx.fillText(
//           `Vol: ${formatNumber(coin.volume_24h)}`,
//           xPos,
//           canvas.height / 2
//         );
//         xPos += 280;

//         // Trending Score
//         ctx.fillStyle = "#fbbf24";
//         const scoreStars = "⭐".repeat(Math.min(3, Math.ceil(coin.score)));
//         ctx.fillText(scoreStars, xPos, canvas.height / 2);
//         xPos += 160;
//       });
//       return xPos;
//     };

//     // Draw initial set
//     let endPos = drawTrendingData(-scrollPos.current);

//     // Draw repeated set for seamless scrolling
//     if (endPos < canvas.width) {
//       drawTrendingData(canvas.width + (canvas.width - scrollPos.current));
//     }
//   };

//   // Animation loop
//   useFrame(() => {
//     if (isInitialized) {
//       updateCanvas();
//       if (textureRef.current) {
//         textureRef.current.needsUpdate = true;
//         textureRef.current.offset.x += 0.00005; // Adjust speed as needed
//       }
//     }
//   });

//   // We don't need to return a mesh since we're using an existing one
//   return null;
// };

// export default TickerDisplay;
