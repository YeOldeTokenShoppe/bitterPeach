import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { gzip } from "pako";
import { storage } from "./firebaseClient";

/**
 * Compresses and uploads a 3D model to Firebase Storage
 * @param {File} file - The GLB file to compress and upload
 * @param {string} path - The storage path (e.g., 'models/my-model.glb')
 * @returns {Promise<string>} - The download URL of the uploaded file
 */
export async function compressAndUploadModel(file, path) {
  try {
    // Read the file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Compress the file with GZIP
    const compressed = gzip(new Uint8Array(arrayBuffer));

    // Create a new Blob from the compressed data
    const compressedBlob = new Blob([compressed]);

    // Create a reference to the file location in Firebase Storage
    const modelRef = ref(storage, path);

    // Set metadata to indicate it's GZIP compressed
    const metadata = {
      contentType: "model/gltf-binary",
      contentEncoding: "gzip",
    };

    // Upload the compressed file
    await uploadBytes(modelRef, compressedBlob, metadata);
    console.log(`Model ${path} uploaded successfully with GZIP compression!`);

    // Get and return the download URL
    return await getDownloadURL(modelRef);
  } catch (error) {
    console.error("Error compressing and uploading model:", error);
    throw error;
  }
}

/**
 * Fetches a model URL from Firebase Storage, with fallback to public folder
 * @param {string} storagePath - Path in Firebase Storage
 * @param {string} publicPath - Fallback path in public folder
 * @returns {Promise<string>} - The download URL
 */
export async function getModelUrl(storagePath, publicPath) {
  try {
    const modelRef = ref(storage, storagePath);
    return await getDownloadURL(modelRef);
  } catch (error) {
    console.warn(
      `Error fetching model from Firebase Storage: ${error.message}`
    );
    console.warn(`Falling back to public path: ${publicPath}`);
    return publicPath;
  }
}
