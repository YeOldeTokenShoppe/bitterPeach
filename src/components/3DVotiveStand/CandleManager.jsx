import React, { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import Candle from "./Candle";
import Annotation from "./Annotation";

function CandleManager({ results, showFloatingViewer, onCandleSelect }) {
  const [xCandleModel, setXCandleModel] = useState(null);
  const xCandleInstances = useRef(new Map());
  const meltedCandlesRef = useRef(new Set());
  const [highlightedXCandle, setHighlightedXCandle] = useState(null);
  const [hasHandledFirstClick, setHasHandledFirstClick] = useState(false);

  useEffect(() => {
    // Load candle model
    const loadXCandleModel = async () => {
      // Candle model loading logic
      // ...
    };

    loadXCandleModel();
  }, []);

  useEffect(() => {
    // Process results from Firestore and create candles
    // ...
  }, [results]);

  // Return component with candles and annotations
  return (
    <>
      {Array.from(xCandleInstances.current.entries()).map(
        ([index, xCandle]) => {
          // Skip rendering annotations for fully melted candles
          if (meltedCandlesRef.current.has(xCandle.name)) {
            return null;
          }

          // Annotation positioning and click handling logic
          // ...

          return (
            <Annotation
              key={`xcandle-annotation-${index}`}
              position={flamePosition}
              scale={1.0}
              isHighlighted={isHighlighted}
              imageUrl={imageUrl}
              onAnnotationClick={handleAnnotationClick}
              showFloatingViewer={showFloatingViewer}
            >
              {userName}
            </Annotation>
          );
        }
      )}
    </>
  );
}

export default CandleManager;
