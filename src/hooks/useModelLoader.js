import { useState, useEffect } from "react";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "../utilities/firebaseClient";

export function useModelLoader(modelPath, fallbackPath) {
  const [modelUrl, setModelUrl] = useState(fallbackPath);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModelUrl = async () => {
      try {
        setIsLoading(true);
        const modelRef = ref(storage, modelPath);
        const downloadUrl = await getDownloadURL(modelRef);
        setModelUrl(downloadUrl);
        setIsLoading(false);
      } catch (error) {
        console.error(
          `Error fetching model from Firebase Storage: ${modelPath}`,
          error
        );
        setError(error);
        setIsLoading(false);
        // Keep using the fallback URL
      }
    };

    fetchModelUrl();
  }, [modelPath, fallbackPath]);

  return { modelUrl, isLoading, error };
}
