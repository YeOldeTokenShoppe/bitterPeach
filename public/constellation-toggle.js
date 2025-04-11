// Add event listener for constellation toggle
document.addEventListener("DOMContentLoaded", function () {
  console.log("Constellation toggle script loaded");

  const constellationToggle = document.getElementById("constellation-toggle");
  if (constellationToggle) {
    console.log("Found constellation toggle element");

    constellationToggle.addEventListener("click", function () {
      // Toggle active class
      this.classList.toggle("active");
      const isActive = this.classList.contains("active");
      console.log("Constellation toggle clicked, active:", isActive);

      // Dispatch custom event with current toggle state
      const event = new CustomEvent("constellation-toggle", {
        detail: { visible: isActive },
      });
      window.dispatchEvent(event);
      console.log(
        "Dispatched constellation-toggle event with visible:",
        isActive
      );
    });
  } else {
    console.warn("Constellation toggle element not found");
  }
});
