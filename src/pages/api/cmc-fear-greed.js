// src/pages/api/cmc-fear-greed.js
export default async function handler(req, res) {
  const apiKey = process.env.NEXT_PUBLIC_COINMARKETCAP;
  if (!apiKey) {
    return res.status(500).json({ error: "API key missing" });
  }

  try {
    const url = "https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest";
    const response = await fetch(url, {
      headers: { "X-CMC_PRO_API_KEY": apiKey }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: "CoinMarketCap error", details: text });
    }

    const data = await response.json();
    // Return only the first data object, or the fields you need
    if (data.data && data.data[0]) {
      const { value, value_classification: classification } = data.data[0];
      return res.status(200).json({ value, classification });
    } else {
      return res.status(500).json({ error: "Unexpected CMC response", details: data });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}