import React, { useEffect } from "react";
import ReactDOM from "react-dom";

const Modal = ({ card, onClose }) => {
  useEffect(() => {
    if (card) {
      document.body.classList.add("gold-modal-open");
    } else {
      document.body.classList.remove("gold-modal-open");
    }
    return () => document.body.classList.remove("gold-modal-open");
  }, [card]);

  if (!card) return null;

  const isBilliards = card.link === "/html/billiards.html";
  const modalStyle = {
    width: isBilliards ? "95vw" : "75vw", // Wider for Billiards
    maxWidth: isBilliards ? "1600px" : "1000px", // Larger max-width for Billiards
    height: isBilliards ? "90vh" : "85vh", // Taller for Billiards
    maxHeight: "95vh",
    padding: isBilliards ? "10px" : "20px", // Less padding for Billiards to maximize space
  };

  return ReactDOM.createPortal(
    <div className="gold-overlay" onClick={onClose}>
      <div
        className="gold-modal"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="gold-closeButton" onClick={onClose}>
          ×
        </button>
        <iframe
          src={card.link}
          className={`gold-modalIframe ${
            isBilliards ? "gold-billiards-iframe" : ""
          }`}
          title={card.title}
        ></iframe>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
