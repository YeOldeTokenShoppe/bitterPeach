// This script is loaded as early as possible to prevent white flash
(function () {
  // Apply dark background immediately
  document.documentElement.style.backgroundColor = "#1b1724";
  document.documentElement.style.color = "white";

  // Check if body exists before accessing its style
  if (document.body) {
    document.body.style.backgroundColor = "#1b1724";
  }

  // Check if we're on the gallery page by URL path
  var isGalleryPage = window.location.pathname === "/gallery";
  var isScenePage = window.location.pathname === "/scene";

  // Apply the appropriate background color based on the page
  if (isGalleryPage) {
    document.documentElement.style.backgroundColor = "#000000";
    if (document.body) {
      document.body.style.backgroundColor = "#000000";
      document.body.classList.add("gallery-page");
    }
    document.documentElement.classList.add("gallery-page");
  } else if (isScenePage) {
    document.documentElement.style.backgroundColor = "#0d0d0d";
    if (document.body) {
      document.body.style.backgroundColor = "#0d0d0d";
      document.body.classList.add("scene-page");
    }
    document.documentElement.classList.add("scene-page");
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

  // Add the style to the head as early as possible
  if (document.head) {
    document.head.appendChild(style);
  } else {
    // If head is not available yet, wait for DOMContentLoaded
    document.addEventListener("DOMContentLoaded", function () {
      document.head.appendChild(style);
    });
  }

  // Set dark theme attribute
  document.documentElement.setAttribute("data-theme", "dark");
  document.documentElement.style.colorScheme = "dark";

  // Function to ensure images have transparent backgrounds
  function fixImageBackgrounds() {
    var images = document.getElementsByTagName("img");
    for (var i = 0; i < images.length; i++) {
      images[i].style.backgroundColor = "transparent";
    }
  }

  // Run immediately if possible
  fixImageBackgrounds();

  // Also run when DOM is loaded
  document.addEventListener("DOMContentLoaded", fixImageBackgrounds);

  // And periodically check
  setInterval(fixImageBackgrounds, 500);
})();
