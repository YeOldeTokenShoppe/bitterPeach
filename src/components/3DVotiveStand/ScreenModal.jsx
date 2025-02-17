import React from "react";

const ScreenModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        zIndex: 9998, // Just below the character container
      }}
      onClick={onClose}
    />
  );
};

export default ScreenModal;
