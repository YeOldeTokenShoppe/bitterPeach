import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  orderBy,
  limit,
  batch,
  set,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  getDoc,
  writeBatch,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../utilities/firebaseClient.js"; // Ensure Firestore and Firebase Auth are initialized correctly
import {
  Clerk,
  useUser,
  SignedIn,
  SignedOut,
  SignInButton,
  useClerk,
} from "@clerk/nextjs"; // Use Clerk's useUser for user management
import {
  Button,
  Image as ChakraImage,
  Input,
  Text,
  Heading,
  Box,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
// import { useActiveAccount } from "thirdweb/react";
import StyledPopup from "./StyledPopup";
import { signInWithCustomToken } from "firebase/auth";
import axios from "axios";
import { useAuth } from "@clerk/nextjs"; // Add this line if it's missing
import EmojiPicker from "emoji-picker-react";
import { Theme } from "emoji-picker-react";
import { EmojiStyle } from "emoji-picker-react";
const Carousel = ({ images, setCarouselLoaded }) => {
  const [loadedImages, setLoadedImages] = useState(new Set());

  const { isSignedIn, user, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const { getToken } = useAuth(); // Move useAuth to the top level of the component

  const [firebaseUser, setFirebaseUser] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [riders, setRiders] = useState({});
  const [isRideConfirmationOpen, setIsRideConfirmationOpen] = useState(false);
  const [messages, setMessages] = useState({});
  const [newMessage, setNewMessage] = useState("");
  const [activeBeastId, setActiveBeastId] = useState(null);
  const [isRiding, setIsRiding] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [rideActive, setRideActive] = useState(true);
  const [popupMessage, setPopupMessage] = useState("");
  const router = useRouter();
  const [currentPath, setCurrentPath] = useState("/");
  const MAX_MESSAGE_LENGTH = 80;

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  const handleImageLoad = (src) => {
    setLoadedImages((prev) => {
      const newSet = new Set(prev);
      newSet.add(src);

      // Check if all images are loaded
      if (newSet.size === images.length) {
        console.log("✅ All images loaded successfully");
        setCarouselLoaded(true);
      }

      return newSet;
    });
  };

  const handleImageError = (src) => {
    console.error(`❌ Failed to load image: ${src}`);
    handleImageLoad(src); // Count failed loads to prevent loader from hanging
  };

  useEffect(() => {
    const controller = new AbortController();

    const preloadImages = async () => {
      try {
        const imageLoadPromises = images.map((image) => {
          return new Promise((resolve, reject) => {
            const img = new window.Image(); // Use window.Image explicitly
            img.onload = () => {
              handleImageLoad(image.src);
              resolve();
            };
            img.onerror = () => {
              handleImageError(image.src);
              resolve(); // Resolve anyway to prevent hanging
            };
            img.src = image.src;
          });
        });

        await Promise.all(imageLoadPromises);
      } catch (error) {
        console.error("Error preloading images:", error);
        setCarouselLoaded(true);
      }
    };

    preloadImages();

    return () => {
      controller.abort();
      setCarouselLoaded(false);
    };
  }, [images]);

  const handleEmojiClick = (emojiObject) => {
    setNewMessage((prevMessage) => {
      const updatedMessage = prevMessage + emojiObject.emoji;
      return updatedMessage.slice(0, MAX_MESSAGE_LENGTH); // Enforce max length
    });
    setShowEmojiPicker(false); // Close picker after selecting an emoji
  };

  const handleClickOutside = (event) => {
    if (
      emojiPickerRef.current &&
      !emojiPickerRef.current.contains(event.target)
    ) {
      setShowEmojiPicker(false); // Close the picker if clicked outside
    }
  };

  useEffect(() => {
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);
  // Trigger setCarouselLoaded when all images are loaded

  useEffect(() => {
    const path = router.asPath;
    if (path) {
      setCurrentPath(path);
    }
  }, [router.asPath]);

  const signIntoFirebase = async () => {
    try {
      const token = await getToken({ template: "integration_firebase" });

      const userCredentials = await signInWithCustomToken(auth, token);

      setFirebaseUser(userCredentials.user);
      return userCredentials.user;
    } catch (error) {
      console.error("Error signing into Firebase:", error);
      return null;
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn && user && !firebaseUser) {
      signIntoFirebase().then((firebaseUser) => {
        if (firebaseUser) {
          fetchUserProfile(firebaseUser.uid);
        } else {
          console.error("Failed to sign into Firebase");
        }
      });
    }
  }, [isLoaded, isSignedIn, user, firebaseUser]);

  const fetchUserProfile = async (userId) => {
    try {
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      const userData = {
        userId,
        imageUrl: user.imageUrl || "./defaultAvatar.png",
        username: user.username || "Anonymous",
        email: user.emailAddresses[0]?.emailAddress || null,
        provider: user.provider || null,
        identifier: user.externalId || user.id,
      };

      if (!userDoc.exists()) {
        await setDoc(userDocRef, userData, { merge: true });
      } else {
        await setDoc(userDocRef, userData, { merge: true });
      }
      setFirebaseUser(userData);
    } catch (error) {
      console.error("Error fetching or creating user profile:", error);
    }
  };

  const showPopupMessage = (
    message,
    onConfirm = null,
    onClose = handleClosePopup,
    showSingleButton = false
  ) => {
    setPopupMessage({ message, onConfirm, onClose, showSingleButton });
  };

  const handleClosePopup = () => setPopupMessage("");

  const promptWaitlistAddition = () => {
    showPopupMessage(
      "All beasts are occupied. Would you like to be added to the waitlist?",
      handleWaitlistAddition,
      handleClosePopup
    );
  };

  const handleWaitlistAddition = async () => {
    try {
      const waitlistRef = collection(db, "carouselWaitlist");
      const waitlistQuery = query(waitlistRef, where("userId", "==", user.id));
      const waitlistSnapshot = await getDocs(waitlistQuery);

      // if (!waitlistSnapshot.empty) {

      //   return;
      // }

      await addDoc(waitlistRef, {
        userId: user.id,
        username: user.username,
        imageUrl: user.imageUrl,
        timestamp: serverTimestamp(),
      });

      showPopupMessage(
        "You have been added to the waitlist. We will notify you when a beast is available. Please enjoy the Moon Room in the meantime.",
        null,
        handleClosePopup,
        true
      );
    } catch (error) {
      console.error("Failed to add user to the waitlist:", error);
      showPopupMessage(
        "An error occurred while adding you to the waitlist. Please try again.",
        null,
        handleClosePopup,
        true
      );
    }
  };
  const handleRideBeastClick = async (image, beastId) => {
    if (!isSignedIn) {
      openSignIn({ forceRedirectUrl: currentPath });
      return;
    }

    try {
      // Check if the user is already riding a beast
      const existingRidesQuery = query(
        collection(db, "carouselBeasts"),
        where("userId", "==", user.id)
      );
      const existingRidesSnapshot = await getDocs(existingRidesQuery);

      if (!existingRidesSnapshot.empty) {
        showPopupMessage("You are already riding another beast.");
        return; // Exit early to avoid further checks
      }

      // Check if the selected beast is occupied
      const beastRef = doc(db, "carouselBeasts", beastId);
      const beastDoc = await getDoc(beastRef);

      if (beastDoc.exists() && beastDoc.data().userId) {
        // Fetch all beasts to check if any are available
        const beastsSnapshot = await getDocs(collection(db, "carouselBeasts"));
        if (beastsSnapshot.empty) {
          setRiders({});
          setActiveBeastId(null);
          setMessages({});

          return;
        }

        const availableBeast = beastsSnapshot.docs.find(
          (doc) => !doc.data().userId // Find the first unoccupied beast
        );

        if (!availableBeast) {
          // If no available beasts, prompt for the waitlist
          promptWaitlistAddition();
        } else {
          // Notify the user that the current beast is occupied
          showPopupMessage(
            "This beast is occupied. Please select an available beast."
          );
        }
        return;
      }

      // If the selected beast is unoccupied, prompt to confirm the ride
      setSelectedImage({ ...image, beastId });
      setIsRideConfirmationOpen(true);
    } catch (error) {
      console.error("Error checking beast occupancy:", error);
      showPopupMessage("An error occurred. Please try again.");
    }
  };
  const loadMessages = (beastId) => {
    if (!beastId) {
      console.error("Invalid beastId provided to loadMessages");
      return () => {}; // Return a no-op cleanup function
    }

    const messagesQuery = query(
      collection(db, "carouselChat"),
      where("beastId", "==", beastId)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const beastMessages = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Update the messages state
      setMessages((prevMessages) => ({
        ...prevMessages,
        [beastId]: beastMessages,
      }));
    });

    return () => {
      unsubscribe();
    };
  };

  const updateBeastChat = async (beastId, riderData, message = "") => {
    try {
      const beastChatRef = doc(db, "carouselChat", beastId);

      // Merge rider data and message
      await setDoc(
        beastChatRef,
        {
          beastId,
          ...riderData,
          message,
          timestamp: serverTimestamp(),
        },
        { merge: true } // Update existing fields, add new ones if missing
      );
    } catch (error) {
      console.error(`Failed to update chat for ${beastId}:`, error);
    }
  };
  const confirmRide = async () => {
    if (!user) {
      showPopupMessage("Please sign in to ride the beast.");
      return;
    }

    try {
      const beastId = selectedImage?.beastId;
      if (!beastId) {
        console.error("No beast ID selected.");
        return;
      }

      // Check if the user is already riding
      const existingRidesQuery = query(
        collection(db, "carouselBeasts"),
        where("userId", "==", user.id)
      );
      const existingRidesSnapshot = await getDocs(existingRidesQuery);

      if (!existingRidesSnapshot.empty) {
        showPopupMessage("You are already riding another beast.");
        return; // Exit early if the user is already riding
      }

      // Check if the selected beast is occupied
      const beastRef = doc(db, "carouselBeasts", beastId);
      const beastDoc = await getDoc(beastRef);

      if (beastDoc.exists() && beastDoc.data().userId) {
        showPopupMessage(
          "Beast is already occupied. Please choose another beast."
        );
        return;
      }

      const riderData = {
        userId: user.id,
        username: user.username || "Anonymous",
        imageUrl: user.imageUrl || "/defaultAvatar.png",
        timestamp: serverTimestamp() || new Date(), // Add fallback
      };

      // Save the rider to Firestore
      await setDoc(beastRef, riderData);

      // Update state
      setActiveBeastId(beastId);
      setIsRiding(true);

      // Close the confirmation box
      setIsRideConfirmationOpen(false);
    } catch (error) {
      console.error("Failed to confirm ride:", error);
      showPopupMessage(error.message || "Failed to confirm ride.");
    }
  };
  useEffect(() => {
    const syncState = async () => {
      try {
        const ridersSnapshot = await getDocs(collection(db, "carouselBeasts"));
        const fetchedRiders = {};
        let userActiveBeast = null;

        ridersSnapshot.forEach((doc) => {
          const beastId = doc.id;
          const riderData = doc.data();
          if (riderData.userId) {
            fetchedRiders[beastId] = riderData;
          }

          if (user && riderData.userId === user.id) {
            userActiveBeast = beastId;
          }
        });

        setRiders(fetchedRiders);
        setActiveBeastId(userActiveBeast || null);
        setIsRiding(!!userActiveBeast);
      } catch (error) {
        console.error("Error syncing state with Firestore:", error);
      }
    };

    if (isLoaded && isSignedIn) syncState();
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (!activeBeastId) return;

    const messagesQuery = query(
      collection(db, "carouselChat"),
      where("beastId", "==", activeBeastId)
    );

    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      const newMessages = [];
      querySnapshot.forEach((doc) => {
        newMessages.push(doc.data());
      });

      setMessages((prevMessages) => ({
        ...prevMessages,
        [activeBeastId]: newMessages,
      }));
    });

    return () => {
      unsubscribeMessages();
    };
  }, [activeBeastId]);
  const handleSendMessage = async (beastId) => {
    if (!newMessage.trim() || !user) {
      showPopupMessage("Please enter a message and ensure you are logged in.");
      return;
    }

    try {
      const messageData = {
        beastId,
        message: newMessage,
        userId: user.id,
        username: user.username || "Anonymous",
        imageUrl: user.imageUrl || "/defaultAvatar.png",
        timestamp: serverTimestamp(),
      };

      // Use setDoc with beastId as the document ID to overwrite previous messages
      const messageRef = doc(db, "carouselChat", beastId);
      await setDoc(messageRef, messageData);

      setNewMessage(""); // Clear input
    } catch (error) {
      console.error("Failed to send message:", error);
      showPopupMessage("Failed to send the message. Please try again.");
    }
  };

  const deleteMessagesForBeast = async (beastId) => {
    try {
      const messagesQuery = query(
        collection(db, "carouselChat"),
        where("beastId", "==", beastId)
      );

      const messagesSnapshot = await getDocs(messagesQuery);

      if (!messagesSnapshot.empty) {
        const batch = writeBatch(db);

        messagesSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();
      } else {
        console.log(`No chat messages to delete for beastId: ${beastId}`);
      }
    } catch (error) {
      console.error(`Error deleting messages for beastId: ${beastId}`, error);
    }
  };
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const beastsSnapshot = await getDocs(collection(db, "carouselBeasts"));
        const maxRideTime = 10 * 60 * 1000; // 10 minutes in milliseconds
        const currentTime = Date.now();

        if (beastsSnapshot.empty) {
          // console.log("No active rides to process.");
          return;
        }

        for (const doc of beastsSnapshot.docs) {
          const rideData = doc.data();
          const rideStartTime = rideData.timestamp?.toMillis();

          if (!rideStartTime) {
            // console.warn(
            //   `Invalid rideStartTime for beast ${doc.id}. Skipping.`
            // );
            continue;
          }

          const elapsedTime = currentTime - rideStartTime;

          if (elapsedTime >= maxRideTime) {
            console.log(
              `Ride expired for beast: ${doc.id}. Deleting related data.`
            );

            // Delete beast document
            await deleteDoc(doc.ref);
            console.log(`Successfully deleted beast document: ${doc.id}`);

            // Delete associated chat messages
            await deleteMessagesForBeast(doc.id);

            // Update local state
            setRiders((prevRiders) => {
              const updatedRiders = { ...prevRiders };
              delete updatedRiders[doc.id];
              return updatedRiders;
            });

            setMessages((prevMessages) => {
              const updatedMessages = { ...prevMessages };
              delete updatedMessages[doc.id];
              return updatedMessages;
            });

            // If the expired ride matches the active beast, end the ride
            if (doc.id === activeBeastId) {
              setIsRiding(false);
              setActiveBeastId(null);
            }

            // Assign the beast to the next rider in the waitlist

            await assignBeastFromWaitlist(doc.id);
          }
        }
      } catch (error) {
        console.error("Error in ride expiration logic:", error);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [riders, activeBeastId]);
  useEffect(() => {
    if (!isRiding) {
      setActiveBeastId(null); // Clear the active beast
      setMessages({}); // Clear all messages
      setNewMessage(""); // Clear the input field
    }
  }, [isRiding]);

  // Handle real-time message updates
  useEffect(() => {
    images.forEach((_, index) => {
      const beastId = `beast${index + 1}`;
      const q = query(
        collection(db, "carouselChat"),
        where("beastId", "==", beastId)
      );
      onSnapshot(q, (snapshot) => {
        const chatMessages = snapshot.docs.map((doc) => doc.data());
        setMessages((prevMessages) => ({
          ...prevMessages,
          [beastId]: chatMessages,
        }));
      });
    });
  }, [images]);

  const quitRide = async () => {
    if (!activeBeastId || !user) return;

    try {
      const beastRef = doc(db, "carouselBeasts", activeBeastId);

      await deleteDoc(beastRef); // Remove rider from Firestore
      await deleteMessagesForBeast(activeBeastId); // Remove messages
      await assignBeastFromWaitlist(activeBeastId); // Assign next user if needed

      // Reset local state
      setActiveBeastId(null);
      setIsRiding(false); // Ensure this is set to false
      setMessages((prevMessages) => ({
        ...prevMessages,
        [activeBeastId]: [],
      }));
    } catch (error) {
      console.error("Failed to quit the ride:", error);
      showPopupMessage("Error quitting the ride. Please try again.");
    }
  };

  const checkExistingRides = async () => {
    if (user) {
      try {
        const existingRidesQuery = query(
          collection(db, "carouselBeasts"),
          where("userId", "==", user.id)
        );
        const existingRidesSnapshot = await getDocs(existingRidesQuery);

        // Iterate through existing rides and delete them
        for (const rideDoc of existingRidesSnapshot.docs) {
          if (rideDoc.id !== activeBeastId) {
            // Skip active beast

            await deleteDoc(rideDoc.ref);
          }
        }

        // Update local state to reflect the changes
        setRiders((prevRiders) =>
          Object.fromEntries(
            Object.entries(prevRiders).map(([key, value]) =>
              value?.userId === user.id ? [key, null] : [key, value]
            )
          )
        );
      } catch (error) {
        console.error("Error checking existing rides:", error);
      }
    }
  };

  // const populateMockBeasts = async () => {
  //   try {
  //     const beastsCollection = collection(db, "carouselBeasts");

  //     // Fetch existing beast data
  //     const existingBeastsSnapshot = await getDocs(beastsCollection);
  //     const existingBeastIds = new Set(
  //       existingBeastsSnapshot.docs.map((doc) => doc.id)
  //     );

  //     const now = Date.now();
  //     const batch = writeBatch(db);

  //     for (let i = 0; i < 12; i++) {
  //       const beastId = `beast${i + 1}`; // Generate beast ID

  //       // Only create if the beast doesn't already exist in Firestore
  //       if (!existingBeastIds.has(beastId)) {
  //         batch.set(doc(beastsCollection, beastId), {
  //           userId: `mockUser${i + 1}`,
  //           username: `Mock Rider ${i + 1}`,
  //           imageUrl: `https://via.placeholder.com/50?text=Rider${i + 1}`,
  //           timestamp: new Date(now - (i + 1) * 60 * 1000), // Start times staggered by 1 minute
  //         });
  //       }
  //     }

  //     // Commit the batch operation
  //     await batch.commit();
  //     console.log("Mock beasts populated successfully.");
  //   } catch (error) {
  //     console.error("Error populating mock beasts:", error);
  //   }
  // };
  // const populateRemainingBeasts = async () => {
  //   try {
  //     const beastsCollection = collection(db, "carouselBeasts");

  //     // Define specific beast IDs for 10, 11, and 12
  //     const specificBeastIds = ["beast10", "beast11", "beast12"];

  //     // Fetch existing beast data
  //     const existingBeastsSnapshot = await getDocs(beastsCollection);
  //     const existingBeastIds = new Set(
  //       existingBeastsSnapshot.docs.map((doc) => doc.id)
  //     );

  //     const now = Date.now();
  //     batch.set(doc(beastsCollection, beastId), {
  //       userId: `mockUser${index + 10}`,
  //       username: `Mock Rider ${index + 10}`,
  //       imageUrl: `https://via.placeholder.com/50?text=Rider${index + 10}`,
  //       timestamp: new Date(now), // Use current time to prevent immediate expiration
  //     });

  //     await batch.commit();
  //     console.log("Beasts 10-12 populated successfully.");
  //   } catch (error) {
  //     console.error("Error populating beasts 10-12:", error);
  //   }
  // };

  // useEffect(() => {
  //   const initializeMockData = async () => {
  //     try {
  //       await populateMockBeasts();
  //       await populateRemainingBeasts();
  //       console.log("All mock riders populated successfully.");
  //     } catch (error) {
  //       console.error("Error initializing mock riders:", error);
  //     }
  //   };

  //   initializeMockData();
  // }, []);

  // useEffect(() => {
  //   const initializeMockData = async () => {
  //     try {
  //       await populateMockBeasts();
  //       console.log("Mock riders populated successfully.");
  //     } catch (error) {
  //       console.error("Error initializing mock riders:", error);
  //     }
  //   };

  //   initializeMockData();
  // }, []);

  const addToWaitlist = async (userId, username, imageUrl) => {
    try {
      // Check if user is already on the waitlist
      const waitlistRef = collection(db, "carouselWaitlist");
      const waitlistQuery = query(waitlistRef, where("userId", "==", userId));
      const waitlistSnapshot = await getDocs(waitlistQuery);

      if (!waitlistSnapshot.empty) {
        console.log("User is already on the waitlist:", username);
        return; // User is already on the waitlist, exit early
      }

      // Check if user is already riding
      const ridersRef = collection(db, "carouselBeasts");
      const ridersQuery = query(ridersRef, where("userId", "==", userId));
      const ridersSnapshot = await getDocs(ridersQuery);

      if (!ridersSnapshot.empty) {
        console.log("User is already riding:", username);
        return; // User is already riding, exit early
      }

      // Add user to the waitlist
      await addDoc(waitlistRef, {
        userId,
        username,
        imageUrl,
        timestamp: serverTimestamp(),
      });
      console.log("User added to waitlist:", username);
    } catch (error) {
      console.error("Failed to add user to waitlist:", error);
    }
  };

  const findAvailableBeast = () => {
    const occupiedBeasts = Object.keys(riders);
    for (let i = 1; i <= 12; i++) {
      const beastId = `beast${i}`;
      if (!occupiedBeasts.includes(beastId)) {
        return beastId;
      }
    }

    return null;
  };

  const assignBeastFromWaitlist = async () => {
    try {
      const waitlistRef = collection(db, "carouselWaitlist");
      const waitlistQuery = query(
        waitlistRef,
        orderBy("timestamp", "asc"),
        limit(1)
      );
      const snapshot = await getDocs(waitlistQuery);

      if (!snapshot.empty) {
        const nextUserDoc = snapshot.docs[0];
        const userData = nextUserDoc.data();

        const availableBeast = findAvailableBeast();
        if (availableBeast) {
          const beastRef = doc(db, "carouselBeasts", availableBeast);
          await setDoc(beastRef, {
            userId: userData.userId,
            username: userData.username,
            imageUrl: userData.imageUrl,
            timestamp: serverTimestamp(),
          });

          await deleteDoc(nextUserDoc.ref);

          console.log(
            `Assigned beast ${availableBeast} to user: ${userData.username}`
          );
        } else {
          console.log("No available beasts to assign.");
        }
      } else {
        console.log("Waitlist is empty.");
      }
    } catch (error) {
      console.error("Error assigning beast from waitlist:", error);
    }
  };
  const [waitlist, setWaitlist] = useState([]);

  const calculateWaitTime = (position) => {
    if (position === 1) {
      const rideDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
      const now = Date.now();

      const activeRiders = Object.values(riders).filter(
        (r) => r && r.timestamp && typeof r.timestamp.toMillis === "function"
      );

      if (activeRiders.length > 0) {
        const nextExpiringRider = activeRiders.reduce((prev, curr) =>
          prev.timestamp.toMillis() < curr.timestamp.toMillis() ? prev : curr
        );

        const elapsedTime = now - nextExpiringRider.timestamp.toMillis();
        const timeLeft = rideDuration - elapsedTime;

        if (timeLeft > 0) {
          const minutes = Math.floor(timeLeft / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          return `${minutes}m ${seconds}s`;
        } else {
          return "Time expired"; // Indicate wait time is over
        }
      }
      return "0m 0s"; // Fallback for no active riders
    }

    const approximateWait = (position - 1) * 10 * 60 * 1000; // Add 10 minutes for each additional position
    const minutes = Math.floor(approximateWait / (1000 * 60));
    const seconds = Math.floor((approximateWait % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };
  useEffect(() => {
    console.log("Active riders:", riders);
    console.log("Waitlist:", waitlist);
  }, [riders, waitlist]);

  useEffect(() => {
    const waitlistRef = collection(db, "carouselWaitlist");
    const unsubscribe = onSnapshot(waitlistRef, (snapshot) => {
      const queue = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWaitlist(queue);
    });

    return () => unsubscribe();
  }, []);
  const [waitTimes, setWaitTimes] = useState([]);

  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const beastsSnapshot = await getDocs(collection(db, "carouselBeasts"));
        const maxRideTime = 10 * 60 * 1000; // 10 minutes in milliseconds
        const currentTime = Date.now();

        if (beastsSnapshot.empty) {
          // console.log("No active rides to process.");
          return;
        }

        for (const doc of beastsSnapshot.docs) {
          const rideData = doc.data();
          const rideStartTime = rideData.timestamp?.toMillis();

          if (!rideStartTime) {
            console.error(
              `Invalid rideStartTime for beast ${doc.id}. Skipping.`
            );
            continue;
          }

          const elapsedTime = currentTime - rideStartTime;

          if (elapsedTime >= maxRideTime) {
            console.log(`Ride expired. Deleting beast ${doc.id} and messages.`);

            try {
              await deleteDoc(doc.ref);
              console.log(`Successfully deleted beast ${doc.id}`);
            } catch (error) {
              console.error(`Failed to delete beast ${doc.id}:`, error);
              continue; // Skip to next iteration
            }

            try {
              await deleteMessagesForBeast(doc.id);
            } catch (error) {
              console.error(
                `Failed to delete messages for beast ${doc.id}:`,
                error
              );
            }

            setRiders((prevRiders) => {
              const updatedRiders = { ...prevRiders };
              delete updatedRiders[doc.id];
              return updatedRiders;
            });

            setMessages((prevMessages) => {
              const updatedMessages = { ...prevMessages };
              delete updatedMessages[doc.id];
              return updatedMessages;
            });

            console.log("Attempting to assign from waitlist...");
            await assignBeastFromWaitlist(doc.id);
          }
        }
      } catch (error) {
        console.error("Error in ride expiration logic:", error);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [riders]);
  useEffect(() => {
    if (!activeBeastId || !riders[activeBeastId]?.timestamp) {
      setTimeRemaining(null); // No active rider or invalid timestamp
      return;
    }

    const intervalId = setInterval(() => {
      const rideDuration = 10 * 60 * 1000; // 10 minutes in milliseconds
      const now = Date.now();
      const startTime = riders[activeBeastId]?.timestamp?.toMillis();

      if (!startTime) {
        setTimeRemaining("Invalid start time");
        return;
      }

      const elapsedTime = now - startTime;
      const remainingTime = rideDuration - elapsedTime;

      if (remainingTime > 0) {
        const minutes = Math.floor(remainingTime / (1000 * 60));
        const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining("Time expired");
        // Handle expiration logic here
      }
    }, 1000); // Update every second

    return () => clearInterval(intervalId); // Cleanup interval on unmount
  }, [activeBeastId, riders]);
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "carouselBeasts"),
      (snapshot) => {
        if (snapshot.empty) {
          console.log("No beasts found in Firestore.");
          setRiders({});
          return;
        }

        const updatedRiders = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          updatedRiders[doc.id] = data;
        });

        console.log("Updated riders from Firestore:", updatedRiders);
        setRiders(updatedRiders);
      }
    );

    return () => unsubscribe();
  }, []);
  const handleCloseChatBox = () => {
    if (rideActive) {
      // Show a confirmation popup only if the ride is still active
      showPopupMessage("Are you sure you want to end the ride?", () => {
        quitRide(); // Quit the ride if confirmed
        setIsRiding(false); // Ensure the state is updated correctly
        setActiveBeastId(null);
      });
    } else {
      // Directly close the chat box if the ride has ended
      setIsRiding(false);
      setActiveBeastId(null);
    }
  };
  const handleImageClick = (image, beastId) => {
    setSelectedImage({ ...image, beastId });
    setIsRideConfirmationOpen(true); // Open the ride confirmation prompt
  };

  useEffect(() => {
    const unsubscribeSnapshots = images.map((_, index) => {
      const beastId = `beast${index + 1}`;
      const beastRef = doc(db, "carouselBeasts", beastId);
      return onSnapshot(beastRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          setRiders((prevRiders) => ({
            ...prevRiders,
            [beastId]: docSnapshot.data(),
          }));
        }
      });
    });

    return () => unsubscribeSnapshots.forEach((unsub) => unsub());
  }, [images]);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div className="carousel-container">
        <main>
          <div
            id="carousel"
            style={{
              "--rotation-time": "30s",
              "--elements": images.length,
              animationPlayState: isHovered ? "paused" : "running",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {images.map((image, index) => {
              const beastId = `beast${index + 1}`;
              const rider = riders[beastId];
              const beastMessages = messages[beastId] || [];
              const isEven = index % 2 === 1;

              return (
                <div
                  key={beastId}
                  className="element"
                  data-item={isEven ? "logo" : ""}
                  style={{ position: "absolute", "--item": index + 1 }}
                >
                  <div className="element2">
                    <div className="rider-beast-group">
                      <div
                        className="beast"
                        style={{ backgroundImage: `url(${image.src})` }}
                        onClick={() => handleRideBeastClick(image, beastId)}
                      >
                        {rider && (
                          <div className="rider-container">
                            <p className="rider-name">{rider.username}</p>
                            <img
                              src={rider.imageUrl}
                              alt={rider.username}
                              className="rider-avatar"
                            />
                          </div>
                        )}
                      </div>

                      {beastMessages.length > 0 && (
                        <div className="speech-container">
                          <div className="speech">
                            <p>
                              {beastMessages[beastMessages.length - 1].message}
                            </p>
                          </div>
                        </div>
                      )}
                      <img
                        src={image.src}
                        alt={image.title}
                        onLoad={handleImageLoad}
                        onError={() => handleImageError(image.src)} // Catch failed loads
                        style={{ display: "none" }} // Hidden from view
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedImage && isRideConfirmationOpen && (
            <div>
              {/* Overlay div */}
              <div
                className="clickable-overlay"
                onClick={() => setIsRideConfirmationOpen(false)} // Close pop-up when clicking outside
                style={{
                  position: "fixed",
                  top: "-25rem",
                  left: 0,
                  width: "100vw",
                  height: "100vh",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  zIndex: 999,
                }}
              ></div>

              {/* Pop-up box */}
              <div
                style={{
                  backgroundColor: "pink",
                  border: "3px solid goldenrod",
                  position: "absolute",
                  padding: "1rem",
                  // gap: "10px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 1000,
                  textAlign: "center",
                  borderRadius: "10px",
                }}
                onClick={(e) => e.stopPropagation()} // Prevent click from closing pop-up
              >
                <Heading>{selectedImage.title}</Heading>
                <ChakraImage
                  src={selectedImage.src}
                  alt={selectedImage.title}
                  style={{
                    width: "8rem",
                    height: "8rem",
                    objectFit: "contain",
                  }}
                />
                <p>Ride it?</p>
                <div
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    gap: "10px",
                    justifyContent: "center",
                  }}
                >
                  <Button
                    onClick={confirmRide}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: "#ffffff",
                      border: "none",
                    }}
                  >
                    Yes
                  </Button>
                  <Button
                    onClick={() => setIsRideConfirmationOpen(false)}
                    style={{
                      padding: "5px 10px",
                      backgroundColor: "#ffffff",
                      border: "none",
                    }}
                  >
                    No
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {isRiding && activeBeastId && (
          <div
            className="chat-box-container"
            style={{
              // backgroundColor: "#ffc3ec",
              // border: "1px solid black",
              padding: "10px",
              position: "fixed",
              zIndex: 9999,
              fontSize: "12px",
              width: "300px",
              left: "50%",
              transform: "translateX(-50%)",
              top: "20rem",
              borderRadius: "10px",
            }}
          >
            <button
              onClick={handleCloseChatBox}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "none",
                border: "none",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <Heading
              mt={1}
              mb={1}
              lineHeight={0.9}
              style={{
                fontSize: "2em",
                overflowWrap: "normal",
                zIndex: "1",
                color: "#e1b67e",
              }}
            >
              Chat Box
            </Heading>
            <div
              style={{ marginTop: "5px", fontSize: "12px", color: "#e1b67e" }}
            >
              {newMessage.length}/{MAX_MESSAGE_LENGTH}
            </div>
            <div
              style={{
                marginTop: "10px",
                display: "flex",
                alignItems: "center",
                width: "90%",
              }}
            >
              {/* <div
                style={{ marginTop: "5px", fontSize: "12px", color: "#e1b67e" }}
              >
                {newMessage.length}/{MAX_MESSAGE_LENGTH}
              </div> */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  marginRight: "10px",
                  fontSize: "25px",
                }}
              >
                😊
              </button>
              <Input
                value={newMessage}
                onChange={(e) => {
                  const message = e.target.value;
                  if (message.length <= MAX_MESSAGE_LENGTH) {
                    setNewMessage(message);
                  }
                }}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newMessage.trim() !== "") {
                    handleSendMessage(activeBeastId);
                  }
                }}
                disabled={!rideActive}
                style={{
                  backgroundColor: "white",
                  width: "100%",
                  marginRight: "10px",
                  color: "black",
                }}
              />
              <Button
                onClick={() => handleSendMessage(activeBeastId)}
                disabled={!rideActive || newMessage.trim() === ""}
                style={{
                  background: "none",
                  border: "none",
                  cursor: rideActive ? "pointer" : "not-allowed",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#e1b67e", // Set the background color
                    padding: "5px", // Add some padding to create space around the SVG
                    borderRadius: "5px", // Optional: Add border radius for rounded corners
                    display: "inline-block", // Ensure the div wraps tightly around the SVG
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    fill="currentColor"
                    color="white"
                    className="bi bi-send"
                    viewBox="0 0 16 16"
                    style={{
                      fill: "white",
                      // stroke: "black",
                      // strokeWidth: "0.9",
                    }} // Add fill and stroke styles
                  >
                    <path d="M15.854.146a.5.5 0 0 1 .057.638l-6 9a.5.5 0 0 1-.888-.07L7.06 6.196 1.423 4.602a.5.5 0 0 1 .013-.975l14-4a.5.5 0 0 1 .418.519z" />
                    <path d="M6.832 10.179a.5.5 0 0 1 .683.183L12 16a.5.5 0 0 1-.853.354L6.832 10.18z" />
                  </svg>
                </div>
              </Button>
            </div>

            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                style={{
                  position: "absolute",
                  bottom: "50px",
                  left: "10px",
                  zIndex: "1000",
                }}
              >
                <EmojiPicker theme="dark" onEmojiClick={handleEmojiClick} />
              </div>
            )}
            <p>Time Remaining: {timeRemaining}</p>
          </div>
        )}

        {popupMessage && (
          <StyledPopup
            message={popupMessage.message} // Access the message property
            onClose={handleClosePopup}
            onConfirm={popupMessage.onConfirm} // Pass the confirm function if applicable
          />
        )}
      </div>
      <Box
        width="80%"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        textAlign="center"
        padding="1rem"
        zIndex={-1}
        marginTop="20rem"
        gap=".9rem"
        style={{
          visibility: isRiding ? "hidden" : "visible", // Toggle visibility
          height: isRiding ? "0" : "auto", // Maintain layout space when hidden
          overflow: "hidden", // Prevent any content from showing if hidden
          transition: "visibility 0s, height 0.3s ease-in-out", // Smooth transition
        }}
      >
        <Text
          fontSize="2rem"
          fontWeight="bold"
          fontFamily="Oleo Script"
          lineHeight="1"
          color="#c48901"
          marginBottom="-.5rem"
        >
          RL80 Tokens Are Your Ticket to Ride!
        </Text>
        <Text
          as="h2"
          fontSize="2.5rem"
          fontWeight="bold"
          fontFamily="Oleo Script"
          lineHeight="1"
          marginBottom="-.5rem"
        ></Text>
        <Text>
          {" "}
          Charter a ride on the charts with your frens and fellow bag holders!
          Must be at least 36" tall and hold RL80 or PY80 reward tokens. 10
          minutes per ride. Your username and avatar will be displayed live!
          Click on any available beast to ride.
        </Text>
      </Box>
      {waitlist.length > 0 && (
        <div className="waitlist-container">
          <h4>Waiting List</h4>
          <ul>
            {waitlist.map((user, index) => (
              <li key={user.id}>
                <img src={user.imageUrl} alt={user.username} width="30" />
                <span>{user.username}</span>
                <span>Wait Time: {calculateWaitTime(index + 1)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Carousel;
