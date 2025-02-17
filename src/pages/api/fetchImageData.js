// import { initializeApp, cert, getApps } from "firebase-admin/app";
// import { getFirestore } from "firebase-admin/firestore";

// const serviceAccount = require("../../../serviceAccountKey.json");

// if (!getApps().length) {
//   initializeApp({
//     credential: cert(serviceAccount),
//   });
// }

// const db = getFirestore();

// export default async function handler(req, res) {
//   const { userId } = req.query;

//   try {
//     const resultRef = db.collection("results").doc(userId);
//     const resultSnap = await resultRef.get();

//     if (!resultSnap.exists) {
//       return res.status(404).json({ error: "No such document!" });
//     }

//     const resultData = resultSnap.data();
//     res.status(200).json(resultData);
//   } catch (error) {
//     console.error("Error fetching image data:", error);
//     res.status(500).json({ error: "Error fetching image data" });
//   }
// }
