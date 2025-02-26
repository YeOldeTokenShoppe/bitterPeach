// Web Worker for processing 3D model data
self.onmessage = function (event) {
  const { operation, data } = event.data;

  let result;

  switch (operation) {
    case "simplifyGeometry":
      result = simplifyGeometry(data);
      break;
    case "processVertices":
      result = processVertices(data);
      break;
    case "calculateLighting":
      result = calculateLighting(data);
      break;
    default:
      result = { error: "Unknown operation" };
  }

  self.postMessage({ operation, result });
};

// Simplify geometry by reducing vertex count
function simplifyGeometry(data) {
  const { vertices, faces, targetReduction } = data;

  // This is a simplified example - in a real implementation,
  // you would use a proper decimation algorithm
  const reducedVertices = [];
  const reducedFaces = [];

  // Skip vertices based on reduction factor
  for (let i = 0; i < vertices.length; i += 3) {
    if (Math.random() > targetReduction) {
      reducedVertices.push(vertices[i], vertices[i + 1], vertices[i + 2]);
    }
  }

  // Recalculate faces (simplified)
  // In a real implementation, you'd need to properly remap indices

  return {
    vertices: reducedVertices,
    faces: reducedFaces,
  };
}

// Process vertices (e.g., for animations, deformations)
function processVertices(data) {
  const { vertices, transformations } = data;
  const result = new Float32Array(vertices.length);

  // Apply transformations to vertices
  // This is computationally intensive and perfect for a worker
  for (let i = 0; i < vertices.length; i += 3) {
    // Apply matrix transformations, deformations, etc.
    result[i] = vertices[i] * transformations.scale;
    result[i + 1] = vertices[i + 1] * transformations.scale;
    result[i + 2] = vertices[i + 2] * transformations.scale;
  }

  return result;
}

// Calculate lighting information
function calculateLighting(data) {
  const { vertices, normals, lights } = data;
  const lightingData = new Float32Array((vertices.length / 3) * 4); // RGBA

  // Calculate lighting for each vertex
  for (let i = 0, j = 0; i < vertices.length; i += 3, j += 4) {
    // Get vertex position and normal
    const vx = vertices[i];
    const vy = vertices[i + 1];
    const vz = vertices[i + 2];

    const nx = normals[i];
    const ny = normals[i + 1];
    const nz = normals[i + 2];

    // Calculate lighting (simplified)
    let r = 0,
      g = 0,
      b = 0,
      intensity = 0;

    // For each light source
    for (const light of lights) {
      // Calculate light direction
      const dx = light.position[0] - vx;
      const dy = light.position[1] - vy;
      const dz = light.position[2] - vz;

      // Normalize
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const lx = dx / len;
      const ly = dy / len;
      const lz = dz / len;

      // Dot product for diffuse lighting
      const dot = nx * lx + ny * ly + nz * lz;
      const factor = Math.max(0, dot);

      // Add light contribution
      r += light.color[0] * factor * light.intensity;
      g += light.color[1] * factor * light.intensity;
      b += light.color[2] * factor * light.intensity;
      intensity += factor * light.intensity;
    }

    // Store lighting data
    lightingData[j] = Math.min(1, r);
    lightingData[j + 1] = Math.min(1, g);
    lightingData[j + 2] = Math.min(1, b);
    lightingData[j + 3] = Math.min(1, intensity);
  }

  return lightingData;
}
