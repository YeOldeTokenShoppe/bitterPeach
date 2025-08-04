import * as THREE from 'three';

// Device detection utilities
export const detectDevice = () => {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    // Return default values for SSR
    return {
      isMobile: false,
      isTablet: false,
      isLowEnd: false,
      deviceMemory: 8,
      cores: 4
    };
  }
  
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent);
  const isLowEnd = navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4;
  
  return {
    isMobile,
    isTablet,
    isLowEnd: isLowEnd || isMobile || isTablet,
    deviceMemory: navigator.deviceMemory || 4,
    cores: navigator.hardwareConcurrency || 4
  };
};

// Texture optimization settings based on device
export const getTextureSettings = (device) => {
  if (device.isLowEnd) {
    return {
      maxTextureSize: 512,  // Limit texture size
      anisotropy: 1,        // Disable anisotropic filtering
      generateMipmaps: false // Disable mipmaps to save memory
    };
  }
  
  return {
    maxTextureSize: 2048,
    anisotropy: 4,
    generateMipmaps: true
  };
};

// Optimize a texture for the current device
export const optimizeTexture = (texture, device = detectDevice()) => {
  const settings = getTextureSettings(device);
  
  // Resize texture if needed
  if (texture.image && (texture.image.width > settings.maxTextureSize || texture.image.height > settings.maxTextureSize)) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scale = Math.min(
      settings.maxTextureSize / texture.image.width,
      settings.maxTextureSize / texture.image.height
    );
    
    canvas.width = Math.floor(texture.image.width * scale);
    canvas.height = Math.floor(texture.image.height * scale);
    
    ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
    
    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.generateMipmaps = settings.generateMipmaps;
    newTexture.anisotropy = settings.anisotropy;
    
    // Copy other properties
    newTexture.wrapS = texture.wrapS;
    newTexture.wrapT = texture.wrapT;
    newTexture.repeat.copy(texture.repeat);
    
    // Dispose of original texture
    texture.dispose();
    
    return newTexture;
  }
  
  // Just apply settings to existing texture
  texture.generateMipmaps = settings.generateMipmaps;
  texture.anisotropy = settings.anisotropy;
  texture.needsUpdate = true;
  
  return texture;
};

// Optimize materials for performance
export const optimizeMaterial = (material, device = detectDevice()) => {
  if (device.isLowEnd) {
    // Convert complex materials to simpler ones
    if (material.type === 'MeshStandardMaterial' || material.type === 'MeshPhysicalMaterial') {
      const simpleMaterial = new THREE.MeshPhongMaterial({
        color: material.color,
        emissive: material.emissive,
        emissiveIntensity: material.emissiveIntensity * 0.5,
        transparent: material.transparent,
        opacity: material.opacity,
        side: material.side
      });
      
      // Copy map if exists and optimize it
      if (material.map) {
        simpleMaterial.map = optimizeTexture(material.map.clone(), device);
      }
      
      material.dispose();
      return simpleMaterial;
    }
  }
  
  return material;
};

// Scene optimization settings
export const getSceneSettings = (device = detectDevice()) => {
  // Default pixel ratio for SSR
  const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;
  
  if (device.isLowEnd) {
    return {
      shadowMapSize: 512,
      shadowsEnabled: false,
      antialias: false,
      pixelRatio: Math.min(pixelRatio, 1.5),
      maxLights: 3,
      fogEnabled: true,
      postProcessingEnabled: false
    };
  }
  
  return {
    shadowMapSize: 1024,
    shadowsEnabled: true,
    antialias: true,
    pixelRatio: pixelRatio,
    maxLights: 10,
    fogEnabled: true,
    postProcessingEnabled: true
  };
};

// Geometry optimization - reduce polygon count
export const optimizeGeometry = (geometry, device = detectDevice()) => {
  if (device.isLowEnd && geometry.attributes.position) {
    // Simple decimation - skip vertices
    const factor = 2; // Keep every 2nd vertex
    const positions = geometry.attributes.position.array;
    const newPositions = [];
    
    for (let i = 0; i < positions.length; i += 3 * factor) {
      newPositions.push(positions[i], positions[i + 1], positions[i + 2]);
    }
    
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    
    if (geometry.index) {
      // Update indices
      const indices = [];
      const originalIndices = geometry.index.array;
      
      for (let i = 0; i < originalIndices.length; i += 3 * factor) {
        if (i + 2 < originalIndices.length) {
          indices.push(
            Math.floor(originalIndices[i] / factor),
            Math.floor(originalIndices[i + 1] / factor),
            Math.floor(originalIndices[i + 2] / factor)
          );
        }
      }
      
      newGeometry.setIndex(indices);
    }
    
    // Copy other attributes if needed
    if (geometry.attributes.normal) {
      newGeometry.computeVertexNormals();
    }
    
    geometry.dispose();
    return newGeometry;
  }
  
  return geometry;
};

// Memory management utilities
export const disposeObject = (object) => {
  if (object.geometry) {
    object.geometry.dispose();
  }
  
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(material => disposeMaterial(material));
    } else {
      disposeMaterial(object.material);
    }
  }
  
  if (object.children) {
    object.children.forEach(child => disposeObject(child));
  }
};

const disposeMaterial = (material) => {
  if (material.map) material.map.dispose();
  if (material.normalMap) material.normalMap.dispose();
  if (material.roughnessMap) material.roughnessMap.dispose();
  if (material.metalnessMap) material.metalnessMap.dispose();
  if (material.emissiveMap) material.emissiveMap.dispose();
  material.dispose();
};

// Resource pooling for textures
class TexturePool {
  constructor(maxSize = 20) {
    this.pool = new Map();
    this.maxSize = maxSize;
  }
  
  get(url, loader, onLoad) {
    if (this.pool.has(url)) {
      const texture = this.pool.get(url);
      if (onLoad) onLoad(texture);
      return texture;
    }
    
    // If pool is full, remove oldest entry
    if (this.pool.size >= this.maxSize) {
      const firstKey = this.pool.keys().next().value;
      const oldTexture = this.pool.get(firstKey);
      oldTexture.dispose();
      this.pool.delete(firstKey);
    }
    
    // Load new texture
    loader.load(
      url, 
      (texture) => {
        this.pool.set(url, texture);
        if (onLoad) onLoad(texture);
      },
      // Progress callback
      undefined,
      // Error callback
      (error) => {
        console.error(`Failed to load texture from ${url}:`, error);
      }
    );
  }
  
  clear() {
    this.pool.forEach(texture => texture.dispose());
    this.pool.clear();
  }
}

export const texturePool = new TexturePool();