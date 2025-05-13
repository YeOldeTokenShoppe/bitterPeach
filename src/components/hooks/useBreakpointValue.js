"use client";

import { useMemo } from 'react';
import useMediaQuery from './useMediaQuery';

/**
 * Custom hook that returns different values based on the current breakpoint
 * @param {Object} values - Object with breakpoint names as keys and values to return when that breakpoint is active
 * @returns {any} - The value corresponding to the current active breakpoint
 */
function useBreakpointValue(values) {
  // Define standard breakpoints
  const breakpoints = {
    base: true, // Always true as a fallback
    sm: useMediaQuery('(min-width: 640px)'),
    md: useMediaQuery('(min-width: 768px)'),
    lg: useMediaQuery('(min-width: 1024px)'),
    xl: useMediaQuery('(min-width: 1280px)'),
    '2xl': useMediaQuery('(min-width: 1536px)'),
  };

  // Calculate the current value based on active breakpoints
  const value = useMemo(() => {
    // Order of breakpoints from smallest to largest
    const breakpointOrder = ['base', 'sm', 'md', 'lg', 'xl', '2xl'];
    
    // Find the largest active breakpoint that has a defined value
    const activeBreakpoint = breakpointOrder
      .reverse()
      .find(bp => breakpoints[bp] && values.hasOwnProperty(bp));
    
    // Return the value for the active breakpoint, or the base value as fallback
    return activeBreakpoint ? values[activeBreakpoint] : values.base;
  }, [values, breakpoints]);

  return value;
}

export default useBreakpointValue; 