import React, { useRef, useCallback, memo } from "react";
import { Box } from "@chakra-ui/react";

const MissionControlIframe = memo(({ onLoad }) => {
  const iframeRef = useRef(null);

  const handleIframeLoad = useCallback(() => {
    console.log("Mission Control iframe loaded");
    if (onLoad) {
      onLoad();
    }
  }, [onLoad]);

  return (
    <Box
      position="absolute"
      top="0"
      left="0"
      width="100%"
      height="100%"
      borderRadius="15px"
      overflow="hidden"
      boxShadow="inset 0 0 30px rgba(0,0,0,0.5)"
    >
      <iframe
        key="mission-control-iframe-persistent"
        ref={iframeRef}
        src="/cyberpunk_mission_control_enhanced.html"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          overflow: "hidden",
          display: "block",
          backgroundColor: "transparent",
        }}
        title="Mission Control Panel"
        onLoad={handleIframeLoad}
      />
    </Box>
  );
}, () => true); // Never re-render this component

MissionControlIframe.displayName = "MissionControlIframe";

export default MissionControlIframe;