"use client";

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SessionProvider, useSession } from 'next-auth/react';
import { AuthContext } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

/** Fired by the sync loop when the server says our session is no longer valid. */
export const AUTH_EXPIRED_EVENT = 'moswords:auth-expired';

const PUBLIC_PATHS = ['/login'];

function FullScreenSkeleton() {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-4 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
  );
}

/** Ask the server directly whether we still have a session. null = couldn't tell (offline / error). */
async function confirmSignedOut(): Promise<boolean | null> {
  try {
    const res = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return !data?.user;
  } catch {
    return null;
  }
}

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname() || '/';
  const isPublic = PUBLIC_PATHS.includes(pathname);
  // Once the app has rendered for a signed-in user, never swap it for a
  // skeleton again — that unmounted everything and looked like a reload loop.
  const wasAuthenticated = useRef(false);
  if (status === 'authenticated') wasAuthenticated.current = true;
  const redirecting = useRef(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' && !isPublic && !redirecting.current) {
      redirecting.current = true;
      // Remember where they were going (e.g. an invite link) so sign-in returns there.
      const target = pathname !== '/' ? `?callbackUrl=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${target}`);
    } else if (status === 'authenticated' && isPublic) {
      const next = new URLSearchParams(window.location.search).get('callbackUrl') || '/';
      router.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/');
    }
    if (status === 'authenticated') redirecting.current = false;
  }, [status, router, pathname, isPublic]);

  // The sync loop saw a 401. Only leave the app if the server confirms the
  // session is gone — a dropped connection on a phone must not sign anyone out.
  useEffect(() => {
    let handling = false;
    const onExpired = async () => {
      if (handling) return;
      handling = true;
      const signedOut = await confirmSignedOut();
      if (signedOut === true) {
        // Full navigation resets every in-memory cache for the old account.
        window.location.assign(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      handling = false;
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  if (status === 'loading' && !wasAuthenticated.current) return <FullScreenSkeleton />;
  if (status === 'unauthenticated' && !isPublic) return <FullScreenSkeleton />;
  if (status === 'authenticated' && isPublic) return <FullScreenSkeleton />;

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
    // Sessions are 30-day signed cookies; re-checking on every app switch only
    // added failure points. next-auth treats a failed re-check (common when a
    // phone resumes before its network is back) as "signed out" and then stops
    // re-checking, which bounced people to /login and kept them there.
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false}>
      <NextAuthProvider>
        <AuthRedirect>
          {children}
        </AuthRedirect>
      </NextAuthProvider>
    </SessionProvider>
  );
}
