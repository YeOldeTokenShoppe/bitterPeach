// pages/test.js
import React, { useState } from "react";
import { compressAndUploadModel } from "../utilities/modelCompression";
import { storage } from "../utilities/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function AdminPage() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [modelPath, setModelPath] = useState("models/");
  const [audioPath, setAudioPath] = useState("audio/192k/"); // Default to medium quality
  const [uploadType, setUploadType] = useState("model"); // "model" or "audio"

  const handleModelUpload = async (event) => {
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

  const handleAudioUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessage("Uploading audio file...");

    try {
      // Format the filename (replace spaces with dashes, lowercase)
      const formattedName = file.name.replace(/\s+/g, "-").toLowerCase();

      // Create the storage path
      const path = `${audioPath}${formattedName}`;

      // Reference to the storage location
      const storageRef = ref(storage, path);

      // Determine content type based on file extension
      const extension = file.name.split(".").pop().toLowerCase();
      let contentType = "audio/mpeg"; // Default

      if (extension === "wav") contentType = "audio/wav";
      else if (extension === "m4a") contentType = "audio/mp4";
      else if (extension === "ogg") contentType = "audio/ogg";

      // Set metadata
      const metadata = {
        contentType: contentType,
        customMetadata: {
          originalName: file.name,
        },
      };

      // Upload the file
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setMessage(`Audio file uploaded successfully!
Path: ${path}
URL: ${downloadURL}`);
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error("Upload error:", error);
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
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => setUploadType("model")}
            style={{
              padding: "8px 16px",
              marginRight: "10px",
              backgroundColor: uploadType === "model" ? "#3b82f6" : "#e5e7eb",
              color: uploadType === "model" ? "white" : "#4b5563",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            3D Models
          </button>
          <button
            onClick={() => setUploadType("audio")}
            style={{
              padding: "8px 16px",
              backgroundColor: uploadType === "audio" ? "#3b82f6" : "#e5e7eb",
              color: uploadType === "audio" ? "white" : "#4b5563",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Audio Files
          </button>
        </div>

        {uploadType === "model" ? (
          // Model Upload Section
          <>
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
              onChange={handleModelUpload}
              disabled={isUploading}
              style={{
                width: "100%",
                padding: "8px",
                border: "2px solid #d1d5db",
                borderRadius: "4px",
                marginBottom: "16px",
              }}
            />
          </>
        ) : (
          // Audio Upload Section
          <>
            <h2
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                marginBottom: "16px",
                color: "#1d4ed8",
              }}
            >
              Upload Audio File
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
                value={audioPath}
                onChange={(e) => setAudioPath(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "2px solid #d1d5db",
                  borderRadius: "4px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                Quality Folder:
              </label>
              <select
                onChange={(e) => setAudioPath(`audio/${e.target.value}/`)}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "2px solid #d1d5db",
                  borderRadius: "4px",
                }}
                value={audioPath.replace("audio/", "").replace("/", "")}
              >
                <option value="128k">Low Quality (128k)</option>
                <option value="192k">Medium Quality (192k)</option>
                <option value="320k">High Quality (320k)</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "500",
                }}
              >
                Select Audio File:
              </label>
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.ogg"
                onChange={handleAudioUpload}
                disabled={isUploading}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "2px solid #d1d5db",
                  borderRadius: "4px",
                  marginBottom: "16px",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                backgroundColor: "#e0f2fe",
                borderRadius: "4px",
                borderLeft: "4px solid #3b82f6",
              }}
            >
              <p style={{ fontSize: "14px", color: "#1e40af" }}>
                <strong>Tip:</strong> Upload your audio file in all three
                quality levels (128k, 192k, 320k) to support adaptive streaming.
                File names will be converted to lowercase with dashes instead of
                spaces.
              </p>
            </div>
          </>
        )}

        {isUploading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "#e0f2fe",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: "2px solid #bfdbfe",
                borderTopColor: "#3b82f6",
                marginRight: "12px",
                animation: "spin 1s linear infinite",
              }}
            ></div>
            <style jsx>{`
              @keyframes spin {
                0% {
                  transform: rotate(0deg);
                }
                100% {
                  transform: rotate(360deg);
                }
              }
            `}</style>
            <p style={{ color: "#1e40af", fontWeight: "bold" }}>Uploading...</p>
          </div>
        )}

        {message && (
          <p
            style={{
              marginTop: "16px",
              padding: "12px",
              backgroundColor: "#f3f4f6",
              borderRadius: "4px",
              whiteSpace: "pre-line",
            }}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
