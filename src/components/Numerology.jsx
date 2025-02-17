import React, { useEffect, useState } from "react";
import { Card, Row, Col } from "react-bootstrap";
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from "recharts";
import { Box, Flex, Heading, Text, Grid, GridItem } from "@chakra-ui/react";
import { resolveMethod, createThirdwebClient, getContract } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { defineChain } from "thirdweb/chains";
import styled from "styled-components";
import { ethers, utils } from "ethers";
import axios from "axios";
import Confetti from "./Confetti";

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
  chain: 1,
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
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
</PieChart>;
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
  useEffect(() => {
    const loadNumerologyContent = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setNumerologyLoaded(true);
    };

    loadNumerologyContent();
  }, [setNumerologyLoaded]);

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
    position: "relative",
    // top: "10px",
    // left: "10px",
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

  return (
    <>
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
            <h1 style={{ fontSize: "3em" }}>Numerology</h1>
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
                    <p>Price: {price}</p>
                    <p>USD Price: {usdPrice}</p>
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
                <Card color="white" style={cardStyle3}>
                  <div
                    style={{
                      height: "200px",

                      overflow: "hidden",
                      transform: isHovered ? "scale(1.7)" : "scale(1)",
                      transition: "transform 0.3s ease-in-out",
                      zIndex: "10",
                    }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    <Card.Img
                      variant="top"
                      src="/leftcurve.jpg"
                      style={{
                        width: "100%",
                        height: "200px",
                        objectFit: "cover",
                        borderRadius: "10%",
                      }}
                    />
                  </div>
                </Card>
              </div>
              <div className="eighth">
                <Card className="numbers-card" style={cardStyle2}>
                  <Confetti>
                    <Card.Title style={titleStyle}>
                      <div>This Week&apos;s Winners:</div>
                    </Card.Title>
                    <Card.Text style={{ fontSize: "16px", fontWeight: "bold" }}>
                      <Text
                        style={{
                          color: "#ffffff",
                          fontSize: "25px",
                          position: "relative",
                          zIndex: "2",
                        }}
                      >
                        @ethereumcrude <br />
                        1.2M tokens
                      </Text>
                    </Card.Text>
                  </Confetti>
                </Card>
              </div>
              <div className="ninth">
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
                    {/* <Card.Text style={{ color: "#0088fe", fontWeight: "bold" }}>
                      85%: Liquidity Pool
                    </Card.Text>
                    <Card.Text style={{ color: "#00c49F", fontWeight: "bold" }}>
                      10%: Treasury
                    </Card.Text>
                    <Card.Text style={{ color: "#ffbb27", fontWeight: "bold" }}>
                      5%: Centralized Exchange Reserve
                    </Card.Text> */}
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
