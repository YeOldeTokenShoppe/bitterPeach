import React, { useState } from "react";
import SkullMirrorViewer from "../components/3DVotiveStand/MirrorView";
import SynthRoad from "../components/3DVotiveStand/SynthRoad";
import Magic8BallLoader from "../components/Magic8BallLoader";

export default function SamplePage() {

  const [isLoading, setIsLoading] = useState(true);
  return (
    <div>
      <Magic8BallLoader isLoading={isLoading} />
    </div>
  );
}
