'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// Must live in a Client Component so ssr:false is allowed
const MobileWrapper = dynamic(() => import('./MobileWrapper'), { ssr: false });

export default function ClientMobileWrapper({ children }: { children: ReactNode }) {
  return <MobileWrapper>{children}</MobileWrapper>;
}
