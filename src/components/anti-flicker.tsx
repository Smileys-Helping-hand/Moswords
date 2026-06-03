'use client';

import { useEffect } from 'react';

/**
 * Prevents visual flicker during page hydration by disabling animations
 * until the page is fully loaded. This fixes the flickering issue on load.
 */
export function AntiFlicker() {
  useEffect(() => {
    // Add class to disable animations during hydration
    const html = document.documentElement;
    html.classList.add('hydrating');

    // Small delay to ensure DOM is fully painted
    const timer = setTimeout(() => {
      html.classList.remove('hydrating');
      html.classList.add('hydrated');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
