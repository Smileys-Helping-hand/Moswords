'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/loading-screen';
import PeopleView from '@/components/people/PeopleView';

export default function PeoplePage() {
  const { status } = useAuth();
  const router = useRouter();

  if (status === 'unauthenticated') {
    router.replace('/login');
    return <LoadingScreen />;
  }

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return <PeopleView />;
}
