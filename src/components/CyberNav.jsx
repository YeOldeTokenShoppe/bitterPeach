import React, { useState, useEffect } from 'react';
import { Box, Text, IconButton, Image } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const CyberNav = ({ is80sMode = false }) => {
  const [hoveredTab, setHoveredTab] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const navItems = [
    // { id: '01', date: '01', title: 'HOME', path: '/home', thumbnail: '/rl80logo.png' },
    { id: '01', date: 'NATIV80', title: 'Behold! A digital token is born', path: '/cyborg-temple', thumbnail: '/sacred.png' },
    { id: '02', date: 'ILLUMIN80', title: 'Your shrine to shine', path: '/rl80-sword', thumbnail: '/fight1.jpg' },
    { id: '03', date: 'LIQUID80', title: 'Stay hydrated with RL80', path: '/fountain.html', thumbnail: '/fountain.png' },
    { id: '04', date: 'INFIN80', title: 'A digital infinity', path: '/sci-fi-lab', thumbnail: '/vvv.jpg' },
  ];

  // Mobile menu toggle button
  if (isMobile) {
    return (
      <>
        <IconButton
          position="fixed"
          top="20px"
          right="20px"
          zIndex="10000"
          aria-label="Menu"
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {isMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="3" y1="12" x2="21" y2="12"/>
                  <line x1="3" y1="18" x2="21" y2="18"/>
                </>
              )}
            </svg>
          }
          color={is80sMode ? "#00ff41" : "white"}
          bg="rgba(0, 0, 0, 0.1)"
          backdropFilter="blur(10px)"
          size="md"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          _hover={{
            bg: "rgba(0, 0, 0, 0.1)",
          }}
        />
        
        {isMenuOpen && (
          <Box
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            bg="rgba(0, 0, 0, 0.95)"
            backdropFilter="blur(20px)"
            zIndex="9999"
            display="flex"
            flexDirection="column"
            justifyContent="center"
            alignItems="center"
            gap="20px"
            padding="20px"
          >
            {navItems.map((item) => {
              const isActive = router.pathname === item.path;
              return (
                <Link key={item.id} href={item.path} passHref>
                  <Box
                    display="flex"
                    flexDirection="row"
                    alignItems="center"
                    gap="15px"
                    cursor="pointer"
                    padding="20px"
                    borderRadius="10px"
                    bg={isActive ? (is80sMode ? "#D946EF" : "#f6f841") : "transparent"}
                    onClick={() => setIsMenuOpen(false)}
                    _hover={{
                      bg: is80sMode ? "#D946EF" : "#f6f841",
                      textDecoration: 'none'
                    }}
                  >
                    <Box width="50px" height="50px" overflow="hidden" borderRadius="5px" flexShrink="0">
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        width="100%"
                        height="100%"
                        objectFit="cover"
                        opacity={isActive ? 1 : 0.8}
                        filter={is80sMode && !isActive ? 'hue-rotate(270deg) saturate(1.5)' : 'none'}
                      />
                    </Box>
                    <Box display="flex" flexDirection="column">
                      <Text
                        color={isActive ? '#000000' : (is80sMode ? "#67e8f9" : '#ffffff')}
                        fontWeight="700"
                        fontSize="14px"
                        fontFamily="'Rajdhani', sans-serif"
                        textAlign="left"
                      >
                        {item.date}
                      </Text>
                      <Text
                        color={isActive ? '#000000' : (is80sMode ? "#67e8f9" : '#ffffff')}
                        fontSize="24px"
                        fontWeight="700"
                        fontFamily="'Rajdhani', sans-serif"
                      >
                        {item.title}
                      </Text>
                    </Box>
                  </Box>
                </Link>
              );
            })}
          </Box>
        )}
      </>
    );
  }

  return (
    <Box
      position="fixed"
      bottom="0"
      left="0"
      right="0"
      zIndex="9999"
      display="flex"
      justifyContent="center"
      padding="20px"
      pointerEvents="none"
    >
      <Box
        display="flex"
        gap="10px"
        backdropFilter="blur(20px)"
        borderRadius="10px"
        padding="10px"
        pointerEvents="auto"
        bg="rgba(0, 0, 0, 0.7)"
        border="1px solid"
        borderColor={is80sMode ? "rgba(217, 70, 239, 0.3)" : "rgba(200, 150, 255, 0.3)"}
        boxShadow={is80sMode 
          ? "0 0 20px rgba(217, 70, 239, 0.4), 0 0 40px rgba(217, 70, 239, 0.2), inset 0 0 30px rgba(217, 70, 239, 0.3), inset 0 0 60px rgba(217, 70, 239, 0.1)" 
          : "0 0 20px rgba(200, 150, 255, 0.4), 0 0 40px rgba(200, 150, 255, 0.2), inset 0 0 30px rgba(200, 150, 255, 0.3), inset 0 0 60px rgba(200, 150, 255, 0.1)"}
      >
        {navItems.map((item) => {
          const isActive = router.pathname === item.path;
          const isHovered = hoveredTab === item.id;

          return (
            <Link key={item.id} href={item.path} passHref>
              <Box
                position="relative"
                width="300px"
                height="70px"
                display="flex"
                alignItems="center"
                cursor="pointer"
                overflow="hidden"
                borderBottom="1px solid"
                borderColor={isHovered || isActive ? (is80sMode ? '#D946EF' : '#000000') : (is80sMode ? 'rgba(217, 70, 239, 0.25)' : 'rgba(255, 255, 255, 0.25)')}
                bg={isHovered || isActive ? (is80sMode ? '#D946EF' : '#f6f841') : 'rgba(0,0,0,0)'}
                clipPath="polygon(95% 0%, 100% 20%, 100% 100%, 0 100%, 0 0)"
                transition="all 0.3s ease"
                onMouseEnter={() => setHoveredTab(item.id)}
                onMouseLeave={() => setHoveredTab(null)}
                _hover={{
                  textDecoration: 'none'
                }}
              >
                <Box
                  position="absolute"
                  left="85px"
                  padding="10px 0"
                  width="calc(100% - 85px)"
                  height="100%"
                  display="flex"
                  flexDirection="column"
                  justifyContent="center"
                >
                  <Text
                    display="block"
                    textAlign="left"
                    color={isHovered || isActive ? '#000000' : (is80sMode ? '#67e8f9' : '#ffffff')}
                    fontWeight="700"
                    fontSize="20px"
                    marginBottom="0px"
                    fontFamily="'Rajdhani', sans-serif"
                    transition="color 0.3s ease"
                  >
                    {item.date}
                  </Text>
                  <Text
                    display="block"
                    textAlign="left"
                    color={isHovered || isActive ? '#000000' : (is80sMode ? '#67e8f9' : '#ffffff')}
                    fontSize="16px"
                    fontWeight="400"
                    textTransform="none"
                    lineHeight="20px"
                    fontFamily="'Rajdhani', sans-serif"
                    transition="color 0.3s ease"
                  >
                    {item.title}
                  </Text>
                </Box>
                <Box
                  position="absolute"
                  left="0"
                  width="70px"
                  height="70px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden"
                  borderRight="1px solid"
                  borderColor={isHovered || isActive ? (is80sMode ? '#D946EF' : '#000000') : (is80sMode ? 'rgba(217, 70, 239, 0.25)' : 'rgba(255, 255, 255, 0.25)')}
                  transition="all 0.3s ease"
                >
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    width="100%"
                    height="100%"
                    objectFit="cover"
                    opacity={isHovered || isActive ? 1 : 0.7}
                    filter={is80sMode && !isHovered && !isActive ? 'hue-rotate(270deg) saturate(1.5)' : 'none'}
                    transition="all 0.3s ease"
                  />
                </Box>
              </Box>
            </Link>
          );
        })}
      </Box>
    </Box>
  );
};

export default CyberNav;