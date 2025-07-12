import React from 'react';

const MinimalTest = () => {
  return (
    <>
      {/* Just basic lighting and a simple mesh */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Simple test sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="red" />
      </mesh>
    </>
  );
};

export default MinimalTest;