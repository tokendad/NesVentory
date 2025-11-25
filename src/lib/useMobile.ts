import { useState, useEffect } from 'react';

/**
 * Breakpoint for mobile view (matches CSS media query)
 */
const MOBILE_BREAKPOINT = 900;

/**
 * Custom hook to detect mobile viewport
 * @returns boolean indicating if viewport is mobile-sized
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= MOBILE_BREAKPOINT;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    // Check on resize
    window.addEventListener('resize', checkMobile);
    
    // Initial check
    checkMobile();

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}

/**
 * Detect if the user is on a touch device
 * @returns boolean indicating if device has touch capabilities
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}
