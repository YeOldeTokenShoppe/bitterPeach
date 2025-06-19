import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  VStack,
  HStack,
  Image,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';

export default function CandleViewerModal({ isOpen, onClose, candleData }) {
  const bgColor = useColorModeValue('gray.900', 'gray.900');
  const textColor = useColorModeValue('purple.200', 'purple.200');
  
  if (!candleData) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay bg="rgba(30,27,75,0.8)" backdropFilter="blur(5px)" />
      <ModalContent
        bg={bgColor}
        color={textColor}
        borderRadius="xl"
        border="2px solid"
        borderColor="purple.500"
        boxShadow="0 0 30px rgba(139, 92, 246, 0.5)"
      >
        <ModalHeader
          fontSize="2xl"
          fontWeight="bold"
          textAlign="center"
          borderBottom="2px solid"
          borderColor="purple.700"
          pb={3}
        >
          Illuminati Candle
        </ModalHeader>
        <ModalCloseButton color="purple.400" />
        
        <ModalBody p={6}>
          <VStack spacing={6} align="stretch">
            {/* User Info Section */}
            <HStack spacing={4} align="center">
              {candleData.image ? (
                <Image
                  src={candleData.image}
                  alt={candleData.userName}
                  borderRadius="full"
                  boxSize="80px"
                  border="3px solid"
                  borderColor="purple.400"
                  objectFit="cover"
                />
              ) : (
                <Box
                  boxSize="80px"
                  borderRadius="full"
                  bg="purple.700"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="2xl"
                  fontWeight="bold"
                  border="3px solid"
                  borderColor="purple.400"
                >
                  {candleData.userName?.charAt(0).toUpperCase() || '?'}
                </Box>
              )}
              
              <VStack align="start" flex={1}>
                <Text fontSize="xl" fontWeight="bold" color="purple.100">
                  {candleData.userName || 'Anonymous'}
                </Text>
                <Text fontSize="sm" color="purple.300">
                  Candle #{candleData.id}
                </Text>
              </VStack>
            </HStack>
            
            <Divider borderColor="purple.700" />
            
            {/* Burn Info */}
            <Box
              bg="purple.900"
              p={4}
              borderRadius="md"
              border="1px solid"
              borderColor="purple.600"
            >
              <Text fontSize="sm" color="purple.400" mb={1}>
                Total Burned
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="purple.100">
                {candleData.burnedAmount || 0} ETH
              </Text>
            </Box>
            
            {/* Message */}
            {candleData.message && (
              <Box
                bg="gray.800"
                p={4}
                borderRadius="md"
                border="1px solid"
                borderColor="purple.700"
              >
                <Text fontSize="sm" color="purple.400" mb={2}>
                  Message
                </Text>
                <Text color="purple.200" fontStyle="italic">
                  "{candleData.message}"
                </Text>
              </Box>
            )}
            
            {/* Timestamp */}
            <Text fontSize="xs" color="purple.500" textAlign="center">
              Lit on {new Date(candleData.createdAt || Date.now()).toLocaleDateString()}
            </Text>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}