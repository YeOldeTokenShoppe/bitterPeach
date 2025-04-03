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

// Initialize Firebase Admin
admin.initializeApp();

// Initialize Firestore
const db = admin.firestore();

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
