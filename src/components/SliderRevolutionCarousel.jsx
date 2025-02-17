import { Box, Flex, useMediaQuery } from "@chakra-ui/react";

function SliderRevolutionCarousel() {
  const [isLargerThan768] = useMediaQuery("(min-width: 768px)");
  const [isSmallerThan30rem] = useMediaQuery("(max-width: 30rem)");

  const iframeSrc = isSmallerThan30rem
    ? "https://rl80.com/562-2/"
    : "https://rl80.com/645-2/";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: isLargerThan768 ? "60%" : "100%",
      }}
    >
      <iframe
        src={iframeSrc}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          border: "none",
        }}
        scrolling="no"
      />
    </div>
  );
}

export default SliderRevolutionCarousel;
