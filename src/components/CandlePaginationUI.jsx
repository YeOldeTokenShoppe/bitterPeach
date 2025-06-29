import React from 'react';
import { Box, IconButton } from '@chakra-ui/react';

const CandlePaginationUI = ({ 
  currentPage, 
  totalPages, 
  candlesPerPage,
  totalCandles,
  onPageChange,
  is80sMode = false,
  isMobile = false 
}) => {
  if (totalPages <= 1) return null;

  return (
    <Box
      position="fixed"
      bottom={isMobile ? "120px" : "20px"}
      left={isMobile ? "50%" : "20px"}
      transform={isMobile ? "translateX(-50%)" : "none"}
      zIndex="90"
      display="flex"
      flexDirection="column"
      alignItems={isMobile ? "center" : "flex-start"}
      gap="8px"
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap="8px"
        p="8px 12px"
        bg="rgba(0, 0, 0, 0.6)"
        borderRadius="20px"
        backdropFilter="blur(15px)"
        border="1px solid"
        borderColor={is80sMode ? "rgba(217, 70, 239, 0.3)" : "rgba(255, 255, 255, 0.2)"}
        boxShadow="0 4px 20px rgba(0, 0, 0, 0.3)"
      >
        {/* Previous button */}
        <IconButton
          size="xs"
          variant="ghost"
          color={is80sMode ? "#00ff41" : "white"}
          onClick={() => onPageChange(currentPage - 1)}
          isDisabled={currentPage === 0}
          opacity={currentPage === 0 ? 0.3 : 1}
          minW="24px"
          h="24px"
          _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          }
        />
        
        {/* Page dots */}
        <Box display="flex" gap="6px" alignItems="center">
          {Array.from({ length: totalPages }, (_, i) => (
            <Box
              key={i}
              width={i === currentPage ? "16px" : "6px"}
              height="6px"
              borderRadius={i === currentPage ? "8px" : "50%"}
              bg={i === currentPage ? (is80sMode ? "#00ff41" : "white") : "rgba(255, 255, 255, 0.3)"}
              cursor="pointer"
              onClick={() => onPageChange(i)}
              transition="all 0.3s ease"
              _hover={{ 
                transform: "scale(1.2)",
                bg: i === currentPage ? (is80sMode ? "#00ff41" : "white") : "rgba(255, 255, 255, 0.5)"
              }}
            />
          ))}
        </Box>
        
        {/* Next button */}
        <IconButton
          size="xs"
          variant="ghost"
          color={is80sMode ? "#00ff41" : "white"}
          onClick={() => onPageChange(currentPage + 1)}
          isDisabled={currentPage === totalPages - 1}
          opacity={currentPage === totalPages - 1 ? 0.3 : 1}
          minW="24px"
          h="24px"
          _hover={{ bg: "rgba(255, 255, 255, 0.1)" }}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          }
        />
      </Box>
      
      {/* Candle count indicator */}
      <Box
        textAlign="center"
        fontSize="12px"
        color={is80sMode ? "#67e8f9" : "white"}
        opacity="0.7"
        fontFamily="'Rajdhani', sans-serif"
        letterSpacing="0.5px"
        ml={isMobile ? "0" : "2px"}
      >
        {currentPage * candlesPerPage + 1}-{Math.min((currentPage + 1) * candlesPerPage, totalCandles)} of {totalCandles}
      </Box>
    </Box>
  );
};

export default CandlePaginationUI;