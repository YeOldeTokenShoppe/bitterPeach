import React from 'react';

const PrismaticOverlay = ({ particleCount = 30, className = '' }) => {
  // Generate random values for each particle
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const plusMinus = i % 2 === 0 ? -1 : 1;
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;
    const angle = (Math.random() * 5 + 5) * plusMinus;
    
    return {
      id: i,
      posXStart: posX,
      posYStart: posY,
      angleStart: angle,
      posXEnd: posX + Math.random() * 8 + 5,
      posYEnd: posY + Math.random() * 8 + 5,
      angleEnd: angle + (Math.random() * 20 + 2) * plusMinus,
      scale: Math.random() * 2 + 1,
      duration: Math.random() * 10 + 5,
      delay: Math.random() * 7 * -0.3,
      opacity: Math.random() * 0.5 + 0.2,
      animationDirection: i % 2 === 0 ? 'alternate-reverse' : 'alternate'
    };
  });

  return (
    <>
      <style>
        {`
          @keyframes prism-anim {
            0% {
              transform: skew(calc(var(--angle-s) / 2), var(--angle-s)) 
                        rotate(calc(var(--angle-s) * -2)) 
                        translate3d(var(--pos-x-s), var(--pos-y-s), 0) 
                        scale3d(calc(var(--scale) / 1.8), var(--scale), 1);
            }
            100% {
              transform: skew(calc(var(--angle-e) / 2), var(--angle-e)) 
                        rotate(calc(var(--angle-e) * -2)) 
                        translate3d(var(--pos-x-e), var(--pos-y-e), 0) 
                        scale3d(calc(var(--scale) / 1.8), var(--scale), 1);
            }
          }
        `}
      </style>
      
      <div 
        className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
        style={{ 
          isolation: 'isolate',
          mixBlendMode: 'overlay'
        }}
      >
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute top-0 left-0"
            style={{
              '--pos-x-s': `${particle.posXStart}vw`,
              '--pos-y-s': `${particle.posYStart}vh`,
              '--angle-s': `${particle.angleStart}deg`,
              '--pos-x-e': `${particle.posXEnd}vw`,
              '--pos-y-e': `${particle.posYEnd}vh`,
              '--angle-e': `${particle.angleEnd}deg`,
              '--scale': particle.scale,
              '--opacity': particle.opacity,
              '--size': 0.015,
              width: 'calc(((100vmin + 100vmax) / 2) * var(--size))',
              height: 'calc(((100vmin + 100vmax) / 2) * var(--size))',
              backgroundImage: `linear-gradient(
                to bottom,
                oklch(0.8 0.3 300deg / ${particle.opacity}) 24%,
                oklch(0.8 0.2 300deg / ${particle.opacity}),
                oklch(0.8 0.2 300deg / ${particle.opacity}),
                oklch(0.95 0.2 270deg / ${particle.opacity}),
                oklch(0.95 0.2 270deg / ${particle.opacity}),
                oklch(0.95 0.2 240deg / ${particle.opacity}),
                oklch(0.95 0.2 240deg / ${particle.opacity}),
                oklch(0.95 0.1 210deg / ${particle.opacity}),
                oklch(0.95 0.1 210deg / ${particle.opacity}),
                oklch(0.95 0.1 180deg / ${particle.opacity}),
                oklch(0.95 0.1 180deg / ${particle.opacity}),
                oklch(0.95 0.1 150deg / ${particle.opacity}),
                oklch(0.95 0.1 150deg / ${particle.opacity}),
                oklch(0.95 0.1 120deg / ${particle.opacity}),
                oklch(0.95 0.1 120deg / ${particle.opacity}),
                oklch(0.95 0.2 90deg / ${particle.opacity}),
                oklch(0.95 0.2 90deg / ${particle.opacity}),
                oklch(0.95 0.2 60deg / ${particle.opacity}),
                oklch(0.95 0.2 60deg / ${particle.opacity}),
                oklch(0.95 0.2 30deg / ${particle.opacity}),
                oklch(0.95 0.2 30deg / ${particle.opacity}),
                oklch(0.8 0.2 0deg / ${particle.opacity}),
                oklch(0.8 0.2 0deg / ${particle.opacity}),
                oklch(0.8 0.2 0deg / ${particle.opacity}) 78%
              )`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '100% 100%',
              maskImage: 'radial-gradient(closest-side circle at center, white 30%, transparent)',
              WebkitMaskImage: 'radial-gradient(closest-side circle at center, white 30%, transparent)',
              transformOrigin: 'center top',
              willChange: 'transform',
              animation: `prism-anim ${particle.duration}s ${particle.delay}s ease-in-out ${particle.animationDirection} infinite`,
              filter: 'blur(1px)', // Optional blur for softer effect
            }}
          />
        ))}
      </div>
    </>
  );
};

export default PrismaticOverlay;

// Example usage component
// const ExampleUsage = () => {
//   return (
//     <div className="relative w-full h-screen overflow-hidden">
//       {/* Background image or color */}
//       <div 
//         className="absolute inset-0 bg-gray-800"
//         style={{
//           backgroundImage: `url('https://images.unsplash.com/photo-1597992350431-56cb7e28a7a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzMjM4NDZ8MHwxfHJhbmRvbXx8fHx8fHx8fDE3NDMwMjAzNDN8&ixlib=rb-4.0.3&q=80&w=1920')`,
//           backgroundPosition: 'center bottom',
//           backgroundSize: 'cover'
//         }}
//       />
      
//       {/* Your content goes here */}
//       <div className="relative z-10 flex items-center justify-center h-full">
//         <h1 className="text-6xl font-bold text-pink-400" style={{ color: 'PaleVioletRed' }}>
//           Prismatic Overlay
//         </h1>
//       </div>
      
//       {/* Prismatic overlay */}
//       <PrismaticOverlay particleCount={30} />
//     </div>
//   );
// };

// export default ExampleUsage;