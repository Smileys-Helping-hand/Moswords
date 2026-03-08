'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/loading-screen';

export default function Home() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') router.replace('/dm');
    else if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  return <LoadingScreen />;
}
