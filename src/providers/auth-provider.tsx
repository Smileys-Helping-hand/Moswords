"use client";

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, database, firestore } from '@/lib/firebase';
import { AuthContext, useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ref, onValue, set, onDisconnect, serverTimestamp } from 'firebase/database';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import GlobalErrorListener from '@/components/global-error-listener';

const createUserDocument = async (user: FirebaseUser) => {
    if (!user) return;
    const userRef = doc(firestore, 'users', user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
        try {
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Anonymous',
                photoURL: user.photoURL,
                createdAt: serverTimestamp(),
                points: 0,
            });
        } catch (error) {
            console.error("Error creating user document:", error);
        }
    }
};

function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    createUserDocument(user).then(() => {
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
    })

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

    const handleUser = useCallback(async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            await createUserDocument(firebaseUser);
            setUser(firebaseUser);
        } else {
            setUser(null);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, handleUser);
        return () => unsubscribe();
    }, [handleUser]);

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
