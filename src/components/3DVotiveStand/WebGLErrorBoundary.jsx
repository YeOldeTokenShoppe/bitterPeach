import React from "react";

class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("WebGL Error:", error);
    console.error("Error Info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#fff",
            background: "#1a1a1a",
            borderRadius: "8px",
            margin: "20px",
          }}
        >
          <h2>3D Viewer Unavailable</h2>
          <p>We're unable to display the 3D content due to a WebGL error.</p>
          <p>This might be because:</p>
          <ul style={{ listStyle: "none", padding: "0" }}>
            <li>Your browser doesn't support WebGL</li>
            <li>Hardware acceleration is disabled</li>
            <li>Your device's graphics capabilities are limited</li>
          </ul>
          <p>Try:</p>
          <ul style={{ listStyle: "none", padding: "0" }}>
            <li>Using a modern browser (Chrome, Firefox, Safari)</li>
            <li>Enabling hardware acceleration in your browser settings</li>
            <li>Updating your graphics drivers</li>
          </ul>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 20px",
              background: "#4a4a4a",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WebGLErrorBoundary;
