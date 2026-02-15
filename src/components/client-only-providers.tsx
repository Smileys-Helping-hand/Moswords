'use client';

import dynamic from 'next/dynamic';

// Dynamic imports with SSR disabled to prevent hydration issues
const NetworkStatus = dynamic(() => import('@/components/network-status'), { ssr: false });
const DeviceIndicator = dynamic(() => import('@/components/device-indicator'), { ssr: false });

export default function ClientOnlyProviders() {
  return (
    <>
      <NetworkStatus />
      <DeviceIndicator />
    </>
  );
}
