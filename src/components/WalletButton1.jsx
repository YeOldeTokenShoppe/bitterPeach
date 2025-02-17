"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link, Button, secondaryButtonText, Box } from "@chakra-ui/react";
import { ConnectButton, lightTheme } from "thirdweb/react";
import { CHAIN2 } from "../utilities/constants";
import { client } from "../../src/utilities/client";
import { createWallet, walletConnect, inAppWallet } from "thirdweb/wallets";
import { ThirdwebProvider } from "../utilities/thirdweb";
import { useClient } from "wagmi";
import { useDisconnect, useActiveWallet, MediaRenderer } from "thirdweb/react";
import { ethereum, mainnet } from "thirdweb/chains";
import { defineChain } from "thirdweb/chains";

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

const wallets = [
  inAppWallet({
    auth: {
      options: ["discord", "telegram", "farcaster", "facebook"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("org.uniswap"),
  createWallet("walletConnect"),
  createWallet("com.coinbase.wallet"),
];

function WalletButton1() {
  const [isMounted, setIsMounted] = useState(false);
  const { disconnect } = useDisconnect();
  const wallet = useActiveWallet();

  const handleSignOut = async () => {
    if (wallet) {
      await disconnect(wallet);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <ConnectButton
      label={"sign-in"}
      client={client}
      chain={CHAIN2}
      // autoConnect={true}
      wallets={wallets}
      connectButton={{
        label: wallet ? "❤️‍🔥" : "💔",
        id: "wallet-button",
        style: {
          fontSize: "2.5rem",
          objectFit: "cover",
          layout: "fill",
          right: "5%",
          border: "3px solid goldenrod",
          background: "#444",
          position: "absolute",
          width: "3rem",
          height: "3rem",
          minWidth: "3rem", // Add this line
          top: "6.5rem",
          right: "5%",
          zindex: "911",
          // maxWidth: "50px",
          visibility: isMounted ? "visible" : "hidden",
        },
        onClick: handleSignOut,
      }}
      appMetadata={{
        name: "𝓞𝖚𝖗 𝕷𝖆𝖉𝖞 𝔬𝔣 𝕻𝖊𝖗𝖕𝖊𝖙𝖚𝖆𝖑 𝕻𝖗𝖔𝖋𝖎𝖙",
        url: "https://ourlady.io",
        //   logoUrl: "https://ourlady.io/images/ourlady.svg",
      }}
      supportedTokens={{
        [CHAIN2]: [
          {
            address: "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",
            name: "Ether",
            symbol: "ETH",
            icon: "https://ourlady.io/images/ourlady.svg",
          },
        ],
      }}
      theme={lightTheme({
        colors: {
          accentText: "#d3b1c8",
          accentButtonBg: "#d3b1c8",
          accentButtonText: "#161316",
          borderColor: "#E9C162",
          modalBg: "#1B1724",
          selectedTextColor: "#fff",
          secondaryButtonText: "#fff",
          primaryButtonText: "#ffffff",
          connectedButtonBgHover: "#b26e9c",
          separatorLine: "#E9C162",
          selectedTextBg: "#ffffff",
          secondaryIconHoverColor: "#E9C162",
          primaryText: "#E9C162",
          secondaryText: "#706f78",
          connectedButtonBg: "#d3b1c8",
          secondaryButtonHoverBg: "#b26e9c",
          secondaryButtonBg: "#b26e9c",
          primaryButtonBg: "#b26e9c",
          secondaryIconHoverBg: "#b26e9c",
          tooltipBg: "white",
          tooltipText: "blue",
        },
      })}
      showAllWallets={true}
      connectModal={{
        size: "wide",
        zindex: 911,
        title: "Connect to OLOPP",

        titleIcon: "/ourlady.svg",
        welcomeScreen: {
          title: "hello",
          img: {
            src: "https://ourlady.io/Triumph.jpg",
            width: "400",
            height: "600",
          },
        },
        showThirdwebBranding: true,
      }}
      detailsButton={{
        displayBalanceToken: {
          1: "0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe",
        },

        render: () => (
          <Button
            id="wallet-button"
            style={{
              position: "absolute",
              width: "3rem",
              height: "3rem",
              top: "6.5rem",
              right: "5%",
              zindex: "911",
              visibility: isMounted ? "visible" : "hidden",
            }}
            onClick={handleSignOut}
          >
            <span
              style={{
                fontSize: "2.5rem",
                objectFit: "cover",
                layout: "fill",
                right: "5%",
              }}
            >
              ❤️‍🔥
            </span>
          </Button>
        ),
      }}
    />
  );
}

export default WalletButton1;
