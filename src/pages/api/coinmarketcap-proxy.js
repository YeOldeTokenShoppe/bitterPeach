// CoinMarketCap API proxy endpoint
export default async function handler(req, res) {
  try {
    // IMPORTANT: In a production app, you should store this in a server-only environment variable
    // NEXT_PUBLIC_ variables are exposed to the browser
    // Get API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_COINMARKETCAP || process.env.COINMARKETCAP_API_KEY;
    
    if (!apiKey) {
      console.error('CoinMarketCap API key is not configured');
      return res.status(500).json({ error: 'CoinMarketCap API key is not configured' });
    }
    
    // Get parameters from query
    const { symbols } = req.query;
    
    if (!symbols) {
      return res.status(400).json({ error: 'Symbols parameter is required' });
    }
    
    // Log request details for debugging
    console.log(`Making request to CoinMarketCap API for symbols: ${symbols}`);
    console.log(`API key length: ${apiKey.length}`);
    
    try {
      // Construct CoinMarketCap API URL
      const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}&convert=USD`;
      
      // Make the API request
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-CMC_PRO_API_KEY': apiKey
        }
      });
      
      console.log(`CoinMarketCap API response status: ${response.status}`);
      
      // Get response text first to handle potential HTML responses
      const responseText = await response.text();
      
      // Check if response looks like HTML
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        console.error('Received HTML response from CoinMarketCap API');
        return res.status(500).json({ 
          error: 'Received HTML response',
          details: responseText.substring(0, 200) + '...'
        });
      }
      
      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        return res.status(500).json({ 
          error: 'Invalid JSON response',
          details: responseText.substring(0, 200) + '...'
        });
      }
      
      // Check for API error response
      if (data.status && data.status.error_code !== 0) {
        console.error('CoinMarketCap API error:', data.status);
        return res.status(500).json({ 
          error: data.status.error_message || 'API Error',
          code: data.status.error_code
        });
      }
      
      // Success case
      console.log('Successfully fetched data from CoinMarketCap API');
      return res.status(200).json(data);
      
    } catch (fetchError) {
      console.error('Error fetching from CoinMarketCap:', fetchError);
      return res.status(500).json({ error: 'Error connecting to CoinMarketCap API' });
    }
  } catch (error) {
    console.error('Unexpected error in CoinMarketCap proxy:', error);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
} 