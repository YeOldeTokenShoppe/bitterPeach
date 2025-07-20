import React, { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { OrbitControls, useGLTF, PerspectiveCamera as DreiCamera, useVideoTexture } from '@react-three/drei';
import { SheetProvider, editable as e, PerspectiveCamera } from '@theatre/r3f';
import { getProject } from '@theatre/core';
import * as THREE from 'three';
import { useRouter } from 'next/router';
import { useMusic } from '../contexts/MusicContext';
import CoinLoader from './CoinLoader';
import dynamic from 'next/dynamic';

// Dynamically import the Mobile Music Player component
const MobileMusicPlayer = dynamic(() => import('./MobileMusicPlayer'), {
  ssr: false,
});

// Theatre.js project
const project = getProject('PalmTreeDrive', {
  state: {
    // Add a basic state configuration to prevent the warning
    // This can be expanded with actual animation data later
    sheets: {
      CameraFlyIn: {
        objects: {
          Camera: {
            valuesByPropPath: {
              position: { x: 15.66, y: 11.19, z: 44.76 },
              rotation: { x: 0, y: 0, z: 0 },
              fov: 75
            }
          },
          Ground: {
            valuesByPropPath: {
              position: { x: 0, y: 0, z: 0 },
              rotation: { x: -Math.PI * 0.5, y: 0, z: 0 }
            }
          }
        }
      }
    }
  }
});
const sheet = project.sheet('CameraFlyIn');

// Shader code
const noiseShader = `
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }

  vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
  }

  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 =   v - i + dot(i, C.xxx) ;

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                  dot(p2,x2), dot(p3,x3) ) );
  }
`;

// Ground plane component
function GroundPlane() {
  const meshRef = useRef();
  const materialRef = useRef();
  
  const shaderMaterial = useMemo(() => ({
    uniforms: {
      time: { value: 0 },
      fogColor: { value: new THREE.Color(0xff7f50) },
      fogNear: { value: 35 },
      fogFar: { value: 60 }
    },
    vertexShader: `
      uniform float time;
      varying vec3 vPos;
      varying vec2 vUv;
      ${noiseShader}
      
      void main() {
        vUv = uv;
        vec3 transformed = position;
        
        vec2 tuv = uv;
        float t = time * 0.01 * 10.;
        tuv.y += t;
        transformed.y = snoise(vec3(tuv * 5., 0.)) * 5.;
        transformed.y *= smoothstep(5., 15., abs(transformed.x));
        vPos = transformed;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vPos;
      varying vec2 vUv;
      
      float line(vec3 position, float width, vec3 step) {
        vec3 tempCoord = position / step;
        vec2 coord = tempCoord.xz;
        coord.y -= time * 10. / 2.;
        vec2 grid = abs(fract(coord - 0.5) - 0.5) / (fwidth(coord) * width);
        float line = min(grid.x, grid.y);
        return min(line, 1.0);
      }
      
      float dashLine(vec3 position) {
        float centerDist = abs(position.x);
        float lineWidth = 0.2;
        float dashLength = 3.0;
        float dashGap = 2.0;
        
        float animatedZ = position.z - time * 10. / 2.;
        float dashPattern = step(0.5, fract(animatedZ / (dashLength + dashGap)));
        
        float lineMask = 1.0 - smoothstep(0.0, lineWidth, centerDist);
        
        return lineMask * dashPattern;
      }
      
      void main() {
        float l = line(vPos, 1.0, vec3(2.0));
        vec3 base = mix(vec3(0.0, 0.75, 1.0), vec3(0.0), smoothstep(5., 7.5, abs(vPos.x)));
        vec3 baseColor = vec3(1.0, 0.0, 0.933);
        vec3 roadColor = mix(baseColor, base, l);
        
        float centerLine = dashLine(vPos);
        vec3 lineColor = vec3(1.0, 1.0, 1.0);
        vec3 c = mix(roadColor, lineColor, centerLine * 0.8);
        
        float depth = gl_FragCoord.z / gl_FragCoord.w;
        float fogFactor = smoothstep(fogNear, fogFar, depth);
        c = mix(c, fogColor, fogFactor);
        
        gl_FragColor = vec4(c, 1.0);
      }
    `,
    fog: true
  }), []);
  
  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value += delta;
    }
  });
  
  return (
    <e.mesh ref={meshRef} theatreKey="Ground" rotation={[-Math.PI * 0.5, 0, 0]}>
      <planeGeometry args={[100, 100, 200, 200]} />
      <shaderMaterial ref={materialRef} {...shaderMaterial} />
    </e.mesh>
  );
}

