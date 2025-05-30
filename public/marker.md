export const createMarkerFace = (index) => {
  const container = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.4),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
  );

  function createGradientTexture() {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;

    const ctx = canvas.getContext("2d");

    // Create gradient
    const gradient = ctx.createLinearGradient(
      0,
      0,
      canvas.width,
      canvas.height
    );
    gradient.addColorStop(0, "#584827");
    gradient.addColorStop(0.37, "#c7a03c");
    gradient.addColorStop(0.3, "#f9de90");
    gradient.addColorStop(0.33, "#c7a03c");
    gradient.addColorStop(0.4, "#584827");
    gradient.addColorStop(0.5, "#584827");
    gradient.addColorStop(0.77, "#c7a03c");
    gradient.addColorStop(0.8, "#f9de90");
    gradient.addColorStop(0.83, "#c7a03c");
    gradient.addColorStop(1, "#584827");

    // Apply gradient to canvas
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    return texture;
  }
  container.isMarker = true;
  container.markerIndex = index;
  container.scale.set(0.3, 0.3, 0.3);

  // Marker Circle
  const markerGeometry = new THREE.CircleGeometry(0.15, 32);
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
  });
  const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
  markerMesh.position.z = 0.001;
  markerMesh.renderOrder = 1;
  container.add(markerMesh);

  // Marker Border (with emissive glow)
  const borderGeometry = new THREE.RingGeometry(0.16, 0.2, 32);
  const borderMaterial = new THREE.MeshStandardMaterial({
    map: createGradientTexture(),

    emissive: 0xc7a03c,
    emissiveIntensity: 1,
    side: THREE.DoubleSide,
  });
  const borderMesh = new THREE.Mesh(borderGeometry, borderMaterial);
  borderMesh.position.z = 0;
  borderMesh.renderOrder = 0;
  container.add(borderMesh);

  // Number Texture
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  context.fillStyle = "white";
  context.font = "bold 40px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText((index + 1).toString(), 32, 32);

  const numberTexture = new THREE.CanvasTexture(canvas);
  const numberGeometry = new THREE.PlaneGeometry(0.2, 0.2);
  const numberMaterial = new THREE.MeshBasicMaterial({
    map: numberTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const numberMesh = new THREE.Mesh(numberGeometry, numberMaterial);
  numberMesh.position.z = 0.01;
  container.add(numberMesh);

  // Add pulsing and glowing effect
  let pulseTime = 0;
  container.onBeforeRender = () => {
    pulseTime += 0.05;
    const scale = 1 + Math.sin(pulseTime) * 0.15;
    borderMesh.scale.set(scale, scale, scale);
    borderMaterial.emissiveIntensity = 0.8 + Math.sin(pulseTime) * 0.2;
  };

  return container;
};