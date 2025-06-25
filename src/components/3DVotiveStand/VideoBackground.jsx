import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const VideoBackground = ({ is80sMode = false }) => {
  const { scene, camera } = useThree();
  const videoRef = useRef();
  const textureRef = useRef();
  const meshRef = useRef();
  
  useEffect(() => {
    if (!is80sMode) {
      // Remove video background if not in 80s mode
      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        meshRef.current.material.dispose();
        meshRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.remove();
        videoRef.current = null;
      }
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      return;
    }
    
    // Create video element
    const video = document.createElement('video');
    video.src = '/83.mov';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    
    // Play video
    video.play().catch(error => {
      console.warn('[VideoBackground] Auto-play failed:', error);
      // Attempt to play on user interaction
      const playVideo = () => {
        video.play();
        document.removeEventListener('click', playVideo);
        document.removeEventListener('touchstart', playVideo);
      };
      document.addEventListener('click', playVideo);
      document.addEventListener('touchstart', playVideo);
    });
    
    videoRef.current = video;
    
    // Create video texture
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBFormat;
    texture.encoding = THREE.sRGBEncoding;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 4); // Repeat the texture 4 times horizontally, 2 times vertically
    textureRef.current = texture;
    
    // Create a hemisphere for background above ground
    const geometry = new THREE.SphereGeometry(60, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide, // Render on the inside of the sphere
      transparent: true,
      opacity: 0.6, // Adjusted opacity for visibility
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -2.7; // Position at grid level
    mesh.renderOrder = -1000; // Render behind everything else
    
    scene.add(mesh);
    meshRef.current = mesh;
    
    return () => {
      // Cleanup
      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current.geometry.dispose();
        meshRef.current.material.dispose();
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.remove();
      }
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, [is80sMode, scene]);
  
  return null;
};

export default VideoBackground;