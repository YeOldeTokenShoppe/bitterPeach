// pages/thesis.js
import React, { useState } from "react";
import { compressAndUploadModel } from "../utilities/modelCompression";

export default function AdminPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [modelPath, setModelPath] = useState("models/");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessage("Compressing and uploading model...");

    try {
      const path = modelPath + file.name;
      const downloadUrl = await compressAndUploadModel(file, path);
      setMessage(`Model uploaded successfully! URL: ${downloadUrl}`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        padding: "20px",
        backgroundColor: "#f0f0f0",
      }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "20px",
          color: "#333",
        }}
      >
        Admin Dashboard
      </h1>

      <div
        style={{
          padding: "20px",
          border: "2px solid #3b82f6",
          borderRadius: "8px",
          backgroundColor: "white",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "20px",
          maxWidth: "600px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            marginBottom: "16px",
            color: "#1d4ed8",
          }}
        >
          Upload 3D Model with GZIP Compression
        </h2>

        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "500",
            }}
          >
            Storage Path Prefix:
          </label>
          <input
            type="text"
            value={modelPath}
            onChange={(e) => setModelPath(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              border: "2px solid #d1d5db",
              borderRadius: "4px",
            }}
          />
        </div>

        <input
          type="file"
          accept=".glb,.gltf"
          onChange={handleFileUpload}
          disabled={isUploading}
          style={{
            width: "100%",
            padding: "8px",
            border: "2px solid #d1d5db",
            borderRadius: "4px",
            marginBottom: "16px",
          }}
        />

        {isUploading && (
          <p
            style={{
              color: "#3b82f6",
              fontWeight: "bold",
            }}
          >
            Uploading...
          </p>
        )}

        {message && (
          <p
            style={{
              marginTop: "8px",
              padding: "8px",
              backgroundColor: "#f3f4f6",
              borderRadius: "4px",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
