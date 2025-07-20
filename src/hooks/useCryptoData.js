import { useState, useEffect } from 'react';

const useCryptoData = () => {
  const [cryptoData, setCryptoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto data');
      }
      
      const data = await response.json();

      const formattedData = [
        {
          name: "Bitcoin",
          symbol: "BTC",
          price: data.bitcoin.usd,
          changePercent: data.bitcoin.usd_24h_change,
        },
        {
          name: "Ethereum",
          symbol: "ETH",
          price: data.ethereum.usd,
          changePercent: data.ethereum.usd_24h_change,
        }
      ];

      setCryptoData(formattedData);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching crypto data:", err);
      setError(err.message);
      setLoading(false);
      
      // Set mock data as fallback
      setCryptoData([
        {
          name: "Bitcoin",
          symbol: "BTC",
          price: 42150.50,
          changePercent: 2.35,
        },
        {
          name: "Ethereum",
          symbol: "ETH",
          price: 2245.75,
          changePercent: -1.20,
        }
      ]);
    }
  };

  useEffect(() => {
    fetchCryptoData();
    // Fetch every 30 seconds for more frequent updates
    const interval = setInterval(fetchCryptoData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return { cryptoData, loading, error };
};

export default useCryptoData;