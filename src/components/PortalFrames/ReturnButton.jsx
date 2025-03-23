function ReturnButton({ currentParams, onNavigate }) {
  // Only show the button if we're viewing a specific item
  const isInPortalView = !!currentParams?.id;

  if (!isInPortalView) return null;

  return (
    <button
      onClick={() => onNavigate("/")}
      style={{
        position: "absolute",
        top: "20px",
        left: "20px",
        padding: "8px 16px",
        background: "rgba(255, 255, 255, 0.8)",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontWeight: "bold",
        zIndex: 1000,
        boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
        transition: "background 0.2s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 1)";
        e.currentTarget.style.transform = "scale(1.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.8)";
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      ← Back to Gallery
    </button>
  );
}

export default ReturnButton;
