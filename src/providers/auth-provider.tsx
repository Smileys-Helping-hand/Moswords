"use client";

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, database, firestore } from '@/lib/firebase';
import { AuthContext, useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { doc, updateDoc } from 'firebase/firestore';
import GlobalErrorListener from '@/components/global-error-listener';

function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const uid = user.uid;
    const userStatusDatabaseRef = ref(database, '/status/' + uid);
    const userStatusFirestoreRef = doc(firestore, '/users/' + uid);

    const isOfflineForDatabase = {
      state: 'offline',
      last_changed: serverTimestamp(),
    };
    const isOnlineForDatabase = {
      state: 'online',
      last_changed: serverTimestamp(),
    };

    const isOfflineForFirestore = {
      last_seen: serverTimestamp(),
    };

    const connectedRef = ref(database, '.info/connected');
    let unsubscribe: () => void;

    const subscription = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
        updateDoc(userStatusFirestoreRef, isOfflineForFirestore);
        return;
      }

      onDisconnect(userStatusDatabaseRef)
        .set(isOfflineForDatabase)
        .then(() => {
          set(userStatusDatabaseRef, isOnlineForDatabase);
          updateDoc(userStatusFirestoreRef, { last_seen: 'online' });
        });
    });

    return () => {
      subscription();
      if(userStatusDatabaseRef) {
        set(userStatusDatabaseRef, isOfflineForDatabase);
        updateDoc(userStatusFirestoreRef, isOfflineForFirestore);
      }
    };
  }, [user]);
}


function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  usePresence();


  useEffect(() => {
    if (loading) return;

    if (!user && pathname !== '/login') {
      router.push('/login');
    } else if (user && pathname === '/login') {
      router.push('/');
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null;
  }

  if (user && pathname === '/login') {
    return null;
  }

  return <>{children}</>;
}

function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
        setUser(user);
        setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading }}>
          <GlobalErrorListener />
          {children}
        </AuthContext.Provider>
    );
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseAuthProvider>
      <AuthRedirect>
        {children}
      </AuthRedirect>
    </FirebaseAuthProvider>
  );
}
