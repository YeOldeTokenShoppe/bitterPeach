import * as THREE from 'three';
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { ParametricGeometry } from 'three/examples/jsm/geometries/ParametricGeometry';
import { ParametricGeometries } from 'three/examples/jsm/geometries/ParametricGeometries';

// Cloth config
const DAMPING = 0.97;
const MASS = 0.07;
const GRAVITY = new THREE.Vector3(0, -981 * 1.4, 0).multiplyScalar(MASS);
const TIMESTEP_SQ = 0.018 * 0.018;
const SEGMENTS_X = 10; // More X for flag-like shape
const SEGMENTS_Y = 10;
const REST_DISTANCE = 25;
const WIDTH = REST_DISTANCE * SEGMENTS_X * 0.8; // 0.7 is an example, tweak as needed
const HEIGHT = REST_DISTANCE * SEGMENTS_Y * 0.8; // ~100, thinner like a real flag

class Particle {
  constructor(x, y) {
    this.position = new THREE.Vector3(x, y, 0);
    this.previous = this.position.clone();
    this.original = this.position.clone();
    this.acceleration = new THREE.Vector3();
    this.invMass = 1 / MASS;
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();
  }

  addForce(force) {
    this.acceleration.add(this.tmp2.copy(force).multiplyScalar(this.invMass));
  }

  integrate(timestepSq) {
    const newPos = this.tmp.subVectors(this.position, this.previous);
    newPos.multiplyScalar(DAMPING)
      .add(this.position)
      .add(this.acceleration.multiplyScalar(timestepSq));
    this.previous.copy(this.position);
    this.position.copy(newPos);
    this.acceleration.set(0, 0, 0);
  }
}

// Pin only the left edge!
function getPinnedParticles(particles) {
  const pins = [];
  for (let y = 0; y <= SEGMENTS_Y; y++) {
    pins.push(particles[y * (SEGMENTS_X + 1)]); // left-most particles
  }
  return pins;
}

// Helper: Satisfy distance constraint
function satisfyConstraints(p1, p2, distance) {
  const diff = new THREE.Vector3().subVectors(p2.position, p1.position);
  const currentDist = diff.length();
  if (currentDist === 0) return;
  const correction = diff.multiplyScalar(1 - distance / currentDist).multiplyScalar(0.5);
  p1.position.add(correction);
  p2.position.sub(correction);
}

export default function Flag({
  textureURL = '/flagLogo.jpg',
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [0.003, 0.003, 0.003], // smaller for scene units
  
flagRef
}) {
  const texture = useLoader(THREE.TextureLoader, textureURL);
  
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  

  // Particles
  const particles = useMemo(() => {
    const p = [];
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) {
        // Map to flag's width/height for realism
        const xPos = (x / SEGMENTS_X) * WIDTH;
        const yPos = HEIGHT - (y / SEGMENTS_Y) * HEIGHT;
        p.push(new Particle(xPos, yPos));
      }
    }
    return p;
  }, []);

  // Constraints
  const constraints = useMemo(() => {
    const c = [];
    const index = (x, y) => x + y * (SEGMENTS_X + 1);
    for (let y = 0; y < SEGMENTS_Y; y++) {
      for (let x = 0; x < SEGMENTS_X; x++) {
        c.push([particles[index(x, y)], particles[index(x, y + 1)], REST_DISTANCE]);
        c.push([particles[index(x, y)], particles[index(x + 1, y)], REST_DISTANCE]);
      }
    }
    // vertical constraints along right and horizontal constraints along bottom
    for (let x = 0; x < SEGMENTS_X; x++) {
      c.push([particles[index(x, SEGMENTS_Y)], particles[index(x + 1, SEGMENTS_Y)], REST_DISTANCE]);
    }
    for (let y = 0; y < SEGMENTS_Y; y++) {
      c.push([particles[index(SEGMENTS_X, y)], particles[index(SEGMENTS_X, y + 1)], REST_DISTANCE]);
    }
    return c;
  }, [particles]);

  const pinnedParticles = useMemo(() => getPinnedParticles(particles), [particles]);

  // Geometry
  const clothGeom = useMemo(() => {
    // Use plane geometry and parametric for correct UVs and structure
    return new ParametricGeometry(
      ParametricGeometries.plane(SEGMENTS_X, SEGMENTS_Y),
      SEGMENTS_X,
      SEGMENTS_Y
    );
  }, []);

  // Center geometry, scale to match particles
  useEffect(() => {
    // Scale geometry to match particle dimensions
    const posAttr = clothGeom.attributes.position;
    for (let y = 0; y <= SEGMENTS_Y; y++) {
      for (let x = 0; x <= SEGMENTS_X; x++) {
        const idx = x + y * (SEGMENTS_X + 1);
        posAttr.setXYZ(idx, (x / SEGMENTS_X) * WIDTH, HEIGHT - (y / SEGMENTS_Y) * HEIGHT, 0);
      }
    }
    clothGeom.computeBoundingBox();
    clothGeom.center();
    posAttr.needsUpdate = true;
  }, [clothGeom]);

  // Animation
  useFrame(({ clock }) => {
    const posAttr = clothGeom.attributes.position;
    if (!posAttr) return;

    // WIND based on time, using normals like the original!
    const wind = new THREE.Vector3(200, 0, Math.sin(clock.elapsedTime) * 2).normalize().multiplyScalar(800);

    // Wind per vertex (optional: better, but a bit more expensive)
    for (let i = 0; i < posAttr.count; i++) {
      const n = new THREE.Vector3();
      if (clothGeom.attributes.normal) {
        n.fromBufferAttribute(clothGeom.attributes.normal, i);
      }
      const windForce = n.dot(wind) > 0 ? n.clone().multiplyScalar(n.dot(wind)) : new THREE.Vector3();
      particles[i].addForce(GRAVITY);
      particles[i].addForce(windForce);
      particles[i].integrate(TIMESTEP_SQ);
    }

    // Constraints
    constraints.forEach(([p1, p2, dist]) => satisfyConstraints(p1, p2, dist));

    // Pin the left edge
    pinnedParticles.forEach(p => {
      p.position.copy(p.original);
      p.previous.copy(p.original);
    });

    // Update geometry
    for (let i = 0; i < posAttr.count; i++) {
      const p = particles[i].position;
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
    posAttr.needsUpdate = true;
    clothGeom.computeVertexNormals();
  });

  // Optionally allow parentRef to attach to parent (e.g. moon)

  const meshRef = useRef();
  useEffect(() => {
    if (flagRef) flagRef.current = meshRef.current;
  }, [flagRef]);

  return (
<group ref={meshRef} position={[0, 0, 0]}>
  {/* Flag Cloth */}
  <mesh
    geometry={clothGeom}
    scale={scale}
    castShadow
    receiveShadow
  >
    <meshLambertMaterial map={texture} side={THREE.DoubleSide} />
  </mesh>

  {/* Flagpole */}
  <mesh
    position={[-0.01 * WIDTH * scale[0], -0.09 * HEIGHT * scale[1] * 8.8, 0]}
    castShadow
    receiveShadow
  >
    <cylinderGeometry args={[0.01, 0.01, HEIGHT * scale[2] * 3.5, 16]} />
    <meshStandardMaterial color="#ffffff" metalness={0.7} roughness={0.3} />
  </mesh>
</group>

    
    
  );
}


