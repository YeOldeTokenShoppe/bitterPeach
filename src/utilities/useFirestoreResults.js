import { useState, useEffect } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "./firebaseClient";

export function useFirestoreResults() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "results"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedResults = querySnapshot.docs.map((doc) => ({
        id: doc.id, // 🔍 Check this format
        userName: doc.data().username || "Anonymous",
        image: doc.data().image,
        message: doc.data().message,
        burnedAmount: doc.data().burnedAmount || 1,
        staked: doc.data().staked || false,
        createdAt: doc.data().createdAt?.toDate() || new Date(), // Include createdAt timestamp
      }));

      console.log("🔥 Firestore results fetched:", fetchedResults); // ✅ Log results

      setResults((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(fetchedResults))
          return prev;
        return fetchedResults;
      });
    });

    return () => unsubscribe();
  }, []);

  return results;
}
