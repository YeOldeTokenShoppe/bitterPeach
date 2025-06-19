import React, { useEffect, useRef, useState } from 'react';
import { createNoise3D } from 'simplex-noise';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const TWO_PI = Math.PI * 2;
const deg = 180 / Math.PI;

class Particle {
  constructor(x, y, color, size, edge) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.maxSize = size;
    this.size = size;
    this.edge = edge;
    this.opacity = 1;
  }
  
  draw(ctx) {
    if (this.opacity < 0.01) {
      return;
    }
    
    const center = (this.edge - this.maxSize * 0.5) * 0.5;
    
    ctx.fillStyle = `hsla(${Math.floor(this.color[0])} ${this.color[1]} ${this.color[2]}% / ${this.opacity})`;
    
    ctx.beginPath();
    ctx.arc(
      this.x + center,
      this.y + center,
      this.size,
      0,
      TWO_PI
    );
    ctx.fill();
    ctx.closePath();
  }
}

const NoiseParticleEffect = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const stateRef = useRef({
    width: 0,
    height: 0,
    particles: [],
    request: 0,
    gap: 8,
    pixelSize: 5,
    lastUpdate: 0,
    interval: 1000 / 60,
    mouseX: 0,
    mouseY: 0,
    timer: 0,
  });
  
  const noiseRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    const state = stateRef.current;
    
    // Initialize noise functions
    const pnrd = () => Math.random();
    const xNoise = createNoise3D(pnrd);
    noiseRef.current = xNoise;
    
    const init = () => {
      state.particles = [];
      
      const cellsX = Math.floor(state.width / state.gap);
      const cellsY = Math.floor(state.height / state.gap);
      
      let offsetX = state.width - (cellsX * state.gap);
      let offsetY = state.height - (cellsY * state.gap);
      
      offsetX *= 0.5;
      offsetY *= 0.5;
      
      for (let x = 0; x < cellsX; x++) {
        for (let y = 0; y < cellsY; y++) {
          const px = x * state.gap + offsetX;
          const py = y * state.gap + offsetY;
          const rate = (Math.abs(cellsX * 0.5 - x) + Math.abs(cellsY * 0.5 - y)) * Math.PI;
          const color = [rate ** 0.9 % 360, 100, 50];
          state.particles.push(new Particle(px, py, color, state.pixelSize, state.gap));
        }
      }
    };
    
    const animate = () => {
      state.request = requestAnimationFrame(animate);
      
      const now = performance.now();
      const diff = now - (state.lastUpdate || 0);
      if (diff < state.interval) {
        return;
      }
      state.lastUpdate = now - (diff % state.interval);
      
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, state.width, state.height);
      
      ctx.globalCompositeOperation = "screen";
      
      state.timer += 0.005;
      
      state.particles.forEach((particle) => {
        const mx = (1 + state.mouseX);
        const my = (1 + state.mouseY);
        const nx = particle.x * mx / state.width;
        const ny = particle.y * my / state.height;
        const rz = Math.sin(state.timer) ** 2;
        
        const x = (1 + noiseRef.current(nx, nx, rz)) / 2;
        const y = (1 + noiseRef.current(ny, ny, rz)) / 2;
        const angle = ((x + y) * TWO_PI * deg) | 0;
        
        particle.size = clamp((x + y) * particle.maxSize, 0, particle.maxSize * 4);
        particle.color = [angle, 100, 50];
        particle.opacity = clamp(Math.sin(angle * 0.1), 0, 1);
        
        particle.draw(ctx);
      });
    };
    
    const resize = () => {
      cancelAnimationFrame(state.request);
      
      const rect = container.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      
      canvas.width = width;
      canvas.height = height;
      
      state.width = width;
      state.height = height;
      
      state.gap = clamp(Math.max(width, height) * 0.01 | 0, 2, 16);
      state.pixelSize = clamp(state.gap * 0.5 | 0, 1, 8);
      
      state.mouseX = state.mouseX ?? 0;
      state.mouseY = state.mouseY ?? 0;
      
      init();
      animate();
    };
    
    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      state.mouseX = (event.clientX - rect.left) / state.width;
      state.mouseY = (event.clientY - rect.top) / state.height;
    };
    
    // Initial setup
    resize();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    
    // Add mouse move listener
    container.addEventListener('mousemove', handleMouseMove);
    
    // Cleanup
    return () => {
      cancelAnimationFrame(state.request);
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  return (
    <div ref={containerRef} className="w-full h-screen relative bg-black overflow-hidden">
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
};

export default NoiseParticleEffect;