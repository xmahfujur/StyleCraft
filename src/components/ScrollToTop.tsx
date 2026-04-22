import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Component that scrolls the window to the top whenever the route changes.
 * This fixes the issue where navigating to a new page (like the Cart) 
 * might load with the scroll position at the bottom of the page.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Aggressive scroll reset
    const resetScroll = () => {
      window.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
      document.documentElement.scrollTo(0, 0);
    };

    resetScroll();
    
    // Tiny delay to handle cases where DOM rendering might affect scroll
    const timeoutId = setTimeout(resetScroll, 10);
    
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
