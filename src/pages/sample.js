import React, { useState } from "react";
import SkullMirrorViewer from "../components/3DVotiveStand/MirrorView";
import SynthRoad from "../components/3DVotiveStand/SynthRoad";
import PalmTreeDrive from "../components/PalmTreeDrive";

export default function SamplePage() {

  const [isLoading, setIsLoading] = useState(true);
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <PalmTreeDrive />
    </div>
  );
}
