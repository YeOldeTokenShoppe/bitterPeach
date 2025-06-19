import React from 'react';

const ExtrudedTitle = () => {
  // Matrix order for the convolution filter
  const n = 10;
  
  // Create n×n identity matrix for the convolution kernel
  const identityMatrix = new Array(n * n)
    .fill(0)
    .map((_, i) => (i % (n + 1) === 0 ? 1 : 0))
    .join(' ');

  return (
    <div className="fixed top-10 left-10 p-8 z-0">
      {/* SVG Filter Definition */}
      <svg className="fixed" width="0" height="0" aria-hidden="true">
        <defs>
          <filter id="extrude">
            <feConvolveMatrix
              in="SourceAlpha"
              order={n}
              divisor="1"
              kernelMatrix={identityMatrix}
            />
            <feOffset dx={0.5 * n} dy={0.5 * n} result="side" />
            <feOffset dx={n} dy={n} />
            <feBlend in="side" />
            <feComposite in2="SourceAlpha" operator="out" result="extr" />
            <feColorMatrix
              in="SourceGraphic"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0"
            />
            <feBlend in2="extr" />
          </filter>
        </defs>
      </svg>

      {/* Main Text */}
      <h1 
        className="relative"
        style={{
          width: '40rem',
          transform: 'skewY(-9deg) scale(0.4)',
          transformOrigin: 'top left',
          font: '700 8rem/0.9 Teko, sans-serif !important',
          textTransform: 'uppercase',
          filter: 'url(#extrude) invert(1)',
          letterSpacing: '0.05em',
          textAlign: 'left',
          lineHeight: '0.7',
        }}
      >
         Our Lady <span style={{fontSize: '0.45em', display: 'inline-block'}}>of</span><br />
         Perpetual<br />
         Profit
        <span 
          className="relative bg-black text-white rounded-sm"
          style={{
            position: 'relative',
            top: '0.2em',
            width: '3.3ch',
            height: '3ch',
            borderRadius: '0.125em',
            boxShadow: '0 -0.4em #000',
            fontSize: '0.45em',
            lineHeight: '1',
            padding: '0.2em 0.3em 0.4em 0.3em',
            marginLeft: '0.5rem',
            textAlign: 'center',
            verticalAlign: 'top',
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ lineHeight: '0.8', marginTop: '-0.1em' }}>RL</span>
          <span style={{ lineHeight: '0.8' }}>80</span>
        </span>
      </h1>

      {/* Add Teko font from Google Fonts */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Teko:wght@700&display=swap');
      `}</style>
    </div>
  );
};

export default ExtrudedTitle;


// import React from 'react';

// const ExtrudedTitle = () => {
//   // Matrix order for the convolution filter
//   const n = 12;
  
//   // Create n×n identity matrix for the convolution kernel
//   const identityMatrix = new Array(n * n)
//     .fill(0)
//     .map((_, i) => (i % (n + 1) === 0 ? 1 : 0))
//     .join(' ');

//   return (
//     <div className="fixed top-0 right-0 p-8 z-50">
//       {/* SVG Filter Definition */}
//       <svg className="fixed" width="0" height="0" aria-hidden="true">
//         <defs>
//           <filter id="extrude">
//             <feConvolveMatrix
//               in="SourceAlpha"
//               order={n}
//               divisor="1"
//               kernelMatrix={identityMatrix}
//             />
//             <feOffset dx={0.5 * n} dy={0.5 * n} result="side" />
//             <feOffset dx={n} dy={n} />
//             <feBlend in="side" />
//             <feComposite in2="SourceAlpha" operator="out" result="extr" />
//             <feColorMatrix
//               in="SourceGraphic"
//               values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0"
//             />
//             <feBlend in2="extr" />
//           </filter>
//         </defs>
//       </svg>

//       {/* Main Text */}
//       <h1 
//         className="relative"
//         style={{
//           width: '40rem',
//           transform: 'skewY(-9deg) scale(0.5)',
//           transformOrigin: 'top right',
//           font: '700 8rem/0.9 Teko, sans-serif !important',
//           textTransform: 'uppercase',
//           filter: 'url(#extrude) invert(1)',
//           letterSpacing: '0.05em',
//           textAlign: 'left',
//           lineHeight: '0.7',
//         }}
//       >
//          Our Lady <span style={{fontSize: '0.35em', display: 'inline-block'}}>of</span><br />
//          Perpetual<br />
//          Profit
//         <span 
//           className="relative bg-black text-white rounded-sm"
//           style={{
//             position: 'relative',
//             top: '0.2em',
//             width: '3ch',
//             height: '3ch',
//             borderRadius: '0.125em',
//             boxShadow: '0 -0.4em #000',
//             fontSize: '0.45em',
//             lineHeight: '1',
//             padding: '0.2em 0.3em 0.4em 0.3em',
//             marginLeft: '0.5rem',
//             textAlign: 'center',
//             verticalAlign: 'top',
//             display: 'inline-flex',
//             flexDirection: 'column',
//             alignItems: 'center',
//             justifyContent: 'center'
//           }}
//         >
//           <span style={{ lineHeight: '0.8', marginTop: '-0.1em' }}>RL</span>
//           <span style={{ lineHeight: '0.8' }}>80</span>
//         </span>
//       </h1>

//       {/* Add Teko font from Google Fonts */}
//       <style jsx>{`
//         @import url('https://fonts.googleapis.com/css2?family=Teko:wght@700&display=swap');
//       `}</style>
//     </div>
//   );
// };

// export default ExtrudedTitle;