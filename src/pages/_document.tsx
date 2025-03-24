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
        {/* Add your meta tags and other head content */}
        <style dangerouslySetInnerHTML={{ __html: criticalCss }} />
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
