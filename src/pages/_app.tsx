// Import app CSS first to prevent white flash
import "../../styles/_app.css";
// Import darkmode CSS next
import "../../styles/darkmode.css";
// Import gallery-specific styles
import "../../styles/gallery.css";
import "../../styles/globals.css";
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
import "../../styles/musicPlayer.css";
import "../../styles/coin.css";
import "../../styles/NeonSign.css";
import "../../styles/ScenePage.css";
import type { AppProps } from "next/app";
import { ThirdwebProvider } from "../utilities/thirdweb";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { ThemeProvider, useTheme } from "next-themes";
import { defaultTheme, galleryTheme, sceneTheme } from "../utilities/theme";
import Head from "next/head";
import { useRouter } from "next/router";
import Header from "../components/Header";
import Header2 from "../components/Header2";
import Header3 from "../components/Header3";
import styles from "../../styles/MusicPlayer.module.css";
import { Theme } from "@chakra-ui/react";
import { ClerkProvider } from "@clerk/nextjs";
import { shadesOfPurple } from "@clerk/themes";
import { useEffect } from "react";

type MyAppProps = AppProps & {
  Component: AppProps["Component"] & {
    theme?: string; // Add the `theme` property
  };
};

function MyApp({ Component, pageProps }: MyAppProps) {
  useEffect(() => {
    // Check the current path
    const isGalleryPath = window.location.pathname === "/gallery";
    const isScenePath = window.location.pathname === "/scene";

    // Set the appropriate background color based on the page
    const bgColor = isGalleryPath
      ? "#000000"
      : isScenePath
      ? "#0d0d0d"
      : "#1b1724";

    // Apply dark theme immediately
    document.documentElement.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;

    // Ensure theme is forced to "dark"
    const html = document.documentElement;
    html.setAttribute("data-theme", "dark");
    html.style.colorScheme = "dark";

    // Create a MutationObserver to ensure the background color persists
    const observer = new MutationObserver(() => {
      const isGalleryPath = window.location.pathname === "/gallery";
      const isScenePath = window.location.pathname === "/scene";

      // Set the appropriate background color based on the page
      const bgColor = isGalleryPath
        ? "#000000"
        : isScenePath
        ? "#0d0d0d"
        : "#1b1724";

      if (document.documentElement.style.backgroundColor !== bgColor) {
        document.documentElement.style.backgroundColor = bgColor;
      }
      if (document.body.style.backgroundColor !== bgColor) {
        document.body.style.backgroundColor = bgColor;
      }
    });

    // Start observing
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });

    // Cleanup
    return () => observer.disconnect();
  }, []);
  const router = useRouter();

  const isGalleryPage = router.pathname === "/gallery";
  const isIndexPage = router.pathname === "/";
  const isNumerologyPage = router.pathname === "/numerology";
  const isCommunionPage = router.pathname === "/communion";
  const isScenePage = router.pathname === "/scene";
  const isRocketPage = router.pathname === "/rocket";

  // Add useEffect to set body class based on page type
  useEffect(() => {
    // Remove all page-specific classes first
    document.documentElement.classList.remove("gallery-page", "scene-page");
    document.body.classList.remove("gallery-page", "scene-page");

    // Add the appropriate class based on the current page
    if (isGalleryPage) {
      document.documentElement.classList.add("gallery-page");
      document.body.classList.add("gallery-page");
      document.documentElement.style.backgroundColor = "#000000";
      document.body.style.backgroundColor = "#000000";
    } else if (isScenePage) {
      document.documentElement.classList.add("scene-page");
      document.body.classList.add("scene-page");
      document.documentElement.style.backgroundColor = "#0d0d0d";
      document.body.style.backgroundColor = "#0d0d0d";
    } else {
      document.documentElement.style.backgroundColor = "#1b1724";
      document.body.style.backgroundColor = "#1b1724";
    }
  }, [isGalleryPage, isScenePage, router.pathname]);

  // Dynamically choose the theme
  const special = isGalleryPage
    ? galleryTheme
    : isScenePage
    ? sceneTheme
    : defaultTheme;

  let HeaderComponent = null;
  if (isGalleryPage) {
    HeaderComponent = Header3;
  } else if (isNumerologyPage) {
    HeaderComponent = Header2;
  } else if (!(isIndexPage || isScenePage || isRocketPage)) {
    HeaderComponent = Header;
  }

  return (
    <>
      <ClerkProvider>
        <ThirdwebProvider>
          <ChakraProvider theme={special}>
            <Head>
              {" "}
              <title>𝓞𝖚𝖗 𝕷𝖆𝖉𝖞 𝔬𝔣 𝕻𝖊𝖗𝖕𝖊𝖙𝖚𝖆𝖑 𝕻𝖗𝖔𝖋𝖎𝖙</title>
              {/* Add global styles for gallery page */}
              <style>{`
                html.gallery-page,
                body.gallery-page {
                  background-color: #000000 !important;
                  margin: 0;
                  padding: 0;
                  width: 100%;
                  height: 100%;
                  overflow-x: hidden;
                }
                
                .gallery-page #__next {
                  background-color: #000000 !important;
                  width: 100%;
                  max-width: 100%;
                }
              `}</style>
            </Head>
            <div
              className={`${isGalleryPage ? "gallery-page" : ""} ${
                isScenePage ? "scene-page" : ""
              }`.trim()} // Dynamically add class names
              style={{
                backgroundColor: isGalleryPage
                  ? "#000000"
                  : isScenePage
                  ? "#0d0d0d"
                  : "transparent",
                width: isGalleryPage || isScenePage ? "100%" : "auto",
                margin: isGalleryPage || isScenePage ? "0" : "auto",
                padding: isGalleryPage || isScenePage ? "0" : "auto",
                minHeight: isGalleryPage || isScenePage ? "100vh" : "auto",
              }}
            >
              {/* Render the Header dynamically */}
              {HeaderComponent && <HeaderComponent />}
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
          </ChakraProvider>
        </ThirdwebProvider>
      </ClerkProvider>
    </>
  );
}
export default MyApp;
