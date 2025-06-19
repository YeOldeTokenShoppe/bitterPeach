import React from "react";
import MobileSidePanel from "./MobileSidePanel";

// This is a wrapper component that adds additional debugging and fixes for the 80s mode toggle issue
const MobileSidePanelFixed = (props) => {
  const { is80sMode, toggle80sMode, ...restProps } = props;
  
  // Create a debounced version of toggle80sMode to prevent rapid toggles
  const [isToggling, setIsToggling] = React.useState(false);
  const toggleTimeoutRef = React.useRef(null);
  
  const safeToggle80sMode = React.useCallback(() => {
    // Prevent rapid toggling
    if (isToggling) {
      console.log('🎵 Toggle already in progress, ignoring');
      return;
    }
    
    console.log('🎵 Safe toggle called, current state:', is80sMode);
    setIsToggling(true);
    
    // Clear any existing timeout
    if (toggleTimeoutRef.current) {
      clearTimeout(toggleTimeoutRef.current);
    }
    
    // Call the actual toggle
    toggle80sMode();
    
    // Reset toggling flag after a delay
    toggleTimeoutRef.current = setTimeout(() => {
      setIsToggling(false);
      console.log('🎵 Toggle complete, ready for next toggle');
    }, 500); // 500ms debounce
  }, [is80sMode, toggle80sMode, isToggling]);
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (toggleTimeoutRef.current) {
        clearTimeout(toggleTimeoutRef.current);
      }
    };
  }, []);
  
  // Add debugging to track state changes
  React.useEffect(() => {
    console.log('🎵 MobileSidePanelFixed: is80sMode changed to:', is80sMode);
  }, [is80sMode]);
  
  return (
    <MobileSidePanel
      {...restProps}
      is80sMode={is80sMode}
      toggle80sMode={safeToggle80sMode}
    />
  );
};

export default MobileSidePanelFixed;