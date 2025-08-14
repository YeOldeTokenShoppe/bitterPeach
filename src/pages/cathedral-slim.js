import React from 'react';
import dynamic from 'next/dynamic';
// import CyberNav from '../src/components/CyberNav';
// import Starfield from '../src/components/3DVotiveStand/Starfield';
// import ConstellationModel from '../src/components/3DVotiveStand/ConstellationModel';

const CathedralSlim = dynamic(() => import('../components/CathedralSlim'), {
  ssr: false,
});

export default function CathedralSlimPage() {
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* <Starfield /> */}
      {/* <ConstellationModel /> */}
      <CathedralSlim />
      {/* <CyberNav /> */}
    </div>
  );
}