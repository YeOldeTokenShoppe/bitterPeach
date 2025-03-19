import React, { useRef, useState, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

function Annotation({
  children,
  position,
  scale = 1,
  isHighlighted = false,
  message = "",
  imageUrl = null,
  onAnnotationClick,
  showFloatingViewer = false,
}) {
  const [texture, setTexture] = useState(null);
  const [isLoading, setIsLoading] = useState(!!imageUrl);
  const [isHovered, setIsHovered] = useState(false);
  const { camera } = useThree();
  const groupRef = useRef();
  const circleRef = useRef();
  const borderRef = useRef();

  // Billboard effect - make the annotation always face the camera
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(camera.quaternion);

      // Animate scale on hover
      if (circleRef.current && borderRef.current) {
        const targetScale = isHovered ? 2.5 : 1.0;

        circleRef.current.scale.x = THREE.MathUtils.lerp(
          circleRef.current.scale.x,
          targetScale,
          0.1
        );
        circleRef.current.scale.y = THREE.MathUtils.lerp(
          circleRef.current.scale.y,
          targetScale,
          0.1
        );

        borderRef.current.scale.x = THREE.MathUtils.lerp(
          borderRef.current.scale.x,
          targetScale,
          0.1
        );
        borderRef.current.scale.y = THREE.MathUtils.lerp(
          borderRef.current.scale.y,
          targetScale,
          0.1
        );
      }
    }
  });

  // Rest of annotation component implementation
  // ...

  // Render highlighted or regular annotation
  // ...
}

export default Annotation;
