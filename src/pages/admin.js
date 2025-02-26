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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="p-4 border-2 border-blue-500 rounded bg-white shadow-lg my-4">
        <h2 className="text-xl font-bold mb-4 text-blue-700">
          Upload 3D Model with GZIP Compression
        </h2>
        <div className="mb-4">
          <label className="block mb-2 font-medium">Storage Path Prefix:</label>
          <input
            type="text"
            value={modelPath}
            onChange={(e) => setModelPath(e.target.value)}
            className="w-full p-2 border-2 border-gray-300 rounded"
          />
        </div>
        <input
          type="file"
          accept=".glb,.gltf"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="w-full p-2 border-2 border-gray-300 rounded"
        />
        {isUploading && <p className="text-blue-500 font-bold">Uploading...</p>}
        {message && <p className="mt-2 p-2 bg-gray-100 rounded">{message}</p>}
      </div>
    </div>
  );
}
