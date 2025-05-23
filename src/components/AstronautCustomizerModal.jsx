import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

// Simple inline astronaut viewer specifically for the customizer
function SimpleAstronautViewer({ modelPath, textureUrl }) {
  // Model component
  function AstronautModel() {
    const { scene } = useGLTF(modelPath);
    const modelRef = useRef();
    const [texture, setTexture] = useState(null);
    
    // Load the texture when textureUrl changes
    useEffect(() => {
      console.log("Loading texture from URL:", textureUrl);
      if (!textureUrl) return;
      
      // Dispose previous texture if it exists to prevent memory leaks
      if (texture) {
        console.log("Disposing previous texture:", texture.uuid);
        texture.dispose();
      }
      
      const textureLoader = new THREE.TextureLoader();
      textureLoader.load(textureUrl, (loadedTexture) => {
        console.log("Texture loaded successfully:", loadedTexture.uuid);
        loadedTexture.colorSpace = THREE.SRGBColorSpace;
        loadedTexture.center = new THREE.Vector2(0.5, 0.5);
        loadedTexture.rotation = Math.PI; // 180 degrees in radians
        
        // Flip the texture horizontally by setting a negative scale
        loadedTexture.repeat.set(-1, 1);
        
        setTexture(loadedTexture);
      });
      
      // Cleanup function to dispose texture when component unmounts or texture changes
      return () => {
        if (texture) {
          console.log("Cleanup: disposing texture", texture.uuid);
          texture.dispose();
        }
      };
    }, [textureUrl, texture]);
    
    // Apply texture to the model
    useEffect(() => {
      if (!scene || !texture) return;
      
      console.log("Applying new texture to model:", texture.uuid);
      scene.traverse((child) => {
        if (child.isMesh) {
          const nameLower = child.name.toLowerCase();
          
          // Only apply texture to the helmet, not the glass
          if (nameLower.includes('helmet')) {
            console.log("Applying texture to:", child.name);
            
            // Complete material replacement instead of just changing properties
            const oldMaterial = child.material;
            const newMaterial = new THREE.MeshStandardMaterial({
              map: texture,
              emissive: new THREE.Color(0x3333ff),
              emissiveIntensity: 0.3,
              emissiveMap: texture
            });
            
            // Replace the material entirely
            child.material = newMaterial;
            oldMaterial.dispose(); // Clean up the old material
          }
          
          // Handle glass differently - make it transparent but don't apply the texture
          else if (nameLower.includes('glass') || nameLower.includes('visor')) {
            console.log("Setting up glass properties for:", child.name);
            
            const oldMaterial = child.material;
            const newMaterial = new THREE.MeshStandardMaterial({
              color: 0x8888ff,
              transparent: true,
              opacity: 0.3,
              emissive: new THREE.Color(0x3333ff),
              emissiveIntensity: 0.2
            });
            
            child.material = newMaterial;
            oldMaterial.dispose();
          }
        }
      });
    }, [scene, texture]);
    
    return <primitive 
      ref={modelRef} 
      object={scene} 
      scale={1.4} 
      rotation={[0, -Math.PI*0.5, 0]} // Rotate -90 degrees around Y axis
    />;
  }
  
  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#2a3644', borderRadius: '8px' }}>
      <Canvas camera={{ position: [0, 0, 6], fov: 40 }}>
        {/* Simple lighting setup */}
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        
        {/* Background */}
        <color attach="background" args={['#2a3644']} />
        
        {/* Center the model */}
        <Center>
          <AstronautModel />
        </Center>
        
        {/* Controls */}
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          autoRotateSpeed={2}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}

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
  
  // Debug logging
  console.log('AstronautCustomizerModal: Rendering with isOpen:', isOpen);
  console.log('Current active texture URL:', activeTextureUrl);
  
  // Model options - just one for now
  const astronautModels = [
    { id: 'astronaut1', name: 'Classic Astronaut', path: '/astronaut.glb' },
    // Temporarily comment out models that don't exist yet
    // { id: 'astronaut2', name: 'Space Explorer', path: '/astronaut_explorer.glb' },
    // { id: 'astronaut3', name: 'Cosmic Voyager', path: '/astronaut_voyager.glb' }
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
        
        // Update states
        setCustomImageUrl(result);
        setActiveTextureUrl(result);
      };
      
      reader.readAsDataURL(file);
    }
  };
  
  // Save customization and close modal
  const handleSave = () => {
    const astronautModel = astronautModels.find(model => model.id === selectedModel);
    console.log("Saving customized astronaut with", customImageUrl ? "custom image" : "default image");
    onSave({
      modelPath: astronautModel.path,
      customImage: customImageUrl || defaultProfileImage
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
        zIndex: 9999
      }}
    >
      <div 
        style={{
          backgroundColor: '#1f2937', 
          border: '2px solid #3b82f6',
          boxShadow: '0 0 20px rgba(59, 130, 246, 0.7)',
          padding: '1.5rem',
          borderRadius: '0.5rem',
          maxWidth: '400px',
          width: '90%'
        }}
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
        <div style={{ height: '28rem', marginBottom: '1rem' }}>
          <SimpleAstronautViewer 
            key={activeTextureUrl}
            modelPath={astronautModels.find(model => model.id === selectedModel)?.path || '/astronaut.glb'} 
            textureUrl={activeTextureUrl}
          />
        </div>
        
        {/* Image selection */}
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              textAlign: 'center',
              fontWeight: '500',
              marginBottom: '1rem'
            }}
          >
            Select Image
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageChange} 
              style={{ display: 'none' }}
            />
          </label>
          
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
// 