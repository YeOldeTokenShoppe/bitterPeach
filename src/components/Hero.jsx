import React, { useEffect, useState, useRef } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionIcon,
  AccordionPanel,
  Avatar,
  Badge,
  Box,
  Flex,
  Heading,
  Link,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Text,
  Center,
  Button,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverCloseButton,
  Stack,
  useClipboard,
  useBreakpointValue,
  IconButton,
  useMediaQuery,
  Card,
} from "@chakra-ui/react";
import { WarningIcon, CopyIcon, CheckIcon } from "@chakra-ui/icons";
import Image from "next/image";
import { TransitionGroup, CSSTransition } from "react-transition-group";
import styled from "styled-components";
import { chain } from "../utilities/chain";
import { ConnectButton } from "thirdweb";
import { client } from "../utilities/client";
import { ThirdwebProvider, PayEmbed } from "thirdweb/react";
import { ethereum, sepolia } from "thirdweb/chains";
import { darkTheme, MediaRenderer } from "thirdweb/react";

// import Carnival from "./Carnival";
import TextMarquee from "./TextMarquee";
import {
  createWallet,
  walletConnect,
  inAppWallet,
  base,
} from "thirdweb/wallets";
import { useConnect, useActiveAccount, useActiveWallet } from "thirdweb/react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../utilities/firebaseClient";
import Coin from "./Coin";
// import { TwitterTweetEmbed } from "react-twitter-embed";
import TokenText from "./TokenText";
import RotatingText from "./RotatingText";
import CardComponent from "./CardComponent";
import RotatingBadge from "./RotatingBadge";
import NeonSign from "./NeonSign";
import SliderRevolutionCarousel from "./SliderRevolutionCarousel";
import dynamic from "next/dynamic";
const BurningEffect = dynamic(() => import("../components/BurningEffect"), {
  ssr: false,
});
import SpinningTextRing from "./SpinningTextRing";
import ParticleTextEffect from "./ParticleTextEffect";
import SuperText from "./SuperText";

const StyledText = styled(Text)`
  font-family: "Roboto", sans-serif;
`;
const ListItem = styled.li`
  &::before {
    content: "✨";
    padding-right: 10px;
  }
`;

const useOutsideClick = (refs, handler) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        refs.every((ref) => ref.current && !ref.current.contains(event.target))
      ) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [refs, handler]);
};

