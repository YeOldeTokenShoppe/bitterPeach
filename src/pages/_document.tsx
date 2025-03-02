import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  // Critical CSS to be injected directly into the HTML
  const criticalCss = `
    :root { background-color: #1b1724 !important; }
    html { background-color: #1b1724 !important; }
    body { background-color: #1b1724 !important; }
    #__next { background-color: #1b1724 !important; }
    
    /* Gallery page - ensure full viewport coverage */
    html.gallery-page { background-color: #000000 !important; }
    body.gallery-page { background-color: #000000 !important; }
    .gallery-page, .gallery-page #__next, .gallery-page body, .gallery-page html,
    body.gallery-page, html.gallery-page, #__next.gallery-page { background-color: #000000 !important; }
    
    /* Scene page */
    .scene-page, .scene-page #__next, .scene-page body, .scene-page html,
    body.scene-page, html.scene-page, #__next.scene-page { background-color: #0d0d0d !important; }
    img { background-color: transparent !important; }
  `;

  return (
    <Html
      data-theme="dark"
      style={{ colorScheme: "dark", backgroundColor: "#1b1724" }}
      suppressHydrationWarning
    >
      <Head>
        {/* Critical CSS injected directly */}
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />

        {/* Load dark-mode.css before any other styles */}
        <link rel="stylesheet" href="/dark-mode.css" />

        {/* Load dark-mode-preload.js as early as possible */}
        <script async src="/dark-mode-preload.js" />

        {/* Load noflash.js script */}
        <script async src="/noflash.js" />

        {/* Preload script to prevent white flash - this runs before anything else */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
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
                  document.body.classList.add('gallery-page');
                } else if (isScenePage) {
                  document.documentElement.style.backgroundColor = "#0d0d0d";
                  document.body.style.backgroundColor = "#0d0d0d";
                  document.body.classList.add('scene-page');
                }
                
                // Create and inject a style element with critical CSS
                var style = document.createElement('style');
                style.textContent = ':root, html, body, #__next { background-color: #1b1724 !important; color-scheme: dark; } .gallery-page, .gallery-page #__next, .gallery-page body, .gallery-page html, body.gallery-page, html.gallery-page, #__next.gallery-page { background-color: #000000 !important; } .scene-page, .scene-page #__next, .scene-page body, .scene-page html, body.scene-page, html.scene-page, #__next.scene-page { background-color: #0d0d0d !important; } img { background-color: transparent !important; }';
                document.head.appendChild(style);
              })();
            `,
          }}
        />

        <meta name="description" content="A token to believe in." />
        {/* Theme color for browser UI elements */}
        <meta name="theme-color" content="#0d0d0d" />
        {/* Gallery page specific meta tag - will be overridden by JavaScript for other pages */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#000000"
        />
        {/* <meta name="viewport" content="width=device-width, initial-scale=1" /> */}
        <link rel="icon" href="/favicon.svg" />
        {/* <link rel="preconnect" href="https://fonts.googleapis.com" /> */}

        <style
          dangerouslySetInnerHTML={{
            __html: `
            html, body { 
              background-color: #1b1724 !important;
              color-scheme: dark;
            }
            /* Full viewport coverage for gallery page */
            html.gallery-page { background-color: #000000 !important; }
            body.gallery-page { background-color: #000000 !important; }
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
          `,
          }}
        />

        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/gsap/1.19.0/TweenMax.min.js"
          async
        />
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r125/three.min.js"
          async
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
          rel="stylesheet"
        />
      </Head>

      <body
        style={{
          colorScheme: "dark",
          backgroundColor: "#1b1724",
          margin: 0,
          padding: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
