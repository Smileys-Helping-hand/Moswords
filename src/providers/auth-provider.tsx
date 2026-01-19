"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SessionProvider, useSession } from 'next-auth/react';
import { AuthContext } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' && pathname !== '/login') {
      router.push('/login');
    } else if (status === 'authenticated' && pathname === '/login') {
      router.push('/');
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' && pathname !== '/login') {
    return null;
  }

  if (status === 'authenticated' && pathname === '/login') {
    return null;
  }

  return <>{children}</>;
}

function NextAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  return (
    <AuthContext.Provider value={{ session, status }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextAuthProvider>
        <AuthRedirect>
          {children}
        </AuthRedirect>
      </NextAuthProvider>
    </SessionProvider>
  );
}
