// pages/numerology.js
import React, { useState, useEffect } from "react";
import NavBar from "../components/NavBar.client";
import Communion from "../components/Communion";
import Loader from "../components/Loader";

import dynamic from "next/dynamic";

const Numerology = dynamic(() => import("../components/Numerology"), {
  ssr: false,
});

export default function NumerologyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [numerologyLoaded, setNumerologyLoaded] = useState(false); // Track when Thesis is loaded

  useEffect(() => {
    if (numerologyLoaded) {
      setIsLoading(false);
    }
  }, [numerologyLoaded]);
  return (
    <>
      {isLoading && <Loader />}
      <div style={{ margin: "4rem 2rem 0rem 2rem" }}>
        <Numerology setNumerologyLoaded={setNumerologyLoaded} />
      </div>
      <div style={{ marginTop: "5rem" }}>
        <NavBar />
      </div>
      <div style={{ marginTop: "3rem" }}>
        <Communion />
      </div>
    </>
  );
}
