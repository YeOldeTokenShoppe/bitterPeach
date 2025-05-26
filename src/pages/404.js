import React from "react";
import Head from "next/head";
import Link from "next/link";

export default function Custom404() {
  return (
    <div
      style={{
        backgroundColor: "#000000",
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <Head>
        <title>404 - Page Not Found</title>
      </Head>
      
      <div 
        style={{
          textAlign: "center",
          maxWidth: "600px",
          padding: "2rem",
        }}
      >
        <h1 
          style={{
            fontFamily: "'UnifrakturMaguntia', cursive",
            fontSize: "4rem",
            marginBottom: "1rem",
            color: "#ff00ff",
            textShadow: "0 0 10px #ff00ff, 0 0 20px #ff00ff",
          }}
        >
          RL80
        </h1>
        
        <h2 
          style={{
            fontSize: "2rem",
            marginBottom: "2rem",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
          }}
        >
          404 - Page Not Found
        </h2>
        
        <p style={{ marginBottom: "2rem", fontSize: "1.2rem" }}>
          The page you are looking for does not exist or has been moved.
        </p>
        
        <Link 
          href="/"
          style={{
            display: "inline-block",
            padding: "0.8rem 1.6rem",
            backgroundColor: "#ff00ff",
            color: "#000000",
            textDecoration: "none",
            fontWeight: "bold",
            textTransform: "uppercase",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
        >
          Return Home
        </Link>
      </div>
    </div>
  );
} 