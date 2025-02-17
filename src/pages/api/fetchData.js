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
//   try {
//     const q = db.collection("results").orderBy("createdAt", "desc");
//     const snapshot = await q.get();
//     const results = snapshot.docs.map((doc) => ({
//       id: doc.id,
//       userName: doc.data().userName,
//     }));
//     res.status(200).json(results.slice(0, 5));
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     res.status(500).json({ error: "Error fetching data" });
//   }
// }
