import { useState } from "react";
import { compressAndUploadModel } from "../../utilities/modelCompression";

export default function ModelUploader() {
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
    <div className="p-4 border-2 border-blue-500 rounded bg-white shadow-lg my-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-blue-700">
        Upload 3D Model with GZIP Compression
      </h2>
      <div className="mb-4">
        <label className="block mb-2 font-medium">Storage Path Prefix:</label>
        <input
          type="text"
          value={modelPath}
          onChange={(e) => setModelPath(e.target.value)}
          className="w-full p-2 border-2 border-gray-300 rounded focus:border-blue-500 focus:outline-none"
        />
      </div>
      <div className="mb-4">
        <label className="block mb-2 font-medium">Select GLB/GLTF File:</label>
        <input
          type="file"
          accept=".glb,.gltf"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="w-full p-2 border-2 border-gray-300 rounded text-gray-700"
        />
      </div>
      {isUploading && (
        <p className="text-blue-500 font-bold p-2 bg-blue-100 rounded">
          Uploading and compressing... Please wait.
        </p>
      )}
      {message && (
        <p className="mt-2 p-3 bg-gray-100 rounded border border-gray-300">
          {message}
        </p>
      )}
    </div>
  );
}
