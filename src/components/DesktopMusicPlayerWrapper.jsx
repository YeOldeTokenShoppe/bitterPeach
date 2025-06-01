import React, { memo } from 'react';
import { Box } from '@chakra-ui/react';

/**
 * Performance wrapper for desktop music player
 * Isolates renders and prevents layout recalculations that cause 3D scene blinking
 */
const DesktopMusicPlayerWrapper = memo(({ children, isVisible }) => {
  return (
    <Box
      position="fixed"
      bottom="0"
      right="0"
      width="380px"
      height="auto"
      minHeight="200px"
      zIndex={10000}
      display={isVisible ? 'block' : 'none'}
      visibility={isVisible ? 'visible' : 'hidden'}
      pointerEvents={isVisible ? 'auto' : 'none'}
      background="rgba(0, 0, 0, 0.85)"
      borderRadius="8px 0 0 0"
      boxShadow="0 -2px 10px rgba(0, 0, 0, 0.3)"
      overflow="hidden"
      // Performance optimizations
      transform="translate3d(0, 0, 0)" // Force GPU acceleration
      willChange="transform" // Hint browser about animations
      contain="layout style paint" // Isolate rendering
      sx={{
        // Prevent layout recalculations
        backfaceVisibility: 'hidden',
        perspective: 1000,
        // Smooth transitions
        transition: 'opacity 0.3s ease-in-out',
        opacity: isVisible ? 1 : 0,
      }}
    >
      {children}
    </Box>
  );
});

DesktopMusicPlayerWrapper.displayName = 'DesktopMusicPlayerWrapper';

export default DesktopMusicPlayerWrapper;