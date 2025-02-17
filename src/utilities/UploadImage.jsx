import React, { useState } from "react";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function UploadImage({ onUpload }) {
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const auth = getAuth();
  const storage = getStorage();
  const db = getFirestore();

  const handleImageChange = async (e) => {
    const file = e.target.files[0];

    if (file && file.size > MAX_FILE_SIZE) {
      alert(
        "The file size exceeds the 5MB limit. Please choose a smaller file."
      );
      return;
    }

    if (file) {
      setUploading(true);
      setUploadMessage("Processing image...");

      try {
        const resizedImageBlob = await resizeImage(file, 150, 150);

        const user = auth.currentUser;
        const storageRef = ref(storage, `userImages/${user.uid}/${file.name}`);

        // Upload resized image
        await uploadBytes(storageRef, resizedImageBlob);

        // Get URL of the uploaded image
        const finalImageUrl = await getDownloadURL(storageRef);
        setImageUrl(finalImageUrl); // Show the image immediately

        // Store the final image URL in Firestore
        await setDoc(
          doc(db, "users", user.uid),
          { profileImage: finalImageUrl },
          { merge: true }
        );

        setUploading(false);
        setUploadMessage("Image uploaded successfully!");

        // Notify parent component of the final image URL
        if (onUpload) {
          onUpload(finalImageUrl);
        }
      } catch (error) {
        console.error("Error uploading image:", error);
        setUploading(false);
        setUploadMessage("Error uploading image. Please try again.");
      }
    }
  };

  const resizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const canvas = document.createElement("canvas");
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;

        img.onload = () => {
          const ctx = canvas.getContext("2d");
          let width = img.width;
          let height = img.height;

          // Calculate the new dimensions
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height *= maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width *= maxHeight / height));
              height = maxHeight;
            }
          }

          // Set canvas dimensions and draw the image
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error("Image resizing failed."));
              }
            },
            "image/jpeg",
            0.9
          );
        };
      };

      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleClick = () => {
    document.getElementById("fileInput").click();
  };

  return (
    <div>
      <input
        id="fileInput"
        type="file"
        onChange={handleImageChange}
        disabled={uploading}
        style={{ display: "none" }} // Hide the default file input
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        className="upload"
        style={{
          color: "#444",
          position: "relative",
          //   top: "110px",
          width: "8rem",
          /* padding: 0.3em 0.5em; */
          cursor: "pointer",
          background: "#ccc",
          borderRadius: "5px",
          borderTop: "1px solid #fff",
          boxShadow: "0 5px 0 #999",
          transition: "boxShadow 0.1s, top 0.1s",
        }}
      >
        {uploading ? "Uploading..." : "Choose File"}
      </button>
      {uploading && <p>{uploadMessage}</p>}
    </div>
  );
}

export default UploadImage;
