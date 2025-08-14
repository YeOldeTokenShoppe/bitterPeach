import React, { useState, useEffect } from 'react';
import { useMusic } from '../contexts/MusicContext';
import { Box, IconButton } from '@chakra-ui/react';

const GlobalMusicControl = () => {
  const { 
    audioRef, 
    isPlaying, 
    setIsPlaying,
    currentTrack,
    showSpotify,
    setShowSpotify
  } = useMusic();
  
  const [isMinimized, setIsMinimized] = useState(true);
  const [hasActiveMusic, setHasActiveMusic] = useState(false);

  // Check if music is active (has a source)
  useEffect(() => {
    if (audioRef?.current?.src) {
      setHasActiveMusic(true);
    } else {
      setHasActiveMusic(false);
    }
  }, [audioRef?.current?.src]);

  // Don't show if no music has been loaded
  if (!hasActiveMusic) return null;

  const handlePlayPause = () => {
    if (!audioRef?.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (audioRef?.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      setIsPlaying(false);
      setShowSpotify(false);
      setHasActiveMusic(false);
    }
  };

  return (
    <Box
      position="fixed"
      bottom="20px"
      right="20px"
      zIndex={10000}
      bg="rgba(0, 0, 0, 0.9)"
      borderRadius="50px"
      border="1px solid rgba(255, 255, 255, 0.2)"
      backdropFilter="blur(10px)"
      transition="all 0.3s ease"
      display="flex"
      alignItems="center"
      gap={2}
      p={isMinimized ? 1 : 2}
      _hover={{
        border: "1px solid rgba(255, 255, 255, 0.4)",
        transform: "scale(1.05)"
      }}
    >
      {/* Music Icon / Minimize Button */}
      <IconButton
        size="sm"
        variant="ghost"
        color="white"
        onClick={() => setIsMinimized(!isMinimized)}
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
          </svg>
        }
        _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
        aria-label="Toggle music controls"
      />

      {/* Expanded Controls */}
      {!isMinimized && (
        <>
          {/* Play/Pause Button */}
          <IconButton
            size="sm"
            variant="ghost"
            color="white"
            onClick={handlePlayPause}
            icon={
              isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )
            }
            _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
            aria-label={isPlaying ? "Pause" : "Play"}
          />

          {/* Stop/Close Button */}
          <IconButton
            size="sm"
            variant="ghost"
            color="red.400"
            onClick={handleStop}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h12v12H6z"/>
              </svg>
            }
            _hover={{ bg: "rgba(255, 0, 0, 0.2)" }}
            aria-label="Stop music"
          />
        </>
      )}

      {/* Visual Indicator when playing */}
      {isPlaying && isMinimized && (
        <Box
          position="absolute"
          top="-2px"
          right="-2px"
          width="8px"
          height="8px"
          bg="#00ff41"
          borderRadius="50%"
          animation="pulse 2s infinite"
          sx={{
            '@keyframes pulse': {
              '0%': { opacity: 1 },
              '50%': { opacity: 0.4 },
              '100%': { opacity: 1 }
            }
          }}
        />
      )}
    </Box>
  );
};

export default GlobalMusicControl;