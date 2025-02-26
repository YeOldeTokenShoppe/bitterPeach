import React, { useRef, useState } from "react";
import gsap from "gsap";
import styles from "../../../styles/RadioButtons.module.css";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { Stake } from "./Stake";
import Buy from "./Buy";

const AnimatedRadioButtons = ({ onButtonClick }) => {
  const containerRef = useRef(null);
  const [activeModal, setActiveModal] = useState(null);
  const [monstersActive, setMonstersActive] = useState(false);

  const getNodes = (button) => {
    const container = button.closest(`.${styles["cyber-radio-btn-group"]}`);
    return Array.from(container.querySelectorAll("rect"));
  };

  const createGlitchEffect = (
    nodes,
    isActive,
    color = "#5dc975",
    activeColor = "#76fa93"
  ) => {
    gsap.killTweensOf(nodes);

    gsap.to(nodes, {
      duration: 0.4,
      ease: "steps(10)",
      x: isActive ? "100%" : "-100%",
      stagger: 0.01,
      overwrite: true,
    });

    if (isActive) {
      gsap.fromTo(
        nodes,
        { fill: color },
        {
          fill: activeColor,
          duration: 0.1,
          ease: "bounce.out",
          repeat: -1,
        }
      );
    }
  };

  const handleHover = (e, isHovering, key) => {
    const button = e.currentTarget;
    const nodes = getNodes(button);

    if (key === "fight" && monstersActive) {
      return; // Prevents overriding the red effect after activation
    }

    createGlitchEffect(nodes, isHovering);
  };

  const handleClick = (key) => {
    console.log("🔥 Button clicked:", key);

    if (key === "fight") {
      setMonstersActive(true);
    }

    if (typeof onButtonClick === "function") {
      onButtonClick(key);
    }
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const BUTTONS = [
    { text: "Buy", key: "buy" },
    { text: "Stake", key: "stake" },
    // { text: monstersActive ? "Monster Mode" : "Fight", key: "fight" },
    { text: "Get Lit!", key: "Get Lit" },
  ];

  const renderModalContent = () => {
    switch (activeModal) {
      case "buy":
        return <Buy />;
      case "stake":
        return <Stake />;
      default:
        return null;
    }
  };

  const renderSvgRects = (key) => {
    const isFightActive = key === "fight" && monstersActive;
    const fillColor = isFightActive ? "#ff3333" : "#5dc975";

    return [...Array(10)].map((_, i) => (
      <rect
        key={`rect-${i}`}
        x={isFightActive ? "0" : "-101%"} // Keep visible if Fight is active
        y={i * 5}
        width="100%"
        height="5"
        fill={fillColor}
      />
    ));
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex flex-col items-center space-y-8 w-fit mb-8"
        ref={containerRef}
      >
        {BUTTONS.map(({ text, key }) => (
          <div
            className={`${styles["cyber-radio-btn-group"]} w-32`}
            key={key}
            style={{ marginBottom: "24px" }}
          >
            <button
              className={`${styles["cyber-label"]} ${
                key === "fight" && monstersActive ? styles["fight-active"] : ""
              } ${
                key === "fight" && monstersActive ? styles["fight-hover"] : ""
              }`}
              onMouseEnter={(e) => handleHover(e, true, key)}
              onMouseLeave={(e) => handleHover(e, false, key)}
              onClick={() => handleClick(key)}
              // style={{
              //   width: "100%",
              //   color: key === "fight" && monstersActive ? "#fff" : "inherit",
              //   backgroundColor:
              //     key === "fight" && monstersActive ? "#ff3333" : "transparent",
              //   transition: "background-color 0.3s ease",
              //   transform: "skewX(-15deg)", // Keep skew effect on Fight button
              // }}
            >
              <span className={styles["cyber-span"]}>{text}</span>
              <svg
                className={styles["cyber-svg"]}
                height="100%"
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                {renderSvgRects(key)}
              </svg>
            </button>
          </div>
        ))}
      </div>

      <Modal
        isOpen={activeModal !== null}
        onClose={handleCloseModal}
        isCentered
        size={activeModal === "stake" ? "xl" : "md"}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody p={0}>{renderModalContent()}</ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AnimatedRadioButtons;
