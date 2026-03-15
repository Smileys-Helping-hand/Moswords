'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/loading-screen';

// When the Capacitor WebView wakes on a deep-link URL that has no static
// file in the export (e.g. /dm/123), redirect back to root and let
// client-side routing take over.
export default function NotFound() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  return <LoadingScreen />;
}
