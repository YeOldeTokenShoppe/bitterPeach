import React, { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../../../styles/Goldcards.module.css";
import Modal from "./Modal";

const cards = [
  {
    title: "Billiards",
    imgSrc: "/8ballicon.svg",
    description:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    link: "/html/billiards.html",
  },
  {
    title: "Races",
    imgSrc: "/horseshoe.svg",
    description:
      "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    link: "/html/Races.html",
  },
  {
    title: "Roulette",
    imgSrc: "/roulette.svg",
    description:
      " Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    link: "/html/wheel.html",
  },
];

const GoldCards = ({ setGoldCardsLoaded }) => {
  const [selectedCard, setSelectedCard] = useState(null);
  const [loadedImages, setLoadedImages] = useState(new Set());

  useEffect(() => {
    // If setGoldCardsLoaded is not provided, we don't need to track loading
    if (!setGoldCardsLoaded) return;

    // Preload all card images
    const preloadImages = async () => {
      try {
        const imageLoadPromises = cards.map((card) => {
          return new Promise((resolve) => {
            // Use window.Image instead of Image to avoid conflict
            const img =
              typeof window !== "undefined" ? new window.Image() : null;

            if (!img) {
              console.warn("Window not available, skipping image preload");
              resolve(false);
              return;
            }

            img.onload = () => {
              setLoadedImages((prev) => {
                const newSet = new Set(prev);
                newSet.add(card.imgSrc);
                return newSet;
              });
              resolve(true);
            };
            img.onerror = () => {
              console.error(`Failed to load image: ${card.imgSrc}`);
              resolve(false);
            };
            img.src = card.imgSrc;
          });
        });

        await Promise.all(imageLoadPromises);
        setGoldCardsLoaded(true);
      } catch (error) {
        console.error("Error preloading card images:", error);
        setGoldCardsLoaded(true); // Signal loaded anyway to prevent hanging
      }
    };

    preloadImages();
  }, [setGoldCardsLoaded, cards]);

  const handleImageLoad = (src) => {
    setLoadedImages((prev) => {
      const newSet = new Set(prev);
      newSet.add(src);

      // If all images are loaded, signal completion
      if (setGoldCardsLoaded && newSet.size === cards.length) {
        setGoldCardsLoaded(true);
      }

      return newSet;
    });
  };

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        {cards.map((card, index) => (
          <div
            key={index}
            className={styles.card}
            onClick={() => setSelectedCard(card)}
          >
            <img
              alt={card.title}
              src={card.imgSrc}
              className={styles.cardImage}
              onLoad={() => handleImageLoad(card.imgSrc)}
            />
            <h2>{card.title}</h2>
            <p>{card.description}</p>
          </div>
        ))}
      </div>
      <Modal card={selectedCard} onClose={() => setSelectedCard(null)} />
    </main>
  );
};

export default GoldCards;
