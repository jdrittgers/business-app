import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Extend window type for gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Hook to track page views in Google Analytics for SPA navigation
 */
export function useAnalytics() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag === 'function') {
      window.gtag('config', 'G-1CL1GFMWYL', {
        page_path: location.pathname + location.search
      });
    }
  }, [location]);
}

/**
 * Track custom events in Google Analytics
 */
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
}
