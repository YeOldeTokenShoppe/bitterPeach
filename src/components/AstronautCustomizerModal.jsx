import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

// Simple inline astronaut viewer specifically for the customizer
function SimpleAstronautViewer({ modelPath, textureUrl, textureOffset = { x: 0, y: 0 }, textureScale = 1 }) {
  // Model component
  function AstronautModel() {
    const { scene } = useGLTF(modelPath);
    const modelRef = useRef();
    const [texture, setTexture] = useState(null);
    
    // Clone the scene to avoid conflicts between different instances
    const clonedScene = scene.clone();
    
    // Add debug logging for model position
    useEffect(() => {
      if (clonedScene) {
        console.log(`Model loaded: ${modelPath}`);
        console.log('Initial position:', clonedScene.position);
        console.log('Initial rotation:', clonedScene.rotation);
        console.log('Initial scale:', clonedScene.scale);
        
        // Reset position and rotation - ensure clean state for each model
        clonedScene.position.set(0, -0.8, 0);
        clonedScene.rotation.set(0, -Math.PI * 0.5, 0);
        clonedScene.scale.set(2, 2, 2);
        clonedScene.updateMatrixWorld(true);
      }
    }, [clonedScene, modelPath]);
    
    // Load the texture when textureUrl changes
    useEffect(() => {
      console.log("Loading texture from URL:", textureUrl);
      if (!textureUrl) return;
      
      // Set loading manager to track progress
      const loadingManager = new THREE.LoadingManager();
      loadingManager.onStart = () => console.log('Started loading texture:', textureUrl);
      loadingManager.onProgress = (url, loaded, total) => console.log('Loading progress:', url, loaded, '/', total);
      loadingManager.onError = (errorUrl) => console.error('Error loading:', errorUrl);
      
      const loader = new THREE.TextureLoader(loadingManager);
      
      loader.load(
        textureUrl, 
        (loadedTexture) => {
          console.log("Texture loaded successfully:", loadedTexture.uuid, {
            image: loadedTexture.image,
            width: loadedTexture.image?.width,
            height: loadedTexture.image?.height
          });
          
          // Configure texture
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.wrapS = THREE.RepeatWrapping;
          loadedTexture.wrapT = THREE.RepeatWrapping;
          loadedTexture.center = new THREE.Vector2(0.5, 0.5);
          loadedTexture.rotation = Math.PI; // 180 degrees in radians
          
          // Apply scale and offset
          loadedTexture.repeat.set(-textureScale, textureScale);
          loadedTexture.offset.set(textureOffset.x, textureOffset.y);
          
          // Ensure texture updates
          loadedTexture.needsUpdate = true;
          
          setTexture(loadedTexture);
        },
        // Progress callback
        (xhr) => {
          console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // Error callback
        (error) => {
          console.error('Error loading texture:', error);
          console.error('Failed URL:', textureUrl);
        }
      );
      
      // Cleanup function to dispose texture when component unmounts or texture changes
      return () => {
        if (texture) {
          console.log("Cleanup: disposing texture", texture.uuid);
          texture.dispose();
        }
      };
    }, [textureUrl]); // Removed texture from dependencies to avoid infinite loop
    
    // Update texture offset and scale when they change
    useEffect(() => {
      if (texture) {
        texture.repeat.set(-textureScale, textureScale);
        texture.offset.set(textureOffset.x, textureOffset.y);
        texture.needsUpdate = true;
      }
    }, [texture, textureOffset, textureScale]);
    
    // Apply texture to the model
    useEffect(() => {
      if (!clonedScene || !texture) return;
      
      console.log("Applying new texture to model:", texture.uuid);
      let textureApplied = false;
      
      clonedScene.traverse((child) => {
        if (child.isMesh) {
          const nameLower = child.name.toLowerCase();
          console.log("Found mesh:", child.name, {
            hasUV: child.geometry.attributes.uv ? 'Yes' : 'No',
            materialType: child.material.type,
            currentMap: child.material.map ? 'Has map' : 'No map'
          });
          
          // Apply texture to main body parts (suit, body, or if no specific naming)
          if (nameLower.includes('suit') || nameLower.includes('body') || 
              (!nameLower.includes('glass') && !nameLower.includes('visor') && !nameLower.includes('helmet'))) {
            
            // Check if this mesh should receive the texture
            if (child.geometry.attributes.uv) {
              console.log("Applying texture to:", child.name);
              
              // Complete material replacement instead of just changing properties
              const oldMaterial = child.material;
              const newMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                color: new THREE.Color(1, 1, 1), // White to show texture colors
                metalness: 0.1,
                roughness: 0.6,
                envMapIntensity: 0.5,
                side: THREE.FrontSide
              });
              
              // Replace the material entirely
              child.material = newMaterial;
              child.material.needsUpdate = true;
              textureApplied = true;
              
              // Dispose old material after a frame to ensure it's not in use
              setTimeout(() => {
                if (oldMaterial && oldMaterial.dispose) {
                  oldMaterial.dispose();
                }
              }, 0);
            } else {
              console.warn("Mesh has no UV coordinates:", child.name);
            }
          }
          
          // Keep glass transparent (don't apply texture)
          else if (nameLower.includes('glass') || nameLower.includes('visor')) {
            console.log("Keeping glass transparent for:", child.name);
            // Ensure glass stays transparent
            if (child.material) {
              child.material.transparent = true;
              child.material.opacity = child.material.opacity || 0.3;
            }
          }
          
          // Keep helmet as is (don't apply texture)
          else if (nameLower.includes('helmet')) {
            console.log("Keeping helmet material for:", child.name);
          }
        }
      });
      
      if (!textureApplied) {
        console.warn("No suitable mesh found for texture application!");
      }
    }, [clonedScene, texture]);
    
    return <primitive 
      ref={modelRef} 
      object={clonedScene} 
      scale={1.4}
    />;
  }
  
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#2a3644', borderRadius: '8px' }}>
      <Canvas camera={{ position: [0, 0, 8], fov: 40 }}>
        {/* Simple lighting setup */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        
        {/* Background */}
        <color attach="background" args={['#2a3644']} />
        
        {/* Center the model */}
        <Center key={modelPath}>
          <AstronautModel />
        </Center>
        
        {/* Controls */}
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          autoRotate={false}

          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
          zoomToCursor={true}

        />
      </Canvas>
    </div>
  );
}

