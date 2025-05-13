"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card"
import Image from "next/image";

import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from "recharts";
import { Box, Flex, Heading, Text, Grid, GridItem } from "@chakra-ui/react";
import { resolveMethod, createThirdwebClient, getContract, sha256 } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import styled, { keyframes } from "styled-components";
import { ethers, utils } from "ethers";
import axios from "axios";
import Confetti from "./Confetti";
import { sepolia } from "thirdweb/chains";

const WideContainer = styled.div`
  width: 100%;
  max-width: 1053px;
`;

const infuraKey = process.env.NEXT_PUBLIC_INFURA_KEY;
const provider = new ethers.providers.JsonRpcProvider(
  `https://mainnet.infura.io/v3/${infuraKey}`
);

const CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

const client = createThirdwebClient({ clientId: CLIENT_ID });

const contract = getContract({
  client: client,
  chain: sepolia,
  address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
});

const data = [
  { name: "LP", value: 85 }, // 50 / 200 = 25%
  { name: "Treasury", value: 10 }, // 50 / 200 = 25%
  { name: "CEX", value: 5 }, // 50 / 200 = 25%
];

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const renderLabel = ({ percent }) => {
  return `${(percent * 100).toFixed(0)}%`;
};

// Create a component that injects CSS custom properties for the animation
const CustomPropertiesStyle = () => (
  <style jsx global>{`
    @property --r {
      syntax: "<percentage>";
      initial-value: 0%;
      inherits: false;
    }

    @property --g {
      syntax: "<percentage>";
      initial-value: 0%;
      inherits: false;
    }
  `}</style>
);

// Define the keyframes animations for r and g
const rAnimation = keyframes`
  from { --r: 0% }
  to { --r: 100% }
`;

const gAnimation = keyframes`
  from { --g: 0% }
  to { --g: 100% }
`;

const FluidBackground = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;

  &::after {
    --r: 0%;
    --g: 0%;
    --l: rgb(var(--r) var(--g) 0%),
      rgb(calc(100% - var(--r)) calc(100% - var(--g)) 0%);
    content: "";
    position: absolute;
    inset: -2em;
    background: radial-gradient(var(--l)), linear-gradient(var(--l)),
      conic-gradient(at 0 100%, var(--l) 25%);
    background-blend-mode: difference;
    clip-path: inset(3em round 1em);
    animation: ${rAnimation} 4.7s ease-in-out -1.93s infinite alternate,
      ${gAnimation} 4.3s ease-in-out -2.37s infinite alternate;
    filter: url(#smoke) invert(1) saturate(2);
    z-index: 0;
  }
`;

const useFetchPriceChange = (tokenSymbol, contractAddress) => {
  const [priceChange, setPriceChange] = useState(null);

  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        const apiKey = "CG-N5FecTYTdsiSJaVDG5uPP4H5"; // Your API key
        const headers = {
          accept: "application/json",
          "x-cg-pro-api-key": apiKey,
        };

        // Current price
        const currentResponse = await axios.get(
          `https://pro-api.coingecko.com/api/v3/simple/token_price/ethereum`,
          {
            params: {
              contract_addresses: contractAddress,
              vs_currencies: "usd",
            },
            headers,
          }
        );

        const currentPrice =
          currentResponse.data[contractAddress.toLowerCase()].usd;

        // Historical price (24 hours ago)
        const dateYesterday = new Date(
          new Date().setDate(new Date().getDate() - 1)
        )
          .toISOString()
          .split("T")[0];

        const historicalResponse = await axios.get(
          `https://pro-api.coingecko.com/api/v3/coins/${tokenSymbol}/history`,
          {
            params: {
              date: dateYesterday,
            },
            headers,
          }
        );

        const historicalPrice =
          historicalResponse.data.market_data.current_price.usd;

        // Calculate percentage change
        const percentageChange =
          ((currentPrice - historicalPrice) / historicalPrice) * 100;

        setPriceChange(percentageChange.toFixed(2));
      } catch (error) {
        console.error("Error fetching price data:", error);
      }
    };

    fetchPriceData();
  }, [tokenSymbol, contractAddress]);

  return priceChange;
};

