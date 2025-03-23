import React, { useEffect, useState } from "react";
import { Card, Row, Col } from "react-bootstrap";
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from "recharts";
import { Box, Flex, Heading, Text, Grid, GridItem } from "@chakra-ui/react";
import { resolveMethod, createThirdwebClient, getContract } from "thirdweb";
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

// First, let's create a new Magic8Ball component
const Magic8Ball = () => {
  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        form {
          border-radius: 100%;
          cursor: pointer;
          height: 280px;
          position: relative;
          width: 280px;
          margin: 0 auto;
        }

        [type="radio"] {
          display: none;
          left: 100%;
          position: absolute;
        }

        [type="reset"] {
          display: none;
          height: 100%;
          left: 0;
          opacity: 0;
          position: absolute;
          top: 0;
          width: 100%;
          z-index: 6;
        }

        li {
          margin: 0;
          padding: 0;
          height: 280px;
          width: 280px;
        }

        label {
          display: block;
          height: 100%;
          width: 100%;
        }

        ul {
          animation: scale 7s infinite steps(20);
          left: 0;
          margin: 0;
          padding: 0;
          position: absolute;
          top: 0;
          width: 100%;
          z-index: 5;
          list-style: none;
        }

        .eight {
          border-radius: 100%;
          height: 100%;
          overflow: hidden;
          position: relative;
          width: 100%;
          z-index: 4;
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
        }

        .eight__backdrop {
          background: transparent !important;
          border-radius: 100%;
          height: 100%;
          left: 0;
          position: absolute;
          top: 0;
          width: 100%;
        }

        .eight__number {
          align-items: center;
          background: white;
          border-radius: 100%;
          display: flex;
          font-size: 125px;
          height: 50%;
          justify-content: center;
          left: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 50%;
        }

        .eight__window {
          background: radial-gradient(transparent, #000);
          border: 10px double #555;
          border-radius: 100%;
          height: calc(50% + 20px);
          left: 50%;
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
          width: calc(50% + 20px);
        }

        .eight__fascia {
          height: 280px;
          position: relative;
          width: 280px;
        }

        .answer-container {
          text-transform: uppercase;
          color: #ffffff;
          text-shadow: 1px 1px 0 #000000;
          position: absolute;
          top: 50%;
          left: 50%;
          width: 45%;
          height: 45%;
          transform-origin: 50% 25%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          animation: floaty 10s linear infinite;
          z-index: 2;
          font-size: 0.7rem;
          letter-spacing: 1px;
        }

        .answer-container:nth-of-type(even) {
          clip-path: polygon(0 100%, 50% 20%, 100% 100%);
          align-items: flex-end;
          padding-bottom: 5%;
          top: 40%;
        }

        .answer-container:nth-of-type(odd) {
          clip-path: polygon(0 0, 50% 80%, 100% 0);
          align-items: flex-start;
          padding-top: 5%;
          top: 60%;
        }

        [type="radio"]:checked + .answer-container {
          opacity: 1;
          transition: opacity 1s 1.7s;
        }

        [type="radio"]:checked ~ .eight,
        [type="radio"]:checked ~ .eight__backdrop {
          animation: shake 0.25s 4;
        }

        [type="radio"]:checked ~ .eight .eight__fascia {
          transform: translate(0, -100%);
          transition: transform 0.25s 1.25s ease;
        }

        [type="radio"]:checked ~ [type="reset"] {
          display: block;
        }

        @keyframes scale {
          to {
            transform: translateY(-100%);
          }
        }

        @keyframes floaty {
          0%,
          100% {
            transform: translate(-50%, -50%);
          }
          25% {
            transform: translate(-52%, -48%) rotate(2deg);
          }
          50% {
            transform: translate(-48%, -52%) rotate(-2deg);
          }
          75% {
            transform: translate(-49%, -49%) rotate(1deg);
          }
        }

        @keyframes shake {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(10px, 5px);
          }
          75% {
            transform: translate(-10px, -5px);
          }
        }
      `}</style>

      <form>
        <input type="reset" />
        <div className="eight__backdrop"></div>
        <div className="eight">
          <div className="eight__fascia">
            <div className="eight__number">8</div>
          </div>
          <div className="eight__fascia">
            <div className="eight__window"></div>
          </div>
          <ul>
            <li>
              <label htmlFor="answer1"></label>
            </li>
            <li>
              <label htmlFor="answer2"></label>
            </li>
            <li>
              <label htmlFor="answer3"></label>
            </li>
            <li>
              <label htmlFor="answer4"></label>
            </li>
            <li>
              <label htmlFor="answer5"></label>
            </li>
            <li>
              <label htmlFor="answer6"></label>
            </li>
            <li>
              <label htmlFor="answer7"></label>
            </li>
            <li>
              <label htmlFor="answer8"></label>
            </li>
            <li>
              <label htmlFor="answer9"></label>
            </li>
            <li>
              <label htmlFor="answer10"></label>
            </li>
            <li>
              <label htmlFor="answer11"></label>
            </li>
            <li>
              <label htmlFor="answer12"></label>
            </li>
            <li>
              <label htmlFor="answer13"></label>
            </li>
            <li>
              <label htmlFor="answer14"></label>
            </li>
            <li>
              <label htmlFor="answer15"></label>
            </li>
            <li>
              <label htmlFor="answer16"></label>
            </li>
            <li>
              <label htmlFor="answer17"></label>
            </li>
            <li>
              <label htmlFor="answer18"></label>
            </li>
            <li>
              <label htmlFor="answer19"></label>
            </li>
            <li>
              <label htmlFor="answer20"></label>
            </li>
          </ul>
        </div>
      </form>
    </div>
  );
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
      const res = await fetch("/api/DexscreenerAPI");
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
        const res = await fetch("/api/DexscreenerAPI");
        const json = await res.json();
        setDexdata(json);
      } catch (error) {
        console.error("Error fetching DexScreener data:", error);
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
  console.log(error);
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
    if (typeof window !== "undefined") {
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
            const randomRadio =
              radios[Math.floor(Math.random() * radios.length)];
            randomRadio.checked = true;
          }
        });
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  return (
    <>
      <CustomPropertiesStyle />
      <div style={{ width: "100%", margin: "0", display: "block" }}></div>
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
                  <Card.Title style={titleStyle}>Initial Allocation</Card.Title>
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
                    <Card.Text style={{ color: "#0088fe", fontWeight: "bold" }}>
                      85%: Liquidity Pool
                    </Card.Text>
                    <Card.Text style={{ color: "#00c49F", fontWeight: "bold" }}>
                      10%: Treasury
                    </Card.Text>
                    <Card.Text style={{ color: "#ffbb27", fontWeight: "bold" }}>
                      5%: Centralized Exchange Reserve
                    </Card.Text>
                  </div>
                </Card>
              </div>
              <div className="second">
                <Card className="numbers-card" style={cardStyle2}>
                  <Card.Title style={titleStyle}>Tokens Burned</Card.Title>
                  <Card.Text style={numberStyle}>
                    {/* {isLoading || tokensBurned === null
                      ? "Loading..."
                      : tokensBurned.toFixed(2)} */}
                    1,123,456,789
                  </Card.Text>
                  <Card.Text
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
                  </Card.Text>
                </Card>
              </div>
              <div className="third">
                <Card className="numbers-card" style={cardStyle2}>
                  <Card.Title style={titleStyle}>Current Prize Pool</Card.Title>
                  <Card.Text style={numberStyle}>100,775</Card.Text>
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
                  <Card.Title style={titleStyle}>
                    Current Price (USD)
                  </Card.Title>
                  <Card.Text
                    style={{
                      fontSize: "32px",
                      fontWeight: "bold",
                    }}
                  >
                    {/* <p>Price: {price}</p>
                    <p>USD Price: {usdPrice}</p> */}
                  </Card.Text>
                </Card>
              </div>
              <div className="fifth">
                <Card style={cardStyle2}>
                  <Card.Title style={titleStyle}>Current Entries</Card.Title>
                  <Card.Text style={numberStyle}>334</Card.Text>
                </Card>
              </div>
              <div className="sixth">
                <Card className="numbers-card" style={cardStyle2}>
                  <Card.Title style={titleStyle}>Dex Stats</Card.Title>
                  <Card.Text style={{ fontSize: "16px", fontWeight: "bold" }}>
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
                        Volume (USD): ${formatDollarValues(dexdata.volume.h24)}
                        <br />
                        <br />
                        Liquidity: ${formatDollarValues(dexdata.liquidity?.usd)}
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
                  </Card.Text>
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
                    <Card.Img
                      variant="top"
                      src="/cryptoMeme.jpg"
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
              <div>
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
                      <Card.Title style={titleStyle}>Latest Winners</Card.Title>

                      <Card.Text
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
                      </Card.Text>
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
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Box>
        </Flex>
      </Box>
    </>
  );
};

export default Numerology;
