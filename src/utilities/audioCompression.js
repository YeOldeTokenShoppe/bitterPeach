import { storage } from "../utilities/firebaseClient";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ffmpeg from "@ffmpeg/ffmpeg";

// Initialize FFmpeg
const { createFFmpeg, fetchFile } = ffmpeg;
let ffmpegInstance = null;

const getFFmpeg = async () => {
  if (!ffmpegInstance) {
    ffmpegInstance = createFFmpeg({
      log: process.env.NODE_ENV === "development",
    });
    await ffmpegInstance.load();
  }
  return ffmpegInstance;
};

/**
 * Compresses and uploads an audio file to Firebase Storage
 * @param {File} file - The audio file to compress and upload
 * @param {string} path - The path in Firebase Storage to store the file
 * @param {string} quality - Quality level: "low" (128k), "medium" (192k), or "high" (320k)
 * @returns {Promise<string>} Download URL of the uploaded file
 */
export const compressAndUploadAudio = async (
  file,
  path,
  quality = "medium"
) => {
  try {
    // Get the ffmpeg instance
    const ffmpeg = await getFFmpeg();

    // Get file data
    const fileData = await fetchFile(file);
    const fileName = file.name.split(".").slice(0, -1).join(".");
    const fileExt = file.name.split(".").pop().toLowerCase();

    // Write the file to the ffmpeg virtual file system
    ffmpeg.FS("writeFile", file.name, fileData);

    // Determine bitrate based on quality
    let bitrate = "192k"; // Default medium quality
    if (quality === "low") {
      bitrate = "128k";
    } else if (quality === "high") {
      bitrate = "320k";
    }

    // Output filename
    const outputName = `${fileName}_${quality}.mp3`;

    // Compress audio using ffmpeg with specified bitrate
    await ffmpeg.run(
      "-i",
      file.name,
      "-b:a",
      bitrate,
      "-map",
      "0:a",
      "-codec:a",
      "libmp3lame", // Use MP3 encoder
      outputName
    );

    // Read the result
    const data = ffmpeg.FS("readFile", outputName);

    // Convert to blob
    const blob = new Blob([data.buffer], { type: "audio/mp3" });

    // Upload to Firebase Storage
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: "audio/mp3",
      customMetadata: {
        quality,
        originalName: file.name,
        originalType: file.type,
        compressed: "true",
      },
    });

    // Get download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Clean up ffmpeg filesystem
    ffmpeg.FS("unlink", file.name);
    ffmpeg.FS("unlink", outputName);

    return downloadURL;
  } catch (error) {
    console.error("Error compressing and uploading audio:", error);
    throw new Error(`Failed to compress and upload audio: ${error.message}`);
  }
};

/**
 * Optimizes audio by determining the best quality based on file size
 * @param {File} file - The audio file to analyze
 * @returns {string} Recommended quality level
 */
export const getRecommendedAudioQuality = (file) => {
  const fileSizeMB = file.size / (1024 * 1024);

  if (fileSizeMB < 2) {
    return "low"; // Small files can go with low quality
  } else if (fileSizeMB < 10) {
    return "medium"; // Medium size files
  } else {
    return "high"; // Large high-quality audio files
  }
};