const Numerology = ({ setNumerologyLoaded }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [dexdata, setDexdata] = useState({});
  const [price, setPrice] = useState(null);
  const [usdPrice, setUsdPrice] = useState(null);
  const [tokensBurned, setTokensBurned] = useState(null);
  const [burnedPercentage, setBurnedPercentage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [clientSideReady, setClientSideReady] = useState(false);

  const isBrowser = typeof window !== "undefined";

  useEffect(() => {
    // Simulate async data or image loading
    const loadNumerologyContent = async () => {
      // Example: simulate loading (replace with real logic)
      await new Promise((resolve) => setTimeout(resolve, 500));
      setNumerologyLoaded(true); // Notify parent that loading is complete
    };

    loadNumerologyContent();
  }, [setNumerologyLoaded]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("./api/DexscreenerAPI");
      const json = await res.json();
      setDexdata(json);
    };

    fetchData();
  }, []);

  const erc20ABI = [
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
  ];

  const pairAddress = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc"; // USDC/WETH on Uniswap V2

  const infuraKey = process.env.NEXT_PUBLIC_INFURA_KEY;
  const provider = new ethers.providers.JsonRpcProvider(
    `https://sepolia.infura.io/v3/${infuraKey}`
  );

  // Fetch data from Dexscreener API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("./api/DexscreenerAPI");
        const json = await res.json();
        setDexdata(json);
      } catch (error) {
        console.log("Error fetching DexScreener data:", error);
      }
    };

    fetchData();
  }, []);

  // Fetch reserves data using ethers.js
  // // Fetch data using ethers.js
  // useEffect(() => {
  //   const fetchTokenData = async () => {
  //     try {
  //       const contract = new ethers.Contract(pairAddress, erc20ABI, provider);

  //       // Fetch total supply
  //       const totalSupply = await contract.totalSupply();
  //       const formattedTotalSupply = ethers.utils.formatUnits(
  //         totalSupply,
  //         "ether"
  //       );

  //       // Fetch balance of a specific address (e.g., burn address or user)
  //       const burnAddress = "0x000000000000000000000000000000000000dead"; // Replace with actual burn address
  //       const burnBalance = await contract.balanceOf(burnAddress);
  //       const formattedBurnBalance = ethers.utils.formatUnits(
  //         burnBalance,
  //         "ether"
  //       );

  //       // Calculate percentage burned
  //       const burnedPercentage =
  //         (formattedBurnBalance / formattedTotalSupply) * 100;

  //       // Set the data to state
  //       setPrice(formattedBurnBalance); // Example: Burned tokens
  //       setUsdPrice(burnedPercentage); // Example: Percentage burned
  //     } catch (error) {
  //       console.error("Error fetching token data:", error);
  //     }
  //   };

  //   fetchTokenData();
  // }, [provider, pairAddress]);

  // useEffect(() => {
  //   const fetchBurnedTokens = async () => {
  //     try {
  //       // Configuration
  //       const provider = new ethers.providers.JsonRpcProvider(
  //         "https://sepolia.infura.io/v3/${infuraKey}"
  //       );
  //       const tokenContractAddress =
  //         "0xde7Cc5B93e0c1A2131c0138d78d0D0a33cc36e42"; // Pepe token contract
  //       const burnAddress = "0x000000000000000000000000000000000000dead"; // Burn address

  //       // ERC-20 ABI
  //       const erc20ABI = [
  //         "function totalSupply() view returns (uint256)",

  //         "function balanceOf(address account) external view returns (uint256)",
  //       ];

  //       // Initialize token contract
  //       const contract = getContract({
  //         client: client,
  //         chain: defineChain(11155111),
  //         address: "0xde7Cc5B93e0c1A2131c0138d78d0D0a33cc36e42",
  //       });

  //       // Fetch burn address balance
  //       const burnedTokens = await provider.contract.getBurnedTokens("0xde7Cc5B93e0c1A2131c0138d78d0D0a33cc36e42")
  //       const formattedBurnedTokens = ethers.utils.formatUnits(
  //         burnedTokens,
  //         "ether"
  //       );

  //       // Fetch total supply
  //       const totalSupply = await contract.totalSupply();
  //       const formattedTotalSupply = ethers.utils.formatUnits(
  //         totalSupply,
  //         "ether"
  //       );

  //       // Calculate percentage of burned tokens
  //       const burnedPercentage =
  //         (formattedBurnBalance / formattedTotalSupply) * 100;

  //       console.log("Burned Tokens:", formattedBurnBalance);
  //       console.log("Burned Percentage:", burnedPercentage.toFixed(2) + "%");

  //       return { burnedTokens: formattedBurnBalance, burnedPercentage };
  //     } catch (error) {
  //       console.error("Error fetching burned tokens:", error);
  //       throw error;
  //     }
  //   };

  //   fetchBurnedTokens();
  // }, []);
  // console.log(error);
  const cardStyle1 = {
    height: "410px",
    background: "#4D4169",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    border: "2px solid #C48901",
    boxShadow:
      "0 0 10px #3F3D56, 0 0 5px #3F3D56, rgba(255, 223, 0, 0.15) 0 0 20px 23px",
    borderRadius: "20px",
    overflowWrap: "break-word",
    fontSize: "small",
  };

  const cardStyle2 = {
    height: "200px",
    background: "#4D4169",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    border: "2px solid #C48901",
    boxShadow:
      "0 0 10px #3F3D56, 0 0 5px #3F3D56, rgba(255, 223, 0, 0.1) 0 0 18px 20px",
    borderRadius: "20px",
    overflowWrap: "break-word",
  };
  const cardStyle3 = {
    height: "200px",
    background: "#ffffff",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    border: "2px solid #C48901",
    boxShadow:
      "0 0 10px #3F3D56, 0 0 5px #3F3D56, rgba(255, 223, 0, 0.1) 0 0 18px 20px",
    borderRadius: "20px",
    overflowWrap: "break-word",
  };

  const titleStyle = {
    fontSize: "16px",
    color: "#C48901",
  };

  const numberStyle = {
    fontSize: "32px",
    fontWeight: "bold",
  };

  const cardStyle = {
    height: "190px",
    width: "130px",
    background: "#4D4169",
    color: "white",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    border: "2px solid #C48901", // Keep the border
    boxShadow:
      "0 0 10px #3F3D56, 0 0 5px #3F3D56, rgba(255, 223, 0, 0.15) 0 0 20px 23px", // Add the glow effect
    margin: "0 auto", // Center the cards in their columns
    borderRadius: "20px",
    overflowWrap: "break-word",
  };

  function formatAndWrapNumber(number) {
    // Convert the number to a string and add commas as thousands separators
    let formattedNumber = number.toLocaleString();

    // Add a zero-width space after each character
    let breakableNumber = formattedNumber.split("").join("\u200B");

    return breakableNumber;
  }
  function formatDollarValues(number) {
    // Convert the number to a string, truncate the cents, and add commas as thousands separators
    let formattedCurrency = Math.floor(number).toLocaleString();

    // Add a zero-width space after each character
    let moneyNumber = formattedCurrency.split("").join("\u200B");

    return moneyNumber;
  }

  // Add this effect to initialize the Magic 8-Ball functionality
  useEffect(() => {
    if (!isBrowser) return; // Skip this on server-side rendering

    const possibilities = [
      "It is certain",
      "It is<br>decidedly<br>so",
      "Without<br>a<br>doubt",
      "Yes<br>definitely",
      "You may<br>rely<br>on it",
      "As I<br>see it,<br>yes",
      "Most<br>likely",
      "Outlook<br>good",
      "Yes",
      "Signs<br>point to<br>yes",
      "Reply<br>hazy, try<br>again",
      "Ask<br>again<br>later",
      "Better not<br>tell you<br>now",
      "Cannot<br>predict<br>now",
      "Concentrate<br>and ask<br>again",
      "Don't<br>count<br>on it",
      "My reply<br>is<br>no",
      "My<br>sources<br>say no",
      "Outlook<br>not so<br>good",
      "Very<br>doubtful",
    ];

    // Only run this client-side
    const form = document.querySelector(".ninth form");
    if (form) {
      // Create the radio inputs and answer containers
      possibilities.forEach((text, i) => {
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "answer";
        radio.id = `answer${i + 1}`;
        radio.value = text;
        radio.checked = false;

        const container = document.createElement("div");
        container.className = "answer-container";
        container.innerHTML = text;

        form.insertBefore(container, form.firstChild);
        form.insertBefore(radio, form.firstChild);
      });

      // Add click handler for the form
      let isFirstClick = true;
      form.addEventListener("click", function (e) {
        // Don't trigger if clicking a link inside an answer
        if (e.target.tagName === "A") {
          e.stopPropagation();
          return;
        }

        // Don't trigger if clicking within an answer that's already shown
        if (
          e.target.closest(".answer-container") &&
          e.target.closest(".answer-container").style.opacity === "1" &&
          !isFirstClick
        ) {
          return;
        }

        isFirstClick = false;

        if (e.target.tagName !== "INPUT") {
          const radios = Array.from(this.querySelectorAll('[type="radio"]'));
          const randomRadio = radios[Math.floor(Math.random() * radios.length)];
          randomRadio.checked = true;
        }
      });
    }
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    setClientSideReady(true);
  }, []);

  return (
    <>
      <CustomPropertiesStyle />
      {clientSideReady ? (
        <Box py={0}>
          <Flex
            direction={["column-reverse", "column-reverse", "row-reverse"]}
            align="center"
            gridGap={5}
          >
            <Box
              flex={["1 0 100%", "1 0 100%", "1 0 50%"]}
              minH={{ base: "300px", md: "auto" }}
            >
              <h1 className="thelma" style={{ fontSize: "3em" }}>
                Numerology
              </h1>
              <br />
              <div className="numerology">
                <div className="first">
                  <Card className="numbers-card" style={cardStyle1}>
                    <CardTitle style={titleStyle}>
                      Initial Allocation
                    </CardTitle>
                    {/* <Card.Text
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        fontSize: "12px",
                        color: "grey",
                      }}
                    >
                      RL80 tokens
                    </Card.Text> */}
                    <ResponsiveContainer width="100%" height="70%">
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderLabel}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {data.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                      }}
                    >
                      <CardContent
                        style={{ color: "#0088fe", fontWeight: "bold" }}
                      >
                        85%: Liquidity Pool
                      </CardContent>
                      <CardContent
                        style={{ color: "#00c49F", fontWeight: "bold" }}
                      >
                        10%: Treasury
                      </CardContent>
                      <CardContent
                        style={{ color: "#ffbb27", fontWeight: "bold" }}
                      >
                        5%: Centralized Exchange Reserve
                      </CardContent>
                    </div>
                  </Card>
                </div>
                <div className="second">
                  <Card className="numbers-card" style={cardStyle2}>
                    <CardTitle style={titleStyle}>Tokens Burned</CardTitle>
                    <CardContent style={numberStyle}>
                      {/* {isLoading || tokensBurned === null
                        ? "Loading..."
                        : tokensBurned.toFixed(2)} */}
                      1,123,456,789
                    </CardContent>
                    <CardContent
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        fontSize: "12px",
                        color: "grey",
                      }}
                    >
                      {/* {isLoading
                        ? "Loading..."
                        : `${burnedPercentage.toFixed(
                            2
                          )}% of total supply burned`} */}
                      12.34% of total supply burned
                    </CardContent>
                  </Card>
                </div>
                <div className="third">
                  <Card className="numbers-card" style={cardStyle2}>
                    <CardTitle style={titleStyle}>
                      Current Prize Pool
                    </CardTitle>
                    <CardContent style={numberStyle}>100,775</CardContent>
                    {/* <Card.Text
                      style={{
                        position: "absolute",
                        bottom: "10px",
                        fontSize: "12px",
                        color: "grey",
                      }}
                    >
                      RL80 Tokens
                    </Card.Text> */}
                  </Card>
                </div>
                <div className="fourth">
                  <Card className="numbers-card" style={cardStyle2}>
                    <CardTitle style={titleStyle}>
                      Current Price (USD)
                    </CardTitle>
                    <CardContent
                      style={{
                        fontSize: "32px",
                        fontWeight: "bold",
                      }}
                    ></CardContent>
                  </Card>
                </div>
                <div className="fifth">
                  <Card style={cardStyle2}>
                    <CardTitle style={titleStyle}>Current Entries</CardTitle>
                    <CardContent style={numberStyle}>334</CardContent>
                  </Card>
                </div>
                <div className="sixth">
                  <Card className="numbers-card" style={cardStyle2}>
                    <CardTitle style={titleStyle}>Dex Stats</CardTitle>
                    <CardContent style={{ fontSize: "16px", fontWeight: "bold" }}>
                      {dexdata.volume ? (
                        <Text
                          style={{
                            color: "#ffffff",
                            fontSize: "15px",
                            position: "relative",
                            zIndex: "2",
                            marginLeft: "10px",
                            textAlign: "left", // Align the text to the left
                          }}
                        >
                          Volume (USD): $
                          {formatDollarValues(dexdata.volume.h24)}
                          <br />
                          <br />
                          Liquidity: $
                          {formatDollarValues(dexdata.liquidity?.usd)}
                          <br />
                          <br />
                          FDV: ${formatDollarValues(dexdata.fdv)}
                          <br />
                          <br />
                          Buys/Sells: {dexdata.buys} / {dexdata.sells}
                        </Text>
                      ) : (
                        "Loading..."
                      )}
                    </CardContent>
                  </Card>
                </div>
                <div className="seventh">
                  <Card style={cardStyle1}>
                    <div
                      style={{
                        overflow: "hidden",
                        transform: isHovered ? "scale(1.3)" : "scale(1)",
                        transition: "transform 0.3s ease-in-out",
                        zIndex: "10",
                      }}
                      onMouseEnter={() => setIsHovered(true)}
                      onMouseLeave={() => setIsHovered(false)}
                    >
                      <Image
                        variant="top"
                        width={100}
                        height={100}
                        src="/cryptoMeme.jpg"
                        alt="Crypto Meme"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          borderRadius: "10%",
                        }}
                      />
                    </div>
                  </Card>
                </div>
                <div className="eighth">
                  <Card className="numbers-card" style={cardStyle2}>
                    <Confetti>
                      <div
                        style={{
                          width: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          paddingTop: "25px", // Add some padding at the top
                          paddingBottom: "15px",
                        }}
                      >
                        <CardTitle style={titleStyle}>
                          Latest Winners
                        </CardTitle>

                        <CardContent
                          style={{ fontSize: "16px", fontWeight: "bold" }}
                        >
                          <Text
                            style={{
                              color: "#ffffff",
                              fontSize: "25px",
                              position: "relative",
                              zIndex: "2",
                              textAlign: "center", // Center the text
                            }}
                          >
                            @ethereumcrude <br />
                            1.2M tokens
                          </Text>
                        </CardContent>
                      </div>
                    </Confetti>
                  </Card>
                </div>
                <div className="ninth">
                  <Card className="numbers-card" style={cardStyle1}>
                    {/* SVG filter */}
                    <svg width="0" height="0" aria-hidden="true">
                      <filter id="smoke" colorInterpolationFilters="sRGB">
                        <feTurbulence baseFrequency="0.00713" result="t" />
                        <feComponentTransfer>
                          <feFuncA type="discrete" tableValues="1" />
                        </feComponentTransfer>
                        <feGaussianBlur stdDeviation="5" result="i" />
                        <feBlend in="SourceGraphic" in2="t" mode="exclusion" />
                        <feDisplacementMap
                          in="i"
                          scale="180"
                          xChannelSelector="R"
                          yChannelSelector="G"
                        />
                      </filter>
                    </svg>

                    {/* The fluid background and magic 8 ball combination */}
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      {/* Fluid background as the base layer */}
                      <FluidBackground
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                        }}
                      />

                      {/* Magic 8 ball as an iframe */}
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          zIndex: "0",
                          background: "transparent",
                          borderRadius: "50%",
                        }}
                      >
                        {isBrowser && (
                          <iframe
                            src="/html/magic.html"
                            style={{
                              width: "300px",
                              height: "300px",
                              border: "none",
                              background: "transparent",
                              borderRadius: "50%",
                            }}
                            title="Magic 8 Ball"
                            frameBorder="0"
                            scrolling="no"
                            allowTransparency="true"
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </Box>
          </Flex>
        </Box>
      ) : (
        <p>Loading...</p>
      )}
    </>
  );
};

export default Numerology;