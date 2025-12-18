"use client";

import UserAvatar from './user-avatar';
import type { Member } from '@/lib/types';
import { Crown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';
import { emitPermissionError } from '@/lib/firebase-error-handler';
import { FirestorePermissionError } from '@/lib/errors';

function MemberRow({ member }: { member: Member }) {
  const statusColor = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary">
      <UserAvatar 
        src={member.photoURL} 
        imageHint={member.imageHint}
        status={member.status} 
      />
      <p className={`font-medium ${member.status === 'offline' ? 'text-muted-foreground' : ''}`}>
        {member.displayName}
      </p>
      {member.role === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
    </div>
  );
}

export default function MemberSidebar() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Assuming we are in a server context, replace '1' with dynamic server ID
  const activeServerId = '1'; 

  useEffect(() => {
    const membersQuery = query(
      collection(firestore, 'memberships'),
      where('serverId', '==', activeServerId)
    );

    const unsubscribe = onSnapshot(membersQuery, async (snapshot) => {
        const memberPromises = snapshot.docs.map(async (memberDoc) => {
            const memberData = memberDoc.data();
            const userRef = doc(firestore, 'users', memberData.uid);
            try {
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                  const userData = userSnap.data();
                  return {
                      uid: userData.uid,
                      displayName: userData.displayName,
                      photoURL: userData.photoURL,
                      imageHint: 'person portrait', // This might need to come from user data
                      status: 'online', // This should come from RTDB
                      role: memberData.role,
                  } as Member;
              }
            } catch (error) {
              console.error(`Failed to fetch user doc for member ${memberData.uid}:`, error);
              // We can decide not to emit here to avoid flooding,
              // or emit a more specific error. For now, just logging.
            }
            return null;
        });

        const resolvedMembers = (await Promise.all(memberPromises)).filter(m => m !== null) as Member[];
        setMembers(resolvedMembers);
        setLoading(false);
    },
    (error) => {
      console.error("Memberships listener failed:", error);
      emitPermissionError(new FirestorePermissionError({
        path: membersQuery.path,
        operation: 'list'
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeServerId]);

    const admins = members.filter(m => m.role === 'admin' || m.role === 'owner');
    const moderators = members.filter(m => m.role === 'moderator');
    const onlineMembers = members.filter(m => m.role === 'member' && m.status !== 'offline');
    const offlineMembers = members.filter(m => m.status === 'offline');

  if (loading) {
    return (
        <aside className="w-64 flex-shrink-0 bg-neutral-900/60 backdrop-blur-xl p-3 space-y-4 overflow-y-auto">
            {[...Array(3)].map((_, i) => (
                <div key={i}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <div className="space-y-2">
                        {[...Array(2)].map((_, j) => (
                            <div key={j} className="flex items-center gap-3 p-2">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <Skeleton className="h-5 w-32" />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </aside>
    )
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-neutral-900/60 backdrop-blur-xl p-3 space-y-4 overflow-y-auto">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-1">Admins — {admins.length}</h3>
        <div className="space-y-1">
            {admins.map(member => <MemberRow key={member.uid} member={member} />)}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-1">Moderators — {moderators.length}</h3>
        <div className="space-y-1">
            {moderators.map(member => <MemberRow key={member.uid} member={member} />)}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-1">Members — {onlineMembers.length}</h3>
        <div className="space-y-1">
            {onlineMembers.map(member => <MemberRow key={member.uid} member={member} />)}
        </div>
      </div>
       <div>
        <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-1">Offline — {offlineMembers.length}</h3>
        <div className="space-y-1">
            {offlineMembers.map(member => <MemberRow key={member.uid} member={member} />)}
        </div>
      </div>
    </aside>
  );
}

    