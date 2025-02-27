import React from "react";

/**
 * A component that allows its children (typically a footer) to span the full width
 * of the viewport while the rest of the page content remains constrained.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render (typically a footer)
 * @param {string} props.className - Additional CSS classes to apply
 * @param {Object} props.style - Additional inline styles to apply
 */
const FullWidthFooter = ({ children, className = "", style = {}, ...rest }) => {
  return (
    <div
      className={`full-width-footer ${className}`.trim()}
      style={{
        width: "100vw",
        position: "relative",
        left: "50%",
        right: "50%",
        marginLeft: "-50vw",
        marginRight: "-50vw",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
};

export default FullWidthFooter;
