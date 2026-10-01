'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import LoadingScreen from '@/components/loading-screen';
import PeopleView from '@/components/people/PeopleView';

export default function PeoplePage() {
  const { status } = useAuth();
  const router = useRouter();

  // Signed-out visitors are redirected by AuthProvider; never navigate during render.
  if (status !== 'authenticated') {
    return <LoadingScreen />;
  }

  return <PeopleView />;
}
