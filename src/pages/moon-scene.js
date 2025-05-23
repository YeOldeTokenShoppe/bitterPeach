import React, { useState, useEffect, Suspense } from 'react';
import MoonSceneComponent from '../components/MoonScene'; // Assuming MoonScene.jsx exports default
import * as THREE from 'three';
import { doc, getDocs, collection, query } from 'firebase/firestore'; // Removed limit
import { db } from '../utilities/firebaseClient'; // Your Firebase init

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
  const [loadingMessage, setLoadingMessage] = useState("Initializing...");

  useEffect(() => {
    const fetchUserHelmetImages = async () => {
      setLoadingMessage("Fetching user data for helmets...");
      try {
        const usersRef = collection(db, "users");
        // Fetch all users, no limit
        const q = query(usersRef);
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          console.warn("No users found in Firestore with the current query.");
          setLoadingMessage("No user data found to load helmet images.");
          setUserHelmetTextures([]);
          return;
        }

        setLoadingMessage(`Found ${querySnapshot.docs.length} users, loading images...`);
        
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
        
        if (validTextureData.length > 0) {
            setLoadingMessage(`Successfully loaded ${validTextureData.length} helmet textures.`);
        } else {
            setLoadingMessage("No valid helmet textures could be loaded from user data.");
            console.warn("moon-scene.js: No valid textures were loaded.");
        }

      } catch (error) {
        console.error("Error fetching user helmet images:", error);
        setPageError("Failed to load user helmet images.");
        setLoadingMessage("Error loading helmet images.");
        setUserHelmetTextures([]); 
      }
    };

    fetchUserHelmetImages();
  }, []); // Runs once on mount

  // Log for prop passing verification
  console.log("moon-scene.js: Rendering MoonSceneComponent with userHelmetTextures:", 
    userHelmetTextures.map(item => item.userId));

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#0c0c1e' /* Dark bg for page */ }}>
      {/* UI for loading messages or errors can be placed here */}
      {(loadingMessage && userHelmetTextures.length === 0 && !pageError) && 
        <div style={{position: 'absolute', top: '10px', left: '10px', color: 'white', background: 'rgba(0,0,0,0.7)', padding: '10px', borderRadius: '5px', zIndex:1000}}>
          {loadingMessage}
        </div>
        
      }
      {pageError && 
        <div style={{position: 'absolute', top: '50px', left: '10px', color: 'red', background: 'white', padding: '10px', borderRadius: '5px', zIndex:1000}}>
          Error: {pageError}
        </div>
      }
      
      {/* Show user count when loading complete */}
      {userHelmetTextures.length > 0 && 
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
      
      <div className="textLight" id="textLight" style={{
        position: "absolute",
        top: "20px", 
        left: "20px",
        zIndex: 100,
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
      
      <MoonSceneComponent userHelmetTextures={userHelmetTextures} />
    </div>
  );
} 