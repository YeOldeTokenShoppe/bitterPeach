import { extendTheme } from "@chakra-ui/react";

// Default theme
const defaultTheme = extendTheme({
  breakpoints: {
    sm: "30em",
    md: "38em",
    lg: "62em",
    xl: "80em",
  },
  styles: {
    global: {
      "html, body": {
        backgroundColor: "#1b1724", // Default purple background
        color: "white",
        fontFamily: "'Miltonian Tattoo', sans-serif",
        fontSize: "xxl-large",
      },
    },
  },
});

// Gallery theme (example with black background)
const galleryTheme = extendTheme({
  breakpoints: {
    sm: "30em",
    md: "38em",
    lg: "62em",
    xl: "80em",
  },
  styles: {
    global: {
      "html, body": {
        backgroundColor: "#000000", // Black background for gallery
        color: "white",
        fontFamily: "'Miltonian Tattoo', sans-serif",
        fontSize: "xxl-large",
      },
    },
  },
});

// Scene theme (example with a different dark background)
const sceneTheme = extendTheme({
  breakpoints: {
    sm: "30em",
    md: "38em",
    lg: "62em",
    xl: "80em",
  },
  styles: {
    global: {
      "html, body": {
        backgroundColor: "#0d0d0d", // Darker background for scene
        color: "white",
        fontFamily: "'Miltonian Tattoo', sans-serif",
        fontSize: "xxl-large",
      },
    },
  },
});

export { defaultTheme, galleryTheme, sceneTheme };
