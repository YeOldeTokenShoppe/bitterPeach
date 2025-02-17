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

  const getNodes = useCallback((button) => {
    const container = button.closest(`.${styles["cyber-radio-btn-group"]}`);
    const blueRects = Array.from(
      container.querySelectorAll(`.${styles["cyber-blue"]} rect`)
    );
    const pinkRects = Array.from(
      container.querySelectorAll(`.${styles["cyber-pink"]} rect`)
    );
    return [gsap.utils.shuffle(blueRects), gsap.utils.shuffle(pinkRects)];
  }, []);

  const handleHover = useCallback(
    (e, isHovering) => {
      const button = e.currentTarget;
      const nodes = getNodes(button);

      gsap.to(nodes[0], {
        duration: 1.8,
        ease: "elastic.out(1, 0.3)",
        xPercent: isHovering ? "-100" : "100",
        stagger: 0.012,
        overwrite: true,
      });

      gsap.to(nodes[1], {
        duration: 1.8,
        ease: "elastic.out(1, 0.3)",
        xPercent: isHovering ? "100" : "-100",
        stagger: 0.012,
        overwrite: true,
      });
    },
    [getNodes]
  );

  const handleClick = useCallback((key) => {
    setActiveModal(key);
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const BUTTONS = [
    { text: "Buy", key: "buy" },
    { text: "Stake/Claim", key: "stake" },
    { text: "Dedic8", key: "dedicate" },
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
              >
                <g className={styles["cyber-pink"]}>
                  {[...Array(10)].map((_, i) => (
                    <rect
                      key={`pink-${i}`}
                      x="-101%"
                      y={i * 4}
                      width="100%"
                      height="4"
                    />
                  ))}
                </g>
                <g className={styles["cyber-blue"]}>
                  {[...Array(10)].map((_, i) => (
                    <rect
                      key={`blue-${i}`}
                      x="101%"
                      y={i * 4}
                      width="100%"
                      height="4"
                    />
                  ))}
                </g>
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
          <ModalBody p={0}>{renderModalContent()}</ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default AnimatedRadioButtons;
