import React from "react";

const StyledPopup = ({
  message,
  onConfirm,
  onClose,
  showSingleButton = false,
}) => {
  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "rgb(255, 195, 236)",
        color: "black",
        padding: "20px",
        borderRadius: "10px",
        zIndex: 10000,
        textAlign: "center",
        border: "2px white solid",
      }}
    >
      {/* <p>{message}</p> */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
        {!showSingleButton && onConfirm && (
          <button
            onClick={onConfirm}
            style={{
              marginTop: "10px",
              padding: "5px 10px",
              backgroundColor: "green",
              border: "none",
              borderRadius: "4px",
              color: "white",
              cursor: "pointer",
            }}
          >
            Confirm
          </button>
        )}
        <button
          onClick={onClose}
          style={{
            marginTop: "10px",
            padding: "5px 10px",
            backgroundColor: "red",
            border: "none",
            borderRadius: "4px",
            color: "white",
            cursor: "pointer",
          }}
        >
          {showSingleButton ? "OK" : "Close"}
        </button>
      </div>
    </div>
  );
};

export default StyledPopup;
