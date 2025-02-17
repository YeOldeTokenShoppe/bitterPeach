import React, { useState } from "react";
import {
  Box,
  Button,
  Image,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
  Flex,
} from "@chakra-ui/react";

const MoonRoomModal = ({ isOpen, onClose }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={isFullScreen ? "full" : "xl"}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <Flex alignItems="center" justifyContent="space-between" width="100%">
            <Text color="black">Moon Room</Text>
            <Button onClick={toggleFullScreen} ml={4}>
              {isFullScreen ? "Exit Full Screen" : "Full Screen"}
            </Button>
          </Flex>
          <Text fontSize="sm" color="gray.500" mt={2}>
            Click to shoot. Hold mouse down to move room around. Hold down shift
            key + mouse down to handle moon.
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <iframe
            src="http://127.0.0.1:5500/public/html/MoonRoom.html"
            title="Moon Room"
            scrolling="no"
            style={{
              width: "100%",
              height: isFullScreen ? "90vh" : "40rem",
            }}
          ></iframe>
        </ModalBody>
        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default MoonRoomModal;
