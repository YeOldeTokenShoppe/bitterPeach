import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import PhysicsWeatherClouds from '../components/EtherealClouds/PhysicsWeatherClouds';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export default function FearGreedWeatherPage() {
  const [fearGreedData, setFearGreedData] = useState({
    value: 50,
    classification: 'Neutral',
    weatherState: 'neutral'
  });
  const [manualOverride, setManualOverride] = useState(false);
  const [manualValue, setManualValue] = useState(50);
  
  const getColorForValue = (value) => {
    if (value < 25) return '#ff3333'; // Extreme Fear - Red
    if (value < 45) return '#ff9933'; // Fear - Orange
    if (value < 55) return '#ffff33'; // Neutral - Yellow
    if (value < 75) return '#66ff66'; // Greed - Light Green
    return '#00ff00'; // Extreme Greed - Green
  };
  
  const getWeatherDescription = (state) => {
    switch(state) {
      case 'extremeFear': return 'Apocalyptic Storm';
      case 'fear': return 'Heavy Storm';
      case 'neutral': return 'Overcast';
      case 'greed': return 'Partly Cloudy';
      case 'extremeGreed': return 'Heavenly';
      default: return 'Loading...';
    }
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', position: 'relative' }}>
      {/* Fear & Greed Index Overlay */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 100,
        background: 'rgba(0, 0, 0, 0.8)',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        color: 'white',
        fontFamily: 'monospace',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: 'bold' }}>
          Fear & Greed Index
        </h2>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getColorForValue(fearGreedData.value) }}>
          {fearGreedData.value}
        </div>
        <div style={{ fontSize: '16px', marginTop: '10px', color: getColorForValue(fearGreedData.value) }}>
          {fearGreedData.classification || 'Loading...'}
        </div>
        <div style={{ fontSize: '14px', marginTop: '15px', paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
          Weather: {getWeatherDescription(fearGreedData.weatherState)}
        </div>
        <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.7 }}>
          Updates every 5 minutes
        </div>
        
        {/* Manual Override Controls */}
        <div style={{ 
          marginTop: '15px', 
          paddingTop: '15px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.2)' 
        }}>
          <div style={{ fontSize: '12px', marginBottom: '10px', fontWeight: 'bold' }}>
            Test Controls
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }}>
            <input 
              type="checkbox"
              checked={manualOverride}
              onChange={(e) => {
                setManualOverride(e.target.checked);
                if (e.target.checked) {
                  const classification = 
                    manualValue < 25 ? 'Extreme Fear' :
                    manualValue < 45 ? 'Fear' :
                    manualValue < 55 ? 'Neutral' :
                    manualValue < 75 ? 'Greed' : 'Extreme Greed';
                  const weatherState = 
                    manualValue < 25 ? 'extremeFear' :
                    manualValue < 45 ? 'fear' :
                    manualValue < 55 ? 'neutral' :
                    manualValue < 75 ? 'greed' : 'extremeGreed';
                  setFearGreedData({
                    value: manualValue,
                    classification,
                    weatherState
                  });
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            Manual Override
          </label>
          {manualOverride && (
            <div style={{ marginTop: '10px' }}>
              <input 
                type="range"
                min="0"
                max="100"
                value={manualValue}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  setManualValue(value);
                  const classification = 
                    value < 25 ? 'Extreme Fear' :
                    value < 45 ? 'Fear' :
                    value < 55 ? 'Neutral' :
                    value < 75 ? 'Greed' : 'Extreme Greed';
                  const weatherState = 
                    value < 25 ? 'extremeFear' :
                    value < 45 ? 'fear' :
                    value < 55 ? 'neutral' :
                    value < 75 ? 'greed' : 'extremeGreed';
                  setFearGreedData({
                    value,
                    classification,
                    weatherState
                  });
                }}
                style={{ 
                  width: '100%',
                  cursor: 'pointer'
                }}
              />
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '10px',
                marginTop: '5px',
                opacity: 0.7
              }}>
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Canvas
        shadows
        camera={{ position: [1, 12, 45], fov: 60 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      >
        <Suspense fallback={null}>
          <PhysicsWeatherClouds 
            onDataUpdate={manualOverride ? null : setFearGreedData}
            manualData={manualOverride ? fearGreedData : null}
          />
          <OrbitControls 
            makeDefault
            // target={[1, 10, 45]}  // Center on Madonna's position
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            rotateSpeed={1}
            maxDistance={80}
            minDistance={1}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}