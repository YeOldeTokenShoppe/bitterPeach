// Create a new utility file for audio handling
export function getOptimalAudioUrl(trackName, userBandwidth) {
  const bandwidthThresholds = {
    low: 50, // kbps
    medium: 150, // kbps
    high: 300, // kbps
  };

  // Select quality based on available bandwidth
  let quality = "low";
  if (userBandwidth > bandwidthThresholds.high) {
    quality = "high";
  } else if (userBandwidth > bandwidthThresholds.medium) {
    quality = "medium";
  }

  // Return appropriate URL from Firebase storage
  return `https://firebasestorage.googleapis.com/v0/b/your-project-id.appspot.com/o/audio%2F${quality}%2F${trackName}.mp3?alt=media`;
}
