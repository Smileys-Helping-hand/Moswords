'use client';

import { useEffect } from 'react';

/**
 * UpdateChecker: Polls version.json and forces a page reload on version changes
 * Ensures users always see the latest UI (no stale cache issues on mobile)
 */
export default function UpdateChecker() {
  useEffect(() => {
    let isMounted = true;
    let checkInterval: NodeJS.Timeout | null = null;

    // Initial version stored in sessionStorage
    const getInitialVersion = async () => {
      try {
        const response = await fetch('/version.json', {
          cache: 'no-store',
          headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
        });
        if (response.ok) {
          const data = await response.json();
          return data.version;
        }
      } catch (err) {
        console.error('Failed to fetch initial version:', err);
      }
      return null;
    };

    const checkForUpdates = async () => {
      try {
        const response = await fetch('/version.json', {
          cache: 'no-store',
          headers: { 'pragma': 'no-cache', 'cache-control': 'no-cache' }
        });
        
        if (response.ok) {
          const data = await response.json();
          const currentVersion = sessionStorage.getItem('app-version');
          const newVersion = data.version;

          if (currentVersion && currentVersion !== newVersion) {
            console.log(`📦 Update detected: ${currentVersion} → ${newVersion}. Reloading...`);
            // Force hard refresh to clear caches and get new version
            window.location.reload();
          }
        }
      } catch (err) {
        console.error('Version check error:', err);
      }
    };

    // Initialize version on first load
    getInitialVersion().then((version) => {
      if (isMounted && version) {
        sessionStorage.setItem('app-version', version);
        console.log(`✅ App initialized at version: ${version}`);

        // Check for updates every 60 seconds
        checkInterval = setInterval(checkForUpdates, 60000);
      }
    });

    // Listen for service worker update messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_AVAILABLE') {
          console.log(`🔄 Service worker detected update. Reloading...`);
          window.location.reload();
        }
      });
    }

    return () => {
      isMounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  return null; // This is a non-visual component
}
