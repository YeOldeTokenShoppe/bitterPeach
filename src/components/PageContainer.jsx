import React from "react";

/**
 * A responsive container component that provides consistent width constraints
 * across the application.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render inside the container
 * @param {string} props.className - Additional CSS classes to apply
 * @param {Object} props.style - Additional inline styles to apply
 * @param {boolean} props.fullWidth - Whether to use full width (ignores max-width)
 * @param {string} props.maxWidth - Custom max-width value (overrides default)
 * @param {string} props.as - HTML element to render as (default: 'div')
 * @param {boolean} props.withHeaderSpace - Whether to add top padding for header (default: true)
 */
const PageContainer = ({
  children,
  className = "",
  style = {},
  fullWidth = false,
  maxWidth,
  as: Component = "div",
  withHeaderSpace = true,
  ...rest
}) => {
  const containerStyle = {
    width: "100%",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: withHeaderSpace ? "125px" : "0",
    ...style,
    ...(fullWidth
      ? {}
      : { maxWidth: maxWidth || "min(1400px, calc(100% - 4rem))" }),
  };

  return (
    <Component
      className={`page-container ${className}`.trim()}
      style={containerStyle}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default PageContainer;
