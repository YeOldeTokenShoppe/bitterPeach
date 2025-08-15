// import React, { useEffect, useState } from 'react';
// import SimpleLoader from './SimpleLoader';
// import CoinLoader from './CoinLoader';

// const AppLoader = ({ isInitialLoad, ...props }) => {
//   const [coinLoaderReady, setCoinLoaderReady] = useState(false);

//   // Preload CoinLoader component in the background
//   useEffect(() => {
//     // Small delay to prioritize initial render
//     const timer = setTimeout(() => {
//       setCoinLoaderReady(true);
//     }, 100);

//     return () => clearTimeout(timer);
//   }, []);

//   if (isInitialLoad) {
//     return (
//       <>
//         <SimpleLoader />
//         {/* Render CoinLoader hidden to preload it */}
//         {coinLoaderReady && (
//           <div style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }}>
//             <CoinLoader size="small" withSparkle={false} />
//           </div>
//         )}
//       </>
//     );
//   }
  
//   return <CoinLoader {...props} />;
// };

// export default AppLoader;