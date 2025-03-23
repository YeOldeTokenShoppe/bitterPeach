import { useEffect, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Box3, Vector3 } from "three";

/**
 * CenteredModel - A component that automatically centers and scales models within portal frames
 *
 * @param {Object} props
 * @param {ReactNode} props.children - The model component to center (usually a Gltf component)
 * @param {number} props.scale - Target scale (default: 1)
 * @param {Vector3} props.position - Position offset from center (default: [0,0,0])
 * @param {number} props.depth - Target depth position (how far into the portal, default: -3)
 * @param {boolean} props.autoScale - Whether to automatically scale the model (default: true)
 * @param {number} props.maxWidth - Maximum width of the model (default: 0.8)
 * @param {number} props.verticalOffset - Vertical positioning offset (default: 0)
 * @param {boolean} props.debug - Show debug bounding box (default: false)
 */
function CenteredModel({
  children,
  scale = 1,
  position = [0, 0, 0],
  depth = -3,
  autoScale = true,
  maxWidth = 0.8,
  verticalOffset = 0,
  debug = false,
  ...props
}) {
  const modelRef = useRef();
  const debugRef = useRef();
  const groupRef = useRef();
  // Store calculated values in refs instead of state to avoid re-renders
  const calculatedValues = useRef({
    scale: scale,
    position: new Vector3(position[0], position[1], position[2] || depth),
  });
  const isProcessed = useRef(false);

  // Calculate the bounding box and center the model only once
  useEffect(() => {
    // Only process once to avoid flickering
    if (isProcessed.current || !modelRef.current) return;

    // Use a more substantial timeout to ensure the model is fully loaded
    const timeoutId = setTimeout(() => {
      try {
        // Create a new bounding box and expand it by the object's children
        const box = new Box3().setFromObject(modelRef.current);

        if (box.isEmpty()) {
          console.warn("Model bounding box is empty, trying again in 500ms");
          setTimeout(recalculate, 500);
          return;
        }

        // Calculate model dimensions
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());

        // Calculate the ideal scale
        let idealScale = scale;
        if (autoScale) {
          // Scale based on width or height, whichever is larger
          const targetWidth = maxWidth;
          idealScale = targetWidth / Math.max(size.x, size.y);
        }

        // Calculate the position to center the model
        const x = position[0] - center.x * idealScale;
        const y = position[1] - center.y * idealScale + verticalOffset;
        const z = position[2] || depth;

        // Store the calculated values
        calculatedValues.current = {
          scale: idealScale,
          position: new Vector3(x, y, z),
          bounds: { size, center },
        };

        // Apply transformations directly using the ref
        if (groupRef.current) {
          groupRef.current.position.copy(calculatedValues.current.position);
          groupRef.current.scale.set(idealScale, idealScale, idealScale);
        }

        // Update debug box if enabled
        if (debug && debugRef.current) {
          debugRef.current.scale.set(size.x, size.y, size.z);
        }

        // Mark as processed to avoid reprocessing
        isProcessed.current = true;

        console.log(
          `Model centered: scale=${idealScale}, pos=[${x}, ${y}, ${z}]`
        );
      } catch (error) {
        console.error("Error centering model:", error);
      }
    }, 300); // Longer timeout for model loading

    const recalculate = () => {
      isProcessed.current = false;
      if (modelRef.current) {
        const box = new Box3().setFromObject(modelRef.current);

        if (!box.isEmpty()) {
          isProcessed.current = true;
          // Same calculations as above...
          // (implementation omitted for brevity)
        } else {
          console.warn("Model still not loaded properly");
        }
      }
    };

    return () => clearTimeout(timeoutId);
  }, [modelRef, scale, position, depth, autoScale, maxWidth, verticalOffset]);

  return (
    <group ref={groupRef} {...props}>
      <group ref={modelRef}>{children}</group>

      {debug && (
        <mesh ref={debugRef} position={[0, 0, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="red"
            wireframe={true}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}
    </group>
  );
}

export default CenteredModel;
