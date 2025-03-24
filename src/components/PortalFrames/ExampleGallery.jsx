"use client";

import dynamic from "next/dynamic";
import CenteredModel from "./CenteredModel";
import PortalGallery from "./PortalGallery";

const Gltf = dynamic(
  () => import("@react-three/drei").then((mod) => mod.Gltf),
  { ssr: false }
);

function ExampleGallery() {
  // Define the frames with their properties
  const frames = [
    {
      id: "01",
      name: "Clown",
      // author: "Omar Faruq Tawsif",
      bg: "#e4cdac",
      position: [-1.15, 0, 0],
      rotation: [0, 0.5, 0],
      children: (
        <CenteredModel
          depth={-2}
          autoScale={true}
          maxWidth={0.8}
          // Debug mode to visualize the bounding box
          debug={false}
        >
          <Gltf src="/murderClown.glb" />
        </CenteredModel>
      ),
    },
    {
      id: "02",
      name: "Vampire",
      // author: "Omar Faruq Tawsif",
      bg: "#ffffff",
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      children: (
        <CenteredModel
          depth={-3}
          verticalOffset={-0.3} // Move slightly down
          autoScale={true}
          maxWidth={0.7}
        >
          <Gltf src="/nosferatu.glb" />
        </CenteredModel>
      ),
    },
    {
      id: "03",
      name: "zombie",
      // author: "Omar Faruq Tawsif",
      bg: "#d1d1ca",
      position: [1.15, 0, 0],
      rotation: [0, -0.5, 0],
      children: (
        <CenteredModel depth={-1} autoScale={true} maxWidth={0.8}>
          <Gltf src="/zombie.glb" />
        </CenteredModel>
      ),
    },
  ];

  return <PortalGallery frames={frames} backgroundColor="#f0f0f0" />;
}

export default ExampleGallery;
