'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import MainLayout from '@/components/main-layout';
import LoadingScreen from '@/components/loading-screen';

export default function ServerChannelPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId: string }>;
}) {
  const { serverId, channelId } = use(params);
  const { session, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  if (!session?.user) {
    return null;
  }

  return <MainLayout />;
}
