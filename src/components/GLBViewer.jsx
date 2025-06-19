import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Stage, useAnimations } from '@react-three/drei';

function Model({ url }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (actions && Object.keys(actions).length > 0) {
      Object.values(actions).forEach(action => {
        action.play();
      });
    }
  }, [actions]);

  return <primitive ref={group} object={scene} />;
}

export default function GLBViewer({ modelUrl = '/earth.glb' }) {
  return (
    <div style={{ width: '100%', height: '100vh', background: '#000' }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <Stage
            intensity={1}
            environment="sunset"
            shadows={{ type: 'contact', opacity: 0.2, blur: 3 }}
            adjustCamera={1.5}
          >
            <Model url={modelUrl} />
          </Stage>
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}