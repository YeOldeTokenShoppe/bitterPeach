// import React, { useRef, useMemo } from 'react';
// import * as THREE from 'three';
// import { useFrame } from '@react-three/fiber';
// import { Line } from '@react-three/drei';

// const NeonLines = ({ enabled = true, linesAmount = 10 }) => {
//   const groupRef = useRef();
  
//   console.log('🎨 NeonLines rendering:', { enabled, linesAmount });
  
//   // Generate line data
//   const lines = useMemo(() => {
//     const colors = ['#67e8f9', '#00ff41']; // Cyan and neon green from CLAUDE.md
    
//     return Array.from({ length: linesAmount }, (_, i) => {
//       // Create lines in a more visible pattern around the scene
//       const angle = (i / linesAmount) * Math.PI * 2;
//       const radius = 15 + Math.random() * 10;
//       const height = (Math.random() - 0.5) * 20 + 10;
      
//       // Start point
//       const x1 = Math.cos(angle) * radius;
//       const y1 = height;
//       const z1 = Math.sin(angle) * radius;
      
//       // End point - create longer, more dramatic lines
//       const length = 10 + Math.random() * 10;
//       const angleOffset = (Math.random() - 0.5) * 0.5;
//       const x2 = Math.cos(angle + angleOffset) * (radius + length);
//       const y2 = height + (Math.random() - 0.5) * 10;
//       const z2 = Math.sin(angle + angleOffset) * (radius + length);
      
//       return {
//         points: [new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2)],
//         color: colors[i % colors.length],
//         index: i
//       };
//     });
//   }, [linesAmount]);
  
//   // Animate the lines
//   useFrame((state) => {
//     if (!enabled || !groupRef.current) return;
    
//     const time = state.clock.elapsedTime;
    
//     // Rotate the entire group slowly
//     groupRef.current.rotation.y = time * 0.05;
    
//     // Animate individual lines
//     groupRef.current.children.forEach((line, i) => {
//       if (line.material) {
//         // Pulse opacity
//         const pulse = Math.sin(time * 2 + i * 0.5) * 0.3 + 0.7;
//         line.material.opacity = pulse;
//       }
//     });
//   });
  
//   if (!enabled) return null;
  
//   return (
//     <group ref={groupRef} position={[0, 0, 0]}>
//       {lines.map((lineData, idx) => (
//         <React.Fragment key={idx}>
//           {/* Main line */}
//           <Line
//             points={lineData.points}
//             color={lineData.color}
//             lineWidth={6}
//             transparent
//             opacity={0.9}
//             blending={THREE.AdditiveBlending}
//             depthWrite={false}
//           />
//           {/* Glow effect - slightly wider, more transparent */}
//           <Line
//             points={lineData.points}
//             color={lineData.color}
//             lineWidth={12}
//             transparent
//             opacity={0.3}
//             blending={THREE.AdditiveBlending}
//             depthWrite={false}
//           />
//         </React.Fragment>
//       ))}
//     </group>
//   );
// };

// export default NeonLines;