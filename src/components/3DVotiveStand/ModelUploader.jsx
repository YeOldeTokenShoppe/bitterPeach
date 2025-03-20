import { useState } from "react";
import { compressAndUploadModel } from "../../utilities/modelCompression";
import { storage } from "../../utilities/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import "react-tabs/style/react-tabs.css";
import AudioWaveform from "../AudioWaveform";

export default function ModelUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [modelPath, setModelPath] = useState("models/");
  const [audioPath, setAudioPath] = useState("audio/");
  const [uploadType, setUploadType] = useState("model"); // "model" or "audio"
  const [audioQuality, setAudioQuality] = useState("medium"); // "low", "medium", or "high"
  const [shouldOptimizeAudio, setShouldOptimizeAudio] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Handle file upload based on type
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(`Processing ${uploadType}...`);

    try {
      if (uploadType === "model") {
        // Handle model upload with existing function
        const path = modelPath + file.name;
        const downloadUrl = await compressAndUploadModel(file, path);
        setMessage(`Model uploaded successfully! URL: ${downloadUrl}`);
      } else if (uploadType === "audio") {
        // Handle audio upload
        await uploadAudioFile(file);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Function to upload audio file
  const uploadAudioFile = async (file) => {
    // Get file extension and determine content type
    const extension = file.name.split(".").pop().toLowerCase();
    let contentType = "audio/mpeg"; // Default

    if (extension === "wav") contentType = "audio/wav";
    else if (extension === "m4a") contentType = "audio/mp4";
    else if (extension === "ogg") contentType = "audio/ogg";

    // Format the filename (replace spaces with dashes, lowercase)
    const formattedName = file.name.replace(/\s+/g, "-").toLowerCase();

    // Determine the quality folder
    const qualityFolder =
      audioQuality === "low"
        ? "128k"
        : audioQuality === "medium"
        ? "192k"
        : "320k";

    // Create the storage path
    const path = `${audioPath}${qualityFolder}/${formattedName}`;

    // Reference to the storage location
    const storageRef = ref(storage, path);

    // Set metadata
    const metadata = {
      contentType: contentType,
      customMetadata: {
        originalName: file.name,
        quality: audioQuality,
        optimized: shouldOptimizeAudio.toString(),
      },
    };

    // For future optimization, we'd handle compression here
    // Currently just uploading directly

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    setMessage(`Audio file uploaded successfully!
Quality: ${audioQuality}
Path: ${path}
URL: ${downloadURL}`);

    return downloadURL;
  };

  // Handle uploading to all quality levels
  const handleMultiQualityUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(`Uploading to all quality levels...`);

    try {
      const qualities = ["low", "medium", "high"];
      const results = [];

      for (const quality of qualities) {
        // Save current quality to state for uploadAudioFile to use
        setAudioQuality(quality);
        // Upload with current quality setting
        const downloadUrl = await uploadAudioFile(file);
        results.push({ quality, downloadUrl });
      }

      setMessage(`Audio uploaded in multiple qualities:
Low (128k): success
Medium (192k): success
High (320k): success

Base URL: ${audioPath}`);
    } catch (error) {
      setMessage(`Error uploading multiple qualities: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-4 border-2 border-blue-500 rounded bg-white shadow-lg my-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-blue-700">
        Upload Assets with Compression
      </h2>

      {/* Toggle between Model and Audio upload */}
      <div className="mb-4">
        <div className="flex space-x-4">
          <button
            className={`px-4 py-2 rounded ${
              uploadType === "model"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setUploadType("model")}
          >
            3D Models
          </button>
          <button
            className={`px-4 py-2 rounded ${
              uploadType === "audio"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setUploadType("audio")}
          >
            Audio Files
          </button>
        </div>
      </div>

      {/* Model Upload Section */}
      {uploadType === "model" && (
        <>
          <div className="mb-4">
            <label className="block mb-2 font-medium">
              Model Storage Path:
            </label>
            <input
              type="text"
              value={modelPath}
              onChange={(e) => setModelPath(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="mb-4">
            <label className="block mb-2 font-medium">
              Select GLB/GLTF File:
            </label>
            <input
              type="file"
              accept=".glb,.gltf"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="w-full p-2 border-2 border-gray-300 rounded text-gray-700"
            />
          </div>
        </>
      )}

      {/* Audio Upload Section */}
      {uploadType === "audio" && (
        <>
          <div className="mb-4">
            <label className="block mb-2 font-medium">
              Audio Storage Path:
            </label>
            <input
              type="text"
              value={audioPath}
              onChange={(e) => setAudioPath(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded focus:border-blue-500 focus:outline-none"
              placeholder="audio/"
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Audio Quality:</label>
            <select
              value={audioQuality}
              onChange={(e) => setAudioQuality(e.target.value)}
              className="w-full p-2 border-2 border-gray-300 rounded focus:border-blue-500 focus:outline-none"
            >
              <option value="low">Low (128kbps)</option>
              <option value="medium">Medium (192kbps)</option>
              <option value="high">High (320kbps)</option>
            </select>
          </div>

          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="optimize-audio"
              checked={shouldOptimizeAudio}
              onChange={(e) => setShouldOptimizeAudio(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="optimize-audio">
              Add optimization metadata (future support)
            </label>
          </div>

          <div className="mb-4">
            <label className="block mb-2 font-medium">Select Audio File:</label>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.ogg"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="w-full p-2 border-2 border-gray-300 rounded text-gray-700"
            />
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Or upload to all quality levels at once:
            </p>
            <button
              onClick={() =>
                document.getElementById("multi-quality-upload").click()
              }
              disabled={isUploading}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Upload to All Quality Levels
            </button>
            <input
              id="multi-quality-upload"
              type="file"
              accept=".mp3,.wav,.m4a,.ogg"
              onChange={handleMultiQualityUpload}
              disabled={isUploading}
              className="hidden"
            />
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-medium text-blue-700 mb-1">
              Tips for Audio Files
            </h3>
            <ul className="list-disc pl-5 text-sm text-gray-700">
              <li>MP3 format is recommended for best compatibility</li>
              <li>Files will be stored in quality-specific folders</li>
              <li>
                Your MusicPlayer will automatically select the right quality
                based on network conditions
              </li>
              <li>
                File names will be converted to lowercase with dashes instead of
                spaces
              </li>
            </ul>
          </div>
        </>
      )}

      {isUploading && (
        <div className="text-blue-500 font-bold p-2 bg-blue-100 rounded flex items-center">
          <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Uploading... Please wait.
        </div>
      )}

      {message && (
        <div className="mt-2 p-3 bg-gray-100 rounded border border-gray-300 whitespace-pre-line">
          {message}
        </div>
      )}
    </div>
  );
}
