"use client";
import React, { useState, useEffect } from "react";
import Hero from "../components/Hero";
import Header from "../components/Header";
import NavBar from "../components/NavBar.client";
import Communion from "../components/Communion";
import Carousel from "../components/Carousel";
import dynamic from "next/dynamic";
import Loader from "../components/Loader";

const BurningEffect = dynamic(() => import("../components/BurningEffect"), {
  ssr: false,
});

export default function Home() {
  const [isLoading, setIsLoading] = useState(true); // Track the overall loading state
  const [heroLoaded, setHeroLoaded] = useState(false); // Track when Hero is loaded
  // const [communionLoaded, setCommunionLoaded] = useState(false); // Track when Communion is loaded
  useEffect(() => {
    if (heroLoaded) {
      setIsLoading(false);
    }
  }, [heroLoaded]);

  return (
    <>
      {" "}
      {isLoading && <Loader />}
      <div style={{ position: "relative", zIndex: 1, marginTop: "4rem" }}>
        <Hero setHeroLoaded={setHeroLoaded} />

        <NavBar />
      </div>
      <Communion />
    </>
  );
}
