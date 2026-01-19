'use client';

import { useAuth } from '@/hooks/use-auth';
import MainLayout from '@/components/main-layout';
import LoadingScreen from '@/components/loading-screen';

export default function Home() {
  const { status } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return <MainLayout />;
}
