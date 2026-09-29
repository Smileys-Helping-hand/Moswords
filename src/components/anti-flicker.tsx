'use client';

import { useEffect } from 'react';

/**
 * Removes the `hydrating` class (set by an inline script before first paint)
 * once React has mounted and two frames have painted, re-enabling CSS
 * transitions. Only transitions are paused while it is set — see globals.css.
 */
export function AntiFlicker() {
  useEffect(() => {
    const html = document.documentElement;
    const done = () => {
      html.classList.remove('hydrating');
      html.classList.add('hydrated');
    };
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(done);
    });
    // Background tabs pause animation frames; never leave transitions disabled.
    const fallback = setTimeout(done, 400);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      clearTimeout(fallback);
    };
  }, []);

  return null;
}
