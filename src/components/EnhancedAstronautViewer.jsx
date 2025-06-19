import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Center, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Box, Button, Icon, Text, HStack, VStack } from '@chakra-ui/react';

// Enhanced Astronaut Model Component with proper texture handling
function AstronautModel({ modelPath, helmetTexture, suitTexture, textureOffset, textureScale }) {
  const { scene } = useGLTF(modelPath);
  const [materials, setMaterials] = useState({});
  
  // Create texture objects with proper settings
  const helmetTextureObj = useMemo(() => {
    if (!helmetTexture) return null;
    
    const texture = new THREE.TextureLoader().load(helmetTexture);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(textureScale, textureScale);
    texture.offset.set(textureOffset.x, textureOffset.y);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    
    return texture;
  }, [helmetTexture, textureScale, textureOffset.x, textureOffset.y]);
  
  const suitTextureObj = useMemo(() => {
    if (!suitTexture) return null;
    
    const texture = new THREE.TextureLoader().load(suitTexture);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(textureScale, textureScale);
    texture.offset.set(textureOffset.x, textureOffset.y);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    
    return texture;
  }, [suitTexture, textureScale, textureOffset.x, textureOffset.y]);
  
  // Clone and process the scene
  const processedScene = useMemo(() => {
    const clonedScene = scene.clone(true);
    const newMaterials = {};
    
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        const nameLower = child.name.toLowerCase();
        
        // Skip glass/transparent parts
        if (nameLower.includes('glass') || nameLower.includes('visor')) {
          // Ensure glass transparency
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.3;
          child.material.depthWrite = false;
          child.material.side = THREE.FrontSide;
          child.renderOrder = 2; // Render after opaque objects
          return;
        }
        
        // Store original material if not already stored
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material.clone();
        }
        
        // Create new material to avoid conflicts
        const newMaterial = new THREE.MeshStandardMaterial({
          color: new THREE.Color(1, 1, 1),
          metalness: 0.1,
          roughness: 0.6,
          envMapIntensity: 0.5,
          side: THREE.FrontSide, // Use FrontSide to avoid z-fighting
          depthWrite: true,
          depthTest: true,
        });
        
        // Apply helmet texture
        if (nameLower.includes('helmet') && helmetTextureObj) {
          newMaterial.map = helmetTextureObj;
          newMaterial.needsUpdate = true;
          child.material = newMaterial;
          child.renderOrder = 1; // Render after base but before glass
          newMaterials[child.uuid] = newMaterial;
        }
        // Apply suit texture
        else if ((nameLower.includes('suit') || 
                  nameLower.includes('body') || 
                  nameLower.includes('astronaut') || 
                  nameLower.includes('torso') ||
                  nameLower.includes('arm') ||
                  nameLower.includes('leg') ||
                  (!nameLower.includes('glass') && 
                   !nameLower.includes('helmet') && 
                   !nameLower.includes('visor'))) && suitTextureObj) {
          newMaterial.map = suitTextureObj;
          newMaterial.needsUpdate = true;
          child.material = newMaterial;
          child.renderOrder = 0; // Render first
          newMaterials[child.uuid] = newMaterial;
        }
        // Use original material if no texture
        else if (!helmetTextureObj && !suitTextureObj && child.userData.originalMaterial) {
          child.material = child.userData.originalMaterial.clone();
          child.renderOrder = 0;
        }
        
        // Enable shadows
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    setMaterials(newMaterials);
    return clonedScene;
  }, [scene, helmetTextureObj, suitTextureObj]);
  
  // Update textures when offset/scale changes
  useEffect(() => {
    if (helmetTextureObj) {
      helmetTextureObj.repeat.set(textureScale, textureScale);
      helmetTextureObj.offset.set(textureOffset.x, textureOffset.y);
      helmetTextureObj.needsUpdate = true;
    }
    if (suitTextureObj) {
      suitTextureObj.repeat.set(textureScale, textureScale);
      suitTextureObj.offset.set(textureOffset.x, textureOffset.y);
      suitTextureObj.needsUpdate = true;
    }
    
    // Update materials
    Object.values(materials).forEach(material => {
      if (material) {
        material.needsUpdate = true;
      }
    });
  }, [textureOffset, textureScale, helmetTextureObj, suitTextureObj, materials]);
  
  return (
    <primitive 
      object={processedScene} 
      scale={1.2} 
      rotation={[0, -Math.PI / 2, 0]} 
      position={[0, 0, 0]}
    />
  );
}

