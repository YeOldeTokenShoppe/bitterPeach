# Cyber Particle Effect Integration Guide

## Quick Start

### 1. Copy Required Files
Copy these files to your project:
- `CyberParticleEffect.js` - The main effect class
- Install required Three.js addons: `npm install three`

### 2. Basic Integration

```javascript
import * as THREE from 'three';
import { CyberParticleEffect } from './CyberParticleEffect.js';
import { GPUComputationRenderer } from 'three/addons/misc/GPUComputationRenderer.js';

// Your existing model/geometry
const geometry = yourModel.geometry;

// Create the effect
const cyberEffect = new CyberParticleEffect(geometry, renderer);

// Add to scene
scene.add(cyberEffect.points);

// In your render loop
function animate() {
    cyberEffect.update();
    // ... rest of your render code
}
```

### 3. Add Bloom (Optional but Recommended)

```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.0,  // strength
    0.4,  // radius
    0.85  // threshold
);
composer.addPass(bloomPass);

// In render loop, replace renderer.render() with:
composer.render();
```

### 4. Configure Effects

```javascript
// Color modes
cyberEffect.parameters.colorMode = CyberParticleEffect.COLOR_MODES.CYAN_PURPLE;

// Enable binary digits (1s and 0s)
cyberEffect.parameters.digitMode = true;

// Adjust effects
cyberEffect.parameters.glitchIntensity = 0.5;
cyberEffect.parameters.chromaticAberration = 1.0;
cyberEffect.parameters.holographicIntensity = 0.5;

// Flow field settings
cyberEffect.flowField.influence = 1.0;
cyberEffect.flowField.strength = 10;
cyberEffect.flowField.frequency = 0.5;
```

### 5. Working with Existing Models

If you have an existing loaded model:

```javascript
// From GLTF
gltfLoader.load('model.glb', (gltf) => {
    const mesh = gltf.scene.children[0];
    const cyberEffect = new CyberParticleEffect(mesh.geometry, renderer);
    scene.add(cyberEffect.points);
});

// From existing mesh
const cyberEffect = new CyberParticleEffect(existingMesh.geometry, renderer);
scene.add(cyberEffect.points);
```

### 6. GUI Integration (Optional)

```javascript
import GUI from 'lil-gui';

const gui = new GUI();
const cyberFolder = gui.addFolder('Cyber Effects');

// Basic controls
cyberFolder.add(cyberEffect.parameters, 'size', 0.01, 0.5).name('Particle Size');
cyberFolder.add(cyberEffect.parameters, 'digitMode').name('Binary Mode');

// Color mode dropdown
cyberFolder.add(cyberEffect.parameters, 'colorMode', {
    'Rainbow': 0,
    'Cyan-Purple': 1,
    'Electric Blue': 2,
    'Hot Plasma': 3,
    'Matrix Green': 4
}).name('Color Mode');

// Effects
cyberFolder.add(cyberEffect.parameters, 'glitchIntensity', 0, 1);
cyberFolder.add(cyberEffect.parameters, 'holographicIntensity', 0, 1);
```

## Tips

1. **Performance**: The effect creates one particle per vertex, so use appropriately subdivided geometry
2. **Scaling**: The class auto-scales models to fit within 10 units
3. **Colors**: If your model has vertex colors, they'll be used; otherwise white is used
4. **Cleanup**: Call `cyberEffect.dispose()` when removing the effect

## Common Issues

- **Black particles**: Make sure your renderer clear color isn't pure black (`#000000`), try `#0a0a0a`
- **No movement**: Ensure you're calling `cyberEffect.update()` in your render loop
- **Performance**: Reduce vertex count or lower `gpgpu.size` in the constructor