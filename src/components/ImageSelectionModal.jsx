"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  Alert,
  AlertIcon,
  Input,
  Text,
  Image,
} from "@chakra-ui/react";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import {
  getStorage,
  ref,
  deleteObject,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import { db, auth } from "../utilities/firebaseClient";
import Carousel8 from "./Carousel8";
import { useUser } from "@clerk/nextjs";
import UploadImage from "../utilities/UploadImage";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "../utilities/cropImageUtility";
import { useRouter } from "next/router";
import BurnModal from "./BurnModal";
import BurnGallery from "./BurnGallery";

function ImageSelectionModal({
  isOpen,
  onOpen,
  onClose,
  burnedAmount,
  isResultSaved,
  setIsResultSaved,
  setSaveMessage,
  onSaveResult,
}) {
  const { user } = useUser();
  const [showWarning, setShowWarning] = useState(false);
  const [showLoginError, setShowLoginError] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [uploadedImage, setUploadedImage] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [customName, setCustomName] = useState("");
  const [selectedImageObject, setSelectedImageObject] = useState(null);
  const [showImageWarning, setShowImageWarning] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [frameChoice, setFrameChoice] = useState("frame0");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [isImageSelectionModalOpen, setIsImageSelectionModalOpen] =
    useState(false);
  const router = useRouter();
  const [isCandleLowered, setIsCandleLowered] = useState(false);
  const [isFirstImage, setIsFirstImage] = useState(false);
  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  let avatarUrl = user ? user.imageUrl : "/defaultAvatar.png";
  const params = new URLSearchParams();
  const handleSave = async () => {
    try {
      const croppedImage = await getCroppedImg(uploadedImage, croppedArea);

      // Initialize Firebase storage
      const storage = getStorage(); // Define storage
      const storageRef = ref(
        storage,
        `userImages/${user.id}/${Date.now()}.jpg`
      );

      // Upload the cropped image to Firebase Storage
      await uploadString(storageRef, croppedImage, "data_url");
      const downloadURL = await getDownloadURL(storageRef);

      // Save metadata and image URL to Firestore
      const selectedFrame = frameChoice || "frame1";
      const userName = customName || user.username || "Anonymous";
      const userId = user?.id;

      await setDoc(doc(db, "results", userId), {
        userName,
        image: {
          src: downloadURL, // Save the cropped image URL
          isFirstImage: downloadURL === avatarUrl, // Check if it’s the first image
          frameChoice: selectedFrame,
        },
        userMessage,
        createdAt: serverTimestamp(),
        burnedAmount: burnedAmount,
      });

      setIsResultSaved(true);
      setSaveMessage(
        "You've been saved and you're entered in the next drawing!"
      );
      onClose();
    } catch (error) {
      console.error("Error cropping or saving the image", error);
    }
  };
  const framePaths = {
    frame0: "/frame0.png",
    frame1: "/frame1.png", // Replace with actual paths
    frame2: "/frame2.png",
    frame3: "/frame3.png",
  };

  const imageUrls = [
    avatarUrl,
    "/smoke.mp4",
    "/oscar.mp4",
    "/wildRide.mp4",
    "/feelsGood.mp4",
  ];

  avatarUrl = `${avatarUrl}?${params.toString()}`;

  useEffect(() => {
    if (selectedImage) {
      setSelectedImageObject({
        src: selectedImage,
        isFirstImage: selectedImage === avatarUrl,
      });
    }
  }, [selectedImage, avatarUrl]);

  const handleOpen = () => {
    if (!user) {
      openSignIn();
    } else {
      onOpen();
    }
  };

  const handleClose = () => {
    if (!isResultSaved) {
      setShowWarning(true);
    } else {
      onClose();
    }
  };
  const handleCloseImageSelectionModal = () => {
    onClose();
  };

  const normalizeUrl = (url) => {
    try {
      const urlObj = new URL(url);
      return urlObj.origin + urlObj.pathname;
    } catch (error) {
      console.error("Invalid URL", error);
      return url;
    }
  };
  const handleImageSelection = (image, index) => {
    if (image && image.url) {
      const isFirstImage = index === 0; // Flag as first image if it's the avatar
      const frameForAvatar = isFirstImage ? "frame1" : frameChoice; // Apply frame1 for the avatar

      setSelectedImage({
        url: image.url,
        isFirstImage, // Mark whether it's the first image (avatar)
        isVideo: image.url.endsWith(".mp4"), // Handle if the media is a video
        frameChoice: frameForAvatar, // Apply the correct frame for the avatar or the user's frame selection
      });

      console.log(
        "Selected image from carousel:",
        image,
        "Is first image:",
        isFirstImage,
        "Frame choice:",
        frameForAvatar
      );
    } else {
      console.error("No valid image selected.");
    }
  };

  const handleSaveResult = async () => {
    try {
      if (!selectedImage && !uploadedImage) {
        setShowImageWarning(true); // Show the alert if no image is selected
        return;
      }

      let imageToSave = uploadedImage || selectedImage?.url;

      if (!imageToSave) {
        console.error("No valid image selected for saving.");
        return;
      }

      let downloadURL = imageToSave;

      // Handle cropping for uploaded images
      if (uploadedImage && croppedArea) {
        const croppedImageUrl = await getCroppedImg(uploadedImage, croppedArea);

        if (
          typeof croppedImageUrl === "string" &&
          croppedImageUrl.startsWith("data:")
        ) {
          const storage = getStorage();
          const storageRef = ref(
            storage,
            `userImages/${user.id}/${Date.now()}.jpg`
          );
          await uploadString(storageRef, croppedImageUrl, "data_url");
          downloadURL = await getDownloadURL(storageRef); // Get Firebase URL for the cropped image
        } else {
          throw new Error("Invalid cropped image format.");
        }
      }

      const isFirstImage = uploadedImage
        ? false
        : selectedImage?.isFirstImage || false; // Fallback to false if no selection
      const selectedFrame = selectedImage?.isVideo
        ? null
        : isFirstImage
        ? "frame1"
        : frameChoice || "frame1"; // Use frame1 for the avatar
      const userName = customName || user.username || "Anonymous";
      const userId = user.id;

      // Save result in Firestore
      await setDoc(doc(db, "results", userId), {
        userName,
        image: {
          src: downloadURL,
          isFirstImage: isFirstImage,
          isVideo: selectedImage?.isVideo || false, // Ensure the video flag is saved
          frameChoice: selectedFrame, // Frame only for non-videos
        },
        userMessage: userMessage || "",
        createdAt: serverTimestamp(),
        burnedAmount: burnedAmount || 0,
      });

      // Invoke onSaveResult to pass the saved image data back to BurnModal
      onSaveResult({
        src: downloadURL, // The image URL
        isFirstImage: isFirstImage, // Avatar image flag
        isVideo: selectedImage?.isVideo || false, // Video flag
        frameChoice: selectedFrame, // Frame choice
      });
      console.log("Saving image:", downloadURL, "isFirstImage:", isFirstImage);
      setIsResultSaved(true);
      setSaveMessage(
        "You've been saved and you're entered in the next drawing!"
      );
      onClose(); // Close the modal after save
      router.push("/gallery"); // Redirect to the gallery page
      setIsCandleLowered(true);
    } catch (error) {
      console.error("Error saving result:", error);
    }
  };

  return (
    <>
      <Button width="100%" onClick={handleOpen}>
        Join the Hall of Flame
      </Button>
      {showLoginError && (
        <Alert status="error">
          <AlertIcon />
          You must be logged in.
        </Alert>
      )}
      <Modal isOpen={isOpen} onClose={handleCloseImageSelectionModal}>
        <ModalOverlay style={{ backdropFilter: "blur(10px)" }} />
        <ModalContent
          bg="#1b1724"
          border="2px"
          borderColor="#8e662b"
          width="30rem"
          maxWidth="50%"
          height="auto"
          maxHeight="90vh"
          overflowY="auto"
        >
          <ModalHeader style={{ textAlign: "center" }} paddingTop={5}>
            <span
              style={{
                fontFamily: "UnifrakturCook",
                fontSize: "1.5rem",
                color: "#8e662b",
              }}
            >
              Than<span style={{ fontFamily: "New Rocker" }}>{"k"}</span>s,{" "}
              <span style={{ fontFamily: "New Rocker" }}>
                {user ? user.username : "Guest"}!
              </span>{" "}
              You&apos;re a Saint!
            </span>
            <br />
            <Text fontSize="sm" mt={4} mb={1}>
              Select an image to feature in the main gallery or upload your own.
            </Text>
          </ModalHeader>
          <ModalBody>
            {showWarning && (
              <Alert
                status="warning"
                onClose={() => setShowWarning(false)}
                backgroundColor="#2b8597"
                fontSize={"small"}
                height={"50px"}
              >
                <AlertIcon height="100%" />
                {
                  "You haven't saved your result. Are you sure you want to close?"
                }
                <Button onClick={onClose} marginRight="1rem">
                  Yes
                </Button>
                <Button onClick={() => setShowWarning(false)}>No</Button>
              </Alert>
            )}
            <div style={{ overflow: "hidden" }}>
              <Carousel8
                images={imageUrls.map((url) => ({
                  url: url,
                  content: url.endsWith(".mp4") ? (
                    <video
                      src={url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <img src={url} alt="Carousel item" />
                  ),
                }))}
                avatarUrl={avatarUrl}
                onImageSelect={handleImageSelection}
              />
            </div>
            <Text fontSize="sm" mt={4} mb={2}>
              Or upload your own image:
            </Text>

            <Box display="flex" justifyContent="center" mt={2} mb={4}>
              <UploadImage
                onUpload={(url) => {
                  setUploadedImage(url);
                  setSelectedImage(url);
                }}
              />
            </Box>

            {uploadedImage && (
              <>
                <Box
                  style={{
                    position: "relative",
                    width: "200px", // Set this to the width of your frame
                    height: "200px", // Set this to the height of your frame
                    overflow: "hidden", // Ensure the cropper doesn't exceed this container
                    margin: "0 auto", // Center the container
                  }}
                >
                  <Cropper
                    image={uploadedImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop} // Allows panning
                    onZoomChange={setZoom} // Allows zooming
                    onCropComplete={onCropComplete}
                    restrictPosition={false} // Allows free movement
                    style={{ zIndex: 5 }}
                  />
                  <Image
                    src={framePaths[frameChoice]} // Frame choice logic
                    alt="Frame"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      zIndex: 10, // Make sure the frame has a higher z-index
                      pointerEvents: "none", // Prevent the frame from blocking interactions with the cropper
                    }}
                  />
                </Box>
                <Slider
                  aria-label="zoom-slider"
                  value={zoom}
                  min={0.5}
                  max={1.5}
                  step={0.1}
                  onChange={(val) => setZoom(val)} // This updates the zoom level
                  mt={4}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
                <Box display="flex" justifyContent="center" mt={4}>
                  <Button
                    size="sm"
                    mr={2}
                    mb={2}
                    onClick={() => setFrameChoice("frame0")}
                  >
                    Frame 1
                  </Button>
                  <Button
                    size="sm"
                    mr={2}
                    onClick={() => setFrameChoice("frame2")}
                  >
                    Frame 2
                  </Button>
                  <Button size="sm" onClick={() => setFrameChoice("frame3")}>
                    Frame 3
                  </Button>
                </Box>
              </>
            )}

            <Input
              mb={2}
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter custom name (optional)"
            />
            <Input
              mb={-3}
              mt={2}
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              maxLength={40}
              placeholder="Add a message? (40 char. max)"
            />
          </ModalBody>
          <ModalFooter
            mb={0}
            mt={-3}
            style={{ display: "flex", justifyContent: "center" }}
          >
            {showImageWarning && (
              <Alert
                status="warning"
                onClose={() => setShowWarning(false)}
                backgroundColor="#2b8597"
                fontSize={"small"}
                height={"50px"}
                width={"50%"}
              >
                <AlertIcon height="100%" />
                Please select an image before saving.
              </Alert>
            )}
            <Button
              size={"sm"}
              className="shimmer-button"
              onClick={handleSaveResult} // This will handle the cropped image save
            >
              <span className="text">Save Result</span>
              <span className="shimmer"></span>
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      <BurnModal isCandleLowered={isCandleLowered} />
    </>
  );
}

export default ImageSelectionModal;
