const BREAKPOINTS = {
  PHONE_SMALL: 320,
  PHONE_MEDIUM: 375,
  PHONE_LARGE: 576,
  TABLET_SMALL: 1024,
  TABLET_MEDIUM: 1180,
  TABLET_LARGE: 1280,
  DESKTOP_SMALL: 1366,
  DESKTOP_MEDIUM: 1460,
  DESKTOP_LARGE: 1920,
};

export const getScreenCategory = () => {
  if (typeof window === "undefined") return "desktop-medium";

  const width = window.innerWidth;
  const height = window.innerHeight;
  const aspectRatio = width / height;
  const isLandscape = aspectRatio > 1;
  const largerDimension = Math.max(width, height);
  const isIpad =
    /iPad|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;

  // Detect iPad Mini
  if (isIpad && largerDimension === 1024) {
    if (isLandscape && width === 1024 && height === 768) {
      return "tablet-small-landscape";
    }
    if (!isLandscape && width === 768 && height === 1024) {
      return "tablet-small-portrait";
    }
  }

  // Detect iPad Air
  if (isIpad && largerDimension === 1180) {
    return isLandscape ? "tablet-medium-landscape" : "tablet-medium-portrait";
  }

  // Detect iPad Pro
  if (isIpad && largerDimension === 1366) {
    return isLandscape ? "tablet-large-landscape" : "tablet-large-portrait";
  }

  // General iPad fallback
  if (isIpad) {
    return isLandscape ? "tablet-large-landscape" : "tablet-large-portrait";
  }

  // Phone detection
  if (largerDimension <= BREAKPOINTS.PHONE_LARGE && !isLandscape) {
    return width <= BREAKPOINTS.PHONE_SMALL
      ? "phone-small"
      : width <= BREAKPOINTS.PHONE_MEDIUM
      ? "phone-medium"
      : "phone-large";
  }

  // Tablet detection
  if (largerDimension <= BREAKPOINTS.TABLET_SMALL) {
    return isLandscape ? "tablet-small-landscape" : "tablet-small-portrait";
  }

  if (
    largerDimension > BREAKPOINTS.TABLET_SMALL &&
    largerDimension <= BREAKPOINTS.TABLET_MEDIUM
  ) {
    return isLandscape ? "tablet-medium-landscape" : "tablet-medium-portrait";
  }

  if (
    largerDimension > BREAKPOINTS.TABLET_MEDIUM &&
    largerDimension <= BREAKPOINTS.TABLET_LARGE
  ) {
    return isLandscape ? "tablet-large-landscape" : "tablet-large-portrait";
  }

  // Desktop detection
  if (largerDimension > BREAKPOINTS.TABLET_LARGE) {
    return width <= BREAKPOINTS.DESKTOP_SMALL
      ? "desktop-small"
      : width <= BREAKPOINTS.DESKTOP_MEDIUM
      ? "desktop-medium"
      : "desktop-large";
  }

  // Fallback
  return "desktop-medium";
};