// Enhanced Astronaut Viewer Modal Component
export default function EnhancedAstronautViewer({
  isOpen,
  onClose,
  modelPath,
  helmetTexture,
  suitTexture,
  textureOffset,
  textureScale,
  position = 'center', // 'center' or 'left'
  // New props for customization controls
  onModelChange,
  onHelmetTextureChange,
  onSuitTextureChange,
  onTextureOffsetChange,
  onTextureScaleChange,
  onImageUpload,
  onReset,
  onSave,
  selectedModel,
  astronautModels,
  textureOptions,
  currentTextureIndex,
  onTextureIndexChange,
  user
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [showTextureGrid, setShowTextureGrid] = useState(false);
  const [showCustomizerControls, setShowCustomizerControls] = useState(false);
  
  if (!isOpen) return null;
  
  const modalStyles = position === 'left' ? {
    position: 'fixed',
    top: '50%',
    left: '20px',
    transform: 'translateY(-50%)',
    width: '900px',
    height: '700px',
  } : {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '900px',
    height: '700px',
  };
  
  return (
    <>
      {/* Backdrop */}
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg="rgba(0, 0, 0, 0.7)"
        backdropFilter="blur(5px)"
        zIndex="9998"
        onClick={onClose}
      />
      
      {/* Modal */}
      <Box
        {...modalStyles}
        bg="linear-gradient(135deg, rgba(30,27,75,0.95), rgba(49,46,129,0.9))"
        borderRadius="xl"
        border="2px solid rgba(99,102,241,0.5)"
        boxShadow="0 0 40px rgba(99,102,241,0.4), inset 0 0 20px rgba(0,0,0,0.5)"
        zIndex="9999"
        overflow="hidden"
        display="flex"
        flexDirection="column"
      >
        {/* Header */}
        <Box
          height="60px"
          bg="linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))"
          borderBottom="2px solid rgba(99,102,241,0.5)"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          px={6}
        >
          <Text
            fontSize="lg"
            fontWeight="bold"
            color="#e0e7ff"
            fontFamily="monospace"
            letterSpacing="wider"
            textShadow="0 0 10px rgba(99,102,241,0.6)"
          >
            ASTRONAUT CUSTOMIZER//3D PREVIEW
          </Text>
          
          <Button
            onClick={onClose}
            size="sm"
            variant="ghost"
            color="#e0e7ff"
            _hover={{
              bg: "rgba(239,68,68,0.3)",
              color: "#f87171"
            }}
            borderRadius="full"
          >
            <Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" w="20px" h="20px">
              <path d="M18 6L6 18M6 6l12 12"/>
            </Icon>
          </Button>
        </Box>
        
        {/* Main Content Area */}
        <Box flex="1" display="flex" overflow="hidden">
          {/* 3D Viewer - Left Side */}
          <Box width="60%" position="relative" bg="rgba(0,0,0,0.3)">
            <Canvas 
              camera={{ position: [0, 0, 5], fov: 45 }}
              shadows
              dpr={[1, 2]}
              gl={{
                antialias: true,
                toneMapping: THREE.ACESFilmicToneMapping,
                toneMappingExposure: 1.0,
                outputColorSpace: THREE.SRGBColorSpace,
              }}
              onCreated={() => setIsLoading(false)}
            >
              <ambientLight intensity={1.2} />
              <directionalLight 
                position={[5, 5, 5]} 
                intensity={1} 
                castShadow
                shadow-mapSize={[2048, 2048]}
              />
              <directionalLight 
                position={[-3, 3, -3]} 
                intensity={0.5} 
              />
              <color attach="background" args={['#1e1b4b']} />
              
              <Center>
                <AstronautModel
                  modelPath={modelPath}
                  helmetTexture={helmetTexture}
                  suitTexture={suitTexture}
                  textureOffset={textureOffset}
                  textureScale={textureScale}
                />
              </Center>
              
              <Environment preset="city" background={false} />
              
              <OrbitControls 
                enableZoom={true}
                enablePan={false}
                autoRotate={true}
                autoRotateSpeed={0.5}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 2}
                minDistance={3}
                maxDistance={8}
                zoomSpeed={0.5}
              />
            </Canvas>
            
            {/* Loading indicator */}
            {isLoading && (
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                color="#e0e7ff"
                fontSize="sm"
                fontFamily="monospace"
              >
                LOADING MODEL...
              </Box>
            )}
            
            {/* Corner decorations */}
            <Box position="absolute" top="8px" left="8px" width="12px" height="12px" bg="#6366f1" opacity={0.8} />
            <Box position="absolute" top="8px" right="8px" width="12px" height="12px" bg="#8b5cf6" opacity={0.8} />
            <Box position="absolute" bottom="8px" left="8px" width="12px" height="12px" bg="#a78bfa" opacity={0.8} />
            <Box position="absolute" bottom="8px" right="8px" width="12px" height="12px" bg="#6366f1" opacity={0.8} />
            
            {/* Model Selector at bottom of viewer */}
            <Box 
              position="absolute" 
              bottom="16px" 
              left="50%" 
              transform="translateX(-50%)"
              bg="rgba(30,27,75,0.9)"
              borderRadius="md"
              border="1px solid rgba(99,102,241,0.4)"
              p={2}
              backdropFilter="blur(5px)"
            >
              <HStack spacing={2}>
                <Button
                  size="xs"
                  onClick={() => {
                    const currentIndex = astronautModels.findIndex(m => m.id === selectedModel);
                    const prevIndex = (currentIndex - 1 + astronautModels.length) % astronautModels.length;
                    onModelChange(astronautModels[prevIndex].id);
                  }}
                  bg="rgba(99,102,241,0.3)"
                  _hover={{ bg: "rgba(99,102,241,0.5)" }}
                  color="#e0e7ff"
                  minW="28px"
                  h="24px"
                  fontSize="sm"
                >
                  ←
                </Button>
                <Text fontSize="xs" color="#e0e7ff" minW="140px" textAlign="center" py={1}>
                  {astronautModels.find(m => m.id === selectedModel)?.name || 'Model'}
                </Text>
                <Button
                  size="xs"
                  onClick={() => {
                    const currentIndex = astronautModels.findIndex(m => m.id === selectedModel);
                    const nextIndex = (currentIndex + 1) % astronautModels.length;
                    onModelChange(astronautModels[nextIndex].id);
                  }}
                  bg="rgba(99,102,241,0.3)"
                  _hover={{ bg: "rgba(99,102,241,0.5)" }}
                  color="#e0e7ff"
                  minW="28px"
                  h="24px"
                  fontSize="sm"
                >
                  →
                </Button>
              </HStack>
            </Box>
          </Box>
          
          {/* Customization Controls - Right Side */}
          <Box 
            width="40%" 
            bg="linear-gradient(135deg, rgba(49,46,129,0.3), rgba(30,27,75,0.5))"
            borderLeft="1px solid rgba(99,102,241,0.3)"
            display="flex"
            flexDirection="column"
            p={4}
            overflowY="auto"
            className="enhanced-viewer-controls"
          >
            {/* Controls Header */}
            <Text 
              fontSize="sm" 
              fontWeight="bold" 
              color="#a78bfa" 
              fontFamily="monospace"
              mb={2}
              letterSpacing="wider"
            >
              CUSTOMIZATION CONTROLS
            </Text>
            
            {/* Quick Guide */}
            <Box 
              mb={4} 
              p={2} 
              bg="rgba(99,102,241,0.1)" 
              borderRadius="sm" 
              border="1px solid rgba(99,102,241,0.2)"
            >
              <Text fontSize="xs" color="#e0e7ff" fontFamily="monospace">
                <Text as="span" color="#6366f1" fontWeight="bold">👤 Helmet</Text> = Your face on visor
              </Text>
              <Text fontSize="xs" color="#e0e7ff" fontFamily="monospace">
                <Text as="span" color="#8b5cf6" fontWeight="bold">🎨 Suit</Text> = Body texture pattern
              </Text>
            </Box>
            
            {/* HELMET/FACE CUSTOMIZATION SECTION */}
            <Box 
              mb={4} 
              p={3} 
              bg="rgba(49,46,129,0.2)" 
              borderRadius="md" 
              border="1px solid rgba(99,102,241,0.3)"
            >
              <HStack mb={2} spacing={2} align="center">
                <Text fontSize="sm" fontWeight="bold" color="#6366f1" fontFamily="monospace">
                  HELMET / FACE
                </Text>
                <Text fontSize="xs" color="#a78bfa">
                  (visor reflection)
                </Text>
              </HStack>
              
              <Button
                as="label"
                size="sm"
                bg="linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.3) 100%)"
                color="#e0e7ff"
                border="1px solid #6366f1"
                cursor="pointer"
                fontSize="sm"
                h="36px"
                w="100%"
                _hover={{
                  bg: "linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(139,92,246,0.5) 100%)"
                }}
                leftIcon={<Text fontSize="lg">👤</Text>}
                onClick={(e) => {
                  e.stopPropagation();
                  if (showTextureGrid) {
                    setShowTextureGrid(false);
                  }
                  setShowCustomizerControls(!showCustomizerControls);
                }}
              >
                UPLOAD FACE IMAGE
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onImageUpload(e)}
                  style={{ display: 'none' }}
                />
              </Button>
              
              {/* Helmet Status */}
              {helmetTexture && (
                <Box mt={2} p={2} bg="rgba(34,197,94,0.1)" borderRadius="sm" border="1px solid rgba(34,197,94,0.3)">
                  <Text fontSize="xs" color="#22c55e" fontFamily="monospace">
                    ✓ {helmetTexture.includes('data:') ? 'Custom Face Applied' : 'User Avatar Active'}
                  </Text>
                </Box>
              )}
            </Box>
            
            {/* SUIT CUSTOMIZATION SECTION */}
            <Box 
              mb={4} 
              p={3} 
              bg="rgba(139,92,246,0.15)" 
              borderRadius="md" 
              border="1px solid rgba(139,92,246,0.3)"
            >
              <HStack mb={2} spacing={2} align="center">
                <Text fontSize="sm" fontWeight="bold" color="#8b5cf6" fontFamily="monospace">
                  SUIT TEXTURE
                </Text>
                <Text fontSize="xs" color="#a78bfa">
                  (body pattern)
                </Text>
              </HStack>
              
              <Button
                size="sm"
                bg={showTextureGrid ? 
                    "linear-gradient(135deg, rgba(139,92,246,0.5) 0%, rgba(167,139,250,0.5) 100%)" :
                    "linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(167,139,250,0.3) 100%)"}
                color="#e0e7ff"
                border="1px solid #8b5cf6"
                fontSize="sm"
                h="36px"
                w="100%"
                _hover={{
                  bg: "linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(167,139,250,0.4) 100%)"
                }}
                leftIcon={<Text fontSize="lg">🎨</Text>}
                onClick={(e) => {
                  e.stopPropagation();
                  if (showCustomizerControls) {
                    setShowCustomizerControls(false);
                  }
                  setShowTextureGrid(!showTextureGrid);
                }}
              >
                {showTextureGrid ? 'HIDE SUIT OPTIONS' : 'CHOOSE SUIT DESIGN'}
              </Button>
              
              {/* Suit Status */}
              {suitTexture && !showTextureGrid && (
                <Box mt={2} p={2} bg="rgba(34,197,94,0.1)" borderRadius="sm" border="1px solid rgba(34,197,94,0.3)">
                  <Text fontSize="xs" color="#22c55e" fontFamily="monospace">
                    ✓ {textureOptions.find(t => t.path === suitTexture)?.name || 'Custom'} Active
                  </Text>
                </Box>
              )}
            </Box>
            
            {/* Texture Selection Carousel - Suit Only */}
            {showTextureGrid && (
              <Box
                mb={4}
                p={3}
                bg="rgba(139,92,246,0.1)"
                borderRadius="md"
                border="1px solid rgba(139,92,246,0.4)"
              >
                <VStack spacing={1} mb={2}>
                  <Text fontSize="xs" color="#8b5cf6" fontFamily="monospace" textAlign="center" fontWeight="bold">
                    SELECT SUIT DESIGN
                  </Text>
                  <Text fontSize="xs" color="#a78bfa" fontFamily="monospace" textAlign="center">
                    Browse patterns for astronaut body
                  </Text>
                </VStack>
                <HStack spacing={2} align="center">
                  <Button
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = currentTextureIndex === 0 
                        ? textureOptions.length - 1 
                        : currentTextureIndex - 1;
                      onTextureIndexChange(newIndex);
                      onSuitTextureChange(textureOptions[newIndex].path);
                    }}
                    bg="rgba(139,92,246,0.3)"
                    _hover={{ bg: "rgba(139,92,246,0.5)" }}
                    color="#e0e7ff"
                    minW="32px"
                    h="32px"
                    p={0}
                  >
                    ←
                  </Button>
                  
                  <VStack flex={1} spacing={1}>
                    <Text 
                      fontSize="sm" 
                      color="#e0e7ff" 
                      fontFamily="monospace"
                      textAlign="center"
                      fontWeight="bold"
                    >
                      {textureOptions[currentTextureIndex].name}
                    </Text>
                    <Text
                      fontSize="xs"
                      color="#a78bfa"
                      fontFamily="monospace"
                    >
                      Suit Pattern {currentTextureIndex + 1} / {textureOptions.length}
                    </Text>
                  </VStack>
                  
                  <Button
                    size="xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      const newIndex = (currentTextureIndex + 1) % textureOptions.length;
                      onTextureIndexChange(newIndex);
                      onSuitTextureChange(textureOptions[newIndex].path);
                    }}
                    bg="rgba(139,92,246,0.3)"
                    _hover={{ bg: "rgba(139,92,246,0.5)" }}
                    color="#e0e7ff"
                    minW="32px"
                    h="32px"
                    p={0}
                  >
                    →
                  </Button>
                </HStack>
                
                {/* Apply Button */}
                <Button
                  mt={2}
                  size="xs"
                  w="100%"
                  h="28px"
                  bg={suitTexture === textureOptions[currentTextureIndex].path ?
                      "rgba(34,197,94,0.3)" :
                      "rgba(139,92,246,0.3)"}
                  color={suitTexture === textureOptions[currentTextureIndex].path ?
                      "#22c55e" :
                      "#e0e7ff"}
                  border={suitTexture === textureOptions[currentTextureIndex].path ?
                      "1px solid #22c55e" :
                      "1px solid #8b5cf6"}
                  _hover={{
                    bg: suitTexture === textureOptions[currentTextureIndex].path ?
                        "rgba(34,197,94,0.4)" :
                        "rgba(139,92,246,0.4)"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSuitTextureChange(textureOptions[currentTextureIndex].path);
                  }}
                  isDisabled={suitTexture === textureOptions[currentTextureIndex].path}
                >
                  {suitTexture === textureOptions[currentTextureIndex].path ?
                    "✓ APPLIED TO SUIT" :
                    "APPLY TO SUIT"}
                </Button>
              </Box>
            )}
            
            {/* Texture Adjustment Controls */}
            {showCustomizerControls && (helmetTexture || suitTexture) && !showTextureGrid && (
              <Box
                mb={4}
                p={3}
                bg="rgba(30,27,75,0.8)"
                borderRadius="md"
                border="1px solid rgba(99,102,241,0.3)"
              >
                <Text fontSize="xs" color="#6366f1" fontFamily="monospace" mb={3} fontWeight="bold">
                  FACE IMAGE ADJUSTMENTS
                </Text>
                <VStack spacing={3}>
                
                {/* Scale Control */}
                <HStack spacing={3} w="100%">
                  <Text color="#a78bfa" fontSize="sm" minW="60px">Scale:</Text>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={textureScale}
                    onChange={(e) => onTextureScaleChange(parseFloat(e.target.value))}
                    style={{
                      flex: 1,
                      height: '6px',
                      background: '#4c1d95',
                      borderRadius: '3px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <Text color="#e0e7ff" fontSize="sm" minW="40px" textAlign="right">
                    {textureScale.toFixed(1)}
                  </Text>
                </HStack>
                
                {/* X Offset Control */}
                <HStack spacing={3} w="100%">
                  <Text color="#a78bfa" fontSize="sm" minW="60px">X Pos:</Text>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={textureOffset.x}
                    onChange={(e) => onTextureOffsetChange({ ...textureOffset, x: parseFloat(e.target.value) })}
                    style={{
                      flex: 1,
                      height: '6px',
                      background: '#4c1d95',
                      borderRadius: '3px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <Text color="#e0e7ff" fontSize="sm" minW="40px" textAlign="right">
                    {textureOffset.x.toFixed(2)}
                  </Text>
                </HStack>
                
                {/* Y Offset Control */}
                <HStack spacing={3} w="100%">
                  <Text color="#a78bfa" fontSize="sm" minW="60px">Y Pos:</Text>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    value={textureOffset.y}
                    onChange={(e) => onTextureOffsetChange({ ...textureOffset, y: parseFloat(e.target.value) })}
                    style={{
                      flex: 1,
                      height: '6px',
                      background: '#4c1d95',
                      borderRadius: '3px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  />
                  <Text color="#e0e7ff" fontSize="sm" minW="40px" textAlign="right">
                    {textureOffset.y.toFixed(2)}
                  </Text>
                </HStack>
                </VStack>
              </Box>
            )}
            
            {/* Current Status Overview */}
            <Box
              p={3}
              bg="linear-gradient(135deg, rgba(30,27,75,0.6), rgba(49,46,129,0.4))"
              borderRadius="md"
              border="1px solid rgba(99,102,241,0.3)"
              mb={4}
            >
              <Text fontSize="xs" color="#a78bfa" fontFamily="monospace" mb={3} fontWeight="bold">
                CURRENT CONFIGURATION
              </Text>
              
              {/* Helmet/Face Status */}
              <HStack spacing={2} mb={2} align="center">
                <Box w="8px" h="8px" bg={helmetTexture ? "#22c55e" : "#6366f1"} borderRadius="50%" />
                <Text fontSize="xs" color="#e0e7ff" fontFamily="monospace">
                  HELMET: {helmetTexture ? 
                    (helmetTexture.includes('data:') ? 'Custom Face' : 'User Avatar') : 
                    'Default'}
                </Text>
              </HStack>
              
              {/* Suit Status */}
              <HStack spacing={2} align="center">
                <Box w="8px" h="8px" bg={suitTexture ? "#22c55e" : "#8b5cf6"} borderRadius="50%" />
                <Text fontSize="xs" color="#e0e7ff" fontFamily="monospace">
                  SUIT: {suitTexture ? 
                    (textureOptions.find(t => t.path === suitTexture)?.name || 'Custom') : 
                    'Default'}
                </Text>
              </HStack>
              
              {/* Customization tip */}
              {!helmetTexture && !suitTexture && (
                <Text fontSize="xs" color="#a78bfa" fontFamily="monospace" mt={3} fontStyle="italic">
                  Tip: Customize both helmet and suit for a unique look!
                </Text>
              )}
            </Box>
            
            {/* Spacer to push buttons to bottom */}
            <Box flex="1" />
            
            {/* Action Buttons */}
            <VStack spacing={2} mt={4}>
              <HStack spacing={2} w="100%">
                <Button
                  size="sm"
                  bg="rgba(99,102,241,0.2)"
                  color="#e0e7ff"
                  border="1px solid #6366f1"
                  fontSize="sm"
                  h="36px"
                  flex={1}
                  _hover={{
                    bg: "rgba(99,102,241,0.3)"
                  }}
                  onClick={onReset}
                >
                  RESET
                </Button>
                <Button
                  size="sm"
                  bg="linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(34,197,94,0.5) 100%)"
                  color="#22c55e"
                  border="1px solid #22c55e"
                  fontSize="sm"
                  h="36px"
                  flex={2}
                  onClick={() => {
                    onSave();
                    setShowCustomizerControls(false);
                    setShowTextureGrid(false);
                  }}
                  _hover={{
                    bg: "linear-gradient(135deg, rgba(34,197,94,0.5) 0%, rgba(34,197,94,0.7) 100%)"
                  }}
                >
                  ✓ SAVE CUSTOMIZATION
                </Button>
              </HStack>
              
              <Text fontSize="xs" color="#a78bfa" fontFamily="monospace" textAlign="center">
                Changes preview in real-time
              </Text>
            </VStack>
          </Box>
        </Box>
      </Box>
      
      {/* Custom styles for range inputs */}
      <style jsx global>{`
        .enhanced-viewer-controls input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
        }
        
        .enhanced-viewer-controls input[type="range"]::-webkit-slider-track {
          background: #4c1d95;
          height: 6px;
          border-radius: 3px;
        }
        
        .enhanced-viewer-controls input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          background: #a78bfa;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          border: 1px solid #6366f1;
          box-shadow: 0 0 6px rgba(167,139,250,0.6);
          transition: all 0.2s;
        }
        
        .enhanced-viewer-controls input[type="range"]::-webkit-slider-thumb:hover {
          background: #c4b5fd;
          box-shadow: 0 0 10px rgba(196,181,253,0.8);
          transform: scale(1.2);
        }
        
        .enhanced-viewer-controls input[type="range"]::-moz-range-track {
          background: #4c1d95;
          height: 6px;
          border-radius: 3px;
        }
        
        .enhanced-viewer-controls input[type="range"]::-moz-range-thumb {
          background: #a78bfa;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          border: 1px solid #6366f1;
          box-shadow: 0 0 6px rgba(167,139,250,0.6);
          transition: all 0.2s;
        }
      `}</style>
    </>
  );
}

// Preload models
useGLTF.preload('/Astronaut2.glb');
useGLTF.preload('/astronaut.glb');