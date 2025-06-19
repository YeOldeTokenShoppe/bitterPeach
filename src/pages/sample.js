import React, { useState } from "react";
import SkullMirrorViewer from "../components/3DVotiveStand/MirrorView";
import SynthRoad from "../components/3DVotiveStand/SynthRoad";
import PalmTreeDrive from "../components/PalmTreeDrive";
import NoiseParticleEffect from "../components/NoiseParticleEffect";
import BookAnimation from "../components/Book";
import Synthwave from "../components/Synthwave";




export default function SamplePage() {

  const [isLoading, setIsLoading] = useState(true);
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* <PalmTreeDrive /> */}
      {/* <NoiseParticleEffect /> */}
      {/* <BookAnimation /> */}
      <Synthwave />
      {/* <PalmTreeDrive /> */}
    
    </div>
  );
}
