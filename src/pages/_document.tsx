import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html
      data-theme="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <Head>
        <meta name="description" content="A token to believe in." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />

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

      <body style={{ colorScheme: "dark" }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
