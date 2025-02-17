// import React, { useRef, useEffect } from "react";
// import { useFrame } from "@react-three/fiber";
// import { useGLTF, OrbitControls } from "@react-three/drei";
// import * as THREE from "three";
// import { gsap } from "gsap";

// function ShelfStand() {
//   const modelRef = useRef();
//   const shelvesRef = useRef({});
//   const buttonRef = useRef();

//   // Load the GLB model
//   const { scene } = useGLTF("/FiveTierStand1.glb");

//   useEffect(() => {
//     if (!modelRef.current) return;

//     // Collect references to each shelf and button
//     modelRef.current.traverse((child) => {
//       if (child.isMesh && child.name.startsWith("Shelf")) {
//         shelvesRef.current[child.name] = child;
//       } else if (child.name === "Button1") {
//         buttonRef.current = child;
//       }
//     });
//   }, [scene]);

//   // Animate shelves when the button is clicked
//   const handleButtonClick = () => {
//     const shelves = Object.values(shelvesRef.current);

//     // Drop each shelf, pause, then return
//     shelves.forEach((shelf) => {
//       const initialPosition = shelf.position.clone();

//       gsap
//         .timeline()
//         .to(shelf.position, {
//           y: initialPosition.y - 0.08,
//           duration: 0.2,
//           ease: "power2.out",
//         })
//         .to(
//           {},
//           { duration: 1 } // Pause for 1 second
//         )
//         .to(shelf.position, {
//           y: initialPosition.y,
//           duration: 2,
//           ease: "power2.inOut",
//         });
//     });
//   };

//   // Add onClick listener to the button
//   useFrame(() => {
//     if (buttonRef.current) {
//       buttonRef.current.userData.onClick = handleButtonClick;
//     }
//   });

//   return (
//     <group ref={modelRef}>
//       <ambientLight intensity={1.5} />
//       <directionalLight position={[3, 8, 1]} intensity={1} />

//       <primitive
//         position={[0, 2, 0]}
//         scale={[5, 5, 5]}
//         object={scene}
//         onPointerDown={(e) => {
//           if (e.object.name === "Button1") {
//             handleButtonClick();
//           }
//         }}
//       />
//       <OrbitControls makeDefault />
//     </group>
//   );
// }

// export default ShelfStand;
