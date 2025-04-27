// Debug API endpoint to check environment variables
export default async function handler(req, res) {
  // This endpoint is for debugging only and should be removed in production
  
  // Get environment variables
  const envVars = {
    // Check for CoinMarketCap API key (mask the actual key for security)
    NEXT_PUBLIC_COINMARKETCAP: process.env.NEXT_PUBLIC_COINMARKETCAP 
      ? `${process.env.NEXT_PUBLIC_COINMARKETCAP.substring(0, 5)}...${process.env.NEXT_PUBLIC_COINMARKETCAP.substring(process.env.NEXT_PUBLIC_COINMARKETCAP.length - 4)}`
      : 'Not set',
    
    // Add other environment variables as needed (always mask sensitive values)
    NODE_ENV: process.env.NODE_ENV || 'Not set'
  };
  
  // Check if specific env vars are available on the server
  const serverInfo = {
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.NEXT_PUBLIC_COINMARKETCAP),
    apiKeyLength: process.env.NEXT_PUBLIC_COINMARKETCAP?.length || 0
  };
  
  return res.status(200).json({
    environment: envVars,
    serverInfo
  });
} 