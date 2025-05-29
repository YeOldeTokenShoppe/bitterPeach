import React, { useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

const NASACountdown = ({ 
  onCountdownComplete, 
  onPreloadProgress, 
  startCountdown = false,
  initialCount = 10 
}) => {
  const [count, setCount] = useState(initialCount);
  const [status, setStatus] = useState('STANDBY');
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [systemsCheck, setSystemsCheck] = useState({
    'FUEL': false,
    'ENGINES': false,
    'NAVIGATION': false,
    'LIFE SUPPORT': false,
    'COMMS': false,
    'TELEMETRY': false
  });

  // Preload moon scene assets
  const preloadAssets = useCallback(async () => {
    console.log('🚀 Preloading Moon Scene assets...');
    const totalAssets = 4; // Moon models, astronaut models, textures
    let loaded = 0;

    const updateProgress = () => {
      loaded++;
      const progress = (loaded / totalAssets) * 100;
      setPreloadProgress(progress);
      if (onPreloadProgress) onPreloadProgress(progress);
    };

    try {
      // Set up loaders
      const loader = new GLTFLoader();
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('/draco/');
      loader.setDRACOLoader(dracoLoader);
      
      // Load static astronaut
      await new Promise((resolve, reject) => {
        loader.load('/Astronaut2.glb', 
          (gltf) => {
            console.log('✅ Static astronaut model loaded');
            updateProgress();
            resolve(gltf);
          },
          undefined,
          reject
        );
      });

      // Load animated astronaut
      await new Promise((resolve, reject) => {
        loader.load('/Astronaut02.glb', 
          (gltf) => {
            console.log('✅ Animated astronaut model loaded');
            updateProgress();
            resolve(gltf);
          },
          undefined,
          reject
        );
      });

      // Load moon models
      await new Promise((resolve, reject) => {
        loader.load('/low_poly_moon.glb', 
          (gltf) => {
            console.log('✅ Moon model 1 loaded');
            updateProgress();
            resolve(gltf);
          },
          undefined,
          reject
        );
      });

      await new Promise((resolve, reject) => {
        loader.load('/Ochi_moon01.glb', 
          (gltf) => {
            console.log('✅ Moon model 2 loaded');
            updateProgress();
            resolve(gltf);
          },
          undefined,
          reject
        );
      });

    } catch (error) {
      console.error('Error preloading assets:', error);
    }
  }, [onPreloadProgress]);

  // Systems check animation
  useEffect(() => {
    if (startCountdown && status === 'STANDBY') {
      setStatus('SYSTEMS_CHECK');
      
      // Animate systems coming online
      const systems = Object.keys(systemsCheck);
      systems.forEach((system, index) => {
        setTimeout(() => {
          setSystemsCheck(prev => ({ ...prev, [system]: true }));
          
          // Start countdown after all systems are go
          if (index === systems.length - 1) {
            setTimeout(() => {
              setStatus('COUNTDOWN');
              // Start preloading assets
              preloadAssets();
            }, 500);
          }
        }, (index + 1) * 300);
      });
    }
  }, [startCountdown, status, preloadAssets]);

  // Countdown logic
  useEffect(() => {
    if (status !== 'COUNTDOWN') return;
    if (count === 0) {
      setStatus('LAUNCH');
      if (onCountdownComplete) {
        setTimeout(onCountdownComplete, 500);
      }
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, status, onCountdownComplete]);

  if (!startCountdown) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      fontFamily: 'monospace',
      color: '#00ff00',
      fontSize: '20px'
    }}>
      {/* NASA Logo/Header */}
      <div style={{
        position: 'absolute',
        top: '20px',
        fontSize: '30px',
        fontWeight: 'bold',
        textShadow: '0 0 10px #00ff00'
      }}>
        MISSION CONTROL
      </div>

      {/* Systems Check */}
      {status === 'SYSTEMS_CHECK' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {Object.entries(systemsCheck).map(([system, isGo]) => (
            <div key={system} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              opacity: isGo ? 1 : 0.3,
              transition: 'opacity 0.3s'
            }}>
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: isGo ? '#00ff00' : '#333',
                boxShadow: isGo ? '0 0 10px #00ff00' : 'none',
                transition: 'all 0.3s'
              }} />
              <span>{system}: {isGo ? 'GO' : 'STANDBY'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Countdown Display */}
      {(status === 'COUNTDOWN' || status === 'LAUNCH') && (
        <>
          <div style={{
            fontSize: '120px',
            fontWeight: 'bold',
            textShadow: '0 0 20px #00ff00, 0 0 40px #00ff00',
            marginBottom: '20px'
          }}>
            {status === 'LAUNCH' ? 'LAUNCH!' : `T-${count}`}
          </div>
          
          {/* Progress Bar */}
          <div style={{
            width: '300px',
            height: '30px',
            backgroundColor: 'rgba(0, 255, 0, 0.1)',
            border: '2px solid #00ff00',
            borderRadius: '15px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${preloadProgress}%`,
              height: '100%',
              backgroundColor: '#00ff00',
              transition: 'width 0.3s',
              boxShadow: '0 0 10px #00ff00'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#000'
            }}>
              LOADING MOON SCENE: {Math.round(preloadProgress)}%
            </div>
          </div>

          {/* Status Messages */}
          <div style={{
            marginTop: '20px',
            fontSize: '16px',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            {count > 7 && 'INITIATING LAUNCH SEQUENCE...'}
            {count === 7 && 'MAIN ENGINES START...'}
            {count === 6 && 'DISPOSING GALLERY RESOURCES...'}
            {count === 5 && 'LOADING ASTRONAUT DATA...'}
            {count === 3 && 'FINAL PREPARATIONS...'}
            {count === 1 && 'IGNITION...'}
            {status === 'LAUNCH' && 'WE HAVE LIFTOFF!'}
          </div>
        </>
      )}
    </div>
  );
};

export default NASACountdown;