import * as React from "react"
import { Box } from "./box"

/**
 * Flex component that mimics Chakra UI Flex behavior
 * It's a Box with display="flex" by default and extra flex-specific props
 */
const Flex = React.forwardRef(({
  align, 
  justify,
  direction,
  wrap,
  gap,
  basis,
  grow,
  shrink,
  ...props
}, ref) => {
  return (
    <Box 
      display="flex"
      alignItems={align}
      justifyContent={justify}
      flexDirection={direction}
      flexWrap={wrap}
      gap={gap}
      flexBasis={basis}
      flexGrow={grow}
      flexShrink={shrink}
      ref={ref}
      {...props}
    />
  );
});

Flex.displayName = "Flex"

export { Flex } 