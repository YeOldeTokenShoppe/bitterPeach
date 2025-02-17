import { createThirdwebClient } from "thirdweb";
import { ConnectButton, PayEmbed } from "thirdweb/react";
import { STAKING_CONTRACT } from "@/src/utilities/contracts";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { base } from "thirdweb/chains";
import { client } from "../../utilities/client";

const wallets = [
  inAppWallet({
    auth: {
      options: [
        "google",
        "discord",
        "telegram",
        "farcaster",
        "email",
        "x",
        "passkey",
        "phone",
      ],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
];

export default function Buy() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <PayEmbed
        client={client}
        payOptions={{
          prefillBuy: {
            token: {
              address: "0x1D0AE877913917eE3a3e8585D658E9e4dC545c83",
              name: "Staking Token",
              symbol: "STAKE",
              icon: "...", // optional
            },
            chain: base,
            allowEdits: {
              amount: true, // allow editing buy amount
              token: false, // disable selecting buy token
              chain: false, // disable selecting buy chain
            },
          },
        }}
      />
    </div>
  );
}
