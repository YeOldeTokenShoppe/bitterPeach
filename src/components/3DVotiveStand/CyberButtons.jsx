// AnimatedRadioButtons.js
import React, { useRef, useCallback } from "react";
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

const AnimatedRadioButtons = () => {
  const containerRef = useRef(null);
  const [activeModal, setActiveModal] = React.useState(null);
  const previousBtnRef = useRef(null);

  const getNodes = (button) => {
    const container = button.closest(`.${styles["cyber-radio-btn-group"]}`);
    return Array.from(container.querySelectorAll("rect"));
  };

  const createGlitchEffect = (nodes, isActive) => {
    // Stop any existing animations
    gsap.killTweensOf(nodes);

    // Initial position animation
    gsap.to(nodes, {
      duration: 0.4,
      ease: "steps(10)",
      x: isActive ? "100%" : "-100%",
      stagger: 0.01,
      overwrite: true,
    });

    // Color animation
    if (isActive) {
      gsap.fromTo(
        nodes,
        { fill: "#5dc975" },
        {
          fill: "#76fa93",
          duration: 0.1,
          ease: "bounce.out",
          repeat: -1,
        }
      );
    }
  };

  const handleHover = (e, isHovering) => {
    const button = e.currentTarget;
    const nodes = getNodes(button);
    createGlitchEffect(nodes, isHovering);
  };

  const handleClick = (key) => {
    setActiveModal(key);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const BUTTONS = [
    { text: "Buy", key: "buy" },
    { text: "Stake/Claim", key: "stake" },
    { text: "Illumin8", key: "illumin8" },
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

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex flex-col items-center space-y-4 w-fit mb-8"
        ref={containerRef}
      >
        {BUTTONS.map(({ text, key }) => (
          <div className={`${styles["cyber-radio-btn-group"]} w-32`} key={key}>
            <button
              className={styles["cyber-label"]}
              onMouseEnter={(e) => handleHover(e, true)}
              onMouseLeave={(e) => handleHover(e, false)}
              onClick={() => handleClick(key)}
              style={{ width: "100%" }}
            >
              <span className={styles["cyber-span"]}>{text}</span>
              <svg
                className={styles["cyber-svg"]}
                height="100%"
                width="100%"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="none"
              >
                {[...Array(10)].map((_, i) => (
                  <rect
                    key={`rect-${i}`}
                    x="-101%"
                    y={i * 5}
                    width="100%"
                    height="5"
                    fill="#5dc975"
                  />
                ))}
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Single Modal for all content */}
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
