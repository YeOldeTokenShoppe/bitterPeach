"use client";

import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook that provides clipboard functionality
 * @param {string} text - Text to be copied to clipboard
 * @param {number} timeout - Duration in milliseconds before resetting the copied state (default: 1500ms)
 * @returns {Object} - Object containing hasCopied state and onCopy function
 */
function useClipboard(text, timeout = 1500) {
  const [hasCopied, setHasCopied] = useState(false);

  const onCopy = useCallback(() => {
    // Use the clipboard API if available
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setHasCopied(true);
        })
        .catch((error) => {
          console.error('Failed to copy text: ', error);
        });
    } else {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // Make the textarea out of viewport
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        setHasCopied(true);
      } catch (error) {
        console.error('Failed to copy text: ', error);
      }

      document.body.removeChild(textArea);
    }
  }, [text]);

  useEffect(() => {
    if (hasCopied) {
      const timerId = setTimeout(() => {
        setHasCopied(false);
      }, timeout);

      return () => clearTimeout(timerId);
    }
  }, [hasCopied, timeout]);

  return { hasCopied, onCopy };
}

export default useClipboard; 