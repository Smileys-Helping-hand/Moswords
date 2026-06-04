'use client';

import { useEffect } from 'react';

/**
 * Prevents visual flicker during page hydration by disabling animations
 * until the page is fully loaded. This fixes the flickering issue on load.
 */
export function AntiFlicker() {
  useEffect(() => {
    const html = document.documentElement;

    // Ensure hydrating class is set
    if (!html.classList.contains('hydrating')) {
      html.classList.add('hydrating');
    }

    // Wait for page to be fully interactive
    const timer = setTimeout(() => {
      html.classList.remove('hydrating');
      html.classList.add('hydrated');
      // Force a repaint
      void html.offsetHeight;
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
