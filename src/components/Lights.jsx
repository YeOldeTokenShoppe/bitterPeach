import { Float, Lightformer } from "@react-three/drei";

export const Lights = () => {
  return (
    <>
      {/* TOP */}
      <Float speed={0.5} floatIntensity={2} rotationIntensity={1.5}>
        <Lightformer
          form="ring"
          intensity={1}
          position={[-3, 3, -2]}
          scale={[3, 3, 1]}
          target={[0, 0, 0]}
        />
      </Float>

      <Lightformer
        intensity={0.4}
        position={[0, 5, -2]}
        scale={[10, 10, 1]}
        target={[0, 0, 0]}
      />

      {/* LEFT */}
      <Lightformer
        position={[-5, 2, 0]}
        target={[0, 0, 0]}
        scale={[10, 1, 1]}
        color="blue"
        intensity={2}
      />
      <Float speed={5} floatIntensity={2} rotationIntensity={2}>
        <Lightformer
          form="ring"
          color="red"
          intensity={0.5}
          scale={10}
          position={[-15, 4, -18]}
          target={[0, 0, 0]}
        />
      </Float>

      {/* RIGHT */}
      <Lightformer
        position={[5, 1, 3]}
        scale={[10, 1, 1]}
        target={[0, 0, 0]}
        color="green"
        intensity={2}
      />
      <Lightformer
        position={[2, 0, 0]}
        scale={[0.1, 5, 1]}
        target={[0, 0, 0]}
        color="purple"
        intensity={1.5}
      />
      <Lightformer
        form="ring"
        position={[5, 3, 2]}
        scale={5}
        target={[0, 0, 0]}
        intensity={1.25}
      />

      {/* FRONT */}
      <Lightformer position={[0, 0.5, 5]} scale={[4, 0.5, 1]} intensity={2} />
    </>
  );
};
