// pages/api/DexscreenerAPI.js
export default async function handler(req, res) {
  const chainId = "ethereum"; // Example: Ethereum chain
  const pairAddresses = "0xA43fe16908251ee70EF74718545e4FE6C5cCEc9f"; // Example: Pair address

  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddresses}`
    );
    if (!response.ok) throw new Error("Failed to fetch data");

    const dexdata = await response.json();
    const pairData = dexdata.pairs[0]; // Assuming the data you want is in the first pair

    // Extracting required data
    const volume = pairData.volume;
    const liquidity = pairData.liquidity;
    const fdv = pairData.fdv;
    const buys = pairData.txns.h24.buys; // Accessing the buys for the last 24 hours
    const sells = pairData.txns.h24.sells; // Accessing the sells for the last 24 hours

    // Respond with selected data
    res.status(200).json({
      volume,
      liquidity,
      fdv,
      buys,
      sells,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
