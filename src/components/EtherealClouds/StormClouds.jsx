import React, { useRef, useState, useEffect } from "react";
import { Cloud } from "@react-three/drei";
import * as THREE from 'three';
import { useFrame } from "@react-three/fiber";
import dynamic from "next/dynamic";

const StormCloudsComponent = React.forwardRef((props, ref) => {
  const [cloudTexture, setCloudTexture] = useState(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load("/assets/textures/cloud.png", (texture) => {
      setCloudTexture(texture);
    });
  }, []);

  const cloudsGroupRef = useRef();
  const cloud0 = useRef();
  const cloud1 = useRef();
  const cloud2 = useRef();
  const cloud3 = useRef();
  const cloud4 = useRef();
  const cloud5 = useRef();
  const cloud6 = useRef();
  const cloud7 = useRef();

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    if (cloudsGroupRef.current) {
      cloudsGroupRef.current.rotation.y = Math.cos(time / 6) / 30;
      cloudsGroupRef.current.rotation.x = Math.sin(time / 6) / 40;
    }

    if (cloud0.current) cloud0.current.rotation.y -= delta * 0.02;
    if (cloud1.current) cloud1.current.rotation.y += delta * 0.015;
    if (cloud2.current) cloud2.current.rotation.y -= delta * 0.018;
    if (cloud3.current) cloud3.current.rotation.y += delta * 0.012;
    if (cloud4.current) cloud4.current.rotation.y -= delta * 0.016;
    if (cloud5.current) cloud5.current.rotation.y += delta * 0.014;
    if (cloud6.current) cloud6.current.rotation.y -= delta * 0.013;
    if (cloud7.current) cloud7.current.rotation.y += delta * 0.011;
  });

  React.useImperativeHandle(ref, () => ({
    cloudsGroupRef: cloudsGroupRef
  }), []);

  return (
    <group>
      <hemisphereLight
        skyColor="#2a3a4a"
        groundColor="#1a2a3a"
        intensity={2}
        position={[0, 0, -3]}
      />
      
      <group ref={cloudsGroupRef}>
        <Cloud 
          ref={cloud0}
          seed={1}
          segments={15}
          volume={55}
          opacity={0.95}
          fade={25}
          growth={10}
          speed={0.08}
          bounds={[25, 10, 10]}
          color="#2a3a4a"
          position={[0, -8, -5]}
          texture={cloudTexture}
        />
        
        <Cloud 
          ref={cloud1}
          seed={2}
          segments={18}
          volume={40}
          opacity={0.9}
          fade={20}
          growth={8}
          speed={0.06}
          bounds={[20, 8, 8]}
          color="#3a4a5a"
          position={[35, -12, 0]}
          texture={cloudTexture}
        />
        
        <Cloud 
          ref={cloud2}
          seed={3}
          segments={18}
          volume={35}
          opacity={0.9}
          fade={20}
          growth={8}
          speed={0.06}
          bounds={[20, 8, 8]}
          color="#3a4a5a"
          position={[-35, -10, 0]}
          texture={cloudTexture}
        />
        
        <Cloud 
          ref={cloud3}
          seed={4}
          segments={12}
          volume={38}
          opacity={0.85}
          fade={18}
          growth={7}
          speed={0.05}
          bounds={[18, 7, 7]}
          color="#4a5a6a"
          position={[0, -10, -25]}
          texture={cloudTexture}
        />
        
        <Cloud 
          ref={cloud4}
          seed={5}
          segments={30}
          volume={40}
          opacity={0.88}
          fade={20}
          growth={8}
          speed={0.055}
          bounds={[20, 8, 8]}
          color="#2a3a4a"
          position={[15, -25, 18]}
          texture={cloudTexture}
        />
        
        <Cloud 
          ref={cloud5}
          concentrate="outside"
          growth={60}
          color="#1a2a3a"
          opacity={0.8}
          seed={0.3}
          bounds={120}
          volume={100}
          position={[0, -12, -35]}
          texture={cloudTexture}
        />
        
        <Cloud 
          ref={cloud6}
          seed={6}
          segments={20}
          volume={45}
          opacity={0.92}
          fade={22}
          growth={9}
          speed={0.07}
          bounds={[22, 9, 9]}
          color="#3a4050"
          position={[-20, 5, 10]}
          texture={cloudTexture}
        />
        
        <Cloud 
          ref={cloud7}
          seed={7}
          segments={25}
          volume={50}
          opacity={0.93}
          fade={24}
          growth={10}
          speed={0.065}
          bounds={[24, 10, 10]}
          color="#2a3545"
          position={[25, 8, -15]}
          texture={cloudTexture}
        />
      </group>
    </group>
  );
});

StormCloudsComponent.displayName = 'StormCloudsComponent';

const StormClouds = dynamic(() => Promise.resolve(StormCloudsComponent), {
  ssr: false,
});

export default StormClouds;