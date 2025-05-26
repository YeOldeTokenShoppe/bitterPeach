import React, { useState, useEffect, Suspense } from 'react';
import MoonSceneComponent from '../components/MoonScene'; // Assuming MoonScene.jsx exports default
import * as THREE from 'three'; // Corrected import alias
import { doc, getDocs, collection, query } from 'firebase/firestore'; // Removed limit
import { db } from '../utilities/firebaseClient'; // Your Firebase init
import Loader from '../components/Loader'; // Import Loader component

// Helper to load texture (can be moved to a utils file later)
const loadImageAsTexture = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      console.warn("loadImageAsTexture: URL is null or undefined.");
      resolve(null); // Resolve with null if URL is invalid
      return;
    }
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous'); // Important if images are from a different origin (like Firebase Storage)
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false; // Explicitly set flipY. Adjust to true if needed.
        console.log("Texture loaded successfully from:", url, "(flipY:", texture.flipY, ")");
        resolve(texture);
      },
      undefined, // onProgress
      (err) => {
        console.error(`Error loading texture from ${url}:`, err);
        resolve(null); // Resolve with null to handle errors gracefully for Promise.all
      }
    );
  });
};

export default function MoonScenePage() {
  const [userHelmetTextures, setUserHelmetTextures] = useState([]);
  const [pageError, setPageError] = useState(null);
  // const [loadingMessage, setLoadingMessage] = useState("Initializing..."); // Replaced by progress loader
  
  // New state variables for pre-loader
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isDataFetched, setIsDataFetched] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);

  useEffect(() => {
    const fetchUserHelmetImages = async () => {
      // setLoadingMessage("Fetching user data for helmets..."); // Replaced by progress
      setIsDataFetched(false); // Reset before fetching
      try {
        const usersRef = collection(db, "users");
        // Fetch all users, no limit
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.warn("No users found in Firestore with the current query.");
          // setLoadingMessage("No user data found to load helmet images."); // Replaced
          setUserHelmetTextures([]);
          setIsDataFetched(true); // Data fetching attempt is complete
          return;
        }

        // setLoadingMessage(`Found ${querySnapshot.docs.length} users, loading images...`); // Replaced
        
        // Create array of user data objects with their ID and image URL
        const users = [];
        querySnapshot.forEach((docSnap) => {
          const userData = docSnap.data();
          const imageUrl = userData.imageUrl || userData.profileImage;
          
          if (imageUrl) {
            console.log(`Found user ${docSnap.id} with image URL: ${imageUrl}`);
            users.push({
              id: docSnap.id,
              imageUrl,
              username: userData.username || 'Unknown User'
            });
          } else {
            console.warn(`User ${docSnap.id} has no imageUrl/profileImage. Skipping.`);
          }
        });
        
        console.log(`Processing ${users.length} users with valid image URLs`);
        
        // Load textures for users with valid image URLs
        const texturePromises = users.map(user => 
          loadImageAsTexture(user.imageUrl).then(texture => {
            // Return both the texture and user data
            return {
              texture,
              userId: user.id,
              username: user.username
            };
          })
        );

        const loadedResults = await Promise.all(texturePromises);
        
        // Filter out failed texture loads but keep user data
        const validTextureData = loadedResults.filter(item => 
          item.texture instanceof THREE.Texture
        );
        
        console.log(`Successfully loaded ${validTextureData.length} helmet textures with user data`);
        
        setUserHelmetTextures(validTextureData);
        
        // if (validTextureData.length > 0) { // Replaced
            // setLoadingMessage(`Successfully loaded ${validTextureData.length} helmet textures.`);
        // } else {
            // setLoadingMessage("No valid helmet textures could be loaded from user data.");
        // }

      } catch (error) {
        console.error("Error fetching user helmet images:", error);
        setPageError("Failed to load user helmet images.");
        // setLoadingMessage("Error loading helmet images."); // Replaced
        setUserHelmetTextures([]); 
      } finally {
        setIsDataFetched(true); // Mark data fetching as complete
      }
    };

    fetchUserHelmetImages();
  }, []); // Runs once on mount

  // Effect for loading progress and managing isLoading state
  useEffect(() => {
    if (isDataFetched && isSceneReady) {
      setLoadingProgress(100);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500); // Delay to allow smooth transition
      return () => clearTimeout(timer);
    } else if (isDataFetched && !isSceneReady) {
      setLoadingProgress(30); // Data fetched, waiting for scene
    } else if (!isDataFetched && isSceneReady) {
      setLoadingProgress(70); // Scene ready, waiting for data (less common scenario)
    } else {
      setLoadingProgress(10); // Initializing
    }
  }, [isDataFetched, isSceneReady]);

  // Log for prop passing verification
  // console.log("moon-scene.js: Rendering MoonSceneComponent with userHelmetTextures:", 
  //   userHelmetTextures.map(item => item.userId));

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'fixed', left:0, top:0, right:0, bottom:0, overflow: 'hidden', background: '#000010' /* Dark bg for page */ }}>
      {isLoading && <Loader progress={loadingProgress} />}

      <div style={{ 
        opacity: isLoading ? 0 : 1, 
        transition: 'opacity 0.5s ease-in-out',
        width: '100%', height: '100%', position: 'relative' 
      }}>
        {/* UI for errors (can be kept or integrated differently) */}
        {pageError && 
          <div style={{position: 'absolute', top: '50px', left: '10px', color: 'red', background: 'white', padding: '10px', borderRadius: '5px', zIndex:1000}}>
            Error: {pageError}
          </div>
        }
        
        {/* Show user count when loading complete - only if not loading and no error */}
        {!isLoading && !pageError && userHelmetTextures.length > 0 && 
          <div style={{position: 'absolute', top: '10px', right: '10px', color: 'white', background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px', zIndex:1000}}>
            {userHelmetTextures.length} Astronauts
          </div>
        }
         <style jsx global>{`
          .text__copy {
            position: absolute;
            z-index: -1;
            top: 0;
            left: 0;
            filter: blur(0.1rem);
          }
        `}</style>
        
        {/* Decorative text - keep outside opacity controlled div if it should be visible during loading, or move inside */}
        <div className="textLight" id="textLight" style={{
          position: "absolute",
          top: "20px", 
          left: "20px",
          zIndex: 100, // Ensure it's above the scene if opaque
          borderRadius: "8px",
          padding: "10px",
          pointerEvents: "none"
        }}>
          <div 
            id="text"
            style={{
              position: "relative",
              fontFamily: "'UnifrakturMaguntia', cursive",
              fontSize: "4rem",
              color: "#ffffff",
            }}
          >
            RL80
            {Array.from({length: 100}).map((_, i) => {
              const index = i + 1;
              return (
                <div
                  key={index}
                  className="text__copy"
                  style={{
                    position: "absolute",
                    pointerEvents: "none",
                    zIndex: -1,
                    top: 0,
                    left: 0,
                    color: `rgba(${255 - index * 2}, ${255 - index * 3}, ${255 - index * 2})`,
                    filter: "blur(0.1rem)",
                    transform: `translate(
                      ${index * 0.1}rem, 
                      ${index * 0.1}rem
                    ) scale(${1 + index * 0.01})`,
                    opacity: (1 / index) * 1.5,
                  }}
                >
                  RL80
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Conditionally render MoonSceneComponent only when data is fetched to avoid issues with empty textures? 
            Or let MoonSceneComponent handle empty textures gracefully.
            Assuming MoonSceneComponent can handle it or updates when textures arrive.
        */}
        <MoonSceneComponent 
          userHelmetTextures={userHelmetTextures} 
          onSceneReady={() => setIsSceneReady(true)} // Pass the callback
        />
      </div>
    </div>
  );
} 