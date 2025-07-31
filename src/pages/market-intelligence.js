"use client";
import React from "react";

import RL80MarketWidget from "../components/RL80MarketWidget";
import Footer from "../components/Footer";
import styles from "../styles/MarketIntelligence.module.css";

export default function MarketIntelligence() {
  return (
    <>
 
      <div className={styles.container}>
 
        <main className={styles.main}>
          <h1 className={styles.pageTitle}>RL80 Market Intelligence</h1>
          <p className={styles.description}>
            Real-time market analysis and insights powered by the RL80 AI agent.
            Updates twice daily at 8 AM and 8 PM UTC.
          </p>
          <RL80MarketWidget />
        </main>
      </div>
      <Footer />
    </>
  );
}