// Car model component
function CarModel() {
  const { nodes, materials, animations } = useGLTF('/lambo5k.glb');
  const group = useRef();
  const mixer = useRef();
  const videoTexture = useVideoTexture('/mario.mp4');
  
  // Set up animations
  useEffect(() => {
    if (animations && animations.length > 0 && group.current) {
      mixer.current = new THREE.AnimationMixer(group.current);
      
      animations.forEach((clip) => {
        const action = mixer.current.clipAction(clip);
        if (clip.name.toLowerCase().includes('wheel')) {
          action.timeScale = -3.0;
          action.play();
        } else if (clip.name.toLowerCase().includes('halo')) {
          action.loop = THREE.LoopRepeat;
          action.play();
        }
      });
    }
  }, [animations]);
  
  useFrame((state, delta) => {
    if (mixer.current) {
      mixer.current.update(delta);
    }
  });
  
  return (
    <e.group ref={group} theatreKey="Car" position={[0, 0, 7]} scale={0.01}>
      <primitive object={nodes.Scene || nodes.scene} />
      {/* Apply video texture to display */}
      {nodes.Display && (
        <mesh geometry={nodes.Display.geometry} position={nodes.Display.position}>
          <meshBasicMaterial map={videoTexture} emissive="white" emissiveIntensity={1} />
        </mesh>
      )}
    </e.group>
  );
}

// Palm trees component
function PalmTrees() {
  const { nodes } = useGLTF('/palm2.glb');
  const treePositions = [
    [-9, 0, 10],
    [9, 0, 10],
    [-9, 0, -10],
    [9, 0, -10],
    [-15, 0, 20],
    [15, 0, 20],
  ];
  
  return (
    <>
      {treePositions.map((pos, i) => (
        <e.group key={i} theatreKey={`PalmTree${i}`} position={pos} scale={3}>
          <primitive object={nodes.Scene?.clone() || nodes.scene?.clone()} />
        </e.group>
      ))}
    </>
  );
}

// Scene content component
function Scene({ cinematicProgress, setIsCinematicComplete }) {
  const { camera, scene } = useThree();
  const controlsRef = useRef();
  
  // Set up camera animation on cinematic complete
  useEffect(() => {
    // Don't create a new Camera object - it's already created by PerspectiveCamera component
    // Just handle the animation complete logic
    const checkAnimationComplete = () => {
      if (cinematicProgress >= 1) {
        setIsCinematicComplete(true);
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
        }
      }
    };
    
    checkAnimationComplete();
  }, [cinematicProgress, setIsCinematicComplete]);
  
  return (
    <>
      {/* Lights */}
      <e.ambientLight theatreKey="AmbientLight" intensity={0.6} color={0xffa07a} />
      <e.directionalLight 
        theatreKey="SunLight"
        position={[0, 5, -50]}
        intensity={1.2}
        color={0xff6b35}
        castShadow
      />
      <e.directionalLight
        theatreKey="FillLight"
        position={[20, 10, 20]}
        intensity={0.5}
        color={0x9370db}
      />
      <e.hemisphereLight
        theatreKey="HemiLight"
        skyColor={0xff7f50}
        groundColor={0x4b0082}
        intensity={0.6}
      />
      
      {/* OrbitControls */}
      <OrbitControls
        ref={controlsRef}
        enabled={false}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI * 0.5}
        minDistance={0.1}
        maxDistance={50}
      />
      
      {/* Scene objects */}
      <GroundPlane />
      <Suspense fallback={null}>
        <CarModel />
        <PalmTrees />
      </Suspense>
    </>
  );
}

// Main component
const PalmTreeDriveR3F = () => {
  const [isSceneLoading, setIsSceneLoading] = useState(true);
  const [cinematicProgress, setCinematicProgress] = useState(0);
  const [isCinematicComplete, setIsCinematicComplete] = useState(false);
  const [showMobileMusicPlayer, setShowMobileMusicPlayer] = useState(false);
  const { showSpotify: contextShowSpotify, setShowSpotify: setContextShowSpotify } = useMusic();
  const router = useRouter();
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'black' }}>
      {/* Loading screen */}
      {isSceneLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'black',
          zIndex: 1000
        }}>
          <CoinLoader size="large" showText={false} withSparkle={true} />
        </div>
      )}
      
      {/* R3F Canvas */}
      <Canvas
        shadows
        onCreated={() => setIsSceneLoading(false)}
        style={{ 
          opacity: isSceneLoading ? 0 : 1,
          transition: 'opacity 0.5s ease-in-out'
        }}
      >
        <SheetProvider sheet={sheet}>
          <PerspectiveCamera
            theatreKey="Camera"
            makeDefault
            position={[15.66, 11.19, 44.76]}
            fov={75}
          />
          <e.fog theatreKey="Fog" attach="fog" args={[0xff7f50, 35, 60]} />
          <Scene 
            cinematicProgress={cinematicProgress}
            setIsCinematicComplete={setIsCinematicComplete}
          />
        </SheetProvider>
      </Canvas>
      
      {/* Mobile Music Player */}
      {showMobileMusicPlayer && (
        <MobileMusicPlayer
          onClose={() => setShowMobileMusicPlayer(false)}
        />
      )}
    </div>
  );
};

// Preload models
useGLTF.preload('/lambo5k.glb');
useGLTF.preload('/palm2.glb');

export default PalmTreeDriveR3F;