"use client";
import React, { useState, useEffect } from "react";
import {
  Button,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Box,
  Image as ChakraImage,
  Text,
} from "@chakra-ui/react";
import { useDisconnect } from "thirdweb/react";
import { ethers } from "ethers";
import { useActiveAccount, TransactionButton } from "thirdweb/react";
import ConnectButton2 from "./ConnectButton2";
import { burn } from "thirdweb/extensions/erc20";
import { CONTRACT } from "../utilities/constants";
import ImageSelectionModal from "./ImageSelectionModal";
import TokenText from "./TokenText";
import { auth } from "../utilities/firebaseClient";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../utilities/firebaseClient";
import { useUser } from "@clerk/nextjs";

function BurnModal({
  isOpen,
  onClose,
  onTransactionComplete,
  selectedImage,
  setSelectedImage,
  burnedAmount,
  setBurnedAmount,
  setIsResultSaved,
  setSaveMessage,
  isResultSaved,
  saveMessage,
  isCandleLowered,
}) {
  const account = useActiveAccount();
  const signer = account?.address || "";
  const { disconnect } = useDisconnect();
  const [isFlameVisible, setIsFlameVisible] = useState(false);
  const [value, setValue] = useState(1000);
  const [transactionStatus, setTransactionStatus] = useState("idle");
  const [transactionCompleted, setTransactionCompleted] = useState(false);
  const [isImageSelectionModalOpen, setIsImageSelectionModalOpen] =
    useState(false);

  const [userConfirmed, setUserConfirmed] = useState(false);

  const [errorMessage, setErrorMessage] = useState(null);
  const { user } = useUser();
  const [userName, setUserName] = useState(
    user?.username || user?.firstName || "Anonymous"
  ); // Initialize with user's name if available
  const [userMessage, setUserMessage] = useState("");
  const [CustomName, setCustomName] = useState("");
  const [frameChoice, setFrameChoice] = useState("");
  const [zoom, setZoom] = useState(1);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [croppedArea, setCroppedArea] = useState(null);
  const [isScaledDown, setIsScaledDown] = useState(false);

  const shouldShowFrame = (imageUrl) => {
    if (!imageUrl) return false; // Ensure imageUrl exists
    return (
      imageUrl.includes("userImages") ||
      imageUrl === avatarUrl ||
      selectedImage?.isFirstImage
    );
  };

  const getFormattedImageUrl = (url) => {
    if (!url) return "";
    // Only modify Twitter URLs to get the 'bigger' size
    if (url.includes("pbs.twimg.com")) {
      return url.replace("_normal", ""); // Replace '_normal' with '_bigger' for a larger version
    }
    // Only add `?alt=media` for Firebase URLs
    if (url.includes("firebasestorage")) {
      return url.includes("alt=media") ? url : `${url}&alt=media`;
    }
    return url; // Return external URLs as-is
  };

  let avatarUrl = user ? user.imageUrl : "/defaultAvatar.png"; // Fallback to default if user has no profile image
  useEffect(() => {
    console.log("Selected Image in BurnModal after save:", selectedImage);
  }, [selectedImage]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    document.body.appendChild(script);

    // Clean up script when component unmounts
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    // Fetch the selected image if needed (e.g., after saving)
    const handleFetchImage = async () => {
      try {
        const userId = user?.id;
        const response = await fetch(`/api/fetchImageData?userId=${userId}`);
        const resultData = await response.json();

        const imageUrl = resultData.image.src;

        setSelectedImage({
          src: imageUrl,
          isFirstImage: resultData.image.isFirstImage,
          isVideo: resultData.image.isVideo,
          frameChoice: resultData.image.frameChoice,
        });

        setSaveMessage(resultData.userMessage || "");
      } catch (error) {
        console.error("Error fetching saved image:", error);
      }
    };

    if (transactionStatus === "completed" && isResultSaved) {
      handleFetchImage();
    }
  }, [transactionStatus, isResultSaved, user, setSelectedImage]);

  // Ensure the fetched image is displayed correctly, including the frame
  {
    selectedImage && selectedImage.src && (
      <Box
        as="img"
        src={getFormattedImageUrl(selectedImage.src)}
        alt="Selected"
        position="absolute"
        top="60%"
        left="50%"
        transform="translate(-50%, -50%)"
        width="calc(100% - 2rem)"
        height="auto"
        zIndex="-1"
        borderRadius={selectedImage.isFirstImage ? "50%" : "0"}
      />
    );
  }

  const handleClose = () => {
    // Reset the image and any other states here
    setSelectedImage(null);
    setIsResultSaved(false);

    // Close the modal
    onClose();
  };

  const handleOpenImageSelectionModal = () => {
    if (user) {
      setIsImageSelectionModalOpen(true);
    } else {
      setIsAuthModalOpen(true); // Open AuthModal if not signed in
    }
  };

  const handleCloseImageSelectionModal = () => {
    setIsImageSelectionModalOpen(false);

    // Reset states only if the result wasn't saved
    if (!isResultSaved) {
      setSelectedImage(null); // Clear the selected image
      setUserMessage("");
      setCustomName("");
      setFrameChoice("frame1");
      setSaveMessage("");
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedArea(null);
      setBurnedAmount(0);
    }
  };
  const handleSaveResult = ({ userName, image, userMessage }) => {
    console.log(`Saving Result - Image URL: ${image.src}`);
    setUserName(userName);
    setSelectedImage(image); // Assuming `image` has an `isFirstImage` property
    setUserMessage(userMessage);
    console.log("Selected Image in BurnModal after save:", image); // Log after saving
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size="md" motionPreset="2">
        <ModalOverlay style={{ backdropFilter: "blur(8px)" }} />
        <ModalContent
          bg="#1b1724"
          borderRadius="lg"
          border="2px"
          borderColor="#8e662b"
        >
          <ModalHeader
            fontSize="2.3rem"
            fontFamily={"UnifrakturCook"}
            color="#8e662b"
            style={{ borderBottom: "1px solid #8e662b" }}
          >
            {transactionStatus === "completed"
              ? "Transaction Complete!"
              : "Burn an Offering?"}
          </ModalHeader>

          {transactionStatus === "completed" && isResultSaved && (
            <Text fontSize="large" align={"center"} ml={7} mr={7} m={3}>
              {saveMessage
                ? saveMessage
                : "Your transaction has been completed successfully."}
            </Text>
          )}
          <ModalBody
            mt={"-3rem"}
            className={
              transactionStatus === "completed" && isResultSaved
                ? ""
                : isFlameVisible
                ? "gradient-background"
                : ""
            }
          >
            {transactionStatus === "pending" ? (
              <Flex
                justifyContent="center"
                alignItems="center"
                flexDirection="column"
                marginTop="10rem"
                marginBottom="3rem"
              >
                <TokenText />
                <Text
                  className="blink"
                  style={{ fontSize: "20px", marginTop: "2rem" }}
                >
                  Please wait - transaction pending...
                </Text>
              </Flex>
            ) : (
              <div style={{ position: "relative", marginTop: "5rem" }}>
                <div className="holder" style={{ margin: "0 auto" }}>
                  <div
                    className="candle"
                    style={{
                      position: "relative",
                      transform: isScaledDown ? "scale(0.5)" : "scale(1)",
                      transition: "transform 0.5s ease",
                      top: isCandleLowered ? "0rem" : "7rem",
                    }}
                  >
                    <div className="thread"></div>
                    {isFlameVisible ? (
                      <>
                        <div className="blinking-glow"></div>
                        <div className="glow"></div>
                        <div className="flame"></div>
                      </>
                    ) : (
                      <div className="unlit-candle"></div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {transactionStatus === "completed" && !isResultSaved && (
              <>
                <div>
                  <p style={{ marginTop: "2rem" }}>{`Thanks, ${userName}!`}</p>
                </div>
              </>
            )}

            {transactionStatus === "completed" && isResultSaved && (
              <div style={{ textAlign: "center" }}>
                <Box
                  position="absolute"
                  top={"7rem"}
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  height="12rem"
                  width="90%"
                  mt="5"
                  zIndex={-1}
                >
                  {selectedImage &&
                    !selectedImage.isVideo &&
                    selectedImage.frameChoice &&
                    shouldShowFrame(selectedImage.src) && (
                      <ChakraImage
                        src={`/${selectedImage.frameChoice}.png`}
                        alt="Frame"
                        position="absolute"
                        top="0"
                        left="0"
                        width="100%"
                        height="100%"
                        objectFit="contain"
                        zIndex="200"
                        unoptimized
                      />
                    )}

                  {selectedImage && selectedImage.src && (
                    <>
                      {selectedImage.isVideo ? (
                        <Box
                          position="relative"
                          width="100%"
                          height="auto"
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Box
                            as="video"
                            src={getFormattedImageUrl(selectedImage.src)}
                            autoPlay
                            loop
                            muted
                            playsInline
                            style={{
                              position: "absolute",
                              width: "100%",
                              height: "auto",
                              zIndex: "1",
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          display="flex"
                          justifyContent="center"
                          alignItems="center"
                          width="100%"
                          height="100%"
                        >
                          <Box
                            as="img"
                            src={getFormattedImageUrl(selectedImage.src)}
                            alt="Selected Image"
                            style={{
                              width: "8rem",
                              height: "auto",
                              zIndex: "1",
                              borderRadius: selectedImage.isFirstImage
                                ? "50%"
                                : "0",
                            }}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </Box>
                <p>{userMessage}</p>
                <p>{saveMessage}</p>
              </div>
            )}
            {transactionStatus === "idle" && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  flexDirection: "column",
                  alignItems: "center",
                  paddingTop: "20px",
                }}
              >
                <p style={{ paddingBottom: "15px", marginTop: "2rem" }}>
                  Choose token amount to burn.
                </p>
                <NumberInput
                  size="lg"
                  maxW={32}
                  defaultValue={1000}
                  min={0}
                  step={1000}
                  value={value}
                  onChange={(valueAsString, valueAsNumber) =>
                    setValue(valueAsNumber)
                  }
                >
                  <NumberInputField color="white" />
                  <NumberInputStepper>
                    <NumberIncrementStepper color="white" />
                    <NumberDecrementStepper color="white" />
                  </NumberInputStepper>
                </NumberInput>
              </div>
            )}
          </ModalBody>
          <ModalFooter justifyContent="center">
            {!account ? (
              <ConnectButton2 />
            ) : transactionStatus !== "completed" && !isResultSaved ? (
              <TransactionButton
                className="burnButton"
                transaction={() =>
                  burn({
                    contract: CONTRACT,
                    amount: ethers.utils.parseUnits(value.toString(), "ether"),
                  })
                }
                onTransactionSent={() => {
                  setTransactionStatus("pending");
                }}
                onTransactionConfirmed={(receipt) => {
                  setIsFlameVisible(true);
                  setTransactionStatus("completed");
                  setTransactionCompleted(true);
                  setBurnedAmount(value);

                  console.log("Image after transaction:", selectedImage);

                  if (typeof onTransactionComplete === "function") {
                    onTransactionComplete();
                  }
                }}
                onError={(error) => {
                  setTransactionStatus("failed");
                  setErrorMessage(error.message);
                  console.error("Transaction failed:", error);
                }}
              >
                {transactionStatus === "pending"
                  ? "Transaction Pending..."
                  : transactionStatus === "failed"
                  ? "Transaction Failed"
                  : "Burn Offering"}
                <span className="shimmer"></span>
              </TransactionButton>
            ) : transactionCompleted && !isResultSaved ? (
              <Button
                width="30%"
                className="shimmer-button"
                onClick={handleOpenImageSelectionModal}
              >
                <span className="text">
                  Join the <br />
                  Hall of Flame
                </span>
                <span className="shimmer"></span>
              </Button>
            ) : (
              <Button
                mt={"-3rem"}
                className="shimmer-button"
                onClick={handleClose}
              >
                Return to Gallery
                <span className="shimmer"></span>
              </Button>
            )}
          </ModalFooter>
        </ModalContent>
        <ImageSelectionModal
          isOpen={isImageSelectionModalOpen}
          setIsImageSelectionModalOpen={setIsImageSelectionModalOpen}
          onClose={handleCloseImageSelectionModal}
          setSelectedImage={setSelectedImage}
          burnedAmount={burnedAmount}
          setIsResultSaved={setIsResultSaved}
          setSaveMessage={setSaveMessage}
          onSaveResult={(savedImage) => {
            console.log("Saving image in BurnModal:", savedImage);
            setSelectedImage(savedImage);
            setIsResultSaved(true);
            setIsScaledDown(true); // Scale down the candle when the result is saved
          }}
        />
      </Modal>
    </>
  );
}

export default BurnModal;
