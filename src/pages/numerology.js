// pages/numerology.js
import React, { useState, useEffect } from "react";
import NavBar from "../components/NavBar.client";
import Footer from "../components/Footer";
import Numerology from "../components/Numerology";
import Magic8BallLoader from "../components/Magic8BallLoader";

export default function NumerologyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [numerologyLoaded, setNumerologyLoaded] = useState(false); // Track when Numerology is loaded
  const [communionLoaded, setCommunionLoaded] = useState(false); // Track when Communion is loaded

  useEffect(() => {
    if (numerologyLoaded && communionLoaded) {
      setIsLoading(false);
    }
  }, [numerologyLoaded, communionLoaded]);

  return (
    <>
      {isLoading && <Magic8BallLoader isLoading={isLoading} />}
      <div style={{ margin: "6rem 2rem 0rem 2rem" }}>
        <Numerology setNumerologyLoaded={setNumerologyLoaded} />
      </div>
      <div style={{ marginTop: "5rem" }}>
        <NavBar />
      </div>
      <div style={{ marginTop: "3rem" }}>
        <Footer setCommunionLoaded={setCommunionLoaded} />
      </div>
    </>
  );
}
