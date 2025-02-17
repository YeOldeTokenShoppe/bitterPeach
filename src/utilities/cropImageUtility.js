export const getCroppedImg = (
  imageSrc,
  crop = { x: 0, y: 0, width: 100, height: 100 }
) => {
  const image = new Image();

  // Set crossOrigin to allow Firebase Storage to serve images with CORS headers
  image.crossOrigin = "anonymous";
  image.src = imageSrc;

  return new Promise((resolve, reject) => {
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Ensure crop dimensions are valid
      const cropWidth = crop.width ? crop.width : image.naturalWidth;
      const cropHeight = crop.height ? crop.height : image.naturalHeight;

      canvas.width = cropWidth;
      canvas.height = cropHeight;

      ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        cropWidth * scaleX,
        cropHeight * scaleY,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // Convert the canvas to a data URL (JPEG format for compression)
      const dataUrl = canvas.toDataURL("image/jpeg"); // You can adjust the format if needed
      resolve(dataUrl);
    };

    // Enhanced error handling with more descriptive messages
    image.onerror = (error) =>
      reject(new Error(`Failed to load the image: ${error.message}`));
  });
};