// The main customizer modal component
export default function AstronautCustomizerModal({ isOpen, onClose, onSave, defaultProfileImage }) {
  const [selectedModel, setSelectedModel] = useState('astronaut1');
  const [customImageUrl, setCustomImageUrl] = useState(null);
  const [activeTextureUrl, setActiveTextureUrl] = useState(defaultProfileImage);
  const [textureOffset, setTextureOffset] = useState({ x: 0, y: 0 });
  const [textureScale, setTextureScale] = useState(1);
  const [viewerKey, setViewerKey] = useState(0);
  const [showTextureGrid, setShowTextureGrid] = useState(false);
  
  // Debug logging
  console.log('AstronautCustomizerModal: Rendering with isOpen:', isOpen);
  console.log('Current active texture URL:', activeTextureUrl);
  
  // Model options - just one for now
  const astronautModels = [
    { id: 'astronaut1', name: 'Classic Astronaut', path: '/astronaut.glb' },
    // Temporarily comment out models that don't exist yet
    { id: 'astronaut2', name: 'Space Explorer', path: '/Astronaut2.glb' },
    // { id: 'astronaut3', name: 'Cosmic Voyager', path: '/astronaut_voyager.glb' }
  ];
  
  // Predefined texture options from astronaut_colors folder
  const textureOptions = [
    { id: 'galactic', name: 'Galactic', path: '/astronaut_colors/Studio_Ochi_Astronauts_Gallactic.png' },
    { id: 'origin', name: 'Origin', path: '/astronaut_colors/Studio_Ochi_Astronauts_Origin.png' },
    { id: 'spaxe', name: 'Spaxe', path: '/astronaut_colors/Studio_Ochi_Astronauts_Spaxe.png' },
    { id: 'generic1', name: 'Generic 1', path: '/astronaut_colors/Studio_Ochi_Astronauts_Generic_01.png' },
    { id: 'generic2', name: 'Generic 2', path: '/astronaut_colors/Studio_Ochi_Astronauts_Generic_02.png' },
    { id: 'generic3', name: 'Generic 3', path: '/astronaut_colors/Studio_Ochi_Astronauts_Generic_03.png' },
    { id: 'people1', name: 'Pro People 1', path: '/astronaut_colors/Studio Ochi Professional People 01.png' },
    { id: 'people2', name: 'Pro People 2', path: '/astronaut_colors/Studio Ochi Professional People 02.png' },
    { id: 'people3', name: 'Pro People 3', path: '/astronaut_colors/Studio Ochi Professional People 03.png' },
    { id: 'people4', name: 'Pro People 4', path: '/astronaut_colors/Studio Ochi Professional People 04.png' },
    { id: 'people5', name: 'Pro People 5', path: '/astronaut_colors/Studio Ochi Professional People 05.png' },
    { id: 'people6', name: 'Pro People 6', path: '/astronaut_colors/Studio Ochi Professional People 06.png' },
  ];
  
  // Handle image file selection
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Selected image:", file.name);
      
      const reader = new FileReader();
      
      reader.onerror = (error) => {
        console.error("Error reading image file:", error);
      };
      
      reader.onload = (event) => {
        const result = event.target.result;
        console.log("Custom image loaded successfully");
        
        // Update states and reset transformations
        setCustomImageUrl(result);
        setActiveTextureUrl(result);
        setTextureOffset({ x: 0, y: 0 });
        setTextureScale(1);
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  // Handle texture selection from predefined options
  const handleTextureSelect = (texturePath) => {
    console.log("Selected predefined texture:", texturePath);
    setActiveTextureUrl(texturePath);
    setCustomImageUrl(texturePath);
    setTextureOffset({ x: 0, y: 0 });
    setTextureScale(1);
    setShowTextureGrid(false);
  };
  
  // Save customization and close modal
  const handleSave = () => {
    const astronautModel = astronautModels.find(model => model.id === selectedModel);
    console.log("Saving customized astronaut with", customImageUrl ? "custom image" : "default image");
    
    onSave({
      modelPath: astronautModel.path,
      customImage: customImageUrl || defaultProfileImage,
      textureOffset,
      textureScale,
    });
    onClose();
  };
  
  // If modal is not open, don't render anything
  if (!isOpen) {
    return null;
  }
  
  console.log('AstronautCustomizerModal: Rendering the modal UI');
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: '#1f2937', 
          border: '2px solid #3b82f6',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.7)',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', color: 'white', margin: 0 }}>
            Customize Astronaut
          </h2>
          <button 
            onClick={onClose}
            style={{ fontSize: '1.5rem', color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            &times;
          </button>
        </div>
        
        {/* 3D preview of astronaut with applied texture */}
        <div style={{ height: '20rem', marginBottom: '1rem' }}>
          <SimpleAstronautViewer 
            key={`${selectedModel}-${viewerKey}`}
            modelPath={astronautModels.find(model => model.id === selectedModel)?.path || '/astronaut.glb'} 
            textureUrl={activeTextureUrl}
            textureOffset={textureOffset}
            textureScale={textureScale}
          />
        </div>
        
        {/* Model selection carousel */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem' }}>
            Select Astronaut Model
          </label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            backgroundColor: '#374151',
            borderRadius: '0.5rem',
            padding: '0.5rem'
          }}>
            <button
              onClick={() => {
                const currentIndex = astronautModels.findIndex(m => m.id === selectedModel);
                const prevIndex = (currentIndex - 1 + astronautModels.length) % astronautModels.length;
                setSelectedModel(astronautModels[prevIndex].id);
                setViewerKey(prev => prev + 1);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ←
            </button>
            
            <div style={{ 
              color: 'white', 
              fontWeight: '500',
              textAlign: 'center',
              flex: 1,
              padding: '0 1rem'
            }}>
              {astronautModels.find(m => m.id === selectedModel)?.name}
            </div>
            
            <button
              onClick={() => {
                const currentIndex = astronautModels.findIndex(m => m.id === selectedModel);
                const nextIndex = (currentIndex + 1) % astronautModels.length;
                setSelectedModel(astronautModels[nextIndex].id);
                setViewerKey(prev => prev + 1);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              →
            </button>
          </div>
        </div>
        
        {/* Image selection */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <label
              style={{
                display: 'block',
                flex: 1,
                padding: '0.75rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                textAlign: 'center',
                fontWeight: '500'
              }}
            >
              Upload Image
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                style={{ display: 'none' }}
              />
            </label>
            
            <button
              onClick={() => setShowTextureGrid(!showTextureGrid)}
              style={{
                flex: 1,
                padding: '0.75rem',
                backgroundColor: showTextureGrid ? '#059669' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {showTextureGrid ? 'Hide' : 'Show'} Textures
            </button>
          </div>
          
          {/* Texture selection grid */}
          {showTextureGrid && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem',
              marginBottom: '1rem',
              padding: '1rem',
              backgroundColor: '#374151',
              borderRadius: '0.5rem',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {textureOptions.map((texture) => (
                <button
                  key={texture.id}
                  onClick={() => handleTextureSelect(texture.path)}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: activeTextureUrl === texture.path ? '#3b82f6' : '#4b5563',
                    color: 'white',
                    border: activeTextureUrl === texture.path ? '2px solid #60a5fa' : '2px solid transparent',
                    borderRadius: '0.25rem',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  onMouseOver={(e) => {
                    if (activeTextureUrl !== texture.path) {
                      e.currentTarget.style.backgroundColor = '#6b7280';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (activeTextureUrl !== texture.path) {
                      e.currentTarget.style.backgroundColor = '#4b5563';
                    }
                  }}
                  title={texture.name}
                >
                  {texture.name}
                </button>
              ))}
            </div>
          )}
          
          {/* Image transformation controls */}
          {activeTextureUrl && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', color: 'white', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Image Adjustments
              </label>
              
              {/* Compact grid layout for controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {/* Scale control */}
                <div>
                  <label style={{ display: 'block', color: '#d1d5db', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                    Zoom: {textureScale.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={textureScale}
                    onChange={(e) => setTextureScale(parseFloat(e.target.value))}
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#374151',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                
                {/* Reset button */}
                <div style={{ display: 'flex', alignItems: 'end' }}>
                  <button
                    onClick={() => {
                      setTextureOffset({ x: 0, y: 0 });
                      setTextureScale(1);
                    }}
                    style={{
                      width: '100%',
                      padding: '0.25rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Reset
                  </button>
                </div>
              </div>
              
              {/* Position controls in grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                {/* X offset control */}
                <div>
                  <label style={{ display: 'block', color: '#d1d5db', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                    H-Pos: {textureOffset.x.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={textureOffset.x}
                    onChange={(e) => setTextureOffset(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#374151',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                
                {/* Y offset control */}
                <div>
                  <label style={{ display: 'block', color: '#d1d5db', marginBottom: '0.25rem', fontSize: '0.75rem' }}>
                    V-Pos: {textureOffset.y.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={textureOffset.y}
                    onChange={(e) => setTextureOffset(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '2px',
                      background: '#374151',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button 
              onClick={onClose}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#4b5563', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              style={{ 
                padding: '0.5rem 1rem', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.25rem',
                cursor: 'pointer'
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preload models
useGLTF.preload('/astronaut.glb');
useGLTF.preload('/Astronaut2.glb');

// Optionally preload textures for better performance
if (typeof window !== 'undefined') {
  const textureLoader = new THREE.TextureLoader();
  const texturePaths = [
    '/astronaut_colors/Studio_Ochi_Astronauts_Gallactic.png',
    '/astronaut_colors/Studio_Ochi_Astronauts_Origin.png',
    '/astronaut_colors/Studio_Ochi_Astronauts_Spaxe.png',
    '/astronaut_colors/Studio_Ochi_Astronauts_Generic_01.png',
    '/astronaut_colors/Studio_Ochi_Astronauts_Generic_02.png',
    '/astronaut_colors/Studio_Ochi_Astronauts_Generic_03.png',
  ];
  
  // Load the first 6 textures in the background
  texturePaths.forEach(path => {
    textureLoader.load(path, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      // Textures are now cached by the browser
    });
  });
}