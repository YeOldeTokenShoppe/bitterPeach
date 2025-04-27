/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Webhook } = require("svix");
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();

// Set up the JWKS client for your new Clerk domain
const clerkJwksClient = jwksClient({
  jwksUri: 'https://neutral-urchin-8.clerk.accounts.dev/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
});

// Function to get the signing key from Clerk's JWKS
const getClerkSigningKey = (header, callback) => {
  clerkJwksClient.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

// Create a Cloud Function that verifies a Clerk JWT and returns a Firebase custom token
exports.createFirebaseToken = functions.https.onCall(async (data, context) => {
  try {
    // Get the Clerk JWT token from the request
    const { clerkToken } = data;
    
    if (!clerkToken) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'The function must be called with a "clerkToken" argument.'
      );
    }
    
    // Verify the Clerk JWT
    return new Promise((resolve, reject) => {
      jwt.verify(
        clerkToken,
        getClerkSigningKey,
        {
          issuer: 'https://neutral-urchin-8.clerk.accounts.dev',
          algorithms: ['RS256'],
        },
        async (err, decoded) => {
          if (err) {
            console.error('Error verifying Clerk token:', err);
            reject(new functions.https.HttpsError('unauthenticated', 'Invalid token'));
            return;
          }
          
          try {
            // Extract user information from the decoded token
            const userId = decoded.sub;
            
            // Log the full decoded token to see what's available
            console.log('Decoded Clerk token:', decoded);
            
            // Log specific fields we're looking for
            console.log('Clerk token fields:', {
              sub: decoded.sub || 'missing',
              imageUrl: decoded.imageUrl || 'missing',
              image_url: decoded.image_url || 'missing',
              username: decoded.username || 'missing',
              name: decoded.name || 'missing',
              firstName: decoded.firstName || 'missing',
              avatarUrl: decoded.avatarUrl || 'missing',
              picture: decoded.picture || 'missing',
              profile: typeof decoded.profile === 'object' ? 'present' : 'missing',
              externalAccounts: decoded.externalAccounts ? 'present' : 'missing',
              discordOAuth: decoded.oauth_discord ? 'present' : 'missing',
              hasDiscord: decoded.has_discord === true
            });
            
            // Extract additional claims from the token
            const email = decoded.email || null;
            const name = decoded.name || null;
            const imageUrl = decoded.imageUrl || null;
            const username = decoded.username || null;
            
            // Check for Discord data
            const discordData = {};
            if (decoded.oauth_discord) {
              discordData.discordId = decoded.oauth_discord.id || null;
              discordData.discordUsername = decoded.oauth_discord.username || null;
              discordData.discordAvatar = decoded.oauth_discord.avatar || null;
              console.log('Found Discord data:', discordData);
            }
            
            // Create a custom token for Firebase Auth with all the claims
            const firebaseToken = await admin.auth().createCustomToken(userId, {
              clerk_user_id: userId,
              email,
              name,
              imageUrl,
              username,
              discordData: Object.keys(discordData).length > 0 ? discordData : null
            });
            
            // Return the Firebase token to the client
            resolve({ firebaseToken });
          } catch (error) {
            console.error('Error creating Firebase token:', error);
            reject(new functions.https.HttpsError('internal', 'Failed to create Firebase token'));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error in createFirebaseToken:', error);
    throw new functions.https.HttpsError('internal', 'Internal server error');
  }
});

// Fetch Image Data Function
exports.fetchImageData = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    // Send response to OPTIONS requests
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  const { userId } = req.query;

  try {
    const resultRef = db.collection("results").doc(userId);
    const resultSnap = await resultRef.get();

    if (!resultSnap.exists) {
      return res.status(404).json({ error: "No such document!" });
    }

    const resultData = resultSnap.data();
    res.status(200).json(resultData);
  } catch (error) {
    console.error("Error fetching image data:", error);
    res.status(500).json({ error: "Error fetching image data" });
  }
});

// Fetch Data Function
exports.fetchData = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    // Send response to OPTIONS requests
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const q = db.collection("results").orderBy("createdAt", "desc");
    const snapshot = await q.get();
    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      userName: doc.data().userName,
    }));
    res.status(200).json(results.slice(0, 5));
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Error fetching data" });
  }
});

// Dexscreener API Function
exports.dexscreenerAPI = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    // Send response to OPTIONS requests
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  const chainId = "ethereum";
  const pairAddresses = "0xA43fe16908251ee70EF74718545e4FE6C5cCEc9f";

  try {
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/${chainId}/${pairAddresses}`
    );
    if (!response.ok) throw new Error("Failed to fetch data");

    const dexdata = await response.json();
    const pairData = dexdata.pairs[0];

    const volume = pairData.volume;
    const liquidity = pairData.liquidity;
    const fdv = pairData.fdv;
    const buys = pairData.txns.h24.buys;
    const sells = pairData.txns.h24.sells;

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
});

// Clerk Webhook Function
exports.clerkWebhook = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    // Send response to OPTIONS requests
    res.set("Access-Control-Allow-Methods", "POST");
    res.set(
      "Access-Control-Allow-Headers",
      "Content-Type, svix-id, svix-timestamp, svix-signature"
    );
    res.status(204).send("");
    return;
  }

  if (req.method !== "POST") {
    return res.status(405);
  }

  // Get the Clerk secret key from Firebase environment variables
  const CLERK_SECRET_KEY = functions.config().clerk.secret_key;

  if (!CLERK_SECRET_KEY) {
    throw new Error(
      "Please add CLERK_SECRET_KEY to Firebase environment variables"
    );
  }

  // For now, just log the webhook data
  console.log("Received webhook:", {
    headers: req.headers,
    body: req.body,
  });

  // Return success response
  return res.status(200).json({
    response: "Success",
    message: "Webhook received successfully",
  });
});

// CoinMarketCap Fear & Greed Index Function
exports.getFearAndGreed = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    // Send response to OPTIONS requests
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const axios = require('axios');
    // Get the API key from environment variables
    const apiKey = functions.config().coinmarketcap?.api_key;
    
    if (!apiKey) {
      console.error("CoinMarketCap API key not configured");
      return res.status(500).json({ 
        error: "API key missing", 
        message: "CoinMarketCap API key not configured in Firebase Functions" 
      });
    }

    // Using axios similar to the CoinMarketCap example
    const response = await axios.get('https://pro-api.coinmarketcap.com/v3/fear-and-greed/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
      },
    });
    
    // Process the response data
    const data = response.data;
    
    // Return only the first data object, or the fields you need
    if (data.data && data.data[0]) {
      const { value, value_classification: classification } = data.data[0];
      return res.status(200).json({ value, classification });
    } else {
      console.error("Unexpected CMC response format", data);
      return res.status(500).json({ 
        error: "Unexpected CMC response", 
        details: data 
      });
    }
  } catch (err) {
    console.error("Error fetching Fear & Greed index:", err);
    
    // Handle axios error response if available
    if (err.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("CMC API error response:", {
        status: err.response.status,
        data: err.response.data
      });
      return res.status(err.response.status).json({ 
        error: "CoinMarketCap error", 
        details: err.response.data,
        status: err.response.status 
      });
    }
    
    return res.status(500).json({ error: err.message });
  }
});