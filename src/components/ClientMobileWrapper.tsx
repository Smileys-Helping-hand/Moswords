'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Native (Capacitor) setup is a side effect only. It used to *wrap* the whole
// app in an ssr:false component, so nothing rendered on a phone until that
// extra chunk had downloaded.
const NativeSetup = dynamic(() => import('./MobileWrapper'), { ssr: false });

export default function ClientMobileWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <NativeSetup />
      {children}
    </>
  );
}
