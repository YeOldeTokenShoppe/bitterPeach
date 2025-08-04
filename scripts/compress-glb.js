const gltfPipeline = require('gltf-pipeline');
const fs = require('fs');
const path = require('path');

const processGltf = gltfPipeline.processGlb;

async function compressGLB(inputPath, outputPath) {
  try {
    console.log(`Compressing ${inputPath}...`);
    
    const glb = fs.readFileSync(inputPath);
    
    const results = await processGltf(glb, {
      dracoOptions: {
        compressionLevel: 10, // Max compression (0-10)
        quantizePositionBits: 14,
        quantizeNormalBits: 10,
        quantizeTexcoordBits: 12,
        quantizeColorBits: 8,
        quantizeSkinBits: 12
      }
    });
    
    fs.writeFileSync(outputPath, results.glb);
    
    // Calculate compression ratio
    const originalSize = fs.statSync(inputPath).size;
    const compressedSize = fs.statSync(outputPath).size;
    const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    console.log(`✅ Compression complete!`);
    console.log(`   Original size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Compressed size: ${(compressedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Compression ratio: ${ratio}%`);
    
  } catch (error) {
    console.error('Error compressing GLB:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  // Default: compress cathedral.glb
  const inputPath = path.join(__dirname, '../public/cathedral.glb');
  const outputPath = path.join(__dirname, '../public/cathedral-draco.glb');
  compressGLB(inputPath, outputPath);
} else if (args.length === 2) {
  // Custom input/output paths
  compressGLB(args[0], args[1]);
} else {
  console.log('Usage: node compress-glb.js [input.glb output.glb]');
  console.log('       or just: node compress-glb.js (for cathedral.glb)');
  process.exit(1);
}