// This script prevents white flash by setting dark background immediately
(function () {
  // Set dark background on html and body
  document.documentElement.style.backgroundColor = "#1b1724";
  document.documentElement.style.color = "white";
  document.body.style.backgroundColor = "#1b1724";

  // Check if we're on the gallery page by URL path
  var isGalleryPage = window.location.pathname === "/gallery";
  var isScenePage = window.location.pathname === "/scene";

  // Apply the appropriate background color based on the page
  if (isGalleryPage) {
    document.documentElement.style.backgroundColor = "#000000";
    document.body.style.backgroundColor = "#000000";
    document.documentElement.classList.add("gallery-page");
    document.body.classList.add("gallery-page");
  } else if (isScenePage) {
    document.documentElement.style.backgroundColor = "#0d0d0d";
    document.body.style.backgroundColor = "#0d0d0d";
    document.documentElement.classList.add("scene-page");
    document.body.classList.add("scene-page");
  }

  // Create and inject a style element with critical CSS
  var style = document.createElement("style");
  style.textContent = `
    :root, html, body, #__next, [data-reactroot] { 
      background-color: #1b1724 !important; 
      color-scheme: dark; 
    }
    .gallery-page, .gallery-page #__next, .gallery-page body, .gallery-page html,
    body.gallery-page, html.gallery-page, #__next.gallery-page {
      background-color: #000000 !important;
    }
    .scene-page, .scene-page #__next, .scene-page body, .scene-page html,
    body.scene-page, html.scene-page, #__next.scene-page {
      background-color: #0d0d0d !important;
    }
    img {
      background-color: transparent !important;
    }
    * { transition: background-color 0s !important; }
  `;
  document.head.appendChild(style);

  // Set dark theme attribute
  document.documentElement.setAttribute("data-theme", "dark");
  document.documentElement.style.colorScheme = "dark";

  // Function to ensure dark background persists
  function ensureDarkBackground() {
    // Check if we're on the gallery page by class or URL path
    var isGalleryPage =
      document.body.classList.contains("gallery-page") ||
      window.location.pathname === "/gallery";
    var isScenePage =
      document.body.classList.contains("scene-page") ||
      window.location.pathname === "/scene";

    var bgColor = isGalleryPage
      ? "#000000"
      : isScenePage
      ? "#0d0d0d"
      : "#1b1724";

    // Apply to HTML element
    if (document.documentElement.style.backgroundColor !== bgColor) {
      document.documentElement.style.backgroundColor = bgColor;
    }

    // Apply to body element
    if (document.body.style.backgroundColor !== bgColor) {
      document.body.style.backgroundColor = bgColor;
    }

    // Apply classes to both HTML and body
    if (isGalleryPage) {
      document.documentElement.classList.add("gallery-page");
      document.body.classList.add("gallery-page");
    } else if (isScenePage) {
      document.documentElement.classList.add("scene-page");
      document.body.classList.add("scene-page");
    }

    // Check for Next.js root element
    var nextRoot = document.getElementById("__next");
    if (nextRoot && nextRoot.style.backgroundColor !== bgColor) {
      nextRoot.style.backgroundColor = bgColor;
    }

    // Ensure images have transparent backgrounds
    var images = document.getElementsByTagName("img");
    for (var i = 0; i < images.length; i++) {
      images[i].style.backgroundColor = "transparent";
    }
  }

  // Run immediately and set up interval to keep checking
  ensureDarkBackground();
  setInterval(ensureDarkBackground, 100);
})();
