import React, { useEffect, useState } from 'react';
import { Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function DebugCyborg3Position() {
  const { scene } = useThree();
  const [cyborg3Data, setCyborg3Data] = useState(null);
  
  useEffect(() => {
    // Find Cyborg3 in the scene
    let cyborg3 = null;
    
    scene.traverse((child) => {
      if (child.name === 'Cyborg3') {
        cyborg3 = child;
        
        // Get all position data
        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);
        
        const worldRot = new THREE.Euler();
        child.getWorldQuaternion(new THREE.Quaternion().setFromEuler(worldRot));
        
        const data = {
          name: child.name,
          localPos: {
            x: child.position.x,
            y: child.position.y,
            z: child.position.z
          },
          worldPos: {
            x: worldPos.x,
            y: worldPos.y,
            z: worldPos.z
          },
          rotation: {
            x: child.rotation.x * 180 / Math.PI,
            y: child.rotation.y * 180 / Math.PI,
            z: child.rotation.z * 180 / Math.PI
          },
          parent: child.parent?.name || 'Scene'
        };
        
        setCyborg3Data(data);
        
        // Force log to console using different method
        window.CYBORG3_POSITION = data;
        console.error('CYBORG3 POSITION DATA STORED IN: window.CYBORG3_POSITION');
        console.error('Type this in console: window.CYBORG3_POSITION');
        
        // Also try alert as last resort
        const posString = `Cyborg3 World Position: X=${worldPos.x.toFixed(2)}, Y=${worldPos.y.toFixed(2)}, Z=${worldPos.z.toFixed(2)}`;
        console.error(posString);
        
        // Create a text file download with the data
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.setAttribute('href', dataUri);
        link.setAttribute('download', 'cyborg3_position.json');
        
        // Add download button to page
        const button = document.createElement('button');
        button.textContent = 'Download Cyborg3 Position Data';
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.zIndex = '9999';
        button.style.padding = '10px';
        button.style.background = 'red';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.cursor = 'pointer';
        button.onclick = () => link.click();
        document.body.appendChild(button);
      }
    });
    
    if (!cyborg3) {
      console.error('Cyborg3 not found in scene!');
      console.error('Available objects with "cyborg" in name:');
      scene.traverse((child) => {
        if (child.name && child.name.toLowerCase().includes('cyborg')) {
          console.error(' - ' + child.name);
        }
      });
    }
  }, [scene]);
  
  if (!cyborg3Data) return null;
  
  return (
    <>
      {/* Display position in 3D scene */}
      <Html
        position={[
          cyborg3Data.worldPos.x,
          cyborg3Data.worldPos.y + 5,
          cyborg3Data.worldPos.z
        ]}
        style={{
          background: 'red',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontFamily: 'monospace',
          fontSize: '14px',
          whiteSpace: 'pre'
        }}
      >
        <div>
          <strong>CYBORG3 POSITION</strong><br/>
          World X: {cyborg3Data.worldPos.x.toFixed(2)}<br/>
          World Y: {cyborg3Data.worldPos.y.toFixed(2)}<br/>
          World Z: {cyborg3Data.worldPos.z.toFixed(2)}<br/>
          <br/>
          Local X: {cyborg3Data.localPos.x.toFixed(2)}<br/>
          Local Y: {cyborg3Data.localPos.y.toFixed(2)}<br/>
          Local Z: {cyborg3Data.localPos.z.toFixed(2)}<br/>
          <br/>
          Parent: {cyborg3Data.parent}
        </div>
      </Html>
      
      {/* Add a large red box at the position */}
      <mesh position={[
        cyborg3Data.worldPos.x,
        cyborg3Data.worldPos.y + 1,
        cyborg3Data.worldPos.z
      ]}>
        <boxGeometry args={[2, 2, 2]} />
        <meshBasicMaterial color="red" wireframe />
      </mesh>
      
      {/* Add a line from origin to Cyborg3 */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              0, 0, 0,
              cyborg3Data.worldPos.x,
              cyborg3Data.worldPos.y,
              cyborg3Data.worldPos.z
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="red" linewidth={5} />
      </line>
    </>
  );
}