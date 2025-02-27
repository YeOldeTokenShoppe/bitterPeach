import React from "react";
import FullWidthFooter from "./FullWidthFooter";
import Communion from "./Communion";

/**
 * A reusable footer component that combines FullWidthFooter and Communion
 * for easier use across pages.
 *
 * @param {Object} props - Component props
 * @param {string} props.className - Additional CSS classes to apply to FullWidthFooter
 * @param {Object} props.style - Additional inline styles to apply to FullWidthFooter
 * @param {Function} props.setCommunionLoaded - Callback function to track when Communion is loaded
 */
const Footer = ({
  className = "",
  style = {},
  setCommunionLoaded = () => {},
  ...rest
}) => {
  return (
    <FullWidthFooter className={className} style={style} {...rest}>
      <Communion setCommunionLoaded={setCommunionLoaded} />
    </FullWidthFooter>
  );
};

export default Footer;
