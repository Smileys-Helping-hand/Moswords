'use client';

import { useEffect } from 'react';

/**
 * Prevents visual flicker during page hydration by disabling animations
 * until the page is fully loaded and all dynamically-loaded components
 * have mounted and started their animations.
 */
export function AntiFlicker() {
  useEffect(() => {
    const html = document.documentElement;

    // Ensure hydrating class is set
    if (!html.classList.contains('hydrating')) {
      html.classList.add('hydrating');
    }

    // Wait longer to allow dynamically-loaded components (NetworkStatus, DeviceIndicator)
    // to mount and complete their animations before removing the hydrating class.
    // This ensures all framer-motion animations are suppressed during hydration.
    const timer = setTimeout(() => {
      html.classList.remove('hydrating');
      html.classList.add('hydrated');
      // Force a repaint to ensure the transition is clean
      void html.offsetHeight;
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
