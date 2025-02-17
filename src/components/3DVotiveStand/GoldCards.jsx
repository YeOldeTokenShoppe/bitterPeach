import React, { useState } from "react";
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

const GoldCards = () => {
  const [selectedCard, setSelectedCard] = useState(null);

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
