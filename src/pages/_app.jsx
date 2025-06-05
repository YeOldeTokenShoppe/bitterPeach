import '../../styles/globals.css';
import "../../styles/RotatingText.css";
import "../../styles/Carousel.css";
import "../../styles/candle.css";
import "../../styles/phoneViewer.css";
import "../../styles/gradientEffect.css";
import "../../styles/matrix.css";
import "../../styles/RotatingText.css";
import "../../styles/shimmerbutton.css";
import "../../styles/wallpaper.css";
import "../../styles/sg.css";
import "../../styles/fireButton.css";
import "../../styles/sparkle.css";
import "../../styles/MusicPlayer.module.css";
import "../../styles/coin.css";
import "../../styles/NeonSign.css";
import "../../styles/ScenePage.css";
import { ThirdwebProvider } from "thirdweb/react";
import { sepolia } from "thirdweb/chains";
import { ChakraProvider } from "@chakra-ui/react";
import { ThemeProvider } from "next-themes";
import { defaultTheme, galleryTheme, sceneTheme } from "../utilities/theme";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Header2 from "../components/Header2";
import Header3 from "../components/Header3";
import styles from "../../styles/MusicPlayer.module.css";
import { useEffect } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { MusicProvider } from "../contexts/MusicContext";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  const isGalleryPage = router.pathname === "/gallery";
  const isIndexPage = router.pathname === "/";
  const isNumerologyPage = router.pathname === "/numerology";
  const isCommunionPage = router.pathname === "/communion";
  const isScenePage = router.pathname === "/scene";
  const isRocketPage = router.pathname === "/rocket";
  const isMoonScenePage = router.pathname === "/moon-scene";
  const isSamplePage = router.pathname === "/sample";


  useEffect(() => {
    // Ensure theme is forced to "dark"
    const html = document.documentElement;
    html.setAttribute("data-theme", "dark");
    html.style.colorScheme = "dark";

    // Add appropriate class to the body
    document.body.classList.remove("gallery-page", "scene-page", "rocket-page", "index-page", "communion-page", "moon-scene-page");

    if (isGalleryPage) {
      document.body.classList.add("gallery-page");
    } else if (isScenePage) {
      document.body.classList.add("scene-page");
    } else if (isRocketPage) {
      document.body.classList.add("rocket-page");
    } else if (isIndexPage) {
      document.body.classList.add("index-page");
    }
    else if (isCommunionPage) {
      document.body.classList.add("communion-page");
    }
    else if (isMoonScenePage) {
      document.body.classList.add("moon-scene-page");
    }
  }, [isGalleryPage, isScenePage, isRocketPage, isIndexPage, isCommunionPage, router.pathname]);

  // Set specific background colors for special pages
  useEffect(() => {
    const body = document.body;

    if (isGalleryPage) {
      body.style.backgroundColor = ""; // Gallery uses its own background
    } else if (isScenePage) {
      body.style.backgroundColor = "#0d0d0d";
    } else if (isRocketPage) {
      body.style.backgroundColor = ""; // Assuming rocket has its own background
    } else if (isIndexPage) {
      body.style.backgroundColor = "#1b1724";
      body.style.maxWidth = "100vw";
      body.style.padding = "0";
      body.style.margin = "0";
      body.style.overflow = "hidden";
    } else {
      body.style.backgroundColor = "#1b1724"; // Default for most pages
    }

    return () => {
      // Cleanup function to reset background when component unmounts
      body.style.backgroundColor = "";
      if (isIndexPage) {
        body.style.maxWidth = "";
        body.style.padding = "";
        body.style.margin = "";
        body.style.overflow = "";
      }
    };
  }, [isGalleryPage, isScenePage, isRocketPage, isIndexPage, isCommunionPage, isMoonScenePage, router.pathname]);

  // Dynamically choose the theme
  const special = isGalleryPage
    ? galleryTheme
    : isScenePage
    ? sceneTheme
    : defaultTheme;

  let HeaderComponent = null;
  if (isGalleryPage) {
    HeaderComponent = Header3;
  } else if (!(isIndexPage || isScenePage || isRocketPage || isCommunionPage || isMoonScenePage || isSamplePage)) {
    HeaderComponent = Header;
  }

  return (
    <>
      {/* Temporarily comment out Clerk to get the build passing */}
      <ClerkProvider>
        <ThirdwebProvider
          clientId={process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || ""}
          activeChain={sepolia}
        >
          <ChakraProvider theme={special}>
            <MusicProvider>
            <Head>
              {" "}
              <title>𝓞𝖚𝖗 𝕷𝖆𝖉𝖞 𝔬𝔣 𝕻𝖊𝖗𝖕𝖊𝖙𝖚𝖆𝖑 𝕻𝖗𝖔𝖋𝖎𝖙</title>
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
              />
            </Head>
            <div
              className={`${isGalleryPage ? "gallery-page" : ""} ${
                isScenePage ? "scene-page" : ""
              } ${isIndexPage ? "index-page" : ""}`.trim()} // Dynamically add class names
              style={{
                width: isGalleryPage || isScenePage || isIndexPage ? "100%" : "auto",
                margin: isGalleryPage || isScenePage || isIndexPage ? "0" : "auto",
                paddingTop: "0", // Removed padding since header now scrolls with the page
                maxWidth: isIndexPage ? "100vw" : "auto",
              }}
            >
              {/* Render the Header dynamically */}
              <div
                className="header-container"
                style={{ position: "relative" }}
              >
                {HeaderComponent && <HeaderComponent />}
              </div>
              <ThemeProvider
                defaultTheme="dark"
                enableSystem={false}
                attribute="data-theme"
                forcedTheme="dark"
                enableColorScheme={false}
                scriptProps={{
                  dangerouslySetInnerHTML: {
                    __html:
                      "document.documentElement.setAttribute('data-theme', 'dark');",
                  },
                }}
              >
                {/* Render the main page content */}
                <Component {...pageProps} />
              </ThemeProvider>
            </div>
            </MusicProvider>
          </ChakraProvider>
        </ThirdwebProvider>
      </ClerkProvider>
    </>
  );
}
export default MyApp;