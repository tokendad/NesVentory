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
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const checkMobile = () => {
      // Debounce resize events to avoid excessive state updates
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
      }, 100);
    };

    // Check on resize
    window.addEventListener('resize', checkMobile);
    
    // Initial check (no debounce needed)
    setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timeoutId);
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
