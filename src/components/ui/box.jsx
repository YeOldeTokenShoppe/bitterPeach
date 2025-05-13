import * as React from "react"
import { cn } from "../../../lib/utils"

// Define some breakpoints to match Chakra UI
const breakpoints = {
  base: 0,
  sm: '30em',     // 480px
  md: '48em',     // 768px
  lg: '62em',     // 992px
  xl: '80em',     // 1280px
  '2xl': '96em',  // 1536px
};

// Convert px shorthand to proper CSS
const toPx = value => {
  if (typeof value === 'number') return `${value}px`;
  return value;
};

/**
 * Box component that mimics Chakra UI Box behavior
 * Accepts style props as direct props and merges them with className
 * Handles responsive props like mt={{ base: 4, md: 7 }}
 */
const Box = React.forwardRef(({ as: Component = "div", className, children, display, position, width, height, maxWidth, minWidth, maxHeight, minHeight, padding, paddingTop, paddingRight, paddingBottom, paddingLeft, margin, marginTop, marginRight, marginBottom, marginLeft, zIndex, top, right, bottom, left, overflow, overflowX, overflowY, color, bg, backgroundColor, opacity, flex, flexGrow, flexShrink, flexBasis, alignItems, justifyContent, flexDirection, flexWrap, boxShadow, transform, transition, objectFit, borderRadius, p, px, py, pt, pr, pb, pl, m, mx, my, mt, mr, mb, ml, ...props }, ref) => {
  
  // Handle Chakra-style shorthand props
  padding = p ?? padding;
  paddingTop = pt ?? paddingTop;
  paddingRight = pr ?? paddingRight;
  paddingBottom = pb ?? paddingBottom;
  paddingLeft = pl ?? paddingLeft;
  
  // Handle horizontal and vertical padding
  if (px !== undefined) {
    paddingLeft = px;
    paddingRight = px;
  }
  if (py !== undefined) {
    paddingTop = py;
    paddingBottom = py;
  }
  
  margin = m ?? margin;
  marginTop = mt ?? marginTop;
  marginRight = mr ?? marginRight;
  marginBottom = mb ?? marginBottom;
  marginLeft = ml ?? marginLeft;
  
  // Handle horizontal and vertical margins
  if (mx !== undefined) {
    marginLeft = mx;
    marginRight = mx;
  }
  if (my !== undefined) {
    marginTop = my;
    marginBottom = my;
  }
  
  // Process props that might be responsive objects
  const processResponsiveValue = (value) => {
    if (value === undefined) return undefined;
    
    // If it's not an object or doesn't have responsive keys, return directly
    if (typeof value !== 'object' || value === null) {
      return toPx(value);
    }
    
    // For responsive objects, use the base value
    return value.base !== undefined ? toPx(value.base) : undefined;
  };
  
  // Convert props to style object for base styles
  const style = {
    display: processResponsiveValue(display),
    position: processResponsiveValue(position),
    width: processResponsiveValue(width),
    height: processResponsiveValue(height),
    maxWidth: processResponsiveValue(maxWidth),
    minWidth: processResponsiveValue(minWidth),
    maxHeight: processResponsiveValue(maxHeight),
    minHeight: processResponsiveValue(minHeight),
    padding: processResponsiveValue(padding),
    paddingTop: processResponsiveValue(paddingTop),
    paddingRight: processResponsiveValue(paddingRight),
    paddingBottom: processResponsiveValue(paddingBottom),
    paddingLeft: processResponsiveValue(paddingLeft),
    margin: processResponsiveValue(margin),
    marginTop: processResponsiveValue(marginTop),
    marginRight: processResponsiveValue(marginRight),
    marginBottom: processResponsiveValue(marginBottom),
    marginLeft: processResponsiveValue(marginLeft),
    zIndex: processResponsiveValue(zIndex),
    top: processResponsiveValue(top),
    right: processResponsiveValue(right),
    bottom: processResponsiveValue(bottom),
    left: processResponsiveValue(left),
    overflow: processResponsiveValue(overflow),
    overflowX: processResponsiveValue(overflowX),
    overflowY: processResponsiveValue(overflowY),
    color: processResponsiveValue(color),
    backgroundColor: processResponsiveValue(backgroundColor || bg),
    opacity: processResponsiveValue(opacity),
    flex: processResponsiveValue(flex),
    flexGrow: processResponsiveValue(flexGrow),
    flexShrink: processResponsiveValue(flexShrink),
    flexBasis: processResponsiveValue(flexBasis),
    alignItems: processResponsiveValue(alignItems),
    justifyContent: processResponsiveValue(justifyContent),
    flexDirection: processResponsiveValue(flexDirection),
    flexWrap: processResponsiveValue(flexWrap),
    boxShadow: processResponsiveValue(boxShadow),
    transform: processResponsiveValue(transform),
    transition: processResponsiveValue(transition),
    objectFit: processResponsiveValue(objectFit),
    borderRadius: processResponsiveValue(borderRadius),
    ...(props.style || {}),
  };

  // Create dynamic style element for media queries
  const mediaQueryRef = React.useRef(null);
  React.useEffect(() => {
    // Create style element if it doesn't exist
    if (!mediaQueryRef.current) {
      mediaQueryRef.current = document.createElement('style');
      document.head.appendChild(mediaQueryRef.current);
    }
    
    // Define all style props to check for responsive values
    const styleProps = { 
      display, position, width, height, maxWidth, minWidth, maxHeight, minHeight, 
      padding, paddingTop, paddingRight, paddingBottom, paddingLeft, 
      margin, marginTop, marginRight, marginBottom, marginLeft, 
      zIndex, top, right, bottom, left, overflow, overflowX, overflowY, 
      color, backgroundColor: backgroundColor || bg, opacity, flex, flexGrow, flexShrink, flexBasis, 
      alignItems, justifyContent, flexDirection, flexWrap, boxShadow, transform, 
      transition, objectFit, borderRadius 
    };
    
    // Generate unique ID for this component
    const id = `box-${Math.random().toString(36).substr(2, 9)}`;
    let cssRules = '';
    
    // Process each breakpoint
    Object.entries(breakpoints).forEach(([breakName, minWidth]) => {
      if (breakName === 'base') return; // Skip base styles
      
      let mediaQueryStyles = [];
      
      // Check each prop for this breakpoint
      Object.entries(styleProps).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && value[breakName] !== undefined) {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          const cssValue = toPx(value[breakName]);
          mediaQueryStyles.push(`${cssKey}: ${cssValue};`);
        }
      });
      
      // If we have styles for this breakpoint, add them
      if (mediaQueryStyles.length > 0) {
        cssRules += `
          @media (min-width: ${minWidth}) {
            .${id} {
              ${mediaQueryStyles.join('\n')}
            }
          }
        `;
      }
    });
    
    // Update style element content
    if (cssRules) {
      mediaQueryRef.current.textContent = cssRules;
    }
    
    // Clean up on unmount
    return () => {
      if (mediaQueryRef.current) {
        document.head.removeChild(mediaQueryRef.current);
        mediaQueryRef.current = null;
      }
    };
  }, [
    display, position, width, height, maxWidth, minWidth, maxHeight, minHeight,
    padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
    margin, marginTop, marginRight, marginBottom, marginLeft,
    zIndex, top, right, bottom, left, overflow, overflowX, overflowY,
    color, backgroundColor, bg, opacity, flex, flexGrow, flexShrink, flexBasis,
    alignItems, justifyContent, flexDirection, flexWrap, boxShadow, transform,
    transition, objectFit, borderRadius
  ]);

  // Remove undefined values
  Object.keys(style).forEach(key => style[key] === undefined && delete style[key]);
  
  return (
    <Component
      ref={ref}
      className={cn(mediaQueryRef.current ? `box-${mediaQueryRef.current.id}` : '', className)}
      style={style}
      {...props}
    >
      {children}
    </Component>
  );
});

Box.displayName = "Box"

export { Box } 