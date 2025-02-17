"use client";
import React, { useEffect, useRef } from "react";
// import "../styles/RotatingText.css";

const RotatingText = () => {
  const t3xt1Ref = useRef(null);
  const t3xt2Ref = useRef(null);
  const t3xt3Ref = useRef(null);

  useEffect(() => {
    const t3xts = [
      ["The icon of", "intercession", "is onchain"],
      ["💰 Buy", "❤️‍🔥 Burn", "🚀 Believe"],
      // ["Thou hast", "to give eth", "to get RL80"],
      // ["LUCRUM GAUDIUM", "is latin for", "'profit is joy'"],
      ["prosper80", "infin80", "RL80"],
      // ["It may be", "stupid, but", "it's also dumb"],
      ["The lack of", "RL80 is the", "root of evil"],
      // ["A token ", "of appreciation"],
      ["The prophets", "predicted", " the profits"],
    ];

    let phraseIndex = 0;
    let wordIndex = 0;

    const n3xt = (text, element) => {
      if (!element) return;
      if (element.dataset.animating === "true") return;
      const sampleH = 50;
      const sampleT = element.textContent;
      const sampleNT = text;
      element.dataset.animating = "true";
      element.style.height = `${sampleH}px`;

      const samO = document.createElement("div");
      samO.style.transformOrigin = `0 ${sampleH / 2}px -${sampleH / 2}px`;
      samO.classList.add("t3xt");
      samO.textContent = sampleT;

      const samN = samO.cloneNode();
      samN.textContent = sampleNT;
      element.textContent = "";
      element.appendChild(samO);
      element.appendChild(samN);

      samO.classList.add("t3xt-out");
      samN.classList.add("t3xt-in");

      samN.addEventListener("animationend", function () {
        element.removeChild(samO);
        element.removeChild(samN);
        element.textContent = sampleNT;
        element.dataset.animating = "false";
      });
    };

    const changetext = () => {
      if (wordIndex > 2) {
        wordIndex = 0;
        phraseIndex++;
      }
      if (phraseIndex >= t3xts.length) {
        phraseIndex = 0;
      }
      const term = t3xts[phraseIndex][wordIndex];
      const elementRef =
        wordIndex === 0 ? t3xt1Ref : wordIndex === 1 ? t3xt2Ref : t3xt3Ref;
      n3xt(term, elementRef.current);

      if (wordIndex === 2) {
        setTimeout(changetext, 3500);
      } else {
        setTimeout(changetext, 200);
      }
      wordIndex++;
    };

    setTimeout(changetext, 150);
  }, []);

  return (
    <div className="rotating-text-body">
      <div ref={t3xt1Ref} className="t3xts t3xt-1">
        The Virgin
      </div>
      <div ref={t3xt2Ref} className="t3xts t3xt-2">
        is now
      </div>
      <div ref={t3xt3Ref} className="t3xts t3xt-3">
        Virtual
      </div>
    </div>
  );
};

export default RotatingText;
