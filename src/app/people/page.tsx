'use client';

import { Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import LoadingScreen from '@/components/loading-screen';
import PeopleView from '@/components/people/PeopleView';

export default function PeoplePage() {
  const { status } = useAuth();

  // Signed-out visitors are redirected by AuthProvider; never navigate during render.
  if (status !== 'authenticated') {
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <PeopleView />
    </Suspense>
  );
}
