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
// musicPlayer.css has been moved to globals.css
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
  const router = useRouter();

  useEffect(() => {
    // Ensure theme is forced to "dark"
    const html = document.documentElement;
    html.setAttribute("data-theme", "dark");
    html.style.colorScheme = "dark";

    // Only set the default background color here if we're not on gallery or rocket page
    const path = window.location.pathname;
    if (path !== "/gallery" && path !== "/rocket") {
      html.style.backgroundColor = "#1b1724";
    } else {
      html.style.backgroundColor = "#000000"; // Black for gallery and rocket
    }
    // html.style.color = "white";
  }, [router.pathname]); // Add router.pathname as dependency to re-run when route changes

  const isGalleryPage = router.pathname === "/gallery";
  const isIndexPage = router.pathname === "/";
  const isNumerologyPage = router.pathname === "/numerology";
  const isCommunionPage = router.pathname === "/communion";
  const isScenePage = router.pathname === "/scene";
  const isRocketPage = router.pathname === "/rocket";

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
            </Head>
            <div
              className={`${isGalleryPage ? "gallery-page" : ""} ${
                isScenePage ? "scene-page" : ""
              }`.trim()} // Dynamically add class names
              style={{
                backgroundColor:
                  isGalleryPage || isRocketPage
                    ? "#000000"
                    : isScenePage
                    ? "#0d0d0d"
                    : "#1b1724", // Set explicit background colors here
                width: "100%",
                margin: "0",
                paddingTop: "0", // Removed padding since header now scrolls with the page
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
          </ChakraProvider>
        </ThirdwebProvider>
      </ClerkProvider>
    </>
  );
}
export default MyApp;
