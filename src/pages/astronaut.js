import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import SingleAstronautViewer from '../components/SingleAstronautViewer'; // We'll create this next
import * as THREE from 'three';
import { doc, getDoc } from 'firebase/firestore'; // For fetching a single user
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
        texture.flipY = false; // Set flipY to false by default (common for GLTF)
        console.log("Texture loaded successfully from:", url, "flipY set to:", texture.flipY);
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

export default function AstronautPage() {
  const [helmetTexture, setHelmetTexture] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserAndLoadTexture = async () => {
      try {
        // Option 1: Hardcode an image URL for testing (if Firebase fetching is problematic)
        // const testImageUrl = 'https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18ydnBDZmRaaWZNTENaaHJZZHNmbUs1Y3lMcGIifQ'; // Example Clerk URL
        // console.log("Using test image URL:", testImageUrl);
        // const texture = await loadImageAsTexture(testImageUrl);
        // setHelmetTexture(texture);
        // return; // Early exit if using hardcoded URL

        // Option 2: Fetch a specific user from Firebase
        const userIdToFetch = 'user_2nWNryLvqBLjXW7MBXud0yeocdq'; // This is your actual User ID now

        if (userIdToFetch === 'YOUR_ACTUAL_USER_ID_HERE') { 
            console.warn("CRITICAL: Please replace 'YOUR_ACTUAL_USER_ID_HERE' in astronaut.js with a real user ID from your Firestore 'users' collection.");
            setError("User ID for fetching is not set. Update astronaut.js.");
            const placeholderUrl = 'https://placehold.co/256x256/orange/white?text=Set+User+ID';
            const fallbackTexture = await loadImageAsTexture(placeholderUrl);
            setHelmetTexture(fallbackTexture);
            return;
        }

        console.log(`Fetching user ${userIdToFetch} from Firestore...`);
        const userDocRef = doc(db, 'users', userIdToFetch);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const imageUrl = userData.imageUrl || userData.profileImage; // Check both common fields
          if (imageUrl) {
            console.log(`Found image URL for user ${userIdToFetch}:`, imageUrl);
            const texture = await loadImageAsTexture(imageUrl);
            if (texture) {
              setHelmetTexture(texture);
              setError(null); // Clear previous errors if successful
            } else {
              // loadImageAsTexture resolved with null (error already logged by it)
              setError(`Failed to load texture from URL: ${imageUrl}`);
              const placeholderUrl = 'https://placehold.co/256x256/red/white?text=Texture+Load+Fail';
              const fallbackTexture = await loadImageAsTexture(placeholderUrl);
              setHelmetTexture(fallbackTexture);
            }
          } else {
            console.error(`User ${userIdToFetch} does not have an imageUrl or profileImage.`);
            setError(`User ${userIdToFetch} has no image URL.`);
            const placeholderUrl = 'https://placehold.co/256x256/red/white?text=No+User+Img';
            const fallbackTexture = await loadImageAsTexture(placeholderUrl);
            setHelmetTexture(fallbackTexture);
          }
        } else {
          console.error(`User with ID ${userIdToFetch} not found.`);
          setError(`User ${userIdToFetch} not found.`);
          const placeholderUrl = 'https://placehold.co/256x256/grey/white?text=User+Not+Found';
          const fallbackTexture = await loadImageAsTexture(placeholderUrl);
          setHelmetTexture(fallbackTexture);
        }
      } catch (err) {
        console.error("Error in fetchUserAndLoadTexture:", err);
        setError("Failed to load texture or user data. Check console.");
        const placeholderUrl = 'https://placehold.co/256x256/black/white?text=Error';
        try {
            const fallbackTexture = await loadImageAsTexture(placeholderUrl);
            setHelmetTexture(fallbackTexture);
        } catch (fallbackErr) {
            console.error("Failed to load even the fallback placeholder:", fallbackErr);
        }
      }
    };

    fetchUserAndLoadTexture();
  }, []); // Runs once on mount

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#333' }}>
      <Canvas shadows camera={{ position: [0, 1, 3], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[5, 5, 5]} 
          intensity={1.0} 
          castShadow 
          shadow-mapSize-width={1024} 
          shadow-mapSize-height={1024} 
        />
        <Environment preset="sunset" />
        <Suspense fallback={null}>
          {helmetTexture ? (
            <SingleAstronautViewer customHelmetTexture={helmetTexture} />
          ) : (
            <mesh>
              <boxGeometry args={[0.1,0.1,0.1]}/>
              <meshStandardMaterial color="red" wireframe />
              {/* Simple placeholder while texture loads or if error occurs before fallback */}
            </mesh>
          )}
        </Suspense>
        <OrbitControls />
      </Canvas>
      {error && <div style={{position: 'absolute', top: '10px', left: '10px', color: 'red', background: 'white', padding: '10px', zIndex:100}}>{error}</div>}
      {!helmetTexture && !error && <div style={{position: 'absolute', top: '10px', left: '10px', color: 'white', background: 'rgba(0,0,0,0.5)', padding: '10px', zIndex:100}}>Loading texture...</div>}
    </div>
  );
} 