function Hero({ setHeroLoaded }) {
  useEffect(() => {
    // Simulate async data or image loading
    const loadHeroContent = async () => {
      // Example: simulate loading (replace with real logic)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setHeroLoaded(true); // Notify parent that loading is complete
    };

    loadHeroContent();
  }, [setHeroLoaded]);
  const coinRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined" && !coinRef.current) {
      return;
    }

    const sparkle = coinRef.current;

    const MAX_STARS = 60;
    const STAR_INTERVAL = 16;

    const MAX_STAR_LIFE = 3;
    const MIN_STAR_LIFE = 1;

    const MAX_STAR_SIZE = 40;
    const MIN_STAR_SIZE = 20;

    const MIN_STAR_TRAVEL_X = 100;
    const MIN_STAR_TRAVEL_Y = 100;

    const randomLimitedColor = () => {
      const randomHue = (() => {
        const ranges = [
          { min: 120, max: 150 }, // Blues
          { min: 270, max: 290 }, // Violets/Purples
          { min: 45, max: 60 }, // Yellows and Golds
        ];
        const range = ranges[Math.floor(Math.random() * ranges.length)];
        return (
          Math.floor(Math.random() * (range.max - range.min + 1)) + range.min
        );
      })();

      return `hsla(${randomHue}, 100%, 50%, 1)`;
    };

    const Star = class {
      constructor() {
        this.size = this.random(MAX_STAR_SIZE, MIN_STAR_SIZE);

        this.x = this.random(
          sparkle.offsetWidth * 0.75,
          sparkle.offsetWidth * 0.25
        );
        this.y = sparkle.offsetHeight / 2 - this.size / 2;

        this.x_dir = this.randomMinus();
        this.y_dir = this.randomMinus();

        this.x_max_travel =
          this.x_dir === -1 ? this.x : sparkle.offsetWidth - this.x - this.size;
        this.y_max_travel = sparkle.offsetHeight / 2 - this.size;

        this.x_travel_dist = this.random(this.x_max_travel, MIN_STAR_TRAVEL_X);
        this.y_travel_dist = this.random(this.y_max_travel, MIN_STAR_TRAVEL_Y);

        this.x_end = this.x + this.x_travel_dist * this.x_dir;
        this.y_end = this.y + this.y_travel_dist * this.y_dir;

        this.life = this.random(MAX_STAR_LIFE, MIN_STAR_LIFE);

        this.star = document.createElement("div");
        this.star.classList.add("star");

        this.star.style.setProperty("--start-left", this.x + "px");
        this.star.style.setProperty("--start-top", this.y + "px");

        this.star.style.setProperty("--end-left", this.x_end + "px");
        this.star.style.setProperty("--end-top", this.y_end + "px");

        this.star.style.setProperty("--star-life", this.life + "s");
        this.star.style.setProperty("--star-life-num", this.life);

        this.star.style.setProperty("--star-size", this.size + "px");
        this.star.style.setProperty("--star-color", randomLimitedColor());
      }

      draw() {
        sparkle.appendChild(this.star);
      }

      pop() {
        sparkle.removeChild(this.star);
      }

      random(max, min) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      randomMinus() {
        return Math.random() > 0.5 ? 1 : -1;
      }
    };

    let current_star_count = 0;
    const intervalId = setInterval(() => {
      if (current_star_count >= MAX_STARS) {
        return;
      }

      current_star_count++;

      const newStar = new Star();
      newStar.draw();

      setTimeout(() => {
        current_star_count--;
        newStar.pop();
      }, newStar.life * 1000);
    }, STAR_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, []);
  const [isLargerThan768] = useMediaQuery("(min-width: 37rem)");
  const [isChromeBrowser, setIsChromeBrowser] = useState(false);
  const [isSmallScreen] = useMediaQuery("(max-width: 600px)");
  // useEffect(() => {
  //   setIsChromeBrowser(isChrome());
  // }, []);
  const account = useActiveAccount();
  const flexDirection = useBreakpointValue({ base: "column", sm: "row" });

  const tokenAddress = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
  const { hasCopied, onCopy } = useClipboard(tokenAddress);

  const [openPopover, setOpenPopover] = useState(null);

  const handleOpen = (id) => {
    setOpenPopover(id);
  };

  const handleClose = () => {
    setOpenPopover(null);
  };

  const popoverRefs = [useRef(), useRef(), useRef()];

  useOutsideClick(popoverRefs, handleClose);

  const [topBurner, setTopBurner] = useState(null);
  const [marqueeImages, setMarqueeImages] = useState([]);
  const listItemStyle = {
    paddingLeft: "30px",
    textIndent: "-1px",
    background: `url(/goldStar2.png) no-repeat`,
    backgroundSize: "20px 20px",
    marginBottom: "1rem", // Add space between list items
  };

  useEffect(() => {
    const fetchData = async () => {
      const q = query(
        collection(db, "results"),
        orderBy("burnedAmount", "desc"),
        limit(1)
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const result = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          // src: doc.data().image.src,
          // alt: doc.data().image.alt,
          // message: doc.data().userMessage,
          userName: doc.data().userName,
          burnedAmount: doc.data().burnedAmount,
        }))[0];
        setTopBurner(result);
      });
      return () => unsubscribe();
    };

    fetchData().catch(console.error);
  }, []);

  useEffect(() => {
    const fetchMarqueeData = async () => {
      const q = query(
        collection(db, "results"),
        orderBy("createdAt", "desc"),
        limit(100)
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const results = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          // src: doc.data().image.src,
          // alt: doc.data().image.alt,
          // message: doc.data().userMessage,
          userName: doc.data().userName,
          burnedAmount: doc.data().burnedAmount,
          createdAt: doc.data().createdAt,
          // isComposite: doc.data().image.isFirstImage || false,
        }));

        // Sort by burnedAmount to get top burners
        const sortedByAmount = [...results].sort(
          (a, b) => b.burnedAmount - a.burnedAmount
        );

        // Top 3 burners
        const topBurners = sortedByAmount
          .slice(0, 3)
          .map((image) => ({ ...image, type: "Top Burner" }));

        // Most recent burners (excluding top burners)
        const recentBurners = results
          .filter((r) => !topBurners.some((tb) => tb.id === r.id))
          .slice(0, 10)
          .map((image) => ({ ...image, type: "New Burner" }));

        // Combine top burners and recent burners
        const combinedImages = [...topBurners, ...recentBurners];

        setMarqueeImages(combinedImages);
      });
      return () => unsubscribe();
    };

    fetchMarqueeData().catch(console.error);
  }, []);

  return (
    <>
      <Box mt={0} position="relative">
        <Flex direction={{ base: "column", md: "row" }}>
          <Box
            flex="1.1"
            mt={0}
            mb={0}
            ml="2rem"
            mr="2rem"
            // minH={{ base: "600px", md: "auto" }}
            position="relative" // Establish positioning context
          >
            <SliderRevolutionCarousel />
          </Box>
        </Flex>
      </Box>
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        mb={9}
        mt={1}
        py={{ base: 4, md: 7 }} // Adjust padding for smaller screens
        px={{ base: 2, md: 3 }} // Adjust padding for smaller screens
        borderRadius={"10px"}
      >
        <Flex
          direction={{ base: "column", md: "row" }}
          flexWrap="nowrap"
          width="100%"
          alignItems={{ base: "center", md: "stretch" }} // Center on small screens, stretch on larger screens
          position="relative" // Ensure relative positioning
          py={{ base: 6, md: 0 }} // Add padding on small screens to prevent overlap
        >
          {/* Left Column for the Coin */}
          <Box
            flex="1"
            display="flex"
            justifyContent="center"
            alignItems="center"
            mb={{ base: 4, md: 0 }} // Add bottom margin on small screens to create space between the Coin and the text
            style={{ height: "25rem", minHeight: "20rem" }}
          >
            <div
              style={{
                position: "absolute", // Absolutely position the Coin box over the image
                top: isLargerThan768 ? "-15%" : "-5%", // Adjust the vertical position as needed
                left: "1%", // Adjust the horizontal position as needed
              }}
            >
              <h1
                className="thelma"
                style={{ textAlign: "center", zIndex: "1" }}
              >
                Our Lady <br />
                <span style={{ fontSize: "2rem" }}>of </span>
                <span>Perpetual</span>
                <br />
                <span>Profit </span>
              </h1>{" "}
            </div>
            <div style={{ position: "relative", top: "5rem" }}>
              <div
                ref={coinRef}
                className="coin-container sparkle"
                style={{ position: "relative", width: "15rem" }}
              >
                <Link href="#" className="coin-link">
                  <Coin />
                </Link>
              </div>
            </div>
            {/* <div className="emoji-container">
              <span className="emoji">👈</span>
              <Text
                className="emoji"
                fontSize={"1.8rem"}
                color={"goldenrod"}
                fontFamily={"Pirata One"}
                style={{ transform: "rotate(-45deg)" }}
              >
                Click to Buy!
              </Text>
            </div> */}
          </Box>

          {/* Right Column for the Text */}
          <Box
            flex="1"
            display="flex"
            justifyContent={{ base: "center", md: "flex-start" }} // Center text on small screens, align left on medium to large screens
            alignItems="center"
          >
            {/* <CardComponent /> */}{" "}
            <div
              style={{
                width: "100%",
                maxWidth: "500px", // Adjust as needed for your design
                transform: "skew(-7deg)", // Skew the text container
                border: "3px solid #8e662b",
                padding: "1rem",
                margin: "1rem",
              }}
            >
              {" "}
              <Heading mt={3} fontSize={"2.3rem"} lineHeight={".9"}>
                Prosper80 x Infin80
              </Heading>
              <StyledText
                style={{
                  lineHeight: "1.2",
                  marginTop: "1rem",
                  marginBottom: "0rem",
                  marginRight: "1rem",
                  marginLeft: "1rem",
                  transform: "skew(10deg)", // Counter-skew the text to make it appear normal
                }}
              >
                The
                <span style={{ fontFamily: "Oleo Script" }}> RL80 </span> token
                lets you pay homage and light green candles to the Patron Saint
                of Day Traders, 𝓞𝖚𝖗 𝕷𝖆𝖉𝖞 𝔬𝔣 𝕻𝖊𝖗𝖕𝖊𝖙𝖚𝖆𝖑 𝕻𝖗𝖔𝖋𝖎𝖙. Hold{" "}
                <span style={{ fontFamily: "Oleo Script" }}> RL80 </span> in
                your wallet as a good luck charm and to ward off evil. 𝓞𝖚𝖗 𝕷𝖆𝖉𝖞
                𝔬𝔣 𝕻𝖊𝖗𝖕𝖊𝖙𝖚𝖆𝖑 𝕻𝖗𝖔𝖋𝖎𝖙 is your personal guide up and to the right.
              </StyledText>
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                mt={5}
                mb={5}
              >
                {/* <SuperText /> */}
                <Link href="#">
                  <Button width="5rem" className="shimmer-button">
                    Buy RL80<span className="shimmer"></span>
                  </Button>
                  {/* <RadioButton2 text="Buy RL80" link="https://example.com/" /> */}
                </Link>
              </Box>
            </div>
          </Box>
        </Flex>
      </Box>
      {/* <hr style={{ marginTop: "2rem" }} class="tradingview-line" /> */}
      <Box
        mb={9}
        mt={6}
        ml="2rem"
        mr="2rem"
        py={{ base: 4, md: 7 }} // Adjust padding for smaller screens
        px={{ base: 2, md: 3 }} // Adjust padding for smaller screens
        borderRadius={"10px"}
        border={"1px solid #8e662b"}
      >
        <Flex
          direction={{ base: "column", md: "row" }}
          flexWrap="nowrap"
          alignItems="stretch"
        >
          <Box flex="1" mt={0} alignContent={"center"}>
            <Heading fontSize={"3rem"} lineHeight={".9"}>
              Vanquish Evil for Fun and Profit
            </Heading>
            <StyledText
              style={{
                textAlign: "center",
                lineHeight: "1.2",
                marginTop: "1rem",
                marginBottom: "-1rem",
                marginRight: "1rem",
                marginLeft: "1rem",
              }}
            >
              Stake your{" "}
              <span style={{ fontFamily: "Oleo Script" }}> RL80 </span> tokens
              to battle evil and earn reward tokens that let you burn green
              candles for 𝓞𝖚𝖗 𝕷𝖆𝖉𝖞 𝔬𝔣 𝕻𝖊𝖗𝖕𝖊𝖙𝖚𝖆𝖑 𝕻𝖗𝖔𝖋𝖎𝖙. Are you ready to prove
              your <b>HODL </b>
              mettle? Onward, crypto soldiers!
            </StyledText>

            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              mt="3rem"
            >
              <Link href="/gallery">
                {/* <RadioButton
                  id="input-one"
                  name="stagger-radio-group"
                  text="LFG!"
                  link="https://example.com/"
                /> */}

                <Button width="5rem" className="shimmer-button">
                  LFG!<span className="shimmer"></span>
                </Button>
              </Link>
            </Box>
          </Box>

          <Box
            flex="1"
            position="relative"
            display="flex"
            flexDirection="column"
            justifyContent="flex-end" // Ensure content is at the bottom on larger screens
            alignItems="stretch"
            mt={{ base: 6, md: 0 }} // Add some margin-top on smaller screens
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: "100%",
                // maxWidth: "15rem",
                // marginBottom: "10rem",
              }}
            >
              <img
                // className="logo"
                src="./vvv.jpg"
                width="100%"
                height="auto"
                alt=""
                style={{ zIndex: "1" }}
                // objectFit={"contain"}
              />
            </div>
          </Box>
        </Flex>

        {marqueeImages.length > 0 && (
          <Box className="marquee-container" position="relative" mt={3}>
            <TextMarquee images={marqueeImages} />
          </Box>
        )}
      </Box>

      {/* <hr class="tradingview-line" /> */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100%",
            height: "100%",
            backgroundImage: "url(/sacred.png)",
            backgroundPosition: "90% 20%",
            backgroundRepeat: "no-repeat",
            backgroundSize: "100%", // Change this value to "zoom out" from the image
            transform: "scaleX(-1)",
            opacity: 0.2,
            zIndex: 1,
          }}
        />

        <Box mb={9} mt={6}>
          <Flex>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                justifyContent: "center",
                alignItems: "center",
                marginTop: "1.3rem",
                marginBottom: "3rem",
                width: "50vw",
                zIndex: 2,
              }}
            >
              <RotatingText />
            </div>
          </Flex>
        </Box>
      </div>
      {/* <div style={{ position: "absolute"}}>
        <NeonSign />
      </div> */}
    </>
  );
}

export default Hero;
